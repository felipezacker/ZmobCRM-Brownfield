import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockPathname = vi.fn(() => '/settings')

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/auth/roles', () => ({
  hasMinRole: (userRole: string, minRole: string) => {
    const hierarchy: Record<string, number> = { corretor: 1, diretor: 2, admin: 3 }
    return (hierarchy[userRole] || 0) >= (hierarchy[minRole] || 0)
  },
}))

import { SettingsSidebar } from './SettingsSidebar'
import { useAuth } from '@/context/AuthContext'

const useAuthMock = vi.mocked(useAuth)

describe('SettingsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/settings')
  })

  it('renderiza todos os itens de navegação para admin', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsSidebar />)

    expect(screen.getByText('Meu Perfil')).toBeInTheDocument()
    expect(screen.getByText('Geral')).toBeInTheDocument()
    expect(screen.getByText('Produtos/Serviços')).toBeInTheDocument()
    expect(screen.getByText('Integrações')).toBeInTheDocument()
    expect(screen.getByText('Central de I.A')).toBeInTheDocument()
    expect(screen.getByText('Dados')).toBeInTheDocument()
    expect(screen.getByText('Equipe')).toBeInTheDocument()
    expect(screen.getByText('Logs de Auditoria')).toBeInTheDocument()
  })

  it('corretor não vê Produtos, Integrações, Equipe nem Logs de Auditoria', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'corretor' },
    } as any)

    render(<SettingsSidebar />)

    expect(screen.getByText('Meu Perfil')).toBeInTheDocument()
    expect(screen.getByText('Geral')).toBeInTheDocument()
    expect(screen.getByText('Central de I.A')).toBeInTheDocument()
    expect(screen.getByText('Dados')).toBeInTheDocument()

    expect(screen.queryByText('Produtos/Serviços')).not.toBeInTheDocument()
    expect(screen.queryByText('Integrações')).not.toBeInTheDocument()
    expect(screen.queryByText('Equipe')).not.toBeInTheDocument()
    expect(screen.queryByText('Logs de Auditoria')).not.toBeInTheDocument()
  })

  it('diretor vê Equipe mas não vê Produtos/Integrações/Auditoria', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'diretor' },
    } as any)

    render(<SettingsSidebar />)

    expect(screen.getByText('Equipe')).toBeInTheDocument()
    expect(screen.queryByText('Produtos/Serviços')).not.toBeInTheDocument()
    expect(screen.queryByText('Integrações')).not.toBeInTheDocument()
    expect(screen.queryByText('Logs de Auditoria')).not.toBeInTheDocument()
  })

  it('item ativo recebe classe de destaque para pathname /settings', () => {
    mockPathname.mockReturnValue('/settings')
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsSidebar />)

    const geralLink = screen.getByText('Geral').closest('a')
    expect(geralLink?.className).toContain('bg-primary-500/10')

    const aiLink = screen.getByText('Central de I.A').closest('a')
    expect(aiLink?.className).not.toContain('bg-primary-500/10')
  })

  it('item ativo para rota /settings/ai', () => {
    mockPathname.mockReturnValue('/settings/ai')
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsSidebar />)

    const aiLink = screen.getByText('Central de I.A').closest('a')
    expect(aiLink?.className).toContain('bg-primary-500/10')

    const geralLink = screen.getByText('Geral').closest('a')
    expect(geralLink?.className).not.toContain('bg-primary-500/10')
  })

  it('botão toggle visível em mobile (tem aria-label correto)', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsSidebar />)

    const toggleButton = screen.getByLabelText('Abrir menu de configurações')
    expect(toggleButton).toBeInTheDocument()

    // Sidebar starts hidden on mobile (class hidden)
    const nav = screen.getByRole('navigation', { name: 'Configurações' })
    expect(nav.className).toContain('hidden')

    // Click toggle opens sidebar
    fireEvent.click(toggleButton)
    expect(nav.className).toContain('block')

    // Toggle label changes
    expect(screen.getByLabelText('Fechar menu de configurações')).toBeInTheDocument()
  })

  it('nav tem aria-label Configurações', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsSidebar />)

    const nav = screen.getByRole('navigation', { name: 'Configurações' })
    expect(nav).toBeInTheDocument()
  })
})
