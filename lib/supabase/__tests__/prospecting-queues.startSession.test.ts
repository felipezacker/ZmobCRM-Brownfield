import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Mock supabase client with chainable methods
// ============================================

const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}

function createChain() {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select', 'insert', 'update', 'delete', 'eq', 'in',
    'order', 'limit', 'single', 'maybeSingle', 'from',
  ]
  for (const m of methods) {
    mockChain[m] = vi.fn().mockReturnValue(chain)
    chain[m] = mockChain[m]
  }
  return chain
}

const chain = createChain()

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => { mockChain.from(...args); return chain },
    auth: { getUser: () => mockGetUser() },
  },
}))

vi.mock('crypto', () => ({
  randomUUID: () => 'test-session-uuid',
}))

// Ensure crypto.randomUUID is available globally
vi.stubGlobal('crypto', { randomUUID: () => 'test-session-uuid' })

import { prospectingQueuesService } from '../prospecting-queues'

describe('prospectingQueuesService.startSession (CP-4.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of Object.keys(mockChain)) {
      mockChain[m].mockReturnValue(chain)
    }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  // Helper to setup the mock chain for startSession flow
  function setupStartSessionMocks(options: {
    maxPendingPosition: number | null
    skippedItems: Array<{ id: string }> | null
    resetErrors?: Error[]
    sessionUpdateError?: Error | null
    maxPosQueryError?: Error | null
    skippedQueryError?: Error | null
  }) {
    const { maxPendingPosition, skippedItems, resetErrors = [], sessionUpdateError = null, maxPosQueryError = null, skippedQueryError = null } = options

    // Track call sequence to differentiate queries
    let maybeSingleCalls = 0
    let orderCalls = 0
    let eqCalls = 0

    mockChain.maybeSingle.mockImplementation(() => {
      maybeSingleCalls++
      // Step 1: MAX(position) of pending
      if (maxPosQueryError) {
        return Promise.resolve({ data: null, error: maxPosQueryError })
      }
      return Promise.resolve({
        data: maxPendingPosition !== null ? { position: maxPendingPosition } : null,
        error: null,
      })
    })

    // Step 2: skipped items query ends with .order('position', { ascending: true })
    // We need to track which order call is for step 2 vs step 1
    // Step 1 chain: from → select → eq(owner) → eq(status) → order(desc) → limit → maybeSingle
    // Step 2 chain: from → select → eq(owner) → eq(status) → order(asc)
    // Step 2's order is the terminal call that resolves the promise

    let fromCallCount = 0
    mockChain.from.mockImplementation(() => {
      fromCallCount++
      return chain
    })

    // The order call for step 2 (skipped items) needs to resolve with data
    // But step 1 also has an order call. We differentiate by the resolve point:
    // Step 1 resolves at maybeSingle, step 2 resolves at order (last in chain)

    // Simpler approach: track eq('status', 'skipped') to know we're in step 2
    let inSkippedQuery = false
    const originalEq = mockChain.eq.getMockImplementation()

    mockChain.eq.mockImplementation((...args: unknown[]) => {
      eqCalls++
      if (args[0] === 'status' && args[1] === 'skipped') {
        inSkippedQuery = true
      }
      return chain
    })

    mockChain.order.mockImplementation(() => {
      orderCalls++
      if (inSkippedQuery) {
        inSkippedQuery = false
        // Terminal for step 2: return skipped items
        if (skippedQueryError) {
          return Promise.resolve({ data: null, error: skippedQueryError })
        }
        return Promise.resolve({ data: skippedItems || [], error: null })
      }
      return chain
    })

    // Step 3: reset updates — each .eq('id', ...) on an update resolves
    let resetCallIndex = 0
    const originalUpdate = mockChain.update.getMockImplementation()

    // We need to differentiate between step 3 updates (per skipped item) and step 4 (session_id)
    // Step 3: .update({ status: 'pending', position: N }).eq('id', itemId)
    // Step 4: .update({ session_id: ... }).eq('owner_id', ...).eq('status', 'pending')

    // Track what update was called with to know which eq resolves
    let lastUpdatePayload: Record<string, unknown> | null = null

    mockChain.update.mockImplementation((payload: Record<string, unknown>) => {
      lastUpdatePayload = payload
      return chain
    })

    // eq after update: if it's .eq('id', ...) → step 3 reset
    // if it's .eq('owner_id', ...) → step 4 session assignment (needs second eq to resolve)
    let step4FirstEq = false

    mockChain.eq.mockImplementation((...args: unknown[]) => {
      eqCalls++

      if (args[0] === 'status' && args[1] === 'skipped') {
        inSkippedQuery = true
        return chain
      }

      // Step 3: individual item reset — .eq('id', itemId)
      if (lastUpdatePayload && 'position' in lastUpdatePayload && args[0] === 'id') {
        const error = resetErrors[resetCallIndex] || null
        resetCallIndex++
        lastUpdatePayload = null
        return Promise.resolve({ error })
      }

      // Step 4: session_id update — .eq('owner_id', ...).eq('status', 'pending')
      if (lastUpdatePayload && 'session_id' in lastUpdatePayload) {
        if (args[0] === 'owner_id') {
          step4FirstEq = true
          return chain
        }
        if (step4FirstEq && args[0] === 'status') {
          step4FirstEq = false
          lastUpdatePayload = null
          return Promise.resolve({ error: sessionUpdateError })
        }
      }

      return chain
    })
  }

  it('AC1+AC2+AC3: pending + skipped → skipped re-queued at end with correct positions', async () => {
    setupStartSessionMocks({
      maxPendingPosition: 4, // 5 pending items (positions 0-4)
      skippedItems: [
        { id: 'skip-1' },
        { id: 'skip-2' },
        { id: 'skip-3' },
      ],
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: 'test-session-uuid', error: null })

    // Verify step 1: queried MAX(position) of pending
    expect(mockChain.from).toHaveBeenCalledWith('prospecting_queues')
    expect(mockChain.maybeSingle).toHaveBeenCalled()

    // Verify step 3: each skipped item was updated with correct position
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'pending', position: 5 })
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'pending', position: 6 })
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'pending', position: 7 })

    // Verify step 4: session_id assigned to all pending
    expect(mockChain.update).toHaveBeenCalledWith({ session_id: 'test-session-uuid' })
  })

  it('AC5: no skipped items → identical to previous behavior', async () => {
    setupStartSessionMocks({
      maxPendingPosition: 2,
      skippedItems: [],
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: 'test-session-uuid', error: null })
    // No reset updates should happen — only session_id update
    expect(mockChain.update).toHaveBeenCalledTimes(1)
    expect(mockChain.update).toHaveBeenCalledWith({ session_id: 'test-session-uuid' })
  })

  it('edge case: only skipped items (0 pending) → skipped become pending at positions 0, 1, 2...', async () => {
    setupStartSessionMocks({
      maxPendingPosition: null, // no pending items
      skippedItems: [
        { id: 'skip-a' },
        { id: 'skip-b' },
      ],
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: 'test-session-uuid', error: null })
    // maxPosition = -1, so positions are: -1 + 0 + 1 = 0, -1 + 1 + 1 = 1
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'pending', position: 0 })
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'pending', position: 1 })
  })

  it('edge case: empty queue → returns sessionId without errors', async () => {
    setupStartSessionMocks({
      maxPendingPosition: null,
      skippedItems: [],
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: 'test-session-uuid', error: null })
  })

  it('AC4: return contract is { data: string | null, error: Error | null }', async () => {
    setupStartSessionMocks({
      maxPendingPosition: 0,
      skippedItems: [],
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
    expect(typeof result.data).toBe('string')
    expect(result.error).toBeNull()
  })

  it('error: returns error if skipped reset fails', async () => {
    const resetError = new Error('RLS violation on reset')
    setupStartSessionMocks({
      maxPendingPosition: 3,
      skippedItems: [{ id: 'skip-x' }],
      resetErrors: [resetError],
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: null, error: resetError })
  })

  it('error: returns error if max position query fails (Step 1)', async () => {
    const queryError = new Error('max position query failed')
    setupStartSessionMocks({
      maxPendingPosition: null,
      skippedItems: [],
      maxPosQueryError: queryError,
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: null, error: queryError })
  })

  it('error: returns error if skipped items query fails (Step 2)', async () => {
    const queryError = new Error('skipped query failed')
    setupStartSessionMocks({
      maxPendingPosition: 3,
      skippedItems: null,
      skippedQueryError: queryError,
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: null, error: queryError })
  })

  it('error: returns error if session_id update fails', async () => {
    const sessionError = new Error('session update failed')
    setupStartSessionMocks({
      maxPendingPosition: 0,
      skippedItems: [],
      sessionUpdateError: sessionError,
    })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: null, error: sessionError })
  })

  it('error: unauthenticated user returns error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await prospectingQueuesService.startSession()

    expect(result).toEqual({ data: null, error: new Error('Usuário não autenticado') })
  })
})
