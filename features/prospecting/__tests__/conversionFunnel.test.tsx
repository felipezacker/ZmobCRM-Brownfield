import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConversionFunnel } from '../components/ConversionFunnel'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'

// Mock recharts to avoid canvas/SVG issues in happy-dom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="pie" data-slices={data.length}>{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => null,
}))

// Mock useDarkMode
vi.mock('../hooks/useDarkMode', () => ({
  useDarkMode: () => false,
}))

const makeMetrics = (overrides?: Partial<ProspectingMetrics>): ProspectingMetrics => ({
  totalCalls: 100,
  connectedCalls: 28,
  connectionRate: 28,
  avgDuration: 120,
  uniqueContacts: 45,
  byDay: [],
  byOutcome: [
    { outcome: 'connected', count: 28 },
    { outcome: 'no_answer', count: 40 },
    { outcome: 'voicemail', count: 15 },
    { outcome: 'busy', count: 12 },
  ],
  byBroker: [],
  ...overrides,
})

describe('ConversionFunnel', () => {
  it('renders skeleton when loading', () => {
    const { container } = render(
      <ConversionFunnel metrics={null} isLoading={true} />,
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders empty state when metrics is null', () => {
    render(<ConversionFunnel metrics={null} isLoading={false} />)
    expect(screen.getByText('Nenhuma ligacao registrada no periodo')).toBeInTheDocument()
  })

  it('renders empty state when totalCalls is 0', () => {
    const emptyMetrics = makeMetrics({ totalCalls: 0, byOutcome: [] })
    render(<ConversionFunnel metrics={emptyMetrics} isLoading={false} />)
    expect(screen.getByText('Nenhuma ligacao registrada no periodo')).toBeInTheDocument()
  })

  it('renders title "Distribuicao de Resultados"', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    expect(screen.getByText('Distribuicao de Resultados')).toBeInTheDocument()
  })

  it('renders donut chart with correct number of slices', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    const pie = screen.getByTestId('pie')
    // 4 outcomes from byOutcome + 1 "other" (100 - 28 - 40 - 15 - 12 = 5)
    expect(pie).toHaveAttribute('data-slices', '5')
  })

  it('shows connection rate in center and summary', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    // Center label and summary both show "28.0%"
    const rateElements = screen.getAllByText('28.0%')
    expect(rateElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Conexao" label in donut center', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    expect(screen.getByText('Conexao')).toBeInTheDocument()
  })

  it('renders legend with outcome names', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    expect(screen.getByText('Atendidas')).toBeInTheDocument()
    expect(screen.getByText('Sem Resposta')).toBeInTheDocument()
    expect(screen.getByText('Correio de Voz')).toBeInTheDocument()
    expect(screen.getByText('Ocupado')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
  })

  it('renders legend with counts', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    // '28' appears multiple times (legend + summary), so use getAllByText
    expect(screen.getAllByText('28').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders summary row with 4 stats', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    expect(screen.getByText('Conversao')).toBeInTheDocument()
    expect(screen.getByText('Respostas')).toBeInTheDocument()
    expect(screen.getByText('Nao Atenderam')).toBeInTheDocument()
    expect(screen.getByText('Contatos Unicos')).toBeInTheDocument()
  })

  it('shows unique contacts count in summary', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('hides "Outro" slice when other count is 0', () => {
    const metrics = makeMetrics({
      totalCalls: 95,
      byOutcome: [
        { outcome: 'connected', count: 28 },
        { outcome: 'no_answer', count: 40 },
        { outcome: 'voicemail', count: 15 },
        { outcome: 'busy', count: 12 },
      ],
    })
    render(<ConversionFunnel metrics={metrics} isLoading={false} />)
    const pie = screen.getByTestId('pie')
    expect(pie).toHaveAttribute('data-slices', '4')
    expect(screen.queryByText('Outro')).not.toBeInTheDocument()
  })

  it('shows total calls count in header', () => {
    render(<ConversionFunnel metrics={makeMetrics()} isLoading={false} />)
    expect(screen.getByText('100 ligacoes no total')).toBeInTheDocument()
  })

  it('shows singular "ligacao" for single call', () => {
    const metrics = makeMetrics({
      totalCalls: 1,
      byOutcome: [{ outcome: 'connected', count: 1 }],
    })
    render(<ConversionFunnel metrics={metrics} isLoading={false} />)
    expect(screen.getByText('1 ligacao no total')).toBeInTheDocument()
  })
})
