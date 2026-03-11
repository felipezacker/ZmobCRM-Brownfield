import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PowerDialer } from '../components/PowerDialer'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'
import type { GoalProgress } from '../hooks/useProspectingGoals'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/features/inbox/components/CallModal', () => ({
  CallModal: () => null,
}))

vi.mock('@/features/prospecting/components/ProspectingScriptGuide', () => ({
  ProspectingScriptGuide: () => null,
}))

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useCreateActivity: () => ({ mutate: vi.fn() }),
  useContactActivities: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/features/inbox/hooks/useQuickScripts', () => ({
  useQuickScripts: () => ({ scripts: [], isLoading: false, error: null }),
}))

const mockAddToast = vi.fn()
vi.mock('@/context/ToastContext', () => ({
  useOptionalToast: () => ({
    addToast: mockAddToast,
    removeToast: vi.fn(),
    showToast: mockAddToast,
  }),
}))

// ── Helpers ──────────────────────────────────────────────

const makeContact = (): ProspectingQueueItem => ({
  id: 'q-1',
  contactId: 'c-1',
  ownerId: 'o-1',
  organizationId: 'org-1',
  status: 'pending' as ProspectingQueueStatus,
  position: 0,
  retryCount: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  contactName: 'Maria Silva',
  contactPhone: '11999990000',
  contactEmail: 'maria@test.com',
  contactStage: 'LEAD',
  contactTemperature: 'HOT',
})

const defaultProps = () => ({
  contact: makeContact(),
  currentIndex: 0,
  totalCount: 10,
  onCallComplete: vi.fn(),
  onSkip: vi.fn(),
  onEnd: vi.fn(),
})

// ── AC2: Goal indicator in PowerDialer ──────────────────

describe('PowerDialer — Goal Indicator (AC2, AC4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC2: shows goal indicator when goalProgress is provided with target > 0', () => {
    const goalProgress: GoalProgress = {
      target: 20,
      current: 12,
      percentage: 60,
      color: 'yellow',
      isComplete: false,
    }
    render(<PowerDialer {...defaultProps()} goalProgress={goalProgress} />)

    expect(screen.getByText('12/20 ligações hoje')).toBeInTheDocument()
  })

  it('AC2: applies correct color class based on goalProgress.color', () => {
    const goalProgress: GoalProgress = {
      target: 20,
      current: 20,
      percentage: 100,
      color: 'green',
      isComplete: true,
    }
    render(<PowerDialer {...defaultProps()} goalProgress={goalProgress} />)

    const indicator = screen.getByText('20/20 ligações hoje')
    expect(indicator.className).toContain('text-green-500')
  })

  it('AC2: shows red color when progress is low', () => {
    const goalProgress: GoalProgress = {
      target: 20,
      current: 3,
      percentage: 15,
      color: 'red',
      isComplete: false,
    }
    render(<PowerDialer {...defaultProps()} goalProgress={goalProgress} />)

    const indicator = screen.getByText('3/20 ligações hoje')
    expect(indicator.className).toContain('text-red-500')
  })

  it('AC4: does not show indicator when goalProgress is undefined', () => {
    render(<PowerDialer {...defaultProps()} />)

    expect(screen.queryByText(/ligações hoje/)).not.toBeInTheDocument()
  })

  it('AC4: does not show indicator when goalProgress.target is 0', () => {
    const goalProgress: GoalProgress = {
      target: 0,
      current: 0,
      percentage: 0,
      color: 'red',
      isComplete: false,
    }
    render(<PowerDialer {...defaultProps()} goalProgress={goalProgress} />)

    expect(screen.queryByText(/ligações hoje/)).not.toBeInTheDocument()
  })
})

// ── AC3: Celebration toast ──────────────────────────────

describe('PowerDialer — Goal Celebration Toast (AC3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC3: fires toast when isComplete transitions to true', () => {
    const goalProgress: GoalProgress = {
      target: 20,
      current: 20,
      percentage: 100,
      color: 'green',
      isComplete: true,
    }
    render(<PowerDialer {...defaultProps()} goalProgress={goalProgress} />)

    expect(mockAddToast).toHaveBeenCalledWith(
      'Meta atingida! Você completou 20 ligações hoje.',
      'success',
    )
    expect(mockAddToast).toHaveBeenCalledTimes(1)
  })

  it('AC3: does not fire toast again on re-render with same isComplete=true', () => {
    const goalProgress: GoalProgress = {
      target: 20,
      current: 20,
      percentage: 100,
      color: 'green',
      isComplete: true,
    }
    const { rerender } = render(<PowerDialer {...defaultProps()} goalProgress={goalProgress} />)

    expect(mockAddToast).toHaveBeenCalledTimes(1)

    // Re-render with same props
    rerender(<PowerDialer {...defaultProps()} goalProgress={{ ...goalProgress, current: 21 }} />)

    // Should still only be called once
    expect(mockAddToast).toHaveBeenCalledTimes(1)
  })

  it('AC3: does not fire toast when isComplete is false', () => {
    const goalProgress: GoalProgress = {
      target: 20,
      current: 12,
      percentage: 60,
      color: 'yellow',
      isComplete: false,
    }
    render(<PowerDialer {...defaultProps()} goalProgress={goalProgress} />)

    expect(mockAddToast).not.toHaveBeenCalled()
  })

  it('AC4: does not fire toast when goalProgress is undefined', () => {
    render(<PowerDialer {...defaultProps()} />)

    expect(mockAddToast).not.toHaveBeenCalled()
  })
})
