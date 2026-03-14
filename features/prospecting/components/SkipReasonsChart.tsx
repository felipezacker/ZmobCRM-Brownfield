'use client'

import React, { useMemo } from 'react'
import { SkipForward } from 'lucide-react'
import type { SkipReasonCount } from '@/features/prospecting/hooks/useSkipReasons'

const REASON_LABELS: Record<string, string> = {
  wrong_number: 'Numero errado',
  already_tried: 'Ja tentado',
  bad_timing: 'Momento ruim',
  no_interest: 'Sem interesse',
  other: 'Outro',
} as const

const REASON_COLORS: Record<string, string> = {
  wrong_number: 'bg-red-500',
  already_tried: 'bg-amber-500',
  bad_timing: 'bg-blue-500',
  no_interest: 'bg-purple-500',
  other: 'bg-gray-400',
} as const

const REASON_TEXT_COLORS: Record<string, string> = {
  wrong_number: 'text-red-500',
  already_tried: 'text-amber-500',
  bad_timing: 'text-blue-500',
  no_interest: 'text-purple-500',
  other: 'text-gray-400',
} as const

interface SkipReasonsChartProps {
  data: SkipReasonCount[]
  isLoading: boolean
}

export function SkipReasonsChart({ data, isLoading }: SkipReasonsChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 animate-pulse">
        <div className="h-4 w-40 bg-accent dark:bg-accent rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 bg-accent dark:bg-accent rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <SkipForward size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Motivos de Skip</h3>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum skip registrado
        </p>
      ) : (
        <div className="space-y-2">
          {data.map(({ reason, count }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            const label = REASON_LABELS[reason] || reason
            const barColor = REASON_COLORS[reason] || 'bg-gray-400'
            const textColor = REASON_TEXT_COLORS[reason] || 'text-gray-400'

            return (
              <div key={reason} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{label}</span>
                  <span className={`text-xs font-medium ${textColor}`}>
                    {count}x ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-accent dark:bg-accent rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
