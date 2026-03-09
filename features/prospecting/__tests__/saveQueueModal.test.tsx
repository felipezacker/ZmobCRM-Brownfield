/* eslint-disable no-restricted-syntax */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SaveQueueModal } from '../components/SaveQueueModal'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

describe('SaveQueueModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
    isAdminOrDirector: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when closed', () => {
    const { container } = render(<SaveQueueModal {...defaultProps} isOpen={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders modal when open', () => {
    render(<SaveQueueModal {...defaultProps} />)
    expect(screen.getByText('Salvar Fila')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex: Leads frios 30 dias')).toBeInTheDocument()
    expect(screen.getByText('Salvar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('shows validation error for empty name', async () => {
    render(<SaveQueueModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Salvar'))
    expect(screen.getByText('Nome da fila é obrigatório')).toBeInTheDocument()
    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with name and isShared=false for corretor', async () => {
    render(<SaveQueueModal {...defaultProps} />)
    const input = screen.getByPlaceholderText('Ex: Leads frios 30 dias')
    fireEvent.change(input, { target: { value: 'Leads frios 30 dias' } })
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith('Leads frios 30 dias', false)
    })
  })

  it('shows share toggle for admin/director', () => {
    render(<SaveQueueModal {...defaultProps} isAdminOrDirector={true} />)
    expect(screen.getByText('Compartilhar com equipe')).toBeInTheDocument()
  })

  it('does not show share toggle for corretor', () => {
    render(<SaveQueueModal {...defaultProps} isAdminOrDirector={false} />)
    expect(screen.queryByText('Compartilhar com equipe')).not.toBeInTheDocument()
  })

  it('calls onSave with isShared=true when checked', async () => {
    render(<SaveQueueModal {...defaultProps} isAdminOrDirector={true} />)
    const input = screen.getByPlaceholderText('Ex: Leads frios 30 dias')
    fireEvent.change(input, { target: { value: 'Fila teste' } })
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith('Fila teste', true)
    })
  })

  it('calls onClose when Cancelar clicked', () => {
    render(<SaveQueueModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('disables save button when isSaving', () => {
    render(<SaveQueueModal {...defaultProps} isSaving={true} />)
    expect(screen.getByText('Salvando...')).toBeInTheDocument()
  })

  it('saves on Enter key press', async () => {
    render(<SaveQueueModal {...defaultProps} />)
    const input = screen.getByPlaceholderText('Ex: Leads frios 30 dias')
    fireEvent.change(input, { target: { value: 'Test queue' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith('Test queue', false)
    })
  })

  it('closes on Escape key press', () => {
    render(<SaveQueueModal {...defaultProps} />)
    const input = screen.getByPlaceholderText('Ex: Leads frios 30 dias')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
