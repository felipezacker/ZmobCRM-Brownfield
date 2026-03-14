'use client'

import React, { useMemo } from 'react'
import { PieChart as PieChartIcon } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'
import { useDarkMode } from '../hooks/useDarkMode'
import { OUTCOME_COLORS, chartTheme } from '@/lib/constants/chart-colors'

interface ConversionFunnelProps {
  metrics: ProspectingMetrics | null
  isLoading: boolean
}

interface OutcomeSlice extends Record<string, unknown> {
  name: string
  key: string
  value: number
  color: string
  pct: string
}

const OUTCOME_CONFIG = [
  { key: 'connected', label: 'Atendidas', color: OUTCOME_COLORS.connected },
  { key: 'no_answer', label: 'Sem Resposta', color: OUTCOME_COLORS.no_answer },
  { key: 'voicemail', label: 'Correio de Voz', color: OUTCOME_COLORS.voicemail },
  { key: 'busy', label: 'Ocupado', color: OUTCOME_COLORS.busy },
  { key: 'other', label: 'Outro', color: OUTCOME_COLORS.other },
] as const

function DonutSkeleton() {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5 animate-pulse">
      <div className="h-5 w-52 bg-accent dark:bg-accent rounded mb-6" />
      <div className="flex items-center gap-6">
        <div className="w-40 h-40 rounded-full bg-muted dark:bg-card shrink-0" />
        <div className="flex-1 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 bg-muted dark:bg-card rounded" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function CustomDonutTooltip({ active, payload, isDark }: {
  active?: boolean
  payload?: Array<{ payload: OutcomeSlice }>
  isDark: boolean
}) {
  if (!active || !payload?.[0]) return null

  const t = chartTheme(isDark)
  const d = payload[0].payload

  return (
    <div
      className="rounded-lg shadow-lg px-3 py-2 text-xs"
      style={{
        backgroundColor: t.tooltipBg,
        border: `1px solid ${t.tooltipBorder}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: d.color }}
        />
        <span style={{ color: t.text }} className="font-medium">{d.name}</span>
      </div>
      <div className="mt-1 flex items-center gap-3" style={{ color: t.tick }}>
        <span>{d.value} {d.value === 1 ? 'ligacao' : 'ligacoes'}</span>
        <span className="font-medium" style={{ color: t.text }}>{d.pct}%</span>
      </div>
    </div>
  )
}

export function ConversionFunnel({ metrics, isLoading }: ConversionFunnelProps) {
  const isDark = useDarkMode()

  const slices = useMemo(() => {
    if (!metrics || metrics.totalCalls === 0) return []

    const total = metrics.totalCalls
    const getCount = (key: string) => metrics.byOutcome.find(o => o.outcome === key)?.count || 0

    const connected = getCount('connected')
    const noAnswer = getCount('no_answer')
    const voicemail = getCount('voicemail')
    const busy = getCount('busy')
    const other = total - connected - noAnswer - voicemail - busy

    const raw = [
      { key: 'connected', value: connected },
      { key: 'no_answer', value: noAnswer },
      { key: 'voicemail', value: voicemail },
      { key: 'busy', value: busy },
      { key: 'other', value: other },
    ]

    return raw
      .filter(r => r.value > 0)
      .map(r => {
        const cfg = OUTCOME_CONFIG.find(o => o.key === r.key)!
        return {
          name: cfg.label,
          key: cfg.key,
          value: r.value,
          color: cfg.color,
          pct: ((r.value / total) * 100).toFixed(1),
        } as OutcomeSlice
      })
  }, [metrics])

  if (isLoading) return <DonutSkeleton />

  if (!metrics || metrics.totalCalls === 0) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-3 flex items-center gap-2">
          <PieChartIcon size={16} className="text-blue-500" />
          Distribuicao de Resultados
        </h3>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground py-8 text-center">
          Nenhuma ligacao registrada no periodo
        </p>
      </div>
    )
  }

  const total = metrics.totalCalls
  const connected = metrics.byOutcome.find(o => o.outcome === 'connected')?.count || 0
  const connectionRate = total > 0 ? ((connected / total) * 100).toFixed(1) : '0'

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground flex items-center gap-2">
          <PieChartIcon size={16} className="text-blue-500" />
          Distribuicao de Resultados
        </h3>
        <span className="text-2xs text-muted-foreground dark:text-muted-foreground">
          {total} {total === 1 ? 'ligacao' : 'ligacoes'} no total
        </span>
      </div>

      {/* Donut + Legend */}
      <div className="flex items-center gap-4">
        {/* Donut Chart */}
        <div className="relative w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                strokeWidth={0}
              >
                {slices.map(s => (
                  <Cell key={s.key} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomDonutTooltip isDark={isDark} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-foreground leading-none">{connectionRate}%</span>
            <span className="text-2xs text-muted-foreground dark:text-muted-foreground mt-0.5">Conexao</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {slices.map(s => (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-secondary-foreground dark:text-muted-foreground truncate flex-1">
                {s.name}
              </span>
              <span className="font-medium text-foreground tabular-nums shrink-0">
                {s.value}
              </span>
              <span className="text-muted-foreground dark:text-muted-foreground tabular-nums shrink-0 w-12 text-right">
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-border dark:border-border">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{connectionRate}%</p>
          <p className="text-2xs text-muted-foreground dark:text-muted-foreground">Conversao</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{connected}</p>
          <p className="text-2xs text-muted-foreground dark:text-muted-foreground">Respostas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{total - connected}</p>
          <p className="text-2xs text-muted-foreground dark:text-muted-foreground">Nao Atenderam</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{metrics.uniqueContacts}</p>
          <p className="text-2xs text-muted-foreground dark:text-muted-foreground">Contatos Unicos</p>
        </div>
      </div>
    </div>
  )
}
