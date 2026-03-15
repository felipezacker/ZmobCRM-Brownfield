import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { useDashboardMetrics, type PeriodFilter } from '@/features/dashboard/hooks/useDashboardMetrics'
import { useProspectingMetrics } from '@/features/prospecting/hooks/useProspectingMetrics'
import { useBoards, useDefaultBoard } from '@/lib/query/hooks/useBoardsQuery'
import type { PulseColor } from '@/features/command-center/utils/pulse-rules'
import {
  getPulseStatusForRevenue,
  getPulseStatusForWinRate,
  getPulseStatusForVolume,
} from '@/features/command-center/utils/pulse-rules'
import type { Alert, AlertType, AlertSeverity, BrokerPerformance } from '@/features/command-center/utils/alert-rules'
import {
  detectStagnantDeals,
  detectHotLeadsWithoutActivity,
  detectUnderperformingBrokers,
  detectHighChurn,
} from '@/features/command-center/utils/alert-rules'

// Re-export types used by consumers
export type { Alert, AlertType, AlertSeverity }

export interface PulseStatus {
  revenue: PulseColor
  winRate: PulseColor
  volume: PulseColor
  pipeline: PulseColor
}

export interface DealTypeSplit {
  VENDA: { count: number; value: number }
  LOCACAO: { count: number; value: number }
}

export interface LeaderboardEntry {
  ownerId: string
  ownerName: string
  wonCount: number
  wonValue: number
  totalCalls: number
}

export interface ProspectingSummary {
  totalCalls: number
  connectionRate: number
  scheduledMeetings: number
  proposalsSent: number
}

export interface TemperatureBreakdown {
  hot: number
  warm: number
  cold: number
}

export interface CommandCenterMetrics {
  // From useDashboardMetrics
  isLoading: boolean
  wonRevenue: number
  winRate: number
  pipelineValue: number
  activeContacts: number
  stagnantDealsCount: number
  avgSalesCycle: number
  changes: {
    pipeline: number
    deals: number
    winRate: number
    revenue: number
  }

  // Calculated KPIs
  generatedCommission: number
  dealTypeSplit: DealTypeSplit
  pulse: PulseStatus
  alerts: Alert[]
  temperatureBreakdown: TemperatureBreakdown

  // Enriched leaderboard
  leaderboard: LeaderboardEntry[]

  // Prospecting summary
  prospectingSummary: ProspectingSummary
}

/** Pure calculation extracted for testability — used in useMemo inside the hook */
export function calculateCommission(wonDeals: Array<{ value: number; commissionRate?: number | null }>): number {
  return wonDeals.reduce(
    (sum, deal) => sum + (deal.value * ((deal.commissionRate ?? 5) / 100)),
    0,
  )
}

