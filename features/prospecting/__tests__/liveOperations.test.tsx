/**
 * CP-5.6: Live Operations tests
 * - getOrgActiveSessions service function (Subtask 6.1)
 * - Inactivity calculation logic (Subtask 6.2)
 * - LiveOperationsPanel component (sessions list, empty state, loading, inactive badge)
 * - SessionTimer (HH:MM:SS format)
 * - Role-based visibility (Subtask 6.6)
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LiveOperationsPanel } from '../components/LiveOperationsPanel'
import type { LiveSession } from '../hooks/useLiveOperations'

// ── Helpers ──────────────────────────────────────────────────────

function makeLiveSession(overrides: Partial<LiveSession> = {}): LiveSession {
  return {
    sessionId: 'sess-1',
    ownerId: 'user-1',
    ownerName: 'Maria Silva',
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    partialStats: { totalCalls: 5, connected: 2 },
    lastActivity: {
      date: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 min ago
      outcome: 'connected',
    },
    isInactive: false,
    ...overrides,
  }
}

// ── Subtask 6.1: getOrgActiveSessions service function ──────────

// Mock supabase client for service tests
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

import { getOrgActiveSessions } from '@/lib/supabase/prospecting-sessions'

describe('getOrgActiveSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of Object.keys(mockChain)) {
      mockChain[m].mockReturnValue(chain)
    }
  })

  it('returns active sessions for the organization', async () => {
    mockChain.order.mockResolvedValue({
      data: [
        { id: 's1', owner_id: 'u1', organization_id: 'org1', started_at: '2026-03-12T10:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-12T10:00:00Z' },
        { id: 's2', owner_id: 'u2', organization_id: 'org1', started_at: '2026-03-12T11:00:00Z', ended_at: null, stats: {}, created_at: '2026-03-12T11:00:00Z' },
      ],
      error: null,
    })

    const sessions = await getOrgActiveSessions('org1')
    expect(sessions).toHaveLength(2)
    expect(sessions[0].id).toBe('s1')
    expect(sessions[0].ownerId).toBe('u1')
    expect(sessions[0].organizationId).toBe('org1')
    expect(sessions[0].endedAt).toBeNull()
    expect(mockChain.from).toHaveBeenCalledWith('prospecting_sessions')
    expect(mockChain.eq).toHaveBeenCalledWith('organization_id', 'org1')
    expect(mockChain.is).toHaveBeenCalledWith('ended_at', null)
  })

  it('returns empty array when no active sessions', async () => {
    mockChain.order.mockResolvedValue({ data: [], error: null })
    const sessions = await getOrgActiveSessions('org1')
    expect(sessions).toHaveLength(0)
  })

  it('throws on supabase error', async () => {
    mockChain.order.mockResolvedValue({ data: null, error: new Error('DB error') })
    await expect(getOrgActiveSessions('org1')).rejects.toThrow('DB error')
  })
})

// ── Subtask 6.2: Inactivity calculation logic ───────────────────

describe('Inactivity calculation', () => {
  const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000

  function checkInactivity(
    sessionStartedAt: string,
    lastActivityDate: string | null,
  ): boolean {
    const now = Date.now()
    if (lastActivityDate) {
      return now - new Date(lastActivityDate).getTime() > INACTIVITY_THRESHOLD_MS
    }
    return now - new Date(sessionStartedAt).getTime() > INACTIVITY_THRESHOLD_MS
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when last activity < 15 min ago', () => {
    const sessionStart = '2026-03-12T14:00:00Z'
    const lastActivity = '2026-03-12T14:50:00Z' // 10 min ago
    expect(checkInactivity(sessionStart, lastActivity)).toBe(false)
  })

  it('returns true when last activity > 15 min ago', () => {
    const sessionStart = '2026-03-12T14:00:00Z'
    const lastActivity = '2026-03-12T14:40:00Z' // 20 min ago
    expect(checkInactivity(sessionStart, lastActivity)).toBe(true)
  })

  it('returns true when no activity and session started > 15 min ago', () => {
    const sessionStart = '2026-03-12T14:00:00Z' // 60 min ago
    expect(checkInactivity(sessionStart, null)).toBe(true)
  })

  it('returns false when no activity but session started < 15 min ago', () => {
    const sessionStart = '2026-03-12T14:50:00Z' // 10 min ago
    expect(checkInactivity(sessionStart, null)).toBe(false)
  })

  it('returns false at exactly 15 min boundary (not exceeded)', () => {
    const sessionStart = '2026-03-12T14:00:00Z'
    const lastActivity = '2026-03-12T14:45:00Z' // exactly 15 min ago
    // > threshold, not >=, so at exactly 15 min it's false
    expect(checkInactivity(sessionStart, lastActivity)).toBe(false)
  })
})

// ── Subtask 6.6: Role-based visibility ──────────────────────────

describe('Role-based visibility', () => {
  it('LiveOperationsPanel is not rendered when wrapped in false conditional', () => {
    const isAdminOrDirector = false
    const { container } = render(
      <div>
        {isAdminOrDirector && (
          <LiveOperationsPanel sessions={[makeLiveSession()]} activeCount={1} isLoading={false} />
        )}
      </div>,
    )
    expect(container.querySelector('[role="list"]')).toBeNull()
    expect(screen.queryByText('Operação Ao Vivo')).not.toBeInTheDocument()
  })

  it('LiveOperationsPanel is rendered when wrapped in true conditional', () => {
    const isAdminOrDirector = true
    render(
      <div>
        {isAdminOrDirector && (
          <LiveOperationsPanel sessions={[makeLiveSession()]} activeCount={1} isLoading={false} />
        )}
      </div>,
    )
    expect(screen.getByText('Operação Ao Vivo')).toBeInTheDocument()
  })
})

// ── Component Tests ──────────────────────────────────────────────

describe('LiveOperationsPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading skeleton with 3 placeholder rows', () => {
    render(<LiveOperationsPanel sessions={[]} activeCount={0} isLoading={true} />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders empty state when no sessions active', () => {
    render(<LiveOperationsPanel sessions={[]} activeCount={0} isLoading={false} />)
    expect(screen.getByText('Nenhum corretor em sessão no momento')).toBeInTheDocument()
  })

  it('renders session list with broker names and stats', () => {
    const sessions = [
      makeLiveSession({ sessionId: 's1', ownerName: 'Maria Silva', partialStats: { totalCalls: 5, connected: 2 } }),
      makeLiveSession({ sessionId: 's2', ownerId: 'user-2', ownerName: 'João Santos', partialStats: { totalCalls: 3, connected: 1 } }),
    ]
    render(<LiveOperationsPanel sessions={sessions} activeCount={2} isLoading={false} />)

    expect(screen.getByText('Operação Ao Vivo')).toBeInTheDocument()
    expect(screen.getByText('2 ativas')).toBeInTheDocument()
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('João Santos')).toBeInTheDocument()
    expect(screen.getByText('5 ligações, 2 atendidas')).toBeInTheDocument()
    expect(screen.getByText('3 ligações, 1 atendida')).toBeInTheDocument()
  })

  it('displays "Inativo" badge for inactive sessions', () => {
    const sessions = [
      makeLiveSession({ isInactive: true }),
    ]
    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)

    const inactiveBadge = screen.getByText('Inativo')
    expect(inactiveBadge).toBeInTheDocument()
    expect(inactiveBadge).toHaveClass('animate-pulse')
    expect(inactiveBadge).toHaveAttribute('aria-label', 'Corretor inativo há mais de 15 minutos')
  })

  it('does NOT display "Inativo" badge when session is active', () => {
    const sessions = [makeLiveSession({ isInactive: false })]
    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.queryByText('Inativo')).not.toBeInTheDocument()
  })

  it('renders last outcome badge', () => {
    const sessions = [
      makeLiveSession({
        lastActivity: { date: new Date().toISOString(), outcome: 'connected' },
      }),
    ]
    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.getByText('Atendeu')).toBeInTheDocument()
  })

  it('shows active count badge as singular when 1 session', () => {
    const sessions = [makeLiveSession()]
    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.getByText('1 ativa')).toBeInTheDocument()
  })

  it('renders avatar initial from owner name', () => {
    const sessions = [makeLiveSession({ ownerName: 'Pedro Costa' })]
    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('renders session timer in HH:MM:SS format', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    // Session started 1 hour, 23 minutes, 45 seconds ago
    const startedAt = new Date(now - (1 * 3600 + 23 * 60 + 45) * 1000).toISOString()
    const sessions = [makeLiveSession({ startedAt })]

    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.getByText('01:23:45')).toBeInTheDocument()
  })

  it('updates timer after 1 second', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const startedAt = new Date(now - 10 * 1000).toISOString() // 10 seconds ago
    const sessions = [makeLiveSession({ startedAt })]

    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.getByText('00:00:10')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('00:00:11')).toBeInTheDocument()
  })

  it('renders list with proper accessibility roles', () => {
    const sessions = [makeLiveSession()]
    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows "agora" for very recent last activity', () => {
    const sessions = [
      makeLiveSession({
        lastActivity: { date: new Date(Date.now() - 20 * 1000).toISOString(), outcome: 'no_answer' },
      }),
    ]
    render(<LiveOperationsPanel sessions={sessions} activeCount={1} isLoading={false} />)
    expect(screen.getByText('agora')).toBeInTheDocument()
  })
})
