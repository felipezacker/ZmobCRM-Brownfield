import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBoardFilters } from './useBoardFilters'
import type { DealView } from '@/types'

// ── Mocks ──────────────────────────────────────────────

const mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

// ── Test data ──────────────────────────────────────────────

const baseDeal: DealView = {
  id: 'd-1',
  title: 'Apartamento Centro',
  contactName: 'João Silva',
  contactPhone: '11999887766',
  propertyRef: 'APT-301-VILA-MARIANA',
  ownerId: 'owner-1',
  priority: 'high',
  status: 'stage-1',
  stageLabel: 'Novo',
  value: 50000,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-05T10:00:00Z',
  isWon: false,
  isLost: false,
  owner: { name: 'Carlos', avatar: '' },
  items: [],
  tags: [],
  customFields: {},
  lastStageChangeDate: '2026-03-01T10:00:00Z',
} as unknown as DealView

const deals: DealView[] = [
  baseDeal,
  {
    ...baseDeal,
    id: 'd-2',
    title: 'Casa Praia',
    contactName: 'Maria Santos',
    contactPhone: '21988776655',
    propertyRef: 'CASA-12-COPACABANA',
    ownerId: 'owner-2',
    priority: 'medium',
    value: 120000,
  } as unknown as DealView,
  {
    ...baseDeal,
    id: 'd-3',
    title: 'Terreno Rural',
    contactName: 'Pedro Lima',
    contactPhone: '31977665544',
    propertyRef: 'TER-05-BETIM',
    ownerId: 'owner-1',
    priority: 'low',
    value: 30000,
  } as unknown as DealView,
]

const defaultParams = {
  deals,
  profileId: 'owner-1',
  profileNickname: 'Carlos',
  profileFirstName: 'Carlos',
  profileAvatarUrl: '',
  orgMembersById: new Map([
    ['owner-1', { name: 'Carlos', avatar: '' }],
    ['owner-2', { name: 'Maria Gerente', avatar: '' }],
  ]),
  viewMode: 'kanban' as const,
}

// ── Tests ──────────────────────────────────────────────

