'use client'

import React from 'react'
import { Link2, TrendingUp, DollarSign, Trophy } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useDarkMode } from '../hooks/useDarkMode'
import { chartTheme, CHART_PALETTE, DEFAULT_STAGE_COLOR } from '@/lib/constants/chart-colors'
import type { ProspectingImpact } from '../hooks/useProspectingImpact'

interface ProspectingImpactSectionProps {
  impact: ProspectingImpact | null
  isLoading: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtitle?: string
  color: string
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`} aria-hidden="true">
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
    </div>
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

export function ProspectingImpactSection({ impact, isLoading }: ProspectingImpactSectionProps) {
  const isDark = useDarkMode()
  const theme = chartTheme(isDark)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground">
          Impacto no Pipeline
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm animate-pulse h-[160px]" />
      </div>
    )
  }

  if (!impact || impact.totalProspectingCalls === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground">
          Impacto no Pipeline
        </h3>
        <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Sem dados de impacto no periodo selecionado
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground">
        Impacto no Pipeline
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Link2}
          label="Ligacoes com Deal"
          value={`${impact.callsWithDeal} / ${impact.totalProspectingCalls}`}
          color="bg-blue-500"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taxa de Vinculacao"
          value={`${impact.linkageRate.toFixed(1)}%`}
          color="bg-emerald-500"
        />
        <KpiCard
          icon={DollarSign}
          label="Pipeline Gerado"
          value={formatCurrency(impact.pipelineValue)}
          color="bg-violet-500"
        />
        <KpiCard
          icon={Trophy}
          label="Deals Ganhos"
          value={impact.dealsWon.toString()}
          subtitle={impact.dealsWon > 0 ? formatCurrency(impact.dealsWonValue) : undefined}
          color="bg-amber-500"
        />
      </div>

      {/* Mini-chart: linked vs unlinked calls by day */}
      {impact.byDay.length > 0 && (
        <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-2">
            Ligacoes com/sem deal por dia
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={impact.byDay} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10, fill: theme.tick }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: theme.tick }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.tooltipBg,
                  border: `1px solid ${theme.tooltipBorder}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={formatDate}
              />
              <Bar
                dataKey="linked"
                name="Com Deal"
                stackId="a"
                fill={CHART_PALETTE[1]}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="unlinked"
                name="Sem Deal"
                stackId="a"
                fill={DEFAULT_STAGE_COLOR}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
