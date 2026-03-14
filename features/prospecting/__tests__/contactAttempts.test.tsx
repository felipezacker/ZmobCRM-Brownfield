/**
 * CP-7.2: Contact call attempts — hook logic, badge rendering, and formatting
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  formatRelativeDate,
  OUTCOME_LABELS,
  getAttemptColorClass,
} from '../hooks/useContactAttempts'

// ── formatRelativeDate ──────────────────────────────────────

describe('formatRelativeDate', () => {
  it('formats today as "hoje Xh"', () => {
    const now = new Date()
    now.setHours(10, 30, 0, 0)
    expect(formatRelativeDate(now.toISOString())).toBe('hoje 10h')
  })

  it('formats yesterday as "ontem Xh"', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(15, 0, 0, 0)
    expect(formatRelativeDate(yesterday.toISOString())).toBe('ontem 15h')
  })

  it('formats older dates as "DD/MM Xh"', () => {
    const old = new Date(2026, 2, 10, 9, 0, 0) // March 10, 2026
    expect(formatRelativeDate(old.toISOString())).toBe('10/03 9h')
  })
})

// ── OUTCOME_LABELS ──────────────────────────────────────────

describe('OUTCOME_LABELS', () => {
  it('translates connected to "atendeu"', () => {
    expect(OUTCOME_LABELS['connected']).toBe('atendeu')
  })

  it('translates no_answer to "nao atendeu"', () => {
    expect(OUTCOME_LABELS['no_answer']).toBe('nao atendeu')
  })

  it('translates voicemail to "correio de voz"', () => {
    expect(OUTCOME_LABELS['voicemail']).toBe('correio de voz')
  })

  it('translates busy to "ocupado"', () => {
    expect(OUTCOME_LABELS['busy']).toBe('ocupado')
  })
})

// ── getAttemptColorClass ────────────────────────────────────

describe('getAttemptColorClass', () => {
  it('returns neutral color for count=1', () => {
    expect(getAttemptColorClass(1)).toBe('text-muted-foreground')
  })

  it('returns neutral color for count=2', () => {
    expect(getAttemptColorClass(2)).toBe('text-muted-foreground')
  })

  it('returns amber color for count=3', () => {
    expect(getAttemptColorClass(3)).toBe('text-amber-600 dark:text-amber-400')
  })

  it('returns amber color for count=4', () => {
    expect(getAttemptColorClass(4)).toBe('text-amber-600 dark:text-amber-400')
  })

  it('returns destructive color for count=5', () => {
    expect(getAttemptColorClass(5)).toBe('text-destructive')
  })

  it('returns destructive color for count=10', () => {
    expect(getAttemptColorClass(10)).toBe('text-destructive')
  })
})

// ── Badge rendering in PowerDialer ──────────────────────────

// Minimal mock to test the badge rendering logic directly
const AttemptsBadge: React.FC<{
  count: number
  lastAttempt: { date: string; outcome: string } | null
}> = ({ count, lastAttempt }) => {
  if (count === 0) return null
  return (
    <p
      className={`flex items-center gap-1 text-xs mt-1.5 ${getAttemptColorClass(count)}`}
      aria-label={`${count} ${count === 1 ? 'tentativa' : 'tentativas'} de ligação anteriores`}
    >
      <span>
        {count}a tentativa
        {lastAttempt && (
          <> — ultima: {formatRelativeDate(lastAttempt.date)} ({OUTCOME_LABELS[lastAttempt.outcome] ?? lastAttempt.outcome})</>
        )}
      </span>
    </p>
  )
}

describe('AttemptsBadge', () => {
  it('does not render when count=0', () => {
    const { container } = render(<AttemptsBadge count={0} lastAttempt={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders attempt count and last attempt info', () => {
    const now = new Date()
    now.setHours(14, 0, 0, 0)
    render(
      <AttemptsBadge
        count={3}
        lastAttempt={{ date: now.toISOString(), outcome: 'no_answer' }}
      />
    )
    expect(screen.getByText(/3a tentativa/)).toBeInTheDocument()
    expect(screen.getByText(/nao atendeu/)).toBeInTheDocument()
    expect(screen.getByText(/hoje 14h/)).toBeInTheDocument()
  })

  it('applies amber class for count=3', () => {
    const now = new Date()
    render(
      <AttemptsBadge
        count={3}
        lastAttempt={{ date: now.toISOString(), outcome: 'connected' }}
      />
    )
    const badge = screen.getByLabelText('3 tentativas de ligação anteriores')
    expect(badge.className).toContain('text-amber-600')
  })

  it('applies destructive class for count=5+', () => {
    const now = new Date()
    render(
      <AttemptsBadge
        count={7}
        lastAttempt={{ date: now.toISOString(), outcome: 'busy' }}
      />
    )
    const badge = screen.getByLabelText('7 tentativas de ligação anteriores')
    expect(badge.className).toContain('text-destructive')
  })

  it('applies neutral class for count=1', () => {
    const now = new Date()
    render(
      <AttemptsBadge
        count={1}
        lastAttempt={{ date: now.toISOString(), outcome: 'voicemail' }}
      />
    )
    const badge = screen.getByLabelText('1 tentativa de ligação anteriores')
    expect(badge.className).toContain('text-muted-foreground')
  })

  it('shows unknown outcome as-is', () => {
    const now = new Date()
    render(
      <AttemptsBadge
        count={2}
        lastAttempt={{ date: now.toISOString(), outcome: 'custom_outcome' }}
      />
    )
    expect(screen.getByText(/custom_outcome/)).toBeInTheDocument()
  })
})
