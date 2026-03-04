/**
 * Hook for prospecting metrics (CP-1.4)
 *
 * Queries activities WHERE type='CALL' with metadata JSONB
 * RLS automatically handles RBAC:
 *   - corretor: sees only own activities
 *   - diretor/admin: sees all org activities
 */

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'

export type MetricsPeriod = 'today' | '7d' | '30d' | 'custom'

export interface PeriodRange {
  start: string // ISO date string YYYY-MM-DD
  end: string
}

export interface DailyMetric {
  date: string
  connected: number
  no_answer: number
  voicemail: number
  busy: number
  other: number
  total: number
}

export interface BrokerMetric {
  ownerId: string
  ownerName: string
  totalCalls: number
  connectedCalls: number
  connectionRate: number
  avgDuration: number
  uniqueContacts: number
}

export interface ProspectingMetrics {
  totalCalls: number
  connectedCalls: number
  connectionRate: number
  avgDuration: number
  uniqueContacts: number
  byDay: DailyMetric[]
  byOutcome: { outcome: string; count: number }[]
  byBroker: BrokerMetric[]
}

export function getDateRange(period: MetricsPeriod, custom?: PeriodRange): PeriodRange {
  const now = new Date()
  const end = now.toISOString().split('T')[0]

  if (period === 'custom' && custom) return custom

  if (period === 'today') {
    return { start: end, end }
  }

  const start = new Date(now)
  if (period === '7d') {
    start.setDate(start.getDate() - 6)
  } else {
    start.setDate(start.getDate() - 29)
  }
  return { start: start.toISOString().split('T')[0], end }
}

export interface CallActivity {
  id: string
  date: string
  owner_id: string | null
  contact_id: string | null
  metadata: { outcome?: string; duration_seconds?: number } | null
}

export function aggregateMetrics(
  activities: CallActivity[],
  profiles: { id: string; name: string }[],
): ProspectingMetrics {
  const totalCalls = activities.length
  const connectedCalls = activities.filter(
    a => a.metadata?.outcome === 'connected',
  ).length
  const connectionRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0

  const durations = activities
    .map(a => a.metadata?.duration_seconds)
    .filter((d): d is number => typeof d === 'number' && d > 0)
  const avgDuration =
    durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0

  const uniqueContacts = new Set(
    activities.filter(a => a.contact_id).map(a => a.contact_id),
  ).size

  // By day
  const dayMap = new Map<string, DailyMetric>()
  for (const a of activities) {
    const dateKey = a.date.split('T')[0]
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        connected: 0,
        no_answer: 0,
        voicemail: 0,
        busy: 0,
        other: 0,
        total: 0,
      })
    }
    const day = dayMap.get(dateKey)!
    day.total++
    const outcome = a.metadata?.outcome
    if (outcome === 'connected') day.connected++
    else if (outcome === 'no_answer') day.no_answer++
    else if (outcome === 'voicemail') day.voicemail++
    else if (outcome === 'busy') day.busy++
    else day.other++
  }
  const byDay = Array.from(dayMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  // By outcome
  const outcomeMap = new Map<string, number>()
  for (const a of activities) {
    const outcome = a.metadata?.outcome || 'unknown'
    outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1)
  }
  const byOutcome = Array.from(outcomeMap.entries()).map(([outcome, count]) => ({
    outcome,
    count,
  }))

  // By broker
  const profileMap = new Map(profiles.map(p => [p.id, p.name]))
  const brokerMap = new Map<
    string,
    {
      totalCalls: number
      connectedCalls: number
      durations: number[]
      contacts: Set<string>
    }
  >()
  for (const a of activities) {
    if (!a.owner_id) continue
    if (!brokerMap.has(a.owner_id)) {
      brokerMap.set(a.owner_id, {
        totalCalls: 0,
        connectedCalls: 0,
        durations: [],
        contacts: new Set(),
      })
    }
    const b = brokerMap.get(a.owner_id)!
    b.totalCalls++
    if (a.metadata?.outcome === 'connected') b.connectedCalls++
    if (a.metadata?.duration_seconds && a.metadata.duration_seconds > 0) {
      b.durations.push(a.metadata.duration_seconds)
    }
    if (a.contact_id) b.contacts.add(a.contact_id)
  }
  const byBroker: BrokerMetric[] = Array.from(brokerMap.entries())
    .map(([ownerId, data]) => ({
      ownerId,
      ownerName: profileMap.get(ownerId) || 'Desconhecido',
      totalCalls: data.totalCalls,
      connectedCalls: data.connectedCalls,
      connectionRate:
        data.totalCalls > 0
          ? (data.connectedCalls / data.totalCalls) * 100
          : 0,
      avgDuration:
        data.durations.length > 0
          ? data.durations.reduce((s, d) => s + d, 0) / data.durations.length
          : 0,
      uniqueContacts: data.contacts.size,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls)

  return {
    totalCalls,
    connectedCalls,
    connectionRate,
    avgDuration,
    uniqueContacts,
    byDay,
    byOutcome,
    byBroker,
  }
}

export function useProspectingMetrics(
  period: MetricsPeriod = '7d',
  customRange?: PeriodRange,
  profiles: { id: string; name: string }[] = [],
) {
  const { user, profile, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const range = useMemo(() => getDateRange(period, customRange), [period, customRange])

  const isAdminOrDirector =
    profile?.role === 'admin' || profile?.role === 'diretor'

  const QUERY_LIMIT = 5000

  const metricsQuery = useQuery({
    queryKey: ['prospectingMetrics', range.start, range.end],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('activities')
        .select('id, date, owner_id, contact_id, metadata')
        .eq('type', 'CALL')
        .not('metadata', 'is', null)
        .gte('date', `${range.start}T00:00:00`)
        .lte('date', `${range.end}T23:59:59`)
        .is('deleted_at', null)
        .limit(QUERY_LIMIT)
        .order('date', { ascending: true })

      if (error) throw error
      return (data || []) as CallActivity[]
    },
    enabled: !authLoading && !!user,
    staleTime: 30 * 1000,
  })

  const isDataTruncated = (metricsQuery.data?.length ?? 0) >= QUERY_LIMIT

  const metrics = useMemo(() => {
    if (!metricsQuery.data) return null
    return aggregateMetrics(metricsQuery.data, profiles)
  }, [metricsQuery.data, profiles])

  const invalidateMetrics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['prospectingMetrics'] })
  }, [queryClient])

  return {
    metrics,
    isLoading: metricsQuery.isLoading,
    isFetching: metricsQuery.isFetching,
    error: metricsQuery.error,
    isAdminOrDirector,
    isDataTruncated,
    range,
    invalidateMetrics,
  }
}
