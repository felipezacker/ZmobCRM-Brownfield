'use client'

import React, { useMemo } from 'react'
import { Lightbulb, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'

interface AutoInsightsProps {
  metrics: ProspectingMetrics | null
  isLoading: boolean
}

interface Insight {
  icon: React.ElementType
  iconColor: string
  bgColor: string
  borderColor: string
  title: string
  description: string
}

function generateInsights(metrics: ProspectingMetrics): Insight[] {
  const insights: Insight[] = []

  // Low connection rate
  if (metrics.totalCalls >= 10 && metrics.connectionRate < 20) {
    insights.push({
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      borderColor: 'border-amber-200 dark:border-amber-500/20',
      title: 'Baixa Taxa de Resposta',
      description: `Apenas ${metrics.connectionRate.toFixed(0)}% das ligações são atendidas. Considere revisar os horários de ligação.`,
    })
  }

  // Good connection rate
  if (metrics.totalCalls >= 10 && metrics.connectionRate >= 30) {
    insights.push({
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      borderColor: 'border-emerald-200 dark:border-emerald-500/20',
      title: 'Boa Taxa de Conexão',
      description: `${metrics.connectionRate.toFixed(0)}% das ligações estão sendo atendidas. Continue com essa estratégia.`,
    })
  }

  // High no-answer rate
  const noAnswerCount = metrics.byOutcome.find(o => o.outcome === 'no_answer')?.count || 0
  const noAnswerRate = metrics.totalCalls > 0 ? (noAnswerCount / metrics.totalCalls) * 100 : 0
  if (metrics.totalCalls >= 10 && noAnswerRate > 60) {
    insights.push({
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-500/10',
      borderColor: 'border-red-200 dark:border-red-500/20',
      title: 'Alto Volume Sem Resposta',
      description: `${noAnswerRate.toFixed(0)}% das ligações não são atendidas. Tente ligar em horários diferentes ou verifique os números.`,
    })
  }

  // Top performer
  if (metrics.byBroker.length >= 2) {
    const top = metrics.byBroker[0]
    if (top.totalCalls > 0) {
      insights.push({
        icon: TrendingUp,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-500/10',
        borderColor: 'border-blue-200 dark:border-blue-500/20',
        title: 'Destaque da Equipe',
        description: `${top.ownerName} lidera com ${top.totalCalls} ligações e ${top.connectionRate.toFixed(0)}% de conexão.`,
      })
    }
  }

  // Short avg duration
  if (metrics.avgDuration > 0 && metrics.avgDuration < 30 && metrics.connectedCalls >= 5) {
    insights.push({
      icon: Clock,
      iconColor: 'text-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
      borderColor: 'border-violet-200 dark:border-violet-500/20',
      title: 'Ligações Curtas',
      description: `Tempo médio de ${Math.round(metrics.avgDuration)}s por ligação conectada. Tente manter conversas mais longas para melhor engajamento.`,
    })
  }

  // Low volume
  if (metrics.totalCalls < 10 && metrics.totalCalls > 0) {
    insights.push({
      icon: Lightbulb,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      borderColor: 'border-amber-200 dark:border-amber-500/20',
      title: 'Volume Baixo',
      description: `Apenas ${metrics.totalCalls} ligações no período. Aumente o volume para resultados mais consistentes.`,
    })
  }

  return insights
}

export function AutoInsights({ metrics, isLoading }: AutoInsightsProps) {
  const insights = useMemo(() => {
    if (!metrics) return []
    return generateInsights(metrics)
  }, [metrics])

  if (isLoading || insights.length === 0) return null

  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-3 flex items-center gap-2">
        <Lightbulb size={16} className="text-amber-500" />
        Insights Automáticos
      </h3>
      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${insight.bgColor} ${insight.borderColor}`}
          >
            <insight.icon size={16} className={`${insight.iconColor} shrink-0 mt-0.5`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground dark:text-muted-foreground">{insight.title}</p>
              <p className="text-xs text-secondary-foreground dark:text-muted-foreground mt-0.5">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
