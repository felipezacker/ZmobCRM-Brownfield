import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/features/settings/components/AuditLogDashboard', () => ({
  AuditLogDashboard: () => <div data-testid="audit-dashboard">AuditLogDashboard</div>,
}))

import SettingsAudit from '@/app/(protected)/settings/audit/page'
import { useAuth } from '@/context/AuthContext'

const useAuthMock = vi.mocked(useAuth)

describe('/settings/audit route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin ve AuditLogDashboard', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsAudit />)

    expect(screen.getByTestId('audit-dashboard')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('corretor e redirecionado para /settings', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'corretor' },
    } as any)

    render(<SettingsAudit />)

    expect(screen.queryByTestId('audit-dashboard')).not.toBeInTheDocument()
    expect(mockReplace).toHaveBeenCalledWith('/settings')
  })

  it('diretor e redirecionado para /settings', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'diretor' },
    } as any)

    render(<SettingsAudit />)

    expect(screen.queryByTestId('audit-dashboard')).not.toBeInTheDocument()
    expect(mockReplace).toHaveBeenCalledWith('/settings')
  })
})
