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
  createdAt: '2026-03-03T00:00:00Z',
  updatedAt: '2026-03-03T00:00:00Z',
  contactName: 'João Silva',
  contactPhone: '11999990000',
  ...overrides,
})

let mockQueueData: ProspectingQueueItem[] = []

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
})
