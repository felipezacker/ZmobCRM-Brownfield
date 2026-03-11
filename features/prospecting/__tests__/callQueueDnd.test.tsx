import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CallQueue } from '../components/CallQueue'
import { QueueItem } from '../components/QueueItem'
import type { ProspectingQueueItem } from '@/types'

// ── @dnd-kit mocks ─────────────────────────────────────

let capturedOnDragEnd: ((event: unknown) => void) | null = null

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (event: unknown) => void }) => {
    capturedOnDragEnd = onDragEnd || null
    return <>{children}</>
  },
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  arrayMove: <T,>(arr: T[], from: number, to: number): T[] => {
    const result = [...arr]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
  },
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

vi.mock('@/features/prospecting/components/QueueItemDetails', () => ({
  QueueItemDetails: () => <div data-testid="queue-item-details" />,
}))

vi.mock('@/features/prospecting/components/LeadScoreBadge', () => ({
  LeadScoreBadge: () => null,
}))

// ── Fixtures ────────────────────────────────────────────

const makeItem = (id: string, position: number, name: string): ProspectingQueueItem => ({
  id,
  contactId: `contact-${id}`,
  ownerId: 'owner-1',
  organizationId: 'org-1',
  status: 'pending',
  position,
  retryCount: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  contactName: name,
  leadScore: null,
})

const items: ProspectingQueueItem[] = [
  makeItem('a', 0, 'Alice'),
  makeItem('b', 1, 'Bob'),
  makeItem('c', 2, 'Charlie'),
]

// ── Tests ───────────────────────────────────────────────

describe('CallQueue DnD (CP-4.7)', () => {
  let onReorder: ReturnType<typeof vi.fn>

  beforeEach(() => {
    capturedOnDragEnd = null
    onReorder = vi.fn()
  })

  it('calls onReorder with reordered items when drag ends', () => {
    render(
      <CallQueue
        items={items}
        isLoading={false}
        onRemove={vi.fn()}
        onReorder={onReorder}
      />
    )

    expect(capturedOnDragEnd).toBeTruthy()

    // Simulate drag item 'a' (index 0) over item 'c' (index 2)
    act(() => {
      capturedOnDragEnd!({
        active: { id: 'a' },
        over: { id: 'c' },
      })
    })

    expect(onReorder).toHaveBeenCalledTimes(1)
    const reordered = onReorder.mock.calls[0][0] as ProspectingQueueItem[]
    expect(reordered.map(i => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('does not call onReorder when dragging to same position', () => {
    render(
      <CallQueue
        items={items}
        isLoading={false}
        onRemove={vi.fn()}
        onReorder={onReorder}
      />
    )

    act(() => {
      capturedOnDragEnd!({
        active: { id: 'a' },
        over: { id: 'a' },
      })
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does not call onReorder when over is null (dropped outside)', () => {
    render(
      <CallQueue
        items={items}
        isLoading={false}
        onRemove={vi.fn()}
        onReorder={onReorder}
      />
    )

    act(() => {
      capturedOnDragEnd!({
        active: { id: 'a' },
        over: null,
      })
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('disables drag when isSessionActive is true', () => {
    render(
      <CallQueue
        items={items}
        isLoading={false}
        onRemove={vi.fn()}
        onReorder={onReorder}
        isSessionActive
      />
    )

    expect(screen.queryByLabelText('Arrastar para reordenar')).not.toBeInTheDocument()
  })

  it('disables drag when sortBy is score (toggled via button)', () => {
    render(
      <CallQueue
        items={items}
        isLoading={false}
        onRemove={vi.fn()}
        onReorder={onReorder}
      />
    )

    // Initially sortBy = 'position', drag handles should be visible
    expect(screen.getAllByLabelText('Arrastar para reordenar')).toHaveLength(3)

    // Click sort button to switch to 'score'
    act(() => {
      fireEvent.click(screen.getByText('Ordem'))
    })

    // Now drag handles should be hidden
    expect(screen.queryByLabelText('Arrastar para reordenar')).not.toBeInTheDocument()
  })

  it('shows tooltip when sort=score explaining drag is disabled', () => {
    render(
      <CallQueue
        items={items}
        isLoading={false}
        onRemove={vi.fn()}
        onReorder={onReorder}
      />
    )

    // Switch to score sort
    act(() => {
      fireEvent.click(screen.getByText('Ordem'))
    })

    // Tooltip should exist in DOM (hidden via CSS opacity)
    expect(screen.getByText('Arraste requer ordenação por posição')).toBeInTheDocument()
  })

  it('disables drag when isReordering is true', () => {
    render(
      <CallQueue
        items={items}
        isLoading={false}
        onRemove={vi.fn()}
        onReorder={onReorder}
        isReordering
      />
    )

    expect(screen.queryByLabelText('Arrastar para reordenar')).not.toBeInTheDocument()
  })
})

describe('QueueItem DnD handle (CP-4.7)', () => {
  it('shows drag handle when isDragDisabled is false', () => {
    render(
      <QueueItem
        item={items[0]}
        isDragDisabled={false}
      />
    )

    expect(screen.getByLabelText('Arrastar para reordenar')).toBeInTheDocument()
  })

  it('hides drag handle when isDragDisabled is true', () => {
    render(
      <QueueItem
        item={items[0]}
        isDragDisabled
      />
    )

    expect(screen.queryByLabelText('Arrastar para reordenar')).not.toBeInTheDocument()
  })
})
