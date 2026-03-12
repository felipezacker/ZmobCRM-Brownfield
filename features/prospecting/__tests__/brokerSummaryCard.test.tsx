import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrokerSummaryCard } from '../components/BrokerSummaryCard'
import { getDateRange } from '../hooks/useProspectingMetrics'
import type { ProspectingMetrics } from '../hooks/useProspectingMetrics'
import type { ProspectingImpact } from '../hooks/useProspectingImpact'

// ── Test data ──────────────────────────────────────────────

const mockMetrics: ProspectingMetrics = {
  totalCalls: 25,
  connectedCalls: 8,
  connectionRate: 32.0,
  avgDuration: 120,
  uniqueContacts: 18,
  byDay: [],
  byOutcome: [],
  byBroker: [],
}

const mockImpact: ProspectingImpact = {
  callsWithDeal: 3,
  totalProspectingCalls: 20,
  linkageRate: 15.0,
  pipelineValue: 45000,
  dealsWon: 1,
  dealsWonValue: 15000,
  byDay: [],
}

// ── getDateRange('yesterday') ──────────────────────────────

describe('getDateRange - yesterday', () => {
  it('returns yesterday date for start and end', () => {
    const result = getDateRange('yesterday')
    const expected = new Date()
    expected.setDate(expected.getDate() - 1)
    const expectedStr = expected.toISOString().split('T')[0]
    expect(result.start).toBe(expectedStr)
    expect(result.end).toBe(expectedStr)
  })

  it('returns valid YYYY-MM-DD format', () => {
    const result = getDateRange('yesterday')
    expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('start and end are the same day', () => {
    const result = getDateRange('yesterday')
    expect(result.start).toBe(result.end)
  })
})

// ── BrokerSummaryCard rendering ─────────────────────────────

describe('BrokerSummaryCard', () => {
  it('renders broker name', () => {
    render(
      <BrokerSummaryCard
        brokerName="João Silva"
        metrics={mockMetrics}
        impact={mockImpact}
      />
    )
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('renders total calls', () => {
    render(
      <BrokerSummaryCard
        brokerName="João Silva"
        metrics={mockMetrics}
        impact={mockImpact}
      />
    )
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('Ligações')).toBeInTheDocument()
  })

  it('renders connection rate formatted', () => {
    render(
      <BrokerSummaryCard
        brokerName="João Silva"
        metrics={mockMetrics}
        impact={mockImpact}
      />
    )
    expect(screen.getByText('32.0%')).toBeInTheDocument()
    expect(screen.getByText('Conexão')).toBeInTheDocument()
  })

  it('renders deals count from impact', () => {
    render(
      <BrokerSummaryCard
        brokerName="João Silva"
        metrics={mockMetrics}
        impact={mockImpact}
      />
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Deals')).toBeInTheDocument()
  })

  it('renders pipeline value formatted as BRL currency', () => {
    render(
      <BrokerSummaryCard
        brokerName="João Silva"
        metrics={mockMetrics}
        impact={mockImpact}
      />
    )
    expect(screen.getByText('R$ 45.000,00')).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
  })

  it('renders 0 deals and R$ 0 when impact is null', () => {
    render(
      <BrokerSummaryCard
        brokerName="Ana Costa"
        metrics={mockMetrics}
        impact={null}
      />
    )
    expect(screen.getByText('Ana Costa')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument()
  })

  it('renders with zero metrics correctly', () => {
    const zeroMetrics: ProspectingMetrics = {
      ...mockMetrics,
      totalCalls: 0,
      connectionRate: 0,
    }
    render(
      <BrokerSummaryCard
        brokerName="Teste"
        metrics={zeroMetrics}
        impact={null}
      />
    )
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })
})
