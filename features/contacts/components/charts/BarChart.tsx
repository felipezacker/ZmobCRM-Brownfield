'use client'

import React from 'react'

interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  items: BarChartItem[]
  maxItems?: number
}

const DEFAULT_COLORS = [
  'bg-primary-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
]

export function BarChart({ items, maxItems = 8 }: BarChartProps) {
  const displayed = items.slice(0, maxItems)
  const max = Math.max(...displayed.map(i => i.value), 1)

  if (displayed.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">Sem dados</p>
  }

  return (
    <div className="space-y-3">
      {displayed.map((item, idx) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-400 w-20 truncate text-right" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}`}
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-10 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
