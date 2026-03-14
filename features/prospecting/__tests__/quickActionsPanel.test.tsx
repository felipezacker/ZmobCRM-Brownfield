/* eslint-disable no-restricted-syntax */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QuickActionsPanel } from '../components/QuickActionsPanel'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'auto-activity-123' })
const mockUpdateMutate = vi.fn()
vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useCreateActivity: () => ({ mutateAsync: mockMutateAsync }),
  useUpdateActivity: () => ({ mutate: mockUpdateMutate }),
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
      { id: 'mql', name: 'MQL', color: 'bg-green-500', order: 1, isDefault: false },
      { id: 'prospect', name: 'PROSPECT', color: 'bg-yellow-500', order: 2, isDefault: false },
      { id: 'customer', name: 'CUSTOMER', color: 'bg-purple-500', order: 3, isDefault: false },
    ],
  }),
}))

let mockProfile = { role: 'corretor' as string }
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: mockProfile }),
}))

vi.mock('@/features/boards/components/Modals/CreateDealModal', () => ({
  CreateDealModal: ({ isOpen, onClose, onCreated, initialContactId }: { isOpen: boolean; onClose: () => void; onCreated?: (id: string) => void; initialContactId?: string }) =>
    isOpen ? (
      <div data-testid="create-deal-modal" data-initial-contact-id={initialContactId}>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onCreated?.('deal-123')}>Create</button>
      </div>
    ) : null,
}))

vi.mock('@/features/boards/components/deal-detail/DealDetailModal', () => ({
  DealDetailModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="deal-detail-modal">DealDetail</div> : null,
}))

vi.mock('@/features/prospecting/components/NoteTemplatesManager', () => ({
  NoteTemplatesManager: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="templates-manager-modal">
        <button onClick={onClose}>CloseManager</button>
      </div>
    ) : null,
}))

vi.mock('@/features/prospecting/components/DoNotContactModal', () => ({
  DoNotContactModal: () => null,
}))

// CP-7.3: Mock deal fetch and board stages
const mockGetOpenDealsByContact = vi.fn().mockResolvedValue(null)
vi.mock('@/lib/supabase/deals', () => ({
  getOpenDealsByContact: (...args: unknown[]) => mockGetOpenDealsByContact(...args),
  dealsService: { update: vi.fn().mockResolvedValue({ error: null }) },
}))

vi.mock('@/features/prospecting/hooks/useBoards', () => ({
  useBoards: () => ({
    boards: [
      { id: 'board-1', name: 'Vendas', stages: [
        { id: 'stage-a', name: 'Novo' },
        { id: 'stage-b', name: 'Proposta' },
      ]},
    ],
    isLoading: false,
  }),
}))

// ── Helpers ──────────────────────────────────────────────

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const defaultProps = () => ({
  contactId: 'c-1',
  contactName: 'Maria Silva',
  contactPhone: '11999990000',
  contactStage: 'lead',
  outcome: 'connected' as const,
  callNotes: 'Test notes',
  onDismiss: vi.fn(),
})

// ── Tests ──────────────────────────────────────────────

