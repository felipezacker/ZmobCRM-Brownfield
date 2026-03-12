'use client'

import React from 'react'
import { Phone, PhoneCall, PhoneOff, Voicemail, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'
import type { DrilldownCardType } from '../constants'
import { formatDuration } from '../utils/formatDuration'

interface MetricsCardsProps {
  metrics: ProspectingMetrics | null
  isLoading: boolean
  onCardClick?: (cardType: DrilldownCardType) => void
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtitle?: string
  color: string
  onClick?: () => void
}) {
  return (
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={onClick}
      className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all text-left w-full"
      aria-label={`Ver detalhes: ${label}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </Button>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent dark:bg-accent rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-accent dark:bg-accent rounded" />
          <div className="h-6 w-14 bg-accent dark:bg-accent rounded" />
        </div>
      </div>
    </div>
  )
}

export function MetricsCards({ metrics, isLoading, onCardClick }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const total = metrics?.totalCalls || 0
  const connected = metrics?.connectedCalls || 0
  const noAnswer = metrics?.byOutcome?.find(o => o.outcome === 'no_answer')?.count || 0
  const voicemailCount = metrics?.byOutcome?.find(o => o.outcome === 'voicemail')?.count || 0

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(0)}% do total` : undefined

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <KpiCard
        icon={Phone}
        label="Ligações Discadas"
        value={total.toString()}
        color="bg-blue-500"
        onClick={() => onCardClick?.('totalCalls')}
      />
      <KpiCard
        icon={PhoneCall}
        label="Atendidas"
        value={connected.toString()}
        subtitle={pct(connected)}
        color="bg-emerald-500"
        onClick={() => onCardClick?.('connected')}
      />
      <KpiCard
        icon={PhoneOff}
        label="Sem Resposta"
        value={noAnswer.toString()}
        subtitle={pct(noAnswer)}
        color="bg-red-500"
        onClick={() => onCardClick?.('noAnswer')}
      />
      <KpiCard
        icon={Voicemail}
        label="Correio de Voz"
        value={voicemailCount.toString()}
        subtitle={pct(voicemailCount)}
        color="bg-amber-500"
        onClick={() => onCardClick?.('voicemail')}
      />
      <KpiCard
        icon={Clock}
        label="Tempo Médio"
        value={formatDuration(metrics?.avgDuration || 0)}
        subtitle={connected > 0 ? 'por ligação conectada' : undefined}
        color="bg-violet-500"
        onClick={() => onCardClick?.('avgDuration')}
      />
      <KpiCard
        icon={Users}
        label="Contatos Prospectados"
        value={metrics?.uniqueContacts?.toString() || '0'}
        color="bg-primary-500"
        onClick={() => onCardClick?.('uniqueContacts')}
      />
    </div>
  )
}
