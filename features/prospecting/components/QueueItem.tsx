import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, X, Flame, Snowflake, Sun, User, RotateCcw, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadScoreBadge } from '@/features/prospecting/components/LeadScoreBadge'
import { QueueItemDetails } from '@/features/prospecting/components/QueueItemDetails'
import type { ProspectingQueueItem } from '@/types'
import { SHADOW_TOKENS } from '@/lib/design-tokens'

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
  isExpanded?: boolean
  onToggleExpand?: (id: string) => void
  selected?: boolean
  onToggle?: (id: string, event?: React.MouseEvent) => void
  isSessionActive?: boolean
  isDragDisabled?: boolean
  onOpenContact?: (contactId: string) => void
}

export const QueueItem: React.FC<QueueItemProps> = ({ item, onRemove, isRemoving, isExpanded = false, onToggleExpand, selected, onToggle, isSessionActive, isDragDisabled, onOpenContact }) => {
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.pending

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isDragDisabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 50 : undefined,
    boxShadow: isDragging ? SHADOW_TOKENS.drag : undefined,
    scale: isDragging ? '1.02' : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-card rounded-lg border border-border dark:border-border/50 hover:border-border dark:hover:border-border transition-colors"
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${item.contactName || 'Sem nome'} — clique para ${isExpanded ? 'recolher' : 'expandir'} detalhes`}
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => onToggleExpand?.(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleExpand?.(item.id)
          }
        }}
      >
        {/* Drag handle (CP-4.7) */}
        {!isDragDisabled && (
          <Button variant="unstyled" size="unstyled"
            type="button"
            className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Arrastar para reordenar"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </Button>
        )}

        {/* Checkbox for batch selection (CP-4.5) */}
        {!isSessionActive && onToggle && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => {/* handled by onClick */}}
            onClick={(e) => { e.stopPropagation(); onToggle(item.id, e as unknown as React.MouseEvent) }}
            aria-label={`Selecionar ${item.contactName || 'contato'}`}
            className="flex-shrink-0 w-4 h-4 rounded border-border text-primary-500 focus:ring-2 focus:ring-primary-500 cursor-pointer"
          />
        )}

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
              <span className="inline-flex items-center gap-0.5 text-2xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
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
              <span className="text-2xs px-1.5 py-0.5 rounded bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground">
                {item.contactStage}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
          {status.label}
        </span>

        {/* Remove button */}
        {onRemove && (
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(item.id)
            }}
            onKeyDown={(e) => e.stopPropagation()}
            disabled={isRemoving}
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Remover da fila"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {/* Expanded details (CP-4.4: AC2, AC6) */}
      {isExpanded && (
        <QueueItemDetails
          contactId={item.contactId}
          contactEmail={item.contactEmail}
          contactStage={item.contactStage}
          leadScore={item.leadScore}
          isExpanded={isExpanded}
          onOpenContact={onOpenContact}
        />
      )}
    </div>
  )
}
