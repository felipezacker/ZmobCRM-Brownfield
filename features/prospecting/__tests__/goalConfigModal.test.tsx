import React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GoalConfigModal } from '../components/GoalConfigModal'
import type { DbDailyGoal } from '@/lib/supabase/prospecting-goals'

// Mock focus-trap-react (same as Modal.test.tsx)
vi.mock('focus-trap-react', () => ({
  default: ({ children, active }: { children: React.ReactNode; active: boolean }) => (
    <div data-testid="focus-trap" data-active={active}>
      {children}
    </div>
  ),
}))

const baseProfiles = [
  { id: 'user-1', name: 'Alice Santos' },
  { id: 'user-2', name: 'Bob Silva' },
  { id: 'user-3', name: 'Carlos Lima' },
]

const baseTeamGoals: DbDailyGoal[] = [
  {
    id: 'g1',
    owner_id: 'user-1',
    organization_id: 'org-1',
    calls_target: 30,
    connection_rate_target: 0.25,
    created_at: '2026-03-06T00:00:00Z',
    updated_at: '2026-03-06T00:00:00Z',
  },
]

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  currentTarget: 30,
  isAdminOrDirector: false,
  teamGoals: baseTeamGoals,
  profiles: baseProfiles,
  currentUserId: 'user-1',
  onSave: vi.fn().mockResolvedValue(undefined),
  isSaving: false,
}

describe('GoalConfigModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    render(<GoalConfigModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Minha Meta Diaria')).not.toBeInTheDocument()
  })

  it('renders "Minha Meta Diaria" for non-admin', () => {
    render(<GoalConfigModal {...defaultProps} />)
    expect(screen.getByText('Minha Meta Diaria')).toBeInTheDocument()
    expect(screen.queryByText('Metas dos Corretores')).not.toBeInTheDocument()
  })

  it('renders "Metas da Equipe" for admin/director', () => {
    render(<GoalConfigModal {...defaultProps} isAdminOrDirector={true} />)
    expect(screen.getByText('Metas da Equipe')).toBeInTheDocument()
    expect(screen.getByText('Metas dos Corretores')).toBeInTheDocument()
  })

  it('shows team members excluding current user when admin', () => {
    render(<GoalConfigModal {...defaultProps} isAdminOrDirector={true} />)
    // Should show Bob and Carlos but not Alice (current user)
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('initializes team edits for ALL profiles, not just those with goals', () => {
    // Only user-1 has a goal, user-2 and user-3 do not
    render(<GoalConfigModal {...defaultProps} isAdminOrDirector={true} />)

    // Both Bob and Carlos should have input fields with default value 30
    const inputs = screen.getAllByRole('spinbutton')
    // First input = my goal (30), then Bob (30 default), Carlos (30 default)
    expect(inputs).toHaveLength(3)
    expect(inputs[1]).toHaveValue(30)
    expect(inputs[2]).toHaveValue(30)
  })

  it('calls onSave with current user ID when saving own goal', async () => {
    render(<GoalConfigModal {...defaultProps} />)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '50' } })

    const saveButton = screen.getByText('Salvar')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith('user-1', 50)
    })
  })

  it('calls onSave with team member ID when saving their goal', async () => {
    render(<GoalConfigModal {...defaultProps} isAdminOrDirector={true} />)

    // Find save buttons for team members (title="Salvar meta")
    const teamSaveButtons = screen.getAllByTitle('Salvar meta')
    expect(teamSaveButtons).toHaveLength(2) // Bob and Carlos

    fireEvent.click(teamSaveButtons[0]) // Save Bob's goal

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith('user-2', 30)
    })
  })

  it('disables save buttons when isSaving is true', () => {
    render(<GoalConfigModal {...defaultProps} isAdminOrDirector={true} isSaving={true} />)

    const saveButton = screen.getByText('Salvar')
    expect(saveButton).toBeDisabled()

    const teamSaveButtons = screen.getAllByTitle('Salvar meta')
    for (const btn of teamSaveButtons) {
      expect(btn).toBeDisabled()
    }
  })

  it('uses existing goal target for team member who has a goal', () => {
    const goalsWithBob: DbDailyGoal[] = [
      ...baseTeamGoals,
      {
        id: 'g2',
        owner_id: 'user-2',
        organization_id: 'org-1',
        calls_target: 45,
        connection_rate_target: 0.25,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
      },
    ]

    render(
      <GoalConfigModal {...defaultProps} isAdminOrDirector={true} teamGoals={goalsWithBob} />,
    )

    const inputs = screen.getAllByRole('spinbutton')
    // inputs[0] = my goal (30), inputs[1] = Bob (45 from goal), inputs[2] = Carlos (30 default)
    expect(inputs[1]).toHaveValue(45)
    expect(inputs[2]).toHaveValue(30)
  })
})
