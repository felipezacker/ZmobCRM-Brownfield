'use client'

import React from 'react'
import { Phone, PhoneCall, PhoneOff, Voicemail, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'
import type { DrilldownCardType } from '../constants'
import { formatDuration } from '../utils/formatDuration'
import { DeltaIndicator } from './DeltaIndicator'
import { SortableItemContainer } from './SortableItemEditor'

interface MetricsCardsProps {
  metrics: ProspectingMetrics | null
  isLoading: boolean
  onCardClick?: (cardType: DrilldownCardType) => void
  comparisonMetrics?: ProspectingMetrics | null
  isComparisonLoading?: boolean
  itemOrder?: string[]
  hiddenItems?: Set<string>
  isEditing?: boolean
  onToggleItem?: (itemId: string) => void
  onReorderItems?: (activeId: string, overId: string) => void
}

export const KPI_ITEM_IDS = [
  'total-calls', 'connected', 'no-answer', 'voicemail', 'avg-duration', 'unique-contacts',
] as const

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  onClick,
  delta,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtitle?: string
  color: string
  onClick?: () => void
  delta?: React.ReactNode
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
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-foreground">{value}</p>
            {delta}
          </div>
          {subtitle && (
            <p className="text-2xs text-muted-foreground dark:text-muted-foreground">{subtitle}</p>
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

export function MetricsCards({ metrics, isLoading, onCardClick, comparisonMetrics, isComparisonLoading, itemOrder, hiddenItems, isEditing, onToggleItem, onReorderItems }: MetricsCardsProps) {
  if (isLoading) {
    const visibleCount = itemOrder
      ? itemOrder.filter(id => !hiddenItems?.has(id)).length
      : 6
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: visibleCount || 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const total = metrics?.totalCalls || 0
  const connected = metrics?.connectedCalls || 0
  const noAnswer = metrics?.byOutcome?.find(o => o.outcome === 'no_answer')?.count || 0
  const voicemailCount = metrics?.byOutcome?.find(o => o.outcome === 'voicemail')?.count || 0

  const compTotal = comparisonMetrics?.totalCalls ?? 0
  const compConnected = comparisonMetrics?.connectedCalls ?? 0
  const compNoAnswer = comparisonMetrics?.byOutcome?.find(o => o.outcome === 'no_answer')?.count ?? 0
  const compVoicemail = comparisonMetrics?.byOutcome?.find(o => o.outcome === 'voicemail')?.count ?? 0

  const connectionImproved = (metrics?.connectionRate ?? 0) > (comparisonMetrics?.connectionRate ?? 0)
  const avgDurationInvertDirection = !connectionImproved

  const hasDelta = comparisonMetrics != null || isComparisonLoading

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(0)}% do total` : undefined

  const allCards: Record<string, React.ReactNode> = {
    'total-calls': (
      <KpiCard key="total-calls" icon={Phone} label="Ligações Discadas" value={total.toString()} color="bg-blue-500"
        onClick={() => onCardClick?.('totalCalls')}
        delta={hasDelta ? <DeltaIndicator current={total} previous={compTotal} isLoading={isComparisonLoading} /> : undefined}
      />
    ),
    'connected': (
      <KpiCard key="connected" icon={PhoneCall} label="Atendidas" value={connected.toString()} subtitle={pct(connected)} color="bg-emerald-500"
        onClick={() => onCardClick?.('connected')}
        delta={hasDelta ? <DeltaIndicator current={connected} previous={compConnected} isLoading={isComparisonLoading} /> : undefined}
      />
    ),
    'no-answer': (
      <KpiCard key="no-answer" icon={PhoneOff} label="Sem Resposta" value={noAnswer.toString()} subtitle={pct(noAnswer)} color="bg-red-500"
        onClick={() => onCardClick?.('noAnswer')}
        delta={hasDelta ? <DeltaIndicator current={noAnswer} previous={compNoAnswer} invertDirection isLoading={isComparisonLoading} /> : undefined}
      />
    ),
    'voicemail': (
      <KpiCard key="voicemail" icon={Voicemail} label="Correio de Voz" value={voicemailCount.toString()} subtitle={pct(voicemailCount)} color="bg-amber-500"
        onClick={() => onCardClick?.('voicemail')}
        delta={hasDelta ? <DeltaIndicator current={voicemailCount} previous={compVoicemail} invertDirection isLoading={isComparisonLoading} /> : undefined}
      />
    ),
    'avg-duration': (
      <KpiCard key="avg-duration" icon={Clock} label="Tempo Médio" value={formatDuration(metrics?.avgDuration || 0)}
        subtitle={connected > 0 ? 'por ligação conectada' : undefined} color="bg-violet-500"
        onClick={() => onCardClick?.('avgDuration')}
        delta={hasDelta ? <DeltaIndicator current={metrics?.avgDuration || 0} previous={comparisonMetrics?.avgDuration ?? 0} invertDirection={avgDurationInvertDirection} isLoading={isComparisonLoading} /> : undefined}
      />
    ),
    'unique-contacts': (
      <KpiCard key="unique-contacts" icon={Users} label="Contatos Prospectados" value={metrics?.uniqueContacts?.toString() || '0'} color="bg-primary-500"
        onClick={() => onCardClick?.('uniqueContacts')}
        delta={hasDelta ? <DeltaIndicator current={metrics?.uniqueContacts || 0} previous={comparisonMetrics?.uniqueContacts ?? 0} isLoading={isComparisonLoading} /> : undefined}
      />
    ),
  }

  const order = itemOrder || KPI_ITEM_IDS as unknown as string[]

  // Edit mode: show all cards with drag handles and eye toggles
  if (isEditing && onToggleItem && onReorderItems) {
    return (
      <SortableItemContainer
        itemIds={order}
        hiddenItems={hiddenItems || new Set()}
        onToggleItem={onToggleItem}
        onReorderItems={onReorderItems}
        renderItem={(id) => allCards[id] || null}
        className="grid grid-cols-2 lg:grid-cols-3 gap-3"
      />
    )
  }

  // Normal mode: render visible cards in order
  const visibleCards = order.filter(id => !hiddenItems?.has(id))
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {visibleCards.map(id => allCards[id]).filter(Boolean)}
    </div>
  )
}
