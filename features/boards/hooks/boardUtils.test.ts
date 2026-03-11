import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeActivityDate, formatStageAge } from './boardUtils'

describe('formatRelativeActivityDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Hoje" for today', () => {
    expect(formatRelativeActivityDate('2026-03-10T14:00:00')).toBe('Hoje')
  })

  it('returns "Amanhã" for tomorrow', () => {
    expect(formatRelativeActivityDate('2026-03-11T09:00:00')).toBe('Amanhã')
  })

  it('returns "DD/MM" for future dates', () => {
    expect(formatRelativeActivityDate('2026-03-15T10:00:00')).toBe('15/03')
  })

  it('returns "Atrasada Xd" for past dates', () => {
    expect(formatRelativeActivityDate('2026-03-07T10:00:00')).toBe('Atrasada 3d')
  })

  it('returns empty string for invalid date', () => {
    expect(formatRelativeActivityDate('invalid')).toBe('')
  })

  it('returns "Atrasada 1d" for yesterday', () => {
    expect(formatRelativeActivityDate('2026-03-09T10:00:00')).toBe('Atrasada 1d')
  })

  it('returns "DD/MM" for day after tomorrow', () => {
    expect(formatRelativeActivityDate('2026-03-12T10:00:00')).toBe('12/03')
  })
})

describe('formatStageAge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for null input', () => {
    expect(formatStageAge(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(formatStageAge(undefined)).toBeNull()
  })

  it('returns "ha 0d" for today', () => {
    expect(formatStageAge('2026-03-10T10:00:00')).toBe('ha 0d')
  })

  it('returns "ha 5d" for 5 days ago', () => {
    expect(formatStageAge('2026-03-05T10:00:00')).toBe('ha 5d')
  })

  it('returns "ha 10d" for threshold date', () => {
    expect(formatStageAge('2026-02-28T10:00:00')).toBe('ha 10d')
  })

  it('returns "ha 30d" for 30 days ago', () => {
    expect(formatStageAge('2026-02-08T10:00:00')).toBe('ha 30d')
  })

  it('returns null for invalid date', () => {
    expect(formatStageAge('invalid')).toBeNull()
  })

  it('returns "ha 0d" for future date (same-day future)', () => {
    expect(formatStageAge('2026-03-10T23:00:00')).toBe('ha 0d')
  })
})
