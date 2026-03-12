/**
 * Hook para importação de listas externas direto para a fila de prospecção (CP-IMP-1)
 *
 * Orquestra: parse CSV/XLSX → mapeamento de colunas → validação de telefone →
 * chamada à API de import → enfileiramento dos IDs retornados.
 */
import { useState, useCallback } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { parseCsv, detectCsvDelimiter, stringifyCsv } from '@/lib/utils/csv'
import { normalizePhoneE164, isE164 } from '@/lib/phone'
import {
  autoSuggestField,
  STATIC_CRM_FIELDS,
} from '@/features/contacts/hooks/useContactImportWizard'
import { PROSPECTING_CONFIG } from '@/features/prospecting/prospecting-config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'progress' | 'summary'

/** Campos que a prospecção precisa mapear (subset simplificado) */
const PROSPECTING_CRM_FIELDS = STATIC_CRM_FIELDS.filter(f =>
  ['name', 'phone', 'email', 'tags', 'classification', '_ignore'].includes(f.value),
)

export { PROSPECTING_CRM_FIELDS }

export interface ParsedFileResult {
  headers: string[]
  rows: string[][]
}

export interface RowValidation {
  rowIndex: number
  name: string
  phone: string
  phoneNormalized: string
  email: string
  isValid: boolean
  reason?: string
}

export interface ImportSummary {
  created: number
  reused: number
  ignoredNoPhone: number
  ignoredQueueFull: number
  errors: number
  enqueuedCount: number
}

export interface ImportProgress {
  stage: 'validating' | 'importing' | 'enqueuing' | 'done'
  current: number
  total: number
  label: string
}

const MAX_ROWS = 500
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseImportToQueueOptions {
  currentQueueSize: number
  onAddBatchToQueue: (contactIds: string[]) => Promise<void>
}

