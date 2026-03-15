import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// --- Mocks ---

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/equipe',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

const mockAddToast = vi.fn()
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

const mockHandleUpdateRole = vi.fn()
const mockHandleDeleteUser = vi.fn()
const mockConfirmDeleteUser = vi.fn()
const mockHandleToggleActive = vi.fn()

const mockUsers = [
  {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'admin',
    full_name: 'João Admin',
    is_active: true,
    organization_id: 'org-1',
    created_at: '2025-01-01T00:00:00Z',
    status: 'active' as const,
    last_sign_in_at: '2026-03-10T14:30:00Z',
  },
  {
    id: 'diretor-1',
    email: 'diretor@test.com',
    role: 'diretor',
    full_name: 'Maria Diretora',
    is_active: true,
    organization_id: 'org-1',
    created_at: '2025-02-01T00:00:00Z',
    status: 'active' as const,
    last_sign_in_at: '2026-03-08T10:00:00Z',
  },
  {
    id: 'corretor-1',
    email: 'corretor@test.com',
    role: 'corretor',
    full_name: null,
    is_active: true,
    organization_id: 'org-1',
    created_at: '2025-03-01T00:00:00Z',
    status: 'active' as const,
    last_sign_in_at: null,
  },
  {
    id: 'inactive-1',
    email: 'inativo@test.com',
    role: 'corretor',
    full_name: 'Carlos Inativo',
    is_active: false,
    organization_id: 'org-1',
    created_at: '2025-04-01T00:00:00Z',
    status: 'active' as const,
    last_sign_in_at: '2026-01-01T00:00:00Z',
  },
]

let mockCurrentProfile: { id: string; role: string } = { id: 'admin-1', role: 'admin' }

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: mockCurrentProfile,
  }),
}))

vi.mock('../hooks/useUserList', () => ({
  useUserList: () => ({
    users: mockUsers,
    loading: false,
    actionLoading: null,
    userToDelete: null,
    setUserToDelete: vi.fn(),
    handleDeleteUser: mockHandleDeleteUser,
    confirmDeleteUser: mockConfirmDeleteUser,
    handleUpdateRole: mockHandleUpdateRole,
    handleToggleActive: mockHandleToggleActive,
    activeCount: mockUsers.filter((u) => u.is_active !== false).length,
    maxUsers: null,
    isAtLimit: false,
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

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

import { UsersPage } from '../UsersPage'

describe('UsersPage — ST-3.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentProfile = { id: 'admin-1', role: 'admin' }
  })

  // AC2: full_name exibido quando disponivel
  it('exibe full_name quando disponivel', () => {
    render(<UsersPage />)
    expect(screen.getByText('João Admin')).toBeInTheDocument()
    expect(screen.getByText('Maria Diretora')).toBeInTheDocument()
  })

  // AC3: email como fallback quando full_name e null
  it('exibe email como fallback quando full_name e null', () => {
    render(<UsersPage />)
    // corretor-1 tem full_name null, deve mostrar email como nome principal
    const emailElements = screen.getAllByText('corretor@test.com')
    // Deve aparecer pelo menos uma vez como identificador principal
    expect(emailElements.length).toBeGreaterThanOrEqual(1)
  })

  // AC2: quando full_name existe, email aparece como texto secundario
  it('exibe email abaixo do nome quando full_name existe', () => {
    render(<UsersPage />)
    // admin@test.com deve aparecer como texto secundario (abaixo de João Admin)
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('diretor@test.com')).toBeInTheDocument()
  })

  // AC4: formato DD/MM quando last_sign_in_at e uma data valida
  it('exibe ultimo acesso formatado DD/MM', () => {
    render(<UsersPage />)
    expect(screen.getByText('10/03')).toBeInTheDocument() // admin
    expect(screen.getByText('08/03')).toBeInTheDocument() // diretor
  })

  // AC4: "Nunca acessou" quando last_sign_in_at e null
  it('exibe "Nunca acessou" quando last_sign_in_at e null', () => {
    render(<UsersPage />)
    expect(screen.getByText('Nunca acessou')).toBeInTheDocument()
  })

  // AC1: dropdown de role renderiza para admin olhando para outro usuario
  it('renderiza dropdown de role para admin vendo outros usuarios', () => {
    render(<UsersPage />)
    // Deve ter 3 selects (diretor-1, corretor-1, inactive-1 — mas nao admin-1 que e o proprio)
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(3)
  })

  // AC5: dropdown de role NAO renderiza para nao-admin
  it('NAO renderiza dropdown de role para usuario diretor', () => {
    mockCurrentProfile = { id: 'diretor-1', role: 'diretor' }
    render(<UsersPage />)
    const selects = screen.queryAllByRole('combobox')
    expect(selects).toHaveLength(0)
  })

  // AC6: dropdown de role NAO renderiza para o proprio admin (proprio ID)
  it('NAO renderiza dropdown de role para o proprio admin', () => {
    render(<UsersPage />)
    // admin-1 e o currentUser, nao deve ter select para ele
    const selects = screen.getAllByRole('combobox')
    // 3 selects: diretor-1, corretor-1, inactive-1 (nao admin-1)
    expect(selects).toHaveLength(3)
  })

  // AC1: handleUpdateRole e chamado com parametros corretos
  it('chama handleUpdateRole ao alterar role via dropdown', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    const selects = screen.getAllByRole('combobox')
    // Alterar role do primeiro select (diretor-1)
    await user.selectOptions(selects[0], 'corretor')

    expect(mockHandleUpdateRole).toHaveBeenCalledWith('diretor-1', 'corretor')
  })

  // AC5: corretor ve "Acesso Restrito"
  it('corretor ve mensagem "Acesso Restrito"', () => {
    mockCurrentProfile = { id: 'corretor-1', role: 'corretor' }
    render(<UsersPage />)
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument()
  })
})

