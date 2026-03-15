import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useSearchParams: () => ({
    get: () => null,
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    loading: false,
    error: null,
    availableTags: [{ name: 'VIP', color: null }],
    addTag: vi.fn(),
    removeTag: vi.fn(),
    renameTag: vi.fn(),
    updateTagColor: vi.fn(),
    customFieldDefinitions: [],
    addCustomField: vi.fn(),
    updateCustomField: vi.fn(),
    removeCustomField: vi.fn(),
  }),
}))

import SettingsPage from './SettingsPage'
import { useAuth } from '@/context/AuthContext'

const useAuthMock = vi.mocked(useAuth)

describe('SettingsPage (GeneralSettings) RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('corretor não vê seções de admin (Tags e Campos Personalizados)', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'corretor' },
    } as any)

    render(<SettingsPage />)

    expect(
      screen.queryByRole('heading', { name: /^Tags$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /^Campos Personalizados$/i })
    ).not.toBeInTheDocument()

    // Pagina Inicial foi movida para ProfileSettings (ST-2.1)
    expect(screen.queryByText(/página inicial/i)).not.toBeInTheDocument()
  })

  it('admin vê Tags e Campos Personalizados', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsPage />)

    expect(
      screen.getByRole('heading', { name: /^Tags$/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^Campos Personalizados$/i })
    ).toBeInTheDocument()

    // Pagina Inicial foi movida para ProfileSettings (ST-2.1)
    expect(screen.queryByText(/página inicial/i)).not.toBeInTheDocument()
  })
})
