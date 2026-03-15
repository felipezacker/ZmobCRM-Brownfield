import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrokerLeaderboard } from '@/components/dashboard/BrokerLeaderboard'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { unoptimized: _u, ...rest } = props
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />
  },
}))

const mockData = [
  { id: '1', name: 'João Silva', deals: 5, revenue: 500000, winRate: 45, calls: 120 },
  { id: '2', name: 'Maria Santos', deals: 3, revenue: 300000, winRate: 38, calls: 80, isUnderperforming: true },
  { id: '3', name: 'Pedro Oliveira', deals: 2, revenue: 100000, winRate: 25, calls: 50 },
]

describe('BrokerLeaderboard', () => {
  it('renders without crashing', () => {
    render(<BrokerLeaderboard data={mockData} />)
    expect(screen.getByText('Top Corretores')).toBeTruthy()
  })

  it('shows broker names', () => {
    render(<BrokerLeaderboard data={mockData} />)
    expect(screen.getByText('João Silva')).toBeTruthy()
    expect(screen.getByText('Maria Santos')).toBeTruthy()
    expect(screen.getByText('Pedro Oliveira')).toBeTruthy()
  })

  it('highlights underperforming broker in red', () => {
    const { container } = render(<BrokerLeaderboard data={mockData} />)
    const redRows = container.querySelectorAll('.bg-red-500\\/10')
    expect(redRows.length).toBe(1)
  })

  it('shows calls column when showCalls is true', () => {
    render(<BrokerLeaderboard data={mockData} showCalls />)
    expect(screen.getByText('120')).toBeTruthy()
    expect(screen.getByText('80')).toBeTruthy()
  })

  it('hides calls column when showCalls is false', () => {
    render(<BrokerLeaderboard data={mockData} showCalls={false} />)
    expect(screen.queryByText('120')).toBeFalsy()
  })

  it('shows empty state when no data', () => {
    render(<BrokerLeaderboard data={[]} />)
    expect(screen.getByText('Nenhum deal fechado no período.')).toBeTruthy()
  })
})
