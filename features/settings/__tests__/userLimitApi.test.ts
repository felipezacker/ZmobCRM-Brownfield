import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks for server-side API route ---

const mockSupabaseChain = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
})

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
  createStaticAdminClient: vi.fn(),
}))

vi.mock('@/lib/security/sameOrigin', () => ({
  isAllowedOrigin: () => true,
}))

vi.mock('@/lib/auth/roles', () => ({
  hasMinRole: () => true,
}))

describe('POST /api/admin/invites — ST-6.3 (Server-side limit)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
  })

  it('retorna 422 quando limite atingido (AC5)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = mockSupabaseChain()

      if (fromCallCount === 1) {
        // profiles -> me
        chain.single.mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        // organizations -> max_users=5
        chain.single.mockResolvedValue({
          data: { max_users: 5 },
          error: null,
        })
      } else if (fromCallCount === 3) {
        // profiles count -> 5 active (at limit)
        const innerChain = mockSupabaseChain()
        innerChain.eq.mockResolvedValue({ count: 5, error: null })
        chain.eq.mockReturnValue(innerChain)
      }

      return chain
    })

    const { POST } = await import('@/app/api/admin/invites/route')

    const req = new Request('http://localhost/api/admin/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'corretor' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(422)

    const body = await res.json()
    expect(body.error).toMatch(/Limite de usuarios atingido/)
  })

  it('permite convite quando max_users e null (AC3)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = mockSupabaseChain()

      if (fromCallCount === 1) {
        // profiles -> me
        chain.single.mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        // organizations -> null (unlimited)
        chain.single.mockResolvedValue({
          data: { max_users: null },
          error: null,
        })
      } else if (fromCallCount === 3) {
        // insert -> invite created
        chain.single.mockResolvedValue({
          data: { id: 'inv-1', token: 'abc123', role: 'corretor', email: null, created_at: '2026-01-01', expires_at: null, used_at: null, created_by: 'user-1' },
          error: null,
        })
      }

      return chain
    })

    const { POST } = await import('@/app/api/admin/invites/route')

    const req = new Request('http://localhost/api/admin/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'corretor' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('permite convite quando abaixo do limite (AC5 complemento)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = mockSupabaseChain()

      if (fromCallCount === 1) {
        chain.single.mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        chain.single.mockResolvedValue({
          data: { max_users: 10 },
          error: null,
        })
      } else if (fromCallCount === 3) {
        // 8 active users, limit 10 -> OK
        const innerChain = mockSupabaseChain()
        innerChain.eq.mockResolvedValue({ count: 8, error: null })
        chain.eq.mockReturnValue(innerChain)
      } else if (fromCallCount === 4) {
        // insert
        chain.single.mockResolvedValue({
          data: { id: 'inv-2', token: 'def456', role: 'corretor', email: null, created_at: '2026-01-01', expires_at: null, used_at: null, created_by: 'user-1' },
          error: null,
        })
      }

      return chain
    })

    const { POST } = await import('@/app/api/admin/invites/route')

    const req = new Request('http://localhost/api/admin/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'corretor' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
