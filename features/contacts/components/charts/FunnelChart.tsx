'use client'

import React from 'react'

interface FunnelStage {
  stage: string
  count: number
  percentage: number
}

interface FunnelChartProps {
  stages: FunnelStage[]
}

const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  MQL: 'MQL',
  PROSPECT: 'Prospect',
  CUSTOMER: 'Cliente',
}

const STAGE_COLORS = [
  'bg-blue-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-green-600',
]

export function FunnelChart({ stages }: FunnelChartProps) {
  if (stages.length === 0) {
    return <p className="text-sm text-muted-foreground dark:text-muted-foreground py-4 text-center">Sem dados</p>
  }

  const maxCount = Math.max(...stages.map(s => s.count), 1)

  return (
    <div className="space-y-2">
      {stages.map((stage, idx) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, 8)
        return (
          <div key={stage.stage} className="flex items-center gap-3">
            <span className="text-xs text-secondary-foreground dark:text-muted-foreground w-16 text-right">
              {STAGE_LABELS[stage.stage] || stage.stage}
            </span>
            <div className="flex-1 flex items-center">
              <div
                className={`h-8 rounded-md flex items-center justify-center transition-all ${STAGE_COLORS[idx % STAGE_COLORS.length]}`}
                style={{ width: `${widthPct}%` }}
              >
                <span className="text-xs font-bold text-white px-2 whitespace-nowrap">
                  {stage.count}
                </span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground dark:text-muted-foreground w-10 text-right">
              {stage.percentage}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
