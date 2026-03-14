import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProspectingFilteredContacts } from '../hooks/useProspectingFilteredContacts'
import { INITIAL_FILTERS } from '../components/ProspectingFilters'

// ── Mocks ──────────────────────────────────────────────

const mockGetFilteredContacts = vi.fn()
const mockGetAllFilteredIds = vi.fn()

vi.mock('@/lib/supabase/prospecting-filtered-contacts', () => ({
  prospectingFilteredContactsService: {
    getFilteredContacts: (...args: unknown[]) => mockGetFilteredContacts(...args),
    getAllFilteredIds: (...args: unknown[]) => mockGetAllFilteredIds(...args),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1' },
    loading: false,
    profile: { role: 'corretor', organization_id: 'org-1' },
  }),
}))

// ── Wrapper ──────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  Wrapper.displayName = 'TestQueryWrapper'
  return Wrapper
}

// ── Test data ──────────────────────────────────────────────

const mockContactsData = {
  data: [
    { id: 'c-1', name: 'João', email: null, stage: 'LEAD', temperature: 'HOT', classification: null, source: null, ownerId: 'u-1', createdAt: '2026-01-01', primaryPhone: '119', hasPhone: true, daysSinceLastActivity: 5 },
    { id: 'c-2', name: 'Maria', email: null, stage: 'MQL', temperature: 'WARM', classification: null, source: null, ownerId: 'u-1', createdAt: '2026-01-01', primaryPhone: '118', hasPhone: true, daysSinceLastActivity: 10 },
  ],
  totalCount: 2,
}

// ── Tests ──────────────────────────────────────────────

describe('useProspectingFilteredContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFilteredContacts.mockResolvedValue({ data: mockContactsData, error: null })
    mockGetAllFilteredIds.mockResolvedValue({ data: ['c-1', 'c-2'], error: null })
  })

  it('starts with no results (hasResults = false)', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    expect(result.current.hasResults).toBe(false)
    expect(result.current.contacts).toEqual([])
    expect(result.current.totalCount).toBe(0)
  })

  it('does not call service before applyFilters', () => {
    renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    expect(mockGetFilteredContacts).not.toHaveBeenCalled()
  })

  it('calls service with correct params after applyFilters', async () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({
        stages: ['LEAD', 'MQL'],
        temperatures: ['HOT'],
        classifications: [],
        tags: ['VIP'],
        sources: ['WEBSITE'],
        dealOwnerIds: ['u-2'],
        contactListIds: [],
        productIds: [],
        inactiveDays: 30,
        onlyWithPhone: true,
        hasActiveDeal: null,
      })
    })

    await waitFor(() => {
      expect(mockGetFilteredContacts).toHaveBeenCalledWith({
        stages: ['LEAD', 'MQL'],
        temperatures: ['HOT'],
        classifications: undefined,
        tags: ['VIP'],
        sources: ['WEBSITE'],
        dealOwnerIds: ['u-2'],
        inactiveDays: 30,
        onlyWithPhone: true,
        hasActiveDeal: undefined,
        page: 0,
        pageSize: 50,
      })
    })
  })

  it('returns contacts and totalCount from service response', async () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(2)
      expect(result.current.contacts[0].name).toBe('João')
      expect(result.current.totalCount).toBe(2)
      expect(result.current.totalPages).toBe(1)
    })
  })

  it('sets hasResults after applying filters', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    expect(result.current.hasResults).toBe(true)
  })

  it('resets page to 0 on new filter application', async () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    act(() => {
      result.current.goToPage(2)
    })
    expect(result.current.page).toBe(2)

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['MQL'] })
    })
    expect(result.current.page).toBe(0)
  })

  it('clears filters and resets state', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })
    expect(result.current.hasResults).toBe(true)

    act(() => {
      result.current.clearFilters()
    })
    expect(result.current.hasResults).toBe(false)
    expect(result.current.page).toBe(0)
  })

  it('goToPage updates page state', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    act(() => {
      result.current.goToPage(3)
    })

    expect(result.current.page).toBe(3)
  })

  it('omits empty arrays from query params', async () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters(INITIAL_FILTERS)
    })

    await waitFor(() => {
      expect(mockGetFilteredContacts).toHaveBeenCalledWith(
        expect.objectContaining({
          stages: undefined,
          temperatures: undefined,
          classifications: undefined,
          tags: undefined,
          sources: undefined,
          dealOwnerIds: undefined,
          inactiveDays: undefined,
          onlyWithPhone: undefined,
        })
      )
    })
  })

  it('propagates service error via useQuery error state', async () => {
    mockGetFilteredContacts.mockResolvedValue({
      data: null,
      error: new Error('DB connection failed'),
    })

    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })

  it('getAllFilteredIds returns empty array when no filters applied', async () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    const ids = await result.current.getAllFilteredIds()
    expect(ids).toEqual([])
    expect(mockGetAllFilteredIds).not.toHaveBeenCalled()
  })

  it('getAllFilteredIds calls service with applied filters', async () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    const ids = await result.current.getAllFilteredIds()

    expect(mockGetAllFilteredIds).toHaveBeenCalledWith(
      expect.objectContaining({ stages: ['LEAD'] })
    )
    expect(ids).toEqual(['c-1', 'c-2'])
  })

  it('getAllFilteredIds returns empty array on service error', async () => {
    mockGetAllFilteredIds.mockResolvedValue({ data: null, error: new Error('fail') })

    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    const ids = await result.current.getAllFilteredIds()
    expect(ids).toEqual([])
  })

  it('passes onlyWithPhone filter when enabled', async () => {
    const { result } = renderHook(() => useProspectingFilteredContacts(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, onlyWithPhone: true })
    })

    await waitFor(() => {
      expect(mockGetFilteredContacts).toHaveBeenCalledWith(
        expect.objectContaining({ onlyWithPhone: true })
      )
    })
  })
})
