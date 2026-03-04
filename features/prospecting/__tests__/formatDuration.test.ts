import { describe, it, expect } from 'vitest'
import { formatDuration } from '../utils/formatDuration'

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(185)).toBe('3:05')
  })

  it('pads single-digit seconds with zero', () => {
    expect(formatDuration(62)).toBe('1:02')
  })

  it('handles exact minutes', () => {
    expect(formatDuration(120)).toBe('2:00')
  })

  it('floors decimal seconds to avoid 0:60 bug', () => {
    expect(formatDuration(59.7)).toBe('0:59')
    expect(formatDuration(119.9)).toBe('1:59')
  })

  it('handles large durations', () => {
    expect(formatDuration(3661)).toBe('61:01')
  })
})
