import React, { useState } from 'react'
import { ListOrdered, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { QueueItem } from './QueueItem'
import type { ProspectingQueueItem } from '@/types'

interface CallQueueProps {
  items: ProspectingQueueItem[]
  exhaustedItems?: ProspectingQueueItem[]
  isLoading: boolean
  onRemove: (id: string) => void
  onClearAll?: () => void
  onResetExhausted?: (id: string) => void
  isClearing?: boolean
  ownerName?: string
}

export const CallQueue: React.FC<CallQueueProps> = ({ items, exhaustedItems = [], isLoading, onRemove, onClearAll, onResetExhausted, isClearing, ownerName }) => {
  const [confirmClear, setConfirmClear] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
          <ListOrdered size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">Fila vazia</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Use a busca acima para adicionar contatos à fila de prospecção
        </p>
      </div>
    )
  }

  const pendingCount = items.filter(i => i.status === 'pending').length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {ownerName ? `Fila de ${ownerName}` : 'Fila de Prospecção'}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </span>
          {onClearAll && !confirmClear && (
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={isClearing}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {confirmClear && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
          <span className="text-xs text-red-600 dark:text-red-400 flex-1">
            Remover todos os {items.length} contatos da fila?
          </span>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => {
              onClearAll?.()
              setConfirmClear(false)
            }}
            disabled={isClearing}
            className="px-3 py-1 rounded-md text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
          >
            {isClearing ? 'Limpando...' : 'Confirmar'}
          </Button>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setConfirmClear(false)}
            className="px-3 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </Button>
        </div>
      )}

      {items.map(item => (
        <QueueItem key={item.id} item={item} onRemove={onRemove} />
      ))}

      {/* CP-2.1: Exhausted items section */}
      {exhaustedItems.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-4 px-1">
            <h3 className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">
              Esgotados
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              ({exhaustedItems.length})
            </span>
          </div>
          {exhaustedItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50/50 dark:bg-red-500/5 rounded-lg border border-red-200/50 dark:border-red-500/10">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <span className="text-xs font-bold text-red-500 dark:text-red-400">3x</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate block">
                  {item.contactName || 'Sem nome'}
                </span>
                {item.contactPhone && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.contactPhone}
                  </span>
                )}
              </div>
              {onResetExhausted && (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => onResetExhausted(item.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw size={12} />
                  Resetar
                </Button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
