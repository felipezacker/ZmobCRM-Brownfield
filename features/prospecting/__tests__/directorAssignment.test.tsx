import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ProspectingPage } from '../ProspectingPage'

// ── Mocks ──────────────────────────────────────────────

// Auth: admin user so director assignment UI renders
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { role: 'admin', organization_id: 'org-1' },
    user: { id: 'u-admin' },
    loading: false,
  }),
}))

const mockToast = vi.fn()
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockToast,
    showToast: mockToast,
  }),
}))

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({ tags: ['VIP'] }),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: null,
}))

// Mock child components not relevant to AC9
vi.mock('../components/CallQueue', () => ({
  CallQueue: () => <div data-testid="call-queue" />,
}))

vi.mock('../components/AddToQueueSearch', () => ({
  AddToQueueSearch: () => <div data-testid="add-to-queue-search" />,
}))

vi.mock('../components/SessionSummary', () => ({
  SessionSummary: () => <div data-testid="session-summary" />,
}))

vi.mock('../components/PowerDialer', () => ({
  PowerDialer: () => <div data-testid="power-dialer" />,
}))

// Prospecting queue
vi.mock('../hooks/useProspectingQueue', () => ({
  useProspectingQueue: () => ({
    queue: [],
    currentIndex: 0,
    sessionActive: false,
    isLoading: false,
    startSession: vi.fn(),
    endSession: vi.fn(),
    next: vi.fn(),
    skip: vi.fn(),
    markCompleted: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    refetch: vi.fn(),
  }),
}))

// Filtered contacts: hasResults = true so contact list renders
const mockContacts = [
  {
    id: 'c-1', name: 'João', email: 'j@x.com', stage: 'LEAD', temperature: 'HOT',
    classification: null, source: null, ownerId: 'u-1', createdAt: '2026-01-01',
    primaryPhone: '11999990001', hasPhone: true, daysSinceLastActivity: 5,
  },
  {
    id: 'c-2', name: 'Maria', email: 'm@x.com', stage: 'MQL', temperature: 'WARM',
    classification: null, source: null, ownerId: 'u-1', createdAt: '2026-01-01',
    primaryPhone: '11999990002', hasPhone: true, daysSinceLastActivity: 10,
  },
]

vi.mock('../hooks/useProspectingFilteredContacts', () => ({
  useProspectingFilteredContacts: () => ({
    contacts: mockContacts,
    totalCount: 2,
    page: 0,
    totalPages: 1,
    goToPage: vi.fn(),
    isLoading: false,
    isFetching: false,
    error: null,
    hasResults: true,
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
    getAllFilteredIds: vi.fn().mockResolvedValue(['c-1', 'c-2']),
  }),
}))

// Batch mutation
const mockMutateAsync = vi.fn().mockResolvedValue({ added: 2, skipped: 0 })
vi.mock('@/lib/query/hooks/useProspectingQueueQuery', () => ({
  useAddBatchToProspectingQueue: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useQueueContactIds: () => ({
    data: [],
  }),
}))

// useQuery for profiles + useQueryClient for metrics hook
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { id: 'u-1', name: 'João Corretor', avatar: undefined, role: 'corretor' },
      { id: 'u-2', name: 'Maria Corretora', avatar: undefined, role: 'corretor' },
    ],
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

// CP-1.4: Mock metrics hook + components
vi.mock('../hooks/useProspectingMetrics', () => ({
  useProspectingMetrics: () => ({
    metrics: null,
    isLoading: false,
    isFetching: false,
    error: null,
    isAdminOrDirector: true,
    invalidateMetrics: vi.fn(),
  }),
}))

vi.mock('../components/MetricsCards', () => ({
  MetricsCards: () => <div data-testid="metrics-cards" />,
}))

vi.mock('../components/MetricsChart', () => ({
  MetricsChart: () => <div data-testid="metrics-chart" />,
}))

vi.mock('../components/CorretorRanking', () => ({
  CorretorRanking: () => <div data-testid="corretor-ranking" />,
}))

// ── Tests ──────────────────────────────────────────────

describe('ProspectingPage — Director Assignment (AC9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue({ added: 2, skipped: 0 })
  })

  const openFilters = () => {
    fireEvent.click(screen.getByText('Filtros em Massa'))
  }

  it('shows "Atribuir fila para:" dropdown for admin/director', () => {
    render(<ProspectingPage />)
    openFilters()

    expect(screen.getByText('Atribuir fila para:')).toBeTruthy()
  })

  it('lists org corretores in the assignment dropdown', () => {
    render(<ProspectingPage />)
    openFilters()

    // "Minha fila" is in the assignment select
    const assignContainer = screen.getByText('Atribuir fila para:').closest('div')!
    const assignSelect = assignContainer.querySelector('select')!
    const options = Array.from(assignSelect.querySelectorAll('option'))
    const optionTexts = options.map(o => o.textContent)

    expect(optionTexts).toContain('Minha fila')
    expect(optionTexts).toContain('João Corretor')
    expect(optionTexts).toContain('Maria Corretora')
  })

  it('sends targetOwnerId when director assigns to a corretor', async () => {
    render(<ProspectingPage />)
    openFilters()

    // Select a corretor in assignment dropdown
    const assignSelect = screen.getByText('Minha fila').closest('select')!
    fireEvent.change(assignSelect, { target: { value: 'u-2' } })

    // Use "Selecionar todos" to select contacts (avoids conflict with sr-only filter checkboxes)
    fireEvent.click(screen.getByText('Selecionar todos'))

    // Add to queue
    fireEvent.click(screen.getByText(/Adicionar à Fila/))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        contactIds: expect.arrayContaining(['c-1', 'c-2']),
        targetOwnerId: 'u-2',
      })
    })
  })

  it('sends undefined targetOwnerId when "Minha fila" is selected', async () => {
    render(<ProspectingPage />)
    openFilters()

    // Keep default "Minha fila" (value="")
    fireEvent.click(screen.getByText('Selecionar todos'))

    fireEvent.click(screen.getByText(/Adicionar à Fila/))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        contactIds: expect.arrayContaining(['c-1', 'c-2']),
        targetOwnerId: undefined,
      })
    })
  })

  it('shows success toast with assignee name when assigning to corretor', async () => {
    render(<ProspectingPage />)
    openFilters()

    // Select Maria Corretora
    const assignSelect = screen.getByText('Minha fila').closest('select')!
    fireEvent.change(assignSelect, { target: { value: 'u-2' } })

    // Select contacts and add
    fireEvent.click(screen.getByText('Selecionar todos'))
    fireEvent.click(screen.getByText(/Adicionar à Fila/))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('Maria Corretora'),
        'success'
      )
    })
  })
})
