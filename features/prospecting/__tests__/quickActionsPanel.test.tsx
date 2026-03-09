/* eslint-disable no-restricted-syntax */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuickActionsPanel } from '../components/QuickActionsPanel'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

const mockMutateAsync = vi.fn().mockResolvedValue({})
vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useCreateActivity: () => ({ mutateAsync: mockMutateAsync }),
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

  describe('Dismiss (AC5)', () => {
    it('calls onDismiss when dismiss button clicked', () => {
      const props = defaultProps()
      render(<QuickActionsPanel {...props} />)
      fireEvent.click(screen.getByText('Pular e avançar →'))
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
})
