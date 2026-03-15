import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WalletHealthCard } from '@/components/dashboard/WalletHealthCard'

const mockData = {
  activeCount: 100,
  inactiveCount: 30,
  churnedCount: 10,
  activePercent: 71,
  inactivePercent: 22,
  churnedPercent: 7,
  hot: 0,
  warm: 0,
  cold: 0,
  avgLTV: 25000,
  stagnantDealsCount: 3,
  stagnantDealsValue: 150000,
}

describe('WalletHealthCard', () => {
  it('renders without crashing', () => {
    render(<WalletHealthCard data={mockData} />)
    expect(screen.getByText('Saúde da Carteira')).toBeTruthy()
  })

  it('shows Ativos, Inativos, Churn labels', () => {
    render(<WalletHealthCard data={mockData} />)
    expect(screen.getByText(/Ativos \(100\)/)).toBeTruthy()
    expect(screen.getByText(/Inativos \(30\)/)).toBeTruthy()
    expect(screen.getByText(/Churn \(10\)/)).toBeTruthy()
  })

  it('shows stagnant deals count', () => {
    render(<WalletHealthCard data={mockData} />)
    expect(screen.getByText('3 Deals')).toBeTruthy()
    expect(screen.getByText('Atenção')).toBeTruthy()
  })

  it('shows OK when no stagnant deals', () => {
    render(<WalletHealthCard data={{ ...mockData, stagnantDealsCount: 0 }} />)
    expect(screen.getByText('OK')).toBeTruthy()
  })

  it('shows LTV value', () => {
    render(<WalletHealthCard data={mockData} />)
    expect(screen.getByText('R$25.0k')).toBeTruthy()
  })
})