describe('useBoardFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset URL for each test
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/boards' },
      writable: true,
    })
    window.history.replaceState = vi.fn()
  })

  describe('multi-field search (AC1, AC2, AC3)', () => {
    it('filters by title', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setSearchTerm('apartamento'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1'])
    })

    it('filters by contactName', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setSearchTerm('joão'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1'])
    })

    it('filters by contactPhone', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setSearchTerm('9988'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1'])
    })

    it('filters by propertyRef with spaces (normalizes hyphens)', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setSearchTerm('vila mariana'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1'])
    })

    it('filters by propertyRef with hyphens', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setSearchTerm('apt-301'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1'])
    })

    it('returns empty when no match', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setSearchTerm('inexistente xyz'))
      expect(result.current.filteredDeals).toHaveLength(0)
    })

    it('returns all deals when search is empty', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      expect(result.current.filteredDeals).toHaveLength(3)
    })
  })

  describe('priority filter (AC6)', () => {
    it('filters by high priority', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setPriorityFilter('high'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1'])
    })

    it('filters by medium priority', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setPriorityFilter('medium'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-2'])
    })

    it('filters by low priority', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setPriorityFilter('low'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-3'])
    })

    it('shows all when priority is "all"', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setPriorityFilter('all'))
      expect(result.current.filteredDeals).toHaveLength(3)
    })
  })

  describe('owner filter by member UUID (AC5)', () => {
    it('filters by specific owner UUID', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setOwnerFilter('owner-2'))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-2'])
    })

    it('filters by "mine"', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setOwnerFilter('mine'))
      // owner-1 deals: d-1, d-3
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1', 'd-3'])
    })

    it('shows all when owner is "all"', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setOwnerFilter('all'))
      expect(result.current.filteredDeals).toHaveLength(3)
    })
  })

  describe('combined filters (AC8)', () => {
    it('combines search + priority with AND logic', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => {
        result.current.setSearchTerm('centro')
        result.current.setPriorityFilter('high')
      })
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-1'])
    })

    it('combined filters return empty when no deal matches all', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => {
        result.current.setSearchTerm('praia')
        result.current.setPriorityFilter('high')
      })
      // "praia" matches d-2 (medium), but priority high excludes it
      expect(result.current.filteredDeals).toHaveLength(0)
    })

    it('combines owner + priority', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => {
        result.current.setOwnerFilter('owner-1')
        result.current.setPriorityFilter('low')
      })
      // owner-1 has d-1 (high) and d-3 (low), only d-3 matches low
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['d-3'])
    })
  })

  describe('date range filter (AC7)', () => {
    it('filters by start date', () => {
      const { result } = renderHook(() => useBoardFilters({
        ...defaultParams,
        deals: [
          { ...baseDeal, id: 'old', createdAt: '2026-01-01T10:00:00Z' } as unknown as DealView,
          { ...baseDeal, id: 'new', createdAt: '2026-03-05T10:00:00Z' } as unknown as DealView,
        ],
      }))
      act(() => result.current.setDateRange({ start: '2026-03-01', end: '' }))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['new'])
    })

    it('filters by end date', () => {
      const { result } = renderHook(() => useBoardFilters({
        ...defaultParams,
        deals: [
          { ...baseDeal, id: 'old', createdAt: '2026-01-15T10:00:00Z' } as unknown as DealView,
          { ...baseDeal, id: 'new', createdAt: '2026-03-05T10:00:00Z' } as unknown as DealView,
        ],
      }))
      act(() => result.current.setDateRange({ start: '', end: '2026-02-01' }))
      expect(result.current.filteredDeals.map(d => d.id)).toEqual(['old'])
    })
  })

  describe('showAllRecent toggle (BUX-10)', () => {
    const oldWonDeal = {
      ...baseDeal,
      id: 'old-won',
      title: 'Deal Antigo Ganho',
      isWon: true,
      isLost: false,
      updatedAt: '2025-12-01T10:00:00Z',
      closedAt: '2025-12-01T10:00:00Z',
    } as unknown as DealView

    const recentWonDeal = {
      ...baseDeal,
      id: 'recent-won',
      title: 'Deal Recente Ganho',
      isWon: true,
      isLost: false,
      updatedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
    } as unknown as DealView

    const mixedDeals = [baseDeal, oldWonDeal, recentWonDeal]

    it('hides old won/lost deals by default when status is "all"', () => {
      const { result } = renderHook(() => useBoardFilters({
        ...defaultParams,
        deals: mixedDeals,
      }))
      act(() => result.current.setStatusFilter('all'))
      const ids = result.current.filteredDeals.map(d => d.id)
      expect(ids).not.toContain('old-won')
      expect(ids).toContain('recent-won')
    })

    it('shows old won/lost deals when showAllRecent is true', () => {
      const { result } = renderHook(() => useBoardFilters({
        ...defaultParams,
        deals: mixedDeals,
      }))
      act(() => {
        result.current.setStatusFilter('all')
        result.current.setShowAllRecent(true)
      })
      const ids = result.current.filteredDeals.map(d => d.id)
      expect(ids).toContain('old-won')
      expect(ids).toContain('recent-won')
    })

    it('hiddenByRecentCount is independent of showAllRecent', () => {
      const { result } = renderHook(() => useBoardFilters({
        ...defaultParams,
        deals: mixedDeals,
      }))
      act(() => result.current.setStatusFilter('all'))
      const countBefore = result.current.hiddenByRecentCount
      act(() => result.current.setShowAllRecent(true))
      expect(result.current.hiddenByRecentCount).toBe(countBefore)
      expect(countBefore).toBeGreaterThan(0)
    })

    it('hiddenByRecentCount returns 0 for won/lost status filters', () => {
      const { result } = renderHook(() => useBoardFilters({
        ...defaultParams,
        deals: mixedDeals,
      }))
      act(() => result.current.setStatusFilter('won'))
      expect(result.current.hiddenByRecentCount).toBe(0)
      act(() => result.current.setStatusFilter('lost'))
      expect(result.current.hiddenByRecentCount).toBe(0)
    })

    it('showAllRecent defaults to false', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      expect(result.current.showAllRecent).toBe(false)
    })
  })

  describe('URL sync (AC9)', () => {
    it('syncs priority filter to URL', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setPriorityFilter('high'))
      expect(window.history.replaceState).toHaveBeenCalled()
      const lastCall = (window.history.replaceState as ReturnType<typeof vi.fn>).mock.calls.at(-1)
      expect(lastCall?.[2]).toContain('priority=high')
    })

    it('syncs owner filter to URL', () => {
      const { result } = renderHook(() => useBoardFilters(defaultParams))
      act(() => result.current.setOwnerFilter('owner-2'))
      const lastCall = (window.history.replaceState as ReturnType<typeof vi.fn>).mock.calls.at(-1)
      expect(lastCall?.[2]).toContain('owner=owner-2')
    })
  })
})
