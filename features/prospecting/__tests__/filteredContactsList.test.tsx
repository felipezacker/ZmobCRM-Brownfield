import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { FilteredContactsList } from '../components/FilteredContactsList'
import type { ProspectingFilteredContact } from '@/lib/supabase/prospecting-filtered-contacts'

// ── Helpers ──────────────────────────────────────────────

const makeContact = (
  overrides?: Partial<ProspectingFilteredContact>
): ProspectingFilteredContact => ({
  id: `c-${Math.random().toString(36).slice(2, 8)}`,
  name: 'João Silva',
  email: 'joao@example.com',
  stage: 'LEAD',
  temperature: 'HOT',
  classification: 'COMPRADOR',
  source: 'WEBSITE',
  ownerId: 'u-1',
  createdAt: '2026-03-03T00:00:00Z',
  primaryPhone: '11999990000',
  hasPhone: true,
  daysSinceLastActivity: 15,
  ...overrides,
})

const defaultProps = {
  totalCount: 3,
  page: 0,
  totalPages: 1,
  onPageChange: vi.fn(),
  isLoading: false,
  isFetching: false,
  existingQueueContactIds: new Set<string>(),
  currentQueueSize: 0,
  onAddToQueue: vi.fn().mockResolvedValue(undefined),
}

// ── Tests ──────────────────────────────────────────────

