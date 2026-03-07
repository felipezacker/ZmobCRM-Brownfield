/* eslint-disable no-restricted-syntax */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NoteTemplates } from '../components/NoteTemplates'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

describe('NoteTemplates', () => {
  const onSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Templates by outcome (AC8)', () => {
    it('shows connected templates', () => {
      render(<NoteTemplates outcome="connected" onSelect={onSelect} />)
      expect(screen.getByText('Interessado em visitar imóvel')).toBeInTheDocument()
      expect(screen.getByText('Agendar visita')).toBeInTheDocument()
      expect(screen.getByText('Solicita avaliação do imóvel')).toBeInTheDocument()
      expect(screen.getByText('Retornar em X dias')).toBeInTheDocument()
    })

    it('shows no_answer templates', () => {
      render(<NoteTemplates outcome="no_answer" onSelect={onSelect} />)
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
      expect(screen.getByText('Número incorreto/inexistente')).toBeInTheDocument()
      expect(screen.getByText('Fora de horário comercial')).toBeInTheDocument()
    })

    it('shows voicemail templates', () => {
      render(<NoteTemplates outcome="voicemail" onSelect={onSelect} />)
      expect(screen.getByText('Recado deixado com resumo')).toBeInTheDocument()
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
    })

    it('shows busy templates', () => {
      render(<NoteTemplates outcome="busy" onSelect={onSelect} />)
      expect(screen.getByText('Ocupado, tentar mais tarde')).toBeInTheDocument()
    })
  })

  describe('Click behavior (AC9)', () => {
    it('calls onSelect with template text when chip clicked', () => {
      render(<NoteTemplates outcome="connected" onSelect={onSelect} />)
      fireEvent.click(screen.getByText('Interessado em visitar imóvel'))
      expect(onSelect).toHaveBeenCalledWith('Interessado em visitar imóvel')
    })

    it('calls onSelect for each click (can append)', () => {
      render(<NoteTemplates outcome="connected" onSelect={onSelect} />)
      fireEvent.click(screen.getByText('Agendar visita'))
      fireEvent.click(screen.getByText('Retornar em X dias'))
      expect(onSelect).toHaveBeenCalledTimes(2)
      expect(onSelect).toHaveBeenCalledWith('Agendar visita')
      expect(onSelect).toHaveBeenCalledWith('Retornar em X dias')
    })
  })

  describe('Custom templates', () => {
    it('uses custom templates when provided', () => {
      render(
        <NoteTemplates
          outcome="connected"
          onSelect={onSelect}
          customTemplates={['Custom 1', 'Custom 2']}
        />
      )
      expect(screen.getByText('Custom 1')).toBeInTheDocument()
      expect(screen.getByText('Custom 2')).toBeInTheDocument()
      // Default templates should NOT be shown
      expect(screen.queryByText('Interessado em visitar imóvel')).not.toBeInTheDocument()
    })

    it('falls back to defaults when customTemplates is empty', () => {
      render(
        <NoteTemplates
          outcome="connected"
          onSelect={onSelect}
          customTemplates={[]}
        />
      )
      expect(screen.getByText('Interessado em visitar imóvel')).toBeInTheDocument()
    })
  })

  describe('Rendering as chips', () => {
    it('renders all templates as buttons', () => {
      render(<NoteTemplates outcome="connected" onSelect={onSelect} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(7)
    })

    it('templates are text-only (no HTML rendering)', () => {
      render(
        <NoteTemplates
          outcome="connected"
          onSelect={onSelect}
          customTemplates={['<b>bold</b> text']}
        />
      )
      // Should render as text, not as HTML
      const button = screen.getByText('<b>bold</b> text')
      expect(button.innerHTML).not.toContain('<b>')
    })
  })
})
