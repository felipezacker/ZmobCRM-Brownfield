import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatRetryDate } from '../components/QueueItem'
import { QueueItem } from '../components/QueueItem'
import type { ProspectingQueueItem } from '@/types'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}))

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useContactActivities: () => ({
    data: undefined,
    isLoading: false,
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, onKeyDown, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; variant?: string; size?: string }) => (
    // eslint-disable-next-line no-restricted-syntax
    <button onClick={onClick} onKeyDown={onKeyDown} disabled={disabled} className={className} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}))

vi.mock('@/features/prospecting/components/LeadScoreBadge', () => ({
  LeadScoreBadge: ({ score }: { score?: number | null }) =>
    score != null ? <span data-testid="lead-score-badge">{score}</span> : null,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// ── Helpers ──────────────────────────────────────────────

const makeItem = (overrides?: Partial<ProspectingQueueItem>): ProspectingQueueItem => ({
  id: 'q-1',
  contactId: 'c-1',
  ownerId: 'u-1',
  organizationId: 'org-1',
  status: 'pending',
  position: 1,
  retryCount: 0,
  createdAt: '2026-03-11T00:00:00Z',
  updatedAt: '2026-03-11T00:00:00Z',
  contactName: 'João Silva',
  contactPhone: '11999999999',
  contactStage: 'Qualificação',
  contactTemperature: 'WARM',
  contactEmail: 'joao@test.com',
  leadScore: 45,
  ...overrides,
})

// ── formatRetryDate unit tests ──────────────────────────

describe('formatRetryDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when retryAt is null', () => {
    expect(formatRetryDate(null)).toBeNull()
  })

  it('returns null when retryAt is undefined', () => {
    expect(formatRetryDate(undefined)).toBeNull()
  })

  it('returns "Pronto para retry" with green color when retryAt is in the past', () => {
    const result = formatRetryDate('2026-03-12T10:00:00Z')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('Pronto para retry')
    expect(result!.color).toContain('text-green-600')
    expect(result!.color).toContain('dark:text-green-400')
  })

  it('returns "Retry hoje" with amber color when retryAt is today', () => {
    const result = formatRetryDate('2026-03-14T18:00:00Z')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('Retry hoje')
    expect(result!.color).toContain('text-amber-600')
  })

  it('returns "Retry amanhã" with amber color when retryAt is tomorrow', () => {
    const result = formatRetryDate('2026-03-15T10:00:00Z')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('Retry amanhã')
    expect(result!.color).toContain('text-amber-600')
  })

  it('returns "Retry em N dias" with muted color when retryAt is 5 days ahead', () => {
    const result = formatRetryDate('2026-03-19T10:00:00Z')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('Retry em 5 dias')
    expect(result!.color).toBe('text-muted-foreground')
  })

  it('returns "Retry em 2 dias" when retryAt is 2 days ahead', () => {
    const result = formatRetryDate('2026-03-16T10:00:00Z')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('Retry em 2 dias')
  })

  it('returns null when retryAt is an invalid date string', () => {
    expect(formatRetryDate('garbage')).toBeNull()
    expect(formatRetryDate('not-a-date')).toBeNull()
  })

  it('includes exactLabel with formatted date', () => {
    const result = formatRetryDate('2026-03-16T10:00:00Z')
    expect(result).not.toBeNull()
    expect(result!.exactLabel).toContain('Agendado para')
  })
})

// ── QueueItem component tests ──────────────────────────

describe('QueueItem retry date indicator (CP-6.3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('AC1/AC2: shows retry date below badge when status=retry_pending and retryAt is set', () => {
    render(
      <QueueItem
        item={makeItem({
          status: 'retry_pending',
          retryCount: 2,
          retryAt: '2026-03-16T10:00:00Z',
        })}
        onToggleExpand={vi.fn()}
      />
    )

    expect(screen.getByText('Retry #2')).toBeInTheDocument()
    expect(screen.getByText('Retry em 2 dias')).toBeInTheDocument()
  })

  it('AC3: shows "Pronto para retry" in green when retryAt is in the past', () => {
    render(
      <QueueItem
        item={makeItem({
          status: 'retry_pending',
          retryCount: 1,
          retryAt: '2026-03-12T10:00:00Z',
        })}
        onToggleExpand={vi.fn()}
      />
    )

    expect(screen.getByText('Retry #1')).toBeInTheDocument()
    const readyLabel = screen.getByText('Pronto para retry')
    expect(readyLabel).toBeInTheDocument()
    expect(readyLabel.className).toContain('text-green-600')
  })

  it('AC4: does not show retry date when status is not retry_pending', () => {
    render(
      <QueueItem
        item={makeItem({
          status: 'pending',
          retryCount: 1,
          retryAt: '2026-03-16T10:00:00Z',
        })}
        onToggleExpand={vi.fn()}
      />
    )

    expect(screen.getByText('Retry #1')).toBeInTheDocument()
    expect(screen.queryByText(/Retry em/)).not.toBeInTheDocument()
    expect(screen.queryByText('Pronto para retry')).not.toBeInTheDocument()
  })

  it('AC7: tooltip shows exact date when status=retry_pending and retryAt is set', () => {
    render(
      <QueueItem
        item={makeItem({
          status: 'retry_pending',
          retryCount: 1,
          retryAt: '2026-03-16T10:00:00Z',
        })}
        onToggleExpand={vi.fn()}
      />
    )

    const tooltipContent = screen.getByTestId('tooltip-content')
    expect(tooltipContent).toBeInTheDocument()
    expect(tooltipContent.textContent).toContain('Agendado para')
  })

  it('AC8: shows only badge without date when retryAt is null (legacy items)', () => {
    render(
      <QueueItem
        item={makeItem({
          status: 'retry_pending',
          retryCount: 3,
          retryAt: undefined,
        })}
        onToggleExpand={vi.fn()}
      />
    )

    expect(screen.getByText('Retry #3')).toBeInTheDocument()
    expect(screen.queryByText(/Retry em/)).not.toBeInTheDocument()
    expect(screen.queryByText('Pronto para retry')).not.toBeInTheDocument()
    expect(screen.queryByText('Retry hoje')).not.toBeInTheDocument()
    expect(screen.queryByText('Retry amanhã')).not.toBeInTheDocument()
  })

  it('AC8: no tooltip when retryAt is null', () => {
    render(
      <QueueItem
        item={makeItem({
          status: 'retry_pending',
          retryCount: 2,
          retryAt: undefined,
        })}
        onToggleExpand={vi.fn()}
      />
    )

    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument()
  })

  it('no retry badge when retryCount is 0', () => {
    render(
      <QueueItem
        item={makeItem({
          status: 'pending',
          retryCount: 0,
        })}
        onToggleExpand={vi.fn()}
      />
    )

    expect(screen.queryByText(/Retry #/)).not.toBeInTheDocument()
  })
})
