import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopObjections } from '../components/TopObjections'
import type { CallActivity } from '../hooks/useProspectingMetrics'

/* eslint-disable no-restricted-syntax */
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}))
/* eslint-enable no-restricted-syntax */

const makeActivity = (objections?: string[]): CallActivity => ({
  id: `a-${Math.random()}`,
  date: '2026-03-10T10:00:00Z',
  owner_id: 'u1',
  contact_id: 'c1',
  metadata: {
    outcome: 'connected',
    duration_seconds: 60,
    ...(objections ? { objections } : {}),
  } as CallActivity['metadata'],
})

describe('TopObjections', () => {
  it('AC11: mostra empty state quando 0 objecoes', () => {
    render(<TopObjections activities={[]} isLoading={false} />)
    expect(screen.getByText(/Nenhuma objeção registrada/)).toBeInTheDocument()
    expect(screen.getByText(/Marque objeções durante ligações/)).toBeInTheDocument()
  })

  it('mostra skeleton quando loading', () => {
    const { container } = render(<TopObjections activities={[]} isLoading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('AC10: agrega objecoes e mostra top 5 ordenadas por contagem', () => {
    const activities = [
      makeActivity(['Preço alto', 'Sem interesse']),
      makeActivity(['Preço alto', 'Não é o momento']),
      makeActivity(['Preço alto', 'Sem interesse', 'Ligar depois']),
      makeActivity(['Sem interesse']),
      makeActivity(['Não é o momento', 'Sem orçamento']),
      makeActivity(['Ligar depois', 'Sem orçamento']),
    ]

    render(<TopObjections activities={activities} isLoading={false} />)

    expect(screen.getByText('Top 5 Objeções')).toBeInTheDocument()

    // Preço alto: 3x, Sem interesse: 3x, Não é o momento: 2x, Ligar depois: 2x, Sem orçamento: 2x
    expect(screen.getByText('Preço alto')).toBeInTheDocument()
    expect(screen.getByText('Sem interesse')).toBeInTheDocument()
    expect(screen.getByText('Não é o momento')).toBeInTheDocument()
    expect(screen.getByText('Ligar depois')).toBeInTheDocument()
    expect(screen.getByText('Sem orçamento')).toBeInTheDocument()

    // Check counts are displayed
    const counts = screen.getAllByText(/\dx/)
    expect(counts.length).toBe(5)
  })

  it('ignora atividades sem objecoes no metadata', () => {
    const activities = [
      makeActivity(undefined),
      makeActivity(['Preço alto']),
      makeActivity(undefined),
    ]

    render(<TopObjections activities={activities} isLoading={false} />)

    expect(screen.getByText('Preço alto')).toBeInTheDocument()
    expect(screen.getByText('1x')).toBeInTheDocument()
  })

  it('limita a 5 objecoes mesmo com mais', () => {
    const activities = [
      makeActivity(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
    ]

    render(<TopObjections activities={activities} isLoading={false} />)

    // Only 5 should be shown
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.queryByText('F')).not.toBeInTheDocument()
    expect(screen.queryByText('G')).not.toBeInTheDocument()
  })
})
