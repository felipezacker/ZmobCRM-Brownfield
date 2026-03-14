import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionHistory, computeSessionAnalytics } from '../components/SessionHistory'
import type { ProspectingSession } from '@/lib/supabase/prospecting-sessions'

/* eslint-disable no-restricted-syntax */
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))
/* eslint-enable no-restricted-syntax */

function makeSession(overrides: Partial<ProspectingSession> & { statsOverrides?: Record<string, number> } = {}): ProspectingSession {
  const { statsOverrides, ...rest } = overrides
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    ownerId: 'owner-1',
    organizationId: 'org-1',
    startedAt: '2026-03-10T09:00:00Z',
    endedAt: '2026-03-10T10:00:00Z',
    stats: {
      total: 20,
      completed: 20,
      skipped: 2,
      connected: 8,
      noAnswer: 6,
      voicemail: 2,
      busy: 2,
      duration_seconds: 3600,
      ...statsOverrides,
    },
    createdAt: '2026-03-10T09:00:00Z',
    ...rest,
  }
}

// ---- Pure function tests for computeSessionAnalytics ----

describe('computeSessionAnalytics', () => {
  it('returns null when less than 2 sessions', () => {
    expect(computeSessionAnalytics([])).toBeNull()
    expect(computeSessionAnalytics([makeSession()])).toBeNull()
  })

  it('computes avgCallsPerSession correctly', () => {
    const sessions = [
      makeSession({ statsOverrides: { completed: 10 } }),
      makeSession({ statsOverrides: { completed: 30 } }),
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics).not.toBeNull()
    expect(analytics!.avgCallsPerSession).toBe(20)
  })

  it('computes avgConnectionRate correctly', () => {
    const sessions = [
      makeSession({ statsOverrides: { completed: 10, connected: 5 } }), // 50%
      makeSession({ statsOverrides: { completed: 10, connected: 3 } }), // 30%
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics).not.toBeNull()
    expect(analytics!.avgConnectionRate).toBe(40) // avg of 50 and 30
  })

  it('identifies best session by connection rate', () => {
    const sessions = [
      makeSession({ startedAt: '2026-03-11T09:00:00Z', endedAt: '2026-03-11T10:00:00Z', statsOverrides: { completed: 10, connected: 2 } }),
      makeSession({ startedAt: '2026-03-10T09:00:00Z', endedAt: '2026-03-10T10:00:00Z', statsOverrides: { completed: 10, connected: 7 } }),
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics).not.toBeNull()
    expect(analytics!.bestSession).not.toBeNull()
    expect(analytics!.bestSession!.rate).toBe(70) // 7/10 = 70%
  })

  it('computes callsPerHour correctly', () => {
    // 2 sessions, each 1h, each 20 calls => 40 calls / 2 hours = 20 calls/hour
    const sessions = [
      makeSession({
        startedAt: '2026-03-10T09:00:00Z',
        endedAt: '2026-03-10T10:00:00Z',
        statsOverrides: { completed: 20 },
      }),
      makeSession({
        startedAt: '2026-03-11T09:00:00Z',
        endedAt: '2026-03-11T10:00:00Z',
        statsOverrides: { completed: 20 },
      }),
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics).not.toBeNull()
    expect(analytics!.callsPerHour).toBe(20)
  })

  it('computes avgSessionDuration correctly', () => {
    // 2 sessions: 1h and 30min => avg 45min
    const sessions = [
      makeSession({ startedAt: '2026-03-10T09:00:00Z', endedAt: '2026-03-10T10:00:00Z' }),
      makeSession({ startedAt: '2026-03-11T09:00:00Z', endedAt: '2026-03-11T09:30:00Z' }),
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics).not.toBeNull()
    expect(analytics!.avgSessionDuration).toBe('45min')
  })

  it('returns trend=stable when less than 4 sessions', () => {
    const sessions = [makeSession(), makeSession(), makeSession()]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics!.trend).toBe('stable')
  })

  it('detects upward trend (recent better than previous)', () => {
    // 6 sessions, sorted descending (recent first): high rates first, low rates later
    const sessions = [
      makeSession({ statsOverrides: { completed: 10, connected: 8 } }), // 80%
      makeSession({ statsOverrides: { completed: 10, connected: 7 } }), // 70%
      makeSession({ statsOverrides: { completed: 10, connected: 8 } }), // 80%
      makeSession({ statsOverrides: { completed: 10, connected: 3 } }), // 30%
      makeSession({ statsOverrides: { completed: 10, connected: 2 } }), // 20%
      makeSession({ statsOverrides: { completed: 10, connected: 3 } }), // 30%
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics!.trend).toBe('up')
  })

  it('detects downward trend (recent worse than previous)', () => {
    const sessions = [
      makeSession({ statsOverrides: { completed: 10, connected: 2 } }), // 20%
      makeSession({ statsOverrides: { completed: 10, connected: 3 } }), // 30%
      makeSession({ statsOverrides: { completed: 10, connected: 2 } }), // 20%
      makeSession({ statsOverrides: { completed: 10, connected: 8 } }), // 80%
      makeSession({ statsOverrides: { completed: 10, connected: 7 } }), // 70%
      makeSession({ statsOverrides: { completed: 10, connected: 8 } }), // 80%
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics!.trend).toBe('down')
  })

  it('handles sessions with zero calls gracefully', () => {
    const sessions = [
      makeSession({ statsOverrides: { completed: 0, total: 0, connected: 0 } }),
      makeSession({ statsOverrides: { completed: 0, total: 0, connected: 0 } }),
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics).not.toBeNull()
    expect(analytics!.avgCallsPerSession).toBe(0)
    expect(analytics!.avgConnectionRate).toBe(0)
    expect(analytics!.bestSession).toBeNull()
  })

  it('handles sessions without endedAt', () => {
    const sessions = [
      makeSession({ endedAt: null }),
      makeSession({ endedAt: null }),
    ]
    const analytics = computeSessionAnalytics(sessions)
    expect(analytics).not.toBeNull()
    expect(analytics!.avgSessionDuration).toBe('0min')
    expect(analytics!.callsPerHour).toBe(0) // no duration -> 0
  })
})

