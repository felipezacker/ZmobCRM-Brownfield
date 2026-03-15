import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock supabase — configurable response
let mockPermissionsData: { role: string; permission: string; enabled: boolean }[] = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: mockPermissionsData, error: null }),
      }),
    }),
  },
}))

// Mock auth context
const mockProfile = {
  id: 'user-1',
  email: 'test@test.com',
  organization_id: 'org-1',
  role: 'corretor' as const,
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    profile: mockProfile,
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
    organizationId: 'org-1',
  })),
}))

import { useAuth } from '@/context/AuthContext'
const useAuthMock = vi.mocked(useAuth)

// Must import after mocks
import { usePermission, useAllOrgPermissions } from '../usePermission'
import { DEFAULT_PERMISSIONS } from '../roles'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('usePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      profile: mockProfile,
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
      organizationId: 'org-1',
    } as any)
  })

  it('returns defaults when role_permissions is empty (corretor)', () => {
    const { result } = renderHook(() => usePermission('ver_relatorios'), {
      wrapper: createWrapper(),
    })
    // corretor default: ver_relatorios = false
    expect(result.current).toBe(false)
  })

  it('returns defaults when role_permissions is empty (corretor — acessar_ia)', () => {
    const { result } = renderHook(() => usePermission('acessar_ia'), {
      wrapper: createWrapper(),
    })
    // corretor default: acessar_ia = true
    expect(result.current).toBe(true)
  })

  it('returns true for admin defaults', () => {
    useAuthMock.mockReturnValue({
      profile: { ...mockProfile, role: 'admin' },
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
      organizationId: 'org-1',
    } as any)

    const { result } = renderHook(() => usePermission('ver_relatorios'), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(true)
  })

  it('returns false for diretor gerenciar_equipe default', () => {
    useAuthMock.mockReturnValue({
      profile: { ...mockProfile, role: 'diretor' },
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
      organizationId: 'org-1',
    } as any)

    const { result } = renderHook(() => usePermission('gerenciar_equipe'), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(false)
  })

  it('respects custom saved permissions (6.2)', async () => {
    // Corretor default: ver_relatorios = false
    // Custom override: ver_relatorios = true
    mockPermissionsData = [
      { role: 'corretor', permission: 'ver_relatorios', enabled: true },
    ]

    const { result } = renderHook(() => usePermission('ver_relatorios'), {
      wrapper: createWrapper(),
    })

    // Wait for query to resolve
    await vi.waitFor(() => {
      expect(result.current).toBe(true)
    })

    // Reset for other tests
    mockPermissionsData = []
  })

  it('custom disabled overrides default enabled (6.2)', async () => {
    // Corretor default: acessar_ia = true
    // Custom override: acessar_ia = false
    mockPermissionsData = [
      { role: 'corretor', permission: 'acessar_ia', enabled: false },
    ]

    const { result } = renderHook(() => usePermission('acessar_ia'), {
      wrapper: createWrapper(),
    })

    await vi.waitFor(() => {
      expect(result.current).toBe(false)
    })

    mockPermissionsData = []
  })

  it('returns false when user has no role', () => {
    useAuthMock.mockReturnValue({
      profile: null,
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
      organizationId: null,
    } as any)

    const { result } = renderHook(() => usePermission('ver_relatorios'), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBe(false)
  })
})

describe('useAllOrgPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      profile: mockProfile,
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
      organizationId: 'org-1',
    } as any)
  })

  it('returns all defaults when no custom permissions', () => {
    const { result } = renderHook(() => useAllOrgPermissions(), {
      wrapper: createWrapper(),
    })

    expect(result.current.admin).toEqual(DEFAULT_PERMISSIONS.admin)
    expect(result.current.diretor).toEqual(DEFAULT_PERMISSIONS.diretor)
    expect(result.current.corretor).toEqual(DEFAULT_PERMISSIONS.corretor)
  })
})

describe('DEFAULT_PERMISSIONS', () => {
  it('admin has all permissions enabled', () => {
    const adminPerms = DEFAULT_PERMISSIONS.admin
    for (const value of Object.values(adminPerms)) {
      expect(value).toBe(true)
    }
  })

  it('corretor has restrictive defaults', () => {
    const corretorPerms = DEFAULT_PERMISSIONS.corretor
    expect(corretorPerms.ver_relatorios).toBe(false)
    expect(corretorPerms.editar_pipeline).toBe(false)
    expect(corretorPerms.gerenciar_equipe).toBe(false)
    expect(corretorPerms.exportar_dados).toBe(false)
    expect(corretorPerms.acessar_ia).toBe(true)
    expect(corretorPerms.ver_todos_contatos).toBe(false)
  })

  it('diretor has gerenciar_equipe disabled by default', () => {
    expect(DEFAULT_PERMISSIONS.diretor.gerenciar_equipe).toBe(false)
    expect(DEFAULT_PERMISSIONS.diretor.ver_relatorios).toBe(true)
    expect(DEFAULT_PERMISSIONS.diretor.exportar_dados).toBe(true)
  })
})
