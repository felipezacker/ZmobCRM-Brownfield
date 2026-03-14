/**
 * CP-6.4: Metrics comparison tests
 * - getComparisonDateRange: date calculation for all period types
 * - DeltaIndicator: rendering for all delta scenarios
 * - MetricsCards: integration with comparisonMetrics
 */
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getComparisonDateRange } from '../hooks/useProspectingMetrics'
import type { MetricsPeriod, PeriodRange, ProspectingMetrics } from '../hooks/useProspectingMetrics'
import { DeltaIndicator } from '../components/DeltaIndicator'
import { MetricsCards } from '../components/MetricsCards'

// ── getComparisonDateRange tests ─────────────────────────────

describe('getComparisonDateRange', () => {
  it('today: comparison is yesterday', () => {
    const result = getComparisonDateRange('today', { start: '2026-03-14', end: '2026-03-14' })
    expect(result).toEqual({ start: '2026-03-13', end: '2026-03-13' })
  })

  it('yesterday: comparison is day before yesterday', () => {
    const result = getComparisonDateRange('yesterday', { start: '2026-03-13', end: '2026-03-13' })
    expect(result).toEqual({ start: '2026-03-12', end: '2026-03-12' })
  })

  it('7d: comparison is days 8-14', () => {
    // 7d range: Mar 8 - Mar 14 (7 days)
    const result = getComparisonDateRange('7d', { start: '2026-03-08', end: '2026-03-14' })
    // Comparison: Mar 1 - Mar 7 (7 days)
    expect(result).toEqual({ start: '2026-03-01', end: '2026-03-07' })
  })

  it('30d: comparison is days 31-60', () => {
    // 30d range: Feb 13 - Mar 14 (30 days)
    const result = getComparisonDateRange('30d', { start: '2026-02-13', end: '2026-03-14' })
    // Comparison: Jan 14 - Feb 12 (30 days)
    expect(result).toEqual({ start: '2026-01-14', end: '2026-02-12' })
  })

  it('custom 1 day: shifts back by 1 day', () => {
    const result = getComparisonDateRange('custom', { start: '2026-03-10', end: '2026-03-10' })
    expect(result).toEqual({ start: '2026-03-09', end: '2026-03-09' })
  })

  it('custom 7 days: shifts back by 7 days', () => {
    const result = getComparisonDateRange('custom', { start: '2026-03-01', end: '2026-03-07' })
    expect(result).toEqual({ start: '2026-02-22', end: '2026-02-28' })
  })

  it('custom 15 days: shifts back by 15 days', () => {
    const result = getComparisonDateRange('custom', { start: '2026-03-01', end: '2026-03-15' })
    // 15 days duration, compEnd = Feb 28, compStart = Feb 14
    expect(result).toEqual({ start: '2026-02-14', end: '2026-02-28' })
  })

  it('handles month boundary correctly', () => {
    const result = getComparisonDateRange('7d', { start: '2026-03-01', end: '2026-03-07' })
    expect(result).toEqual({ start: '2026-02-22', end: '2026-02-28' })
  })

  it('handles year boundary correctly', () => {
    const result = getComparisonDateRange('7d', { start: '2026-01-01', end: '2026-01-07' })
    expect(result).toEqual({ start: '2025-12-25', end: '2025-12-31' })
  })
})

// ── DeltaIndicator tests ─────────────────────────────────────

