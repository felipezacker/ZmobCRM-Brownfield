import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProspectingQueue } from '../hooks/useProspectingQueue'
import type { ProspectingQueueItem } from '@/types'

// ── Mocks ──────────────────────────────────────────────

const mockMutateAsync = vi.fn()
const mockToast = vi.fn()

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

let mockQueueData: ProspectingQueueItem[] = []

const mockScheduleRetryAsync = vi.fn()
const mockResetRetryAsync = vi.fn()

vi.mock('@/lib/realtime/useRealtimeSync', () => ({
  useRealtimeSync: vi.fn(),
}))

vi.mock('@/lib/query/hooks/useProspectingQueueQuery', () => ({
  useProspectingQueueItems: () => ({
    data: mockQueueData,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAddToProspectingQueue: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useUpdateQueueItemStatus: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useRemoveFromQueue: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useStartProspectingSession: () => ({
    mutateAsync: vi.fn().mockResolvedValue('session-123'),
  }),
  useClearAllQueue: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useScheduleRetry: () => ({
    mutateAsync: mockScheduleRetryAsync,
  }),
  useActivateReadyRetries: () => ({
    mutate: vi.fn(),
  }),
  useResetRetry: () => ({
    mutateAsync: mockResetRetryAsync,
  }),
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockToast,
    showToast: mockToast,
  }),
}))

// ── Tests ──────────────────────────────────────────────

describe('useProspectingQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueueData = []
  })

  it('retorna queue vazia por padrão', () => {
    const { result } = renderHook(() => useProspectingQueue())
    expect(result.current.queue).toEqual([])
    expect(result.current.sessionActive).toBe(false)
    expect(result.current.currentIndex).toBe(0)
  })

  it('ordena queue por position', () => {
    mockQueueData = [
      makeItem({ id: 'q-2', position: 2, contactName: 'B' }),
      makeItem({ id: 'q-1', position: 0, contactName: 'A' }),
      makeItem({ id: 'q-3', position: 1, contactName: 'C' }),
    ]
    const { result } = renderHook(() => useProspectingQueue())
    expect(result.current.queue.map(q => q.id)).toEqual(['q-1', 'q-3', 'q-2'])
  })

  it('startSession ativa a sessão e reseta index', async () => {
    mockQueueData = [makeItem()]
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.sessionActive).toBe(true)
    expect(result.current.currentIndex).toBe(0)
    expect(mockToast).toHaveBeenCalledWith('Sessão de prospecção iniciada', 'success')
  })

  it('endSession desativa a sessão', async () => {
    mockQueueData = [makeItem()]
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.startSession()
    })
    expect(result.current.sessionActive).toBe(true)

    act(() => {
      result.current.endSession()
    })
    expect(result.current.sessionActive).toBe(false)
    expect(result.current.currentIndex).toBe(0)
  })

  it('skip chama updateStatus com skipped e mostra toast de erro se falhar', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('fail'))
    mockQueueData = [makeItem()]
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.skip()
    })

    expect(mockToast).toHaveBeenCalledWith('Erro ao pular contato', 'error')
  })

  it('addToQueue chama mutação e mostra toast de sucesso', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.addToQueue('c-new')
    })

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ contactId: 'c-new' }))
    expect(mockToast).toHaveBeenCalledWith('Contato adicionado à fila', 'success')
  })

  it('addToQueue mostra toast de erro se falhar', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('fail'))
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.addToQueue('c-new')
    })

    expect(mockToast).toHaveBeenCalledWith('Erro ao adicionar contato', 'error')
  })

  it('removeFromQueue chama mutação e mostra toast', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.removeFromQueue('q-1')
    })

    expect(mockMutateAsync).toHaveBeenCalledWith('q-1')
    expect(mockToast).toHaveBeenCalledWith('Contato removido da fila', 'success')
  })

  it('markCompleted chama updateStatus com completed', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined)
    mockQueueData = [makeItem()]
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.startSession()
    })

    mockMutateAsync.mockResolvedValueOnce(undefined)
    await act(async () => {
      await result.current.markCompleted('connected')
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'q-1', status: 'completed' })
  })

  // ── CP-2.1: Retry tests ──────────────────────────────────

  it('markCompleted com no_answer agenda retry em vez de completar', async () => {
    mockScheduleRetryAsync.mockResolvedValueOnce({ exhausted: false })
    mockQueueData = [makeItem()]
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.markCompleted('no_answer')
    })

    expect(mockScheduleRetryAsync).toHaveBeenCalledWith({
      id: 'q-1',
      retryIntervalDays: 3, // default interval
    })
    expect(mockToast).toHaveBeenCalledWith('Retry agendado para 3 dias', 'info')
  })

  it('markCompleted com no_answer mostra toast de esgotado quando exhausted', async () => {
    mockScheduleRetryAsync.mockResolvedValueOnce({ exhausted: true })
    mockQueueData = [makeItem()]
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.startSession()
    })

    await act(async () => {
      await result.current.markCompleted('no_answer')
    })

    expect(mockToast).toHaveBeenCalledWith('Contato esgotou tentativas de retry', 'info')
  })

  it('filtra itens exhausted da queue principal e expõe em exhaustedItems', () => {
    mockQueueData = [
      makeItem({ id: 'q-1', status: 'pending' }),
      makeItem({ id: 'q-2', status: 'exhausted', position: 1, retryCount: 3 }),
    ]
    const { result } = renderHook(() => useProspectingQueue())

    expect(result.current.queue.length).toBe(1)
    expect(result.current.queue[0].id).toBe('q-1')
    expect(result.current.exhaustedItems.length).toBe(1)
    expect(result.current.exhaustedItems[0].id).toBe('q-2')
  })

  it('resetExhaustedItem chama resetRetry e mostra toast', async () => {
    mockResetRetryAsync.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useProspectingQueue())

    await act(async () => {
      await result.current.resetExhaustedItem('q-2')
    })

    expect(mockResetRetryAsync).toHaveBeenCalledWith('q-2')
    expect(mockToast).toHaveBeenCalledWith('Contato resetado para fila', 'success')
  })

  it('retryInterval default é 3 e pode ser alterado', () => {
    const { result } = renderHook(() => useProspectingQueue())
    expect(result.current.retryInterval).toBe(3)

    act(() => {
      result.current.setRetryInterval(7)
    })
    expect(result.current.retryInterval).toBe(7)
  })
})