export function useCommandCenterMetrics(
  period: PeriodFilter = 'this_month',
  boardId?: string,
): CommandCenterMetrics {
  const { user } = useAuth()
  const dashboardData = useDashboardMetrics(period, boardId)
  const { data: boards = [] } = useBoards()
  const { data: defaultBoard } = useDefaultBoard()

  // Profiles query for prospecting metrics broker names
  const { data: profiles = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['command-center', 'profiles'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('profiles')
        .select('id, name, first_name')
        .order('name')
      return (data || []).map(p => ({
        id: p.id,
        name: p.name || p.first_name || 'Sem nome',
      }))
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  // Consume useProspectingMetrics — uses '7d' as default period mapping
  const prospectingPeriod = useMemo(() => {
    const periodMap: Record<string, '7d' | '30d' | 'today' | 'yesterday'> = {
      today: 'today',
      yesterday: 'yesterday',
      last_7_days: '7d',
      last_30_days: '30d',
      this_month: '30d',
      last_month: '30d',
      this_quarter: '30d',
      last_quarter: '30d',
      this_year: '30d',
      last_year: '30d',
      all: '30d',
    }
    return periodMap[period] || '7d'
  }, [period])

  const { metrics: prospectingData, isLoading: prospectingLoading } = useProspectingMetrics(
    prospectingPeriod,
    undefined,
    profiles,
  )

  // AC4: Commission calculation — uses exported pure function
  const generatedCommission = useMemo(
    () => calculateCommission(dashboardData.wonDeals || []),
    [dashboardData.wonDeals],
  )

  // AC5: Deal type split (VENDA vs LOCACAO) — single-pass aggregation
  const dealTypeSplit = useMemo((): DealTypeSplit => {
    const wonDeals = dashboardData.wonDeals || []
    const split: DealTypeSplit = {
      VENDA: { count: 0, value: 0 },
      LOCACAO: { count: 0, value: 0 },
    }
    for (const d of wonDeals) {
      if (d.dealType === 'VENDA') {
        split.VENDA.count++
        split.VENDA.value += d.value
      } else if (d.dealType === 'LOCACAO') {
        split.LOCACAO.count++
        split.LOCACAO.value += d.value
      }
    }
    return split
  }, [dashboardData.wonDeals])

  // AC6: Pulse semaphores
  const pulse = useMemo((): PulseStatus => ({
    revenue: getPulseStatusForRevenue(dashboardData.changes.revenue),
    winRate: getPulseStatusForWinRate(dashboardData.changes.winRate),
    volume: getPulseStatusForVolume(dashboardData.changes.deals),
    pipeline: getPulseStatusForRevenue(dashboardData.changes.pipeline),
  }), [dashboardData.changes])

  // AC8: Temperature breakdown — direct query on contacts
  const { data: temperatureData } = useQuery({
    queryKey: ['command-center', 'temperature'],
    queryFn: async () => {
      if (!supabase) return { hot: 0, warm: 0, cold: 0 }
      const { data, error } = await supabase
        .from('contacts')
        .select('temperature')
        .eq('status', 'ACTIVE')
        .not('temperature', 'is', null)
      if (error) throw error

      let hot = 0
      let warm = 0
      let cold = 0
      for (const c of data || []) {
        if (c.temperature === 'HOT') hot++
        else if (c.temperature === 'WARM') warm++
        else if (c.temperature === 'COLD') cold++
      }
      return { hot, warm, cold }
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  const temperatureBreakdown = useMemo((): TemperatureBreakdown =>
    temperatureData ?? { hot: 0, warm: 0, cold: 0 },
  [temperatureData])

  // AC9: Leaderboard enriched with call counts
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const wonDeals = dashboardData.wonDeals || []
    const brokerByCall = prospectingData?.byBroker || []

    // Aggregate won deals by owner
    const ownerMap = new Map<string, { wonCount: number; wonValue: number; ownerName: string }>()
    for (const deal of wonDeals) {
      if (!deal.ownerId) continue
      const existing = ownerMap.get(deal.ownerId)
      if (existing) {
        existing.wonCount++
        existing.wonValue += deal.value
      } else {
        ownerMap.set(deal.ownerId, {
          wonCount: 1,
          wonValue: deal.value,
          ownerName: deal.owner?.name || 'Sem nome',
        })
      }
    }

    // Build call count map from prospecting data
    const callMap = new Map<string, number>()
    for (const broker of brokerByCall) {
      callMap.set(broker.ownerId, broker.totalCalls)
    }

    // Merge: include all owners from deals + any broker with calls
    const allOwnerIds = new Set([
      ...ownerMap.keys(),
      ...callMap.keys(),
    ])

    const entries: LeaderboardEntry[] = []
    for (const ownerId of allOwnerIds) {
      const dealData = ownerMap.get(ownerId)
      const brokerData = brokerByCall.find(b => b.ownerId === ownerId)
      entries.push({
        ownerId,
        ownerName: dealData?.ownerName || brokerData?.ownerName || 'Sem nome',
        wonCount: dealData?.wonCount ?? 0,
        wonValue: dealData?.wonValue ?? 0,
        totalCalls: callMap.get(ownerId) ?? 0,
      })
    }

    return entries.sort((a, b) => b.wonValue - a.wonValue)
  }, [dashboardData.wonDeals, prospectingData?.byBroker])

  // AC7: Alerts — deps list specific fields to avoid unnecessary recomputation
  const alerts = useMemo((): Alert[] => {
    const result: Alert[] = []
    const selectedBoard = boardId
      ? boards.find(b => b.id === boardId)
      : (defaultBoard || boards[0])

    const stages = selectedBoard?.stages || []

    // AC7a: Stagnant deals in late stages
    const stagnantAlert = detectStagnantDeals(
      dashboardData.activeSnapshotDeals || [],
      stages,
    )
    if (stagnantAlert) result.push(stagnantAlert)

    // AC7b: HOT leads without activity — use last interaction date as proxy
    // activeContacts from useDashboardMetrics is Contact[] (array)
    const activeContactsArr = dashboardData.activeContacts
    const lastActivityMap = new Map<string, string>()
    for (const c of activeContactsArr) {
      if (c.lastInteraction) {
        lastActivityMap.set(c.id, c.lastInteraction)
      }
    }
    const hotLeadsAlert = detectHotLeadsWithoutActivity(activeContactsArr, lastActivityMap)
    if (hotLeadsAlert) result.push(hotLeadsAlert)

    // AC7c: Underperforming brokers
    const brokerPerformances: BrokerPerformance[] = leaderboard.map(l => ({
      ownerId: l.ownerId,
      ownerName: l.ownerName,
      wonCount: l.wonCount,
      wonValue: l.wonValue,
    }))
    const underperformingAlert = detectUnderperformingBrokers(brokerPerformances)
    if (underperformingAlert) result.push(underperformingAlert)

    // AC7d: High churn — activeContacts and churnedContacts are Contact[]
    const churnAlert = detectHighChurn(
      dashboardData.activeContacts.length,
      dashboardData.churnedContacts.length,
    )
    if (churnAlert) result.push(churnAlert)

    return result
  }, [dashboardData.activeSnapshotDeals, dashboardData.activeContacts, dashboardData.churnedContacts, boards, defaultBoard, boardId, leaderboard])

  // AC10: Prospecting summary
  const prospectingSummary = useMemo((): ProspectingSummary => ({
    totalCalls: prospectingData?.totalCalls ?? 0,
    connectionRate: prospectingData?.connectionRate ?? 0,
    scheduledMeetings: 0, // Not yet available in useProspectingMetrics
    proposalsSent: 0,     // Not yet available in useProspectingMetrics
  }), [prospectingData])

  // Consolidated loading state
  const isLoading = dashboardData.isLoading || prospectingLoading

  return {
    isLoading,
    wonRevenue: dashboardData.wonRevenue,
    winRate: dashboardData.winRate,
    pipelineValue: dashboardData.pipelineValue,
    activeContacts: dashboardData.activeContacts.length,
    stagnantDealsCount: dashboardData.stagnantDealsCount,
    avgSalesCycle: dashboardData.avgSalesCycle,
    changes: dashboardData.changes,
    generatedCommission,
    dealTypeSplit,
    pulse,
    alerts,
    temperatureBreakdown,
    leaderboard,
    prospectingSummary,
  }
}
