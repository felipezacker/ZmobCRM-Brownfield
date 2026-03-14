import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PowerDialer } from '../components/PowerDialer'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'
import type { SessionStats } from '../ProspectingPage'

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/features/inbox/components/CallModal', () => ({
  // eslint-disable-next-line no-restricted-syntax -- mock component
  CallModal: ({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave?: (data: { title: string; notes: string; outcome: string; duration: number }) => void }) =>
    isOpen ? (
      // eslint-disable-next-line no-restricted-syntax -- mock component
      <div data-testid="call-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSave?.({ title: 'Test Call', notes: '', outcome: 'connected', duration: 60 })}>SaveCall</button>
      </div>
    ) : null,
}))

vi.mock('@/features/prospecting/components/QuickActionsPanel', () => ({
  // eslint-disable-next-line no-restricted-syntax -- mock component
  QuickActionsPanel: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="quick-actions-panel">
      <button onClick={onDismiss}>DismissPanel</button>
    </div>
  ),
}))

vi.mock('@/features/prospecting/components/ProspectingScriptGuide', () => ({
  ProspectingScriptGuide: () => <div data-testid="script-guide" />,
}))

const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'activity-123' })
vi.mock('@/lib/query/hooks/useActivitiesQuery', () => ({
  useCreateActivity: () => ({ mutate: mockMutateAsync, mutateAsync: mockMutateAsync }),
  useContactActivities: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/lib/supabase/deals', () => ({
  getOpenDealsByContact: vi.fn().mockResolvedValue(null),
}))

const mockScripts: QuickScript[] = [
  {
    id: 'script-1',
    title: 'Script Intro',
    category: 'intro',
    template: '## Saudação\nOlá {nome}, tudo bem?\n\n## Qualificação\nVocê busca imóvel?\n\n## Fechamento\nVamos agendar?',
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
  retryCount: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  contactName: 'Maria Silva',
  contactPhone: '11999990000',
  contactEmail: 'maria@test.com',
  contactStage: 'LEAD',
  contactTemperature: 'HOT',
  ...overrides,
})

const defaultProps = () => ({
  contact: makeContact(),
  currentIndex: 0,
  totalCount: 10,
  onCallComplete: vi.fn(),
  onSkip: vi.fn(),
  onEnd: vi.fn(),
  onScriptChange: vi.fn(),
  selectedScript: null as QuickScript | null,
  sessionStats: undefined as SessionStats | undefined,
})

const pressKey = (key: string, target?: HTMLElement) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  if (target) {
    fireEvent.keyDown(target, { key })
  } else {
    act(() => { window.dispatchEvent(event) })
  }
}

// ── Keyboard Shortcuts ──────────────────────────────────

describe('PowerDialer — Keyboard Shortcuts', () => {
  it('L opens CallModal', () => {
    render(<PowerDialer {...defaultProps()} />)
    expect(screen.queryByTestId('call-modal')).not.toBeInTheDocument()

    pressKey('l')
    expect(screen.getByTestId('call-modal')).toBeInTheDocument()
  })

  it('P key does NOT skip (shortcut removed for friction)', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    pressKey('p')
    expect(props.onSkip).not.toHaveBeenCalled()
  })

  it('E calls onEnd', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    pressKey('e')
    expect(props.onEnd).toHaveBeenCalledOnce()
  })

  it('S toggles script dropdown', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Dropdown should not be visible initially
    expect(screen.queryByText('Script Intro')).not.toBeInTheDocument()

    // Press S to open
    pressKey('s')
    expect(screen.getByText('Script Intro')).toBeInTheDocument()
  })

  it('shortcuts are disabled when CallModal is open', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Open CallModal
    pressKey('l')
    expect(screen.getByTestId('call-modal')).toBeInTheDocument()

    // E should not call onEnd while modal is open
    pressKey('e')
    expect(props.onEnd).not.toHaveBeenCalled()
  })

  it('shortcuts are disabled when dropdown is open', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Open dropdown
    pressKey('s')
    expect(screen.getByText('Script Intro')).toBeInTheDocument()

    // E should not call onEnd
    pressKey('e')
    expect(props.onEnd).not.toHaveBeenCalled()
  })

  it('shortcuts are ignored when typing in input elements', () => {
    const props = defaultProps()
    const { container } = render(
      <div>
        <PowerDialer {...props} />
        <input data-testid="text-input" />
      </div>
    )

    const input = screen.getByTestId('text-input')
    fireEvent.keyDown(input, { key: 'l', bubbles: true })

    expect(screen.queryByTestId('call-modal')).not.toBeInTheDocument()
  })

  it('shortcuts are ignored when typing in textarea elements', () => {
    const props = defaultProps()
    render(
      <div>
        <PowerDialer {...props} />
        <textarea data-testid="text-area" />
      </div>
    )

    const textarea = screen.getByTestId('text-area')
    fireEvent.keyDown(textarea, { key: 'p', bubbles: true })

    expect(props.onSkip).not.toHaveBeenCalled()
  })

  it('Escape closes dropdown when open', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Open dropdown
    pressKey('s')
    expect(screen.getByText('Script Intro')).toBeInTheDocument()

    // Escape closes it
    pressKey('Escape')
    expect(screen.queryByText('Script Intro')).not.toBeInTheDocument()
  })
})

