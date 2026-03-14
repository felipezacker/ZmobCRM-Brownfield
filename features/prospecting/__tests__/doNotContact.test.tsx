/* eslint-disable no-restricted-syntax */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QuickActionsPanel } from '../components/QuickActionsPanel'
import { QueueItem } from '../components/QueueItem'
import { ContactHistory } from '../components/ContactHistory'
import type { ProspectingQueueItem } from '@/types'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) =>
    isOpen ? <div data-testid="modal" data-title={title}>{children}</div> : null,
}))

const mockMarkDoNotContact = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase', () => ({
  contactsService: {
    update: vi.fn().mockResolvedValue({ error: null }),
    markDoNotContact: (...args: unknown[]) => mockMarkDoNotContact(...args),
  },
}))

vi.mock('@/features/prospecting/components/DoNotContactModal', () => ({
  DoNotContactModal: ({ isOpen, onClose, contactId, onBlocked }: { isOpen: boolean; onClose: () => void; contactId: string; onBlocked?: () => void }) =>
    isOpen ? (
      <div data-testid="do-not-contact-modal" data-contact-id={contactId}>
        <button onClick={onClose}>CancelBlock</button>
        <button onClick={onBlocked}>ConfirmBlock</button>
      </div>
    ) : null,
}))

const mockToast = vi.fn()
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockToast, showToast: mockToast }),
  useOptionalToast: () => ({ addToast: mockToast }),
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

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useCreateActivity: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'a1' }) }),
  useUpdateActivity: () => ({ mutate: vi.fn() }),
  useContactActivities: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/features/boards/components/Modals/CreateDealModal', () => ({
  CreateDealModal: () => null,
}))

vi.mock('@/features/prospecting/components/NoteTemplatesManager', () => ({
  NoteTemplatesManager: () => null,
}))

vi.mock('@/lib/supabase/deals', () => ({
  getOpenDealsByContact: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/prospecting/components/LeadScoreBadge', () => ({
  LeadScoreBadge: () => null,
}))

vi.mock('@/features/prospecting/components/QueueItemDetails', () => ({
  QueueItemDetails: () => null,
}))

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}))

vi.mock('@/lib/design-tokens', () => ({
  SHADOW_TOKENS: { drag: '' },
}))

// ── Query wrapper ──────────────────────────────────────────────

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

// ── Helpers ──────────────────────────────────────────────

const makeQueueItem = (overrides?: Partial<ProspectingQueueItem>): ProspectingQueueItem => ({
  id: 'qi-1',
  contactId: 'c-1',
  ownerId: 'u-1',
  organizationId: 'org-1',
  status: 'pending',
  position: 0,
  retryCount: 0,
  createdAt: '2026-03-14T00:00:00Z',
  updatedAt: '2026-03-14T00:00:00Z',
  contactName: 'Maria Silva',
  contactPhone: '11999990000',
  contactStage: 'LEAD',
  doNotContact: false,
  ...overrides,
})

// ── Tests ──────────────────────────────────────────────

describe('CP-7.1: Do Not Contact (LGPD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('QuickActionsPanel — "Não ligar mais" button (AC3, AC4)', () => {
    const defaultProps = () => ({
      contactId: 'c-1',
      contactName: 'Maria Silva',
      contactPhone: '11999990000',
      contactStage: 'lead',
      outcome: 'connected' as const,
      callNotes: 'Notes',
      onDismiss: vi.fn(),
    })

    it('shows "Não ligar mais" button after any outcome', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="connected" />)
      expect(screen.getByText('Não ligar mais')).toBeInTheDocument()
    })

    it('shows "Não ligar mais" for no_answer outcome too', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} outcome="no_answer" />)
      expect(screen.getByText('Não ligar mais')).toBeInTheDocument()
    })

    it('opens DoNotContact modal when clicking "Não ligar mais"', () => {
      renderWithQuery(<QuickActionsPanel {...defaultProps()} />)
      expect(screen.queryByTestId('do-not-contact-modal')).not.toBeInTheDocument()

      fireEvent.click(screen.getByText('Não ligar mais'))
      expect(screen.getByTestId('do-not-contact-modal')).toBeInTheDocument()
      expect(screen.getByTestId('do-not-contact-modal')).toHaveAttribute('data-contact-id', 'c-1')
    })

    it('calls onDismiss when block is confirmed', () => {
      const onDismiss = vi.fn()
      renderWithQuery(<QuickActionsPanel {...defaultProps()} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByText('Não ligar mais'))
      fireEvent.click(screen.getByText('ConfirmBlock'))
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('QueueItem — "Bloqueado" badge (AC10)', () => {
    it('shows "Bloqueado" badge when doNotContact=true', () => {
      render(<QueueItem item={makeQueueItem({ doNotContact: true })} />)
      expect(screen.getByText('Bloqueado')).toBeInTheDocument()
    })

    it('does NOT show "Bloqueado" badge when doNotContact=false', () => {
      render(<QueueItem item={makeQueueItem({ doNotContact: false })} />)
      expect(screen.queryByText('Bloqueado')).not.toBeInTheDocument()
    })

    it('does NOT show "Bloqueado" badge when doNotContact is undefined', () => {
      render(<QueueItem item={makeQueueItem({ doNotContact: undefined })} />)
      expect(screen.queryByText('Bloqueado')).not.toBeInTheDocument()
    })
  })

  describe('ContactHistory — "Bloqueado" badge (AC10)', () => {
    it('shows "Bloqueado" badge when doNotContact=true', () => {
      renderWithQuery(<ContactHistory contactId="c-1" doNotContact={true} />)
      expect(screen.getByText('Bloqueado')).toBeInTheDocument()
    })

    it('does NOT show "Bloqueado" badge when doNotContact=false', () => {
      renderWithQuery(<ContactHistory contactId="c-1" doNotContact={false} />)
      expect(screen.queryByText('Bloqueado')).not.toBeInTheDocument()
    })
  })

  describe('DoNotContactModal — reason required (AC4)', () => {
    // This tests the actual DoNotContactModal component (not the mock)
    // We test that the confirm button requires a reason
    let DoNotContactModalReal: typeof import('../components/DoNotContactModal').DoNotContactModal

    beforeEach(async () => {
      // Dynamically import the real component (bypassing vi.mock)
      vi.doUnmock('@/features/prospecting/components/DoNotContactModal')
      const mod = await import('../components/DoNotContactModal')
      DoNotContactModalReal = mod.DoNotContactModal
    })

    it('confirm button is disabled until a reason is selected', () => {
      render(
        <DoNotContactModalReal
          isOpen={true}
          onClose={vi.fn()}
          contactId="c-1"
        />
      )

      // Find the confirm button by text
      const confirmBtn = screen.getByText('Confirmar bloqueio')
      expect(confirmBtn).toBeDisabled()
    })
  })
})
