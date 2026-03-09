'use client'

import React from 'react'
import { TrendingDown } from 'lucide-react'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'

interface ConversionFunnelProps {
  metrics: ProspectingMetrics | null
  isLoading: boolean
}

interface FunnelStep {
  label: string
  count: number
  color: string
  bgColor: string
}

function FunnelSkeleton() {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5 animate-pulse">
      <div className="h-5 w-44 bg-accent dark:bg-accent rounded mb-6" />
      <div className="space-y-3">
        {[100, 85, 60, 40, 25].map((w, i) => (
          <div key={i} className="h-10 bg-muted dark:bg-card rounded-lg" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

export function ConversionFunnel({ metrics, isLoading }: ConversionFunnelProps) {
  if (isLoading) return <FunnelSkeleton />

  if (!metrics || metrics.totalCalls === 0) {
    return (
      <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-3 flex items-center gap-2">
          <TrendingDown size={16} className="text-blue-500" />
          Funil de Conversão
        </h3>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground py-8 text-center">
          Nenhuma ligação registrada no período
        </p>
      </div>
    )
  }

  const total = metrics.totalCalls
  const byOutcome = metrics.byOutcome
  const getCount = (key: string) => byOutcome.find(o => o.outcome === key)?.count || 0

  const connected = getCount('connected')
  const noAnswer = getCount('no_answer')
  const voicemail = getCount('voicemail')
  const busy = getCount('busy')
  const other = total - connected - noAnswer - voicemail - busy

  const steps: FunnelStep[] = [
    { label: 'Ligações Discadas', count: total, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500' },
    { label: 'Atendidas', count: connected, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500' },
    { label: 'Sem Resposta', count: noAnswer, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500' },
    { label: 'Correio de Voz', count: voicemail, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500' },
    { label: 'Ocupado', count: busy, color: 'text-secondary-foreground dark:text-muted-foreground', bgColor: 'bg-accent' },
  ]

  if (other > 0) {
    steps.push({ label: 'Outro', count: other, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500' })
  }

  const connectionRate = total > 0 ? ((connected / total) * 100).toFixed(1) : '0'

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground flex items-center gap-2">
          <TrendingDown size={16} className="text-blue-500" />
          Funil de Conversão
        </h3>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Conversão Geral</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{connectionRate}%</p>
        </div>
      </div>

      {/* Funnel bars */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const pct = total > 0 ? (step.count / total) * 100 : 0
          const widthPct = Math.max(pct, 4) // min 4% width so label is visible
          const conversionFromPrev = i === 1 && total > 0
            ? `${((step.count / total) * 100).toFixed(0)}% atenderam`
            : null

          return (
            <div key={step.label}>
              {conversionFromPrev && (
                <div className="flex items-center gap-2 py-1 pl-4">
                  <div className="w-px h-3 bg-accent dark:bg-accent" />
                  <span className="text-[10px] text-muted-foreground dark:text-muted-foreground">{conversionFromPrev}</span>
                </div>
              )}
              {i === 2 && (
                <div className="flex items-center gap-2 py-1.5 pl-4">
                  <div className="w-px h-3 bg-accent dark:bg-accent" />
                  <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-medium">
                    Não atenderam: {total - connected} ({total > 0 ? (((total - connected) / total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={`${step.bgColor} rounded-lg px-3 py-2 flex items-center justify-between transition-all`}
                  style={{ width: `${i === 0 ? 100 : widthPct}%`, minWidth: 'fit-content' }}
                >
                  <span className="text-xs font-medium text-white truncate">{step.label}</span>
                  <span className="text-xs font-bold text-white ml-2 shrink-0">{step.count}</span>
                </div>
                {i > 0 && (
                  <span className={`text-xs font-medium ${step.color} shrink-0`}>
                    {pct.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-border dark:border-border">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{connectionRate}%</p>
          <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">Conversão</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{connected}</p>
          <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">Respostas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{total - connected}</p>
          <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">Não Atenderam</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{metrics.uniqueContacts}</p>
          <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">Contatos Únicos</p>
        </div>
      </div>
    </div>
  )
}
