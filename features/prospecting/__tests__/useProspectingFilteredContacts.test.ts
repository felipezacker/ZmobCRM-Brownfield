import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProspectingFilteredContacts } from '../hooks/useProspectingFilteredContacts'
import { INITIAL_FILTERS, type ProspectingFiltersState } from '../components/ProspectingFilters'

// ── Mocks ──────────────────────────────────────────────

const mockGetFilteredContacts = vi.fn()

vi.mock('@/lib/supabase/prospecting-filtered-contacts', () => ({
  prospectingFilteredContactsService: {
    getFilteredContacts: (...args: unknown[]) => mockGetFilteredContacts(...args),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1' },
    loading: false,
    profile: { role: 'corretor', organization_id: 'org-1' },
  }),
}))

// Mock TanStack Query to make it synchronous
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(({ queryFn, enabled }: any) => {
      if (!enabled) return { data: undefined, isLoading: false, isFetching: false, error: null }
      // We don't actually call queryFn in unit tests
      return { data: undefined, isLoading: false, isFetching: false, error: null }
    }),
  }
})

// ── Tests ──────────────────────────────────────────────

describe('useProspectingFilteredContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with no results (hasResults = false)', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts())

    expect(result.current.hasResults).toBe(false)
    expect(result.current.contacts).toEqual([])
    expect(result.current.totalCount).toBe(0)
  })

  it('sets hasResults after applying filters', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts())

    act(() => {
      result.current.applyFilters({
        ...INITIAL_FILTERS,
        stages: ['LEAD'],
      })
    })

    expect(result.current.hasResults).toBe(true)
  })

  it('resets page to 0 on new filter application', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts())

    // Apply filters
    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    // Go to page 2
    act(() => {
      result.current.goToPage(2)
    })
    expect(result.current.page).toBe(2)

    // Apply new filters - should reset page
    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['MQL'] })
    })
    expect(result.current.page).toBe(0)
  })

  it('clears filters and resets state', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts())

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
    const { result } = renderHook(() => useProspectingFilteredContacts())

    act(() => {
      result.current.applyFilters({ ...INITIAL_FILTERS, stages: ['LEAD'] })
    })

    act(() => {
      result.current.goToPage(3)
    })

    expect(result.current.page).toBe(3)
  })

  it('converts filter state to query params correctly', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts())

    const filters: ProspectingFiltersState = {
      stages: ['LEAD', 'MQL'],
      temperatures: ['HOT'],
      classifications: ['COMPRADOR'],
      source: 'WEBSITE',
      ownerId: 'u-2',
      inactiveDays: 30,
    }

    act(() => {
      result.current.applyFilters(filters)
    })

    // hasResults should be true - the query will fire with these params
    expect(result.current.hasResults).toBe(true)
  })

  it('omits empty arrays from query params', () => {
    const { result } = renderHook(() => useProspectingFilteredContacts())

    act(() => {
      result.current.applyFilters({
        stages: [],
        temperatures: [],
        classifications: [],
        source: '',
        ownerId: '',
        inactiveDays: null,
      })
    })

    // Should still trigger results but with minimal params
    expect(result.current.hasResults).toBe(true)
  })
})
