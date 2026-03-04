'use client'

import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailyMetric } from '../hooks/useProspectingMetrics'

interface MetricsChartProps {
  data: DailyMetric[]
  isLoading: boolean
}

const OUTCOME_CONFIG = {
  connected: { color: '#10b981', label: 'Conectou' },
  no_answer: { color: '#ef4444', label: 'Sem Resposta' },
  voicemail: { color: '#f59e0b', label: 'Correio de Voz' },
  busy: { color: '#6b7280', label: 'Ocupado' },
} as const

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    setIsDark(root.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'))
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

function ChartSkeleton() {
  return (
    <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-sm text-slate-400 dark:text-slate-500">Carregando gráfico...</span>
    </div>
  )
}

export function MetricsChart({ data, isLoading }: MetricsChartProps) {
  const isDark = useDarkMode()

  if (isLoading) return <ChartSkeleton />

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Nenhuma ligação registrada no período
        </p>
      </div>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    name: formatDate(d.date),
  }))

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Ligações por Dia
      </h3>
      <ResponsiveContainer width="100%" height={256}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="[&>line]:stroke-slate-200 dark:[&>line]:stroke-slate-700"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            className="[&>text]:fill-slate-500 dark:[&>text]:fill-slate-400"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            className="[&>text]:fill-slate-500 dark:[&>text]:fill-slate-400"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px',
              fontSize: '12px',
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
          />
          <Bar
            dataKey="connected"
            name={OUTCOME_CONFIG.connected.label}
            fill={OUTCOME_CONFIG.connected.color}
            stackId="calls"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="no_answer"
            name={OUTCOME_CONFIG.no_answer.label}
            fill={OUTCOME_CONFIG.no_answer.color}
            stackId="calls"
          />
          <Bar
            dataKey="voicemail"
            name={OUTCOME_CONFIG.voicemail.label}
            fill={OUTCOME_CONFIG.voicemail.color}
            stackId="calls"
          />
          <Bar
            dataKey="busy"
            name={OUTCOME_CONFIG.busy.label}
            fill={OUTCOME_CONFIG.busy.color}
            stackId="calls"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
