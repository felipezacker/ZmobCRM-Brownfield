import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

type MockUser = { id: string }
const mocks = vi.hoisted(() => {
  const state = {
    currentUser: null as MockUser | null,
    profileIsActive: true as boolean | null,
  }

  const nextResponseMock = {
    next: vi.fn((init?: unknown) => ({
      kind: 'next',
      init,
      cookies: {
        set: vi.fn(),
      },
    })),
    redirect: vi.fn((url: unknown) => ({
      kind: 'redirect',
      url,
    })),
  }

  const supabaseSsrMock = {
    createServerClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: state.currentUser } })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: state.profileIsActive !== null ? { is_active: state.profileIsActive } : null,
            })),
          })),
        })),
      })),
      rpc: vi.fn(async () => ({ data: true, error: null })),
    })),
  }

  return { state, nextResponseMock, supabaseSsrMock }
})

vi.mock('next/server', () => ({
  NextResponse: mocks.nextResponseMock,
}))

vi.mock('@supabase/ssr', () => mocks.supabaseSsrMock)

import { updateSession } from '../lib/supabase/middleware'

type MockRequest = {
  nextUrl: {
    pathname: string
    clone(): { pathname: string }
  }
  cookies: {
    getAll(): unknown[]
    set: ReturnType<typeof vi.fn>
  }
}

function makeRequest(pathname: string) {
  const req: MockRequest = {
    nextUrl: {
      pathname,
      clone() {
        return { pathname }
      },
    },
    cookies: {
      getAll() {
        return []
      },
      set: vi.fn(),
    },
  }

  return req as unknown as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.state.currentUser = null
  mocks.state.profileIsActive = true

  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://example.supabase.local')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('updateSession (Proxy/Supabase)', () => {
  it('bypassa /api/* sem chamar Supabase', async () => {
    const req = makeRequest('/api/health')

    const res = await updateSession(req)

    expect(mocks.nextResponseMock.next).toHaveBeenCalledTimes(1)
    expect(mocks.supabaseSsrMock.createServerClient).not.toHaveBeenCalled()
    expect(res).toMatchObject({ kind: 'next' })
  })

  it('permite /setup sem autenticação (sem redirect)', async () => {
    const req = makeRequest('/setup')

    const res = await updateSession(req)

    expect(mocks.nextResponseMock.redirect).not.toHaveBeenCalled()
    expect(res).toMatchObject({ kind: 'next' })
  })

  it('permite /join/* sem autenticação (sem redirect)', async () => {
    const req = makeRequest('/join')

    const res = await updateSession(req)

    expect(mocks.nextResponseMock.redirect).not.toHaveBeenCalled()
    expect(res).toMatchObject({ kind: 'next' })
  })

  it('permite /auth/callback sem autenticação (sem redirect)', async () => {
    const req = makeRequest('/auth/callback')

    const res = await updateSession(req)

    expect(mocks.nextResponseMock.redirect).not.toHaveBeenCalled()
    expect(res).toMatchObject({ kind: 'next' })
  })

  it('redireciona rota protegida para /login quando não autenticado', async () => {
    const req = makeRequest('/dashboard')

    const res = await updateSession(req)

    expect(mocks.nextResponseMock.redirect).toHaveBeenCalledTimes(1)
    const [urlArg] = mocks.nextResponseMock.redirect.mock.calls[0]
    expect(urlArg).toMatchObject({ pathname: '/login' })
    expect(res).toMatchObject({ kind: 'redirect' })
  })

  it('redireciona usuário autenticado para /dashboard quando acessa /login', async () => {
    mocks.state.currentUser = { id: 'user-1' }
    const req = makeRequest('/login')

    const res = await updateSession(req)

    expect(mocks.nextResponseMock.redirect).toHaveBeenCalledTimes(1)
    const [urlArg] = mocks.nextResponseMock.redirect.mock.calls[0]
    expect(urlArg).toMatchObject({ pathname: '/dashboard' })
    expect(res).toMatchObject({ kind: 'redirect' })
  })

  it('redireciona para /blocked quando is_active=false', async () => {
    mocks.state.currentUser = { id: 'user-1' }
    mocks.state.profileIsActive = false
    const req = makeRequest('/dashboard')

    const res = await updateSession(req)

    expect(mocks.nextResponseMock.redirect).toHaveBeenCalledTimes(1)
    const [urlArg] = mocks.nextResponseMock.redirect.mock.calls[0]
    expect(urlArg).toMatchObject({ pathname: '/blocked' })
    expect(res).toMatchObject({ kind: 'redirect' })
  })

  it('permite acesso a /blocked sem loop de redirect', async () => {
    mocks.state.currentUser = { id: 'user-1' }
    mocks.state.profileIsActive = false
    const req = makeRequest('/blocked')

    const res = await updateSession(req)

    // Nao deve redirecionar — /blocked e rota publica
    expect(res).toMatchObject({ kind: 'next' })
  })

  it('permite acesso normal quando is_active=true', async () => {
    mocks.state.currentUser = { id: 'user-1' }
    mocks.state.profileIsActive = true
    const req = makeRequest('/dashboard')

    const res = await updateSession(req)

    // Nao deve redirecionar para /blocked
    expect(res).toMatchObject({ kind: 'next' })
  })
})
