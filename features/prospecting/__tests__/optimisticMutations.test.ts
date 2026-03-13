/**
 * Optimistic mutation tests for RT-1.2
 *
 * Tests onMutate (optimistic update) and onError (rollback) for:
 * - useUpsertDailyGoal (AC1, AC2)
 * - useClearCompletedQueue (AC3, AC4)
 * - useScheduleRetry (AC5, AC6)
 * - useResetRetry (AC7, AC8)
 * - useActivateReadyRetries (AC9)
 * - useReorderQueue (AC10)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { ProspectingQueueItem } from '@/types'
import type { DbDailyGoal } from '@/lib/supabase/prospecting-goals'

// ── Mocks ──────────────────────────────────────────────

const mockUpsertGoal = vi.fn()
const mockClearCompleted = vi.fn()
const mockScheduleRetry = vi.fn()
const mockResetRetry = vi.fn()
const mockActivateReadyRetries = vi.fn()
const mockUpdatePositions = vi.fn()

vi.mock('@/lib/supabase/prospecting-goals', () => ({
  prospectingGoalsService: {
    upsertGoal: (...args: unknown[]) => mockUpsertGoal(...args),
  },
}))

vi.mock('@/lib/supabase/prospecting-queues', () => ({
  prospectingQueuesService: {
    clearCompleted: (...args: unknown[]) => mockClearCompleted(...args),
    scheduleRetry: (...args: unknown[]) => mockScheduleRetry(...args),
    resetRetry: (...args: unknown[]) => mockResetRetry(...args),
    activateReadyRetries: (...args: unknown[]) => mockActivateReadyRetries(...args),
    updatePositions: (...args: unknown[]) => mockUpdatePositions(...args),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}))

import { useUpsertDailyGoal } from '@/lib/query/hooks/useDailyGoalsQuery'
import {
  useClearCompletedQueue,
  useScheduleRetry,
  useResetRetry,
  useActivateReadyRetries,
  useReorderQueue,
} from '@/lib/query/hooks/useProspectingQueueQuery'

// ── Helpers ──────────────────────────────────────────────

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  })

const createWrapper = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children)
  }

const makeGoal = (overrides?: Partial<DbDailyGoal>): DbDailyGoal => ({
  id: 'goal-1',
  owner_id: 'u-1',
  organization_id: 'org-1',
  calls_target: 30,
  connection_rate_target: 0.5,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
})

const makeItem = (overrides?: Partial<ProspectingQueueItem>): ProspectingQueueItem => ({
  id: 'q-1',
  contactId: 'c-1',
  ownerId: 'u-1',
  organizationId: 'org-1',
  status: 'pending',
  position: 0,
  retryCount: 0,
  createdAt: '2026-03-03T00:00:00Z',
  updatedAt: '2026-03-03T00:00:00Z',
  contactName: 'João Silva',
  contactPhone: '11999990000',
  ...overrides,
})

// Query key constants (mirrors createQueryKeys output)
const GOAL_DETAIL = (id: string) => ['dailyGoals', 'detail', id] as const
const QUEUE_LIST_KEY = ['prospectingQueue', 'list'] as const
const QUEUE_ALL_KEY = ['prospectingQueue'] as const

// ── Tests ──────────────────────────────────────────────

describe('Optimistic Mutations [RT-1.2]', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  // ── useUpsertDailyGoal (AC1, AC2) ────────────────────

  describe('useUpsertDailyGoal', () => {
    it('AC1: atualiza calls_target otimisticamente no cache', async () => {
      queryClient.setQueryData(GOAL_DETAIL('u-1'), makeGoal())
      mockUpsertGoal.mockResolvedValueOnce({ data: makeGoal({ calls_target: 50 }), error: null })

      const { result } = renderHook(() => useUpsertDailyGoal(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate({ ownerId: 'u-1', callsTarget: 50 })
      })

      await waitFor(() => {
        const cached = queryClient.getQueryData<DbDailyGoal>(GOAL_DETAIL('u-1'))
        expect(cached?.calls_target).toBe(50)
      })
    })

    it('AC1: preserva connection_rate_target quando não fornecido', async () => {
      queryClient.setQueryData(GOAL_DETAIL('u-1'), makeGoal({ connection_rate_target: 0.8 }))
      mockUpsertGoal.mockResolvedValueOnce({ data: makeGoal({ calls_target: 40, connection_rate_target: 0.8 }), error: null })

      const { result } = renderHook(() => useUpsertDailyGoal(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate({ ownerId: 'u-1', callsTarget: 40 })
      })

      await waitFor(() => {
        const cached = queryClient.getQueryData<DbDailyGoal>(GOAL_DETAIL('u-1'))
        expect(cached?.calls_target).toBe(40)
        expect(cached?.connection_rate_target).toBe(0.8)
      })
    })

    it('AC2: reverte cache em caso de erro do servidor', async () => {
      queryClient.setQueryData(GOAL_DETAIL('u-1'), makeGoal({ calls_target: 30 }))
      mockUpsertGoal.mockResolvedValueOnce({ data: null, error: new Error('Server error') })

      const { result } = renderHook(() => useUpsertDailyGoal(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate({ ownerId: 'u-1', callsTarget: 99 })
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      const cached = queryClient.getQueryData<DbDailyGoal>(GOAL_DETAIL('u-1'))
      expect(cached?.calls_target).toBe(30)
    })

    it('AC2: não quebra quando cache anterior é null', async () => {
      // No existing goal in cache (first-time upsert)
      queryClient.setQueryData(GOAL_DETAIL('u-1'), null)
      mockUpsertGoal.mockResolvedValueOnce({ data: makeGoal({ calls_target: 25 }), error: null })

      const { result } = renderHook(() => useUpsertDailyGoal(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate({ ownerId: 'u-1', callsTarget: 25 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Should not crash — null cache stays null until server responds
    })
  })

  // ── useClearCompletedQueue (AC3, AC4) ────────────────

  describe('useClearCompletedQueue', () => {
    it('AC3: remove itens completed e skipped otimisticamente', async () => {
      const items = [
        makeItem({ id: 'q-1', status: 'pending' }),
        makeItem({ id: 'q-2', status: 'completed', position: 1 }),
        makeItem({ id: 'q-3', status: 'skipped', position: 2 }),
        makeItem({ id: 'q-4', status: 'in_progress', position: 3 }),
      ]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockClearCompleted.mockResolvedValueOnce({ error: null })

      const { result } = renderHook(() => useClearCompletedQueue(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate()
      })

      await waitFor(() => {
        const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
        expect(cached?.length).toBe(2)
        expect(cached?.map(i => i.id)).toEqual(['q-1', 'q-4'])
      })
    })

    it('AC4: reverte cache em caso de erro', async () => {
      const items = [
        makeItem({ id: 'q-1', status: 'pending' }),
        makeItem({ id: 'q-2', status: 'completed', position: 1 }),
      ]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockClearCompleted.mockResolvedValueOnce({ error: new Error('fail') })

      const { result } = renderHook(() => useClearCompletedQueue(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate()
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
      expect(cached?.length).toBe(2)
      expect(cached?.map(i => i.id)).toEqual(['q-1', 'q-2'])
    })
  })

  // ── useScheduleRetry (AC5, AC6) ─────────────────────

  describe('useScheduleRetry', () => {
    it('AC5: atualiza status para retry_pending e incrementa retryCount', async () => {
      const items = [
        makeItem({ id: 'q-1', status: 'pending', retryCount: 1 }),
        makeItem({ id: 'q-2', status: 'pending', position: 1 }),
      ]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockScheduleRetry.mockResolvedValueOnce({ data: items[0], error: null })

      const { result } = renderHook(() => useScheduleRetry(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate({ id: 'q-1', retryIntervalDays: 3 })
      })

      await waitFor(() => {
        const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
        expect(cached?.[0].status).toBe('retry_pending')
        expect(cached?.[0].retryCount).toBe(2) // 1 + 1
        expect(cached?.[1].status).toBe('pending') // unchanged
      })
    })

    it('AC6: reverte cache em caso de erro', async () => {
      const items = [makeItem({ id: 'q-1', status: 'pending', retryCount: 0 })]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockScheduleRetry.mockResolvedValueOnce({ data: null, error: new Error('fail') })

      const { result } = renderHook(() => useScheduleRetry(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate({ id: 'q-1', retryIntervalDays: 3 })
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
      expect(cached?.[0].status).toBe('pending')
      expect(cached?.[0].retryCount).toBe(0)
    })
  })

  // ── useResetRetry (AC7, AC8) ────────────────────────

  describe('useResetRetry', () => {
    it('AC7: reseta item exhausted para pending com retryCount 0', async () => {
      const items = [makeItem({ id: 'q-1', status: 'exhausted', retryCount: 3 })]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockResetRetry.mockResolvedValueOnce({ error: null })

      const { result } = renderHook(() => useResetRetry(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate('q-1')
      })

      await waitFor(() => {
        const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
        expect(cached?.[0].status).toBe('pending')
        expect(cached?.[0].retryCount).toBe(0)
      })
    })

    it('AC8: reverte cache em caso de erro', async () => {
      const items = [makeItem({ id: 'q-1', status: 'exhausted', retryCount: 3 })]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockResetRetry.mockResolvedValueOnce({ error: new Error('fail') })

      const { result } = renderHook(() => useResetRetry(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate('q-1')
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
      expect(cached?.[0].status).toBe('exhausted')
      expect(cached?.[0].retryCount).toBe(3)
    })
  })

  // ── useActivateReadyRetries (AC9) ───────────────────

  describe('useActivateReadyRetries', () => {
    it('AC9: move retry_pending para pending otimisticamente', async () => {
      const items = [
        makeItem({ id: 'q-1', status: 'retry_pending', retryCount: 2 }),
        makeItem({ id: 'q-2', status: 'pending', position: 1 }),
        makeItem({ id: 'q-3', status: 'retry_pending', position: 2, retryCount: 1 }),
      ]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockActivateReadyRetries.mockResolvedValueOnce({ data: 2, error: null })

      const { result } = renderHook(() => useActivateReadyRetries(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate()
      })

      await waitFor(() => {
        const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
        expect(cached?.[0].status).toBe('pending')
        expect(cached?.[1].status).toBe('pending') // already pending
        expect(cached?.[2].status).toBe('pending')
      })
    })

    it('AC9: reverte cache em caso de erro', async () => {
      const items = [makeItem({ id: 'q-1', status: 'retry_pending' })]
      queryClient.setQueryData(QUEUE_LIST_KEY, items)
      mockActivateReadyRetries.mockResolvedValueOnce({ data: null, error: new Error('fail') })

      const { result } = renderHook(() => useActivateReadyRetries(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate()
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      const cached = queryClient.getQueryData<ProspectingQueueItem[]>(QUEUE_LIST_KEY)
      expect(cached?.[0].status).toBe('retry_pending')
    })
  })

  // ── useReorderQueue (AC10) ──────────────────────────

  describe('useReorderQueue', () => {
    it('AC10: onSettled chama invalidateQueries como safety net', async () => {
      queryClient.setQueryData(QUEUE_LIST_KEY, [
        makeItem({ id: 'q-1', position: 0 }),
        makeItem({ id: 'q-2', position: 1 }),
      ])
      mockUpdatePositions.mockResolvedValueOnce({ error: null })
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useReorderQueue(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate([
          { id: 'q-2', position: 0 },
          { id: 'q-1', position: 1 },
        ])
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: [...QUEUE_ALL_KEY] })
      )
    })

    it('AC10: onSettled chama invalidateQueries mesmo em caso de erro', async () => {
      queryClient.setQueryData(QUEUE_LIST_KEY, [
        makeItem({ id: 'q-1', position: 0 }),
      ])
      mockUpdatePositions.mockResolvedValueOnce({ error: new Error('fail') })
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useReorderQueue(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.mutate([{ id: 'q-1', position: 1 }])
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: [...QUEUE_ALL_KEY] })
      )
    })
  })
})
