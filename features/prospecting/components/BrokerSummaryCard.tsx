import React from 'react'
import { User, Phone, Zap, Handshake, DollarSign } from 'lucide-react'
import type { ProspectingMetrics } from '@/features/prospecting/hooks/useProspectingMetrics'
import type { ProspectingImpact } from '@/features/prospecting/hooks/useProspectingImpact'

interface BrokerSummaryCardProps {
  brokerName: string
  metrics: ProspectingMetrics
  impact: ProspectingImpact | null
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const BrokerSummaryCard: React.FC<BrokerSummaryCardProps> = ({
  brokerName,
  metrics,
  impact,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-muted/50 dark:bg-white/5 border border-border dark:border-border/50 rounded-xl">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
          <User size={16} className="text-primary-500" />
        </div>
        <span className="text-sm font-semibold text-foreground">{brokerName}</span>
      </div>

      <div className="h-6 w-px bg-border dark:bg-border/50 shrink-0 hidden sm:block" />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Phone size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Ligações</span>
          <span className="text-sm font-semibold text-foreground">{metrics.totalCalls}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Conexão</span>
          <span className="text-sm font-semibold text-foreground">{metrics.connectionRate.toFixed(1)}%</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Handshake size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Deals</span>
          <span className="text-sm font-semibold text-foreground">{impact?.callsWithDeal ?? 0}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <DollarSign size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Pipeline</span>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(impact?.pipelineValue ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}
