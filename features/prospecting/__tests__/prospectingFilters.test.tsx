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

const renderFilters = (
  overrides: Partial<{
    filters: ProspectingFiltersState
    onFiltersChange: (f: ProspectingFiltersState) => void
    showOwnerFilter: boolean
    onApply: () => void
  }> = {}
) => {
  const defaults = {
    filters: INITIAL_FILTERS,
    onFiltersChange: vi.fn(),
    profiles: mockProfiles,
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
        source: 'WEBSITE',
        ownerId: 'u-1',
        inactiveDays: 30,
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
})
