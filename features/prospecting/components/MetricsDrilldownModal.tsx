'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CallActivity } from '../hooks/useProspectingMetrics'
import type { DrilldownCardType } from '../constants'
import { DRILLDOWN_TITLES } from '../constants'
import { OutcomeBadge } from './OutcomeBadge'
import { formatDuration } from '../utils/formatDuration'

const PAGE_SIZE = 15

interface MetricsDrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  cardType: DrilldownCardType
  activities: CallActivity[]
  profiles: { id: string; name: string }[]
}

function getContactName(activity: CallActivity): string {
  if (Array.isArray(activity.contacts)) return activity.contacts[0]?.name || 'Desconhecido'
  return activity.contacts?.name || 'Desconhecido'
}

interface ContactGroup {
  contactId: string
  name: string
  calls: number
  predominantOutcome: string
  dealLinked: boolean
  dealId: string | null
}

export function MetricsDrilldownModal({
  isOpen,
  onClose,
  cardType,
  activities,
  profiles,
}: MetricsDrilldownModalProps) {
  const [page, setPage] = useState(0)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Reset pagination when card type changes
  useEffect(() => {
    setPage(0)
    setExpandedRows(new Set())
  }, [cardType])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Filter and sort activities based on card type
  const filteredActivities = useMemo(() => {
    switch (cardType) {
      case 'connected':
        return activities.filter(a => a.metadata?.outcome === 'connected')
      case 'noAnswer':
        return activities.filter(a => a.metadata?.outcome === 'no_answer')
      case 'voicemail':
        return activities.filter(a => a.metadata?.outcome === 'voicemail')
      case 'avgDuration':
        return [...activities].sort((a, b) =>
          (b.metadata?.duration_seconds || 0) - (a.metadata?.duration_seconds || 0)
        )
      case 'totalCalls':
      case 'uniqueContacts':
      default:
        return activities
    }
  }, [activities, cardType])

  // Group by contact for uniqueContacts view
  const contactGroups = useMemo((): ContactGroup[] => {
    if (cardType !== 'uniqueContacts') return []
    const groups = new Map<string, { name: string; calls: number; outcomes: string[]; dealLinked: boolean; dealId: string | null }>()
    for (const act of activities) {
      const cid = act.contact_id || 'unknown'
      const name = getContactName(act)
      const existing = groups.get(cid)
      if (existing) {
        existing.calls++
        if (act.metadata?.outcome) existing.outcomes.push(act.metadata.outcome)
        if (act.deal_id) {
          existing.dealLinked = true
          if (!existing.dealId) existing.dealId = act.deal_id
        }
      } else {
        groups.set(cid, {
          name,
          calls: 1,
          outcomes: act.metadata?.outcome ? [act.metadata.outcome] : [],
          dealLinked: !!act.deal_id,
          dealId: act.deal_id || null,
        })
      }
    }
    return Array.from(groups.entries()).map(([contactId, data]) => {
      // Find predominant outcome
      const outcomeCounts = new Map<string, number>()
      for (const o of data.outcomes) {
        outcomeCounts.set(o, (outcomeCounts.get(o) || 0) + 1)
      }
      let predominantOutcome = 'unknown'
      let maxCount = 0
      for (const [outcome, count] of outcomeCounts) {
        if (count > maxCount) {
          maxCount = count
          predominantOutcome = outcome
        }
      }
      return {
        contactId,
        name: data.name,
        calls: data.calls,
        predominantOutcome,
        dealLinked: data.dealLinked,
        dealId: data.dealId,
      }
    }).sort((a, b) => b.calls - a.calls)
  }, [activities, cardType])

  const isContactsView = cardType === 'uniqueContacts'
  const itemCount = isContactsView ? contactGroups.length : filteredActivities.length
  const totalPages = Math.ceil(itemCount / PAGE_SIZE)

  const pageActivities = useMemo(
    () => filteredActivities.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredActivities, page],
  )

  const pageContacts = useMemo(
    () => contactGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [contactGroups, page],
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={DRILLDOWN_TITLES[cardType]}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-card border border-border dark:border-border rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4 sm:mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {DRILLDOWN_TITLES[cardType]}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {itemCount} {isContactsView ? 'contato' : 'registro'}{itemCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted dark:hover:bg-white/10 transition-colors"
            aria-label="Fechar modal"
          >
            <X size={18} className="text-muted-foreground" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {itemCount === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum registro encontrado
            </p>
          ) : isContactsView ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-border">
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Contato</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Ligacoes</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Outcome Principal</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Deal</th>
                </tr>
              </thead>
              <tbody>
                {pageContacts.map(group => (
                  <tr key={group.contactId} className="border-b border-border dark:border-border hover:bg-background dark:hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-2">
                      {group.contactId !== 'unknown' ? (
                        <a
                          href={`/contacts?cockpit=${group.contactId}`}
                          target="_blank"
                          rel="noopener"
                          className="text-primary hover:underline"
                        >
                          {group.name}
                        </a>
                      ) : (
                        <span className="text-secondary-foreground dark:text-muted-foreground">
                          {group.name}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center text-secondary-foreground dark:text-muted-foreground font-medium">
                      {group.calls}
                    </td>
                    <td className="py-2.5 px-2">
                      <OutcomeBadge outcome={group.predominantOutcome} />
                    </td>
                    <td className="py-2.5 px-2">
                      {group.dealLinked && group.dealId ? (
                        <a
                          href={`/deals/${group.dealId}/cockpit`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 hover:underline"
                        >
                          Vinculado
                        </a>
                      ) : group.dealLinked ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400">
                          Vinculado
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-border">
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Contato</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Outcome</th>
                  <th className={`text-right py-2 px-2 text-xs font-medium text-muted-foreground ${cardType === 'avgDuration' ? 'font-bold text-foreground' : ''}`}>
                    Duracao
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Notas</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Deal</th>
                </tr>
              </thead>
              <tbody>
                {pageActivities.map(activity => (
                  <tr key={activity.id} className="border-b border-border dark:border-border hover:bg-background dark:hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-2 truncate max-w-[180px]">
                      {activity.contact_id ? (
                        <a
                          href={`/contacts?cockpit=${activity.contact_id}`}
                          target="_blank"
                          rel="noopener"
                          className="text-primary hover:underline"
                        >
                          {getContactName(activity)}
                        </a>
                      ) : (
                        <span className="text-secondary-foreground dark:text-muted-foreground">
                          {getContactName(activity)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <OutcomeBadge outcome={activity.metadata?.outcome} />
                    </td>
                    <td className={`py-2.5 px-2 text-right text-xs whitespace-nowrap ${cardType === 'avgDuration' ? 'font-bold text-foreground' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                      {activity.metadata?.duration_seconds
                        ? formatDuration(activity.metadata.duration_seconds)
                        : '—'}
                    </td>
                    <td className="py-2.5 px-2 max-w-[220px] overflow-hidden">
                      {activity.description ? (
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          onClick={() => toggleExpand(activity.id)}
                          className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors max-w-full"
                          aria-label={expandedRows.has(activity.id) ? 'Recolher notas' : 'Expandir notas'}
                        >
                          <span className={`break-words ${expandedRows.has(activity.id) ? '' : 'line-clamp-2'}`}>
                            {activity.description}
                          </span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      {activity.deal_id ? (
                        <a
                          href={`/deals/${activity.deal_id}/cockpit`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 hover:underline"
                        >
                          Vinculado
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer — Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border dark:border-border shrink-0">
            <span className="text-xs text-muted-foreground">
              Pagina {page + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/15 disabled:opacity-40 transition-colors"
                aria-label="Pagina anterior"
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
                aria-label="Proxima pagina"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