// ---- Component rendering tests ----

describe('SessionHistory analytics section', () => {
  it('does not show analytics when fewer than 2 sessions', () => {
    const { queryByTestId } = render(
      <SessionHistory sessions={[makeSession()]} isLoading={false} />,
    )
    expect(queryByTestId('session-analytics')).not.toBeInTheDocument()
  })

  it('shows analytics section with 2+ sessions', () => {
    const sessions = [
      makeSession({ id: 's1' }),
      makeSession({ id: 's2' }),
    ]
    render(<SessionHistory sessions={sessions} isLoading={false} />)
    expect(screen.getByTestId('session-analytics')).toBeInTheDocument()
  })

  it('renders all 6 mini-cards', () => {
    const sessions = [
      makeSession({ id: 's1' }),
      makeSession({ id: 's2' }),
    ]
    render(<SessionHistory sessions={sessions} isLoading={false} />)

    expect(screen.getByText('Melhor sessao')).toBeInTheDocument()
    expect(screen.getByText('Media calls/sessao')).toBeInTheDocument()
    expect(screen.getByText('Duracao media')).toBeInTheDocument()
    expect(screen.getByText('Calls/hora')).toBeInTheDocument()
    expect(screen.getByText('Taxa conexao media')).toBeInTheDocument()
    expect(screen.getByText('Tendencia')).toBeInTheDocument()
  })

  it('renders trend label for upward trend', () => {
    const sessions = [
      makeSession({ id: 's1', statsOverrides: { completed: 10, connected: 8 } }),
      makeSession({ id: 's2', statsOverrides: { completed: 10, connected: 8 } }),
      makeSession({ id: 's3', statsOverrides: { completed: 10, connected: 8 } }),
      makeSession({ id: 's4', statsOverrides: { completed: 10, connected: 2 } }),
      makeSession({ id: 's5', statsOverrides: { completed: 10, connected: 2 } }),
      makeSession({ id: 's6', statsOverrides: { completed: 10, connected: 2 } }),
    ]
    render(<SessionHistory sessions={sessions} isLoading={false} />)
    expect(screen.getByText('Melhorando')).toBeInTheDocument()
  })

  it('does not show analytics section when loading', () => {
    const sessions = [makeSession({ id: 's1' }), makeSession({ id: 's2' })]
    const { queryByTestId } = render(
      <SessionHistory sessions={sessions} isLoading={true} />,
    )
    expect(queryByTestId('session-analytics')).not.toBeInTheDocument()
  })

  it('does not show analytics section when sessions are empty', () => {
    const { queryByTestId } = render(
      <SessionHistory sessions={[]} isLoading={false} />,
    )
    expect(queryByTestId('session-analytics')).not.toBeInTheDocument()
  })

  it('still renders the session list below analytics', () => {
    const sessions = [
      makeSession({ id: 's1' }),
      makeSession({ id: 's2' }),
    ]
    render(<SessionHistory sessions={sessions} isLoading={false} />)

    // Analytics present
    expect(screen.getByTestId('session-analytics')).toBeInTheDocument()
    // Session history title present
    expect(screen.getByText('Historico de Sessoes')).toBeInTheDocument()
  })
})
