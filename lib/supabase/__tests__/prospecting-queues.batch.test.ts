import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Mock supabase client — separate chains for select, update, delete, rpc
// ============================================

let deleteResult: { error: unknown; count: number | null } = { error: null, count: 0 }
let selectResult: { data: unknown[] | null; error: unknown } = { data: [], error: null }
let rpcResult: { error: unknown } = { error: null }

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return {
        // delete chain: delete → in
        delete: (opts?: { count?: string }) => ({
          in: (_col: string, _ids: string[]) =>
            Promise.resolve({ ...deleteResult, ...(opts?.count === 'exact' ? {} : {}) }),
        }),
        // select chain: select → eq → order
        select: (_cols: string) => ({
          eq: (_col: string, _val: string) => ({
            order: (_col2: string, _opts: unknown) =>
              Promise.resolve(selectResult),
          }),
        }),
      }
    },
    rpc: (...args: unknown[]) => {
      mockRpc(...args)
      return Promise.resolve(rpcResult)
    },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
  },
}))

vi.mock('@/lib/supabase/utils', () => ({
  sanitizeUUID: (id: string) => id,
}))

import { prospectingQueuesService } from '../prospecting-queues'

// ── removeItems (CP-4.5) ──────────────────────────────────

describe('prospectingQueuesService.removeItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteResult = { error: null, count: 0 }
  })

  it('retorna removed: 0 para array vazio sem chamar supabase', async () => {
    const result = await prospectingQueuesService.removeItems([])
    expect(result).toEqual({ data: { removed: 0 }, error: null })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('deleta via .in("id", ids) e retorna count', async () => {
    deleteResult = { error: null, count: 3 }
    const result = await prospectingQueuesService.removeItems(['a', 'b', 'c'])
    expect(result.data).toEqual({ removed: 3 })
    expect(result.error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('prospecting_queues')
  })

  it('retorna error quando supabase falha', async () => {
    const err = new Error('DB error')
    deleteResult = { error: err, count: null }
    const result = await prospectingQueuesService.removeItems(['a'])
    expect(result.data).toBeNull()
    expect(result.error).toBe(err)
  })
})

// ── moveToTop (RT-4.2: refatorado para usar RPC) ──────────────────────────────────

describe('prospectingQueuesService.moveToTop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult = { data: [], error: null }
    rpcResult = { error: null }
  })

  it('retorna sem erro para array vazio sem chamar supabase', async () => {
    const result = await prospectingQueuesService.moveToTop([], 'user-1')
    expect(result.error).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('reordena selecionados para o topo via RPC', async () => {
    selectResult = {
      data: [
        { id: 'A', position: 0 },
        { id: 'B', position: 1 },
        { id: 'C', position: 2 },
        { id: 'D', position: 3 },
      ],
      error: null,
    }

    const result = await prospectingQueuesService.moveToTop(['C', 'A'], 'user-1')

    expect(result.error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('prospecting_queues')
    // selected preserves allItems order (sorted by position), not ids order
    expect(mockRpc).toHaveBeenCalledWith('batch_update_queue_positions', {
      p_updates: JSON.stringify([
        { id: 'A', position: 0 },
        { id: 'C', position: 1 },
        { id: 'B', position: 2 },
        { id: 'D', position: 3 },
      ]),
    })
  })

  it('preserva ordem relativa dos itens nao selecionados', async () => {
    selectResult = {
      data: [
        { id: 'A', position: 0 },
        { id: 'B', position: 1 },
        { id: 'C', position: 2 },
        { id: 'D', position: 3 },
        { id: 'E', position: 4 },
      ],
      error: null,
    }

    await prospectingQueuesService.moveToTop(['D'], 'user-1')

    const rpcCall = mockRpc.mock.calls[0]
    const updates = JSON.parse(rpcCall[1].p_updates)
    // D goes to top (position 0), rest maintain relative order
    expect(updates).toEqual([
      { id: 'D', position: 0 },
      { id: 'A', position: 1 },
      { id: 'B', position: 2 },
      { id: 'C', position: 3 },
      { id: 'E', position: 4 },
    ])
  })

  it('retorna error quando fetch falha sem chamar rpc', async () => {
    selectResult = { data: null, error: { message: 'Fetch error' } }

    const result = await prospectingQueuesService.moveToTop(['a'], 'user-1')
    expect(result.error).toEqual({ message: 'Fetch error' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('retorna error quando rpc falha', async () => {
    selectResult = {
      data: [{ id: 'A', position: 0 }, { id: 'B', position: 1 }],
      error: null,
    }
    rpcResult = { error: { message: 'RPC failed' } }

    const result = await prospectingQueuesService.moveToTop(['B'], 'user-1')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error!.message).toBe('RPC failed')
  })
})
