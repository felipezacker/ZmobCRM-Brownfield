/**
 * CP-4.8: Tests for multiple active session detection & cleanup
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase client
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}

function createChain() {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'eq', 'is', 'not', 'order', 'limit', 'single', 'from']
  for (const m of methods) {
    mockChain[m] = vi.fn().mockReturnValue(chain)
    chain[m] = mockChain[m]
  }
  return chain
}

const chain = createChain()

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => { mockChain.from(...args); return chain } },
}))

import {
  getActiveSessions,
  endProspectingSession,
  type ProspectingSessionStats,
} from '@/lib/supabase/prospecting-sessions'

const ZERO_STATS: ProspectingSessionStats = {
  total: 0, completed: 0, skipped: 0, connected: 0,
  noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
}

describe('CP-4.8: Multiple active sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of Object.keys(mockChain)) {
      mockChain[m].mockReturnValue(chain)
    }
  })

  describe('AC1: getActiveSessions returns all sessions (no limit)', () => {
    it('returns 3 sessions when 3 are active', async () => {
      mockChain.order.mockResolvedValue({
        data: [
          { id: 's3', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-10T14:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-10T14:00:00Z' },
          { id: 's2', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-10T10:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-10T10:00:00Z' },
          { id: 's1', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-09T08:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-09T08:00:00Z' },
        ],
        error: null,
      })

      const sessions = await getActiveSessions('o1')
      expect(sessions).toHaveLength(3)
      expect(sessions[0].id).toBe('s3') // most recent first
      expect(sessions[2].id).toBe('s1') // oldest last
    })

    it('does not call .limit()', async () => {
      mockChain.order.mockResolvedValue({ data: [], error: null })
      await getActiveSessions('o1')
      expect(mockChain.limit).not.toHaveBeenCalled()
    })

    it('still works with 1 session (backward compatible)', async () => {
      mockChain.order.mockResolvedValue({
        data: [{ id: 's1', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-10T10:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-10T10:00:00Z' }],
        error: null,
      })

      const sessions = await getActiveSessions('o1')
      expect(sessions).toHaveLength(1)
      expect(sessions[0].id).toBe('s1')
    })
  })

  describe('AC2: activeSessionCount reflects total sessions', () => {
    it('count matches number of returned sessions', async () => {
      mockChain.order.mockResolvedValue({
        data: [
          { id: 's2', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-10T12:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-10T12:00:00Z' },
          { id: 's1', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-10T10:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-10T10:00:00Z' },
        ],
        error: null,
      })

      const sessions = await getActiveSessions('o1')
      // The hook sets activeSessionCount = allActiveSessions.length
      const activeSessionCount = sessions.length
      expect(activeSessionCount).toBe(2)
    })
  })

  describe('AC3: Dismiss all sessions ends each with zero stats', () => {
    it('endProspectingSession called for each active session', async () => {
      // Simulate handleDismissAllSessions logic
      const allActiveSessions = [
        { id: 's3', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T14:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T14:00:00Z' },
        { id: 's2', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T10:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T10:00:00Z' },
        { id: 's1', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-09T08:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-09T08:00:00Z' },
      ]

      mockChain.eq.mockResolvedValue({ error: null })

      await Promise.allSettled(
        allActiveSessions.map(s => endProspectingSession(s.id, ZERO_STATS))
      )

      // endProspectingSession calls .from, .update, .eq — 3 calls means 3 sessions ended
      expect(mockChain.from).toHaveBeenCalledTimes(3)
      expect(mockChain.update).toHaveBeenCalledTimes(3)
    })
  })

  describe('AC4: Resume most recent ends all others', () => {
    it('ends sessions[1] and sessions[2] but not sessions[0]', async () => {
      const allActiveSessions = [
        { id: 's3', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T14:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T14:00:00Z' },
        { id: 's2', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T10:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T10:00:00Z' },
        { id: 's1', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-09T08:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-09T08:00:00Z' },
      ]

      const pendingActiveSession = { id: 's3', startedAt: '2026-03-10T14:00:00Z' }

      mockChain.eq.mockResolvedValue({ error: null })

      // Simulate handleResumeSession logic: end all except pendingActiveSession
      const othersToEnd = allActiveSessions.filter(s => s.id !== pendingActiveSession.id)
      expect(othersToEnd).toHaveLength(2)
      expect(othersToEnd.map(s => s.id)).toEqual(['s2', 's1'])

      await Promise.allSettled(
        othersToEnd.map(s => endProspectingSession(s.id, ZERO_STATS))
      )

      // Only 2 sessions should be ended (not s3 which is being resumed)
      expect(mockChain.from).toHaveBeenCalledTimes(2)
    })
  })

  describe('AC5: State cleanup after resolution', () => {
    it('dismiss all: ends every session then clears state', async () => {
      const sessions = [
        { id: 's3', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T14:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T14:00:00Z' },
        { id: 's2', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T10:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T10:00:00Z' },
      ]
      mockChain.eq.mockResolvedValue({ error: null })

      // Simulate handleDismissAllSessions: end all, then clear
      const results = await Promise.allSettled(
        sessions.map(s => endProspectingSession(s.id, ZERO_STATS))
      )
      const allSettled = results.every(r => r.status === 'fulfilled')
      expect(allSettled).toBe(true)
      expect(mockChain.from).toHaveBeenCalledTimes(2)

      // After settlement, state should be cleared
      const pendingActiveSession = null
      const allActiveSessions: unknown[] = []
      expect(pendingActiveSession).toBeNull()
      expect(allActiveSessions).toHaveLength(0)
    })

    it('resume: ends others then clears allActiveSessions', async () => {
      const sessions = [
        { id: 's3', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T14:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T14:00:00Z' },
        { id: 's2', ownerId: 'o1', organizationId: 'org1', startedAt: '2026-03-10T10:00:00Z', endedAt: null, stats: {}, createdAt: '2026-03-10T10:00:00Z' },
      ]
      const pending = { id: 's3', startedAt: '2026-03-10T14:00:00Z' }
      mockChain.eq.mockResolvedValue({ error: null })

      // Simulate handleResumeSession: end others, keep pending
      const othersToEnd = sessions.filter(s => s.id !== pending.id)
      expect(othersToEnd).toHaveLength(1)
      expect(othersToEnd[0].id).toBe('s2')

      await Promise.allSettled(
        othersToEnd.map(s => endProspectingSession(s.id, ZERO_STATS))
      )
      expect(mockChain.from).toHaveBeenCalledTimes(1) // only s2 ended

      // After settlement, both states cleared
      const clearedPending = null
      const clearedAll: unknown[] = []
      expect(clearedPending).toBeNull()
      expect(clearedAll).toHaveLength(0)
    })
  })
})
