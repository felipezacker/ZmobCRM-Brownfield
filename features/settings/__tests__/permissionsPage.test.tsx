import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/permissions',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}))

import { useAuth } from '@/context/AuthContext'
import { PermissionsPage } from '../PermissionsPage'

const useAuthMock = vi.mocked(useAuth)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('PermissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows access restricted for non-admin', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'corretor', organization_id: 'org-1' },
    } as any)

    render(
      React.createElement(QueryClientProvider, {
        client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
        children: React.createElement(PermissionsPage),
      })
    )

    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument()
  })

  it('shows permissions grid for admin', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin', organization_id: 'org-1' },
    } as any)

    const Wrapper = createWrapper()
    render(
      React.createElement(Wrapper, {
        children: React.createElement(PermissionsPage),
      })
    )

    expect(screen.getByText('Permissoes por Cargo')).toBeInTheDocument()
    expect(screen.getByText('Ver Relatorios')).toBeInTheDocument()
    expect(screen.getByText('Editar Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Gerenciar Equipe')).toBeInTheDocument()
    expect(screen.getByText('Exportar Dados')).toBeInTheDocument()
    expect(screen.getByText('Acessar I.A')).toBeInTheDocument()
    expect(screen.getByText('Ver Todos os Contatos')).toBeInTheDocument()
  })

  it('shows role column headers', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin', organization_id: 'org-1' },
    } as any)

    const Wrapper = createWrapper()
    render(
      React.createElement(Wrapper, {
        children: React.createElement(PermissionsPage),
      })
    )

    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Diretor')).toBeInTheDocument()
    expect(screen.getByText('Corretor')).toBeInTheDocument()
  })

  it('has 18 toggle checkboxes (6 permissions x 3 roles)', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin', organization_id: 'org-1' },
    } as any)

    const Wrapper = createWrapper()
    render(
      React.createElement(Wrapper, {
        children: React.createElement(PermissionsPage),
      })
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(18)
  })

  it('save button is disabled when no changes', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin', organization_id: 'org-1' },
    } as any)

    const Wrapper = createWrapper()
    render(
      React.createElement(Wrapper, {
        children: React.createElement(PermissionsPage),
      })
    )

    const saveButton = screen.getByRole('button', { name: /salvar/i })
    expect(saveButton).toBeDisabled()
  })
})
