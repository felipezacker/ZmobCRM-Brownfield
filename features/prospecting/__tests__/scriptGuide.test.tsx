import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProspectingScriptGuide } from '../components/ProspectingScriptGuide'
import { ScriptSelector } from '../components/ScriptSelector'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'

// ── Mock Button ──────────────────────────────────────────────

vi.mock('@/app/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
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
})

// ── ScriptSelector Tests ──────────────────────────────────

describe('ScriptSelector', () => {
  it('renders available scripts', () => {
    render(
      <ScriptSelector selectedScript={null} onSelect={vi.fn()} />
    )
    expect(screen.getByText('Script Intro')).toBeInTheDocument()
    expect(screen.getByText('Script Follow-up')).toBeInTheDocument()
  })

  it('shows header', () => {
    render(
      <ScriptSelector selectedScript={null} onSelect={vi.fn()} />
    )
    expect(screen.getByText('Script de Chamada')).toBeInTheDocument()
  })

  it('shows selected script indicator', () => {
    render(
      <ScriptSelector selectedScript={mockScripts[0]} onSelect={vi.fn()} />
    )
    // "Script Intro" appears twice: in header check + list item
    expect(screen.getAllByText('Script Intro')).toHaveLength(2)
    expect(screen.getByText('Limpar')).toBeInTheDocument()
  })

  it('expands script to show preview and select button', () => {
    render(
      <ScriptSelector selectedScript={null} onSelect={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Script Intro'))
    expect(screen.getByText('Selecionar este script')).toBeInTheDocument()
  })

  it('calls onSelect when selecting a script', () => {
    const onSelect = vi.fn()
    render(
      <ScriptSelector selectedScript={null} onSelect={onSelect} />
    )
    fireEvent.click(screen.getByText('Script Intro'))
    fireEvent.click(screen.getByText('Selecionar este script'))
    expect(onSelect).toHaveBeenCalledWith(mockScripts[0])
  })

  it('calls onSelect(null) when clearing selection', () => {
    const onSelect = vi.fn()
    render(
      <ScriptSelector selectedScript={mockScripts[0]} onSelect={onSelect} />
    )
    fireEvent.click(screen.getByText('Limpar'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
