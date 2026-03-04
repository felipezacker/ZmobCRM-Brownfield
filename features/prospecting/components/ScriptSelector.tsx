import React, { useState } from 'react'
import { FileText, Check, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { useQuickScripts } from '@/features/inbox/hooks/useQuickScripts'
import type { QuickScript } from '@/lib/supabase/quickScripts'

interface ScriptSelectorProps {
  selectedScript: QuickScript | null
  onSelect: (script: QuickScript | null) => void
  onCreateNew?: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  followup: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  objection: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  closing: 'bg-green-500/10 text-green-400 border-green-500/20',
  intro: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  rescue: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

const CATEGORY_LABELS: Record<string, string> = {
  followup: 'Follow-up',
  objection: 'Objeções',
  closing: 'Fechamento',
  intro: 'Apresentação',
  rescue: 'Resgate',
  other: 'Outros',
}

export const ScriptSelector: React.FC<ScriptSelectorProps> = ({
  selectedScript,
  onSelect,
  onCreateNew,
}) => {
  const { scripts, isLoading } = useQuickScripts()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  if (scripts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 text-center space-y-3">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-fit mx-auto">
          <FileText size={24} className="text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Nenhum script disponível
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Crie um script para usar como guia durante as chamadas
          </p>
        </div>
        {onCreateNew && (
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-500 hover:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Criar Script
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-teal-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Script de Chamada
            </h3>
          </div>
          {selectedScript && (
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => onSelect(null)}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Limpar
            </Button>
          )}
        </div>
        {selectedScript && (
          <p className="text-xs text-teal-500 mt-1 flex items-center gap-1">
            <Check size={12} />
            {selectedScript.title}
          </p>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {scripts.map((script) => {
          const isSelected = selectedScript?.id === script.id
          const isExpanded = expandedId === script.id
          const catColor = CATEGORY_COLORS[script.category] || CATEGORY_COLORS.other
          const catLabel = CATEGORY_LABELS[script.category] || script.category

          return (
            <div key={script.id}>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={() => setExpandedId(isExpanded ? null : script.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-teal-500/5'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {script.title}
                    </span>
                    {isSelected && <Check size={14} className="text-teal-500 shrink-0" />}
                  </div>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border mt-1 ${catColor}`}>
                    {catLabel}
                  </span>
                </div>
                <ChevronRight
                  size={14}
                  className={`text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </Button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                    {script.template.slice(0, 300)}
                    {script.template.length > 300 && '...'}
                  </div>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    onClick={() => onSelect(isSelected ? null : script)}
                    className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                    }`}
                  >
                    {isSelected ? 'Remover seleção' : 'Selecionar este script'}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
