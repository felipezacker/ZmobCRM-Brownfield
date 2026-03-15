import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/empresa',
  useSearchParams: () => ({
    get: () => null,
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: 'Test Org', cnpj: null, creci: null, phone: null },
          }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}))

import { CompanySettings } from './components/CompanySettings'
import { useAuth } from '@/context/AuthContext'

const useAuthMock = vi.mocked(useAuth)

describe('CompanySettings RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('corretor ve formulario mas campos estao desabilitados', async () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'corretor', organization_id: 'org-1' },
      organizationId: 'org-1',
    } as any)

    render(<CompanySettings />)

    await waitFor(() => {
      expect(screen.getByText('Nome da Empresa')).toBeInTheDocument()
    })

    // Campos existem mas disabled
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input) => {
      expect(input).toBeDisabled()
    })

    // Botao Salvar NAO aparece
    expect(screen.queryByText('Salvar')).not.toBeInTheDocument()
  })

  it('admin ve formulario com campos editaveis e botao Salvar', async () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin', organization_id: 'org-1' },
      organizationId: 'org-1',
    } as any)

    render(<CompanySettings />)

    await waitFor(() => {
      expect(screen.getByText('Nome da Empresa')).toBeInTheDocument()
    })

    // Campos existem e habilitados
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input) => {
      expect(input).not.toBeDisabled()
    })

    // Botao Salvar aparece
    expect(screen.getByText('Salvar')).toBeInTheDocument()
  })
})
