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

vi.mock('@/features/boards/components/deal-detail/DealDetailModal', () => ({
  DealDetailModal: ({ isOpen, dealId }: { isOpen: boolean; dealId: string }) =>
    isOpen ? <div data-testid="deal-detail-modal" data-deal-id={dealId}>DealDetail</div> : null,
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

vi.mock('@/features/prospecting/hooks/useBoards', () => ({
  useBoards: () => ({
    boards: [
      { id: 'board-1', name: 'Vendas', stages: [
        { id: 'stage-1', name: 'Novo' },
        { id: 'stage-2', name: 'Qualificação' },
        { id: 'stage-3', name: 'Proposta' },
      ]},
      { id: 'board-2', name: 'Pós-Venda', stages: [
        { id: 'stage-4', name: 'Onboarding' },
        { id: 'stage-5', name: 'Ativo' },
      ]},
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

  it('opens DealDetailModal when edit button is clicked (AC3)', async () => {
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
    expect(screen.getByTestId('deal-detail-modal')).toBeInTheDocument()
    expect(screen.getByTestId('deal-detail-modal').getAttribute('data-deal-id')).toBe('deal-1')
  })

  it('shows pipeline dropdown and stage dropdown when deal exists (AC4)', async () => {
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
    expect(screen.getByText('Mover Etapa')).toBeInTheDocument()
    // Pipeline dropdown pre-selected with board-1
    const pipelineDropdown = screen.getByLabelText('Selecionar pipeline')
    expect(pipelineDropdown).toBeInTheDocument()
    // Stage dropdown should show after pipeline is selected (pre-selected)
    const stageDropdown = screen.getByLabelText('Selecionar etapa')
    expect(stageDropdown).toBeInTheDocument()
    // Current stage (stage-1/Novo) should be filtered out in same board
    expect(screen.getByText('Qualificação')).toBeInTheDocument()
    expect(screen.getByText('Proposta')).toBeInTheDocument()
  })

  it('moves deal to selected pipeline + stage (AC4, AC9)', async () => {
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

    // Select a different pipeline
    const pipelineDropdown = screen.getByLabelText('Selecionar pipeline')
    fireEvent.change(pipelineDropdown, { target: { value: 'board-2' } })

    // Select stage in new pipeline
    const stageDropdown = screen.getByLabelText('Selecionar etapa')
    fireEvent.change(stageDropdown, { target: { value: 'stage-4' } })

    fireEvent.click(screen.getByText('Mover'))

    await waitFor(() => {
      expect(mockDealsServiceUpdate).toHaveBeenCalledWith('deal-1', { status: 'stage-4', boardId: 'board-2' })
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
