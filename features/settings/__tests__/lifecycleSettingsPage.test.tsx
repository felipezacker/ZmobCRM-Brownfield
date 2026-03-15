import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/lifecycle',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

const mockAddLifecycleStage = vi.fn()
const mockUpdateLifecycleStage = vi.fn()
const mockDeleteLifecycleStage = vi.fn()
const mockReorderLifecycleStages = vi.fn()

const defaultStages = [
  { id: 'lead', name: 'Lead', color: 'bg-blue-500', order: 0, isDefault: true },
  { id: 'mql', name: 'MQL', color: 'bg-green-500', order: 1, isDefault: false },
  { id: 'customer', name: 'Cliente', color: 'bg-yellow-500', order: 2, isDefault: false },
]

const defaultContacts = [
  { id: 'c1', stage: 'lead', name: 'Fulano' },
  { id: 'c2', stage: 'lead', name: 'Ciclano' },
  { id: 'c3', stage: 'mql', name: 'Beltrano' },
]

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    lifecycleStages: defaultStages,
    addLifecycleStage: mockAddLifecycleStage,
    updateLifecycleStage: mockUpdateLifecycleStage,
    deleteLifecycleStage: mockDeleteLifecycleStage,
    reorderLifecycleStages: mockReorderLifecycleStages,
  }),
}))

vi.mock('@/context/contacts/ContactsContext', () => ({
  useContacts: () => ({
    contacts: defaultContacts,
  }),
}))

import LifecycleSettingsPage from '../components/LifecycleSettingsPage'

describe('LifecycleSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza todos os stages com nome correto', () => {
    render(<LifecycleSettingsPage />)
    expect(screen.getByDisplayValue('Lead')).toBeInTheDocument()
    expect(screen.getByDisplayValue('MQL')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Cliente')).toBeInTheDocument()
  })

  it('renderiza header com titulo e descricao', () => {
    render(<LifecycleSettingsPage />)
    expect(screen.getByText('Ciclos de Vida')).toBeInTheDocument()
    expect(screen.getByText(/estagios de maturidade/i)).toBeInTheDocument()
  })

  it('exibe badge de contagem correto por stage', () => {
    render(<LifecycleSettingsPage />)
    const badges = screen.getAllByTitle(/contatos neste estagio/)
    // lead = 2, mql = 1, customer = 0
    expect(badges[0]).toHaveTextContent('2')
    expect(badges[1]).toHaveTextContent('1')
    expect(badges[2]).toHaveTextContent('0')
  })

  it('stage com contatos tem botao de deletar desabilitado', () => {
    render(<LifecycleSettingsPage />)
    const deleteButtons = screen.getAllByLabelText(/Remover estagio/)
    // Lead (isDefault=true, 2 contatos) - disabled
    expect(deleteButtons[0]).toBeDisabled()
    // MQL (isDefault=false, 1 contato) - disabled
    expect(deleteButtons[1]).toBeDisabled()
    // Cliente (isDefault=false, 0 contatos) - enabled
    expect(deleteButtons[2]).not.toBeDisabled()
  })

  it('stage com isDefault tem botao de deletar desabilitado', () => {
    render(<LifecycleSettingsPage />)
    const leadDelete = screen.getAllByLabelText(/Remover estagio/)[0]
    expect(leadDelete).toBeDisabled()
    expect(leadDelete.closest('button')).toHaveAttribute(
      'title',
      'Estagio padrao nao pode ser removido'
    )
  })

  it('adicionar novo stage chama addLifecycleStage', async () => {
    const user = userEvent.setup()
    render(<LifecycleSettingsPage />)

    await user.click(screen.getByText('Adicionar Estagio'))
    const input = screen.getByPlaceholderText('Nome do novo estagio...')
    await user.type(input, 'Prospect')
    await user.click(screen.getByLabelText('Confirmar novo estagio'))

    expect(mockAddLifecycleStage).toHaveBeenCalledWith({
      name: 'Prospect',
      color: 'bg-orange-500', // index 3 % 10
      isDefault: false,
    })
  })

  it('botao Adicionar Estagio mostra form inline', async () => {
    const user = userEvent.setup()
    render(<LifecycleSettingsPage />)

    expect(screen.queryByPlaceholderText('Nome do novo estagio...')).not.toBeInTheDocument()
    await user.click(screen.getByText('Adicionar Estagio'))
    expect(screen.getByPlaceholderText('Nome do novo estagio...')).toBeInTheDocument()
  })

  it('cancelar adicao esconde form inline', async () => {
    const user = userEvent.setup()
    render(<LifecycleSettingsPage />)

    await user.click(screen.getByText('Adicionar Estagio'))
    expect(screen.getByPlaceholderText('Nome do novo estagio...')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Cancelar novo estagio'))
    expect(screen.queryByPlaceholderText('Nome do novo estagio...')).not.toBeInTheDocument()
  })
})
