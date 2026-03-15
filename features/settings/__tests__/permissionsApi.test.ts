import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks for server-side API route ---

const mockUpsert = vi.fn()

const mockSupabaseChain = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  upsert: mockUpsert,
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

describe('PUT /api/settings/permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
  })

  it('upserts permissions correctly for admin (6.4)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = mockSupabaseChain()

      if (fromCallCount === 1) {
        // profiles -> me (admin)
        chain.single.mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      } else if (fromCallCount === 2) {
        // role_permissions -> upsert
        mockUpsert.mockResolvedValue({ error: null })
      }

      return chain
    })

    const { PUT } = await import('@/app/api/settings/permissions/route')

    const req = new Request('http://localhost/api/settings/permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        permissions: [
          { role: 'corretor', permission: 'ver_relatorios', enabled: true },
          { role: 'diretor', permission: 'gerenciar_equipe', enabled: true },
        ],
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)

    // Verify upsert was called with onConflict
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          organization_id: 'org-1',
          role: 'corretor',
          permission: 'ver_relatorios',
          enabled: true,
        }),
        expect.objectContaining({
          organization_id: 'org-1',
          role: 'diretor',
          permission: 'gerenciar_equipe',
          enabled: true,
        }),
      ]),
      { onConflict: 'organization_id,role,permission' },
    )
  })

  it('returns 403 for non-admin user (6.5)', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = mockSupabaseChain()

      if (fromCallCount === 1) {
        // profiles -> me (corretor, NOT admin)
        chain.single.mockResolvedValue({
          data: { id: 'user-2', role: 'corretor', organization_id: 'org-1' },
          error: null,
        })
      }

      return chain
    })

    const { PUT } = await import('@/app/api/settings/permissions/route')

    const req = new Request('http://localhost/api/settings/permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        permissions: [
          { role: 'corretor', permission: 'ver_relatorios', enabled: true },
        ],
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body.error).toMatch(/admin/i)
  })

  it('returns 400 for invalid permission name', async () => {
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      const chain = mockSupabaseChain()

      if (fromCallCount === 1) {
        chain.single.mockResolvedValue({
          data: { id: 'user-1', role: 'admin', organization_id: 'org-1' },
          error: null,
        })
      }

      return chain
    })

    const { PUT } = await import('@/app/api/settings/permissions/route')

    const req = new Request('http://localhost/api/settings/permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        permissions: [
          { role: 'corretor', permission: 'permissao_inventada', enabled: true },
        ],
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 for unauthenticated user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    const { PUT } = await import('@/app/api/settings/permissions/route')

    const req = new Request('http://localhost/api/settings/permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ permissions: [] }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(401)
  })
})
