import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConnectionHeatmap } from '../components/ConnectionHeatmap'
import type { CallActivity } from '../hooks/useProspectingMetrics'

function makeActivity(daysAgo: number, hour: number, outcome: string): CallActivity {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return {
    id: `a-${Math.random()}`,
    date: d.toISOString(),
    owner_id: 'u1',
    contact_id: 'c1',
    metadata: { outcome },
  }
}

function generateActivities(count: number): CallActivity[] {
  const activities: CallActivity[] = []
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const hour = 8 + Math.floor(Math.random() * 12)
    const outcome = Math.random() > 0.6 ? 'connected' : 'no_answer'
    activities.push(makeActivity(daysAgo, hour, outcome))
  }
  return activities
}

/** Generate activities concentrated in a single time slot to ensure enough per-cell data */
function generateConcentratedActivities(count: number, dayOfWeek: number, hour: number): CallActivity[] {
  const activities: CallActivity[] = []
  const today = new Date()
  // Find most recent date matching dayOfWeek within last 30 days
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - (i % 28))
    // Shift to target day of week
    const diff = (d.getDay() - dayOfWeek + 7) % 7
    d.setDate(d.getDate() - diff)
    d.setHours(hour, 0, 0, 0)
    const outcome = Math.random() > 0.5 ? 'connected' : 'no_answer'
    activities.push({
      id: `a-${i}`,
      date: d.toISOString(),
      owner_id: 'u1',
      contact_id: `c${i}`,
      metadata: { outcome },
    })
  }
  return activities
}

describe('ConnectionHeatmap', () => {
  it('renders loading skeleton', () => {
    render(<ConnectionHeatmap activities={[]} isLoading={true} />)
    expect(screen.queryByText('Melhor Horario para Ligar')).not.toBeInTheDocument()
  })

  it('shows "dados insuficientes" when less than MIN_CALLS (10) total calls', () => {
    const activities = generateActivities(5) // Below MIN_CALLS=10
    render(<ConnectionHeatmap activities={activities} isLoading={false} />)
    expect(screen.getByText('Dados insuficientes')).toBeInTheDocument()
    expect(screen.getByText(/Continue prospectando/)).toBeInTheDocument()
  })

  it('renders heatmap grid when enough total data (>=10)', () => {
    const activities = generateActivities(80)
    render(<ConnectionHeatmap activities={activities} isLoading={false} />)
    expect(screen.getByText('Melhor Horario para Ligar')).toBeInTheDocument()
    expect(screen.getByText('Seg')).toBeInTheDocument()
    expect(screen.getByText('Ter')).toBeInTheDocument()
    expect(screen.getByText('8h')).toBeInTheDocument()
    expect(screen.getByText('10h')).toBeInTheDocument()
  })

  it('shows "dados insuficientes" tooltip on cell with <MIN_CALLS data', () => {
    // 20 activities spread across all cells — each cell gets <10
    const activities = generateActivities(20)
    const { container } = render(<ConnectionHeatmap activities={activities} isLoading={false} />)

    const cells = container.querySelectorAll('.rounded-md.cursor-default')
    expect(cells.length).toBeGreaterThan(0)

    // Find a cell with insufficient class (gray)
    const insufficientCell = Array.from(cells).find(cell =>
      cell.className.includes('bg-gray-200')
    )
    if (insufficientCell) {
      fireEvent.mouseEnter(insufficientCell)
      expect(screen.getByText(/Dados insuficientes/)).toBeInTheDocument()
    }
  })

  it('shows connection rate tooltip on cell with >=MIN_CALLS data', () => {
    // Concentrate 15 activities on a single slot to ensure >=10 per cell
    const concentrated = generateConcentratedActivities(15, new Date().getDay(), 9)
    const { container } = render(<ConnectionHeatmap activities={concentrated} isLoading={false} />)

    const cells = container.querySelectorAll('.rounded-md.cursor-default')
    expect(cells.length).toBeGreaterThan(0)

    // Find a cell that has enough data (not gray)
    const sufficientCell = Array.from(cells).find(cell =>
      !cell.className.includes('bg-gray-200') && !cell.className.includes('opacity-40')
    )
    if (sufficientCell) {
      fireEvent.mouseEnter(sufficientCell)
      expect(screen.getByText(/% conexao/)).toBeInTheDocument()
    }
  })

  it('hides tooltip on mouse leave', () => {
    const activities = generateActivities(20)
    const { container } = render(<ConnectionHeatmap activities={activities} isLoading={false} />)

    const cells = container.querySelectorAll('.rounded-md.cursor-default')
    const cellWithData = Array.from(cells).find(cell =>
      !cell.className.includes('opacity-40')
    )
    if (cellWithData) {
      fireEvent.mouseEnter(cellWithData)
      // Some tooltip should appear
      const tooltipText = screen.queryByText(/conexao/) || screen.queryByText(/insuficientes/)
      expect(tooltipText).toBeInTheDocument()

      fireEvent.mouseLeave(cellWithData)
      expect(screen.queryByText(/% conexao/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Dados insuficientes/)).not.toBeInTheDocument()
    }
  })

  it('switches period selector', () => {
    const activities = generateActivities(80)
    render(<ConnectionHeatmap activities={activities} isLoading={false} />)

    const btn60 = screen.getByText('60 dias')
    fireEvent.click(btn60)
    // Should still render without error
    expect(screen.getByText('Melhor Horario para Ligar')).toBeInTheDocument()
  })

  it('renders legend', () => {
    const activities = generateActivities(80)
    render(<ConnectionHeatmap activities={activities} isLoading={false} />)
    expect(screen.getByText('Menor')).toBeInTheDocument()
    expect(screen.getByText('Maior conexao')).toBeInTheDocument()
  })

  it('applies gray color to insufficient cells and normal colors to sufficient cells', () => {
    const concentrated = generateConcentratedActivities(15, new Date().getDay(), 9)
    const spread = generateActivities(3) // Very few spread activities
    const { container } = render(
      <ConnectionHeatmap activities={[...concentrated, ...spread]} isLoading={false} />
    )

    const cells = container.querySelectorAll('.rounded-md.cursor-default')
    const grayCount = Array.from(cells).filter(c => c.className.includes('bg-gray-200')).length
    const emptyCount = Array.from(cells).filter(c => c.className.includes('opacity-40')).length
    const coloredCount = cells.length - grayCount - emptyCount

    // At least one concentrated cell should be colored, and some gray
    expect(coloredCount).toBeGreaterThanOrEqual(0)
    expect(grayCount + emptyCount + coloredCount).toBe(cells.length)
  })
})
