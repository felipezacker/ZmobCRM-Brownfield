import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlertsBlock } from '@/features/command-center/components/AlertsBlock'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockAlerts = [
  {
    type: 'stagnant_deals' as const,
    severity: 'high' as const,
    message: '3 propostas paradas há 7+ dias nos últimos estágios do funil',
    affectedCount: 3,
    data: [],
  },
  {
    type: 'hot_leads_inactive' as const,
    severity: 'medium' as const,
    message: '5 leads HOT sem atividade há 3+ dias',
    affectedCount: 5,
    data: [],
  },
]

describe('AlertsBlock', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders without crashing', () => {
    render(<AlertsBlock alerts={[]} />)
    expect(screen.getByText('Alertas Ativos')).toBeTruthy()
  })

  it('shows empty state when no alerts', () => {
    render(<AlertsBlock alerts={[]} />)
    expect(screen.getByText('Nenhum alerta ativo.')).toBeTruthy()
  })

  it('renders alert list', () => {
    render(<AlertsBlock alerts={mockAlerts} />)
    expect(screen.getByText('Propostas Paradas')).toBeTruthy()
    expect(screen.getByText('Leads HOT Inativos')).toBeTruthy()
  })

  it('shows critical count badge', () => {
    render(<AlertsBlock alerts={mockAlerts} />)
    expect(screen.getByText('1 crítico')).toBeTruthy()
  })

  it('navigates on alert click', () => {
    render(<AlertsBlock alerts={mockAlerts} />)
    fireEvent.click(screen.getByText('Propostas Paradas'))
    expect(mockPush).toHaveBeenCalledWith('/boards')
  })

  it('navigates to contacts on hot leads click', () => {
    render(<AlertsBlock alerts={mockAlerts} />)
    fireEvent.click(screen.getByText('Leads HOT Inativos'))
    expect(mockPush).toHaveBeenCalledWith('/contacts')
  })
})
