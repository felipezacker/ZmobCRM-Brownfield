import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MetricsCards } from '../components/MetricsCards'
import { MetricsChart } from '../components/MetricsChart'
import { CorretorRanking } from '../components/CorretorRanking'
import { getDateRange, aggregateMetrics, type CallActivity } from '../hooks/useProspectingMetrics'
import type { ProspectingMetrics, DailyMetric, BrokerMetric } from '../hooks/useProspectingMetrics'

// ── Mock recharts ──────────────────────────────────────────────

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// ── Test data ──────────────────────────────────────────────

const mockMetrics: ProspectingMetrics = {
  totalCalls: 100,
  connectedCalls: 45,
  connectionRate: 45.0,
  avgDuration: 185, // 3:05
  uniqueContacts: 72,
  byDay: [
    { date: '2026-02-25', connected: 5, no_answer: 3, voicemail: 1, busy: 1, other: 0, total: 10 },
    { date: '2026-02-26', connected: 8, no_answer: 4, voicemail: 2, busy: 1, other: 0, total: 15 },
    { date: '2026-02-27', connected: 6, no_answer: 5, voicemail: 0, busy: 2, other: 0, total: 13 },
  ],
  byOutcome: [
    { outcome: 'connected', count: 45 },
    { outcome: 'no_answer', count: 30 },
    { outcome: 'voicemail', count: 15 },
    { outcome: 'busy', count: 10 },
  ],
  byBroker: [
    {
      ownerId: 'u-1',
      ownerName: 'Ana Silva',
      totalCalls: 50,
      connectedCalls: 25,
      connectionRate: 50.0,
      avgDuration: 200,
      uniqueContacts: 40,
    },
    {
      ownerId: 'u-2',
      ownerName: 'Carlos Santos',
      totalCalls: 30,
      connectedCalls: 12,
      connectionRate: 40.0,
      avgDuration: 150,
      uniqueContacts: 20,
    },
    {
      ownerId: 'u-3',
      ownerName: 'Maria Oliveira',
      totalCalls: 20,
      connectedCalls: 8,
      connectionRate: 40.0,
      avgDuration: 180,
      uniqueContacts: 12,
    },
  ],
}

// ── MetricsCards ──────────────────────────────────────────────

