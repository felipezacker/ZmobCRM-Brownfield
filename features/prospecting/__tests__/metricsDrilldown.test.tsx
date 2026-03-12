/* eslint-disable no-restricted-syntax */
/**
 * CP-5.4: MetricsCards clickable + MetricsDrilldownModal tests
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MetricsCards } from '../components/MetricsCards'
import { MetricsDrilldownModal } from '../components/MetricsDrilldownModal'
import type { CallActivity, ProspectingMetrics } from '../hooks/useProspectingMetrics'
import type { DrilldownCardType } from '../constants'

// ── Mock data ──────────────────────────────────────────────

const mockProfiles = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
]

const mockMetrics: ProspectingMetrics = {
  totalCalls: 10,
  connectedCalls: 4,
  connectionRate: 40,
  avgDuration: 120,
  uniqueContacts: 6,
  byDay: [],
  byOutcome: [
    { outcome: 'connected', count: 4 },
    { outcome: 'no_answer', count: 3 },
    { outcome: 'voicemail', count: 2 },
    { outcome: 'busy', count: 1 },
  ],
  byBroker: [],
}

function makeActivity(overrides: Partial<CallActivity> & { id: string }): CallActivity {
  return {
    date: '2026-03-12T10:00:00',
    owner_id: 'u1',
    contact_id: 'c1',
    description: null,
    metadata: { outcome: 'connected', duration_seconds: 60 },
    contacts: [{ name: 'Contato Teste' }],
    ...overrides,
  }
}

const mockActivities: CallActivity[] = [
  makeActivity({ id: 'a1', metadata: { outcome: 'connected', duration_seconds: 180 }, description: 'Nota longa que precisa ser expandida para o usuario ver tudo', deal_id: 'deal-1' }),
  makeActivity({ id: 'a2', metadata: { outcome: 'connected', duration_seconds: 120 }, contact_id: 'c2', contacts: [{ name: 'Maria' }] }),
  makeActivity({ id: 'a3', metadata: { outcome: 'no_answer', duration_seconds: 30 }, contact_id: 'c3', contacts: [{ name: 'Joao' }] }),
  makeActivity({ id: 'a4', metadata: { outcome: 'no_answer', duration_seconds: 15 }, contact_id: 'c3', contacts: [{ name: 'Joao' }] }),
  makeActivity({ id: 'a5', metadata: { outcome: 'voicemail', duration_seconds: 45 }, contact_id: 'c4', contacts: [{ name: 'Pedro' }] }),
  makeActivity({ id: 'a6', metadata: { outcome: 'connected', duration_seconds: 200 }, contact_id: 'c1', contacts: [{ name: 'Contato Teste' }], deal_id: 'deal-2' }),
  makeActivity({ id: 'a7', metadata: { outcome: 'no_answer', duration_seconds: 10 }, contact_id: 'c5', contacts: [{ name: 'Ana' }] }),
  makeActivity({ id: 'a8', metadata: { outcome: 'voicemail', duration_seconds: 50 }, contact_id: 'c6', contacts: [{ name: 'Carlos' }] }),
]

// ── MetricsCards tests ─────────────────────────────────────

describe('MetricsCards — clickable (CP-5.4)', () => {
  it('calls onCardClick with "totalCalls" when clicking Ligacoes Discadas', () => {
    const onClick = vi.fn()
    render(<MetricsCards metrics={mockMetrics} isLoading={false} onCardClick={onClick} />)
    fireEvent.click(screen.getByLabelText('Ver detalhes: Ligações Discadas'))
    expect(onClick).toHaveBeenCalledWith('totalCalls')
  })

  it('calls onCardClick with "connected" when clicking Atendidas', () => {
    const onClick = vi.fn()
    render(<MetricsCards metrics={mockMetrics} isLoading={false} onCardClick={onClick} />)
    fireEvent.click(screen.getByLabelText('Ver detalhes: Atendidas'))
    expect(onClick).toHaveBeenCalledWith('connected')
  })

  it('calls onCardClick with "noAnswer" when clicking Sem Resposta', () => {
    const onClick = vi.fn()
    render(<MetricsCards metrics={mockMetrics} isLoading={false} onCardClick={onClick} />)
    fireEvent.click(screen.getByLabelText('Ver detalhes: Sem Resposta'))
    expect(onClick).toHaveBeenCalledWith('noAnswer')
  })

  it('calls onCardClick with "voicemail" when clicking Correio de Voz', () => {
    const onClick = vi.fn()
    render(<MetricsCards metrics={mockMetrics} isLoading={false} onCardClick={onClick} />)
    fireEvent.click(screen.getByLabelText('Ver detalhes: Correio de Voz'))
    expect(onClick).toHaveBeenCalledWith('voicemail')
  })

  it('calls onCardClick with "avgDuration" when clicking Tempo Medio', () => {
    const onClick = vi.fn()
    render(<MetricsCards metrics={mockMetrics} isLoading={false} onCardClick={onClick} />)
    fireEvent.click(screen.getByLabelText(/Ver detalhes: Tempo Médio/))
    expect(onClick).toHaveBeenCalledWith('avgDuration')
  })

  it('calls onCardClick with "uniqueContacts" when clicking Contatos Prospectados', () => {
    const onClick = vi.fn()
    render(<MetricsCards metrics={mockMetrics} isLoading={false} onCardClick={onClick} />)
    fireEvent.click(screen.getByLabelText('Ver detalhes: Contatos Prospectados'))
    expect(onClick).toHaveBeenCalledWith('uniqueContacts')
  })

  it('renders all 6 cards with correct values', () => {
    render(<MetricsCards metrics={mockMetrics} isLoading={false} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })
})

// ── MetricsDrilldownModal tests ────────────────────────────

function renderModal(cardType: DrilldownCardType, activities = mockActivities) {
  return render(
    <MetricsDrilldownModal
      isOpen={true}
      onClose={vi.fn()}
      cardType={cardType}
      activities={activities}
      profiles={mockProfiles}
    />,
  )
}

describe('MetricsDrilldownModal — title per cardType (CP-5.4)', () => {
  it('shows "Ligacoes Discadas" for totalCalls', () => {
    renderModal('totalCalls')
    expect(screen.getByText('Ligações Discadas')).toBeInTheDocument()
  })

  it('shows "Atendidas" for connected', () => {
    renderModal('connected')
    expect(screen.getByText('Atendidas')).toBeInTheDocument()
  })

  it('shows "Sem Resposta" for noAnswer', () => {
    renderModal('noAnswer')
    expect(screen.getByText('Sem Resposta')).toBeInTheDocument()
  })

  it('shows "Correio de Voz" for voicemail', () => {
    renderModal('voicemail')
    const heading = screen.getByRole('heading', { name: 'Correio de Voz' })
    expect(heading).toBeInTheDocument()
  })

  it('shows duration title for avgDuration', () => {
    renderModal('avgDuration')
    expect(screen.getByText(/Tempo Médio/)).toBeInTheDocument()
  })

  it('shows "Contatos Prospectados" for uniqueContacts', () => {
    renderModal('uniqueContacts')
    expect(screen.getByText('Contatos Prospectados')).toBeInTheDocument()
  })
})

describe('MetricsDrilldownModal — filtering (CP-5.4)', () => {
  it('shows all activities for totalCalls', () => {
    renderModal('totalCalls')
    expect(screen.getByText('8 registros')).toBeInTheDocument()
  })

  it('filters to connected only for connected cardType', () => {
    renderModal('connected')
    expect(screen.getByText('3 registros')).toBeInTheDocument()
  })

  it('filters to no_answer only for noAnswer cardType', () => {
    renderModal('noAnswer')
    expect(screen.getByText('3 registros')).toBeInTheDocument()
  })

  it('filters to voicemail only for voicemail cardType', () => {
    renderModal('voicemail')
    expect(screen.getByText('2 registros')).toBeInTheDocument()
  })
})

describe('MetricsDrilldownModal — avgDuration sort (CP-5.4)', () => {
  it('sorts activities by duration descending', () => {
    renderModal('avgDuration')
    const rows = screen.getAllByRole('row')
    // header + 8 data rows; first data row should have highest duration (200s -> 3:20)
    const firstDataRow = rows[1]
    expect(within(firstDataRow).getByText('3:20')).toBeInTheDocument()
  })
})

describe('MetricsDrilldownModal — uniqueContacts grouping (CP-5.4)', () => {
  it('groups by unique contact', () => {
    renderModal('uniqueContacts')
    // c1 has 2 calls, c3 has 2 calls, c2/c4/c5/c6 have 1 call each -> 6 contacts
    expect(screen.getByText('6 contatos')).toBeInTheDocument()
  })

  it('shows call count per contact', () => {
    renderModal('uniqueContacts')
    // c1 (Contato Teste) has 2 calls, c3 (Joao) has 2 calls
    const twos = screen.getAllByText('2')
    expect(twos.length).toBeGreaterThanOrEqual(2)
  })

  it('shows deal linked badge for contacts with deals', () => {
    renderModal('uniqueContacts')
    const badges = screen.getAllByText('Vinculado')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })
})

describe('MetricsDrilldownModal — expandable notes (CP-5.4)', () => {
  it('shows expandable note for activity with description', () => {
    renderModal('totalCalls')
    const noteButton = screen.getByLabelText('Expandir notas')
    expect(noteButton).toBeInTheDocument()
  })

  it('toggles expand on click', () => {
    renderModal('totalCalls')
    const noteButton = screen.getByLabelText('Expandir notas')
    fireEvent.click(noteButton)
    expect(screen.getByLabelText('Recolher notas')).toBeInTheDocument()
  })
})

describe('MetricsDrilldownModal — pagination (CP-5.4)', () => {
  it('paginates when more than 15 items', () => {
    const manyActivities = Array.from({ length: 20 }, (_, i) =>
      makeActivity({ id: `act-${i}`, contact_id: `c-${i}`, contacts: [{ name: `Contact ${i}` }] }),
    )
    renderModal('totalCalls', manyActivities)
    expect(screen.getByText('Pagina 1 de 2')).toBeInTheDocument()
  })

  it('navigates to next page', () => {
    const manyActivities = Array.from({ length: 20 }, (_, i) =>
      makeActivity({ id: `act-${i}`, contact_id: `c-${i}`, contacts: [{ name: `Contact ${i}` }] }),
    )
    renderModal('totalCalls', manyActivities)
    fireEvent.click(screen.getByLabelText('Proxima pagina'))
    expect(screen.getByText('Pagina 2 de 2')).toBeInTheDocument()
  })
})

describe('MetricsDrilldownModal — close behavior (CP-5.4)', () => {
  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <MetricsDrilldownModal
        isOpen={true}
        onClose={onClose}
        cardType="totalCalls"
        activities={mockActivities}
        profiles={mockProfiles}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on overlay click', () => {
    const onClose = vi.fn()
    render(
      <MetricsDrilldownModal
        isOpen={true}
        onClose={onClose}
        cardType="totalCalls"
        activities={mockActivities}
        profiles={mockProfiles}
      />,
    )
    // Click the overlay (first child of the dialog)
    const overlay = document.querySelector('[aria-hidden="true"]')
    if (overlay) fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on X button click', () => {
    const onClose = vi.fn()
    render(
      <MetricsDrilldownModal
        isOpen={true}
        onClose={onClose}
        cardType="totalCalls"
        activities={mockActivities}
        profiles={mockProfiles}
      />,
    )
    fireEvent.click(screen.getByLabelText('Fechar modal'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <MetricsDrilldownModal
        isOpen={false}
        onClose={vi.fn()}
        cardType="totalCalls"
        activities={mockActivities}
        profiles={mockProfiles}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})

describe('MetricsDrilldownModal — deal column (CP-5.4)', () => {
  it('shows Vinculado badge for activity with deal_id', () => {
    renderModal('connected')
    const badges = screen.getAllByText('Vinculado')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })
})
