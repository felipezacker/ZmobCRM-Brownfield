import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SessionSummary } from '../components/SessionSummary'
import type { SessionStats, SessionContact } from '../hooks/useProspectingPageState'

// --- Mocks ---

vi.mock('@/components/ui/button', () => {
  const { forwardRef } = require('react')
  const Btn = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }>(
    ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>, ref: React.Ref<HTMLButtonElement>) => (
      React.createElement('button', { ref, ...props }, children)
    ),
  )
  Btn.displayName = 'MockButton'
  return { Button: Btn }
})

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
}))

vi.mock('@/features/boards/components/Modals/CreateDealModal', () => ({
  CreateDealModal: ({ isOpen, initialContactId }: { isOpen: boolean; initialContactId?: string }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'create-deal-modal', 'data-contact': initialContactId }) : null,
}))

vi.mock('@/features/prospecting/components/DoNotContactModal', () => ({
  DoNotContactModal: ({ isOpen, contactId }: { isOpen: boolean; contactId: string }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'do-not-contact-modal', 'data-contact': contactId }) : null,
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn(), showToast: vi.fn() }),
}))

// Supabase mock data — routed by table name
let dealsData: unknown[] | null = null
let scheduledReturnData: unknown[] | null = null
let attemptCountData: unknown[] | null = null
let activitiesCallIndex = 0

function createThenableChain(resolvedData: unknown[] | null) {
  const terminal = { data: resolvedData, error: null }
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'in', 'eq', 'is', 'gte', 'lte', 'order']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // order() resolves (terminal for returns query)
  chain['order'] = vi.fn().mockResolvedValue(terminal)
  // Also make chain thenable for queries without order()
  ;(chain as { then: unknown }).then = (resolve: (v: unknown) => void) => {
    resolve(terminal)
    return Promise.resolve(terminal)
  }
  return chain
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'deals') {
        return createThenableChain(dealsData)
      }
      // activities table — first call is returns, second is attempts
      const idx = activitiesCallIndex++
      if (idx === 0) {
        return createThenableChain(scheduledReturnData)
      }
      return createThenableChain(attemptCountData)
    }),
  },
}))

// --- Helpers ---

const defaultStats: SessionStats = {
  total: 10,
  completed: 8,
  skipped: 2,
  connected: 3,
  noAnswer: 3,
  voicemail: 1,
  busy: 1,
}

const defaultProps = {
  stats: defaultStats,
  startTime: new Date(Date.now() - 600000),
  onClose: vi.fn(),
}

function setupMocks(options: {
  dealResults?: Array<{ contact_id: string }> | null
  returnData?: Array<{ contact_id: string; date: string }> | null
  attemptData?: Array<{ contact_id: string }> | null
} = {}) {
  const { dealResults = null, returnData = null, attemptData = null } = options

  activitiesCallIndex = 0
  dealsData = dealResults
  scheduledReturnData = returnData
  attemptCountData = attemptData
}

// --- Tests ---

