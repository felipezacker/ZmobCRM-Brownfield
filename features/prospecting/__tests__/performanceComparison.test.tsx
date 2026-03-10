import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerformanceComparison } from '../components/PerformanceComparison'
import type { BrokerMetric } from '../hooks/useProspectingMetrics'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))

const makeMetric = (overrides?: Partial<BrokerMetric>): BrokerMetric => ({
  ownerId: 'u1',
  ownerName: 'User',
  totalCalls: 50,
  connectedCalls: 20,
  connectionRate: 40,
  avgDuration: 120,
  uniqueContacts: 30,
  ...overrides,
})

describe('PerformanceComparison', () => {
  it('AC8: nao renderiza para admin/diretor', () => {
    const { container } = render(
      <PerformanceComparison
        userMetrics={makeMetric()}
        teamAverage={makeMetric()}
        isAdminOrDirector={true}
        periodDays={7}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('nao renderiza se userMetrics null', () => {
    const { container } = render(
      <PerformanceComparison
        userMetrics={null}
        teamAverage={makeMetric()}
        isAdminOrDirector={false}
        periodDays={7}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('nao renderiza se teamAverage null', () => {
    const { container } = render(
      <PerformanceComparison
        userMetrics={makeMetric()}
        teamAverage={null}
        isAdminOrDirector={false}
        periodDays={7}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('AC5: renderiza 4 cards de comparacao para corretor', () => {
    render(
      <PerformanceComparison
        userMetrics={makeMetric()}
        teamAverage={makeMetric({ totalCalls: 40, connectionRate: 35, avgDuration: 100, uniqueContacts: 25 })}
        isAdminOrDirector={false}
        periodDays={7}
      />,
    )

    expect(screen.getByText('Você vs. Média do Time')).toBeInTheDocument()
    expect(screen.getByText('Ligações/dia')).toBeInTheDocument()
    expect(screen.getByText('Taxa de Conexão')).toBeInTheDocument()
    expect(screen.getByText('Duração Média')).toBeInTheDocument()
    expect(screen.getByText('Contatos Únicos')).toBeInTheDocument()
  })

  it('AC6: mostra indicador verde quando acima da media (>5%)', () => {
    const { container } = render(
      <PerformanceComparison
        userMetrics={makeMetric({ connectionRate: 50 })}
        teamAverage={makeMetric({ connectionRate: 30 })}
        isAdminOrDirector={false}
        periodDays={7}
      />,
    )
    // TrendingUp icon should be present (green indicator)
    const svgs = container.querySelectorAll('.text-green-500')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('AC7: mostra indicador vermelho quando abaixo da media (>5%)', () => {
    const { container } = render(
      <PerformanceComparison
        userMetrics={makeMetric({ connectionRate: 20 })}
        teamAverage={makeMetric({ connectionRate: 40 })}
        isAdminOrDirector={false}
        periodDays={7}
      />,
    )
    // TrendingDown icon should be present (red indicator)
    const svgs = container.querySelectorAll('.text-red-500')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('mostra indicador cinza quando dentro de ±5%', () => {
    const { container } = render(
      <PerformanceComparison
        userMetrics={makeMetric({ connectionRate: 40 })}
        teamAverage={makeMetric({ connectionRate: 41 })}
        isAdminOrDirector={false}
        periodDays={7}
      />,
    )
    // Minus icon should be present (gray indicator)
    const svgs = container.querySelectorAll('.text-gray-400')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('calcula calls/dia corretamente com periodDays', () => {
    render(
      <PerformanceComparison
        userMetrics={makeMetric({ totalCalls: 70 })}
        teamAverage={makeMetric({ totalCalls: 35 })}
        isAdminOrDirector={false}
        periodDays={7}
      />,
    )
    // user: 70/7 = 10.0, team: 35/7 = 5.0
    expect(screen.getByText('10.0')).toBeInTheDocument()
    expect(screen.getByText('5.0')).toBeInTheDocument()
  })
})
