import React from 'react'
import { Phone, X, Flame, Snowflake, Sun, User } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import type { ProspectingQueueItem } from '@/types'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
  in_progress: { label: 'Em andamento', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  completed: { label: 'Concluído', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  skipped: { label: 'Pulado', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
}

const TEMP_ICONS: Record<string, React.ReactNode> = {
  HOT: <Flame size={14} className="text-red-500" />,
  WARM: <Sun size={14} className="text-yellow-500" />,
  COLD: <Snowflake size={14} className="text-blue-400" />,
}

interface QueueItemProps {
  item: ProspectingQueueItem
  onRemove?: (id: string) => void
}

export const QueueItem: React.FC<QueueItemProps> = ({ item, onRemove }) => {
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.pending

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <User size={16} className="text-slate-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {item.contactName || 'Sem nome'}
          </span>
          {item.contactTemperature && TEMP_ICONS[item.contactTemperature]}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.contactPhone && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Phone size={10} />
              {item.contactPhone}
            </span>
          )}
          {item.contactStage && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {item.contactStage}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
        {status.label}
      </span>

      {/* Remove button */}
      {onRemove && item.status === 'pending' && (
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={() => onRemove(item.id)}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
          aria-label="Remover da fila"
        >
          <X size={14} />
        </Button>
      )}
    </div>
  )
}
