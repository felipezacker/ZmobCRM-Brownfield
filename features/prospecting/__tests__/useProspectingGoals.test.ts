import { describe, it, expect } from 'vitest'
import type { CallActivity } from '../hooks/useProspectingMetrics'

// Test the pure logic that useProspectingGoals relies on

function computeProgress(todayCallCount: number, callsTarget: number) {
  const percentage = callsTarget > 0 ? Math.round((todayCallCount / callsTarget) * 100) : 0
  let color: 'red' | 'yellow' | 'green' = 'red'
  if (percentage >= 100) color = 'green'
  else if (percentage >= 50) color = 'yellow'

  return {
    target: callsTarget,
    current: todayCallCount,
    percentage,
    color,
    isComplete: percentage >= 100,
  }
}

function countTodayCalls(activities: CallActivity[]): number {
  const today = new Date().toISOString().split('T')[0]
  return activities.filter(a => a.date.startsWith(today)).length
}

describe('useProspectingGoals logic', () => {
  describe('computeProgress', () => {
    it('returns 0% with 0 calls', () => {
      const result = computeProgress(0, 30)
      expect(result.percentage).toBe(0)
      expect(result.color).toBe('red')
      expect(result.isComplete).toBe(false)
    })

    it('returns red when < 50%', () => {
      const result = computeProgress(10, 30)
      expect(result.percentage).toBe(33)
      expect(result.color).toBe('red')
    })

    it('returns yellow when 50-99%', () => {
      const result = computeProgress(20, 30)
      expect(result.percentage).toBe(67)
      expect(result.color).toBe('yellow')
    })

    it('returns green when >= 100%', () => {
      const result = computeProgress(30, 30)
      expect(result.percentage).toBe(100)
      expect(result.color).toBe('green')
      expect(result.isComplete).toBe(true)
    })

    it('handles over 100%', () => {
      const result = computeProgress(45, 30)
      expect(result.percentage).toBe(150)
      expect(result.color).toBe('green')
      expect(result.isComplete).toBe(true)
    })

    it('handles target of 0 gracefully', () => {
      const result = computeProgress(5, 0)
      expect(result.percentage).toBe(0)
    })
  })

  describe('countTodayCalls', () => {
    it('counts only today activities', () => {
      const today = new Date().toISOString()
      const yesterday = new Date(Date.now() - 86400000).toISOString()

      const activities: CallActivity[] = [
        { id: '1', date: today, owner_id: 'u1', contact_id: 'c1', metadata: { outcome: 'connected' } },
        { id: '2', date: today, owner_id: 'u1', contact_id: 'c2', metadata: { outcome: 'no_answer' } },
        { id: '3', date: yesterday, owner_id: 'u1', contact_id: 'c3', metadata: { outcome: 'connected' } },
      ]

      expect(countTodayCalls(activities)).toBe(2)
    })

    it('returns 0 for empty activities', () => {
      expect(countTodayCalls([])).toBe(0)
    })

    it('returns 0 when no activities are from today', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      const activities: CallActivity[] = [
        { id: '1', date: yesterday, owner_id: 'u1', contact_id: 'c1', metadata: { outcome: 'connected' } },
      ]

      expect(countTodayCalls(activities)).toBe(0)
    })
  })
})
