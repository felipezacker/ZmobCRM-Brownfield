import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Mock supabase client — separate chains for select vs update flows
// ============================================

let deleteResult: { error: unknown; count: number | null } = { error: null, count: 0 }
let selectResult: { data: unknown[] | null; error: unknown } = { data: [], error: null }
let updateResults: { error: unknown }[] = []
let updateCallIndex = 0

const mockFrom = vi.fn()

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
        // update chain: update → eq
        update: (_data: unknown) => ({
          eq: (_col: string, _val: string) => {
            const result = updateResults[updateCallIndex] || { error: null }
            updateCallIndex++
            return Promise.resolve(result)
          },
        }),
      }
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
    updateCallIndex = 0
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

// ── moveToTop (CP-4.5) ──────────────────────────────────

describe('prospectingQueuesService.moveToTop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectResult = { data: [], error: null }
    updateResults = []
    updateCallIndex = 0
  })

  it('retorna sem erro para array vazio', async () => {
    const result = await prospectingQueuesService.moveToTop([], 'user-1')
    expect(result.error).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('reordena selecionados para o topo', async () => {
    selectResult = {
      data: [
        { id: 'A', position: 0 },
        { id: 'B', position: 1 },
        { id: 'C', position: 2 },
        { id: 'D', position: 3 },
      ],
      error: null,
    }
    updateResults = Array(4).fill({ error: null })

    const result = await prospectingQueuesService.moveToTop(['C', 'A'], 'user-1')

    expect(result.error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('prospecting_queues')
  })

  it('retorna error quando fetch falha', async () => {
    selectResult = { data: null, error: { message: 'Fetch error' } }

    const result = await prospectingQueuesService.moveToTop(['a'], 'user-1')
    expect(result.error).toEqual({ message: 'Fetch error' })
  })

  it('retorna error quando update falha', async () => {
    selectResult = {
      data: [{ id: 'A', position: 0 }, { id: 'B', position: 1 }],
      error: null,
    }
    updateResults = [{ error: null }, { error: { message: 'Update failed' } }]

    const result = await prospectingQueuesService.moveToTop(['B'], 'user-1')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error!.message).toBe('Update failed')
  })
})