// ── Script Dropdown ──────────────────────────────────

describe('PowerDialer — Script Dropdown', () => {
  it('opens dropdown on button click', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    fireEvent.click(screen.getByText('Selecionar script de chamada'))
    expect(screen.getByText('Script Intro')).toBeInTheDocument()
    expect(screen.getByText('Script Follow-up')).toBeInTheDocument()
  })

  it('selects a script from dropdown', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    fireEvent.click(screen.getByText('Selecionar script de chamada'))
    fireEvent.click(screen.getByText('Script Intro'))

    expect(props.onScriptChange).toHaveBeenCalledWith(mockScripts[0])
  })

  it('deselects script when clicking already-selected script', () => {
    const props = { ...defaultProps(), selectedScript: mockScripts[0] }
    render(<PowerDialer {...props} />)

    // Open dropdown — button now shows script title
    fireEvent.click(screen.getByText('Script Intro'))
    // Click the same script in dropdown list
    const dropdownItems = screen.getAllByText('Script Intro')
    fireEvent.click(dropdownItems[dropdownItems.length - 1])

    expect(props.onScriptChange).toHaveBeenCalledWith(null)
  })

  it('closes dropdown on outside click', () => {
    const props = defaultProps()
    render(
      <div>
        <PowerDialer {...props} />
        <div data-testid="outside">Outside</div>
      </div>
    )

    // Open dropdown
    fireEvent.click(screen.getByText('Selecionar script de chamada'))
    expect(screen.getByText('Script Intro')).toBeInTheDocument()

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Script Intro')).not.toBeInTheDocument()
  })
})

// ── Session Stats Chips ──────────────────────────────────

describe('PowerDialer — Session Stats Chips', () => {
  it('renders only chips with count > 0', () => {
    const stats: SessionStats = {
      total: 10,
      completed: 5,
      skipped: 0,
      connected: 3,
      noAnswer: 2,
      voicemail: 0,
      busy: 0,
    }
    const props = { ...defaultProps(), sessionStats: stats }
    render(<PowerDialer {...props} />)

    expect(screen.getByText(/3.*Atenderam/)).toBeInTheDocument()
    expect(screen.getByText(/2.*Não atenderam/)).toBeInTheDocument()
    expect(screen.queryByText(/Caixa postal/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ocupados/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pulados/)).not.toBeInTheDocument()
  })

  it('renders no chips when all counts are 0', () => {
    const stats: SessionStats = {
      total: 0,
      completed: 0,
      skipped: 0,
      connected: 0,
      noAnswer: 0,
      voicemail: 0,
      busy: 0,
    }
    const props = { ...defaultProps(), sessionStats: stats }
    render(<PowerDialer {...props} />)

    expect(screen.queryByText(/Atenderam/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Não atenderam/)).not.toBeInTheDocument()
  })

  it('renders all chips when all counts > 0', () => {
    const stats: SessionStats = {
      total: 15,
      completed: 10,
      skipped: 1,
      connected: 5,
      noAnswer: 2,
      voicemail: 1,
      busy: 1,
    }
    const props = { ...defaultProps(), sessionStats: stats }
    render(<PowerDialer {...props} />)

    expect(screen.getByText(/Atenderam/)).toBeInTheDocument()
    expect(screen.getByText(/Não atenderam/)).toBeInTheDocument()
    expect(screen.getByText(/Caixa postal/)).toBeInTheDocument()
    expect(screen.getByText(/Ocupados/)).toBeInTheDocument()
    expect(screen.getByText(/Pulados/)).toBeInTheDocument()
  })

  it('does not render chips when sessionStats is undefined', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    expect(screen.queryByText(/Atenderam/)).not.toBeInTheDocument()
  })
})

// ── Script Preview ──────────────────────────────────

describe('PowerDialer — Script Preview', () => {
  it('shows first 2 lines with variables substituted when script selected', () => {
    const props = { ...defaultProps(), selectedScript: mockScripts[0] }
    render(<PowerDialer {...props} />)

    // Script preview substitutes {nome} with contact name
    expect(screen.getByText(/Olá Maria Silva, tudo bem/)).toBeInTheDocument()
  })

  it('does not show preview when no script selected', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    expect(screen.queryByText(/Olá Maria Silva/)).not.toBeInTheDocument()
  })
})

// ── Purple Dot Indicator ──────────────────────────────────

