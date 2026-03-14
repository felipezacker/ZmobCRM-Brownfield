/* eslint-disable no-restricted-syntax */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QuickActionsPanel } from '../components/QuickActionsPanel'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'auto-activity-123' })
const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()
vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useCreateActivity: () => ({ mutateAsync: mockMutateAsync }),
  useUpdateActivity: () => ({ mutate: mockUpdateMutate }),
  useDeleteActivity: () => ({ mutate: mockDeleteMutate }),
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

vi.mock('@/features/prospecting/components/NoteTemplatesManager', () => ({
  NoteTemplatesManager: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="templates-manager-modal">
        <button onClick={onClose}>CloseManager</button>
      </div>
    ) : null,
}))

// ── Helpers ──────────────────────────────────────────────

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
  })

  describe('Rendering by outcome (AC6)', () => {
    it('shows all 3 actions for "connected" outcome', () => {
      render(<QuickActionsPanel {...defaultProps()} outcome="connected" />)
      expect(screen.getByText('Criar Negócio')).toBeInTheDocument()
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      expect(screen.getByText('Mover Stage')).toBeInTheDocument()
    })

    it('shows only "Agendar Retorno" for "no_answer" outcome', () => {
      render(<QuickActionsPanel {...defaultProps()} outcome="no_answer" />)
      expect(screen.queryByText('Criar Negócio')).not.toBeInTheDocument()
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      expect(screen.queryByText('Mover Stage')).not.toBeInTheDocument()
    })

    it('shows only "Agendar Retorno" for "voicemail" outcome', () => {
      render(<QuickActionsPanel {...defaultProps()} outcome="voicemail" />)
      expect(screen.queryByText('Criar Negócio')).not.toBeInTheDocument()
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      expect(screen.queryByText('Mover Stage')).not.toBeInTheDocument()
    })

    it('shows only "Agendar Retorno" for "busy" outcome', () => {
      render(<QuickActionsPanel {...defaultProps()} outcome="busy" />)
      expect(screen.queryByText('Criar Negócio')).not.toBeInTheDocument()
      expect(screen.getByText('Agendar Retorno')).toBeInTheDocument()
      expect(screen.queryByText('Mover Stage')).not.toBeInTheDocument()
    })
  })

  describe('Dismiss', () => {
    it('calls onDismiss when Avançar button clicked', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} />)
      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('calls onDismiss when X button clicked', () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} />)
      fireEvent.click(screen.getByLabelText('Dispensar'))
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })
  })

  describe('Schedule Return (AC3)', () => {
    it('shows datetime picker when "Agendar Retorno" clicked', () => {
      render(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Agendar Retorno'))
      expect(screen.getByDisplayValue(/T10:00$/)).toBeInTheDocument()
      expect(screen.getByText('Confirmar')).toBeInTheDocument()
    })

    it('creates activity when picker confirmed', async () => {
      render(<QuickActionsPanel {...defaultProps()} />)
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
      render(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Agendar Retorno'))
      fireEvent.click(screen.getByText('Confirmar'))
      await waitFor(() => {
        expect(screen.getByText('Retorno agendado')).toBeInTheDocument()
      })
    })
  })

  describe('Create Deal (AC2)', () => {
    it('opens CreateDealModal when clicked', () => {
      render(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Criar Negócio'))
      expect(screen.getByTestId('create-deal-modal')).toBeInTheDocument()
    })

    it('shows success after deal creation', async () => {
      render(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Criar Negócio'))
      fireEvent.click(screen.getByText('Create'))
      await waitFor(() => {
        expect(screen.getByText('Negócio criado')).toBeInTheDocument()
      })
    })
  })

  describe('Move Stage (AC4)', () => {
    it('shows stage dropdown for "connected" outcome', () => {
      render(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.getByText('Selecionar stage...')).toBeInTheDocument()
    })

    it('filters out current stage from dropdown', () => {
      render(<QuickActionsPanel {...defaultProps()} contactStage="lead" />)
      // 'lead' should be filtered out, other 3 should be present
      const options = screen.getAllByRole('option')
      const optionTexts = options.map(o => o.textContent)
      expect(optionTexts).not.toContain('LEAD')
      expect(optionTexts).toContain('MQL')
      expect(optionTexts).toContain('PROSPECT')
      expect(optionTexts).toContain('CUSTOMER')
    })
  })

  describe('Header', () => {
    it('shows "Próximos Passos" header', () => {
      render(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.getByText('Próximos Passos')).toBeInTheDocument()
    })
  })

  describe('Manage Templates (AC10)', () => {
    it('shows "Gerenciar templates" button for admin role', () => {
      mockProfile = { role: 'admin' }
      render(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.getByText('Gerenciar templates de notas')).toBeInTheDocument()
    })

    it('shows "Gerenciar templates" button for diretor role', () => {
      mockProfile = { role: 'diretor' }
      render(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.getByText('Gerenciar templates de notas')).toBeInTheDocument()
    })

    it('hides "Gerenciar templates" button for corretor role', () => {
      mockProfile = { role: 'corretor' }
      render(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.queryByText('Gerenciar templates de notas')).not.toBeInTheDocument()
    })
  })

  describe('Create Deal pre-fill (AC2)', () => {
    it('passes initialContactId to CreateDealModal', () => {
      render(<QuickActionsPanel {...defaultProps()} />)
      fireEvent.click(screen.getByText('Criar Negócio'))
      const modal = screen.getByTestId('create-deal-modal')
      expect(modal).toHaveAttribute('data-initial-contact-id', 'c-1')
    })
  })

  // ── CP-6.2: Auto-scheduling, Undo, Button ──────────────────

  describe('CP-6.2: Auto-schedule return on dismiss (AC4, AC7, AC8)', () => {
    it('auto-schedules return when connected + no action taken (AC4)', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="connected" />)

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).toHaveBeenCalledOnce()
      const call = mockMutateAsync.mock.calls[0][0]
      expect(call.activity.type).toBe('CALL')
      expect(call.activity.contactId).toBe('c-1')
      expect(call.activity.completed).toBe(false)
      expect(call.activity.metadata.source).toBe('auto_followup')
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('does NOT auto-schedule for no_answer outcome (AC7)', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="no_answer" />)

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).not.toHaveBeenCalled()
      expect(props.onDismiss).toHaveBeenCalledOnce()
    })

    it('does NOT auto-schedule for voicemail outcome (AC7)', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="voicemail" />)

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it('does NOT auto-schedule for busy outcome (AC7)', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="busy" />)

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it('uses suggestedReturnTime when available', async () => {
      const suggestedDate = new Date('2026-03-18T14:00:00')
      const props = defaultProps()
      render(
        <QuickActionsPanel
          {...props}
          outcome="connected"
          suggestedReturnTime={{ suggestedDate, suggestedDay: 'Quarta', suggestedHour: 14, connectionRate: 75 }}
        />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).toHaveBeenCalledOnce()
      const call = mockMutateAsync.mock.calls[0][0]
      expect(call.activity.date).toBe(suggestedDate.toISOString())
    })

    it('uses next business day as fallback when suggestedReturnTime is null (AC8)', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="connected" suggestedReturnTime={null} />)

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).toHaveBeenCalledOnce()
      const call = mockMutateAsync.mock.calls[0][0]
      const activityDate = new Date(call.activity.date)
      expect(activityDate.getHours()).toBe(10)
      expect(activityDate.getMinutes()).toBe(0)
      // Should not be a weekend
      expect(activityDate.getDay()).not.toBe(0) // Sunday
      expect(activityDate.getDay()).not.toBe(6) // Saturday
    })

    it('does NOT auto-schedule when return was manually scheduled', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="connected" />)

      // Schedule a return first
      fireEvent.click(screen.getByText('Agendar Retorno'))
      await act(async () => {
        fireEvent.click(screen.getByText('Confirmar'))
      })

      mockMutateAsync.mockClear()

      // Now click Avançar — should NOT auto-schedule
      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it('does NOT auto-schedule when deal was created', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="connected" />)

      // Create a deal
      fireEvent.click(screen.getByText('Criar Negócio'))
      fireEvent.click(screen.getByText('Create'))
      await waitFor(() => {
        expect(screen.getByText('Negócio criado')).toBeInTheDocument()
      })

      mockMutateAsync.mockClear()

      // Now click Avançar — should NOT auto-schedule
      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  describe('CP-6.2: Toast with undo (AC5, AC6)', () => {
    it('shows toast with undo action after auto-scheduling (AC5)', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="connected" />)

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      expect(mockToast).toHaveBeenCalledWith(
        expect.stringMatching(/Retorno agendado para/),
        'success',
        expect.objectContaining({
          duration: 5000,
          action: expect.objectContaining({ label: 'Desfazer' }),
        }),
      )
    })

    it('undo deletes the auto-created activity (AC6)', async () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} outcome="connected" />)

      await act(async () => {
        fireEvent.click(screen.getByText('Avançar →'))
      })

      // Extract the undo callback from the toast call
      const toastCall = mockToast.mock.calls.find(
        (c: unknown[]) => typeof c[2] === 'object' && c[2]?.action,
      )
      expect(toastCall).toBeTruthy()
      const undoFn = toastCall![2].action.onClick

      // Execute undo
      act(() => {
        undoFn()
      })

      expect(mockDeleteMutate).toHaveBeenCalledWith(
        'auto-activity-123',
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      )
    })
  })

  describe('CP-6.2: Button styling (AC9, AC10)', () => {
    it('renders "Avançar →" as a styled Button, not a text link (AC9)', () => {
      render(<QuickActionsPanel {...defaultProps()} />)
      const button = screen.getByText('Avançar →')
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveAttribute('aria-label', 'Avançar para o próximo lead')
    })

    it('shows "Avançar →" even after action was taken (AC10)', async () => {
      render(<QuickActionsPanel {...defaultProps()} outcome="connected" />)

      // Schedule a return
      fireEvent.click(screen.getByText('Agendar Retorno'))
      await act(async () => {
        fireEvent.click(screen.getByText('Confirmar'))
      })

      // Button should still say "Avançar →"
      expect(screen.getByText('Avançar →')).toBeInTheDocument()
    })
  })
})