describe('UsersPage — ST-3.2 (Desativar/Busca)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentProfile = { id: 'admin-1', role: 'admin' }
  })

  // AC4: busca filtra por full_name
  it('filtra lista por full_name', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...')
    await user.type(searchInput, 'Maria')

    expect(screen.getByText('Maria Diretora')).toBeInTheDocument()
    expect(screen.queryByText('João Admin')).not.toBeInTheDocument()
    expect(screen.queryByText('Carlos Inativo')).not.toBeInTheDocument()
  })

  // AC4: busca filtra por email
  it('filtra lista por email', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...')
    await user.type(searchInput, 'corretor@')

    const emailElements = screen.getAllByText('corretor@test.com')
    expect(emailElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('João Admin')).not.toBeInTheDocument()
  })

  // AC4: busca vazia exibe todos
  it('busca vazia exibe todos os membros', () => {
    render(<UsersPage />)

    expect(screen.getByText('João Admin')).toBeInTheDocument()
    expect(screen.getByText('Maria Diretora')).toBeInTheDocument()
    expect(screen.getByText('Carlos Inativo')).toBeInTheDocument()
  })

  // AC5: membro inativo exibe badge "Inativo"
  it('exibe badge "Inativo" para membro com is_active=false', () => {
    render(<UsersPage />)
    expect(screen.getByText('Inativo')).toBeInTheDocument()
  })

  // AC5: membro inativo tem opacity-50
  it('aplica opacity-50 no container do membro inativo', () => {
    render(<UsersPage />)
    const inactiveCard = screen.getByTestId('user-card-inactive-1')
    expect(inactiveCard.className).toContain('opacity-50')
  })

  // AC6: botao "Desativar" NAO aparece para o proprio admin
  it('nao exibe botao Desativar para o proprio admin', () => {
    render(<UsersPage />)
    // admin-1 e o currentUser, nao deve ter botao de desativar para ele
    const deactivateButtons = screen.getAllByTitle('Desativar usuário')
    // Deve haver botoes para os outros ativos (diretor-1 e corretor-1), mas nao para admin-1
    deactivateButtons.forEach((btn) => {
      // Verifica que nenhum botao de desativar esta dentro do card do admin-1
      const card = btn.closest('[data-testid]')
      expect(card?.getAttribute('data-testid')).not.toBe('user-card-admin-1')
    })
  })

  // AC1: handleToggleActive chamado com is_active=false ao desativar (via confirm modal)
  it('chama handleToggleActive com false ao confirmar Desativar', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    const deactivateButtons = screen.getAllByTitle('Desativar usuário')
    await user.click(deactivateButtons[0])

    // Modal de confirmacao aparece
    const confirmButton = screen.getByText('Desativar')
    await user.click(confirmButton)

    expect(mockHandleToggleActive).toHaveBeenCalledWith(expect.any(String), false)
  })

  // AC2: handleToggleActive chamado com is_active=true ao reativar (via confirm modal)
  it('chama handleToggleActive com true ao confirmar Reativar', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    const reactivateButton = screen.getByTitle('Reativar usuário')
    await user.click(reactivateButton)

    // Modal de confirmacao aparece
    const confirmButton = screen.getByText('Reativar')
    await user.click(confirmButton)

    expect(mockHandleToggleActive).toHaveBeenCalledWith('inactive-1', true)
  })

  // Botao Reativar aparece para membro inativo
  it('exibe botao Reativar para membro inativo', () => {
    render(<UsersPage />)
    expect(screen.getByTitle('Reativar usuário')).toBeInTheDocument()
  })
})
