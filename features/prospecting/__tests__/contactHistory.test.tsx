import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ContactHistory } from '../components/ContactHistory'
import type { Activity } from '@/types'
import type { OpenDeal } from '@/lib/supabase/deals'

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
let mockDealResult: OpenDeal | null = null
let mockDealShouldReject = false

vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useContactActivities: () => ({
    data: mockData,
    isLoading: mockIsLoading,
  }),
}))

vi.mock('@/lib/supabase/deals', () => ({
  getOpenDealsByContact: () => mockDealShouldReject
    ? Promise.reject(new Error('Network error'))
    : Promise.resolve(mockDealResult),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
}))

// ── Tests ──────────────────────────────────────────────

describe('ContactHistory', () => {
  beforeEach(() => {
    mockData = mockActivities
    mockIsLoading = false
    mockDealResult = null
    mockDealShouldReject = false
  })

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
  })

  it('mostra skeleton quando loading', () => {
    mockIsLoading = true
    const { container } = render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    const pulses = container.querySelectorAll('.animate-pulse')
    expect(pulses.length).toBeGreaterThanOrEqual(3)
    mockIsLoading = false
  })

  // ── Deal Context Block Tests (CP-6.1) ──────────────────

  it('exibe bloco de deal quando getOpenDealsByContact retorna dados válidos', async () => {
    mockDealResult = {
      id: 'd-1',
      title: 'Apartamento Jardins',
      value: 450000,
      property_ref: 'APT-101',
      product_name: null,
      stage_id: 's-1',
      stage_name: 'Visita Agendada',
    }
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Apartamento Jardins')).toBeInTheDocument()
    })
    expect(screen.getByText('R$ 450.000,00')).toBeInTheDocument()
    expect(screen.getByText('Visita Agendada')).toBeInTheDocument()
  })

  it('não exibe bloco de deal quando retorna null', async () => {
    mockDealResult = null
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Histórico')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Deal em andamento')).not.toBeInTheDocument()
  })

  it('exibe skeleton de deal durante loading', () => {
    // Initially the deal hook is loading (useEffect async)
    mockDealResult = null
    const { container } = render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    const pulses = container.querySelectorAll('.animate-pulse')
    expect(pulses.length).toBeGreaterThanOrEqual(1)
  })

  it('degrada graciosamente quando getOpenDealsByContact rejeita', async () => {
    mockDealShouldReject = true
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.queryByLabelText('Deal em andamento')).not.toBeInTheDocument()
    })
    // Timeline still renders
    expect(screen.getByText('Ligação de prospecção')).toBeInTheDocument()
  })

  it('exibe nota em destaque quando há atividade com type NOTE', async () => {
    mockData = [
      ...mockActivities,
      {
        id: 'a-note',
        title: 'Nota importante',
        type: 'NOTE',
        description: 'Prefere ligação sexta manhã',
        date: new Date().toISOString(),
        completed: false,
        dealTitle: '',
        user: { name: 'Você', avatar: '' },
      },
    ]
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Última nota')).toBeInTheDocument()
    })
    const noteSection = screen.getByLabelText('Última nota')
    expect(within(noteSection).getByText('Prefere ligação sexta manhã')).toBeInTheDocument()
  })

  it('não exibe nota em destaque quando não há notas', async () => {
    mockData = mockActivities // no NOTE type
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Histórico')).toBeInTheDocument()
    })
    expect(screen.queryByText('Última nota')).not.toBeInTheDocument()
  })

  it('formata valor do deal corretamente em BRL', async () => {
    mockDealResult = {
      id: 'd-2',
      title: 'Casa Praia',
      value: 1250000.5,
      property_ref: null,
      product_name: null,
      stage_id: 's-1',
      stage_name: 'Proposta',
    }
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('R$ 1.250.000,50')).toBeInTheDocument()
    })
  })

  it('omite property_ref quando null', async () => {
    mockDealResult = {
      id: 'd-3',
      title: 'Sala Comercial',
      value: 200000,
      property_ref: null,
      product_name: null,
      stage_id: 's-1',
      stage_name: 'Negociação',
    }
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Sala Comercial')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Imóvel:/)).not.toBeInTheDocument()
  })

  it('exibe property_ref quando presente', async () => {
    mockDealResult = {
      id: 'd-4',
      title: 'Cobertura Centro',
      value: 800000,
      property_ref: 'COB-501',
      product_name: null,
      stage_id: 's-1',
      stage_name: 'Proposta',
    }
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Imóvel: COB-501')).toBeInTheDocument()
    })
  })

  it('exibe product_name como imóvel quando disponível', async () => {
    mockDealResult = {
      id: 'd-6',
      title: 'Deal com produto',
      value: 350000,
      property_ref: null,
      product_name: 'Liv Residencial',
      stage_id: 's-1',
      stage_name: 'Visita Agendada',
    }
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Imóvel: Liv Residencial')).toBeInTheDocument()
    })
  })

  it('omite valor quando deal.value é null', async () => {
    mockDealResult = {
      id: 'd-5',
      title: 'Terreno Rural',
      value: null,
      property_ref: 'TER-10',
      product_name: null,
      stage_id: 's-1',
      stage_name: 'Qualificação',
    }
    render(<ContactHistory contactId="c-1" defaultOpen={true} />)
    await waitFor(() => {
      expect(screen.getByText('Terreno Rural')).toBeInTheDocument()
    })
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument()
    expect(screen.getByText('Qualificação')).toBeInTheDocument()
    expect(screen.getByText('Imóvel: TER-10')).toBeInTheDocument()
  })
})
