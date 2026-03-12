/**
 * Hook for prospecting metrics (CP-1.4, CP-3.5)
 *
 * Primary: RPC get_prospecting_metrics_aggregated (server-side, no LIMIT)
 * Fallback: Direct query with LIMIT (legacy, if RPC fails)
 *
 * RLS automatically handles RBAC:
 *   - corretor: sees only own activities
 *   - diretor/admin: sees all org activities
 */

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeSync } from '@/lib/realtime/useRealtimeSync'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/query/queryKeys'
import { supabase } from '@/lib/supabase/client'
import { PROSPECTING_CONFIG } from '@/features/prospecting/prospecting-config'

export type MetricsPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

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

  if (period === 'yesterday') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const y = yesterday.toISOString().split('T')[0]
    return { start: y, end: y }
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
  deal_id?: string | null
  description?: string | null
  metadata: { outcome?: string; duration_seconds?: number } | null
  contacts?: { name: string }[] | { name: string } | null
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

/** Transform RPC JSONB response into ProspectingMetrics */
export function transformRpcResponse(rpcData: Record<string, unknown>): ProspectingMetrics {
  const totalCalls = Number(rpcData.total_calls) || 0
  const connectedCalls = Number(rpcData.connected) || 0
  const noAnswer = Number(rpcData.no_answer) || 0
  const voicemail = Number(rpcData.voicemail) || 0
  const busy = Number(rpcData.busy) || 0
  const connectionRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0
  const avgDuration = Number(rpcData.avg_duration) || 0
  const uniqueContacts = Number(rpcData.unique_contacts) || 0

  const byDayRaw = (rpcData.by_day as Record<string, unknown>[] | null) || []
  const byDay: DailyMetric[] = byDayRaw.map(d => ({
    date: String(d.date),
    connected: Number(d.connected) || 0,
    no_answer: Number(d.no_answer) || 0,
    voicemail: Number(d.voicemail) || 0,
    busy: Number(d.busy) || 0,
    other: 0,
    total: Number(d.total) || 0,
  }))

  const byOutcome = [
    { outcome: 'connected', count: connectedCalls },
    { outcome: 'no_answer', count: noAnswer },
    { outcome: 'voicemail', count: voicemail },
    { outcome: 'busy', count: busy },
  ].filter(o => o.count > 0)

  const byBrokerRaw = (rpcData.by_broker as Record<string, unknown>[] | null) || []
  const byBroker: BrokerMetric[] = byBrokerRaw.map(b => ({
    ownerId: String(b.owner_id),
    ownerName: String(b.owner_name || 'Desconhecido'),
    totalCalls: Number(b.total_calls) || 0,
    connectedCalls: Number(b.connected) || 0,
    connectionRate: Number(b.connection_rate) || 0,
    avgDuration: Number(b.avg_duration) || 0,
    uniqueContacts: Number(b.unique_contacts) || 0,
  }))

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
  filterOwnerId?: string,
) {
  const { user, profile, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  // Realtime: refresh metrics when activities (calls) change
  useRealtimeSync('activities')

  const range = useMemo(() => getDateRange(period, customRange), [period, customRange])

  const isAdminOrDirector =
    profile?.role === 'admin' || profile?.role === 'diretor'

  // Primary: RPC-based metrics (server-side aggregation, no LIMIT)
  const rpcQuery = useQuery({
    queryKey: [...queryKeys.prospectingMetrics.all, 'rpc', range.start, range.end, filterOwnerId || ''],
    queryFn: async () => {
      if (!supabase) throw new Error('No supabase client')
      const { data, error } = await supabase.rpc('get_prospecting_metrics_aggregated', {
        p_owner_id: filterOwnerId || null,
        p_org_id: null,
        p_start_date: range.start,
        p_end_date: range.end,
      })
      if (error) throw error
      return data as Record<string, unknown>
    },
    enabled: !authLoading && !!user,
    staleTime: 30 * 1000,
    retry: 1,
  })

  // Fallback: Direct query (legacy, only if RPC fails)
  const fallbackQuery = useQuery({
    queryKey: [...queryKeys.prospectingMetrics.all, 'fallback', range.start, range.end],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('activities')
        .select('id, date, owner_id, contact_id, deal_id, description, metadata, contacts(name)')
        .eq('type', 'CALL')
        .not('metadata', 'is', null)
        .gte('date', `${range.start}T00:00:00`)
        .lte('date', `${range.end}T23:59:59`)
        .is('deleted_at', null)
        .limit(PROSPECTING_CONFIG.METRICS_MAX_RECORDS)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as CallActivity[]
    },
    enabled: !authLoading && !!user && rpcQuery.isError,
    staleTime: 30 * 1000,
  })

  const usingFallback = rpcQuery.isError && !fallbackQuery.isError
  const isDataTruncated = usingFallback && (fallbackQuery.data?.length ?? 0) >= PROSPECTING_CONFIG.METRICS_MAX_RECORDS

  // Activities for heatmap (need raw data) — only from fallback
  const fallbackActivities = useMemo(() => {
    if (!fallbackQuery.data) return []
    if (!filterOwnerId) return fallbackQuery.data
    return fallbackQuery.data.filter(a => a.owner_id === filterOwnerId)
  }, [fallbackQuery.data, filterOwnerId])

  // For heatmap: if RPC is active, we need to fetch activities separately
  // Use a lightweight query just for heatmap raw data
  const heatmapQuery = useQuery({
    queryKey: [...queryKeys.prospectingMetrics.all, 'heatmap', range.start, range.end],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('activities')
        .select('id, date, owner_id, contact_id, deal_id, description, metadata, contacts(name)')
        .eq('type', 'CALL')
        .not('metadata', 'is', null)
        .gte('date', `${range.start}T00:00:00`)
        .lte('date', `${range.end}T23:59:59`)
        .is('deleted_at', null)
        .limit(PROSPECTING_CONFIG.HEATMAP_MAX_RECORDS)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as CallActivity[]
    },
    enabled: !authLoading && !!user && !rpcQuery.isError,
    staleTime: 60 * 1000,
  })

  const activities = useMemo(() => {
    const raw = usingFallback ? fallbackActivities : (heatmapQuery.data || [])
    if (!filterOwnerId) return raw
    return raw.filter(a => a.owner_id === filterOwnerId)
  }, [usingFallback, fallbackActivities, heatmapQuery.data, filterOwnerId])

  const metrics = useMemo(() => {
    // RPC path: transform server-side aggregation
    if (!rpcQuery.isError && rpcQuery.data) {
      return transformRpcResponse(rpcQuery.data)
    }
    // Fallback path: client-side aggregation
    if (fallbackQuery.data) {
      return aggregateMetrics(fallbackActivities, profiles)
    }
    return null
  }, [rpcQuery.data, rpcQuery.isError, fallbackQuery.data, fallbackActivities, profiles])

  const invalidateMetrics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.prospectingMetrics.all })
  }, [queryClient])

  return {
    metrics,
    activities,
    isLoading: rpcQuery.isLoading || (rpcQuery.isError && fallbackQuery.isLoading),
    isFetching: rpcQuery.isFetching || fallbackQuery.isFetching,
    error: rpcQuery.isError && fallbackQuery.isError ? fallbackQuery.error : null,
    isAdminOrDirector,
    isDataTruncated,
    range,
    invalidateMetrics,
  }
}
