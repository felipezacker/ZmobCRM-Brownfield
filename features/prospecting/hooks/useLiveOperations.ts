/**
 * Live Operations Hook (CP-5.6)
 *
 * Combines Realtime subscriptions on prospecting_sessions + activities
 * to provide a live view of active prospecting sessions for admin/director.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import { supabase } from '@/lib/supabase/client'
import { getOrgActiveSessions } from '@/lib/supabase/prospecting-sessions'
import { useRealtimeSync } from '@/lib/realtime/useRealtimeSync'
import type { OrgProfile } from '@/features/prospecting/hooks/useProspectingPageState'

const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes

export interface LiveSession {
  sessionId: string
  ownerId: string
  ownerName: string
  startedAt: string
  partialStats: { totalCalls: number; connected: number }
  lastActivity: { date: string; outcome: string } | null
  isInactive: boolean
}

interface OwnerActivity {
  owner_id: string
  date: string
  metadata: { outcome?: string } | null
}

export function useLiveOperations(
  organizationId: string | undefined,
  profiles: OrgProfile[],
  enabled = true,
) {
  const isEnabled = enabled && !!organizationId

  // Fetch active sessions
  const {
    data: activeSessions = [],
    isLoading: isLoadingSessions,
  } = useQuery({
    queryKey: [...queryKeys.liveOperations.all, 'sessions', organizationId],
    queryFn: () => getOrgActiveSessions(organizationId!),
    enabled: isEnabled,
    refetchInterval: 30_000, // fallback polling every 30s
    staleTime: 10_000,
  })

  // Get owner IDs from active sessions
  const ownerIds = useMemo(
    () => activeSessions.map(s => s.ownerId),
    [activeSessions],
  )

  // Fetch latest activity for each owner (today)
  const {
    data: ownerActivities = [],
    isLoading: isLoadingActivities,
  } = useQuery({
    queryKey: [...queryKeys.liveOperations.all, 'activities', ownerIds],
    queryFn: async (): Promise<OwnerActivity[]> => {
      if (!supabase || ownerIds.length === 0) return []
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('activities')
        .select('owner_id, date, metadata')
        .in('owner_id', ownerIds)
        .eq('type', 'CALL')
        .gte('date', todayStart.toISOString())
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as OwnerActivity[]
    },
    enabled: isEnabled && ownerIds.length > 0,
    staleTime: 10_000,
  })

  // Realtime sync for both tables
  useRealtimeSync(['prospecting_sessions', 'activities'], { enabled: isEnabled })

  // Build LiveSession array
  const sessions: LiveSession[] = useMemo(() => {
    if (activeSessions.length === 0) return []

    const profileMap = new Map(profiles.map(p => [p.id, p.name]))
    const now = Date.now()

    return activeSessions.map(session => {
      // All activities for this owner during this session
      const sessionStart = new Date(session.startedAt).getTime()
      const ownerActs = ownerActivities.filter(
        a => a.owner_id === session.ownerId && new Date(a.date).getTime() >= sessionStart,
      )

      const totalCalls = ownerActs.length
      const connected = ownerActs.filter(a => a.metadata?.outcome === 'connected').length

      const lastAct = ownerActs.length > 0 ? ownerActs[0] : null
      const lastActivity = lastAct
        ? { date: lastAct.date, outcome: lastAct.metadata?.outcome || 'unknown' }
        : null

      // Inactivity check
      let isInactive = false
      if (lastActivity) {
        isInactive = now - new Date(lastActivity.date).getTime() > INACTIVITY_THRESHOLD_MS
      } else {
        isInactive = now - sessionStart > INACTIVITY_THRESHOLD_MS
      }

      return {
        sessionId: session.id,
        ownerId: session.ownerId,
        ownerName: profileMap.get(session.ownerId) || 'Corretor',
        startedAt: session.startedAt,
        partialStats: { totalCalls, connected },
        lastActivity,
        isInactive,
      }
    })
  }, [activeSessions, ownerActivities, profiles])

  return {
    sessions,
    activeCount: sessions.length,
    isLoading: isLoadingSessions || isLoadingActivities,
  }
}
