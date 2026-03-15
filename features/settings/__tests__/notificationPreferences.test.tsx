import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { isEventEnabled, NOTIFICATION_EVENTS } from '../hooks/useNotificationPreferences'
import { NotificationPreferences } from '../components/NotificationPreferences'

// ============================================
// Unit tests for isEventEnabled (pure logic)
// ============================================

describe('isEventEnabled', () => {
  it('returns true for all events when JSONB is empty ({})', () => {
    const prefs = {}
    for (const event of NOTIFICATION_EVENTS) {
      expect(isEventEnabled(prefs, event.key)).toBe(true)
    }
  })

  it('returns false when event key is explicitly false', () => {
    const prefs = { DEAL_WON: false }
    expect(isEventEnabled(prefs, 'DEAL_WON')).toBe(false)
  })

  it('returns true when event key is explicitly true', () => {
    const prefs = { DEAL_WON: true }
    expect(isEventEnabled(prefs, 'DEAL_WON')).toBe(true)
  })

  it('returns true when event key is absent (undefined)', () => {
    const prefs = { DEAL_LOST: false }
    expect(isEventEnabled(prefs, 'DEAL_WON')).toBe(true)
  })

  it('handles multiple disabled events', () => {
    const prefs = { DEAL_WON: false, TASK_CREATED: false }
    expect(isEventEnabled(prefs, 'DEAL_WON')).toBe(false)
    expect(isEventEnabled(prefs, 'TASK_CREATED')).toBe(false)
    expect(isEventEnabled(prefs, 'DEAL_ASSIGNED')).toBe(true)
    expect(isEventEnabled(prefs, 'DEAL_LOST')).toBe(true)
    expect(isEventEnabled(prefs, 'NOTE_MENTION')).toBe(true)
  })
})

// ============================================
// Mock setup for component tests
// ============================================

const mockUpdatePreference = vi.fn()
let mockPreferences: Record<string, boolean> = {}
let mockIsLoading = false

vi.mock('../hooks/useNotificationPreferences', async () => {
  const actual = await vi.importActual('../hooks/useNotificationPreferences')
  return {
    ...actual,
    useNotificationPreferences: () => ({
      preferences: mockPreferences,
      updatePreference: mockUpdatePreference,
      isLoading: mockIsLoading,
    }),
  }
})

describe('NotificationPreferences component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPreferences = {
      DEAL_ASSIGNED: true,
      DEAL_WON: true,
      DEAL_LOST: true,
      TASK_CREATED: true,
      NOTE_MENTION: true,
    }
    mockIsLoading = false
  })

  it('renders exactly 5 toggles', () => {
    render(<NotificationPreferences />)
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(5)
  })

  it('renders Portuguese labels for all events', () => {
    render(<NotificationPreferences />)
    expect(screen.getByText('Novo deal atribuido')).toBeTruthy()
    expect(screen.getByText('Deal ganho')).toBeTruthy()
    expect(screen.getByText('Deal perdido')).toBeTruthy()
    expect(screen.getByText('Nova tarefa criada')).toBeTruthy()
    expect(screen.getByText('Mencao em nota')).toBeTruthy()
  })

  it('does not render email/push options', () => {
    render(<NotificationPreferences />)
    expect(screen.queryByText(/email/i)).toBeNull()
    expect(screen.queryByText(/push/i)).toBeNull()
    expect(screen.queryByText(/sms/i)).toBeNull()
  })

  it('calls updatePreference when toggle is clicked', () => {
    render(<NotificationPreferences />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0]) // DEAL_ASSIGNED toggle
    expect(mockUpdatePreference).toHaveBeenCalledWith('DEAL_ASSIGNED', false)
  })

  it('shows loading state', () => {
    mockIsLoading = true
    render(<NotificationPreferences />)
    expect(screen.getByText('Carregando preferencias...')).toBeTruthy()
  })
})

// ============================================
// createBusinessNotification logic tests
// ============================================

describe('createBusinessNotification', () => {
  it('does not create notification when preference is false', async () => {
    const { createBusinessNotification } = await import('@/lib/supabase/notifications')
    const mockSingle = vi.fn().mockResolvedValue({
      data: { notification_preferences: { DEAL_WON: false } },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn((table: string) => {
      if (table === 'user_settings') return { select: mockSelect }
      if (table === 'notifications') return { insert: mockInsert }
      return {}
    })
    const sb = { from: mockFrom } as unknown as import('@supabase/supabase-js').SupabaseClient

    await createBusinessNotification(sb, 'org-1', 'user-1', 'DEAL_WON', 'Test')

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates notification when JSONB is empty (all enabled)', async () => {
    const { createBusinessNotification } = await import('@/lib/supabase/notifications')
    const mockSingle = vi.fn().mockResolvedValue({
      data: { notification_preferences: {} },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn((table: string) => {
      if (table === 'user_settings') return { select: mockSelect }
      if (table === 'notifications') return { insert: mockInsert }
      return {}
    })
    const sb = { from: mockFrom } as unknown as import('@supabase/supabase-js').SupabaseClient

    await createBusinessNotification(sb, 'org-1', 'user-1', 'DEAL_WON', 'Deal ganho!')

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        owner_id: 'user-1',
        type: 'DEAL_WON',
        title: 'Deal ganho!',
      }),
    )
  })

  it('creates notification when user has no settings row', async () => {
    const { createBusinessNotification } = await import('@/lib/supabase/notifications')
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn((table: string) => {
      if (table === 'user_settings') return { select: mockSelect }
      if (table === 'notifications') return { insert: mockInsert }
      return {}
    })
    const sb = { from: mockFrom } as unknown as import('@supabase/supabase-js').SupabaseClient

    await createBusinessNotification(sb, 'org-1', 'user-1', 'TASK_CREATED', 'New task')

    expect(mockInsert).toHaveBeenCalled()
  })
})
