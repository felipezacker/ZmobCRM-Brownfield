import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PulseBar } from '@/features/command-center/components/PulseBar'

describe('PulseBar', () => {
  it('renders without crashing', () => {
    render(<PulseBar rules={[]} />)
    expect(screen.getByText('Pulso do Negócio')).toBeTruthy()
  })

  it('renders pulse rules with correct labels', () => {
    const rules = [
      { label: 'Receita', status: 'green' as const },
      { label: 'Conversão', status: 'yellow' as const },
      { label: 'Volume', status: 'red' as const },
    ]
    render(<PulseBar rules={rules} />)
    expect(screen.getByText('Receita')).toBeTruthy()
    expect(screen.getByText('Conversão')).toBeTruthy()
    expect(screen.getByText('Volume')).toBeTruthy()
  })

  it('renders green status with correct indicator', () => {
    const rules = [{ label: 'Receita', status: 'green' as const }]
    const { container } = render(<PulseBar rules={rules} />)
    const greenDot = container.querySelector('.bg-green-500')
    expect(greenDot).toBeTruthy()
  })

  it('renders red status with correct indicator', () => {
    const rules = [{ label: 'Volume', status: 'red' as const }]
    const { container } = render(<PulseBar rules={rules} />)
    const redDot = container.querySelector('.bg-red-500')
    expect(redDot).toBeTruthy()
  })

  it('renders yellow status with correct indicator', () => {
    const rules = [{ label: 'Conversão', status: 'yellow' as const }]
    const { container } = render(<PulseBar rules={rules} />)
    const yellowDot = container.querySelector('.bg-amber-500')
    expect(yellowDot).toBeTruthy()
  })

  it('sets title attribute for tooltip from detail prop', () => {
    const rules = [{ label: 'Receita', status: 'green' as const, detail: 'Variação: +15%' }]
    const { container } = render(<PulseBar rules={rules} />)
    const pill = container.querySelector('[title="Variação: +15%"]')
    expect(pill).toBeTruthy()
  })
})
