import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContactHistory } from '../components/ContactHistory'
import type { Activity } from '@/types'

// ── Mocks ──────────────────────────────────────────────

const mockActivities: Activity[] = [
  {
    id: 'a-1',
    title: 'Ligação de prospecção',
    type: 'CALL',
    date: new Date().toISOString(),
    completed: true,
    dealTitle: '',
    user: { name: 'Você', avatar: '' },
    metadata: { outcome: 'no_answer', source: 'prospecting' },
  },
  {
    id: 'a-2',
    title: 'Follow-up email',
    type: 'EMAIL',
    date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    completed: true,
    dealTitle: '',
    user: { name: 'Você', avatar: '' },
  },
  {
    id: 'a-3',
    title: 'Reunião agendada',
    type: 'MEETING',
    date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    completed: false,
    dealTitle: '',
    user: { name: 'Você', avatar: '' },
  },
]

let mockData: Activity[] = mockActivities
let mockIsLoading = false

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useContactActivities: () => ({
    data: mockData,
    isLoading: mockIsLoading,
  }),
}))

vi.mock('@/app/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
}))

// ── Tests ──────────────────────────────────────────────

describe('ContactHistory', () => {
  it('renderiza atividades do contato', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    expect(screen.getByText('Histórico')).toBeInTheDocument()
    expect(screen.getByText('Ligação de prospecção')).toBeInTheDocument()
    expect(screen.getByText('Follow-up email')).toBeInTheDocument()
    expect(screen.getByText('Reunião agendada')).toBeInTheDocument()
  })

  it('mostra badge de outcome para CALL', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    expect(screen.getByText('Não atendeu')).toBeInTheDocument()
  })

  it('mostra contagem de atividades no badge', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('colapsa e expande ao clicar', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    expect(screen.getByText('Ligação de prospecção')).toBeInTheDocument()

    // Collapse
    fireEvent.click(screen.getByText('Histórico'))
    expect(screen.queryByText('Ligação de prospecção')).not.toBeInTheDocument()

    // Expand again
    fireEvent.click(screen.getByText('Histórico'))
    expect(screen.getByText('Ligação de prospecção')).toBeInTheDocument()
  })

  it('defaultOpen=false inicia colapsado', () => {
    render(<ContactHistory contactId="c-1" defaultOpen={false} />)
    expect(screen.getByText('Histórico')).toBeInTheDocument()
    expect(screen.queryByText('Ligação de prospecção')).not.toBeInTheDocument()
  })

  it('mostra mensagem quando não há atividades', () => {
    mockData = []
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    expect(screen.getByText('Nenhuma interação registrada')).toBeInTheDocument()
    mockData = mockActivities // restore
  })

  it('mostra skeleton quando loading', () => {
    mockIsLoading = true
    const { container } = render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    const pulses = container.querySelectorAll('.animate-pulse')
    expect(pulses.length).toBe(3)
    mockIsLoading = false
  })
})
