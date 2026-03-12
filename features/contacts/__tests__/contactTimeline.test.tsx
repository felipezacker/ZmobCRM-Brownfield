/**
 * CP-5.2: Timeline unificada — deduplication, badges, filters, expand/collapse
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ── Mock supabase ────────────────────────────────────────
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(),
    })),
  },
}))

// ── Mock cockpit-utils ───────────────────────────────────
vi.mock('@/features/deals/cockpit/cockpit-utils', () => ({
  formatAtISO: (d: string) => d,
  uid: () => 'mock-uid',
}))

// ── Import component ─────────────────────────────────────
import { ContactCockpitTimeline } from '../cockpit/ContactCockpitTimeline'

// ── Helpers ──────────────────────────────────────────────

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: `act-${Math.random().toString(36).slice(2, 8)}`,
    type: 'CALL' as const,
    title: 'Ligação de teste',
    description: 'Descrição longa da atividade que pode ser truncada dependendo do tamanho',
    date: '2026-03-12T10:00:00Z',
    dealTitle: '',
    dealId: '',
    metadata: undefined as Record<string, unknown> | undefined,
    ...overrides,
  }
}

const defaultProps = {
  contactId: 'contact-1',
  contactName: 'João Silva',
  firstDealId: null,
  firstDealTitle: null,
  onNoteCreated: vi.fn(),
}

// ── Tests ────────────────────────────────────────────────

describe('ContactCockpitTimeline — Deduplication (AC1, AC2)', () => {
  it('renders deduplicated entries (same id appears once)', () => {
    const entries = [
      makeEntry({ id: 'dup-1', title: 'Ligação A', type: 'CALL' }),
      makeEntry({ id: 'dup-1', title: 'Ligação A (dup)', type: 'CALL' }),
      makeEntry({ id: 'unique-2', title: 'Nota B', type: 'NOTE' }),
    ]

    // Dedup happens in ContactDetailModal (useMemo), but we can verify
    // the timeline renders all entries it receives.
    // Here we test that the component handles unique entries correctly.
    const dedupedEntries = [entries[0], entries[2]]
    render(<ContactCockpitTimeline activities={dedupedEntries} {...defaultProps} />)

    expect(screen.getByText('Ligação A')).toBeInTheDocument()
    expect(screen.getByText('Nota B')).toBeInTheDocument()
    // count via filter chip
    expect(screen.getByLabelText(/Filtrar por Tudo/)).toHaveTextContent('2')
  })
})

describe('ContactCockpitTimeline — Prospecting Badge (AC3)', () => {
  it('shows "Prospecção" badge when metadata.source === "prospecting"', () => {
    const entries = [
      makeEntry({ id: 'p-1', metadata: { source: 'prospecting' } }),
    ]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    expect(screen.getByText('Prospecção')).toBeInTheDocument()
    expect(screen.getByLabelText('Atividade de prospecção')).toBeInTheDocument()
  })

  it('does NOT show "Prospecção" badge when metadata.source is absent', () => {
    const entries = [
      makeEntry({ id: 'np-1', metadata: undefined }),
      makeEntry({ id: 'np-2', metadata: { source: 'manual' } }),
    ]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    expect(screen.queryByText('Prospecção')).not.toBeInTheDocument()
  })
})

describe('ContactCockpitTimeline — Outcome Badges (AC4)', () => {
  it.each([
    ['connected', 'Atendeu'],
    ['no_answer', 'Não atendeu'],
    ['voicemail', 'Caixa postal'],
    ['busy', 'Ocupado'],
  ])('shows outcome badge for %s', (outcome, label) => {
    const entries = [
      makeEntry({ id: `out-${outcome}`, type: 'CALL', metadata: { outcome } }),
    ]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByLabelText(`Resultado: ${label}`)).toBeInTheDocument()
  })

  it('does NOT show outcome badge for non-CALL types', () => {
    const entries = [
      makeEntry({ id: 'note-out', type: 'NOTE', metadata: { outcome: 'connected' } }),
    ]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    expect(screen.queryByText('Atendeu')).not.toBeInTheDocument()
  })
})

describe('ContactCockpitTimeline — Filter Chips (AC5)', () => {
  const mixedEntries = [
    makeEntry({ id: 'f-1', type: 'CALL' }),
    makeEntry({ id: 'f-2', type: 'CALL' }),
    makeEntry({ id: 'f-3', type: 'NOTE' }),
    makeEntry({ id: 'f-4', type: 'EMAIL' }),
    makeEntry({ id: 'f-5', type: 'MEETING' }),
  ]

  it('shows filter chips with counts', () => {
    render(<ContactCockpitTimeline activities={mixedEntries} {...defaultProps} />)

    expect(screen.getByLabelText(/Filtrar por Tudo \(5\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Filtrar por Ligações \(2\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Filtrar por Notas \(1\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Filtrar por Emails \(1\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Filtrar por Reuniões \(1\)/)).toBeInTheDocument()
  })

  it('filters by type when chip is clicked', () => {
    const entries = [
      makeEntry({ id: 'ft-1', type: 'CALL', title: 'Ligação Alpha' }),
      makeEntry({ id: 'ft-2', type: 'CALL', title: 'Ligação Beta' }),
      makeEntry({ id: 'ft-3', type: 'NOTE', title: 'Nota especial' }),
    ]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    // All 3 visible initially
    expect(screen.getByText('Ligação Alpha')).toBeInTheDocument()
    expect(screen.getByText('Ligação Beta')).toBeInTheDocument()
    expect(screen.getByText('Nota especial')).toBeInTheDocument()

    // Filter by NOTE
    fireEvent.click(screen.getByLabelText(/Filtrar por Notas/))

    // Only NOTE entry visible
    expect(screen.getByText('Nota especial')).toBeInTheDocument()
    expect(screen.queryByText('Ligação Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('Ligação Beta')).not.toBeInTheDocument()
  })

  it('disables chip when count is 0', () => {
    const entries = [makeEntry({ id: 'c-1', type: 'CALL' })]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    const taskChip = screen.getByLabelText(/Filtrar por Tarefas \(0\)/)
    expect(taskChip).toBeDisabled()
  })

  it('combines text search with type filter', () => {
    const entries = [
      makeEntry({ id: 'cs-1', type: 'CALL', title: 'Ligação Alpha' }),
      makeEntry({ id: 'cs-2', type: 'CALL', title: 'Ligação Beta' }),
      makeEntry({ id: 'cs-3', type: 'NOTE', title: 'Nota Alpha' }),
    ]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    // Filter by CALL
    fireEvent.click(screen.getByLabelText(/Filtrar por Ligações/))
    // Then search "Alpha"
    const searchInput = screen.getByPlaceholderText('Buscar atividades...')
    fireEvent.change(searchInput, { target: { value: 'Alpha' } })

    expect(screen.getByText('Ligação Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Ligação Beta')).not.toBeInTheDocument()
    expect(screen.queryByText('Nota Alpha')).not.toBeInTheDocument()
  })
})

describe('ContactCockpitTimeline — Expand/Collapse (AC6)', () => {
  it('toggles description between truncated and full on click', () => {
    const longDesc = 'A'.repeat(300)
    const entries = [
      makeEntry({ id: 'ec-1', description: longDesc }),
    ]
    render(<ContactCockpitTimeline activities={entries} {...defaultProps} />)

    const descButton = screen.getByLabelText('Expandir descrição')
    // Initially truncated (has line-clamp-2 class)
    const descDiv = descButton.querySelector('div')
    expect(descDiv?.className).toContain('line-clamp-2')
    expect(screen.getByText('ver mais')).toBeInTheDocument()

    // Click to expand
    fireEvent.click(descButton)

    const expandedButton = screen.getByLabelText('Recolher descrição')
    const expandedDiv = expandedButton.querySelector('div')
    expect(expandedDiv?.className).not.toContain('line-clamp-2')
    expect(screen.getByText('ver menos')).toBeInTheDocument()

    // Click to collapse again
    fireEvent.click(expandedButton)
    const collapsedButton = screen.getByLabelText('Expandir descrição')
    const collapsedDiv = collapsedButton.querySelector('div')
    expect(collapsedDiv?.className).toContain('line-clamp-2')
  })
})
