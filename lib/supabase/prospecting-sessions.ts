/**
 * Supabase service for prospecting session persistence (CP-3.4)
 */
import { supabase } from '@/lib/supabase/client'

export interface ProspectingSessionStats {
  total: number
  completed: number
  skipped: number
  connected: number
  noAnswer: number
  voicemail: number
  busy: number
  duration_seconds: number
}

export interface ProspectingSession {
  id: string
  ownerId: string
  organizationId: string
  startedAt: string
  endedAt: string | null
  stats: ProspectingSessionStats | Record<string, never>
  createdAt: string
}

interface DbSession {
  id: string
  owner_id: string
  organization_id: string
  started_at: string
  ended_at: string | null
  stats: ProspectingSessionStats | Record<string, never>
  created_at: string
}

function transformSession(db: DbSession): ProspectingSession {
  return {
    id: db.id,
    ownerId: db.owner_id,
    organizationId: db.organization_id,
    startedAt: db.started_at,
    endedAt: db.ended_at,
    stats: db.stats,
    createdAt: db.created_at,
  }
}

export async function startProspectingSession(ownerId: string, organizationId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not initialized')
  const { data, error } = await supabase
    .from('prospecting_sessions')
    .insert({ owner_id: ownerId, organization_id: organizationId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function endProspectingSession(sessionId: string, stats: ProspectingSessionStats): Promise<void> {
  if (!supabase) throw new Error('Supabase not initialized')
  const { error } = await supabase
    .from('prospecting_sessions')
    .update({ ended_at: new Date().toISOString(), stats })
    .eq('id', sessionId)
  if (error) throw error
}

export async function getActiveSessions(ownerId: string): Promise<ProspectingSession[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('prospecting_sessions')
    .select('*')
    .eq('owner_id', ownerId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data || []).map(transformSession)
}

export async function listSessions(
  ownerId: string | undefined,
  organizationId: string,
  limit = 20,
): Promise<ProspectingSession[]> {
  if (!supabase) return []
  let query = supabase
    .from('prospecting_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(transformSession)
}
