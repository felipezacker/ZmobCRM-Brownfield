'use client'

import React from 'react'
import { Phone, PhoneCall, Clock, Users } from 'lucide-react'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'
import { formatDuration } from '../utils/formatDuration'

interface MetricsCardsProps {
  metrics: ProspectingMetrics | null
  isLoading: boolean
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-6 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  )
}

export function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={Phone}
        label="Ligações"
        value={metrics?.totalCalls?.toString() || '0'}
        color="bg-blue-500"
      />
      <KpiCard
        icon={PhoneCall}
        label="Taxa de Conexão"
        value={`${(metrics?.connectionRate || 0).toFixed(1)}%`}
        color="bg-emerald-500"
      />
      <KpiCard
        icon={Clock}
        label="Tempo Médio"
        value={formatDuration(metrics?.avgDuration || 0)}
        color="bg-amber-500"
      />
      <KpiCard
        icon={Users}
        label="Contatos Prospectados"
        value={metrics?.uniqueContacts?.toString() || '0'}
        color="bg-violet-500"
      />
    </div>
  )
}
