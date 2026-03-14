'use client'

import React from 'react'
import { RotateCcw } from 'lucide-react'
import type { RetryBucket, RetryEffectivenessData } from '@/features/prospecting/hooks/useRetryEffectiveness'

interface RetryEffectivenessProps {
  data: RetryEffectivenessData | undefined
  isLoading: boolean
}

function Skeleton() {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-4 w-48 bg-accent dark:bg-accent rounded mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-3 w-24 bg-muted dark:bg-card rounded mb-2" />
            <div className="h-2.5 w-full bg-muted dark:bg-card rounded-full mb-1" />
            <div className="h-3 w-36 bg-muted dark:bg-card rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function BucketRow({ bucket }: { bucket: RetryBucket }) {
  const pct = Math.round(bucket.rate)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-foreground">{bucket.label}</span>
        <span className="text-xs font-bold text-foreground">{pct}%</span>
      </div>
      <div className="h-2.5 w-full bg-muted dark:bg-card rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(pct, 0)}%` }}
        />
      </div>
      <p className="text-2xs text-muted-foreground mt-0.5">
        {bucket.completed} de {bucket.total} conectaram ({pct}%)
      </p>
    </div>
  )
}

export function RetryEffectiveness({ data, isLoading }: RetryEffectivenessProps) {
  if (isLoading) return <Skeleton />

  if (!data || !data.hasData) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-3 flex items-center gap-2">
          <RotateCcw size={16} className="text-blue-500" />
          Efetividade de Retentativas
        </h3>
        <p className="text-sm text-muted-foreground py-6 text-center">
          Dados insuficientes para analise de retentativas
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-4 flex items-center gap-2">
        <RotateCcw size={16} className="text-blue-500" />
        Efetividade de Retentativas
      </h3>
      <div className="space-y-4">
        <BucketRow bucket={data.firstAttempt} />
        <BucketRow bucket={data.secondAttempt} />
        <BucketRow bucket={data.thirdPlus} />
      </div>
    </div>
  )
}
