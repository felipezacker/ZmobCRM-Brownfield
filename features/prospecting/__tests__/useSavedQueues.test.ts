import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSavedQueues } from '../hooks/useSavedQueues'
import { prospectingSavedQueuesService } from '@/lib/supabase/prospecting-saved-queues'

vi.mock('@/lib/realtime/useRealtimeSync', () => ({
  useRealtimeSync: vi.fn(),
}))

vi.mock('@/lib/supabase/prospecting-saved-queues', () => ({
  prospectingSavedQueuesService: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
  }),
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    showToast: vi.fn(),
  }),
}))

const mockService = vi.mocked(prospectingSavedQueuesService)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
  return Wrapper
}

describe('useSavedQueues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads saved queues on mount', async () => {
    const queues = [
      {
        id: 'q1',
        name: 'Test queue',
        filters: { version: 'v1', filters: { stages: ['lead'] } },
        ownerId: 'user-1',
        organizationId: 'org-1',
        isShared: false,
        createdAt: '2026-03-01T00:00:00Z',
      },
    ]

    mockService.list.mockResolvedValue({ data: queues, error: null })

    const { result } = renderHook(() => useSavedQueues(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.savedQueues).toEqual(queues)
    })
  })

  it('creates a saved queue', async () => {
    mockService.list.mockResolvedValue({ data: [], error: null })
    mockService.create.mockResolvedValue({
      data: {
        id: 'q-new',
        name: 'Nova fila',
        filters: { version: 'v1', filters: { stages: ['mql'] } },
        ownerId: 'user-1',
        organizationId: 'org-1',
        isShared: false,
        createdAt: '2026-03-06T00:00:00Z',
      },
      error: null,
    })

    const { result } = renderHook(() => useSavedQueues(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const filters = {
      stages: ['mql'],
      temperatures: [],
      classifications: [],
      tags: [],
      source: '',
      ownerId: '',
      inactiveDays: null,
      onlyWithPhone: false,
    }

    await result.current.saveQueue('Nova fila', filters, false)

    expect(mockService.create).toHaveBeenCalledWith(
      'Nova fila',
      filters,
      false,
      undefined,
    )
  })

  it('deletes a saved queue', async () => {
    mockService.list.mockResolvedValue({ data: [], error: null })
    mockService.remove.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useSavedQueues(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await result.current.deleteQueue('q1')

    expect(mockService.remove).toHaveBeenCalledWith('q1')
  })

  it('getFiltersFromSaved extracts v1 filters', () => {
    mockService.list.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useSavedQueues(), {
      wrapper: createWrapper(),
    })

    const queue = {
      id: 'q1',
      name: 'Test',
      filters: { version: 'v1', filters: { stages: ['lead'], temperatures: ['hot'] } },
      ownerId: 'user-1',
      organizationId: 'org-1',
      isShared: false,
      createdAt: '2026-03-01T00:00:00Z',
    }

    const extracted = result.current.getFiltersFromSaved(queue)
    expect(extracted).toEqual({ stages: ['lead'], temperatures: ['hot'] })
  })
})
