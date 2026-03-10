'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyMetric } from '../hooks/useProspectingMetrics'
import { useDarkMode } from '../hooks/useDarkMode'
import { OUTCOME_COLORS, chartTheme } from '@/lib/constants/chart-colors'

interface MetricsChartProps {
  data: DailyMetric[]
  isLoading: boolean
  periodStart?: string
  periodEnd?: string
}

const OUTCOMES = [
  { key: 'connected', color: OUTCOME_COLORS.connected, label: 'Conectou' },
  { key: 'no_answer', color: OUTCOME_COLORS.no_answer, label: 'Sem Resposta' },
  { key: 'voicemail', color: OUTCOME_COLORS.voicemail, label: 'Correio de Voz' },
  { key: 'busy', color: OUTCOME_COLORS.busy, label: 'Ocupado' },
  { key: 'other', color: OUTCOME_COLORS.other, label: 'Outro' },
] as const

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

/** Fill missing days in the range so the chart shows a continuous timeline */
function fillDateGaps(data: DailyMetric[], start?: string, end?: string): DailyMetric[] {
  if (data.length === 0) return data

  const startDate = start ? new Date(start) : new Date(data[0].date)
  const endDate = end ? new Date(end) : new Date(data[data.length - 1].date)
  const dataMap = new Map(data.map(d => [d.date.split('T')[0], d]))

  const filled: DailyMetric[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const key = current.toISOString().split('T')[0]
    filled.push(
      dataMap.get(key) || {
        date: key,
        connected: 0,
        no_answer: 0,
        voicemail: 0,
        busy: 0,
        other: 0,
        total: 0,
      },
    )
    current.setDate(current.getDate() + 1)
  }

  return filled
}

function CustomTooltip({ active, payload, label, isDark }: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>
  label?: string
  isDark: boolean
}) {
  if (!active || !payload) return null

  const t = chartTheme(isDark)
  const nonZero = payload.filter(p => p.value > 0)
  const total = payload.reduce((sum, p) => sum + p.value, 0)

  if (total === 0) return null

  return (
    <div
      className="rounded-lg shadow-lg px-3 py-2.5 text-xs"
      style={{
        backgroundColor: t.tooltipBg,
        border: `1px solid ${t.tooltipBorder}`,
      }}
    >
      <p className="font-medium mb-1.5" style={{ color: t.text }}>
        {label}
      </p>
      {nonZero.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: t.tick }}>{entry.name}</span>
          <span className="ml-auto font-medium" style={{ color: t.text }}>
            {entry.value}
          </span>
        </div>
      ))}
      {nonZero.length > 1 && (
        <div
          className="flex items-center justify-between pt-1.5 mt-1.5 font-medium"
          style={{
            borderTop: `1px solid ${t.tooltipBorder}`,
            color: t.text,
          }}
        >
          <span>Total</span>
          <span>{total}</span>
        </div>
      )}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="h-64 bg-muted dark:bg-card rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-sm text-muted-foreground dark:text-muted-foreground">Carregando gráfico...</span>
    </div>
  )
}

export function MetricsChart({ data, isLoading, periodStart, periodEnd }: MetricsChartProps) {
  const isDark = useDarkMode()
  const theme = chartTheme(isDark)

  if (isLoading) return <ChartSkeleton />

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl">
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          Nenhuma ligação registrada no período
        </p>
      </div>
    )
  }

  const filled = fillDateGaps(data, periodStart, periodEnd)
  const chartData = filled.map(d => ({
    ...d,
    name: formatDate(d.date),
  }))

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 min-h-[280px] lg:min-h-[360px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground">
          Ligações por Dia
        </h3>
        <div className="flex items-center gap-3">
          {OUTCOMES.map(o => (
            <div key={o.key} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: o.color }} />
              <span className="text-[10px] text-muted-foreground dark:text-muted-foreground">{o.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-56 lg:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={theme.grid}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: theme.tick }}
              axisLine={{ stroke: theme.grid }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip isDark={isDark} />}
              cursor={{ fill: theme.cursor }}
            />
            {OUTCOMES.map((o, i) => (
              <Bar
                key={o.key}
                dataKey={o.key}
                name={o.label}
                fill={o.color}
                stackId="calls"
                radius={i === OUTCOMES.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
