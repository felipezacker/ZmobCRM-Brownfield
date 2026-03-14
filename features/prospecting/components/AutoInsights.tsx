'use client'

import React, { useMemo } from 'react'
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Clock,
  Voicemail,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
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
  severity: 'alert' | 'warning' | 'info' | 'positive'
}

const SEVERITY_ORDER: Record<Insight['severity'], number> = {
  alert: 0,
  warning: 1,
  info: 2,
  positive: 3,
}

const MAX_VISIBLE_INSIGHTS = 4

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const sqDiffs = values.map(v => (v - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / values.length)
}

function generateInsights(metrics: ProspectingMetrics): Insight[] {
  const insights: Insight[] = []

  // 1. Low connection rate
  if (metrics.totalCalls >= 10 && metrics.connectionRate < 20) {
    insights.push({
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      borderColor: 'border-amber-200 dark:border-amber-500/20',
      title: 'Baixa Taxa de Resposta',
      description: `Apenas ${metrics.connectionRate.toFixed(0)}% das ligações são atendidas. Considere revisar os horários de ligação.`,
      severity: 'warning',
    })
  }

  // 2. Good connection rate
  if (metrics.totalCalls >= 10 && metrics.connectionRate >= 30) {
    insights.push({
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      borderColor: 'border-emerald-200 dark:border-emerald-500/20',
      title: 'Boa Taxa de Conexão',
      description: `${metrics.connectionRate.toFixed(0)}% das ligações estão sendo atendidas. Continue com essa estratégia.`,
      severity: 'positive',
    })
  }

  // 3. High no-answer rate
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
      severity: 'alert',
    })
  }

  // 4. Top performer
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
        severity: 'info',
      })
    }
  }

  // 5. Short avg duration
  if (metrics.avgDuration > 0 && metrics.avgDuration < 30 && metrics.connectedCalls >= 5) {
    insights.push({
      icon: Clock,
      iconColor: 'text-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
      borderColor: 'border-violet-200 dark:border-violet-500/20',
      title: 'Ligações Curtas',
      description: `Tempo médio de ${Math.round(metrics.avgDuration)}s por ligação conectada. Tente manter conversas mais longas para melhor engajamento.`,
      severity: 'warning',
    })
  }

  // 6. Low volume
  if (metrics.totalCalls < 10 && metrics.totalCalls > 0) {
    insights.push({
      icon: Lightbulb,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      borderColor: 'border-amber-200 dark:border-amber-500/20',
      title: 'Volume Baixo',
      description: `Apenas ${metrics.totalCalls} ligações no período. Aumente o volume para resultados mais consistentes.`,
      severity: 'warning',
    })
  }

  // 7. High voicemail rate
  const voicemailCount = metrics.byOutcome.find(o => o.outcome === 'voicemail')?.count || 0
  const voicemailRate = metrics.totalCalls > 0 ? (voicemailCount / metrics.totalCalls) * 100 : 0
  if (voicemailRate > 15 && metrics.totalCalls >= 10) {
    insights.push({
      icon: Voicemail,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      borderColor: 'border-amber-200 dark:border-amber-500/20',
      title: 'Alto Índice de Correio de Voz',
      description: `Alto índice de correio de voz (${voicemailRate.toFixed(0)}%). Considere ligar em horários alternativos.`,
      severity: 'warning',
    })
  }

  // 8. Productivity by day of week
  if (metrics.byDay.length >= 3) {
    const dailyTotals = metrics.byDay.map(d => d.total)
    const avgDaily = dailyTotals.reduce((s, v) => s + v, 0) / dailyTotals.length
    if (avgDaily > 0) {
      const bestDay = metrics.byDay.reduce((best, d) => (d.total > best.total ? d : best), metrics.byDay[0])
      if (bestDay.total >= avgDaily * 2) {
        const dayOfWeek = new Date(bestDay.date + 'T12:00:00').getDay()
        const dayName = DAY_NAMES[dayOfWeek]
        insights.push({
          icon: Calendar,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-500/10',
          borderColor: 'border-blue-200 dark:border-blue-500/20',
          title: 'Dia Mais Produtivo',
          description: `Suas ${dayName}s são mais produtivas (${bestDay.total} ligações vs média de ${Math.round(avgDaily)}).`,
          severity: 'info',
        })
      }
    }
  }

  // 9. Contact diversification
  if (metrics.totalCalls >= 20 && metrics.uniqueContacts > 0) {
    const diversificationRate = (metrics.uniqueContacts / metrics.totalCalls) * 100
    if (diversificationRate < 50) {
      insights.push({
        icon: Users,
        iconColor: 'text-violet-500',
        bgColor: 'bg-violet-50 dark:bg-violet-500/10',
        borderColor: 'border-violet-200 dark:border-violet-500/20',
        title: 'Diversifique os Contatos',
        description: `Você está ligando repetidamente para os mesmos contatos. ${diversificationRate.toFixed(0)}% das ligações são para contatos únicos.`,
        severity: 'warning',
      })
    }
  }

  // 10. No recent activity (infer period from byDay date range)
  if (metrics.byDay.length >= 3) {
    const sortedDays = [...metrics.byDay].sort((a, b) => a.date.localeCompare(b.date))
    const firstDate = new Date(sortedDays[0].date + 'T12:00:00')
    const lastDate = new Date(sortedDays[sortedDays.length - 1].date + 'T12:00:00')
    const spanDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (spanDays >= 5) {
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const recentDays = sortedDays.filter(d => new Date(d.date + 'T12:00:00') >= twoDaysAgo)
      if (recentDays.length === 0) {
        insights.push({
          icon: AlertCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-500/10',
          borderColor: 'border-red-200 dark:border-red-500/20',
          title: 'Sem Atividade Recente',
          description: 'Nenhuma ligação nos últimos 2 dias. Retome a prospecção para manter o ritmo.',
          severity: 'alert',
        })
      }
    }
  }

  // 11. Connection rate improvement (compare first half vs second half)
  if (metrics.byDay.length >= 7) {
    const sortedDays = [...metrics.byDay].sort((a, b) => a.date.localeCompare(b.date))
    const mid = Math.floor(sortedDays.length / 2)
    const firstHalf = sortedDays.slice(0, mid)
    const secondHalf = sortedDays.slice(mid)

    const calcRate = (days: typeof sortedDays) => {
      const totalCalls = days.reduce((s, d) => s + d.total, 0)
      const connected = days.reduce((s, d) => s + d.connected, 0)
      return totalCalls > 0 ? (connected / totalCalls) * 100 : 0
    }

    const firstRate = calcRate(firstHalf)
    const secondRate = calcRate(secondHalf)
    const improvement = secondRate - firstRate

    if (improvement > 10) {
      insights.push({
        icon: TrendingUp,
        iconColor: 'text-emerald-500',
        bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
        borderColor: 'border-emerald-200 dark:border-emerald-500/20',
        title: 'Melhoria na Conexão',
        description: `Sua taxa de conexão melhorou ${Math.round(improvement)}pp na segunda metade do período. Continue assim!`,
        severity: 'positive',
      })
    }
  }

  // 12. Consistent volume
  if (metrics.byDay.length >= 5) {
    const dailyTotals = metrics.byDay.map(d => d.total)
    const avg = dailyTotals.reduce((s, v) => s + v, 0) / dailyTotals.length
    if (avg > 0) {
      const sd = stddev(dailyTotals)
      const cv = sd / avg
      if (cv < 0.3) {
        insights.push({
          icon: CheckCircle,
          iconColor: 'text-emerald-500',
          bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
          borderColor: 'border-emerald-200 dark:border-emerald-500/20',
          title: 'Volume Consistente',
          description: 'Volume de ligações consistente. Boa disciplina de prospecção!',
          severity: 'positive',
        })
      }
    }
  }

  // Sort by severity: alerts first, then warnings, info, positives last
  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  // Limit to max visible insights
  return insights.slice(0, MAX_VISIBLE_INSIGHTS)
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
