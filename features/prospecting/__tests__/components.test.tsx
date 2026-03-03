import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CallQueue } from '../components/CallQueue'
import { SessionSummary } from '../components/SessionSummary'
import { QueueItem } from '../components/QueueItem'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'
import type { SessionStats } from '../ProspectingPage'

// ── Mock Button ──────────────────────────────────────────────

vi.mock('@/app/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
}))

// ── Helpers ──────────────────────────────────────────────

const makeItem = (overrides?: Partial<ProspectingQueueItem>): ProspectingQueueItem => ({
  id: 'q-1',
  contactId: 'c-1',
  ownerId: 'u-1',
  organizationId: 'org-1',
  status: 'pending' as ProspectingQueueStatus,
  position: 0,
  createdAt: '2026-03-03T00:00:00Z',
  updatedAt: '2026-03-03T00:00:00Z',
  contactName: 'João Silva',
  contactPhone: '11999990000',
  contactStage: 'LEAD',
  contactTemperature: 'HOT',
  ...overrides,
})

// ── CallQueue ──────────────────────────────────────────────

describe('CallQueue', () => {
  it('mostra skeleton quando loading', () => {
    const { container } = render(<CallQueue items={[]} isLoading={true} onRemove={vi.fn()} />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('mostra mensagem de fila vazia quando sem itens', () => {
    render(<CallQueue items={[]} isLoading={false} onRemove={vi.fn()} />)
    expect(screen.getByText('Fila vazia')).toBeInTheDocument()
  })

  it('renderiza itens da fila', () => {
    const items = [
      makeItem({ id: 'q-1', contactName: 'João' }),
      makeItem({ id: 'q-2', contactName: 'Maria', position: 1 }),
    ]
    render(<CallQueue items={items} isLoading={false} onRemove={vi.fn()} />)
    expect(screen.getByText('João')).toBeInTheDocument()
    expect(screen.getByText('Maria')).toBeInTheDocument()
  })

  it('mostra contagem de pendentes', () => {
    const items = [
      makeItem({ id: 'q-1', status: 'pending' }),
      makeItem({ id: 'q-2', status: 'completed', position: 1 }),
      makeItem({ id: 'q-3', status: 'pending', position: 2 }),
    ]
    render(<CallQueue items={items} isLoading={false} onRemove={vi.fn()} />)
    expect(screen.getByText('2 pendentes')).toBeInTheDocument()
  })
})

// ── QueueItem ──────────────────────────────────────────────

describe('QueueItem', () => {
  it('renderiza nome, telefone e stage do contato', () => {
    render(<QueueItem item={makeItem()} onRemove={vi.fn()} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('11999990000')).toBeInTheDocument()
    expect(screen.getByText('LEAD')).toBeInTheDocument()
  })

  it('mostra "Sem nome" quando contactName é undefined', () => {
    render(<QueueItem item={makeItem({ contactName: undefined })} />)
    expect(screen.getByText('Sem nome')).toBeInTheDocument()
  })

  it('mostra status badge correto', () => {
    render(<QueueItem item={makeItem({ status: 'completed' })} />)
    expect(screen.getByText('Concluído')).toBeInTheDocument()
  })

  it('chama onRemove ao clicar no botão de remover', () => {
    const onRemove = vi.fn()
    render(<QueueItem item={makeItem()} onRemove={onRemove} />)
    fireEvent.click(screen.getByLabelText('Remover da fila'))
    expect(onRemove).toHaveBeenCalledWith('q-1')
  })

  it('não renderiza botão de remover quando onRemove é undefined', () => {
    render(<QueueItem item={makeItem()} />)
    expect(screen.queryByLabelText('Remover da fila')).not.toBeInTheDocument()
  })
})

// ── SessionSummary ──────────────────────────────────────────────

describe('SessionSummary', () => {
  const baseStats: SessionStats = {
    total: 10,
    completed: 5,
    skipped: 2,
    connected: 3,
    noAnswer: 1,
    voicemail: 1,
    busy: 0,
  }

  it('renderiza todos os campos de estatísticas', () => {
    render(
      <SessionSummary
        stats={baseStats}
        startTime={new Date()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Sessão Encerrada')).toBeInTheDocument()
    expect(screen.getByText('Total de ligações')).toBeInTheDocument()
    expect(screen.getByText('Conectadas')).toBeInTheDocument()
    expect(screen.getByText('Não atendeu')).toBeInTheDocument()
    expect(screen.getByText('Correio de voz')).toBeInTheDocument()
    expect(screen.getByText('Ocupado')).toBeInTheDocument()
    expect(screen.getByText('Puladas')).toBeInTheDocument()
    expect(screen.getByText('Tempo total')).toBeInTheDocument()
  })

  it('mostra valores corretos', () => {
    render(
      <SessionSummary
        stats={baseStats}
        startTime={new Date()}
        onClose={vi.fn()}
      />
    )
    // completed=5, connected=3, noAnswer=1, voicemail=1, busy=0, skipped=2
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('chama onClose ao clicar "Voltar à Fila"', () => {
    const onClose = vi.fn()
    render(
      <SessionSummary
        stats={baseStats}
        startTime={new Date()}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByText('Voltar à Fila'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
