import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// --- Mocks ---

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/equipe',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

let mockCurrentProfile: { id: string; role: string } = { id: 'admin-1', role: 'admin' }

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: mockCurrentProfile,
  }),
}))

vi.mock('../hooks/useInviteModal', () => ({
  useInviteModal: () => ({
    isModalOpen: false,
    setIsModalOpen: vi.fn(),
    newUserRole: 'corretor',
    setNewUserRole: vi.fn(),
    sendingInvites: false,
    error: null,
    activeInvites: [],
    expirationDays: 7,
    setExpirationDays: vi.fn(),
    closeModal: vi.fn(),
    handleGenerateLink: vi.fn(),
    handleDeleteInvite: vi.fn(),
    copyLink: vi.fn(),
  }),
}))

// Default mock state — overridden per test via mockUserListReturn
const defaultMockReturn = {
  users: [] as Array<{ id: string; email: string; role: string; full_name: string | null; is_active: boolean; organization_id: string; created_at: string; status: 'active'; last_sign_in_at: string | null }>,
  loading: false,
  actionLoading: null,
  userToDelete: null,
  setUserToDelete: vi.fn(),
  handleDeleteUser: vi.fn(),
  confirmDeleteUser: vi.fn(),
  handleUpdateRole: vi.fn(),
  handleToggleActive: vi.fn(),
  activeCount: 0,
  maxUsers: null as number | null,
  isAtLimit: false,
}

let mockUserListReturn = { ...defaultMockReturn }

vi.mock('../hooks/useUserList', () => ({
  useUserList: () => mockUserListReturn,
}))

import { UsersPage } from '../UsersPage'

function makeUsers(count: number, inactiveCount = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    email: `user${i}@test.com`,
    role: i === 0 ? 'admin' : 'corretor',
    full_name: `User ${i}`,
    is_active: i >= count - inactiveCount ? false : true,
    organization_id: 'org-1',
    created_at: '2025-01-01T00:00:00Z',
    status: 'active' as const,
    last_sign_in_at: null,
  }))
}

describe('UsersPage — ST-6.3 (Limite de Usuarios)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentProfile = { id: 'admin-1', role: 'admin' }
    mockUserListReturn = { ...defaultMockReturn }
  })

  // AC1: Indicador "8/10 membros" quando max_users=10 e 8 ativos
  it('exibe indicador "8/10 membros" com max_users=10 e 8 ativos', () => {
    const users = makeUsers(10, 2) // 10 users, 2 inactive = 8 active
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 8,
      maxUsers: 10,
      isAtLimit: false,
    }

    render(<UsersPage />)
    expect(screen.getByText(/8\/10 membros/)).toBeInTheDocument()
  })

  // AC2: Botao "Convidar" desabilitado quando no limite (10/10)
  it('desabilita botao Convidar quando limite atingido', () => {
    const users = makeUsers(10)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 10,
      maxUsers: 10,
      isAtLimit: true,
    }

    render(<UsersPage />)
    const inviteButton = screen.getByRole('button', { name: /convidar/i })
    expect(inviteButton).toBeDisabled()
  })

  // AC2: Mensagem "Limite de usuarios atingido (10/10)"
  it('exibe mensagem de limite atingido', () => {
    const users = makeUsers(10)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 10,
      maxUsers: 10,
      isAtLimit: true,
    }

    render(<UsersPage />)
    expect(screen.getByText(/Limite de usuarios atingido \(10\/10\)/)).toBeInTheDocument()
  })

  // AC3: Sem indicador de limite quando max_users=null
  it('exibe apenas contagem simples quando max_users e null', () => {
    const users = makeUsers(5)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 5,
      maxUsers: null,
      isAtLimit: false,
    }

    render(<UsersPage />)
    expect(screen.getByText(/5 membros/)).toBeInTheDocument()
    // Nao deve ter formato X/Y
    expect(screen.queryByText(/5\/\d+ membros/)).not.toBeInTheDocument()
  })

  // AC3: Convites ilimitados quando max_users=null
  it('botao Convidar habilitado quando max_users e null', () => {
    const users = makeUsers(100)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 100,
      maxUsers: null,
      isAtLimit: false,
    }

    render(<UsersPage />)
    const inviteButton = screen.getByRole('button', { name: /convidar/i })
    expect(inviteButton).not.toBeDisabled()
  })

  // AC4: Membro inativo nao conta no activeCount
  it('inativo nao conta no activeCount (8 total, 1 inativo = 7 ativos)', () => {
    const users = makeUsers(8, 1) // 8 users, 1 inactive = 7 active
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 7,
      maxUsers: 10,
      isAtLimit: false,
    }

    render(<UsersPage />)
    expect(screen.getByText(/7\/10 membros/)).toBeInTheDocument()
  })

  // Barra de progresso: verde (<80%), amarelo (80-99%), vermelho (100%)
  it('exibe barra de progresso quando max_users definido', () => {
    const users = makeUsers(5)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 5,
      maxUsers: 10,
      isAtLimit: false,
    }

    const { container } = render(<UsersPage />)
    const progressBar = container.querySelector('.bg-emerald-500')
    expect(progressBar).toBeInTheDocument()
  })

  it('barra amarela quando 80-99% do limite', () => {
    const users = makeUsers(9)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 9,
      maxUsers: 10,
      isAtLimit: false,
    }

    const { container } = render(<UsersPage />)
    const progressBar = container.querySelector('.bg-amber-500')
    expect(progressBar).toBeInTheDocument()
  })

  it('barra vermelha quando 100% do limite', () => {
    const users = makeUsers(10)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 10,
      maxUsers: 10,
      isAtLimit: true,
    }

    const { container } = render(<UsersPage />)
    const progressBar = container.querySelector('.bg-red-500')
    expect(progressBar).toBeInTheDocument()
  })

  // Sem barra de progresso quando max_users=null
  it('nao exibe barra de progresso quando max_users e null', () => {
    const users = makeUsers(5)
    mockUserListReturn = {
      ...defaultMockReturn,
      users,
      activeCount: 5,
      maxUsers: null,
      isAtLimit: false,
    }

    const { container } = render(<UsersPage />)
    expect(container.querySelector('.bg-emerald-500')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-amber-500')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-red-500')).not.toBeInTheDocument()
  })
})
