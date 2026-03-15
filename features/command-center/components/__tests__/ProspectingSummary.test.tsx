import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProspectingSummary, type ProspectingMetrics } from '@/features/command-center/components/ProspectingSummary'

function makeData(overrides: Partial<ProspectingMetrics> = {}): ProspectingMetrics {
  return {
    totalCalls: 200,
    connectionRate: 28.5,
    scheduledMeetings: 10,
    bestHour: '14h',
    ...overrides,
  }
}

describe('ProspectingSummary', () => {
  it('renders all 4 metric cards', () => {
    render(<ProspectingSummary data={makeData()} />)
    expect(screen.getByText('Total Ligações')).toBeTruthy()
    expect(screen.getByText('Taxa de Conexão')).toBeTruthy()
    expect(screen.getByText('Agendamentos')).toBeTruthy()
    expect(screen.getByText('Melhor Horário')).toBeTruthy()
  })

  it('displays correct values', () => {
    render(<ProspectingSummary data={makeData()} />)
    expect(screen.getByText('200')).toBeTruthy()
    expect(screen.getByText('28.5%')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('14h')).toBeTruthy()
  })

  it('shows "--" fallback when bestHour is undefined', () => {
    render(<ProspectingSummary data={makeData({ bestHour: undefined })} />)
    expect(screen.getByText('--')).toBeTruthy()
  })

  it('formats connectionRate with 1 decimal place', () => {
    render(<ProspectingSummary data={makeData({ connectionRate: 33.333 })} />)
    expect(screen.getByText('33.3%')).toBeTruthy()
  })

  it('renders zero values without crashing', () => {
    render(<ProspectingSummary data={makeData({ totalCalls: 0, connectionRate: 0, scheduledMeetings: 0 })} />)
    expect(screen.getAllByText('0')).toHaveLength(2) // totalCalls + scheduledMeetings
    expect(screen.getByText('0.0%')).toBeTruthy()
  })

  it('applies custom className', () => {
    const { container } = render(<ProspectingSummary data={makeData()} className="mt-4" />)
    expect(container.firstChild).toHaveClass('mt-4')
  })

  it('renders section title', () => {
    render(<ProspectingSummary data={makeData()} />)
    expect(screen.getByText('Prospecção')).toBeTruthy()
  })
})
