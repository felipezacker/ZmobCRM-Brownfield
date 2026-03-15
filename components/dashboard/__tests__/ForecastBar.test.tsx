import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ForecastBar } from '@/components/dashboard/ForecastBar'

describe('ForecastBar', () => {
  it('renders without crashing with goal set', () => {
    render(<ForecastBar currentValue={80000} goalTarget={100000} />)
    expect(screen.getByText('Receita')).toBeTruthy()
  })

  it('shows emerald gradient when above 75%', () => {
    const { container } = render(<ForecastBar currentValue={80000} goalTarget={100000} />)
    const bar = container.querySelector('.from-emerald-400')
    expect(bar).toBeTruthy()
  })

  it('shows amber gradient when below 75%', () => {
    const { container } = render(<ForecastBar currentValue={50000} goalTarget={100000} />)
    const bar = container.querySelector('.from-amber-400')
    expect(bar).toBeTruthy()
  })

  it('shows "Meta não configurada" when goalTarget is 0', () => {
    render(<ForecastBar currentValue={0} goalTarget={0} />)
    expect(screen.getByText('Meta não configurada')).toBeTruthy()
  })

  it('shows "Atingido" when currentValue >= goalTarget', () => {
    render(<ForecastBar currentValue={110000} goalTarget={100000} />)
    expect(screen.getByText('✓ Atingido')).toBeTruthy()
  })

  it('formats currency values correctly', () => {
    render(<ForecastBar currentValue={1500000} goalTarget={2000000} goalType="currency" />)
    expect(screen.getByText('R$1.5M')).toBeTruthy()
    expect(screen.getByText('R$2.0M')).toBeTruthy()
  })

  it('formats percentage values correctly', () => {
    render(<ForecastBar currentValue={35.5} goalTarget={50} goalType="percentage" />)
    expect(screen.getByText('35.5%')).toBeTruthy()
    expect(screen.getByText('50.0%')).toBeTruthy()
  })
})
