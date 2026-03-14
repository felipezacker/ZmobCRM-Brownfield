import React, { useState, useMemo } from 'react'
import { Clock, ChevronDown, ChevronUp, Phone, CheckCircle, XCircle, Voicemail, PhoneOff, SkipForward, History, TrendingUp, TrendingDown, Zap, Target, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProspectingSession, ProspectingSessionStats } from '@/lib/supabase/prospecting-sessions'

interface SessionHistoryProps {
  sessions: ProspectingSession[]
  isLoading: boolean
}

export interface SessionAnalytics {
  bestSession: { date: string; rate: number } | null
  avgCallsPerSession: number
  avgSessionDuration: string
  callsPerHour: number
  avgConnectionRate: number
  trend: 'up' | 'down' | 'stable'
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}h ${mins}min`
  if (mins > 0) return `${mins}min ${secs}s`
  return `${secs}s`
}

function formatDurationHoursMin(seconds: number): string {
  if (!seconds || seconds <= 0) return '0min'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}min`
  return `${mins}min`
}

function getConnectionRate(stats: Record<string, unknown>): string {
  const total = (stats.completed as number) || (stats.total as number) || 0
  const connected = (stats.connected as number) || 0
  if (total === 0) return '0%'
  return `${Math.round((connected / total) * 100)}%`
}

function getSessionConnectionRate(stats: ProspectingSessionStats | Record<string, never>): number {
  const typedStats = stats as Partial<ProspectingSessionStats>
  const total = typedStats.completed || typedStats.total || 0
  const connected = typedStats.connected || 0
  if (total === 0) return 0
  return (connected / total) * 100
}

function getSessionDurationSeconds(session: ProspectingSession): number {
  if (!session.startedAt || !session.endedAt) return 0
  const start = new Date(session.startedAt).getTime()
  const end = new Date(session.endedAt).getTime()
  const diff = (end - start) / 1000
  return diff > 0 ? diff : 0
}

function getSessionTotalCalls(stats: ProspectingSessionStats | Record<string, never>): number {
  const typedStats = stats as Partial<ProspectingSessionStats>
  return typedStats.completed || typedStats.total || 0
}

export function computeSessionAnalytics(sessions: ProspectingSession[]): SessionAnalytics | null {
  if (sessions.length < 2) return null

  // Best session (highest connection rate)
  let bestSession: { date: string; rate: number } | null = null
  let bestRate = -1
  const connectionRates: number[] = []
  let totalCalls = 0
  let totalDurationSeconds = 0

  for (const session of sessions) {
    const rate = getSessionConnectionRate(session.stats)
    connectionRates.push(rate)

    const calls = getSessionTotalCalls(session.stats)
    totalCalls += calls

    const dur = getSessionDurationSeconds(session)
    totalDurationSeconds += dur

    if (rate > bestRate && calls > 0) {
      bestRate = rate
      bestSession = {
        date: new Date(session.startedAt).toLocaleDateString('pt-BR'),
        rate: Math.round(rate),
      }
    }
  }

  // Avg calls/session
  const avgCallsPerSession = totalCalls / sessions.length

  // Avg session duration
  const avgDurationSeconds = totalDurationSeconds / sessions.length
  const avgSessionDuration = formatDurationHoursMin(Math.round(avgDurationSeconds))

  // Calls per hour
  const totalHours = totalDurationSeconds / 3600
  const callsPerHour = totalHours > 0 ? totalCalls / totalHours : 0

  // Avg connection rate
  const avgConnectionRate = connectionRates.length > 0
    ? connectionRates.reduce((a, b) => a + b, 0) / connectionRates.length
    : 0

  // Trend: last 3 vs previous 3
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (sessions.length >= 6) {
    const recent3 = connectionRates.slice(0, 3)
    const previous3 = connectionRates.slice(3, 6)
    const recentAvg = recent3.reduce((a, b) => a + b, 0) / 3
    const previousAvg = previous3.reduce((a, b) => a + b, 0) / 3
    const diff = recentAvg - previousAvg
    if (diff > 3) trend = 'up'
    else if (diff < -3) trend = 'down'
  } else if (sessions.length >= 4) {
    // If we have 4-5 sessions, compare last 2 vs first 2
    const recent2 = connectionRates.slice(0, 2)
    const previous2 = connectionRates.slice(-2)
    const recentAvg = recent2.reduce((a, b) => a + b, 0) / 2
    const previousAvg = previous2.reduce((a, b) => a + b, 0) / 2
    const diff = recentAvg - previousAvg
    if (diff > 3) trend = 'up'
    else if (diff < -3) trend = 'down'
  }

  return {
    bestSession,
    avgCallsPerSession: Math.round(avgCallsPerSession * 10) / 10,
    avgSessionDuration,
    callsPerHour: Math.round(callsPerHour * 10) / 10,
    avgConnectionRate: Math.round(avgConnectionRate),
    trend,
  }
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, label: 'Melhorando', color: 'text-green-500' },
  down: { icon: TrendingDown, label: 'Piorando', color: 'text-red-500' },
  stable: { icon: ArrowRight, label: 'Estavel', color: 'text-gray-400' },
} as const

const PAGE_SIZE = 5