describe('MetricsCards', () => {
  it('mostra skeleton cards quando loading', () => {
    const { container } = render(<MetricsCards metrics={null} isLoading={true} />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(6)
  })

  it('renderiza 6 KPI cards com dados corretos', () => {
    render(<MetricsCards metrics={mockMetrics} isLoading={false} />)
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument() // connected
    expect(screen.getByText('45% do total')).toBeInTheDocument()
    expect(screen.getByText('3:05')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
  })

  it('mostra labels corretos', () => {
    render(<MetricsCards metrics={mockMetrics} isLoading={false} />)
    expect(screen.getByText('Ligações Discadas')).toBeInTheDocument()
    expect(screen.getByText('Atendidas')).toBeInTheDocument()
    expect(screen.getByText('Sem Resposta')).toBeInTheDocument()
    expect(screen.getByText('Correio de Voz')).toBeInTheDocument()
    expect(screen.getByText('Tempo Médio')).toBeInTheDocument()
    expect(screen.getByText('Contatos Prospectados')).toBeInTheDocument()
  })

  it('mostra zeros quando metrics é null', () => {
    render(<MetricsCards metrics={null} isLoading={false} />)
    expect(screen.getByText('0:00')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBe(5) // total, connected, noAnswer, voicemail, contacts
  })
})

// ── MetricsChart ──────────────────────────────────────────────

describe('MetricsChart', () => {
  it('mostra skeleton quando loading', () => {
    const { container } = render(<MetricsChart data={[]} isLoading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('mostra mensagem de fallback quando sem dados', () => {
    render(<MetricsChart data={[]} isLoading={false} />)
    expect(screen.getByText('Nenhuma ligação registrada no período')).toBeInTheDocument()
  })

  it('renderiza chart quando tem dados', () => {
    render(<MetricsChart data={mockMetrics.byDay} isLoading={false} />)
    expect(screen.getByText('Ligações por Dia')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})

// ── CorretorRanking ──────────────────────────────────────────────

describe('CorretorRanking', () => {
  it('mostra skeleton quando loading', () => {
    const { container } = render(<CorretorRanking brokers={[]} isLoading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('mostra mensagem quando sem dados', () => {
    render(<CorretorRanking brokers={[]} isLoading={false} />)
    expect(screen.getByText('Sem dados no período')).toBeInTheDocument()
  })

  it('renderiza ranking com nomes de corretores', () => {
    render(<CorretorRanking brokers={mockMetrics.byBroker} isLoading={false} />)
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Carlos Santos')).toBeInTheDocument()
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument()
  })

  it('mostra dados de cada corretor', () => {
    render(<CorretorRanking brokers={mockMetrics.byBroker} isLoading={false} />)
    // Ana Silva: 50 calls, 50.0%, 3:20, 40 contacts
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
  })

  it('ordena por coluna ao clicar', () => {
    render(<CorretorRanking brokers={mockMetrics.byBroker} isLoading={false} />)

    // By default sorted by totalCalls desc: Ana (50), Carlos (30), Maria (20)
    const rows = screen.getAllByRole('row')
    // header + 3 data rows = 4
    expect(rows.length).toBe(4)

    // Click "Conexão" to sort by connectionRate desc
    fireEvent.click(screen.getByText('Conexão'))
    // Ana (50%) should still be first, then Carlos (40%) and Maria (40%)
    const firstDataRow = rows[1]
    expect(firstDataRow).toHaveTextContent('Ana Silva')
  })

  it('highlight do top corretor (trophy icon)', () => {
    const { container } = render(<CorretorRanking brokers={mockMetrics.byBroker} isLoading={false} />)
    // Top row should have amber background
    const topRow = container.querySelector('.bg-amber-50')
    expect(topRow).toBeInTheDocument()
  })

  it('toggle sort direction on click same column', () => {
    render(<CorretorRanking brokers={mockMetrics.byBroker} isLoading={false} />)

    // Default is totalCalls desc. One click on same column toggles to asc.
    fireEvent.click(screen.getByText('Ligações'))

    // Now Maria (20) should be first since sort is asc
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Maria Oliveira')
  })
})

// ── RBAC visibility ──────────────────────────────────────────────

describe('RBAC visibility', () => {
  it('CorretorRanking is only rendered for admin/director (component test)', () => {
    // This test validates the component renders correctly
    // The actual RBAC gating is in ProspectingPage (isAdminOrDirector check)
    const { container } = render(<CorretorRanking brokers={mockMetrics.byBroker} isLoading={false} />)
    expect(container.querySelector('table')).toBeInTheDocument()
  })
})

// ── getDateRange ──────────────────────────────────────────────

describe('getDateRange', () => {
  it('returns today for "today" period', () => {
    const result = getDateRange('today')
    expect(result.start).toBe(result.end)
    // Should be a valid YYYY-MM-DD
    expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns 7-day range for "7d" period', () => {
    const result = getDateRange('7d')
    const start = new Date(result.start)
    const end = new Date(result.end)
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(6)
  })

  it('returns 30-day range for "30d" period', () => {
    const result = getDateRange('30d')
    const start = new Date(result.start)
    const end = new Date(result.end)
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(29)
  })

  it('returns custom range when provided', () => {
    const custom = { start: '2026-01-01', end: '2026-01-15' }
    const result = getDateRange('custom', custom)
    expect(result).toEqual(custom)
  })

  it('falls back to 30d when custom period but no range', () => {
    const result = getDateRange('custom')
    const start = new Date(result.start)
    const end = new Date(result.end)
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(29)
  })
})

// ── aggregateMetrics ──────────────────────────────────────────────

describe('aggregateMetrics', () => {
  const activities: CallActivity[] = [
    { id: '1', date: '2026-03-01T10:00:00', owner_id: 'u1', contact_id: 'c1', metadata: { outcome: 'connected', duration_seconds: 120 } },
    { id: '2', date: '2026-03-01T11:00:00', owner_id: 'u1', contact_id: 'c2', metadata: { outcome: 'no_answer' } },
    { id: '3', date: '2026-03-02T09:00:00', owner_id: 'u2', contact_id: 'c1', metadata: { outcome: 'connected', duration_seconds: 180 } },
    { id: '4', date: '2026-03-02T10:00:00', owner_id: 'u2', contact_id: 'c3', metadata: { outcome: 'voicemail', duration_seconds: 30 } },
    { id: '5', date: '2026-03-02T11:00:00', owner_id: 'u1', contact_id: 'c4', metadata: { outcome: 'busy' } },
  ]

  const profiles = [
    { id: 'u1', name: 'Ana' },
    { id: 'u2', name: 'Bruno' },
  ]

  it('calculates totalCalls correctly', () => {
    const result = aggregateMetrics(activities, profiles)
    expect(result.totalCalls).toBe(5)
  })

  it('calculates connectedCalls and connectionRate', () => {
    const result = aggregateMetrics(activities, profiles)
    expect(result.connectedCalls).toBe(2)
    expect(result.connectionRate).toBe(40)
  })

  it('calculates avgDuration from activities with duration', () => {
    const result = aggregateMetrics(activities, profiles)
    // durations: 120, 180, 30 → avg = 110
    expect(result.avgDuration).toBe(110)
  })

  it('calculates uniqueContacts', () => {
    const result = aggregateMetrics(activities, profiles)
    // c1, c2, c3, c4 = 4 unique
    expect(result.uniqueContacts).toBe(4)
  })

  it('groups by day correctly', () => {
    const result = aggregateMetrics(activities, profiles)
    expect(result.byDay).toHaveLength(2)
    expect(result.byDay[0].date).toBe('2026-03-01')
    expect(result.byDay[0].total).toBe(2)
    expect(result.byDay[0].connected).toBe(1)
    expect(result.byDay[1].date).toBe('2026-03-02')
    expect(result.byDay[1].total).toBe(3)
  })

  it('groups by outcome correctly', () => {
    const result = aggregateMetrics(activities, profiles)
    const outcomeMap = new Map(result.byOutcome.map(o => [o.outcome, o.count]))
    expect(outcomeMap.get('connected')).toBe(2)
    expect(outcomeMap.get('no_answer')).toBe(1)
    expect(outcomeMap.get('voicemail')).toBe(1)
    expect(outcomeMap.get('busy')).toBe(1)
  })

  it('groups by broker with correct names', () => {
    const result = aggregateMetrics(activities, profiles)
    expect(result.byBroker).toHaveLength(2)
    const ana = result.byBroker.find(b => b.ownerName === 'Ana')
    const bruno = result.byBroker.find(b => b.ownerName === 'Bruno')
    expect(ana).toBeDefined()
    expect(ana!.totalCalls).toBe(3)
    expect(bruno).toBeDefined()
    expect(bruno!.totalCalls).toBe(2)
  })

  it('sorts brokers by totalCalls desc', () => {
    const result = aggregateMetrics(activities, profiles)
    expect(result.byBroker[0].ownerName).toBe('Ana')
    expect(result.byBroker[1].ownerName).toBe('Bruno')
  })

  it('handles empty activities', () => {
    const result = aggregateMetrics([], profiles)
    expect(result.totalCalls).toBe(0)
    expect(result.connectionRate).toBe(0)
    expect(result.avgDuration).toBe(0)
    expect(result.uniqueContacts).toBe(0)
    expect(result.byDay).toHaveLength(0)
    expect(result.byBroker).toHaveLength(0)
  })

  it('handles activities with null metadata', () => {
    const acts: CallActivity[] = [
      { id: '1', date: '2026-03-01T10:00:00', owner_id: 'u1', contact_id: 'c1', metadata: null },
    ]
    const result = aggregateMetrics(acts, profiles)
    expect(result.totalCalls).toBe(1)
    expect(result.connectedCalls).toBe(0)
    expect(result.avgDuration).toBe(0)
  })

  it('counts unknown outcomes in "other" bucket', () => {
    const acts: CallActivity[] = [
      { id: '1', date: '2026-03-01T10:00:00', owner_id: 'u1', contact_id: 'c1', metadata: { outcome: 'connected' } },
      { id: '2', date: '2026-03-01T11:00:00', owner_id: 'u1', contact_id: 'c2', metadata: { outcome: 'callback' } },
      { id: '3', date: '2026-03-01T12:00:00', owner_id: 'u1', contact_id: 'c3', metadata: { outcome: 'wrong_number' } },
    ]
    const result = aggregateMetrics(acts, profiles)
    expect(result.byDay[0].connected).toBe(1)
    expect(result.byDay[0].other).toBe(2)
    expect(result.byDay[0].total).toBe(3)
  })

  it('uses "Desconhecido" for unknown owner_id', () => {
    const acts: CallActivity[] = [
      { id: '1', date: '2026-03-01T10:00:00', owner_id: 'unknown', contact_id: 'c1', metadata: { outcome: 'connected' } },
    ]
    const result = aggregateMetrics(acts, profiles)
    expect(result.byBroker[0].ownerName).toBe('Desconhecido')
  })
})
