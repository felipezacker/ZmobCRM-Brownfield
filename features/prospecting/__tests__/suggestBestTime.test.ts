import { describe, it, expect } from 'vitest'
import { suggestBestTime } from '../utils/suggestBestTime'
import type { CallActivity } from '../hooks/useProspectingMetrics'

function makeActivity(date: Date, outcome: string): CallActivity {
  return {
    id: Math.random().toString(),
    date: date.toISOString(),
    type: 'CALL',
    metadata: { outcome },
  } as CallActivity
}

function generateActivities(
  dayOfWeek: number,
  hour: number,
  total: number,
  connected: number,
): CallActivity[] {
  const activities: CallActivity[] = []
  for (let i = 0; i < total; i++) {
    const date = new Date()
    date.setDate(date.getDate() - 7) // Within 90-day window
    // Set to the desired day of week
    const currentDay = date.getDay()
    const diff = dayOfWeek - currentDay
    date.setDate(date.getDate() + diff)
    date.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
    const outcome = i < connected ? 'connected' : 'no_answer'
    activities.push(makeActivity(date, outcome))
  }
  return activities
}

describe('suggestBestTime', () => {
  it('returns null when no activities', () => {
    expect(suggestBestTime([])).toBeNull()
  })

  it('returns null when insufficient data (below MIN_CALLS)', () => {
    // Only 5 activities (MIN_CALLS is 10)
    const activities = generateActivities(3, 14, 5, 3) // Wed 14h, 5 total, 3 connected
    expect(suggestBestTime(activities)).toBeNull()
  })

  it('returns the slot with highest connection rate', () => {
    // Wednesday 14-16h: 20 calls, 15 connected (75%)
    const wed14 = generateActivities(3, 14, 20, 15)
    // Thursday 10-12h: 20 calls, 5 connected (25%)
    const thu10 = generateActivities(4, 10, 20, 5)

    const result = suggestBestTime([...wed14, ...thu10])
    expect(result).not.toBeNull()
    expect(result!.connectionRate).toBe(75)
    expect(result!.suggestedHour).toBe(14)
    expect(result!.suggestedDay).toBe('Quarta')
  })

  it('skips weekends for suggestions', () => {
    // Saturday 14h: 20 calls, 18 connected (90%) — should be skipped
    const sat14 = generateActivities(6, 14, 20, 18)
    // Monday 10h: 15 calls, 10 connected (67%) — should be picked
    const mon10 = generateActivities(1, 10, 15, 10)

    const result = suggestBestTime([...sat14, ...mon10])
    expect(result).not.toBeNull()
    expect(result!.suggestedDay).toBe('Segunda')
    expect(result!.suggestedHour).toBe(10)
  })

  it('returns a future date', () => {
    const activities = generateActivities(2, 16, 20, 12) // Tuesday 16h
    const result = suggestBestTime(activities)
    expect(result).not.toBeNull()
    expect(result!.suggestedDate.getTime()).toBeGreaterThanOrEqual(Date.now() - 86400000) // at most 1 day in past (same day edge case)
  })

  it('returns correct connectionRate percentage', () => {
    const activities = generateActivities(4, 8, 30, 12) // Thu 8h: 30 calls, 12 connected = 40%
    const result = suggestBestTime(activities)
    expect(result).not.toBeNull()
    expect(result!.connectionRate).toBe(40)
  })
})