describe('SessionSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activitiesCallIndex = 0
    dealsData = null
    scheduledReturnData = null
    attemptCountData = null
  })

  it('renders stats grid without actionable blocks when no sessionContacts', () => {
    render(<SessionSummary {...defaultProps} />)
    expect(screen.getByText('Sessão Encerrada')).toBeInTheDocument()
    expect(screen.getByText('Total de ligações')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Conectadas')).toBeInTheDocument()
    // connected=3 and noAnswer=3, so '3' appears twice
    expect(screen.getAllByText('3')).toHaveLength(2)
    expect(screen.getByText('Voltar à Fila')).toBeInTheDocument()
  })

  it('renders existing stats correctly (no regression)', () => {
    render(<SessionSummary {...defaultProps} />)
    expect(screen.getByText('Não atendeu')).toBeInTheDocument()
    expect(screen.getByText('Correio de voz')).toBeInTheDocument()
    expect(screen.getByText('Ocupado')).toBeInTheDocument()
    expect(screen.getByText('Puladas')).toBeInTheDocument()
    expect(screen.getByText('Tempo total')).toBeInTheDocument()
  })

  describe('Block: Atenderam sem deal', () => {
    const connectedContacts: SessionContact[] = [
      { contactId: 'c1', contactName: 'Maria Silva', contactPhone: '11999001122', outcome: 'connected' },
      { contactId: 'c2', contactName: 'Joao Santos', contactPhone: '11988112233', outcome: 'connected' },
      { contactId: 'c3', contactName: 'Pedro Lima', contactPhone: '11977223344', outcome: 'no_answer' },
    ]

    it('shows connected contacts without deal', async () => {
      setupMocks({
        dealResults: [],
        returnData: [],
        attemptData: [],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={connectedContacts} />)

      await waitFor(() => {
        expect(screen.getByText('Atenderam sem deal')).toBeInTheDocument()
      })
      expect(screen.getByText('Maria Silva')).toBeInTheDocument()
      expect(screen.getByText('Joao Santos')).toBeInTheDocument()
      expect(screen.getAllByText('+ Criar Deal')).toHaveLength(2)
    })

    it('hides block when all connected contacts have deals', async () => {
      setupMocks({
        dealResults: [{ contact_id: 'c1' }, { contact_id: 'c2' }],
        returnData: [],
        attemptData: [],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={connectedContacts} />)

      await waitFor(() => {
        expect(screen.queryByText('Verificando pendências...')).not.toBeInTheDocument()
      })
      expect(screen.queryByText('Atenderam sem deal')).not.toBeInTheDocument()
    })
  })

  describe('Block: Retornos agendados', () => {
    const contacts: SessionContact[] = [
      { contactId: 'c1', contactName: 'Ana Costa', contactPhone: '11999001122', outcome: 'no_answer' },
    ]

    it('shows scheduled returns for today', async () => {
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 2)

      setupMocks({
        dealResults: [],
        returnData: [
          { contact_id: 'c1', date: futureTime.toISOString() },
        ],
        attemptData: [],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.getByText('Retornos agendados')).toBeInTheDocument()
      })
      expect(screen.getByText('Ana Costa')).toBeInTheDocument()
    })

    it('shows "Atrasado" for overdue returns', async () => {
      const pastTime = new Date()
      pastTime.setHours(pastTime.getHours() - 1)

      setupMocks({
        dealResults: [],
        returnData: [
          { contact_id: 'c1', date: pastTime.toISOString() },
        ],
        attemptData: [],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.getByText('Atrasado')).toBeInTheDocument()
      })
    })
  })

  describe('Block: Tentativas esgotadas', () => {
    const contacts: SessionContact[] = [
      { contactId: 'c1', contactName: 'Carlos Oliveira', contactPhone: '11999887766', outcome: 'no_answer' },
      { contactId: 'c2', contactName: 'Paula Souza', contactPhone: '11977665544', outcome: 'busy' },
    ]

    it('shows contacts with 3+ attempts', async () => {
      setupMocks({
        dealResults: [],
        returnData: [],
        attemptData: [
          { contact_id: 'c1' }, { contact_id: 'c1' }, { contact_id: 'c1' }, { contact_id: 'c1' },
          { contact_id: 'c2' }, { contact_id: 'c2' },
        ],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.getByText('Tentativas esgotadas')).toBeInTheDocument()
      })
      expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument()
      expect(screen.getByText('4 tentativas')).toBeInTheDocument()
      expect(screen.queryByText('Paula Souza')).not.toBeInTheDocument()
    })

    it('shows WhatsApp link with correct format', async () => {
      setupMocks({
        dealResults: [],
        returnData: [],
        attemptData: [
          { contact_id: 'c1' }, { contact_id: 'c1' }, { contact_id: 'c1' },
        ],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      })

      const link = screen.getByRole('link', { name: /WhatsApp/i })
      expect(link).toHaveAttribute('href', 'https://wa.me/5511999887766')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('shows "Não ligar" button for 5+ attempts', async () => {
      setupMocks({
        dealResults: [],
        returnData: [],
        attemptData: [
          { contact_id: 'c1' }, { contact_id: 'c1' }, { contact_id: 'c1' },
          { contact_id: 'c1' }, { contact_id: 'c1' },
        ],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.getByText('Não ligar')).toBeInTheDocument()
      })
    })

    it('does not show "Não ligar" for < 5 attempts', async () => {
      setupMocks({
        dealResults: [],
        returnData: [],
        attemptData: [
          { contact_id: 'c1' }, { contact_id: 'c1' }, { contact_id: 'c1' },
        ],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.getByText('Tentativas esgotadas')).toBeInTheDocument()
      })
      expect(screen.queryByText('Não ligar')).not.toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('shows "Sessão impecável" when no pending actions', async () => {
      const contacts: SessionContact[] = [
        { contactId: 'c1', contactName: 'Ana', contactPhone: '119', outcome: 'connected' },
      ]

      setupMocks({
        dealResults: [{ contact_id: 'c1' }],
        returnData: [],
        attemptData: [],
      })

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.getByText('Sessão impecável — sem pendências!')).toBeInTheDocument()
      })
    })

    it('does not render empty blocks', async () => {
      setupMocks({
        dealResults: [{ contact_id: 'c1' }],
        returnData: [],
        attemptData: [],
      })

      const contacts: SessionContact[] = [
        { contactId: 'c1', contactName: 'Ana', contactPhone: '119', outcome: 'connected' },
      ]

      render(<SessionSummary {...defaultProps} sessionContacts={contacts} />)

      await waitFor(() => {
        expect(screen.queryByText('Verificando pendências...')).not.toBeInTheDocument()
      })
      expect(screen.queryByText('Atenderam sem deal')).not.toBeInTheDocument()
      expect(screen.queryByText('Retornos agendados')).not.toBeInTheDocument()
      expect(screen.queryByText('Tentativas esgotadas')).not.toBeInTheDocument()
    })
  })
})
