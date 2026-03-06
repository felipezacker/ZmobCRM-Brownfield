/* eslint-disable no-restricted-syntax */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SavedQueuesList } from '../components/SavedQueuesList'
import type { SavedQueue } from '@/lib/supabase/prospecting-saved-queues'

vi.mock('@/app/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

const mockQueues: SavedQueue[] = [
  {
    id: 'q1',
    name: 'Leads frios 30 dias',
    filters: { version: 'v1', filters: { stages: ['lead'] } },
    ownerId: 'user-1',
    organizationId: 'org-1',
    isShared: false,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'q2',
    name: 'MQLs quentes',
    filters: { version: 'v1', filters: { temperatures: ['hot'] } },
    ownerId: 'user-2',
    organizationId: 'org-1',
    isShared: true,
    createdAt: '2026-03-02T00:00:00Z',
  },
]

describe('SavedQueuesList', () => {
  const defaultProps = {
    savedQueues: mockQueues,
    isLoading: false,
    isDeleting: false,
    currentUserId: 'user-1',
    onLoad: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no saved queues', () => {
    render(<SavedQueuesList {...defaultProps} savedQueues={[]} />)
    expect(screen.getByText('Nenhuma fila salva')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<SavedQueuesList {...defaultProps} isLoading={true} />)
    expect(screen.getByText('Carregando filas...')).toBeInTheDocument()
  })

  it('renders dropdown trigger with queue count', () => {
    render(<SavedQueuesList {...defaultProps} />)
    expect(screen.getByText('Minhas Filas')).toBeInTheDocument()
  })

  it('shows queues when dropdown opened', () => {
    render(<SavedQueuesList {...defaultProps} />)
    fireEvent.click(screen.getByText('Minhas Filas'))
    expect(screen.getByText('Leads frios 30 dias')).toBeInTheDocument()
    expect(screen.getByText('MQLs quentes')).toBeInTheDocument()
  })

  it('shows shared indicator for shared queues', () => {
    render(<SavedQueuesList {...defaultProps} />)
    fireEvent.click(screen.getByText('Minhas Filas'))
    expect(screen.getByText('compartilhada')).toBeInTheDocument()
  })

  it('calls onLoad when queue clicked', () => {
    render(<SavedQueuesList {...defaultProps} />)
    fireEvent.click(screen.getByText('Minhas Filas'))
    fireEvent.click(screen.getByText('Leads frios 30 dias'))
    expect(defaultProps.onLoad).toHaveBeenCalledWith(mockQueues[0])
  })

  it('requires double-click to delete (confirmation)', () => {
    render(<SavedQueuesList {...defaultProps} />)
    fireEvent.click(screen.getByText('Minhas Filas'))

    // Find delete buttons (visible on hover for owned queues)
    const deleteButtons = screen.getAllByTitle('Excluir')
    expect(deleteButtons.length).toBeGreaterThan(0)

    // First click — set confirmation
    fireEvent.click(deleteButtons[0])
    expect(defaultProps.onDelete).not.toHaveBeenCalled()

    // Second click — confirm
    const confirmBtn = screen.getByTitle('Confirmar exclusão')
    fireEvent.click(confirmBtn)
    expect(defaultProps.onDelete).toHaveBeenCalledWith('q1')
  })
})
