/**
 * CP-4.9: Tests for session stats continuity on resume
 */
import { describe, it, expect } from 'vitest'
import type { ProspectingSessionStats } from '@/lib/supabase/prospecting-sessions'

/** Mirror of the isValidSessionStats guard in useProspectingPageState.ts */
function isValidSessionStats(stats: unknown): stats is ProspectingSessionStats {
  if (typeof stats !== 'object' || stats === null) return false
  const s = stats as ProspectingSessionStats
  return (
    typeof s.total === 'number' &&
    typeof s.completed === 'number' &&
    s.completed <= s.total
  )
}

type SessionStats = {
  total: number
  completed: number
  skipped: number
  connected: number
  noAnswer: number
  voicemail: number
  busy: number
}

const INITIAL_SESSION_STATS: SessionStats = {
  total: 0, completed: 0, skipped: 0, connected: 0,
  noAnswer: 0, voicemail: 0, busy: 0,
}

/**
 * Simulates the stats-loading logic from handleResumeSession (CP-4.9).
 * Returns the sessionStats that would be set after resume.
 */
function resolveResumeStats(
  dbStats: ProspectingSessionStats | Record<string, never> | undefined,
  queueLength: number,
): SessionStats {
  if (isValidSessionStats(dbStats)) {
    return {
      total: dbStats.total,
      completed: dbStats.completed,
      skipped: dbStats.skipped ?? 0,
      connected: dbStats.connected ?? 0,
      noAnswer: dbStats.noAnswer ?? 0,
      voicemail: dbStats.voicemail ?? 0,
      busy: dbStats.busy ?? 0,
    }
  }
  return {
    ...INITIAL_SESSION_STATS,
    total: queueLength,
  }
}

describe('CP-4.9: Resume session stats continuity', () => {
  describe('AC1: Resume with valid DB stats', () => {
    it('populates sessionStats from DB values', () => {
      const dbStats: ProspectingSessionStats = {
        total: 50, completed: 23, skipped: 5, connected: 12,
        noAnswer: 8, voicemail: 3, busy: 0, duration_seconds: 3600,
      }

      const result = resolveResumeStats(dbStats, 50)

      expect(result.total).toBe(50)
      expect(result.completed).toBe(23)
      expect(result.skipped).toBe(5)
      expect(result.connected).toBe(12)
      expect(result.noAnswer).toBe(8)
      expect(result.voicemail).toBe(3)
      expect(result.busy).toBe(0)
    })

    it('uses DB total, not queue length', () => {
      const dbStats: ProspectingSessionStats = {
        total: 30, completed: 10, skipped: 2, connected: 5,
        noAnswer: 3, voicemail: 2, busy: 0, duration_seconds: 1800,
      }

      // Queue may have changed size since session was created
      const result = resolveResumeStats(dbStats, 45)

      expect(result.total).toBe(30) // from DB, not 45
      expect(result.completed).toBe(10)
    })
  })

  describe('AC2: Progress bar reflects real position', () => {
    it('completed/total ratio is preserved from DB', () => {
      const dbStats: ProspectingSessionStats = {
        total: 40, completed: 15, skipped: 3, connected: 8,
        noAnswer: 4, voicemail: 3, busy: 0, duration_seconds: 2400,
      }

      const result = resolveResumeStats(dbStats, 40)

      // Progress bar would show 15/40 = 37.5%
      expect(result.completed / result.total).toBeCloseTo(0.375)
    })
  })

  describe('AC3: Legacy sessions (empty stats) fallback to zeros', () => {
    it('empty object stats uses zeros with queue length', () => {
      const result = resolveResumeStats({} as Record<string, never>, 25)

      expect(result.total).toBe(25) // from queue length
      expect(result.completed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.connected).toBe(0)
      expect(result.noAnswer).toBe(0)
      expect(result.voicemail).toBe(0)
      expect(result.busy).toBe(0)
    })

    it('undefined stats uses zeros with queue length', () => {
      const result = resolveResumeStats(undefined, 30)

      expect(result.total).toBe(30)
      expect(result.completed).toBe(0)
    })

    it('null stats uses zeros with queue length', () => {
      const result = resolveResumeStats(null as unknown as undefined, 20)

      expect(result.total).toBe(20)
      expect(result.completed).toBe(0)
    })
  })

  describe('isValidSessionStats guard', () => {
    it('rejects stats where completed > total (inconsistent)', () => {
      const inconsistent = {
        total: 10, completed: 15, skipped: 0, connected: 0,
        noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
      }

      const result = resolveResumeStats(inconsistent, 30)

      // Should fallback to zeros since completed > total
      expect(result.total).toBe(30) // from queue, not DB
      expect(result.completed).toBe(0)
    })

    it('rejects stats without total field', () => {
      const noTotal = { completed: 5, skipped: 0 } as unknown as ProspectingSessionStats

      const result = resolveResumeStats(noTotal, 20)

      expect(result.total).toBe(20)
      expect(result.completed).toBe(0)
    })

    it('rejects stats with non-number total', () => {
      const badType = { total: '50', completed: 10 } as unknown as ProspectingSessionStats

      const result = resolveResumeStats(badType, 25)

      expect(result.total).toBe(25)
      expect(result.completed).toBe(0)
    })

    it('accepts stats where completed equals total (100% done)', () => {
      const allDone: ProspectingSessionStats = {
        total: 20, completed: 20, skipped: 0, connected: 15,
        noAnswer: 3, voicemail: 2, busy: 0, duration_seconds: 5400,
      }

      const result = resolveResumeStats(allDone, 20)

      expect(result.total).toBe(20)
      expect(result.completed).toBe(20)
    })

    it('accepts stats with zero total (edge case: empty queue saved)', () => {
      const zeroTotal: ProspectingSessionStats = {
        total: 0, completed: 0, skipped: 0, connected: 0,
        noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
      }

      const result = resolveResumeStats(zeroTotal, 10)

      // Zero total is technically valid (completed <= total)
      expect(result.total).toBe(0)
      expect(result.completed).toBe(0)
    })
  })
})
