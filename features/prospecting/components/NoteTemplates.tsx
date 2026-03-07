import React from 'react'
import { Button } from '@/components/ui/button'
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
}

export const NoteTemplates: React.FC<NoteTemplatesProps> = ({
  outcome,
  onSelect,
  customTemplates,
}) => {
  const defaultTemplates = TEMPLATES_BY_OUTCOME[outcome] || []
  const templates = customTemplates && customTemplates.length > 0
    ? customTemplates
    : defaultTemplates

  if (templates.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {templates.map((template) => (
        <Button
          key={template}
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => onSelect(template)}
          className="px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        >
          {template}
        </Button>
      ))}
    </div>
  )
}
