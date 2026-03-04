import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import {
  ProspectingFilters,
  INITIAL_FILTERS,
  type ProspectingFiltersState,
} from '../components/ProspectingFilters'

// ── Helpers ──────────────────────────────────────────────

const mockProfiles = [
  { id: 'u-1', name: 'João' },
  { id: 'u-2', name: 'Maria' },
]

const mockTags = ['VIP', 'Urgente', 'Follow-up']

const renderFilters = (
  overrides: Partial<{
    filters: ProspectingFiltersState
    onFiltersChange: (f: ProspectingFiltersState) => void
    availableTags: string[]
    showOwnerFilter: boolean
    onApply: () => void
  }> = {}
) => {
  const defaults = {
    filters: INITIAL_FILTERS,
    onFiltersChange: vi.fn(),
    profiles: mockProfiles,
    availableTags: mockTags,
    showOwnerFilter: false,
    onApply: vi.fn(),
  }
  const props = { ...defaults, ...overrides }
  return { ...render(<ProspectingFilters {...props} />), props }
}

// ── Tests ──────────────────────────────────────────────

describe('ProspectingFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all stage options', () => {
    renderFilters()
    expect(screen.getByText('Lead')).toBeTruthy()
    expect(screen.getByText('MQL')).toBeTruthy()
    expect(screen.getByText('Prospect')).toBeTruthy()
    expect(screen.getByText('Cliente')).toBeTruthy()
  })

  it('renders all temperature options', () => {
    renderFilters()
    expect(screen.getByText('Quente')).toBeTruthy()
    expect(screen.getByText('Morno')).toBeTruthy()
    expect(screen.getByText('Frio')).toBeTruthy()
  })

  it('renders all classification options', () => {
    renderFilters()
    expect(screen.getByText('Comprador')).toBeTruthy()
    expect(screen.getByText('Vendedor')).toBeTruthy()
    expect(screen.getByText('Investidor')).toBeTruthy()
  })

  it('renders source dropdown', () => {
    renderFilters()
    expect(screen.getByText('Todas')).toBeTruthy()
  })

  it('renders inactive days input', () => {
    renderFilters()
    expect(screen.getByPlaceholderText('30')).toBeTruthy()
  })

  it('does NOT show owner filter for corretor', () => {
    renderFilters({ showOwnerFilter: false })
    expect(screen.queryByText('Corretor')).toBeNull()
  })

  it('shows owner filter for diretor/admin', () => {
    renderFilters({ showOwnerFilter: true })
    expect(screen.getByText('Corretor')).toBeTruthy()
    expect(screen.getByText('João')).toBeTruthy()
    expect(screen.getByText('Maria')).toBeTruthy()
  })

  it('toggles stage selection', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ onFiltersChange })

    fireEvent.click(screen.getByText('Lead'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ stages: ['LEAD'] })
    )
  })

  it('toggles temperature selection', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ onFiltersChange })

    fireEvent.click(screen.getByText('Quente'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ temperatures: ['HOT'] })
    )
  })

  it('toggles classification selection', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ onFiltersChange })

    fireEvent.click(screen.getByText('Comprador'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ classifications: ['COMPRADOR'] })
    )
  })

  it('deselects already selected stage', () => {
    const onFiltersChange = vi.fn()
    renderFilters({
      filters: { ...INITIAL_FILTERS, stages: ['LEAD'] },
      onFiltersChange,
    })

    fireEvent.click(screen.getByText('Lead'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ stages: [] })
    )
  })

  it('updates source filter', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ onFiltersChange })

    const select = screen.getByText('Todas').closest('select')!
    fireEvent.change(select, { target: { value: 'WEBSITE' } })

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'WEBSITE' })
    )
  })

  it('updates inactive days', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ onFiltersChange })

    const input = screen.getByPlaceholderText('30')
    fireEvent.change(input, { target: { value: '15' } })

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ inactiveDays: 15 })
    )
  })

  it('clears inactive days when empty', () => {
    const onFiltersChange = vi.fn()
    renderFilters({
      filters: { ...INITIAL_FILTERS, inactiveDays: 30 },
      onFiltersChange,
    })

    const input = screen.getByPlaceholderText('30')
    fireEvent.change(input, { target: { value: '' } })

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ inactiveDays: null })
    )
  })

  it('shows clear button when filters are active', () => {
    renderFilters({
      filters: { ...INITIAL_FILTERS, stages: ['LEAD'] },
    })
    expect(screen.getByText('Limpar')).toBeTruthy()
  })

  it('does not show clear button with no filters', () => {
    renderFilters()
    expect(screen.queryByText('Limpar')).toBeNull()
  })

  it('clears all filters on clear button click', () => {
    const onFiltersChange = vi.fn()
    renderFilters({
      filters: {
        stages: ['LEAD'],
        temperatures: ['HOT'],
        classifications: ['COMPRADOR'],
        tags: ['VIP'],
        source: 'WEBSITE',
        ownerId: 'u-1',
        inactiveDays: 30,
        onlyWithPhone: false,
      },
      onFiltersChange,
    })

    fireEvent.click(screen.getByText('Limpar'))

    expect(onFiltersChange).toHaveBeenCalledWith(INITIAL_FILTERS)
  })

  it('calls onApply when "Aplicar Filtros" is clicked', () => {
    const onApply = vi.fn()
    renderFilters({ onApply })

    fireEvent.click(screen.getByText('Aplicar Filtros'))

    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('supports combined multi-select (stage + temperature)', () => {
    const onFiltersChange = vi.fn()
    renderFilters({
      filters: { ...INITIAL_FILTERS, stages: ['LEAD'] },
      onFiltersChange,
    })

    fireEvent.click(screen.getByText('MQL'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ stages: ['LEAD', 'MQL'] })
    )
  })

  it('renders tags autocomplete input', () => {
    renderFilters()
    expect(screen.getByPlaceholderText('Buscar tags...')).toBeTruthy()
  })

  it('shows tag suggestions on focus', () => {
    renderFilters()
    fireEvent.focus(screen.getByPlaceholderText('Buscar tags...'))
    expect(screen.getByText('VIP')).toBeTruthy()
    expect(screen.getByText('Urgente')).toBeTruthy()
    expect(screen.getByText('Follow-up')).toBeTruthy()
  })

  it('filters tag suggestions by query', () => {
    renderFilters()
    const input = screen.getByPlaceholderText('Buscar tags...')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'vi' } })
    expect(screen.getByText('VIP')).toBeTruthy()
    expect(screen.queryByText('Urgente')).toBeNull()
  })

  it('adds tag from dropdown', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ onFiltersChange })
    fireEvent.focus(screen.getByPlaceholderText('Buscar tags...'))
    fireEvent.click(screen.getByText('VIP'))
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['VIP'] })
    )
  })

  it('shows selected tags as removable chips', () => {
    renderFilters({
      filters: { ...INITIAL_FILTERS, tags: ['VIP', 'Urgente'] },
    })
    // Selected tags rendered as chips (not in dropdown)
    expect(screen.getByText('VIP')).toBeTruthy()
    expect(screen.getByText('Urgente')).toBeTruthy()
  })

  it('removes selected tag via X button', () => {
    const onFiltersChange = vi.fn()
    renderFilters({
      filters: { ...INITIAL_FILTERS, tags: ['VIP'] },
      onFiltersChange,
    })
    // The X button is inside the chip
    const chip = screen.getByText('VIP').closest('span')!
    const removeBtn = chip.querySelector('button')!
    fireEvent.click(removeBtn)
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] })
    )
  })

  it('hides already selected tags from dropdown', () => {
    renderFilters({
      filters: { ...INITIAL_FILTERS, tags: ['VIP'] },
    })
    fireEvent.focus(screen.getByPlaceholderText('Buscar tags...'))
    // VIP is selected so should NOT appear in dropdown suggestions
    // It appears as a chip but not as a dropdown item
    const listItems = screen.queryAllByRole('button').filter(b => b.textContent === 'VIP' && b.closest('li'))
    expect(listItems).toHaveLength(0)
  })

  it('does not render tags section when no tags available', () => {
    renderFilters({ availableTags: [] })
    expect(screen.queryByText('Tags')).toBeNull()
    expect(screen.queryByPlaceholderText('Buscar tags...')).toBeNull()
  })

  it('includes tags in clear all', () => {
    const onFiltersChange = vi.fn()
    renderFilters({
      filters: { ...INITIAL_FILTERS, tags: ['VIP'] },
      onFiltersChange,
    })
    fireEvent.click(screen.getByText('Limpar'))
    expect(onFiltersChange).toHaveBeenCalledWith(INITIAL_FILTERS)
  })

  it('toggles onlyWithPhone filter via chip', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ onFiltersChange })

    fireEvent.click(screen.getByText('Só com telefone'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ onlyWithPhone: true })
    )
  })

  it('deselects onlyWithPhone when already active', () => {
    const onFiltersChange = vi.fn()
    renderFilters({
      filters: { ...INITIAL_FILTERS, onlyWithPhone: true },
      onFiltersChange,
    })

    fireEvent.click(screen.getByText('Só com telefone'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ onlyWithPhone: false })
    )
  })

  it('updates owner filter onChange', () => {
    const onFiltersChange = vi.fn()
    renderFilters({ showOwnerFilter: true, onFiltersChange })

    const ownerSelect = screen.getByText('Todos').closest('select')!
    fireEvent.change(ownerSelect, { target: { value: 'u-1' } })

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'u-1' })
    )
  })

  it('shows clear button when onlyWithPhone is the only active filter', () => {
    renderFilters({
      filters: { ...INITIAL_FILTERS, onlyWithPhone: true },
    })
    expect(screen.getByText('Limpar')).toBeTruthy()
  })
})
