import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProspectingScriptGuide, ALL_OBJECTIONS } from '../components/ProspectingScriptGuide'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'

// ── Mock Button ──────────────────────────────────────────────

vi.mock('@/app/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
}))

// ── Mock Toast ──────────────────────────────────────────────

const mockToast = vi.fn()
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockToast,
    showToast: mockToast,
  }),
}))

// ── Mock Sheet ──────────────────────────────────────────────

vi.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="sheet">{children}</div> : null,
}))

// ── Mock Scripts Data ──────────────────────────────────────

const mockScripts: QuickScript[] = [
  {
    id: 'script-1',
    title: 'Script Intro',
    category: 'intro',
    template: '## Intro\nOlá {nome}!\n\n## Qualificação\nVocê busca imóvel?\n\n## Fechamento\nVamos agendar?',
    icon: 'MessageSquare',
    is_system: false,
    user_id: 'user-1',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 'script-2',
    title: 'Script Follow-up',
    category: 'followup',
    template: 'Olá {nome}, como está?',
    icon: 'MessageSquare',
    is_system: false,
    user_id: 'user-1',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
]

vi.mock('@/features/inbox/hooks/useQuickScripts', () => ({
  useQuickScripts: () => ({
    scripts: mockScripts,
    isLoading: false,
    error: null,
  }),
}))

// ── Helpers ──────────────────────────────────────────────

const makeContact = (overrides?: Partial<ProspectingQueueItem>): ProspectingQueueItem => ({
  id: 'q-1',
  contactId: 'c-1',
  ownerId: 'o-1',
  organizationId: 'org-1',
  status: 'pending' as ProspectingQueueStatus,
  position: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  contactName: 'Maria Silva',
  contactPhone: '11999990000',
  contactEmail: 'maria@test.com',
  contactStage: 'LEAD',
  contactTemperature: 'HOT',
  ...overrides,
})

// ── ProspectingScriptGuide Tests ──────────────────────────────

describe('ProspectingScriptGuide', () => {
  it('renders script title and section tabs', () => {
    render(
      <ProspectingScriptGuide
        script={mockScripts[0]}
        contact={makeContact()}
      />
    )
    expect(screen.getByText('Script Intro')).toBeInTheDocument()
    // Section tabs
    expect(screen.getByRole('button', { name: 'Intro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Qualificação' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechamento' })).toBeInTheDocument()
  })

  it('substitutes variables with contact data', () => {
    render(
      <ProspectingScriptGuide
        script={mockScripts[0]}
        contact={makeContact()}
      />
    )
    expect(screen.getByText(/Olá Maria Silva!/)).toBeInTheDocument()
  })

  it('navigates between sections with next/prev', () => {
    render(
      <ProspectingScriptGuide
        script={mockScripts[0]}
        contact={makeContact()}
      />
    )
    expect(screen.getByText('1/3')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Próximo'))
    expect(screen.getByText('2/3')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Anterior'))
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('navigates via section tabs', () => {
    render(
      <ProspectingScriptGuide
        script={mockScripts[0]}
        contact={makeContact()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fechamento' }))
    expect(screen.getByText('3/3')).toBeInTheDocument()
  })

  it('toggles objections and calls callback', () => {
    const onObjectionsChange = vi.fn()
    render(
      <ProspectingScriptGuide
        script={mockScripts[0]}
        contact={makeContact()}
        markedObjections={[]}
        onObjectionsChange={onObjectionsChange}
      />
    )

    fireEvent.click(screen.getByText('Sem interesse'))
    expect(onObjectionsChange).toHaveBeenCalledWith(['Sem interesse'])
  })

  it('removes objection when already marked', () => {
    const onObjectionsChange = vi.fn()
    render(
      <ProspectingScriptGuide
        script={mockScripts[0]}
        contact={makeContact()}
        markedObjections={['Sem interesse']}
        onObjectionsChange={onObjectionsChange}
      />
    )

    fireEvent.click(screen.getByText('Sem interesse'))
    expect(onObjectionsChange).toHaveBeenCalledWith([])
  })

  it('renders single section with no navigation for simple template', () => {
    render(
      <ProspectingScriptGuide
        script={mockScripts[1]}
        contact={makeContact()}
      />
    )
    expect(screen.getByText(/Olá Maria Silva, como está/)).toBeInTheDocument()
    expect(screen.queryByText('Próximo')).not.toBeInTheDocument()
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument()
  })

  it('shows category-relevant objections first for closing script', () => {
    render(
      <ProspectingScriptGuide
        script={{ ...mockScripts[0], category: 'closing' }}
        contact={makeContact()}
        markedObjections={[]}
        onObjectionsChange={vi.fn()}
      />
    )
    const objectionButtons = screen.getAllByRole('button').filter(b =>
      ALL_OBJECTIONS.some(o => b.textContent?.includes(o))
    )
    // Closing category prioritizes: Preço alto, Sem orçamento, Precisa pensar, Precisa falar com cônjuge
    expect(objectionButtons[0].textContent).toContain('Preço alto')
    expect(objectionButtons[1].textContent).toContain('Sem orçamento')
  })

  it('cleans unresolved variables from rendered script', () => {
    const scriptWithUnresolved = {
      ...mockScripts[1],
      template: 'Olá {nome}, da {empresa}! Valor: {valor}',
    }
    render(
      <ProspectingScriptGuide
        script={scriptWithUnresolved}
        contact={makeContact()}
      />
    )
    // {empresa} and {valor} should be cleaned (empty), {nome} was substituted
    expect(screen.getByText(/Olá Maria Silva, da/)).toBeInTheDocument()
    expect(screen.queryByText('{empresa}')).not.toBeInTheDocument()
    expect(screen.queryByText('{valor}')).not.toBeInTheDocument()
  })
})

