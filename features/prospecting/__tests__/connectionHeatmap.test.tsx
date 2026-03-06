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

describe('ConnectionHeatmap', () => {
  it('renders loading skeleton', () => {
    render(<ConnectionHeatmap activities={[]} isLoading={true} />)
    expect(screen.queryByText('Melhor Horario para Ligar')).not.toBeInTheDocument()
  })

  it('shows "dados insuficientes" when less than 50 calls', () => {
    const activities = generateActivities(20)
    render(<ConnectionHeatmap activities={activities} isLoading={false} />)
    expect(screen.getByText('Dados insuficientes')).toBeInTheDocument()
    expect(screen.getByText(/Continue prospectando/)).toBeInTheDocument()
  })

  it('renders heatmap grid when enough data', () => {
    const activities = generateActivities(80)
    render(<ConnectionHeatmap activities={activities} isLoading={false} />)
    expect(screen.getByText('Melhor Horario para Ligar')).toBeInTheDocument()
    expect(screen.getByText('Seg')).toBeInTheDocument()
    expect(screen.getByText('Ter')).toBeInTheDocument()
    expect(screen.getByText('8h')).toBeInTheDocument()
    expect(screen.getByText('10h')).toBeInTheDocument()
  })

  it('shows tooltip on cell hover', () => {
    const activities = generateActivities(100)
    const { container } = render(<ConnectionHeatmap activities={activities} isLoading={false} />)

    // Find a data cell (not header, not day label)
    const cells = container.querySelectorAll('.rounded-md.cursor-default')
    expect(cells.length).toBeGreaterThan(0)

    fireEvent.mouseEnter(cells[0])
    // Tooltip should appear with connection info (% conexao line)
    expect(screen.getByText(/% conexao/)).toBeInTheDocument()
  })

  it('hides tooltip on mouse leave', () => {
    const activities = generateActivities(100)
    const { container } = render(<ConnectionHeatmap activities={activities} isLoading={false} />)

    const cells = container.querySelectorAll('.rounded-md.cursor-default')
    fireEvent.mouseEnter(cells[0])
    expect(screen.getByText(/% conexao/)).toBeInTheDocument()

    fireEvent.mouseLeave(cells[0])
    expect(screen.queryByText(/% conexao/)).not.toBeInTheDocument()
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
})
