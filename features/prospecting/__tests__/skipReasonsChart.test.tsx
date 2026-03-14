import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkipReasonsChart } from '../components/SkipReasonsChart'
import type { SkipReasonCount } from '../hooks/useSkipReasons'

const makeData = (entries: [string, number][]): SkipReasonCount[] =>
  entries.map(([reason, count]) => ({ reason, count }))

describe('SkipReasonsChart', () => {
  it('mostra empty state quando nao ha dados', () => {
    render(<SkipReasonsChart data={[]} isLoading={false} />)
    expect(screen.getByText('Nenhum skip registrado')).toBeInTheDocument()
  })

  it('mostra skeleton quando loading', () => {
    const { container } = render(<SkipReasonsChart data={[]} isLoading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renderiza barras com labels em portugues e percentuais', () => {
    const data = makeData([
      ['wrong_number', 5],
      ['no_interest', 3],
      ['bad_timing', 2],
    ])

    render(<SkipReasonsChart data={data} isLoading={false} />)

    expect(screen.getByText('Motivos de Skip')).toBeInTheDocument()
    expect(screen.getByText('Numero errado')).toBeInTheDocument()
    expect(screen.getByText('Sem interesse')).toBeInTheDocument()
    expect(screen.getByText('Momento ruim')).toBeInTheDocument()

    // total = 10: 5 = 50%, 3 = 30%, 2 = 20%
    expect(screen.getByText('5x (50%)')).toBeInTheDocument()
    expect(screen.getByText('3x (30%)')).toBeInTheDocument()
    expect(screen.getByText('2x (20%)')).toBeInTheDocument()
  })

  it('renderiza todas as 5 razoes conhecidas com labels corretas', () => {
    const data = makeData([
      ['wrong_number', 1],
      ['already_tried', 1],
      ['bad_timing', 1],
      ['no_interest', 1],
      ['other', 1],
    ])

    render(<SkipReasonsChart data={data} isLoading={false} />)

    expect(screen.getByText('Numero errado')).toBeInTheDocument()
    expect(screen.getByText('Ja tentado')).toBeInTheDocument()
    expect(screen.getByText('Momento ruim')).toBeInTheDocument()
    expect(screen.getByText('Sem interesse')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
  })

  it('usa o valor bruto como label para razoes desconhecidas', () => {
    const data = makeData([['custom_reason', 4]])

    render(<SkipReasonsChart data={data} isLoading={false} />)

    expect(screen.getByText('custom_reason')).toBeInTheDocument()
    expect(screen.getByText('4x (100%)')).toBeInTheDocument()
  })

  it('nao renderiza barras no empty state', () => {
    const { container } = render(<SkipReasonsChart data={[]} isLoading={false} />)
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0)
  })
})
