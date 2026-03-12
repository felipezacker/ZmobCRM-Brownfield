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
  startProspectingSession,
  endProspectingSession,
  getActiveSessions,
  listSessions,
} from '../prospecting-sessions'

describe('prospecting-sessions service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-wire chain returns after clearAllMocks
    for (const m of Object.keys(mockChain)) {
      mockChain[m].mockReturnValue(chain)
    }
  })

  describe('startProspectingSession', () => {
    it('inserts a new session and returns the id', async () => {
      mockChain.single.mockResolvedValue({ data: { id: 'uuid-1' }, error: null })

      const result = await startProspectingSession('owner-1', 'org-1')
      expect(result).toBe('uuid-1')
      expect(mockChain.from).toHaveBeenCalledWith('prospecting_sessions')
      expect(mockChain.insert).toHaveBeenCalledWith({
        owner_id: 'owner-1',
        organization_id: 'org-1',
      })
    })

    it('throws on insert error', async () => {
      mockChain.single.mockResolvedValue({ data: null, error: new Error('RLS violation') })
      await expect(startProspectingSession('o', 'org')).rejects.toThrow('RLS violation')
    })
  })

  describe('endProspectingSession', () => {
    it('updates session with stats and ended_at', async () => {
      // The final eq in the chain resolves
      mockChain.eq.mockResolvedValue({ error: null })

      const stats = {
        total: 10, completed: 8, skipped: 2,
        connected: 5, noAnswer: 2, voicemail: 1,
        busy: 0, duration_seconds: 300,
      }
      await expect(endProspectingSession('s1', stats)).resolves.toBeUndefined()
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ stats, ended_at: expect.any(String) }),
      )
    })

    it('throws on update error', async () => {
      mockChain.eq.mockResolvedValue({ error: new Error('fail') })
      const stats = { total: 0, completed: 0, skipped: 0, connected: 0, noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0 }
      await expect(endProspectingSession('s1', stats)).rejects.toThrow('fail')
    })
  })

  describe('getActiveSessions', () => {
    it('queries sessions without ended_at and returns all (no limit)', async () => {
      mockChain.order.mockResolvedValue({
        data: [{
          id: 's1', owner_id: 'o1', organization_id: 'org1',
          started_at: '2026-03-10T10:00:00Z', ended_at: null,
          stats: {}, created_at: '2026-03-10T10:00:00Z',
        }],
        error: null,
      })

      const result = await getActiveSessions('o1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('s1')
      expect(result[0].endedAt).toBeNull()
      expect(mockChain.is).toHaveBeenCalledWith('ended_at', null)
    })

    it('returns all active sessions without limit (CP-4.8 AC1)', async () => {
      mockChain.order.mockResolvedValue({
        data: [
          { id: 's3', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-10T12:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-10T12:00:00Z' },
          { id: 's2', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-10T10:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-10T10:00:00Z' },
          { id: 's1', owner_id: 'o1', organization_id: 'org1', started_at: '2026-03-09T08:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-09T08:00:00Z' },
        ],
        error: null,
      })

      const result = await getActiveSessions('o1')
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('s3')
      expect(result[1].id).toBe('s2')
      expect(result[2].id).toBe('s1')
      // Verify no .limit() was called in the chain
      expect(mockChain.limit).not.toHaveBeenCalled()
    })
  })

  describe('listSessions', () => {
    it('queries completed sessions for owner', async () => {
      // listSessions with ownerId: .eq(org) returns chain, then final .eq(owner) resolves
      mockChain.eq
        .mockReturnValueOnce(chain) // first .eq('organization_id', ...)
        .mockResolvedValueOnce({    // second .eq('owner_id', ...)
          data: [{
            id: 's2', owner_id: 'o1', organization_id: 'org1',
            started_at: '2026-03-09T10:00:00Z', ended_at: '2026-03-09T10:30:00Z',
            stats: { total: 5, connected: 3 }, created_at: '2026-03-09T10:00:00Z',
          }],
          error: null,
        })

      const result = await listSessions('o1', 'org1', 20)
      expect(result).toHaveLength(1)
      expect(result[0].ownerId).toBe('o1')
      expect(result[0].endedAt).not.toBeNull()
      expect(mockChain.not).toHaveBeenCalledWith('ended_at', 'is', null)
    })

    it('returns empty array when no sessions', async () => {
      mockChain.limit.mockResolvedValue({ data: [], error: null })

      const result = await listSessions(undefined, 'org1')
      expect(result).toEqual([])
    })
  })
})
