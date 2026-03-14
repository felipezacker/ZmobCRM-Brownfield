import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RetryEffectiveness } from '../components/RetryEffectiveness'
import type { RetryEffectivenessData } from '../hooks/useRetryEffectiveness'

// ── Fixtures ──────────────────────────────────────────────

const mockData: RetryEffectivenessData = {
  firstAttempt: { label: '1a Tentativa', completed: 8, total: 20, rate: 40 },
  secondAttempt: { label: '2a Tentativa', completed: 3, total: 10, rate: 30 },
  thirdPlus: { label: '3+ Tentativas', completed: 1, total: 5, rate: 20 },
  hasData: true,
}

const emptyData: RetryEffectivenessData = {
  firstAttempt: { label: '1a Tentativa', completed: 0, total: 0, rate: 0 },
  secondAttempt: { label: '2a Tentativa', completed: 0, total: 0, rate: 0 },
  thirdPlus: { label: '3+ Tentativas', completed: 0, total: 0, rate: 0 },
  hasData: false,
}

// ── Tests ──────────────────────────────────────────────

describe('RetryEffectiveness', () => {
  it('renders all three buckets with data', () => {
    render(<RetryEffectiveness data={mockData} isLoading={false} />)

    expect(screen.getByText('Efetividade de Retentativas')).toBeInTheDocument()
    expect(screen.getByText('1a Tentativa')).toBeInTheDocument()
    expect(screen.getByText('2a Tentativa')).toBeInTheDocument()
    expect(screen.getByText('3+ Tentativas')).toBeInTheDocument()

    expect(screen.getByText('8 de 20 conectaram (40%)')).toBeInTheDocument()
    expect(screen.getByText('3 de 10 conectaram (30%)')).toBeInTheDocument()
    expect(screen.getByText('1 de 5 conectaram (20%)')).toBeInTheDocument()
  })

  it('renders empty state when hasData is false', () => {
    render(<RetryEffectiveness data={emptyData} isLoading={false} />)

    expect(screen.getByText('Dados insuficientes para analise de retentativas')).toBeInTheDocument()
    expect(screen.queryByText('1a Tentativa')).not.toBeInTheDocument()
  })

  it('renders empty state when data is undefined', () => {
    render(<RetryEffectiveness data={undefined} isLoading={false} />)

    expect(screen.getByText('Dados insuficientes para analise de retentativas')).toBeInTheDocument()
  })

  it('renders skeleton when loading', () => {
    const { container } = render(<RetryEffectiveness data={undefined} isLoading={true} />)

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('Efetividade de Retentativas')).not.toBeInTheDocument()
  })

  it('shows correct percentage values', () => {
    render(<RetryEffectiveness data={mockData} isLoading={false} />)

    // The percentages should be displayed as header values
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
  })
})
