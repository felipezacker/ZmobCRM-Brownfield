import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
import { PERMISSION_DESCRIPTIONS } from '@/lib/auth/roles'

const useAuthMock = vi.mocked(useAuth)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function renderAdmin() {
  useAuthMock.mockReturnValue({
    profile: { role: 'admin', organization_id: 'org-1' },
  } as any)

  const Wrapper = createWrapper()
  return render(
    React.createElement(Wrapper, null, React.createElement(PermissionsPage))
  )
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
      React.createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        React.createElement(PermissionsPage)
      )
    )

    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument()
  })

  it('shows permissions grid for admin with all descriptions', () => {
    renderAdmin()

    // Labels
    expect(screen.getByText('Permissoes por Cargo')).toBeInTheDocument()
    expect(screen.getByText('Ver Relatorios')).toBeInTheDocument()
    expect(screen.getByText('Editar Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Gerenciar Equipe')).toBeInTheDocument()
    expect(screen.getByText('Exportar Dados')).toBeInTheDocument()
    expect(screen.getByText('Acessar I.A')).toBeInTheDocument()
    expect(screen.getByText('Ver Todos os Contatos')).toBeInTheDocument()

    // ST-7.1: All 6 descriptions rendered
    for (const description of Object.values(PERMISSION_DESCRIPTIONS)) {
      expect(screen.getByText(description)).toBeInTheDocument()
    }
  })

  it('shows role column headers', () => {
    renderAdmin()

    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Diretor')).toBeInTheDocument()
    expect(screen.getByText('Corretor')).toBeInTheDocument()
  })

  it('has 18 toggle checkboxes (6 permissions x 3 roles)', () => {
    renderAdmin()
    expect(screen.getAllByRole('checkbox')).toHaveLength(18)
  })

  it('save button is disabled when no changes', () => {
    renderAdmin()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  // ST-7.1 Subtask 5.2: Visual indicator and change counter
  it('shows visual indicator, counter, and clears on discard', () => {
    renderAdmin()

    expect(screen.queryAllByTitle('Alterado')).toHaveLength(0)
    expect(screen.queryByText(/alterac/)).not.toBeInTheDocument()

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    expect(screen.getAllByTitle('Alterado')).toHaveLength(1)
    expect(screen.getByText('1 alteracao nao salva')).toBeInTheDocument()

    fireEvent.click(checkboxes[1])
    expect(screen.getByText('2 alteracoes nao salvas')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }))
    expect(screen.queryAllByTitle('Alterado')).toHaveLength(0)
  })

  // ST-7.1 Subtask 5.3: Confirmation modal
  it('opens confirmation modal with changes and can cancel', () => {
    renderAdmin()

    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(screen.getByText('Confirmar alteracoes')).toBeInTheDocument()
    expect(screen.getByText(/1 permissao sera alterada/)).toBeInTheDocument()
    expect(screen.getAllByText('ON').length).toBeGreaterThan(0)
    expect(screen.getAllByText('OFF').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByText('Confirmar alteracoes')).not.toBeInTheDocument()
  })

  // ST-7.1 Subtask 5.4: Users per role count
  it('shows users per role count in column headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        users: [],
        usersPerRole: { admin: 1, diretor: 2, corretor: 3 },
        maxUsers: 10,
      }),
    }) as any

    renderAdmin()

    await waitFor(() => {
      expect(screen.getByText('(1 usuario)')).toBeInTheDocument()
      expect(screen.getByText('(2 usuarios)')).toBeInTheDocument()
      expect(screen.getByText('(3 usuarios)')).toBeInTheDocument()
    })
  })
})