describe('QuickActionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfile = { role: 'corretor' }
    mockGetOpenDealsByContact.mockResolvedValue(null)
  })

  describe('Rendering by outcome (AC6)', () => {
    it('shows create deal + agendar retorno for "connected" without deal', async () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="connected" />)
      await waitFor(() => { expect(screen.getByText('+ Criar Deal')).toBeInTheDocument() })
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      // Mover Etapa only shows when deal exists
      expect(screen.queryByText('Mover Etapa')).not.toBeInTheDocument()
    })

    it('shows only "Agendar Retorno" for "no_answer" outcome', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="no_answer" />)
      expect(screen.queryByText('+ Criar Deal')).not.toBeInTheDocument()
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      expect(screen.queryByText('Mover Etapa')).not.toBeInTheDocument()
    })

    it('shows only "Agendar Retorno" for "voicemail" outcome', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="voicemail" />)
      expect(screen.queryByText('+ Criar Deal')).not.toBeInTheDocument()
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      expect(screen.queryByText('Mover Etapa')).not.toBeInTheDocument()
    })

    it('shows only "Agendar Retorno" for "busy" outcome', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="busy" />)
      expect(screen.queryByText('+ Criar Deal')).not.toBeInTheDocument()
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      expect(screen.queryByText('Mover Etapa')).not.toBeInTheDocument()
    })
  })

  describe('Dismiss', () => {
    it('calls onDismiss when Avançar button clicked (non-connected outcome)', () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="no_answer" />)
      fireEvent.click(screen.getByText('Avançar →'))
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('calls onDismiss when X button clicked', () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} />)
      fireEvent.click(screen.getByLabelText('Dispensar'))
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })
  })

  describe('Schedule Return (AC3)', () => {
    it('shows datetime picker when "Agendar Retorno" clicked', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Agendar Retorno'))
      expect(screen.getByDisplayValue(/T10:00$/)).toBeInTheDocument()
      expect(screen.getByText('Confirmar')).toBeInTheDocument()
    })

    it('creates activity when picker confirmed', async () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Agendar Retorno'))
      fireEvent.click(screen.getByText('Confirmar'))
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledOnce()
      })
      const call = mockMutateAsync.mock.calls[0][0]
      expect(call.activity.type).toBe('CALL')
      expect(call.activity.contactId).toBe('c-1')
      expect(call.activity.completed).toBe(false)
    })

    it('shows success state after scheduling', async () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Agendar Retorno'))
      fireEvent.click(screen.getByText('Confirmar'))
      await waitFor(() => {
        expect(screen.getByText('Retorno agendado')).toBeInTheDocument()
      })
    })
  })

  describe('Create Deal (AC2)', () => {
    it('opens CreateDealModal when clicked', async () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      await waitFor(() => { expect(screen.getByText('+ Criar Deal')).toBeInTheDocument() })
      fireEvent.click(screen.getByText('+ Criar Deal'))
      expect(screen.getByTestId('create-deal-modal')).toBeInTheDocument()
    })

    it('shows success after deal creation', async () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      await waitFor(() => { expect(screen.getByText('+ Criar Deal')).toBeInTheDocument() })
      fireEvent.click(screen.getByText('+ Criar Deal'))
      fireEvent.click(screen.getByText('Create'))
      await waitFor(() => {
        expect(screen.getByText('Negócio criado')).toBeInTheDocument()
      })
    })
  })

  describe('Move Etapa (AC4) — requires deal', () => {
    const dealMock = {
      id: 'deal-1', title: 'Test Deal', value: 100000,
      property_ref: null, product_name: null,
      stage_id: 'stage-a', stage_name: 'Novo', board_id: 'board-1',
    }

    it('shows pipeline + stage dropdowns for "connected" with deal', async () => {
      mockGetOpenDealsByContact.mockResolvedValue(dealMock)
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      await waitFor(() => { expect(screen.getByText('Mover Etapa')).toBeInTheDocument() })
      expect(screen.getByLabelText('Selecionar pipeline')).toBeInTheDocument()
      expect(screen.getByLabelText('Selecionar etapa')).toBeInTheDocument()
    })

    it('hides "Mover Etapa" when no deal', async () => {
      mockGetOpenDealsByContact.mockResolvedValue(null)
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      await waitFor(() => { expect(screen.getByText('+ Criar Deal')).toBeInTheDocument() })
      expect(screen.queryByText('Mover Etapa')).not.toBeInTheDocument()
    })
  })

  describe('Header', () => {
    it('shows "Próximos Passos" header', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.getByText('Próximos Passos')).toBeInTheDocument()
    })
  })

  describe('Manage Templates (AC10)', () => {
    it('shows "Gerenciar templates" button for admin role', () => {
      mockProfile = { role: 'admin' }
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.getByText('Gerenciar templates de notas')).toBeInTheDocument()
    })

    it('shows "Gerenciar templates" button for diretor role', () => {
      mockProfile = { role: 'diretor' }
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.getByText('Gerenciar templates de notas')).toBeInTheDocument()
    })

    it('hides "Gerenciar templates" button for corretor role', () => {
      mockProfile = { role: 'corretor' }
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.queryByText('Gerenciar templates de notas')).not.toBeInTheDocument()
    })
  })

  describe('Create Deal pre-fill (AC2)', () => {
    it('passes initialContactId to CreateDealModal', async () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      await waitFor(() => { expect(screen.getByText('+ Criar Deal')).toBeInTheDocument() })
      fireEvent.click(screen.getByText('+ Criar Deal'))
      const modal = screen.getByTestId('create-deal-modal')
      expect(modal).toHaveAttribute('data-initial-contact-id', 'c-1')
    })
  })

  // ── CP-6.2: Follow-up confirmation, scheduling, Button ──────────────────

  describe('CP-6.2: Follow-up confirmation prompt (AC4, AC7)', () => {
    it('shows confirmation prompt when connected + no action taken (AC4)', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="connected" />)

      fireEvent.click(screen.getByText('Avançar →'))

      expect(screen.getByText(/Nenhuma ação registrada/)).toBeInTheDocument()
      expect(screen.getByText('Sim, agendar')).toBeInTheDocument()
      expect(screen.getByText('Não, avançar')).toBeInTheDocument()
    })

    it('schedules return when user confirms "Sim, agendar"', async () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="connected" />)

      fireEvent.click(screen.getByText('Avançar →'))
      await act(async () => {
        fireEvent.click(screen.getByText('Sim, agendar'))
      })

      expect(mockMutateAsync).toHaveBeenCalledOnce()
      const call = mockMutateAsync.mock.calls[0][0]
      expect(call.activity.type).toBe('CALL')
      expect(call.activity.contactId).toBe('c-1')
      expect(call.activity.metadata.source).toBe('auto_followup')
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('dismisses without scheduling when user clicks "Não, avançar"', () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="connected" />)

      fireEvent.click(screen.getByText('Avançar →'))
      fireEvent.click(screen.getByText('Não, avançar'))

      expect(mockMutateAsync).not.toHaveBeenCalled()
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('does NOT show prompt for no_answer outcome (AC7)', () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="no_answer" />)

      fireEvent.click(screen.getByText('Avançar →'))

      expect(screen.queryByText(/Nenhuma ação registrada/)).not.toBeInTheDocument()
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('does NOT show prompt for voicemail outcome (AC7)', () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="voicemail" />)

      fireEvent.click(screen.getByText('Avançar →'))

      expect(screen.queryByText(/Nenhuma ação registrada/)).not.toBeInTheDocument()
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('does NOT show prompt for busy outcome (AC7)', () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="busy" />)

      fireEvent.click(screen.getByText('Avançar →'))

      expect(screen.queryByText(/Nenhuma ação registrada/)).not.toBeInTheDocument()
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })
  })

  describe('CP-6.2: Scheduling with fallback (AC8)', () => {
    it('uses suggestedReturnTime when available', async () => {
      const suggestedDate = new Date('2026-03-18T14:00:00')
      const props = defaultProps()
      renderWithQuery(
        <QuickActionsPanel
          {...props}
          outcome="connected"
          suggestedReturnTime={{ suggestedDate, suggestedDay: 'Quarta', suggestedHour: 14, connectionRate: 75 }}
        />,
      )

      fireEvent.click(screen.getByText('Avançar →'))
      await act(async () => {
        fireEvent.click(screen.getByText('Sim, agendar'))
      })

      expect(mockMutateAsync).toHaveBeenCalledOnce()
      const call = mockMutateAsync.mock.calls[0][0]
      expect(call.activity.date).toBe(suggestedDate.toISOString())
    })

    it('uses next business day as fallback when suggestedReturnTime is null (AC8)', async () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="connected" suggestedReturnTime={null} />)

      fireEvent.click(screen.getByText('Avançar →'))
      await act(async () => {
        fireEvent.click(screen.getByText('Sim, agendar'))
      })

      expect(mockMutateAsync).toHaveBeenCalledOnce()
      const call = mockMutateAsync.mock.calls[0][0]
      const activityDate = new Date(call.activity.date)
      expect(activityDate.getHours()).toBe(10)
      expect(activityDate.getMinutes()).toBe(0)
      expect(activityDate.getDay()).not.toBe(0)
      expect(activityDate.getDay()).not.toBe(6)
    })

    it('does NOT show prompt when return was manually scheduled', async () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="connected" />)

      fireEvent.click(screen.getByText('Agendar Retorno'))
      await act(async () => {
        fireEvent.click(screen.getByText('Confirmar'))
      })

      mockMutateAsync.mockClear()
      fireEvent.click(screen.getByText('Avançar →'))

      expect(screen.queryByText(/Nenhuma ação registrada/)).not.toBeInTheDocument()
      expect(props.onDismiss).toHaveBeenCalled()
    })

    it('does NOT show prompt when deal was created', async () => {
      const props = defaultProps()
      renderWithQuery(<QuickActionsPanel {...props} outcome="connected" />)

      await waitFor(() => { expect(screen.getByText('+ Criar Deal')).toBeInTheDocument() })
      fireEvent.click(screen.getByText('+ Criar Deal'))
      fireEvent.click(screen.getByText('Create'))
      await waitFor(() => {
        expect(screen.getByText('Negócio criado')).toBeInTheDocument()
      })

      mockMutateAsync.mockClear()
      fireEvent.click(screen.getByText('Avançar →'))

      expect(screen.queryByText(/Nenhuma ação registrada/)).not.toBeInTheDocument()
    })
  })

  describe('CP-6.2: Button styling (AC9, AC10)', () => {
    it('renders "Avançar →" as a green styled Button (AC9)', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      const button = screen.getByText('Avançar →')
      expect(button.tagName).toBe('BUTTON')
      expect(button.className).toContain('bg-green-600')
    })

    it('shows "Avançar →" even after action was taken (AC10)', async () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="connected" />)

      fireEvent.click(screen.getByText('Agendar Retorno'))
      await act(async () => {
        fireEvent.click(screen.getByText('Confirmar'))
      })

      expect(screen.getByText('Avançar →')).toBeInTheDocument()
    })
  })
})
