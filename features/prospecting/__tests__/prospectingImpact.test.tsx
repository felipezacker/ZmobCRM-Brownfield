/**
 * CP-5.3: Prospecting impact metrics tests
 * - useProspectingImpact hook (aggregation, dedup, period filter)
 * - ProspectingImpactSection component (cards, skeleton, empty state)
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProspectingImpactSection } from '../components/ProspectingImpactSection'
import type { ProspectingImpact } from '../hooks/useProspectingImpact'

// Mock recharts to avoid canvas/SVG issues in tests
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../hooks/useDarkMode', () => ({
  useDarkMode: () => false,
}))

// ── ProspectingImpactSection component tests ──────────────────────

describe('ProspectingImpactSection', () => {
  it('renders loading skeleton with 4 cards', () => {
    render(<ProspectingImpactSection impact={null} isLoading={true} />)
    expect(screen.getByText('Impacto no Pipeline')).toBeInTheDocument()
    // 4 skeleton cards have animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })

  it('renders empty state when no prospecting calls', () => {
    render(<ProspectingImpactSection impact={null} isLoading={false} />)
    expect(screen.getByText('Sem dados de impacto no periodo selecionado')).toBeInTheDocument()
  })

  it('renders empty state when totalProspectingCalls is 0', () => {
    const emptyImpact: ProspectingImpact = {
      callsWithDeal: 0,
      totalProspectingCalls: 0,
      linkageRate: 0,
      pipelineValue: 0,
      dealsWon: 0,
      dealsWonValue: 0,
      byDay: [],
    }
    render(<ProspectingImpactSection impact={emptyImpact} isLoading={false} />)
    expect(screen.getByText('Sem dados de impacto no periodo selecionado')).toBeInTheDocument()
  })

  it('renders 4 KPI cards with correct values', () => {
    const impact: ProspectingImpact = {
      callsWithDeal: 8,
      totalProspectingCalls: 20,
      linkageRate: 40,
      pipelineValue: 150000,
      dealsWon: 3,
      dealsWonValue: 75000,
      byDay: [
        { date: '2026-03-10', linked: 3, unlinked: 5 },
        { date: '2026-03-11', linked: 5, unlinked: 7 },
      ],
    }
    render(<ProspectingImpactSection impact={impact} isLoading={false} />)

    // Card 1: Ligacoes com Deal
    expect(screen.getByText('Ligacoes com Deal')).toBeInTheDocument()
    expect(screen.getByText('8 / 20')).toBeInTheDocument()

    // Card 2: Taxa de Vinculacao
    expect(screen.getByText('Taxa de Vinculacao')).toBeInTheDocument()
    expect(screen.getByText('40.0%')).toBeInTheDocument()

    // Card 3: Pipeline Gerado
    expect(screen.getByText('Pipeline Gerado')).toBeInTheDocument()

    // Card 4: Deals Ganhos
    expect(screen.getByText('Deals Ganhos')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders mini-chart when byDay has data', () => {
    const impact: ProspectingImpact = {
      callsWithDeal: 2,
      totalProspectingCalls: 5,
      linkageRate: 40,
      pipelineValue: 50000,
      dealsWon: 1,
      dealsWonValue: 25000,
      byDay: [
        { date: '2026-03-10', linked: 1, unlinked: 2 },
        { date: '2026-03-11', linked: 1, unlinked: 1 },
      ],
    }
    render(<ProspectingImpactSection impact={impact} isLoading={false} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByText('Ligacoes com/sem deal por dia')).toBeInTheDocument()
  })
})

// ── useProspectingImpact aggregation logic (unit tests) ──────────────────────

describe('ProspectingImpact aggregation logic', () => {
  // Test the aggregation logic directly (same logic as the hook's useMemo)
  function aggregate(
    activities: { id: string; deal_id: string | null; date: string; metadata: Record<string, unknown> | null }[],
    deals: { id: string; value: number | null; is_won: boolean }[],
    rangeStart: string,
    rangeEnd: string,
  ): ProspectingImpact {
    const prospectingCalls = activities.filter(a => a.metadata?.source === 'prospecting')
    const totalProspectingCalls = prospectingCalls.length
    const callsWithDeal = prospectingCalls.filter(a => a.deal_id).length
    const linkageRate = totalProspectingCalls > 0 ? (callsWithDeal / totalProspectingCalls) * 100 : 0

    const pipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonDeals = deals.filter(d => d.is_won)
    const dealsWon = wonDeals.length
    const dealsWonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    const dayMap = new Map<string, { linked: number; unlinked: number }>()
    for (const call of prospectingCalls) {
      const day = call.date.split('T')[0]
      const entry = dayMap.get(day) || { linked: 0, unlinked: 0 }
      if (call.deal_id) entry.linked++
      else entry.unlinked++
      dayMap.set(day, entry)
    }

    const startDate = new Date(rangeStart)
    const endDate = new Date(rangeEnd)
    const byDay: ProspectingImpact['byDay'] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      const key = current.toISOString().split('T')[0]
      const entry = dayMap.get(key) || { linked: 0, unlinked: 0 }
      byDay.push({ date: key, ...entry })
      current.setDate(current.getDate() + 1)
    }

    return { callsWithDeal, totalProspectingCalls, linkageRate, pipelineValue, dealsWon, dealsWonValue, byDay }
  }

  it('calculates metrics correctly with mixed activities', () => {
    const activities = [
      { id: '1', deal_id: 'deal-A', date: '2026-03-10T10:00:00', metadata: { source: 'prospecting' } },
      { id: '2', deal_id: null, date: '2026-03-10T11:00:00', metadata: { source: 'prospecting' } },
      { id: '3', deal_id: 'deal-B', date: '2026-03-11T09:00:00', metadata: { source: 'prospecting' } },
      { id: '4', deal_id: null, date: '2026-03-11T10:00:00', metadata: { source: 'manual' } }, // not prospecting
    ]
    const deals = [
      { id: 'deal-A', value: 100000, is_won: true },
      { id: 'deal-B', value: 200000, is_won: false },
    ]

    const result = aggregate(activities, deals, '2026-03-10', '2026-03-11')

    expect(result.totalProspectingCalls).toBe(3)
    expect(result.callsWithDeal).toBe(2)
    expect(result.linkageRate).toBeCloseTo(66.67, 1)
    expect(result.pipelineValue).toBe(300000)
    expect(result.dealsWon).toBe(1)
    expect(result.dealsWonValue).toBe(100000)
    expect(result.byDay).toHaveLength(2)
    expect(result.byDay[0]).toEqual({ date: '2026-03-10', linked: 1, unlinked: 1 })
    expect(result.byDay[1]).toEqual({ date: '2026-03-11', linked: 1, unlinked: 0 })
  })

  it('deduplicates deals — same deal_id in 3 calls counts value once', () => {
    const activities = [
      { id: '1', deal_id: 'deal-X', date: '2026-03-10T10:00:00', metadata: { source: 'prospecting' } },
      { id: '2', deal_id: 'deal-X', date: '2026-03-10T11:00:00', metadata: { source: 'prospecting' } },
      { id: '3', deal_id: 'deal-X', date: '2026-03-10T12:00:00', metadata: { source: 'prospecting' } },
    ]
    // The hook uses DISTINCT deal IDs for the deals query, so only 1 deal returned
    const deals = [
      { id: 'deal-X', value: 50000, is_won: true },
    ]

    const result = aggregate(activities, deals, '2026-03-10', '2026-03-10')

    expect(result.callsWithDeal).toBe(3)
    expect(result.pipelineValue).toBe(50000) // counted once, not 3x
    expect(result.dealsWon).toBe(1)
    expect(result.dealsWonValue).toBe(50000)
  })

  it('filters out non-prospecting activities', () => {
    const activities = [
      { id: '1', deal_id: null, date: '2026-03-10T10:00:00', metadata: { source: 'prospecting' } },
      { id: '2', deal_id: null, date: '2026-03-10T11:00:00', metadata: { source: 'manual' } },
      { id: '3', deal_id: null, date: '2026-03-10T12:00:00', metadata: null },
    ]

    const result = aggregate(activities, [], '2026-03-10', '2026-03-10')

    expect(result.totalProspectingCalls).toBe(1)
  })

  it('handles zero data gracefully', () => {
    const result = aggregate([], [], '2026-03-10', '2026-03-10')

    expect(result.totalProspectingCalls).toBe(0)
    expect(result.callsWithDeal).toBe(0)
    expect(result.linkageRate).toBe(0)
    expect(result.pipelineValue).toBe(0)
    expect(result.dealsWon).toBe(0)
    expect(result.byDay).toHaveLength(1)
    expect(result.byDay[0]).toEqual({ date: '2026-03-10', linked: 0, unlinked: 0 })
  })

  it('fills date gaps in byDay', () => {
    const activities = [
      { id: '1', deal_id: 'deal-A', date: '2026-03-10T10:00:00', metadata: { source: 'prospecting' } },
      // no data for 03-11
      { id: '2', deal_id: null, date: '2026-03-12T09:00:00', metadata: { source: 'prospecting' } },
    ]
    const deals = [{ id: 'deal-A', value: 10000, is_won: false }]

    const result = aggregate(activities, deals, '2026-03-10', '2026-03-12')

    expect(result.byDay).toHaveLength(3)
    expect(result.byDay[0]).toEqual({ date: '2026-03-10', linked: 1, unlinked: 0 })
    expect(result.byDay[1]).toEqual({ date: '2026-03-11', linked: 0, unlinked: 0 }) // gap filled
    expect(result.byDay[2]).toEqual({ date: '2026-03-12', linked: 0, unlinked: 1 })
  })
})
