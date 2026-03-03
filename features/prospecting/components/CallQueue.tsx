import React from 'react'
import { ListOrdered } from 'lucide-react'
import { QueueItem } from './QueueItem'
import type { ProspectingQueueItem } from '@/types'

interface CallQueueProps {
  items: ProspectingQueueItem[]
  isLoading: boolean
  onRemove: (id: string) => void
}

export const CallQueue: React.FC<CallQueueProps> = ({ items, isLoading, onRemove }) => {
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Fila de Prospecção
        </h2>
        <span className="text-xs text-slate-400">
          {items.filter(i => i.status === 'pending').length} pendente{items.filter(i => i.status === 'pending').length !== 1 ? 's' : ''}
        </span>
      </div>
      {items.map(item => (
        <QueueItem key={item.id} item={item} onRemove={onRemove} />
      ))}
    </div>
  )
}
