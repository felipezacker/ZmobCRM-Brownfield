import React, { useState } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useNoteTemplates,
  useCreateNoteTemplate,
  useDeleteNoteTemplate,
} from '@/lib/query/hooks/useNoteTemplatesQuery'
import { useToast } from '@/context/ToastContext'
import type { CallLogData } from '@/features/inbox/components/CallModal'
import type { NoteTemplate } from '@/lib/supabase/noteTemplates'

interface NoteTemplatesManagerProps {
  isOpen: boolean
  onClose: () => void
}

const OUTCOME_LABELS: Record<CallLogData['outcome'], string> = {
  connected: 'Atendeu',
  no_answer: 'Não atendeu',
  voicemail: 'Caixa postal',
  busy: 'Ocupado',
}

const OUTCOMES: CallLogData['outcome'][] = ['connected', 'no_answer', 'voicemail', 'busy']

export const NoteTemplatesManager: React.FC<NoteTemplatesManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const [newOutcome, setNewOutcome] = useState<CallLogData['outcome']>('connected')
  const [newText, setNewText] = useState('')

  const { data: templates = [], isLoading } = useNoteTemplates()
  const createTemplate = useCreateNoteTemplate()
  const deleteTemplate = useDeleteNoteTemplate()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  const handleCreate = async () => {
    if (!newText.trim()) return
    try {
      await createTemplate.mutateAsync({ outcome: newOutcome, text: newText.trim() })
      setNewText('')
      toast('Template criado', 'success')
    } catch {
      toast('Erro ao criar template', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id)
      toast('Template removido', 'success')
    } catch {
      toast('Erro ao remover template', 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Templates de Notas
          </h2>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add new template */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <select
                value={newOutcome}
                onChange={(e) => setNewOutcome(e.target.value as CallLogData['outcome'])}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md px-2 py-1.5 text-slate-700 dark:text-slate-300 outline-none"
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
                ))}
              </select>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Texto do template..."
                className="flex-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md px-2 py-1.5 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-500/50"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              />
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={handleCreate}
                disabled={!newText.trim() || createTemplate.isPending}
                className="p-1.5 rounded-md bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-40"
              >
                {createTemplate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </Button>
            </div>
          </div>

          {/* Existing templates by outcome */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
              Nenhum template customizado. Os padrões serão usados.
            </p>
          ) : (
            OUTCOMES.map((outcome) => {
              const outcomeTemplates = templates.filter((t: NoteTemplate) => t.outcome === outcome)
              if (outcomeTemplates.length === 0) return null
              return (
                <div key={outcome}>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    {OUTCOME_LABELS[outcome]}
                  </h4>
                  <div className="space-y-1">
                    {outcomeTemplates.map((t: NoteTemplate) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
                      >
                        <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{t.text}</span>
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleteTemplate.isPending}
                          className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