describe('FilteredContactsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders contacts with name, phone, stage, temperature', () => {
    const contacts = [
      makeContact({ id: 'c-1', name: 'João Silva', primaryPhone: '11999990000', stage: 'LEAD', temperature: 'HOT' }),
    ]
    render(<FilteredContactsList {...defaultProps} contacts={contacts} />)

    expect(screen.getByText('João Silva')).toBeTruthy()
    expect(screen.getByText('11999990000')).toBeTruthy()
    expect(screen.getByText('Lead')).toBeTruthy()
    expect(screen.getByText('Quente')).toBeTruthy()
  })

  it('shows "Sem telefone" badge for contacts without phone', () => {
    const contacts = [
      makeContact({ id: 'c-1', hasPhone: false, primaryPhone: null }),
    ]
    render(<FilteredContactsList {...defaultProps} contacts={contacts} />)

    expect(screen.getByText('Sem telefone')).toBeTruthy()
  })

  it('disables checkbox for contacts without phone', () => {
    const contacts = [
      makeContact({ id: 'c-1', hasPhone: false, primaryPhone: null }),
    ]
    render(<FilteredContactsList {...defaultProps} contacts={contacts} />)

    const checkboxes = screen.getAllByRole('checkbox')
    // First is "Selecionar todos", second is the contact checkbox
    const contactCheckbox = checkboxes[1]
    expect(contactCheckbox).toBeDisabled()
  })

  it('shows "Na fila" badge for contacts already in queue', () => {
    const contacts = [
      makeContact({ id: 'c-1' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        existingQueueContactIds={new Set(['c-1'])}
      />
    )

    expect(screen.getByText('Na fila')).toBeTruthy()
  })

  it('disables checkbox for contacts already in queue', () => {
    const contacts = [
      makeContact({ id: 'c-1' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        existingQueueContactIds={new Set(['c-1'])}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const contactCheckbox = checkboxes[1]
    expect(contactCheckbox).toBeDisabled()
  })

  it('selects individual contact via checkbox', () => {
    const contacts = [
      makeContact({ id: 'c-1' }),
      makeContact({ id: 'c-2', name: 'Maria' }),
    ]
    render(<FilteredContactsList {...defaultProps} contacts={contacts} totalCount={2} />)

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // First contact

    expect(screen.getByText(/1 selecionado/)).toBeTruthy()
  })

  it('select all selects only contacts with phone and not in queue', () => {
    const contacts = [
      makeContact({ id: 'c-1', hasPhone: true }),
      makeContact({ id: 'c-2', hasPhone: false }),
      makeContact({ id: 'c-3', hasPhone: true }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={3}
        existingQueueContactIds={new Set(['c-3'])}
      />
    )

    // Click "Selecionar todos"
    fireEvent.click(screen.getByText('Selecionar todos'))

    // Only c-1 should be selected (c-2 has no phone, c-3 is in queue)
    expect(screen.getByText(/1 selecionado/)).toBeTruthy()
  })

  it('shows "Adicionar à Fila (N)" button when contacts are selected', () => {
    const contacts = [makeContact({ id: 'c-1' })]
    render(<FilteredContactsList {...defaultProps} contacts={contacts} />)

    fireEvent.click(screen.getAllByRole('checkbox')[1])

    expect(screen.getByText(/Adicionar à Fila \(1\)/)).toBeTruthy()
  })

  it('calls onAddToQueue with selected IDs', async () => {
    const onAddToQueue = vi.fn().mockResolvedValue(undefined)
    const contacts = [
      makeContact({ id: 'c-1' }),
      makeContact({ id: 'c-2', name: 'Maria' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={2}
        onAddToQueue={onAddToQueue}
      />
    )

    // Select both
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    fireEvent.click(screen.getAllByRole('checkbox')[2])

    // Click add button
    fireEvent.click(screen.getByText(/Adicionar à Fila \(2\)/))

    await waitFor(() => {
      expect(onAddToQueue).toHaveBeenCalledWith(['c-1', 'c-2'])
    })
  })

  it('shows limit warning when queue would exceed 100', () => {
    const contacts = [
      makeContact({ id: 'c-1' }),
      makeContact({ id: 'c-2', name: 'Maria' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={2}
        currentQueueSize={99}
      />
    )

    // Select both
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    fireEvent.click(screen.getAllByRole('checkbox')[2])

    expect(screen.getByText(/Limite de 100/)).toBeTruthy()
    expect(screen.getByText(/Apenas 1 serão adicionados/)).toBeTruthy()
  })

  it('only adds max allowed contacts when over limit', async () => {
    const onAddToQueue = vi.fn().mockResolvedValue(undefined)
    const contacts = [
      makeContact({ id: 'c-1' }),
      makeContact({ id: 'c-2', name: 'Maria' }),
      makeContact({ id: 'c-3', name: 'Pedro' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={3}
        currentQueueSize={98}
        onAddToQueue={onAddToQueue}
      />
    )

    // Select all
    fireEvent.click(screen.getByText('Selecionar todos'))

    // Click add
    fireEvent.click(screen.getByText(/Adicionar à Fila/))

    await waitFor(() => {
      expect(onAddToQueue).toHaveBeenCalledWith(['c-1', 'c-2'])
    })
  })

  it('shows days since last activity', () => {
    const contacts = [
      makeContact({ id: 'c-1', daysSinceLastActivity: 42 }),
    ]
    render(<FilteredContactsList {...defaultProps} contacts={contacts} />)

    expect(screen.getByText('42d')).toBeTruthy()
  })

  it('shows "Nunca" for contacts without activities', () => {
    const contacts = [
      makeContact({ id: 'c-1', daysSinceLastActivity: null }),
    ]
    render(<FilteredContactsList {...defaultProps} contacts={contacts} />)

    expect(screen.getByText('Nunca')).toBeTruthy()
  })

  it('shows loading skeleton', () => {
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={[]}
        isLoading={true}
      />
    )

    // Should render skeleton divs, not "Nenhum contato encontrado"
    expect(screen.queryByText('Nenhum contato encontrado')).toBeNull()
  })

  it('shows empty state message', () => {
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={[]}
        totalCount={0}
      />
    )

    expect(screen.getByText(/Nenhum contato encontrado/)).toBeTruthy()
  })

  it('shows pagination when multiple pages', () => {
    const contacts = [makeContact({ id: 'c-1' })]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalPages={3}
      />
    )

    expect(screen.getByText('Página 1 de 3')).toBeTruthy()
  })

  it('clears selection on page change', () => {
    const contacts = [makeContact({ id: 'c-1' })]
    const { rerender } = render(
      <FilteredContactsList {...defaultProps} contacts={contacts} page={0} />
    )

    // Select contact
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    expect(screen.getByText(/1 selecionado/)).toBeTruthy()

    // Change page
    rerender(
      <FilteredContactsList {...defaultProps} contacts={contacts} page={1} />
    )

    expect(screen.getByText(/0 selecionado/)).toBeTruthy()
  })

  it('clears selection after successful add', async () => {
    const onAddToQueue = vi.fn().mockResolvedValue(undefined)
    const contacts = [makeContact({ id: 'c-1' })]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        onAddToQueue={onAddToQueue}
      />
    )

    // Select and add
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    fireEvent.click(screen.getByText(/Adicionar à Fila/))

    await waitFor(() => {
      expect(screen.getByText(/0 selecionado/)).toBeTruthy()
    })
  })

  it('disables add button when queue is exactly at limit (100)', () => {
    const contacts = [
      makeContact({ id: 'c-1' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={1}
        currentQueueSize={100}
      />
    )

    // Select the contact
    fireEvent.click(screen.getAllByRole('checkbox')[1])

    // Button should exist but be disabled (maxAddable = 0)
    const addButton = screen.getByText(/Adicionar à Fila/)
    expect(addButton.closest('button')).toBeDisabled()
  })

  it('shows limit warning with maxAddable = 0 when queue is full', () => {
    const contacts = [
      makeContact({ id: 'c-1' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={1}
        currentQueueSize={100}
      />
    )

    fireEvent.click(screen.getAllByRole('checkbox')[1])

    expect(screen.getByText(/Limite de 100/)).toBeTruthy()
    expect(screen.getByText(/Apenas 0 serão adicionados/)).toBeTruthy()
  })

  it('renders cross-page select all button when totalCount > page contacts', () => {
    const contacts = [
      makeContact({ id: 'c-1' }),
      makeContact({ id: 'c-2', name: 'Maria' }),
    ]
    const onSelectAllFiltered = vi.fn().mockResolvedValue(['c-1', 'c-2', 'c-3', 'c-4'])
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={50}
        totalPages={2}
        onSelectAllFiltered={onSelectAllFiltered}
      />
    )

    // Select all on page first
    fireEvent.click(screen.getByText('Selecionar todos'))

    // Cross-page select all button should appear
    expect(screen.getByText(/Selecionar todos os 50 contatos/)).toBeTruthy()
  })

  it('calls onSelectAllFiltered and updates selection set', async () => {
    const allIds = ['c-1', 'c-2', 'c-3', 'c-4']
    const onSelectAllFiltered = vi.fn().mockResolvedValue(allIds)
    const contacts = [
      makeContact({ id: 'c-1' }),
      makeContact({ id: 'c-2', name: 'Maria' }),
    ]
    render(
      <FilteredContactsList
        {...defaultProps}
        contacts={contacts}
        totalCount={50}
        totalPages={2}
        onSelectAllFiltered={onSelectAllFiltered}
      />
    )

    // Select all on page
    fireEvent.click(screen.getByText('Selecionar todos'))
    // Click cross-page select all
    fireEvent.click(screen.getByText(/Selecionar todos os 50 contatos/))

    await waitFor(() => {
      expect(onSelectAllFiltered).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Todos os 4 contatos selecionados/)).toBeTruthy()
    })
  })
})
