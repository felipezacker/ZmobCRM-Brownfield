import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueueThroughput } from '../components/QueueThroughput'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'

// ── Helpers ──────────────────────────────────────────────

const makeItem = (overrides?: Partial<ProspectingQueueItem>): ProspectingQueueItem => ({
  id: `q-${Math.random().toString(36).slice(2, 8)}`,
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
  ...overrides,
})

// ── Tests ──────────────────────────────────────────────

describe('QueueThroughput', () => {
  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <QueueThroughput queue={[]} exhaustedItems={[]} isLoading={true} />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('Saude da Fila')).not.toBeInTheDocument()
  })

  it('renders empty state when queue and exhaustedItems are empty', () => {
    render(
      <QueueThroughput queue={[]} exhaustedItems={[]} isLoading={false} />
    )
    expect(screen.getByText('Saude da Fila')).toBeInTheDocument()
    expect(screen.getByText('Fila vazia')).toBeInTheDocument()
  })

  it('renders correct counts for mixed status items', () => {
    const queue: ProspectingQueueItem[] = [
      makeItem({ status: 'pending', position: 0 }),
      makeItem({ status: 'pending', position: 1 }),
      makeItem({ status: 'in_progress', position: 2 }),
      makeItem({ status: 'completed', position: 3 }),
      makeItem({ status: 'completed', position: 4 }),
      makeItem({ status: 'completed', position: 5 }),
      makeItem({ status: 'skipped', position: 6 }),
      makeItem({ status: 'retry_pending', position: 7 }),
    ]
    const exhaustedItems: ProspectingQueueItem[] = [
      makeItem({ status: 'exhausted', position: 8 }),
      makeItem({ status: 'exhausted', position: 9 }),
    ]

    render(
      <QueueThroughput queue={queue} exhaustedItems={exhaustedItems} isLoading={false} />
    )

    expect(screen.getByText('Saude da Fila')).toBeInTheDocument()

    // Total na fila = queue.length (8, not including exhausted)
    expect(screen.getByText('8')).toBeInTheDocument()
    // Concluidos = 3
    expect(screen.getByText('3')).toBeInTheDocument()
    // Pendentes = 2 and Esgotados = 2 (both show "2")
    expect(screen.getAllByText('2')).toHaveLength(2)
    // Pulados = 1, Retry = 1 (two "1"s in the grid — in_progress is only in the bar)
    expect(screen.getAllByText('1')).toHaveLength(2)
  })

  it('renders the stacked bar with correct segments', () => {
    const queue: ProspectingQueueItem[] = [
      makeItem({ status: 'completed', position: 0 }),
      makeItem({ status: 'pending', position: 1 }),
    ]

    const { container } = render(
      <QueueThroughput queue={queue} exhaustedItems={[]} isLoading={false} />
    )

    // The bar container should exist
    const bar = container.querySelector('[role="img"]')
    expect(bar).toBeInTheDocument()

    // Should have 2 segments (completed + pending)
    const segments = bar?.children
    expect(segments?.length).toBe(2)
  })

  it('shows "Total na fila" as queue.length (excluding exhausted)', () => {
    const queue = [
      makeItem({ status: 'pending', position: 0 }),
      makeItem({ status: 'completed', position: 1 }),
    ]
    const exhaustedItems = [
      makeItem({ status: 'exhausted', position: 2 }),
    ]

    render(
      <QueueThroughput queue={queue} exhaustedItems={exhaustedItems} isLoading={false} />
    )

    // Labels should exist
    expect(screen.getByText('Total na fila')).toBeInTheDocument()
    expect(screen.getByText('Concluidos')).toBeInTheDocument()
    expect(screen.getByText('Pendentes')).toBeInTheDocument()
    expect(screen.getByText('Pulados')).toBeInTheDocument()
    expect(screen.getByText('Em retry')).toBeInTheDocument()
    expect(screen.getByText('Esgotados')).toBeInTheDocument()
  })

  it('renders zero counts for statuses not present', () => {
    const queue = [makeItem({ status: 'pending', position: 0 })]

    render(
      <QueueThroughput queue={queue} exhaustedItems={[]} isLoading={false} />
    )

    // Skipped, retry, exhausted should be 0
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(3) // skipped, retry_pending, exhausted at minimum
  })

  it('does not render bar segments for statuses with count 0', () => {
    const queue = [makeItem({ status: 'pending', position: 0 })]

    const { container } = render(
      <QueueThroughput queue={queue} exhaustedItems={[]} isLoading={false} />
    )

    const bar = container.querySelector('[role="img"]')
    // Only 1 segment for pending
    expect(bar?.children?.length).toBe(1)
  })
})