describe('PowerDialer — Purple Dot Indicator', () => {
  it('shows purple dot on Ligar button when script is selected', () => {
    const props = { ...defaultProps(), selectedScript: mockScripts[0] }
    const { container } = render(<PowerDialer {...props} />)

    const purpleDot = container.querySelector('.bg-purple-500.rounded-full')
    expect(purpleDot).toBeInTheDocument()
  })

  it('does not show purple dot when no script selected', () => {
    const props = defaultProps()
    const { container } = render(<PowerDialer {...props} />)

    const purpleDot = container.querySelector('.bg-purple-500.rounded-full')
    expect(purpleDot).not.toBeInTheDocument()
  })
})

// ── Skip Reason Dropdown ──────────────────────────────────

describe('PowerDialer — Skip Reason Dropdown', () => {
  it('clicking Pular opens reason dropdown instead of skipping immediately', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    fireEvent.click(screen.getByText('Pular'))
    expect(props.onSkip).not.toHaveBeenCalled()
    expect(screen.getByText('Motivo do pulo:')).toBeInTheDocument()
    expect(screen.getByText('Número errado')).toBeInTheDocument()
    expect(screen.getByText('Já tentei hoje')).toBeInTheDocument()
  })

  it('selecting a reason calls onSkip with the reason id', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    fireEvent.click(screen.getByText('Pular'))
    fireEvent.click(screen.getByText('Número errado'))
    expect(props.onSkip).toHaveBeenCalledWith('wrong_number')
  })

  it('closes dropdown after selecting a reason', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    fireEvent.click(screen.getByText('Pular'))
    fireEvent.click(screen.getByText('Já tentei hoje'))
    expect(screen.queryByText('Motivo do pulo:')).not.toBeInTheDocument()
  })

  it('closes dropdown on outside click', () => {
    const props = defaultProps()
    render(
      <div>
        <PowerDialer {...props} />
        <div data-testid="outside">Outside</div>
      </div>
    )

    fireEvent.click(screen.getByText('Pular'))
    expect(screen.getByText('Motivo do pulo:')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Motivo do pulo:')).not.toBeInTheDocument()
  })
})

// ── CP-6.2: Skip Button Disabled When QuickActionsPanel Visible ──────────

describe('PowerDialer — CP-6.2: Skip Protection', () => {
  it('disables Pular button when QuickActionsPanel is visible (AC1)', async () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Open CallModal and save a call to trigger QuickActionsPanel
    fireEvent.click(screen.getByText('Ligar'))
    expect(screen.getByTestId('call-modal')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('SaveCall'))
    })

    // QuickActionsPanel should be visible
    expect(screen.getByTestId('quick-actions-panel')).toBeInTheDocument()

    // Pular button should be disabled
    const pularButton = screen.getByText('Pular').closest('button')
    expect(pularButton).toHaveAttribute('disabled')
    expect(pularButton?.className).toContain('opacity-50')
    expect(pularButton?.className).toContain('cursor-not-allowed')
  })

  it('shows tooltip on disabled Pular button (AC1)', async () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Trigger QuickActionsPanel
    fireEvent.click(screen.getByText('Ligar'))
    await act(async () => {
      fireEvent.click(screen.getByText('SaveCall'))
    })

    const pularButton = screen.getByText('Pular').closest('button')
    expect(pularButton).toHaveAttribute('title', 'Registre ou avance pelo painel abaixo')
  })

  it('Ligar and Encerrar remain active when QuickActionsPanel is visible (AC2)', async () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Trigger QuickActionsPanel
    fireEvent.click(screen.getByText('Ligar'))
    await act(async () => {
      fireEvent.click(screen.getByText('SaveCall'))
    })

    // Ligar should not be disabled
    const ligarButton = screen.getByText('Ligar').closest('button')
    expect(ligarButton).not.toHaveAttribute('disabled')

    // Encerrar should not be disabled
    const encerrarButton = screen.getByText('Encerrar').closest('button')
    expect(encerrarButton).not.toHaveAttribute('disabled')
  })

  it('Pular button works normally when QuickActionsPanel is NOT visible (AC3)', () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // QuickActionsPanel not visible — Pular should work
    const pularButton = screen.getByText('Pular').closest('button')
    expect(pularButton).not.toHaveAttribute('disabled')
    expect(pularButton?.className).not.toContain('opacity-50')
  })

  it('keyboard shortcuts remain blocked when QuickActionsPanel is visible (AC11)', async () => {
    const props = defaultProps()
    render(<PowerDialer {...props} />)

    // Trigger QuickActionsPanel
    fireEvent.click(screen.getByText('Ligar'))
    await act(async () => {
      fireEvent.click(screen.getByText('SaveCall'))
    })

    // E should NOT call onEnd while QuickActionsPanel is open
    pressKey('e')
    expect(props.onEnd).not.toHaveBeenCalled()
  })
})
