import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NeglectedContactsAlert } from '../components/NeglectedContactsAlert'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/features/prospecting/components/LeadScoreBadge', () => ({
  LeadScoreBadge: ({ score }: { score: number | null }) => (
    score != null ? <span data-testid="lead-score">{score}</span> : null
  ),
}))

const mockGetFilteredContacts = vi.fn()
const mockGetAllFilteredIds = vi.fn()

vi.mock('@/lib/supabase/prospecting-filtered-contacts', () => ({
  prospectingFilteredContactsService: {
    getFilteredContacts: (...args: unknown[]) => mockGetFilteredContacts(...args),
    getAllFilteredIds: (...args: unknown[]) => mockGetAllFilteredIds(...args),
  },
}))

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockContacts = [
  { id: 'c1', name: 'Ana Silva', leadScore: 80, temperature: 'HOT', daysSinceLastActivity: 10 },
  { id: 'c2', name: 'Bob Santos', leadScore: 45, temperature: 'WARM', daysSinceLastActivity: 14 },
  { id: 'c3', name: 'Carlos Lima', leadScore: 70, temperature: 'HOT', daysSinceLastActivity: 8 },
]

describe('NeglectedContactsAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC4: nao renderiza quando 0 contatos negligenciados', async () => {
    mockGetFilteredContacts.mockResolvedValue({
      data: { data: [], totalCount: 0 },
      error: null,
    })

    const { container } = renderWithQuery(
      <NeglectedContactsAlert onAddAllToQueue={vi.fn()} />,
    )

    await waitFor(() => {
      expect(mockGetFilteredContacts).toHaveBeenCalled()
    })

    expect(container.innerHTML).toBe('')
  })

  it('AC1+AC2: exibe alerta com contagem e lista top 5', async () => {
    mockGetFilteredContacts.mockResolvedValue({
      data: { data: mockContacts, totalCount: 12 },
      error: null,
    })

    renderWithQuery(<NeglectedContactsAlert onAddAllToQueue={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/12 leads quentes sem contato/)).toBeInTheDocument()
    })

    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Bob Santos')).toBeInTheDocument()
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument()
    expect(screen.getByText('10 dias sem contato')).toBeInTheDocument()
    expect(screen.getByText('14 dias sem contato')).toBeInTheDocument()
  })

  it('AC3: adicionar todos a fila busca todos os IDs e chama callback', async () => {
    mockGetFilteredContacts.mockResolvedValue({
      data: { data: mockContacts, totalCount: 12 },
      error: null,
    })
    mockGetAllFilteredIds.mockResolvedValue({
      data: ['c1', 'c2', 'c3', 'c4', 'c5'],
      error: null,
    })

    const onAddAll = vi.fn()
    renderWithQuery(<NeglectedContactsAlert onAddAllToQueue={onAddAll} />)

    await waitFor(() => {
      expect(screen.getByText(/12 leads quentes/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Adicionar todos à fila'))

    await waitFor(() => {
      expect(mockGetAllFilteredIds).toHaveBeenCalled()
      expect(onAddAll).toHaveBeenCalledWith(['c1', 'c2', 'c3', 'c4', 'c5'])
    })
  })

  it('chama onError quando getAllFilteredIds falha', async () => {
    mockGetFilteredContacts.mockResolvedValue({
      data: { data: mockContacts, totalCount: 3 },
      error: null,
    })
    mockGetAllFilteredIds.mockResolvedValue({
      data: null,
      error: new Error('RPC failed'),
    })

    const onError = vi.fn()
    renderWithQuery(<NeglectedContactsAlert onAddAllToQueue={vi.fn()} onError={onError} />)

    await waitFor(() => {
      expect(screen.getByText(/3 leads quentes/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Adicionar todos à fila'))

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })
  })

  it('exibe LeadScoreBadge para cada contato', async () => {
    mockGetFilteredContacts.mockResolvedValue({
      data: { data: mockContacts, totalCount: 3 },
      error: null,
    })

    renderWithQuery(<NeglectedContactsAlert onAddAllToQueue={vi.fn()} />)

    await waitFor(() => {
      const badges = screen.getAllByTestId('lead-score')
      expect(badges).toHaveLength(3)
      expect(badges[0].textContent).toBe('80')
    })
  })
})
