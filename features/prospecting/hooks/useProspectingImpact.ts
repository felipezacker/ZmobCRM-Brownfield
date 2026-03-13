/**
 * Hook for prospecting impact metrics (CP-5.3)
 *
 * Measures how prospecting calls convert into deals and pipeline value.
 * Relies on CP-5.1 deal linking (activities with source=prospecting + deal_id).
 *
 * RLS automatically handles RBAC:
 *   - corretor: sees only own activities/deals
 *   - diretor/admin: sees all org activities/deals
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/query/queryKeys'
import { supabase } from '@/lib/supabase/client'
import { getDateRange, type MetricsPeriod, type PeriodRange } from './useProspectingMetrics'

export interface ProspectingImpact {
  callsWithDeal: number
  totalProspectingCalls: number
  linkageRate: number
  pipelineValue: number
  dealsWon: number
  dealsWonValue: number
  byDay: { date: string; linked: number; unlinked: number }[]
}

interface RawActivity {
  id: string
  deal_id: string | null
  date: string
  metadata: Record<string, unknown> | null
}

interface RawDeal {
  id: string
  value: number | null
  is_won: boolean
}

export function useProspectingImpact(
  period: MetricsPeriod = '7d',
  customRange?: PeriodRange,
  filterOwnerId?: string,
) {
  const { user, loading: authLoading } = useAuth()

  const range = useMemo(() => getDateRange(period, customRange), [period, customRange])

  // Step 1: Fetch prospecting call activities in the period
  const activitiesQuery = useQuery({
    queryKey: [...queryKeys.prospectingMetrics.all, 'impact-activities', range.start, range.end, filterOwnerId || ''],
    queryFn: async () => {
      if (!supabase) return []

      let query = supabase
        .from('activities')
        .select('id, deal_id, date, metadata')
        .eq('type', 'CALL')
        .gte('date', `${range.start}T00:00:00`)
        .lte('date', `${range.end}T23:59:59`)
        .is('deleted_at', null)
        .contains('metadata', JSON.stringify({ source: 'prospecting' }))

      if (filterOwnerId) {
        query = query.eq('owner_id', filterOwnerId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as RawActivity[]
    },
    enabled: !authLoading && !!user,
    staleTime: 30 * 1000,
  })

  // source=prospecting filter is now pushed to the DB query via .contains()
  const prospectingCalls = useMemo(() => {
    return activitiesQuery.data || []
  }, [activitiesQuery.data])

  // Unique deal IDs from prospecting calls
  const distinctDealIds = useMemo(() => {
    return [...new Set(
      prospectingCalls
        .filter(a => a.deal_id)
        .map(a => a.deal_id!)
    )]
  }, [prospectingCalls])

  // Step 2: Fetch linked deals
  const dealsQuery = useQuery({
    queryKey: [...queryKeys.prospectingMetrics.all, 'impact-deals', distinctDealIds.sort().join(',')],
    queryFn: async () => {
      if (!supabase || distinctDealIds.length === 0) return []
      const { data, error } = await supabase
        .from('deals')
        .select('id, value, is_won')
        .in('id', distinctDealIds)
      if (error) throw error
      return (data || []) as RawDeal[]
    },
    enabled: !authLoading && !!user && distinctDealIds.length > 0,
    staleTime: 30 * 1000,
  })

  // Aggregate metrics
  const impact = useMemo((): ProspectingImpact | null => {
    if (!activitiesQuery.data) return null

    const totalProspectingCalls = prospectingCalls.length
    const callsWithDeal = prospectingCalls.filter(a => a.deal_id).length
    const linkageRate = totalProspectingCalls > 0
      ? (callsWithDeal / totalProspectingCalls) * 100
      : 0

    const deals = dealsQuery.data || []
    const pipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonDeals = deals.filter(d => d.is_won)
    const dealsWon = wonDeals.length
    const dealsWonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    // Group by day for mini-chart
    const dayMap = new Map<string, { linked: number; unlinked: number }>()
    for (const call of prospectingCalls) {
      const day = call.date.split('T')[0]
      const entry = dayMap.get(day) || { linked: 0, unlinked: 0 }
      if (call.deal_id) {
        entry.linked++
      } else {
        entry.unlinked++
      }
      dayMap.set(day, entry)
    }

    // Fill date gaps for continuous chart
    const startDate = new Date(range.start)
    const endDate = new Date(range.end)
    const byDay: ProspectingImpact['byDay'] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      const key = current.toISOString().split('T')[0]
      const entry = dayMap.get(key) || { linked: 0, unlinked: 0 }
      byDay.push({ date: key, ...entry })
      current.setDate(current.getDate() + 1)
    }

    return {
      callsWithDeal,
      totalProspectingCalls,
      linkageRate,
      pipelineValue,
      dealsWon,
      dealsWonValue,
      byDay,
    }
  }, [activitiesQuery.data, prospectingCalls, dealsQuery.data, range])

  return {
    impact,
    isLoading: activitiesQuery.isLoading || (distinctDealIds.length > 0 && dealsQuery.isLoading),
    error: activitiesQuery.error || dealsQuery.error,
  }
}
