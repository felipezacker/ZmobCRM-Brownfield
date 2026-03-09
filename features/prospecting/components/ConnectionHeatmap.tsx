'use client'

import React, { useMemo, useState } from 'react'
import { Flame, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CallActivity } from '../hooks/useProspectingMetrics'

interface ConnectionHeatmapProps {
  activities: CallActivity[]
  isLoading: boolean
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const TIME_SLOTS = ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20']
const TIME_LABELS = ['8h', '10h', '12h', '14h', '16h', '18h']
const PERIODS = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
] as const

const MIN_CALLS = 50

function getTimeSlot(hour: number): string | null {
  if (hour >= 8 && hour < 10) return '08-10'
  if (hour >= 10 && hour < 12) return '10-12'
  if (hour >= 12 && hour < 14) return '12-14'
  if (hour >= 14 && hour < 16) return '14-16'
  if (hour >= 16 && hour < 18) return '16-18'
  if (hour >= 18 && hour < 20) return '18-20'
  return null
}

function getCellColor(rate: number): string {
  if (rate >= 0.4) return 'bg-emerald-500 dark:bg-emerald-600'
  if (rate >= 0.3) return 'bg-orange-400 dark:bg-orange-500'
  if (rate >= 0.2) return 'bg-amber-400 dark:bg-amber-500'
  if (rate >= 0.1) return 'bg-amber-200 dark:bg-amber-300/30'
  return 'bg-muted dark:bg-card'
}

interface HeatmapCell {
  total: number
  connected: number
  rate: number
}

type HeatmapData = Record<string, Record<string, HeatmapCell>>

function buildHeatmap(activities: CallActivity[], days: number): { data: HeatmapData; totalCalls: number } {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  const filtered = activities.filter(a => a.date >= cutoffStr)
  const totalCalls = filtered.length

  const data: HeatmapData = {}
  for (const day of DAYS) {
    data[day] = {}
    for (const slot of TIME_SLOTS) {
      data[day][slot] = { total: 0, connected: 0, rate: 0 }
    }
  }

  for (const a of filtered) {
    const dt = new Date(a.date)
    const dayName = DAYS[dt.getDay()]
    const slot = getTimeSlot(dt.getHours())
    if (!slot) continue

    const cell = data[dayName][slot]
    cell.total++
    if (a.metadata?.outcome === 'connected') cell.connected++
  }

  // Compute rates
  for (const day of DAYS) {
    for (const slot of TIME_SLOTS) {
      const cell = data[day][slot]
      cell.rate = cell.total > 0 ? cell.connected / cell.total : 0
    }
  }

  return { data, totalCalls }
}

interface TooltipInfo {
  day: string
  time: string
  rate: number
  connected: number
  total: number
  x: number
  y: number
}

export function ConnectionHeatmap({ activities, isLoading }: ConnectionHeatmapProps) {
  const [period, setPeriod] = useState<number>(30)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  const { data: heatmap, totalCalls } = useMemo(
    () => buildHeatmap(activities, period),
    [activities, period],
  )

  const hasEnoughData = totalCalls >= MIN_CALLS

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-4 w-48 bg-accent dark:bg-accent rounded mb-4" />
        <div className="h-48 bg-accent dark:bg-accent rounded" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-foreground">Melhor Horario para Ligar</h3>
        </div>
        <div className="flex items-center gap-1 bg-muted dark:bg-white/10 rounded-lg p-0.5">
          {PERIODS.map(p => (
            <Button
              key={p.value}
              variant="unstyled"
              size="unstyled"
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                period === p.value
                  ? 'bg-white dark:bg-white/15 text-foreground  shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
              }`}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {!hasEnoughData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Info size={32} className="text-muted-foreground dark:text-secondary-foreground mb-3" />
          <p className="text-sm text-muted-foreground dark:text-muted-foreground font-medium">Dados insuficientes</p>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
            {totalCalls}/{MIN_CALLS} chamadas nos ultimos {period} dias. Continue prospectando!
          </p>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          {/* Grid */}
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${TIME_SLOTS.length}, 1fr)` }}>
            {/* Header row — time labels */}
            <div />
            {TIME_LABELS.map(label => (
              <div key={label} className="text-[10px] text-muted-foreground dark:text-muted-foreground text-center font-medium pb-1 min-w-[48px]">
                {label}
              </div>
            ))}

            {/* Data rows */}
            {DAYS.map(day => (
              <React.Fragment key={day}>
                <div className="text-[11px] text-muted-foreground dark:text-muted-foreground font-medium pr-2 flex items-center">
                  {day}
                </div>
                {TIME_SLOTS.map(slot => {
                  const cell = heatmap[day][slot]
                  return (
                    <div
                      key={`${day}-${slot}`}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`${day} ${slot.replace('-', 'h-')}h: ${(cell.rate * 100).toFixed(0)}% conexao (${cell.connected}/${cell.total})`}
                      className={`h-8 min-w-[48px] rounded-md cursor-default transition-colors ${getCellColor(cell.rate)} ${
                        cell.total === 0 ? 'opacity-40' : ''
                      } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({
                          day,
                          time: slot.replace('-', 'h-') + 'h',
                          rate: cell.rate,
                          connected: cell.connected,
                          total: cell.total,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({
                          day,
                          time: slot.replace('-', 'h-') + 'h',
                          rate: cell.rate,
                          connected: cell.connected,
                          total: cell.total,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        })
                      }}
                      onBlur={() => setTooltip(null)}
                    />
                  )
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground dark:text-muted-foreground">
            <span>Menor</span>
            <div className="flex gap-0.5">
              {['bg-muted dark:bg-card', 'bg-amber-200 dark:bg-amber-300/30', 'bg-amber-400 dark:bg-amber-500', 'bg-orange-400 dark:bg-orange-500', 'bg-emerald-500 dark:bg-emerald-600'].map((c, i) => (
                <div key={i} className={`w-5 h-3 rounded-sm ${c}`} />
              ))}
            </div>
            <span>Maior conexao</span>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 px-3 py-2 bg-card dark:bg-accent text-white text-xs rounded-lg shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <p className="font-medium">{tooltip.day} {tooltip.time}</p>
              <p>{(tooltip.rate * 100).toFixed(0)}% conexao ({tooltip.connected}/{tooltip.total} chamadas)</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
