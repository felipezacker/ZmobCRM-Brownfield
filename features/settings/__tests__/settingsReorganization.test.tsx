import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// --- Mocks ---

let mockPathname = '/settings/empresa'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { role: 'admin', organization_id: 'org-1' },
    organizationId: 'org-1',
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: 'Imob Test', cnpj: '12.345.678/0001-00', creci: 'CRECI-123', phone: '11999990000' },
          }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}))

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    availableTags: [],
    addTag: vi.fn(),
    removeTag: vi.fn(),
    renameTag: vi.fn(),
    updateTagColor: vi.fn(),
    updateTagDescription: vi.fn(),
    customFieldDefinitions: [],
    addCustomField: vi.fn(),
    updateCustomField: vi.fn(),
    removeCustomField: vi.fn(),
  }),
}))

// --- Imports after mocks ---

import { SettingsSidebar } from '../components/SettingsSidebar'
import { CompanySettings } from '../components/CompanySettings'

describe('SettingsSidebar - ST-4.3 reorganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/settings/empresa'
  })

  it('exibe "Empresa" no lugar de "Geral" na sidebar', () => {
    render(<SettingsSidebar />)
    expect(screen.getByText('Empresa')).toBeInTheDocument()
    expect(screen.queryByText('Geral')).not.toBeInTheDocument()
  })

  it('exibe entrada "Tags" na sidebar', () => {
    render(<SettingsSidebar />)
    expect(screen.getByText('Tags')).toBeInTheDocument()
  })

  it('exibe entrada "Campos" na sidebar', () => {
    render(<SettingsSidebar />)
    expect(screen.getByText('Campos')).toBeInTheDocument()
  })

  it('link Empresa aponta para /settings/empresa', () => {
    render(<SettingsSidebar />)
    const empresaLink = screen.getByText('Empresa').closest('a')
    expect(empresaLink).toHaveAttribute('href', '/settings/empresa')
  })

  it('link Tags aponta para /settings/tags', () => {
    render(<SettingsSidebar />)
    const tagsLink = screen.getByText('Tags').closest('a')
    expect(tagsLink).toHaveAttribute('href', '/settings/tags')
  })

  it('link Campos aponta para /settings/campos', () => {
    render(<SettingsSidebar />)
    const camposLink = screen.getByText('Campos').closest('a')
    expect(camposLink).toHaveAttribute('href', '/settings/campos')
  })
})

describe('CompanySettings - ST-4.3', () => {
  it('renderiza titulo "Empresa"', async () => {
    render(<CompanySettings />)
    expect(screen.getByText('Empresa')).toBeInTheDocument()
    // Wait for async loadCompany to settle
    await waitFor(() => {
      expect(screen.getByText('Nome da Empresa')).toBeInTheDocument()
    })
  })

  it('renderiza campos do formulario apos carregar dados', async () => {
    render(<CompanySettings />)
    await waitFor(() => {
      expect(screen.getByText('Nome da Empresa')).toBeInTheDocument()
    })
    expect(screen.getByText('CNPJ')).toBeInTheDocument()
    expect(screen.getByText('CRECI')).toBeInTheDocument()
    expect(screen.getByText('Telefone')).toBeInTheDocument()
  })

  it('renderiza botao Salvar para admin apos carregar', async () => {
    render(<CompanySettings />)
    await waitFor(() => {
      expect(screen.getByText('Salvar')).toBeInTheDocument()
    })
  })
})

describe('/settings redirect - ST-4.3', () => {
  it('settings page redirects to /settings/empresa', async () => {
    const { redirect } = await import('next/navigation')
    const SettingsPage = (await import('@/app/(protected)/settings/page')).default

    expect(() => render(<SettingsPage />)).toThrow('NEXT_REDIRECT:/settings/empresa')
    expect(redirect).toHaveBeenCalledWith('/settings/empresa')
  })
})
