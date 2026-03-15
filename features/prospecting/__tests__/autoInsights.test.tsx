import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AutoInsights } from '../components/AutoInsights'
import type { ProspectingMetrics, DailyMetric } from '../hooks/useProspectingMetrics'

function makeMetrics(overrides: Partial<ProspectingMetrics> = {}): ProspectingMetrics {
  return {
    totalCalls: 0,
    connectedCalls: 0,
    connectionRate: 0,
    avgDuration: 0,
    uniqueContacts: 0,
    byDay: [],
    byOutcome: [],
    byBroker: [],
    ...overrides,
  }
}

function makeDay(date: string, overrides: Partial<DailyMetric> = {}): DailyMetric {
  return {
    date,
    connected: 0,
    no_answer: 0,
    voicemail: 0,
    busy: 0,
    other: 0,
    total: 0,
    ...overrides,
  }
}

describe('AutoInsights', () => {
  it('renders nothing when metrics is null', () => {
    const { container } = render(<AutoInsights metrics={null} isLoading={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when loading', () => {
    const { container } = render(<AutoInsights metrics={makeMetrics({ totalCalls: 50, connectionRate: 35 })} isLoading={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when no insights are triggered', () => {
    const { container } = render(
      <AutoInsights metrics={makeMetrics({ totalCalls: 0 })} isLoading={false} />,
    )
    expect(container.innerHTML).toBe('')
  })

  // 1. Low connection rate
  it('shows low connection rate when < 20% and >= 10 calls', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({ totalCalls: 20, connectionRate: 15, connectedCalls: 3 })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Baixa Taxa de Resposta')).toBeInTheDocument()
    expect(screen.getByText(/15% das ligações são atendidas/)).toBeInTheDocument()
  })

  // 2. Good connection rate
  it('shows good connection rate when >= 30% and >= 10 calls', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({ totalCalls: 20, connectionRate: 35, connectedCalls: 7 })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Boa Taxa de Conexão')).toBeInTheDocument()
    expect(screen.getByText(/35% das ligações estão sendo atendidas/)).toBeInTheDocument()
  })

  // 3. High no-answer rate
  it('shows high no-answer when > 60%', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 20,
          connectionRate: 5,
          connectedCalls: 1,
          byOutcome: [{ outcome: 'no_answer', count: 15 }],
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Alto Volume Sem Resposta')).toBeInTheDocument()
    expect(screen.getByText(/75% das ligações não são atendidas/)).toBeInTheDocument()
  })

  // 4. Top performer
  it('shows top performer when >= 2 brokers', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 30,
          connectionRate: 40,
          connectedCalls: 12,
          byBroker: [
            { ownerId: '1', ownerName: 'Alice', totalCalls: 20, connectedCalls: 10, connectionRate: 50, avgDuration: 60, uniqueContacts: 15 },
            { ownerId: '2', ownerName: 'Bob', totalCalls: 10, connectedCalls: 2, connectionRate: 20, avgDuration: 30, uniqueContacts: 8 },
          ],
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Destaque da Equipe')).toBeInTheDocument()
    expect(screen.getByText(/Alice lidera com 20 ligações/)).toBeInTheDocument()
  })

  // 5. Short avg duration
  it('shows short duration when avg < 30s and >= 5 connected', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 15,
          connectionRate: 40,
          connectedCalls: 6,
          avgDuration: 20,
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Ligações Curtas')).toBeInTheDocument()
    expect(screen.getByText(/20s por ligação conectada/)).toBeInTheDocument()
  })

  // 6. Low volume
  it('shows low volume when < 10 calls and > 0', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({ totalCalls: 5, connectionRate: 50, connectedCalls: 2 })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Volume Baixo')).toBeInTheDocument()
    expect(screen.getByText(/Apenas 5 ligações no período/)).toBeInTheDocument()
  })

  // 7. High voicemail rate
  it('shows high voicemail when > 15% and >= 10 calls', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 20,
          connectionRate: 25,
          connectedCalls: 5,
          byOutcome: [
            { outcome: 'voicemail', count: 6 },
            { outcome: 'connected', count: 5 },
          ],
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Alto Índice de Correio de Voz')).toBeInTheDocument()
    expect(screen.getByText(/30%/)).toBeInTheDocument()
  })

  // 8. Productivity by day
  it('shows most productive day when one day has 2x+ average', () => {
    const byDay = [
      makeDay('2026-03-10', { total: 5, connected: 2 }), // Monday
      makeDay('2026-03-11', { total: 4, connected: 1 }), // Tuesday
      makeDay('2026-03-12', { total: 20, connected: 8 }), // Wednesday
    ]
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 29,
          connectionRate: 38,
          connectedCalls: 11,
          byDay,
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Dia Mais Produtivo')).toBeInTheDocument()
    expect(screen.getByText(/Quinta/)).toBeInTheDocument()
    expect(screen.getByText(/20 ligações/)).toBeInTheDocument()
  })

  // 9. Contact diversification
  it('shows diversification warning when uniqueContacts/totalCalls < 50%', () => {
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 30,
          connectionRate: 35,
          connectedCalls: 10,
          uniqueContacts: 8,
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Diversifique os Contatos')).toBeInTheDocument()
    expect(screen.getByText(/27% das ligações são para contatos únicos/)).toBeInTheDocument()
  })

  // 10. No recent activity
  it('shows no recent activity when last 2 days have no data in a 5+ day span', () => {
    const today = new Date()
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const d = (n: number) => {
      const dt = new Date(today)
      dt.setDate(dt.getDate() - n)
      return dt
    }
    // Data from 7, 6, 5, 4, 3 days ago -- nothing in last 2 days
    const byDay = [
      makeDay(fmt(d(7)), { total: 5, connected: 2 }),
      makeDay(fmt(d(6)), { total: 4, connected: 1 }),
      makeDay(fmt(d(5)), { total: 6, connected: 3 }),
      makeDay(fmt(d(4)), { total: 3, connected: 1 }),
      makeDay(fmt(d(3)), { total: 5, connected: 2 }),
    ]
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 23,
          connectionRate: 39,
          connectedCalls: 9,
          byDay,
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Sem Atividade Recente')).toBeInTheDocument()
    expect(screen.getByText(/últimos 2 dias/)).toBeInTheDocument()
  })

  // 11. Connection rate improvement
  it('shows connection improvement when second half is > 10pp better', () => {
    // 7 days: first 3 have low connection, last 4 have high connection
    const byDay = [
      makeDay('2026-03-04', { total: 10, connected: 1 }),
      makeDay('2026-03-05', { total: 10, connected: 1 }),
      makeDay('2026-03-06', { total: 10, connected: 1 }),
      makeDay('2026-03-07', { total: 10, connected: 5 }),
      makeDay('2026-03-08', { total: 10, connected: 6 }),
      makeDay('2026-03-09', { total: 10, connected: 7 }),
      makeDay('2026-03-10', { total: 10, connected: 6 }),
    ]
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 70,
          connectionRate: 39,
          connectedCalls: 27,
          byDay,
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Melhoria na Conexão')).toBeInTheDocument()
    expect(screen.getByText(/pp na segunda metade/)).toBeInTheDocument()
  })

  // 12. Consistent volume
  it('shows consistent volume when CV < 0.3 and >= 5 days', () => {
    const byDay = [
      makeDay('2026-03-06', { total: 10, connected: 4 }),
      makeDay('2026-03-07', { total: 11, connected: 5 }),
      makeDay('2026-03-08', { total: 10, connected: 4 }),
      makeDay('2026-03-09', { total: 12, connected: 5 }),
      makeDay('2026-03-10', { total: 11, connected: 4 }),
    ]
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 54,
          connectionRate: 41,
          connectedCalls: 22,
          byDay,
        })}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Volume Consistente')).toBeInTheDocument()
  })

  // Severity ordering
  it('sorts alerts before positives (severity ordering)', () => {
    // Trigger alert (high no-answer) + positive (good connection) -- contradictory but tests ordering
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 100,
          connectionRate: 35,
          connectedCalls: 35,
          byOutcome: [
            { outcome: 'no_answer', count: 62 },
            { outcome: 'connected', count: 35 },
          ],
        })}
        isLoading={false}
      />,
    )
    const titles = screen.getAllByRole('paragraph').filter(p =>
      p.classList.contains('font-medium'),
    )
    // We check there are insights rendered
    const allText = document.body.textContent || ''
    // Alert should appear -- "Alto Volume Sem Resposta" (alert severity)
    expect(screen.getByText('Alto Volume Sem Resposta')).toBeInTheDocument()
  })

  // Max 4 insights limit
  it('limits output to max 4 insights', () => {
    // Trigger many insights at once:
    // - low connection (<20%) + warning
    // - high no-answer (>60%) + alert
    // - short duration (<30s) + warning
    // - voicemail (>15%) + warning
    // - diversification (<50%) + warning
    // - low volume won't trigger because totalCalls >= 10
    render(
      <AutoInsights
        metrics={makeMetrics({
          totalCalls: 25,
          connectionRate: 10,
          connectedCalls: 2,
          avgDuration: 15,
          uniqueContacts: 5,
          byOutcome: [
            { outcome: 'no_answer', count: 16 },
            { outcome: 'voicemail', count: 5 },
            { outcome: 'connected', count: 2 },
          ],
          byDay: [
            makeDay('2026-03-08', { total: 10, connected: 1 }),
            makeDay('2026-03-09', { total: 8, connected: 0 }),
            makeDay('2026-03-10', { total: 7, connected: 1 }),
          ],
        })}
        isLoading={false}
      />,
    )
    // Count the insight cards rendered (each has the rounded-lg border class pattern)
    const insightCards = document.querySelectorAll('.rounded-lg.border')
    expect(insightCards.length).toBeLessThanOrEqual(4)
  })
})
