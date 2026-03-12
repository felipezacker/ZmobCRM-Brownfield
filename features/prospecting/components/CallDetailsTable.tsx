'use client'

import React, { useState, useMemo } from 'react'
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CallActivity } from '../hooks/useProspectingMetrics'
import { formatDuration } from '../utils/formatDuration'

interface CallDetailsTableProps {
  activities: CallActivity[]
  profiles: { id: string; name: string }[]
  isLoading: boolean
}

const PAGE_SIZE = 15

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  connected: { label: 'Atendeu', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
  no_answer: { label: 'Não Atendeu', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  voicemail: { label: 'Correio de Voz', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  busy: { label: 'Ocupado', color: 'bg-muted text-secondary-foreground dark:bg-accent/20 dark:text-muted-foreground' },
}

function getOutcomeBadge(outcome?: string) {
  const info = outcome ? OUTCOME_LABELS[outcome] : null
  const label = info?.label || outcome || 'Desconhecido'
  const color = info?.color || 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}>
      {label}
    </span>
  )
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} ${hours}:${mins}`
}

function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5 animate-pulse">
      <div className="h-5 w-52 bg-accent dark:bg-accent rounded mb-4" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-muted dark:bg-card rounded" />
        ))}
      </div>
    </div>
  )
}

export function CallDetailsTable({ activities, profiles, isLoading }: CallDetailsTableProps) {
  const [page, setPage] = useState(0)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.name])), [profiles])

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPages = Math.ceil(activities.length / PAGE_SIZE)
  const pageData = useMemo(
    () => activities.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [activities, page],
  )

  if (isLoading) return <TableSkeleton />

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-3 flex items-center gap-2">
          <FileText size={16} className="text-muted-foreground" />
          Detalhes das Prospecções
        </h3>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground py-8 text-center">
          Nenhuma ligação registrada no período
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground flex items-center gap-2">
          <FileText size={16} className="text-muted-foreground" />
          Detalhes das Prospecções
        </h3>
        <span className="text-xs text-muted-foreground dark:text-muted-foreground">
          {activities.length} registro{activities.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Data</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Corretor</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Contato</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Status</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Notas</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Duração</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(activity => (
              <tr
                key={activity.id}
                className="border-b border-border dark:border-border hover:bg-background dark:hover:bg-white/5 transition-colors"
              >
                <td className="py-2.5 px-2 text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                  {formatDateTime(activity.date)}
                </td>
                <td className="py-2.5 px-2 text-secondary-foreground dark:text-muted-foreground truncate max-w-[160px]">
                  {activity.owner_id ? profileMap.get(activity.owner_id) || 'Desconhecido' : '—'}
                </td>
                <td className="py-2.5 px-2 text-secondary-foreground dark:text-muted-foreground truncate max-w-[180px]">
                  {(Array.isArray(activity.contacts) ? activity.contacts[0]?.name : activity.contacts?.name) || '—'}
                </td>
                <td className="py-2.5 px-2">
                  {getOutcomeBadge(activity.metadata?.outcome)}
                </td>
                <td className="py-2.5 px-2 max-w-[250px]">
                  {activity.description ? (
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      onClick={() => toggleExpand(activity.id)}
                      className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={expandedRows.has(activity.id) ? 'Recolher notas' : 'Expandir notas'}
                    >
                      <span className={expandedRows.has(activity.id) ? '' : 'line-clamp-2'}>
                        {activity.description}
                      </span>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-right text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                  {activity.metadata?.duration_seconds
                    ? formatDuration(activity.metadata.duration_seconds)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border dark:border-border">
          <span className="text-xs text-muted-foreground dark:text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
