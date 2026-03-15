import type { Deal, Contact, BoardStage } from '@/types/types'

export type AlertType = 'stagnant_deals' | 'hot_leads_inactive' | 'underperforming_brokers' | 'high_churn'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Alert {
  type: AlertType
  severity: AlertSeverity
  message: string
  affectedCount: number
  data: unknown
}

function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return Infinity
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * Detect deals stuck in the last N stages of the funnel for more than `daysThreshold` days.
 *
 * Uses array index as implicit position (last items = bottom of funnel).
 * "Last N stages" = stages with index >= (stages.length - bottomStageCount).
 */
export function detectStagnantDeals(
  deals: Deal[],
  stages: BoardStage[],
  daysThreshold = 7,
  bottomStageCount = 3,
): Alert | null {
  if (stages.length === 0) return null

  const cutoff = Math.max(0, stages.length - bottomStageCount)
  const lateStageIds = new Set(stages.slice(cutoff).map(s => s.id))

  const stagnant = deals.filter(deal =>
    !deal.isWon &&
    !deal.isLost &&
    lateStageIds.has(deal.status) &&
    daysSince(deal.lastStageChangeDate ?? deal.createdAt) >= daysThreshold,
  )

  if (stagnant.length === 0) return null

  return {
    type: 'stagnant_deals',
    severity: stagnant.length >= 5 ? 'high' : 'medium',
    message: `${stagnant.length} proposta(s) parada(s) há ${daysThreshold}+ dias nos últimos estágios do funil`,
    affectedCount: stagnant.length,
    data: stagnant.map(d => ({ id: d.id, title: d.title, value: d.value })),
  }
}

/**
 * Detect HOT contacts with no activity in the last `daysThreshold` days.
 */
export function detectHotLeadsWithoutActivity(
  contacts: Contact[],
  lastActivityByContact: Map<string, string>,
  daysThreshold = 3,
): Alert | null {
  const hotContacts = contacts.filter(c =>
    c.temperature === 'HOT' &&
    c.status === 'ACTIVE',
  )

  const inactive = hotContacts.filter(c => {
    const lastDate = lastActivityByContact.get(c.id)
    return daysSince(lastDate) >= daysThreshold
  })

  if (inactive.length === 0) return null

  return {
    type: 'hot_leads_inactive',
    severity: inactive.length >= 3 ? 'high' : 'medium',
    message: `${inactive.length} lead(s) HOT sem atividade há ${daysThreshold}+ dias`,
    affectedCount: inactive.length,
    data: inactive.map(c => ({ id: c.id, name: c.name })),
  }
}

export interface BrokerPerformance {
  ownerId: string
  ownerName: string
  wonCount: number
  wonValue: number
}

/**
 * Detect brokers performing below `goalThreshold` of the top performer.
 */
export function detectUnderperformingBrokers(
  brokers: BrokerPerformance[],
  goalThreshold = 0.5,
): Alert | null {
  if (brokers.length <= 1) return null

  const maxWonCount = Math.max(...brokers.map(b => b.wonCount))
  if (maxWonCount === 0) return null

  const underperforming = brokers.filter(b =>
    b.wonCount < maxWonCount * goalThreshold,
  )

  if (underperforming.length === 0) return null

  return {
    type: 'underperforming_brokers',
    severity: underperforming.length >= 3 ? 'high' : 'medium',
    message: `${underperforming.length} corretor(es) abaixo de ${Math.round(goalThreshold * 100)}% do melhor performer`,
    affectedCount: underperforming.length,
    data: underperforming.map(b => ({ ownerId: b.ownerId, ownerName: b.ownerName, wonCount: b.wonCount })),
  }
}

/**
 * Detect churn rate above threshold.
 */
export function detectHighChurn(
  activeCount: number,
  churnedCount: number,
  churnThreshold = 0.1,
): Alert | null {
  const total = activeCount + churnedCount
  if (total === 0) return null

  const churnRate = churnedCount / total
  if (churnRate <= churnThreshold) return null

  return {
    type: 'high_churn',
    severity: churnRate >= 0.2 ? 'critical' : 'high',
    message: `Churn de ${Math.round(churnRate * 100)}% acima do threshold de ${Math.round(churnThreshold * 100)}%`,
    affectedCount: churnedCount,
    data: { churnRate, activeCount, churnedCount },
  }
}
