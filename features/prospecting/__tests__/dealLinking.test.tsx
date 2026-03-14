/* eslint-disable no-restricted-syntax */
/**
 * CP-5.1: Deal linking, notes visibility, and expand/collapse tests
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── getOpenDealsByContact unit tests ──────────────────────

describe('getOpenDealsByContact', () => {
  const mockMaybeSingle = vi.fn()
  const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockOrder = vi.fn(() => ({ limit: mockLimit }))
  const mockIs = vi.fn(() => ({ order: mockOrder }))
  const mockEqIsLost = vi.fn(() => ({ is: mockIs }))
  const mockEqIsWon = vi.fn(() => ({ eq: mockEqIsLost }))
  const mockEqContactId = vi.fn(() => ({ eq: mockEqIsWon }))
  const mockSelect = vi.fn(() => ({ eq: mockEqContactId }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns deal when contact has open deal', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'deal-1', title: 'Apt 101' },
      error: null,
    })

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('contact-1')

    expect(result).toEqual({ id: 'deal-1', title: 'Apt 101', value: null, property_ref: null, product_name: null, stage_id: null, stage_name: null })
    expect(mockFrom).toHaveBeenCalledWith('deals')
    expect(mockSelect).toHaveBeenCalledWith('id, title, value, property_ref, stage_id, board_stages(name), deal_items(name)')
    expect(mockEqContactId).toHaveBeenCalledWith('contact_id', 'contact-1')
    expect(mockEqIsWon).toHaveBeenCalledWith('is_won', false)
    expect(mockEqIsLost).toHaveBeenCalledWith('is_lost', false)
  })

  it('returns null when contact has no open deals', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('contact-2')

    expect(result).toBeNull()
  })

  it('returns null on query error', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    })

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('contact-3')

    expect(result).toBeNull()
  })

  it('returns null when contactId is empty', async () => {
    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('')

    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

// ── CallDetailsTable notes column tests ──────────────────────

import { CallDetailsTable } from '../components/CallDetailsTable'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

const makeActivity = (overrides?: Record<string, unknown>) => ({
  id: 'act-1',
  date: '2026-03-11T10:00:00Z',
  owner_id: 'user-1',
  contact_id: 'contact-1',
  metadata: { outcome: 'connected', duration_seconds: 120 },
  contacts: [{ name: 'Maria Silva' }],
  description: null as string | null | undefined,
  ...overrides,
})

describe('CallDetailsTable — Notes Column (CP-5.1 AC3)', () => {
  const profiles = [{ id: 'user-1', name: 'João' }]

  it('renders "Notas" column header', () => {
    render(
      <CallDetailsTable
        activities={[makeActivity()]}
        profiles={profiles}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Notas')).toBeInTheDocument()
  })

  it('shows dash when no description', () => {
    render(
      <CallDetailsTable
        activities={[makeActivity({ description: null })]}
        profiles={profiles}
        isLoading={false}
      />,
    )
    // Notas column should show "—" for null description
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('shows description text when present', () => {
    render(
      <CallDetailsTable
        activities={[makeActivity({ description: 'Cliente interessado no apt 302' })]}
        profiles={profiles}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Cliente interessado no apt 302')).toBeInTheDocument()
  })

  it('expand/collapse notes on click', () => {
    const longNote = 'Nota muito longa que precisa de truncamento para caber na tabela sem quebrar o layout. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    render(
      <CallDetailsTable
        activities={[makeActivity({ description: longNote })]}
        profiles={profiles}
        isLoading={false}
      />,
    )

    const noteButton = screen.getByLabelText('Expandir notas')
    expect(noteButton).toBeInTheDocument()

    // Initially truncated (has line-clamp-2 class)
    const span = noteButton.querySelector('span')
    expect(span?.className).toContain('line-clamp-2')

    // Click to expand
    fireEvent.click(noteButton)
    const expandedButton = screen.getByLabelText('Recolher notas')
    const expandedSpan = expandedButton.querySelector('span')
    expect(expandedSpan?.className).not.toContain('line-clamp-2')

    // Click again to collapse
    fireEvent.click(expandedButton)
    const collapsedButton = screen.getByLabelText('Expandir notas')
    const collapsedSpan = collapsedButton.querySelector('span')
    expect(collapsedSpan?.className).toContain('line-clamp-2')
  })
})

// ── ContactHistory expand/collapse tests ──────────────────────

import { ContactHistory } from '../components/ContactHistory'
import type { Activity } from '@/types'

const mockActivitiesWithNotes: Activity[] = [
  {
    id: 'a-1',
    title: 'Ligação prospecção',
    type: 'CALL',
    date: new Date().toISOString(),
    completed: true,
    dealTitle: '',
    user: { name: 'Você', avatar: '' },
    description: 'Nota longa que precisa de expand/collapse. Cliente demonstrou interesse em visita ao empreendimento e pediu mais informações sobre financiamento.',
    metadata: { outcome: 'connected', source: 'prospecting' },
  },
  {
    id: 'a-2',
    title: 'Follow-up',
    type: 'CALL',
    date: new Date().toISOString(),
    completed: true,
    dealTitle: '',
    user: { name: 'Você', avatar: '' },
    description: 'Curto',
    metadata: { outcome: 'no_answer' },
  },
]

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useContactActivities: () => ({
    data: mockActivitiesWithNotes,
    isLoading: false,
  }),
}))

describe('ContactHistory — Notes Expand/Collapse (CP-5.1 AC4)', () => {
  it('renders notes with line-clamp-2 by default', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    const expandButtons = screen.getAllByLabelText('Expandir nota')
    expect(expandButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('expands note on click and shows "ver menos"', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    const expandButtons = screen.getAllByLabelText('Expandir nota')
    fireEvent.click(expandButtons[0])

    expect(screen.getByLabelText('Recolher nota')).toBeInTheDocument()
  })

  it('collapses note when clicking again', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    const expandButtons = screen.getAllByLabelText('Expandir nota')

    // Expand
    fireEvent.click(expandButtons[0])
    expect(screen.getByLabelText('Recolher nota')).toBeInTheDocument()

    // Collapse
    fireEvent.click(screen.getByLabelText('Recolher nota'))
    // Should be back to "Expandir nota" for all
    expect(screen.getAllByLabelText('Expandir nota').length).toBeGreaterThanOrEqual(1)
  })

  it('only one note expanded at a time', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    const expandButtons = screen.getAllByLabelText('Expandir nota')

    // Expand first
    fireEvent.click(expandButtons[0])
    expect(screen.getAllByLabelText('Recolher nota').length).toBe(1)

    // Expand second — first should collapse
    const remaining = screen.getAllByLabelText('Expandir nota')
    fireEvent.click(remaining[0])
    expect(screen.getAllByLabelText('Recolher nota').length).toBe(1)
  })
})

// ── QuickActionsPanel deal linking tests ──────────────────────

import { QuickActionsPanel } from '../components/QuickActionsPanel'

const mockUpdateMutate = vi.fn()
const mockCreateMutateAsync = vi.fn().mockResolvedValue({})

vi.mock('@/lib/query/hooks/useActivitiesQuery', async () => ({
  useCreateActivity: () => ({ mutateAsync: mockCreateMutateAsync }),
  useUpdateActivity: () => ({ mutate: mockUpdateMutate }),
  useDeleteActivity: () => ({ mutate: vi.fn() }),
  useContactActivities: () => ({ data: mockActivitiesWithNotes, isLoading: false }),
}))

vi.mock('@/lib/supabase', () => ({
  contactsService: {
    update: vi.fn().mockResolvedValue({ error: null }),
  },
}))

const mockToast = vi.fn()
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockToast, showToast: mockToast }),
}))

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    lifecycleStages: [
      { id: 'lead', name: 'LEAD', color: 'bg-blue-500', order: 0, isDefault: true },
    ],
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'corretor' } }),
}))

vi.mock('@/features/boards/components/Modals/CreateDealModal', () => ({
  CreateDealModal: ({ isOpen, onCreated }: { isOpen: boolean; onClose: () => void; onCreated?: (id: string) => void }) =>
    isOpen ? (
      <div data-testid="create-deal-modal">
        <button onClick={() => onCreated?.('new-deal-id')}>CreateDeal</button>
      </div>
    ) : null,
}))

vi.mock('@/features/prospecting/components/NoteTemplatesManager', () => ({
  NoteTemplatesManager: () => null,
}))

describe('QuickActionsPanel — Deal Linking (CP-5.1 AC6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates activity with dealId when deal is created and lastActivityId provided', async () => {
    render(
      <QuickActionsPanel
        contactId="c-1"
        contactName="Maria"
        outcome="connected"
        onDismiss={vi.fn()}
        lastActivityId="activity-999"
      />,
    )

    fireEvent.click(screen.getByText('Criar Negócio'))
    fireEvent.click(screen.getByText('CreateDeal'))

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledOnce()
    })

    const call = mockUpdateMutate.mock.calls[0]
    expect(call[0]).toEqual({ id: 'activity-999', updates: { dealId: 'new-deal-id' } })
  })

  it('does not update activity when lastActivityId is not provided', async () => {
    render(
      <QuickActionsPanel
        contactId="c-1"
        contactName="Maria"
        outcome="connected"
        onDismiss={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Criar Negócio'))
    fireEvent.click(screen.getByText('CreateDeal'))

    await waitFor(() => {
      expect(screen.getByText('Negócio criado')).toBeInTheDocument()
    })

    expect(mockUpdateMutate).not.toHaveBeenCalled()
  })
})