describe('DeltaIndicator', () => {
  it('returns null when both values are 0', () => {
    const { container } = render(<DeltaIndicator current={0} previous={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows "Novo" when previous is 0 and current > 0', () => {
    render(<DeltaIndicator current={5} previous={0} />)
    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByText('Novo')).toHaveClass('text-blue-500')
  })

  it('shows green arrow for improvement (positive delta)', () => {
    render(<DeltaIndicator current={120} previous={100} />)
    expect(screen.getByText(/↑/)).toBeInTheDocument()
    expect(screen.getByText(/20\.0%/)).toBeInTheDocument()
    expect(screen.getByText(/↑/).closest('span')).toHaveClass('text-green-500')
  })

  it('shows red arrow for worsening (negative delta)', () => {
    render(<DeltaIndicator current={80} previous={100} />)
    expect(screen.getByText(/↓/)).toBeInTheDocument()
    expect(screen.getByText(/20\.0%/)).toBeInTheDocument()
    expect(screen.getByText(/↓/).closest('span')).toHaveClass('text-red-500')
  })

  it('inverts direction when invertDirection is true', () => {
    // Decrease = green when inverted (e.g., "Sem Resposta" fewer = better)
    render(<DeltaIndicator current={80} previous={100} invertDirection />)
    expect(screen.getByText(/↓/).closest('span')).toHaveClass('text-green-500')
  })

  it('shows increase as red when invertDirection is true', () => {
    render(<DeltaIndicator current={120} previous={100} invertDirection />)
    expect(screen.getByText(/↑/).closest('span')).toHaveClass('text-red-500')
  })

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = render(<DeltaIndicator current={0} previous={0} isLoading />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows "= 0%" when delta is exactly 0 (same values)', () => {
    render(<DeltaIndicator current={50} previous={50} />)
    expect(screen.getByText('= 0%')).toBeInTheDocument()
  })

  it('has aria-label for accessibility', () => {
    render(<DeltaIndicator current={120} previous={100} />)
    const el = screen.getByText(/↑/)
    expect(el).toHaveAttribute('aria-label')
    expect(el.getAttribute('aria-label')).toContain('20.0')
  })

  it('rounds to 1 decimal place', () => {
    // 33.333...% increase
    render(<DeltaIndicator current={4} previous={3} />)
    expect(screen.getByText(/33\.3%/)).toBeInTheDocument()
  })
})

// ── MetricsCards with comparison tests ────────────────────────

const mockMetrics: ProspectingMetrics = {
  totalCalls: 100,
  connectedCalls: 40,
  connectionRate: 40,
  avgDuration: 120,
  uniqueContacts: 30,
  byDay: [],
  byOutcome: [
    { outcome: 'connected', count: 40 },
    { outcome: 'no_answer', count: 30 },
    { outcome: 'voicemail', count: 20 },
    { outcome: 'busy', count: 10 },
  ],
  byBroker: [],
}

const comparisonMetrics: ProspectingMetrics = {
  totalCalls: 80,
  connectedCalls: 30,
  connectionRate: 37.5,
  avgDuration: 100,
  uniqueContacts: 25,
  byDay: [],
  byOutcome: [
    { outcome: 'connected', count: 30 },
    { outcome: 'no_answer', count: 25 },
    { outcome: 'voicemail', count: 15 },
    { outcome: 'busy', count: 10 },
  ],
  byBroker: [],
}

describe('MetricsCards with comparisonMetrics', () => {
  it('renders DeltaIndicators when comparisonMetrics is provided', () => {
    render(
      <MetricsCards
        metrics={mockMetrics}
        isLoading={false}
        comparisonMetrics={comparisonMetrics}
      />
    )
    // Should have delta indicators (arrows)
    const arrows = screen.getAllByText(/[↑↓]/)
    expect(arrows.length).toBeGreaterThanOrEqual(4)
  })

  it('does NOT render DeltaIndicators when comparisonMetrics is null', () => {
    render(
      <MetricsCards
        metrics={mockMetrics}
        isLoading={false}
        comparisonMetrics={null}
      />
    )
    expect(screen.queryByText(/[↑↓]/)).toBeNull()
    expect(screen.queryByText('Novo')).toBeNull()
  })

  it('does NOT render DeltaIndicators when comparisonMetrics is undefined (default)', () => {
    render(
      <MetricsCards
        metrics={mockMetrics}
        isLoading={false}
      />
    )
    expect(screen.queryByText(/[↑↓]/)).toBeNull()
  })

  it('shows loading skeletons for deltas when isComparisonLoading is true', () => {
    const { container } = render(
      <MetricsCards
        metrics={mockMetrics}
        isLoading={false}
        comparisonMetrics={null}
        isComparisonLoading
      />
    )
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(6) // One per card
  })

  it('shows "Sem Resposta" with invertDirection (decrease = green)', () => {
    // noAnswer: current 30, previous 25 → increase → should be red (invertDirection)
    render(
      <MetricsCards
        metrics={mockMetrics}
        isLoading={false}
        comparisonMetrics={comparisonMetrics}
      />
    )
    // "Sem Resposta" card has noAnswer 30 vs 25 (↑ 20%) — inverted, so red
    const semRespostaCard = screen.getByText('Sem Resposta').closest('button')!
    const arrow = semRespostaCard.querySelector('.text-red-500')
    expect(arrow).toBeInTheDocument()
  })
})
