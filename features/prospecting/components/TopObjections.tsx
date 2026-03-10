'use client'

import React, { useMemo } from 'react'
import { MessageSquareWarning } from 'lucide-react'
import type { CallActivity } from '@/features/prospecting/hooks/useProspectingMetrics'

interface TopObjectionsProps {
  activities: CallActivity[]
  isLoading: boolean
}

export function TopObjections({ activities, isLoading }: TopObjectionsProps) {
  const topObjections = useMemo(() => {
    const counts = new Map<string, number>()
    for (const activity of activities) {
      const meta = activity.metadata as Record<string, unknown> | null
      const objections = meta?.objections as string[] | undefined
      if (!objections || !Array.isArray(objections)) continue
      for (const objection of objections) {
        counts.set(objection, (counts.get(objection) || 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [activities])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-accent dark:bg-accent rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 bg-accent dark:bg-accent rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareWarning size={16} className="text-orange-400" />
        <h3 className="text-sm font-semibold text-foreground">Top 5 Objeções</h3>
      </div>

      {topObjections.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma objeção registrada. Marque objeções durante ligações para ver dados aqui.
        </p>
      ) : (
        <div className="space-y-2">
          {topObjections.map(([objection, count], index) => (
            <div key={objection} className="flex items-center justify-between py-1.5 px-2 bg-background dark:bg-card/50 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                <span className="text-sm text-foreground truncate">{objection}</span>
              </div>
              <span className="text-xs font-medium text-orange-500 shrink-0 ml-2">
                {count}x
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
