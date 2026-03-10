import React, { useState } from 'react'
import { Clock, ChevronDown, ChevronUp, Phone, CheckCircle, XCircle, Voicemail, PhoneOff, SkipForward, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProspectingSession } from '@/lib/supabase/prospecting-sessions'

interface SessionHistoryProps {
  sessions: ProspectingSession[]
  isLoading: boolean
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

function getConnectionRate(stats: Record<string, unknown>): string {
  const total = (stats.completed as number) || (stats.total as number) || 0
  const connected = (stats.connected as number) || 0
  if (total === 0) return '0%'
  return `${Math.round((connected / total) * 100)}%`
}

export function SessionHistory({ sessions, isLoading }: SessionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
          {sessions.map(session => {
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
        </div>
      )}
    </div>
  )
}
