'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { BrokerMetric } from '@/features/prospecting/hooks/useProspectingMetrics'
import { formatDuration } from '@/features/prospecting/utils/formatDuration'

interface PerformanceComparisonProps {
  userMetrics: BrokerMetric | null
  teamAverage: BrokerMetric | null
  isAdminOrDirector: boolean
  periodDays: number
}

function ComparisonIndicator({ userValue, teamValue }: { userValue: number; teamValue: number }) {
  if (teamValue === 0) return <Minus size={14} className="text-gray-400" />

  const diff = ((userValue - teamValue) / teamValue) * 100

  if (Math.abs(diff) <= 5) {
    return <Minus size={14} className="text-gray-400" />
  }
  if (diff > 0) {
    return <TrendingUp size={14} className="text-green-500" />
  }
  return <TrendingDown size={14} className="text-red-500" />
}

function ComparisonCard({ label, userValue, teamValue, format }: {
  label: string
  userValue: number
  teamValue: number
  format: (v: number) => string
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-foreground">{format(userValue)}</p>
          <p className="text-[10px] text-muted-foreground">Você</p>
        </div>
        <ComparisonIndicator userValue={userValue} teamValue={teamValue} />
        <div className="text-right">
          <p className="text-lg font-bold text-muted-foreground">{format(teamValue)}</p>
          <p className="text-[10px] text-muted-foreground">Time</p>
        </div>
      </div>
    </div>
  )
}

// AC8: Se admin/diretor, nao renderizar (usam CorretorRanking)
export function PerformanceComparison({ userMetrics, teamAverage, isAdminOrDirector, periodDays }: PerformanceComparisonProps) {
  if (isAdminOrDirector || !userMetrics || !teamAverage) return null

  const days = Math.max(1, periodDays)
  const userCallsPerDay = userMetrics.totalCalls / days
  const teamCallsPerDay = teamAverage.totalCalls / days

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Você vs. Média do Time
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ComparisonCard
          label="Ligações/dia"
          userValue={userCallsPerDay}
          teamValue={teamCallsPerDay}
          format={v => v.toFixed(1)}
        />
        <ComparisonCard
          label="Taxa de Conexão"
          userValue={userMetrics.connectionRate}
          teamValue={teamAverage.connectionRate}
          format={v => `${v.toFixed(0)}%`}
        />
        <ComparisonCard
          label="Duração Média"
          userValue={userMetrics.avgDuration}
          teamValue={teamAverage.avgDuration}
          format={v => formatDuration(v)}
        />
        <ComparisonCard
          label="Contatos Únicos"
          userValue={userMetrics.uniqueContacts}
          teamValue={teamAverage.uniqueContacts}
          format={v => Math.round(v).toString()}
        />
      </div>
    </div>
  )
}
