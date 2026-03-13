'use client'

import React, { useCallback, useRef } from 'react'
import { X, Upload, ChevronLeft, ChevronRight, FileSpreadsheet, Check, AlertTriangle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_BASE_CLASS,
  MODAL_VIEWPORT_CAP_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_TITLE_CLASS,
  MODAL_CLOSE_BUTTON_CLASS,
  MODAL_BODY_CLASS,
  MODAL_FOOTER_CLASS,
} from '@/components/ui/modalStyles'
import {
  useImportToQueue,
  type ImportStep,
  PROSPECTING_CRM_FIELDS,
} from '@/features/prospecting/hooks/useImportToQueue'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImportListModalProps {
  isOpen: boolean
  onClose: () => void
  currentQueueSize: number
  onAddBatchToQueue: (contactIds: string[]) => Promise<void>
}

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

const STEPS: Array<{ key: ImportStep; label: string }> = [
  { key: 'upload', label: 'Arquivo' },
  { key: 'mapping', label: 'Mapeamento' },
  { key: 'preview', label: 'Preview' },
  { key: 'progress', label: 'Importando' },
  { key: 'summary', label: 'Resumo' },
]

function StepIndicator({ current }: { current: ImportStep }) {
  const currentIdx = STEPS.findIndex(s => s.key === current)
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-2xs font-bold transition-colors ${
            i < currentIdx
              ? 'bg-emerald-500 text-white'
              : i === currentIdx
                ? 'bg-primary-500 text-white'
                : 'bg-muted dark:bg-white/10 text-muted-foreground'
          }`}>
            {i < currentIdx ? <Check size={12} /> : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:inline ${
            i === currentIdx ? 'text-foreground' : 'text-muted-foreground'
          }`}>{s.label}</span>
          {i < STEPS.length - 1 && <div className="w-4 h-px bg-border dark:bg-border/50" />}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportListModal({
  isOpen,
  onClose,
  currentQueueSize,
  onAddBatchToQueue,
}: ImportListModalProps) {
  const hook = useImportToQueue({ currentQueueSize, onAddBatchToQueue })
  const { reset, handleFileSelect } = hook
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  if (!isOpen) return null

  return (
    <div className={MODAL_OVERLAY_CLASS} onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className={`${MODAL_PANEL_BASE_CLASS} ${MODAL_VIEWPORT_CAP_CLASS} sm:max-w-2xl`}>
        {/* Header */}
        <div className={MODAL_HEADER_CLASS}>
          <div className="flex flex-col gap-1">
            <h2 className={MODAL_TITLE_CLASS}>Importar Lista para Fila</h2>
            <StepIndicator current={hook.step} />
          </div>
          <Button variant="unstyled" size="unstyled" onClick={handleClose} className={MODAL_CLOSE_BUTTON_CLASS}>
            <X size={18} />
          </Button>
        </div>

        {/* Body */}
        <div className={`${MODAL_BODY_CLASS} flex-1 overflow-y-auto`}>
          {hook.error && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              {hook.error}
            </div>
          )}

          {/* ── Step: Upload ── */}
          {hook.step === 'upload' && (
            <div
              className="flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed border-border dark:border-border/50 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-500/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
            >
              <div className="p-4 bg-primary-500/10 rounded-2xl">
                <Upload size={32} className="text-primary-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">CSV ou XLSX - máx. 500 linhas, 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) hook.handleFileSelect(f)
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {/* ── Step: Mapping ── */}
          {hook.step === 'mapping' && hook.parsed && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <FileSpreadsheet size={14} className="inline mr-1" />
                {hook.file?.name} — {hook.parsed.rows.length} linhas, {hook.parsed.headers.length} colunas
              </p>
              <div className="border border-border dark:border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted dark:bg-white/5">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Coluna do arquivo</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Campo CRM</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Amostra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hook.parsed.headers.map((header, colIdx) => (
                      <tr key={colIdx} className="border-t border-border dark:border-border/30">
                        <td className="px-3 py-2 font-medium text-foreground">{header || `Coluna ${colIdx + 1}`}</td>
                        <td className="px-3 py-2">
                          <select
                            value={hook.columnMapping[colIdx] || '_ignore'}
                            onChange={(e) => {
                              hook.setColumnMapping(prev => ({ ...prev, [colIdx]: e.target.value }))
                            }}
                            className={`w-full bg-card dark:bg-white/5 border rounded-md px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary-500 ${
                              hook.columnMapping[colIdx] === 'phone'
                                ? 'border-emerald-500 dark:border-emerald-500/50'
                                : 'border-border dark:border-border/50'
                            }`}
                          >
                            {PROSPECTING_CRM_FIELDS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">
                          {hook.parsed?.rows[0]?.[colIdx] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                <Phone size={10} className="inline mr-1" />
                O campo <strong>Telefone</strong> é obrigatório — linhas sem telefone serão ignoradas.
              </p>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {hook.step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                  <Check size={12} className="text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{hook.validCount} válidos</span>
                </div>
                {hook.invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg">
                    <AlertTriangle size={12} className="text-red-500" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">{hook.invalidCount} ignorados</span>
                  </div>
                )}
              </div>

              <div className="border border-border dark:border-border/50 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted dark:bg-white/5">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Telefone</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hook.validations.map((v) => (
                      <tr
                        key={v.rowIndex}
                        className={`border-t border-border dark:border-border/30 ${
                          !v.isValid ? 'bg-red-50/50 dark:bg-red-500/5' : ''
                        }`}
                      >
                        <td className="px-3 py-1.5 text-muted-foreground">{v.rowIndex + 1}</td>
                        <td className="px-3 py-1.5 text-foreground">{v.name || '—'}</td>
                        <td className={`px-3 py-1.5 ${v.isValid ? 'text-foreground' : 'text-red-500 dark:text-red-400'}`}>
                          {v.phone || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{v.email || '—'}</td>
                        <td className="px-3 py-1.5">
                          {v.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Check size={10} /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400">
                              <AlertTriangle size={10} /> {v.reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step: Progress ── */}
          {hook.step === 'progress' && hook.progress && (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <div className="w-full max-w-md">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>{hook.progress.label}</span>
                  <span>{hook.progress.total > 0 ? Math.round((hook.progress.current / hook.progress.total) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-muted dark:bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${hook.progress.total > 0 ? (hook.progress.current / hook.progress.total) * 100 : 0}%` }}
                    role="progressbar"
                    aria-valuenow={hook.progress.current}
                    aria-valuemin={0}
                    aria-valuemax={hook.progress.total}
                    aria-label={hook.progress.label}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Summary ── */}
          {hook.step === 'summary' && hook.summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Novos criados" value={hook.summary.created} color="emerald" />
                <SummaryCard label="Existentes reutilizados" value={hook.summary.reused} color="blue" />
                <SummaryCard label="Ignorados (sem telefone)" value={hook.summary.ignoredNoPhone} color="amber" />
                <SummaryCard label="Ignorados (fila cheia)" value={hook.summary.ignoredQueueFull} color="amber" />
              </div>
              {hook.summary.enqueuedCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {hook.summary.enqueuedCount} contato(s) adicionados à fila de prospecção
                  </span>
                </div>
              )}
              {hook.summary.errors > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {hook.summary.errors} erro(s) durante a importação
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${MODAL_FOOTER_CLASS} flex items-center justify-between`}>
          <div>
            {(hook.step === 'mapping' || hook.step === 'preview') && (
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={hook.goBack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={14} />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hook.step === 'mapping' && (
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={hook.goToPreview}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors"
              >
                Preview
                <ChevronRight size={14} />
              </Button>
            )}
            {hook.step === 'preview' && (
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={hook.startImport}
                disabled={hook.validCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Importar {hook.validCount} contatos
                <ChevronRight size={14} />
              </Button>
            )}
            {hook.step === 'summary' && (
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={handleClose}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors"
              >
                Fechar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, color }: { label: string; value: number; color: 'emerald' | 'blue' | 'amber' }) {
  const colorMap = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20',
  }
  return (
    <div className={`flex flex-col gap-1 px-4 py-3 rounded-xl border ${colorMap[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium opacity-80">{label}</span>
    </div>
  )
}
