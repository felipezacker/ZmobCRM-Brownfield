import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { noteTemplatesService } from '@/lib/supabase/noteTemplates'
import type { CallLogData } from '@/features/inbox/components/CallModal'

const TEMPLATES_BY_OUTCOME: Record<CallLogData['outcome'], string[]> = {
  connected: [
    'Interessado em visitar imóvel',
    'Quer receber opções por WhatsApp',
    'Agendar visita',
    'Solicita avaliação do imóvel',
    'Já tem corretor, não qualificado',
    'Pedir documentação para financiamento',
    'Retornar em X dias',
  ],
  no_answer: [
    'Tentar novamente',
    'Número incorreto/inexistente',
    'Fora de horário comercial',
  ],
  voicemail: [
    'Recado deixado com resumo',
    'Tentar novamente',
  ],
  busy: [
    'Ocupado, tentar mais tarde',
  ],
}

interface NoteTemplatesProps {
  outcome: CallLogData['outcome']
  onSelect: (text: string) => void
  customTemplates?: string[]
  isAdminOrDirector?: boolean
  onManageTemplates?: () => void
}

export const NoteTemplates: React.FC<NoteTemplatesProps> = ({
  outcome,
  onSelect,
  customTemplates,
  isAdminOrDirector,
  onManageTemplates,
}) => {
  const [dbTemplates, setDbTemplates] = useState<string[] | null>(null)

  // CP-3.2: Auto-fetch templates from DB
  useEffect(() => {
    let cancelled = false
    noteTemplatesService.getByOutcome(outcome).then(({ data }) => {
      if (cancelled) return
      if (data && data.length > 0) {
        setDbTemplates(data.map(t => t.text))
      } else {
        setDbTemplates(null)
      }
    })
    return () => { cancelled = true }
  }, [outcome])

  const defaultTemplates = TEMPLATES_BY_OUTCOME[outcome] || []
  // Priority: explicit customTemplates prop > DB templates > hardcoded fallback
  const templates = customTemplates && customTemplates.length > 0
    ? customTemplates
    : dbTemplates ?? defaultTemplates

  if (templates.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {templates.map((template) => (
          <Button
            key={template}
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => onSelect(template)}
            className="px-2.5 py-1 text-xs rounded-full border border-border dark:border-border/50 bg-background dark:bg-card/50 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-accent/50 hover:border-border dark:hover:border-border transition-colors"
          >
            {template}
          </Button>
        ))}
      </div>
      {isAdminOrDirector && onManageTemplates && (
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={onManageTemplates}
          className="flex items-center gap-1 text-[11px] text-primary-500 hover:text-primary-600 transition-colors"
        >
          <Settings size={11} />
          Gerenciar templates
        </Button>
      )}
    </div>
  )
}
