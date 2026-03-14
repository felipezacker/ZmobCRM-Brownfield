/* eslint-disable no-restricted-syntax */
/**
 * CP-7.3: Deal QuickActionsPanel tests
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Mocks ──────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/features/boards/components/Modals/CreateDealModal', () => ({
  CreateDealModal: ({ isOpen, onCreated }: { isOpen: boolean; onCreated: (id: string) => void }) =>
    isOpen ? <div data-testid="create-deal-modal"><button onClick={() => onCreated('new-deal-1')}>Criar</button></div> : null,
}))

vi.mock('@/features/prospecting/components/DoNotContactModal', () => ({
  DoNotContactModal: () => null,
}))

vi.mock('@/features/prospecting/components/NoteTemplatesManager', () => ({
  NoteTemplatesManager: () => null,
}))

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useCreateActivity: () => ({ mutateAsync: vi.fn() }),
  useUpdateActivity: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/lib/supabase', () => ({
  contactsService: { update: vi.fn().mockResolvedValue({ error: null }) },
}))

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({ lifecycleStages: [] }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'corretor' } }),
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn(), showToast: vi.fn() }),
}))

const mockGetOpenDealsByContact = vi.fn()
const mockDealsServiceUpdate = vi.fn()

vi.mock('@/lib/supabase/deals', () => ({
  getOpenDealsByContact: (...args: unknown[]) => mockGetOpenDealsByContact(...args),
  dealsService: { update: (...args: unknown[]) => mockDealsServiceUpdate(...args) },
}))

vi.mock('@/features/prospecting/hooks/useBoardStages', () => ({
  useBoardStages: () => ({
    stages: [
      { id: 'stage-1', name: 'Novo', position: 0 },
      { id: 'stage-2', name: 'Qualificação', position: 1 },
      { id: 'stage-3', name: 'Proposta', position: 2 },
    ],
    isLoading: false,
  }),
}))

import { QuickActionsPanel } from '../components/QuickActionsPanel'

const defaultProps = {
  contactId: 'contact-1',
  contactName: 'João Silva',
  outcome: 'connected' as const,
  onDismiss: vi.fn(),
}

describe('QuickActionsPanel — Deal Block (CP-7.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while deal is loading (AC10)', () => {
    mockGetOpenDealsByContact.mockReturnValue(new Promise(() => {}))
    render(<QuickActionsPanel {...defaultProps} />)
    expect(screen.getByText('Próximos Passos')).toBeInTheDocument()
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('shows "Nenhum deal vinculado" with create button when no deal (AC1)', async () => {
    mockGetOpenDealsByContact.mockResolvedValue(null)
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('+ Criar Deal')).toBeInTheDocument()
    })
    expect(screen.getByText('Nenhum deal vinculado')).toBeInTheDocument()
  })

  it('shows deal card with title, value BRL, and stage when deal exists (AC2)', async () => {
    mockGetOpenDealsByContact.mockResolvedValue({
      id: 'deal-1',
      title: 'Apartamento Centro',
      value: 450000,
      property_ref: 'REF-001',
      product_name: 'Apt 3 quartos',
      stage_id: 'stage-1',
      stage_name: 'Novo',
      board_id: 'board-1',
    })
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro')).toBeInTheDocument()
    })
    expect(screen.getByText('R$ 450.000,00')).toBeInTheDocument()
    expect(screen.getByText('Apt 3 quartos')).toBeInTheDocument()
    // Stage name in the card — "Novo" matches stage-1 which is current
    const allNovo = screen.getAllByText('Novo')
    expect(allNovo.length).toBeGreaterThanOrEqual(1)
  })

  it('opens CreateDealModal when create button is clicked (AC1)', async () => {
    mockGetOpenDealsByContact.mockResolvedValue(null)
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('+ Criar Deal')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('+ Criar Deal'))
    expect(screen.getByTestId('create-deal-modal')).toBeInTheDocument()
  })

  it('shows edit inputs when edit button is clicked (AC3)', async () => {
    mockGetOpenDealsByContact.mockResolvedValue({
      id: 'deal-1',
      title: 'Apartamento Centro',
      value: 450000,
      property_ref: null,
      product_name: null,
      stage_id: 'stage-1',
      stage_name: 'Qualificação',
      board_id: 'board-1',
    })
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByLabelText('Editar deal'))
    expect(screen.getByDisplayValue('Apartamento Centro')).toBeInTheDocument()
    expect(screen.getByDisplayValue('450000')).toBeInTheDocument()
    expect(screen.getByText('Salvar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('saves edited title and value via dealsService.update (AC8)', async () => {
    mockGetOpenDealsByContact.mockResolvedValue({
      id: 'deal-1',
      title: 'Apartamento Centro',
      value: 450000,
      property_ref: null,
      product_name: null,
      stage_id: 'stage-1',
      stage_name: 'Novo',
      board_id: 'board-1',
    })
    mockDealsServiceUpdate.mockResolvedValue({ error: null })
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar deal'))
    const titleInput = screen.getByDisplayValue('Apartamento Centro')
    const valueInput = screen.getByDisplayValue('450000')
    fireEvent.change(titleInput, { target: { value: 'Cobertura Leblon' } })
    fireEvent.change(valueInput, { target: { value: '850000' } })
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(mockDealsServiceUpdate).toHaveBeenCalledWith('deal-1', {
        title: 'Cobertura Leblon',
        value: 850000,
      })
    })
    // Card should update optimistically
    await waitFor(() => {
      expect(screen.getByText('Cobertura Leblon')).toBeInTheDocument()
    })
  })

  it('populates stage dropdown from boardStages (AC4)', async () => {
    mockGetOpenDealsByContact.mockResolvedValue({
      id: 'deal-1',
      title: 'Deal Test',
      value: 100000,
      property_ref: null,
      product_name: null,
      stage_id: 'stage-1',
      stage_name: 'Novo',
      board_id: 'board-1',
    })
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Deal Test')).toBeInTheDocument()
    })
    const dropdown = screen.getByLabelText('Selecionar stage do deal')
    expect(dropdown).toBeInTheDocument()
    // stage-1 (Novo) is current, so only Qualificação and Proposta should be options
    expect(screen.getByText('Qualificação')).toBeInTheDocument()
    expect(screen.getByText('Proposta')).toBeInTheDocument()
  })

  it('moves deal stage via dealsService.update (AC4, AC9)', async () => {
    mockGetOpenDealsByContact.mockResolvedValue({
      id: 'deal-1',
      title: 'Deal Test',
      value: 100000,
      property_ref: null,
      product_name: null,
      stage_id: 'stage-1',
      stage_name: 'Novo',
      board_id: 'board-1',
    })
    mockDealsServiceUpdate.mockResolvedValue({ error: null })
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Deal Test')).toBeInTheDocument()
    })

    const dropdown = screen.getByLabelText('Selecionar stage do deal')
    fireEvent.change(dropdown, { target: { value: 'stage-2' } })

    const moveButton = screen.getByText('Mover')
    fireEvent.click(moveButton)

    await waitFor(() => {
      expect(mockDealsServiceUpdate).toHaveBeenCalledWith('deal-1', { status: 'stage-2' })
    })
  })

  it('gracefully degrades when deal fetch fails (AC11)', async () => {
    mockGetOpenDealsByContact.mockRejectedValue(new Error('Network error'))
    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
    })
    // Deal block should not be visible on error
    expect(screen.queryByText('+ Criar Deal')).not.toBeInTheDocument()
    expect(screen.queryByText('Nenhum deal vinculado')).not.toBeInTheDocument()
  })

  it('refetches deal after creating via CreateDealModal (AC7)', async () => {
    // First call: no deal. Second call (after create): deal exists
    mockGetOpenDealsByContact
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'new-deal-1',
        title: 'Novo Deal',
        value: 200000,
        property_ref: null,
        product_name: null,
        stage_id: 'stage-1',
        stage_name: 'Novo',
        board_id: 'board-1',
      })

    render(<QuickActionsPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('+ Criar Deal')).toBeInTheDocument()
    })

    // Open modal and create deal
    fireEvent.click(screen.getByText('+ Criar Deal'))
    fireEvent.click(screen.getByText('Criar'))

    // Should refetch and show the new deal
    await waitFor(() => {
      expect(mockGetOpenDealsByContact).toHaveBeenCalledTimes(2)
    })
  })
})
