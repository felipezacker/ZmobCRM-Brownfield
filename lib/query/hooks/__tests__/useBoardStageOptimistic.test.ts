import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Board, BoardStage } from '@/types'

// ── Mocks ──────────────────────────────────────────────

const mockAddStage = vi.fn()
const mockUpdateStage = vi.fn()
const mockDeleteStage = vi.fn()

vi.mock('@/lib/supabase', () => ({
  boardsService: {
    addStage: (...args: unknown[]) => mockAddStage(...args),
    updateStage: (...args: unknown[]) => mockUpdateStage(...args),
    deleteStage: (...args: unknown[]) => mockDeleteStage(...args),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

const { useAddBoardStage, useUpdateBoardStage, useDeleteBoardStage } = await import('../useBoardsQuery')

// ── Helpers ──────────────────────────────────────────────

const makeStage = (overrides: Partial<BoardStage> = {}): BoardStage => ({
  id: 'stage-1',
  label: 'Qualificação',
  color: '#3B82F6',
  boardId: 'board-1',
  ...overrides,
})

const makeBoard = (overrides: Partial<Board> = {}): Board => ({
  id: 'board-1',
  name: 'Pipeline Principal',
  stages: [makeStage({ id: 'stage-1' }), makeStage({ id: 'stage-2', label: 'Proposta' })],
  isDefault: true,
  createdAt: '2026-01-01',
  ...overrides,
} as Board)

function createTestEnv() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  Wrapper.displayName = 'TestQueryWrapper'
  return { queryClient, Wrapper }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

// ── useAddBoardStage ──────────────────────────────────────

describe('useAddBoardStage — optimistic updates', () => {
  let queryClient: QueryClient
  let Wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    vi.clearAllMocks()
    const env = createTestEnv()
    queryClient = env.queryClient
    Wrapper = env.Wrapper
  })

  it('insere stage temporária otimisticamente no board correto', async () => {
    const boards = [makeBoard({ id: 'board-1' }), makeBoard({ id: 'board-2', stages: [] })]
    queryClient.setQueryData(['boards', 'list'], boards)

    const serverStage = makeStage({ id: 'server-stage-99', label: 'Nova Etapa', boardId: 'board-1' })
    const d = deferred<{ data: BoardStage; error: null }>()
    mockAddStage.mockReturnValue(d.promise)

    const { result } = renderHook(() => useAddBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ boardId: 'board-1', stage: { label: 'Nova Etapa', color: '#EF4444' } })
    })

    // Verifica estado otimista ENQUANTO mutation esta in-flight
    await waitFor(() => {
      const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
      const board1 = cached?.find(b => b.id === 'board-1')
      expect(board1?.stages).toHaveLength(3) // 2 originais + 1 temporária
      expect(board1?.stages.some(s => s.id.startsWith('temp-stage-'))).toBe(true)
      const board2 = cached?.find(b => b.id === 'board-2')
      expect(board2?.stages).toHaveLength(0) // board-2 não afetado
    })

    // Resolver mock para completar lifecycle
    await act(async () => { d.resolve({ data: serverStage, error: null }) })
  })

  it('onSuccess substitui stage temporária pelo objeto real do servidor', async () => {
    const boards = [makeBoard({ id: 'board-1', stages: [makeStage({ id: 'stage-1' })] })]
    queryClient.setQueryData(['boards', 'list'], boards)

    const serverStage = makeStage({ id: 'server-real-id', label: 'Nova', color: '#EF4444', boardId: 'board-1' })
    const d = deferred<{ data: BoardStage; error: null }>()
    mockAddStage.mockReturnValue(d.promise)

    const { result } = renderHook(() => useAddBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ boardId: 'board-1', stage: { label: 'Nova', color: '#EF4444' } })
    })

    // Esperar estado otimista (temp stage inserida)
    await waitFor(() => {
      const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
      expect(cached?.find(b => b.id === 'board-1')?.stages).toHaveLength(2)
    })

    // Resolver mock → onSuccess substitui temp por server stage
    await act(async () => { d.resolve({ data: serverStage, error: null }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
    const board1 = cached?.find(b => b.id === 'board-1')
    const hasServerStage = board1?.stages.some(s => s.id === 'server-real-id')
    const hasTempStage = board1?.stages.some(s => s.id.startsWith('temp-stage-'))
    expect(hasServerStage).toBe(true)
    expect(hasTempStage).toBe(false)
  })

  it('onError faz rollback para o estado anterior', async () => {
    const originalBoards = [makeBoard({ id: 'board-1', stages: [makeStage({ id: 'stage-1' })] })]
    queryClient.setQueryData(['boards', 'list'], originalBoards)

    const d = deferred<{ data: null; error: Error }>()
    mockAddStage.mockReturnValue(d.promise)

    const { result } = renderHook(() => useAddBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ boardId: 'board-1', stage: { label: 'Falha', color: '#000' } })
    })

    // Esperar estado otimista (temp stage aparece)
    await waitFor(() => {
      const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
      expect(cached?.find(b => b.id === 'board-1')?.stages).toHaveLength(2)
    })

    // Resolver com erro → onError rollback
    await act(async () => { d.resolve({ data: null, error: new Error('Server error') }) })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
    const board1 = cached?.find(b => b.id === 'board-1')
    expect(board1?.stages).toHaveLength(1)
    expect(board1?.stages[0].id).toBe('stage-1')
  })

  it('onSettled invalida queries de boards', async () => {
    queryClient.setQueryData(['boards', 'list'], [makeBoard()])

    const d = deferred<{ data: BoardStage; error: null }>()
    mockAddStage.mockReturnValue(d.promise)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAddBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ boardId: 'board-1', stage: { label: 'Test', color: '#000' } })
    })

    await act(async () => { d.resolve({ data: makeStage({ id: 'new' }), error: null }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['boards'] })
    )
  })
})

