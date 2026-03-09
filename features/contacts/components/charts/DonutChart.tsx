'use client'

import React from 'react'

interface DonutItem {
  label: string
  count: number
}

interface DonutChartProps {
  items: DonutItem[]
  title?: string
}

const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
]

export function DonutChart({ items, title }: DonutChartProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground dark:text-muted-foreground py-4 text-center">Sem dados</p>
  }

  // Build conic-gradient segments
  let accumulated = 0
  const segments = items.map((item, idx) => {
    const pct = (item.count / total) * 100
    const start = accumulated
    accumulated += pct
    return { ...item, pct, start, end: accumulated, color: COLORS[idx % COLORS.length] }
  })

  const gradient = segments
    .map(s => `${s.color} ${s.start}% ${s.end}%`)
    .join(', ')

  return (
    <div>
      {title && (
        <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-3">{title}</p>
      )}
      <div className="flex items-center gap-6">
        <div
          className="w-28 h-28 rounded-full flex-shrink-0"
          style={{
            background: `conic-gradient(${gradient})`,
            mask: 'radial-gradient(farthest-side, transparent 55%, #000 56%)',
            WebkitMask: 'radial-gradient(farthest-side, transparent 55%, #000 56%)',
          }}
          role="img"
          aria-label={`Grafico: ${items.map(i => `${i.label}: ${i.count}`).join(', ')}`}
        />
        <div className="space-y-1.5 flex-1 min-w-0">
          {segments.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs text-secondary-foreground dark:text-muted-foreground truncate" title={s.label}>
                {s.label}
              </span>
              <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground ml-auto">
                {s.count} ({Math.round(s.pct)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
