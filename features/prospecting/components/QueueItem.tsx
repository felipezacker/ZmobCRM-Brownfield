import React from 'react'
import { Phone, X, Flame, Snowflake, Sun, User, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadScoreBadge } from '@/features/prospecting/components/LeadScoreBadge'
import type { ProspectingQueueItem } from '@/types'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground' },
  in_progress: { label: 'Em andamento', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  completed: { label: 'Concluído', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  skipped: { label: 'Pulado', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
  retry_pending: { label: 'Retry agendado', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  exhausted: { label: 'Esgotado', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
}

const TEMP_ICONS: Record<string, React.ReactNode> = {
  HOT: <Flame size={14} className="text-red-500" />,
  WARM: <Sun size={14} className="text-yellow-500" />,
  COLD: <Snowflake size={14} className="text-blue-400" />,
}

interface QueueItemProps {
  item: ProspectingQueueItem
  onRemove?: (id: string) => void
  isRemoving?: boolean
}

export const QueueItem: React.FC<QueueItemProps> = ({ item, onRemove, isRemoving }) => {
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.pending

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-lg border border-border dark:border-border/50 hover:border-border dark:hover:border-border transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted dark:bg-card flex items-center justify-center">
        <User size={16} className="text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {item.contactName || 'Sem nome'}
          </span>
          {item.contactTemperature && TEMP_ICONS[item.contactTemperature]}
          <LeadScoreBadge score={item.leadScore} />
          {item.retryCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <RotateCcw size={9} />
              Retry #{item.retryCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.contactPhone && (
            <span className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
              <Phone size={10} />
              {item.contactPhone}
            </span>
          )}
          {item.contactStage && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground">
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
      {onRemove && (
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
          className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Remover da fila"
        >
          <X size={14} />
        </Button>
      )}
    </div>
  )
}