// ── useUpdateBoardStage ──────────────────────────────────

describe('useUpdateBoardStage — optimistic updates', () => {
  let queryClient: QueryClient
  let Wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    vi.clearAllMocks()
    const env = createTestEnv()
    queryClient = env.queryClient
    Wrapper = env.Wrapper
  })

  it('aplica updates otimisticamente na stage correta iterando todos os boards', async () => {
    const boards = [
      makeBoard({ id: 'board-1', stages: [makeStage({ id: 'stage-A', label: 'Old Label' })] }),
      makeBoard({ id: 'board-2', stages: [makeStage({ id: 'stage-B', label: 'Outro' })] }),
    ]
    queryClient.setQueryData(['boards', 'list'], boards)

    const d = deferred<{ error: null }>()
    mockUpdateStage.mockReturnValue(d.promise)

    const { result } = renderHook(() => useUpdateBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ stageId: 'stage-A', updates: { label: 'New Label', color: '#22C55E' } })
    })

    // Verifica estado otimista ENQUANTO mutation esta in-flight
    await waitFor(() => {
      const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
      const stageA = cached?.find(b => b.id === 'board-1')?.stages.find(s => s.id === 'stage-A')
      expect(stageA?.label).toBe('New Label')
      expect(stageA?.color).toBe('#22C55E')
      const stageB = cached?.find(b => b.id === 'board-2')?.stages.find(s => s.id === 'stage-B')
      expect(stageB?.label).toBe('Outro')
    })

    await act(async () => { d.resolve({ error: null }) })
  })

  it('onError faz rollback para o estado anterior', async () => {
    const boards = [makeBoard({ id: 'board-1', stages: [makeStage({ id: 'stage-1', label: 'Original' })] })]
    queryClient.setQueryData(['boards', 'list'], boards)

    const d = deferred<{ error: Error }>()
    mockUpdateStage.mockReturnValue(d.promise)

    const { result } = renderHook(() => useUpdateBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ stageId: 'stage-1', updates: { label: 'Changed' } })
    })

    // Esperar estado otimista
    await waitFor(() => {
      const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
      expect(cached?.find(b => b.id === 'board-1')?.stages.find(s => s.id === 'stage-1')?.label).toBe('Changed')
    })

    // Resolver com erro → rollback
    await act(async () => { d.resolve({ error: new Error('Server error') }) })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
    const stage = cached?.find(b => b.id === 'board-1')?.stages.find(s => s.id === 'stage-1')
    expect(stage?.label).toBe('Original')
  })

  it('onSettled invalida queries de boards', async () => {
    queryClient.setQueryData(['boards', 'list'], [makeBoard()])

    const d = deferred<{ error: null }>()
    mockUpdateStage.mockReturnValue(d.promise)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ stageId: 'stage-1', updates: { label: 'X' } })
    })

    await act(async () => { d.resolve({ error: null }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['boards'] })
    )
  })
})

// ── useDeleteBoardStage ──────────────────────────────────

describe('useDeleteBoardStage — optimistic updates', () => {
  let queryClient: QueryClient
  let Wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    vi.clearAllMocks()
    const env = createTestEnv()
    queryClient = env.queryClient
    Wrapper = env.Wrapper
  })

  it('remove stage otimisticamente de todos os boards', async () => {
    const boards = [
      makeBoard({ id: 'board-1', stages: [makeStage({ id: 'stage-del' }), makeStage({ id: 'stage-keep' })] }),
      makeBoard({ id: 'board-2', stages: [makeStage({ id: 'stage-other' })] }),
    ]
    queryClient.setQueryData(['boards', 'list'], boards)

    const d = deferred<{ error: null }>()
    mockDeleteStage.mockReturnValue(d.promise)

    const { result } = renderHook(() => useDeleteBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate('stage-del')
    })

    // Verifica estado otimista ENQUANTO mutation esta in-flight
    await waitFor(() => {
      const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
      const board1 = cached?.find(b => b.id === 'board-1')
      expect(board1?.stages).toHaveLength(1)
      expect(board1?.stages[0].id).toBe('stage-keep')
      const board2 = cached?.find(b => b.id === 'board-2')
      expect(board2?.stages).toHaveLength(1)
    })

    await act(async () => { d.resolve({ error: null }) })
  })

  it('onError faz rollback — stage reaparece', async () => {
    const boards = [makeBoard({ id: 'board-1', stages: [makeStage({ id: 'stage-1' })] })]
    queryClient.setQueryData(['boards', 'list'], boards)

    const d = deferred<{ error: Error }>()
    mockDeleteStage.mockReturnValue(d.promise)

    const { result } = renderHook(() => useDeleteBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate('stage-1')
    })

    // Esperar estado otimista (stage removida)
    await waitFor(() => {
      const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
      expect(cached?.find(b => b.id === 'board-1')?.stages).toHaveLength(0)
    })

    // Resolver com erro → rollback
    await act(async () => { d.resolve({ error: new Error('Server error') }) })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const cached = queryClient.getQueryData<Board[]>(['boards', 'list'])
    const board1 = cached?.find(b => b.id === 'board-1')
    expect(board1?.stages).toHaveLength(1)
    expect(board1?.stages[0].id).toBe('stage-1')
  })

  it('onSettled invalida queries de boards', async () => {
    queryClient.setQueryData(['boards', 'list'], [makeBoard()])

    const d = deferred<{ error: null }>()
    mockDeleteStage.mockReturnValue(d.promise)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteBoardStage(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate('stage-1')
    })

    await act(async () => { d.resolve({ error: null }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['boards'] })
    )
  })
})
