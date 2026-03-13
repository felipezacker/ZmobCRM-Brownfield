'use client'

import React, { useEffect, useState } from 'react'
import { Radio, RadioTower } from 'lucide-react'
import { getOutcomeBadge } from '@/features/prospecting/constants'
import type { LiveSession } from '@/features/prospecting/hooks/useLiveOperations'

interface LiveOperationsPanelProps {
  sessions: LiveSession[]
  activeCount: number
  isLoading: boolean
}

/** Isolated timer component — local state avoids re-rendering the parent */
function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    function update() {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return <span className="tabular-nums text-xs font-mono text-muted-foreground">{elapsed}</span>
}

/** Formats "time since last activity" in human-readable form */
function timeSince(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  return `${hours}h${mins % 60}min atrás`
}

export const LiveOperationsPanel: React.FC<LiveOperationsPanelProps> = ({
  sessions,
  activeCount,
  isLoading,
}) => {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border dark:border-border/50 bg-white dark:bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
          <div className="w-32 h-4 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="w-24 h-3.5 rounded bg-muted animate-pulse" />
                <div className="w-40 h-3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (activeCount === 0) {
    return (
      <div className="rounded-xl border border-border dark:border-border/50 bg-white dark:bg-white/5 p-6 flex flex-col items-center justify-center gap-2 text-center">
        <RadioTower size={28} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum corretor em sessão no momento</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border dark:border-border/50 bg-white dark:bg-white/5 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Radio size={16} className="text-emerald-500 animate-pulse" />
        <span className="text-sm font-semibold text-foreground">Operação Ao Vivo</span>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
          {activeCount} ativa{activeCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Session list */}
      <ul role="list" className="space-y-2">
        {sessions.map(session => {
          const badge = session.lastActivity?.outcome ? getOutcomeBadge(session.lastActivity.outcome) : null
          return (
            <li
              key={session.sessionId}
              role="listitem"
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 dark:bg-white/5"
            >
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-500 shrink-0">
                {session.ownerName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {session.ownerName}
                  </span>
                  {session.isInactive && (
                    <span
                      className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse"
                      aria-label="Corretor inativo há mais de 15 minutos"
                    >
                      Inativo
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  <SessionTimer startedAt={session.startedAt} />
                  <span>·</span>
                  <span>
                    {session.partialStats.totalCalls} ligaç{session.partialStats.totalCalls !== 1 ? 'ões' : 'ão'}, {session.partialStats.connected} atendida{session.partialStats.connected !== 1 ? 's' : ''}
                  </span>
                  {badge && (
                    <>
                      <span>·</span>
                      <span className={`px-1.5 py-0.5 rounded text-2xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </>
                  )}
                  {session.lastActivity && (
                    <>
                      <span>·</span>
                      <span>{timeSince(session.lastActivity.date)}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
