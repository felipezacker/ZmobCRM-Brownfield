import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockResendSend = vi.fn()

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockResendSend }
    },
  }
})

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/security/sameOrigin', () => ({
  isAllowedOrigin: () => true,
}))

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    ...overrides,
  }
  return chain
}

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/settings/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/settings/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.RESEND_API_KEY = 'test-key'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
  })

  it('sends email successfully via Resend (Subtask 3.1)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = makeChain()

      if (fromCallCount === 1) {
        // profiles -> me (admin)
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        // organization_invites -> check duplicate (none found)
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      } else if (fromCallCount === 3) {
        // organization_invites -> rate limit count
        chain.select = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 2 }),
          }),
        })
      } else if (fromCallCount === 4) {
        // organization_invites -> insert
        chain.insert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'inv-1',
                token: 'tok-abc123',
                role: 'corretor',
                email: 'test@example.com',
                created_at: new Date().toISOString(),
                expires_at: null,
                used_at: null,
                created_by: 'user-1',
              },
              error: null,
            }),
          }),
        })
      }

      return chain
    })

    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const { POST } = await import('@/app/api/settings/invite/route')
    const res = await POST(buildRequest({ email: 'test@example.com', role: 'corretor' }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.emailSent).toBe(true)
    expect(body.invite.token).toBe('tok-abc123')
    expect(mockResendSend).toHaveBeenCalledTimes(1)
  })

  it('returns invite + link when Resend fails (Subtask 3.2)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = makeChain()

      if (fromCallCount === 1) {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      } else if (fromCallCount === 3) {
        chain.select = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        })
      } else if (fromCallCount === 4) {
        chain.insert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'inv-2',
                token: 'tok-fallback',
                role: 'corretor',
                email: 'test@example.com',
                created_at: new Date().toISOString(),
                expires_at: null,
                used_at: null,
                created_by: 'user-1',
              },
              error: null,
            }),
          }),
        })
      }

      return chain
    })

    mockResendSend.mockRejectedValue(new Error('Resend API error'))

    const { POST } = await import('@/app/api/settings/invite/route')
    const res = await POST(buildRequest({ email: 'test@example.com', role: 'corretor' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.emailSent).toBe(false)
    expect(body.link).toContain('/join?token=tok-fallback')
    expect(body.invite.token).toBe('tok-fallback')
  })

  it('returns 429 when rate limit exceeded (Subtask 3.3)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = makeChain()

      if (fromCallCount === 1) {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      } else if (fromCallCount === 3) {
        // Rate limit: 10 invites in the last hour
        chain.select = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 10 }),
          }),
        })
      }

      return chain
    })

    const { POST } = await import('@/app/api/settings/invite/route')
    const res = await POST(buildRequest({ email: 'test@example.com', role: 'corretor' }))

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toContain('10 convites/hora')
  })

  it('returns 400 for invalid email (Subtask 3.4)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = makeChain()

      if (fromCallCount === 1) {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      }

      return chain
    })

    const { POST } = await import('@/app/api/settings/invite/route')
    const res = await POST(buildRequest({ email: 'not-an-email', role: 'corretor' }))

    expect(res.status).toBe(400)
  })

  it('returns 403 for non-admin user (Subtask 3.5)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = makeChain()

      if (fromCallCount === 1) {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'user-2', role: 'diretor', organization_id: 'org-1' },
          error: null,
        })
      }

      return chain
    })

    const { POST } = await import('@/app/api/settings/invite/route')
    const res = await POST(buildRequest({ email: 'test@example.com', role: 'corretor' }))

    expect(res.status).toBe(403)
  })

  it('returns 409 for duplicate pending invite (Subtask 3.6)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = makeChain()

      if (fromCallCount === 1) {
        chain.single = vi.fn().mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        // Existing pending invite found
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: 'existing-inv' },
          error: null,
        })
      }

      return chain
    })

    const { POST } = await import('@/app/api/settings/invite/route')
    const res = await POST(buildRequest({ email: 'already@invited.com', role: 'corretor' }))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('convite pendente')
  })

  it('returns 503 when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY

    const { POST } = await import('@/app/api/settings/invite/route')
    const res = await POST(buildRequest({ email: 'test@example.com', role: 'corretor' }))

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toContain('not configured')
  })
})