export function SessionHistory({ sessions, isLoading }: SessionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const analytics = useMemo(() => computeSessionAnalytics(sessions), [sessions])

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const pagedSessions = sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-4 w-48 bg-accent dark:bg-accent rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-accent dark:bg-accent rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <History size={16} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-foreground">Historico de Sessoes</h3>
      </div>

      {analytics && (
        <div data-testid="session-analytics" className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Best session */}
            <div className="flex flex-col gap-1 px-3 py-2 bg-background dark:bg-card/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Target size={12} className="text-amber-500" />
                <span className="text-2xs text-muted-foreground">Melhor sessao</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {analytics.bestSession ? `${analytics.bestSession.rate}%` : '-'}
              </span>
              {analytics.bestSession && (
                <span className="text-2xs text-muted-foreground">{analytics.bestSession.date}</span>
              )}
            </div>

            {/* Avg calls/session */}
            <div className="flex flex-col gap-1 px-3 py-2 bg-background dark:bg-card/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Phone size={12} className="text-blue-500" />
                <span className="text-2xs text-muted-foreground">Media calls/sessao</span>
              </div>
              <span className="text-sm font-bold text-foreground">{analytics.avgCallsPerSession}</span>
            </div>

            {/* Avg session duration */}
            <div className="flex flex-col gap-1 px-3 py-2 bg-background dark:bg-card/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-purple-500" />
                <span className="text-2xs text-muted-foreground">Duracao media</span>
              </div>
              <span className="text-sm font-bold text-foreground">{analytics.avgSessionDuration}</span>
            </div>

            {/* Calls per hour */}
            <div className="flex flex-col gap-1 px-3 py-2 bg-background dark:bg-card/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="text-yellow-500" />
                <span className="text-2xs text-muted-foreground">Calls/hora</span>
              </div>
              <span className="text-sm font-bold text-foreground">{analytics.callsPerHour}</span>
            </div>

            {/* Avg connection rate */}
            <div className="flex flex-col gap-1 px-3 py-2 bg-background dark:bg-card/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Target size={12} className="text-green-500" />
                <span className="text-2xs text-muted-foreground">Taxa conexao media</span>
              </div>
              <span className="text-sm font-bold text-foreground">{analytics.avgConnectionRate}%</span>
            </div>

            {/* Trend */}
            {(() => {
              const trendCfg = TREND_CONFIG[analytics.trend]
              const TrendIcon = trendCfg.icon
              return (
                <div className="flex flex-col gap-1 px-3 py-2 bg-background dark:bg-card/50 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <TrendIcon size={12} className={trendCfg.color} />
                    <span className="text-2xs text-muted-foreground">Tendencia</span>
                  </div>
                  <span className={`text-sm font-bold ${trendCfg.color}`}>{trendCfg.label}</span>
                </div>
              )
            })()}
          </div>
          <div className="border-b border-border dark:border-border/50 mt-4" />
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock size={32} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Nenhuma sessao registrada ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Inicie uma sessao de prospeccao para ver o historico aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pagedSessions.map(session => {
            const stats = session.stats as Record<string, unknown>
            const isExpanded = expandedId === session.id
            const duration = (stats.duration_seconds as number) || 0
            const total = (stats.completed as number) || (stats.total as number) || 0
            const connected = (stats.connected as number) || 0
            const noAnswer = (stats.noAnswer as number) || 0
            const voicemail = (stats.voicemail as number) || 0
            const busy = (stats.busy as number) || 0
            const skipped = (stats.skipped as number) || 0
            const startDate = new Date(session.startedAt)

            return (
              <div key={session.id} className="border border-border dark:border-border/50 rounded-lg overflow-hidden">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-background dark:hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {startDate.toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      {formatDuration(duration)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone size={12} />
                      {total} chamada{total !== 1 ? 's' : ''}
                    </div>
                    <span className="text-xs font-medium text-primary-500">
                      {getConnectionRate(stats)}
                    </span>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </Button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border dark:border-border/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { icon: <CheckCircle size={14} className="text-green-500" />, label: 'Conectadas', value: connected },
                        { icon: <XCircle size={14} className="text-red-500" />, label: 'Nao atendeu', value: noAnswer },
                        { icon: <Voicemail size={14} className="text-purple-500" />, label: 'Correio de voz', value: voicemail },
                        { icon: <PhoneOff size={14} className="text-orange-500" />, label: 'Ocupado', value: busy },
                        { icon: <SkipForward size={14} className="text-yellow-500" />, label: 'Puladas', value: skipped },
                        { icon: <Clock size={14} className="text-blue-500" />, label: 'Duracao', value: formatDuration(duration) },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2 px-2 py-1.5 bg-background dark:bg-card/50 rounded-md">
                          {item.icon}
                          <span className="text-xs text-muted-foreground">{item.label}:</span>
                          <span className="text-xs font-medium text-foreground ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-2xs text-muted-foreground">
                {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, sessions.length)} de {sessions.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  Anterior
                </Button>
                <span className="text-2xs text-muted-foreground px-1">
                  {page + 1}/{totalPages}
                </span>
                <Button
                  variant="unstyled"
                  size="unstyled"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  Proximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
