'use client'

import { Activity, Clock, CheckCircle2, Hourglass, SkipForward, RotateCcw, XCircle } from 'lucide-react'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'

interface QueueThroughputProps {
  queue: ProspectingQueueItem[]
  exhaustedItems: ProspectingQueueItem[]
  isLoading: boolean
}

const STATUS_CONFIG: Record<ProspectingQueueStatus, { label: string; color: string; barColor: string }> = {
  pending: { label: 'Pendentes', color: 'text-gray-500', barColor: 'bg-gray-400' },
  in_progress: { label: 'Em andamento', color: 'text-blue-500', barColor: 'bg-blue-500' },
  completed: { label: 'Concluidos', color: 'text-emerald-500', barColor: 'bg-emerald-500' },
  skipped: { label: 'Pulados', color: 'text-amber-500', barColor: 'bg-amber-500' },
  retry_pending: { label: 'Em retry', color: 'text-orange-500', barColor: 'bg-orange-500' },
  exhausted: { label: 'Esgotados', color: 'text-red-500', barColor: 'bg-red-500' },
}

function SkeletonThroughput() {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-accent dark:bg-accent rounded" />
        <div className="h-4 w-28 bg-accent dark:bg-accent rounded" />
      </div>
      <div className="h-3 w-full bg-accent dark:bg-accent rounded-full mb-4" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent dark:bg-accent rounded" />
            <div className="space-y-1 flex-1">
              <div className="h-3 w-12 bg-accent dark:bg-accent rounded" />
              <div className="h-4 w-6 bg-accent dark:bg-accent rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface MiniStatProps {
  icon: React.ElementType
  label: string
  value: number
  colorClass: string
}

function MiniStat({ icon: Icon, label, value, colorClass }: MiniStatProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={colorClass} />
      <div className="min-w-0">
        <p className="text-2xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function QueueThroughput({ queue, exhaustedItems, isLoading }: QueueThroughputProps) {
  if (isLoading) {
    return <SkeletonThroughput />
  }

  const allItems = [...queue, ...exhaustedItems]
  const total = allItems.length

  if (total === 0) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Saude da Fila</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">Fila vazia</p>
      </div>
    )
  }

  const counts: Record<ProspectingQueueStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    skipped: 0,
    retry_pending: 0,
    exhausted: 0,
  }

  for (const item of allItems) {
    counts[item.status] = (counts[item.status] || 0) + 1
  }

  const statusOrder: ProspectingQueueStatus[] = [
    'completed',
    'in_progress',
    'pending',
    'retry_pending',
    'skipped',
    'exhausted',
  ]

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={16} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Saude da Fila</h3>
      </div>

      {/* Stacked horizontal bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4" role="img" aria-label="Distribuicao de status da fila">
        {statusOrder.map(status => {
          const count = counts[status]
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={status}
              className={`${STATUS_CONFIG[status].barColor} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${STATUS_CONFIG[status].label}: ${count} (${pct.toFixed(0)}%)`}
            />
          )
        })}
      </div>

      {/* Mini stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={Hourglass} label="Total na fila" value={queue.length} colorClass="text-gray-500" />
        <MiniStat icon={CheckCircle2} label="Concluidos" value={counts.completed} colorClass="text-emerald-500" />
        <MiniStat icon={Clock} label="Pendentes" value={counts.pending} colorClass="text-gray-500" />
        <MiniStat icon={SkipForward} label="Pulados" value={counts.skipped} colorClass="text-amber-500" />
        <MiniStat icon={RotateCcw} label="Em retry" value={counts.retry_pending} colorClass="text-orange-500" />
        <MiniStat icon={XCircle} label="Esgotados" value={exhaustedItems.length} colorClass="text-red-500" />
      </div>
    </div>
  )
}
