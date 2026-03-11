import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { QueueItem } from '../components/QueueItem'
import { CallQueue } from '../components/CallQueue'
import type { ProspectingQueueItem } from '@/types'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  arrayMove: (arr: unknown[]) => arr,
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

let mockActivitiesData: unknown[] = []
let mockIsLoading = false

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useContactActivities: (contactId: string | undefined) => ({
    data: contactId ? mockActivitiesData : undefined,
    isLoading: contactId ? mockIsLoading : false,
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

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/features/prospecting/components/LeadScoreBadge', () => ({
  LeadScoreBadge: ({ score }: { score?: number | null }) =>
    score != null ? <span data-testid="lead-score-badge">{score}</span> : null,
}))

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

// ── Tests ──────────────────────────────────────────────

describe('QueueItem Expand (CP-4.4)', () => {
  beforeEach(() => {
    mockActivitiesData = [
      {
        id: 'act-1',
        title: 'Ligação de prospecção',
        type: 'CALL',
        date: new Date().toISOString(),
        completed: true,
      },
    ]
    mockIsLoading = false
  })

  // AC1: Clicar no item expande a area de detalhes
  it('AC1 — clicar no item expande a area de detalhes', () => {
    const onToggle = vi.fn()
    render(<QueueItem item={makeItem()} isExpanded={false} onToggleExpand={onToggle} />)

    const btn = screen.getByRole('button', { name: /João Silva/i })
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith('q-1')
  })

  // AC1: Clicar novamente colapsa
  it('AC1 — clicar novamente colapsa', () => {
    const onToggle = vi.fn()
    render(<QueueItem item={makeItem()} isExpanded={true} onToggleExpand={onToggle} />)

    const btn = screen.getByRole('button', { name: /João Silva/i })
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith('q-1')
  })

  // AC4: Accordion via CallQueue — expandir segundo item colapsa primeiro
  it('AC4 — expandir segundo item colapsa o primeiro (accordion)', () => {
    const items: ProspectingQueueItem[] = [
      makeItem({ id: 'q-1', contactId: 'c-1', contactName: 'João Silva' }),
      makeItem({ id: 'q-2', contactId: 'c-2', contactName: 'Maria Souza' }),
    ]

    render(
      <CallQueue items={items} isLoading={false} onRemove={vi.fn()} />
    )

    const getExpandButton = (name: RegExp) =>
      screen.getByRole('button', { name })

    // Click first item — expand
    act(() => {
      fireEvent.click(getExpandButton(/João Silva — clique para expandir/i))
    })

    // First item should be expanded — aria-expanded=true
    expect(getExpandButton(/João Silva — clique para recolher/i)).toHaveAttribute('aria-expanded', 'true')
    expect(getExpandButton(/Maria Souza — clique para expandir/i)).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByText('Ver perfil')).toHaveLength(1)

    // Click second item — first collapses, second expands (accordion)
    act(() => {
      fireEvent.click(getExpandButton(/Maria Souza — clique para expandir/i))
    })

    expect(getExpandButton(/João Silva — clique para expandir/i)).toHaveAttribute('aria-expanded', 'false')
    expect(getExpandButton(/Maria Souza — clique para recolher/i)).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('Ver perfil')).toHaveLength(1)
  })

  // AC5: Clicar no X nao aciona expand (stopPropagation)
  it('AC5 — clicar no botao X nao aciona expand', () => {
    const onToggle = vi.fn()
    const onRemove = vi.fn()
    render(
      <QueueItem item={makeItem()} isExpanded={false} onToggleExpand={onToggle} onRemove={onRemove} />
    )

    const removeBtn = screen.getByLabelText('Remover da fila')
    fireEvent.click(removeBtn)

    expect(onRemove).toHaveBeenCalledWith('q-1')
    expect(onToggle).not.toHaveBeenCalled()
  })

  // AC6: useContactActivities nao chamado quando nao expandido
  it('AC6 — fetch nao ocorre quando item nao esta expandido', () => {
    render(<QueueItem item={makeItem()} isExpanded={false} onToggleExpand={vi.fn()} />)

    // QueueItemDetails should not be rendered
    expect(screen.queryByText('Ver perfil')).not.toBeInTheDocument()
    expect(screen.queryByText('joao@test.com')).not.toBeInTheDocument()
  })

  // AC2: Area expandida exibe email, ultima atividade e lead score
  it('AC2 — area expandida exibe email, ultima atividade e lead score', () => {
    render(<QueueItem item={makeItem()} isExpanded={true} onToggleExpand={vi.fn()} />)

    // Email
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()

    // Last activity
    expect(screen.getByText('Ligação de prospecção')).toBeInTheDocument()

    // Lead score label (Morno for score 45)
    expect(screen.getByText(/45\/100/)).toBeInTheDocument()
    expect(screen.getByText(/Morno/)).toBeInTheDocument()

    // Ver perfil link
    const profileLink = screen.getByText('Ver perfil')
    expect(profileLink.closest('a')).toHaveAttribute('href', '/contacts?contactId=c-1')
  })

  // AC2 fallback: sem atividades
  it('AC2 — fallback quando nao ha atividades', () => {
    mockActivitiesData = []
    render(<QueueItem item={makeItem()} isExpanded={true} onToggleExpand={vi.fn()} />)

    expect(screen.getByText('Sem atividades registradas')).toBeInTheDocument()
  })
})