export function useImportToQueue({ currentQueueSize, onAddBatchToQueue }: UseImportToQueueOptions) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedFileResult | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})
  const [validations, setValidations] = useState<RowValidation[]>([])
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Reset ──
  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setParsed(null)
    setColumnMapping({})
    setValidations([])
    setProgress(null)
    setSummary(null)
    setError(null)
  }, [])

  // ── Step 1: Parse file ──
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null)

    // Validações de arquivo
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Arquivo excede o limite de ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!ext || !['csv', 'xlsx'].includes(ext)) {
      setError('Formato não suportado. Use .csv ou .xlsx')
      return
    }

    setFile(selectedFile)

    try {
      let headers: string[]
      let rows: string[][]

      if (ext === 'xlsx') {
        const xlsxRows = await readXlsxFile(selectedFile)
        if (xlsxRows.length === 0) {
          setError('Arquivo vazio')
          return
        }
        headers = xlsxRows[0].map((cell: unknown) => String(cell ?? '').trim())
        rows = xlsxRows.slice(1).map((row: unknown[]) => row.map((cell: unknown) => String(cell ?? '')))
      } else {
        const text = await selectedFile.text()
        const delimiter = detectCsvDelimiter(text)
        const result = parseCsv(text, delimiter)
        headers = result.headers
        rows = result.rows
      }

      if (rows.length > MAX_ROWS) {
        setError(`Arquivo tem ${rows.length} linhas. Máximo permitido: ${MAX_ROWS}`)
        return
      }

      if (rows.length === 0) {
        setError('Arquivo sem dados (apenas cabeçalho)')
        return
      }

      setParsed({ headers, rows })

      // Auto-sugestão de mapeamento
      const mapping: Record<number, string> = {}
      headers.forEach((h, i) => {
        mapping[i] = autoSuggestField(h)
      })
      setColumnMapping(mapping)

      setStep('mapping')
    } catch (e) {
      setError(`Erro ao ler arquivo: ${e instanceof Error ? e.message : 'desconhecido'}`)
    }
  }, [])

  // ── Step 2 → 3: Validar e ir para preview ──
  const goToPreview = useCallback(() => {
    if (!parsed) return

    // Encontrar coluna mapeada para phone
    const phoneColIdx = Object.entries(columnMapping).find(([, v]) => v === 'phone')?.[0]
    const nameColIdx = Object.entries(columnMapping).find(([, v]) => v === 'name')?.[0]
    const emailColIdx = Object.entries(columnMapping).find(([, v]) => v === 'email')?.[0]

    if (phoneColIdx === undefined) {
      setError('Mapeie a coluna "Telefone" — é obrigatória para prospecção')
      return
    }

    setError(null)

    const results: RowValidation[] = parsed.rows.map((row, idx) => {
      const rawPhone = row[Number(phoneColIdx)]?.trim() || ''
      const name = nameColIdx !== undefined ? (row[Number(nameColIdx)]?.trim() || '') : ''
      const email = emailColIdx !== undefined ? (row[Number(emailColIdx)]?.trim() || '') : ''

      if (!rawPhone) {
        return { rowIndex: idx, name, phone: '', phoneNormalized: '', email, isValid: false, reason: 'Sem telefone' }
      }

      const normalized = normalizePhoneE164(rawPhone)
      const valid = isE164(normalized)

      return {
        rowIndex: idx,
        name,
        phone: rawPhone,
        phoneNormalized: normalized,
        email,
        isValid: valid,
        reason: valid ? undefined : 'Telefone inválido',
      }
    })

    setValidations(results)
    setStep('preview')
  }, [parsed, columnMapping])

  // ── Step 4/5: Importar e enfileirar ──
  const startImport = useCallback(async () => {
    if (!file || !parsed) return

    setStep('progress')

    const validRows = validations.filter(v => v.isValid)
    const invalidCount = validations.filter(v => !v.isValid).length
    const total = validRows.length

    if (total === 0) {
      setSummary({ created: 0, reused: 0, ignoredNoPhone: invalidCount, ignoredQueueFull: 0, errors: 0, enqueuedCount: 0 })
      setStep('summary')
      return
    }

    try {
      // ── Stage 1: Import via API ──
      setProgress({ stage: 'importing', current: 0, total, label: `Importando 0/${total} contatos...` })

      // AC4: Reconstruir CSV com APENAS linhas que passaram na validação de telefone.
      // Sem isso, a API criaria contatos para linhas sem telefone (inúteis na fila de prospecção).
      const validIndices = new Set(validRows.map(v => v.rowIndex))
      const filteredRows = parsed.rows.filter((_, i) => validIndices.has(i))
      const csvContent = stringifyCsv([parsed.headers, ...filteredRows], ';')
      const filteredFile = new File([csvContent], file.name, { type: 'text/csv' })

      // Construir FormData para a API
      const formData = new FormData()
      formData.append('file', filteredFile)
      formData.append('mode', 'skip_duplicates')
      formData.append('delimiter', ';')
      formData.append('columnMapping', JSON.stringify(columnMapping))

      const res = await fetch('/api/contacts/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Erro na importação')
        setStep('preview')
        return
      }


      const createdCount: number = data.totals?.created || 0
      const reusedCount: number = data.totals?.skipped || 0
      const apiErrors: number = data.totals?.errors || 0

      const importedIds: string[] = data.importedContactIds || []
      const reusedIds: string[] = data.reusedContactIds || []
      const allContactIds = [...importedIds, ...reusedIds]

      setProgress({ stage: 'importing', current: total, total, label: `Importação concluída` })


      // ── Stage 2: Enqueue ──
      const queueSlots = Math.max(0, PROSPECTING_CONFIG.QUEUE_MAX_CONTACTS - currentQueueSize)
      const idsToEnqueue = allContactIds.slice(0, queueSlots)
      const ignoredQueueFull = allContactIds.length - idsToEnqueue.length

      let enqueuedCount = 0
      if (idsToEnqueue.length > 0) {
        setProgress({ stage: 'enqueuing', current: 0, total: idsToEnqueue.length, label: `Adicionando à fila...` })
        await onAddBatchToQueue(idsToEnqueue)
        enqueuedCount = idsToEnqueue.length
        setProgress({ stage: 'enqueuing', current: enqueuedCount, total: idsToEnqueue.length, label: `${enqueuedCount} adicionados à fila` })
      }

      // ── Summary ──
      const summaryResult: ImportSummary = {
        created: createdCount,
        reused: reusedCount,
        ignoredNoPhone: invalidCount,
        ignoredQueueFull,
        errors: apiErrors,
        enqueuedCount,
      }

      setSummary(summaryResult)
      setProgress({ stage: 'done', current: total, total, label: 'Concluído' })
      setStep('summary')
    } catch (e) {
      setError(`Erro durante importação: ${e instanceof Error ? e.message : 'desconhecido'}`)
      setStep('preview')
    }
  }, [file, parsed, validations, columnMapping, currentQueueSize, onAddBatchToQueue])

  // ── Navigation helpers ──
  const goBack = useCallback(() => {
    if (step === 'mapping') setStep('upload')
    else if (step === 'preview') setStep('mapping')
  }, [step])

  return {
    // State
    step,
    file,
    parsed,
    columnMapping,
    validations,
    progress,
    summary,
    error,

    // Actions
    handleFileSelect,
    setColumnMapping,
    goToPreview,
    startImport,
    goBack,
    reset,

    // Computed
    validCount: validations.filter(v => v.isValid).length,
    invalidCount: validations.filter(v => !v.isValid).length,
    prospectingCrmFields: PROSPECTING_CRM_FIELDS,
  }
}
