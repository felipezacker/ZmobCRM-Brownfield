import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock data ──────────────────────────────────────────────

const mockSearchContacts = vi.fn()

vi.mock('@/lib/supabase/prospecting-contacts', () => ({
  prospectingContactsService: {
    searchContacts: (...args: unknown[]) => mockSearchContacts(...args),
  },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
  }),
}))

// Import after mocks
const { useProspectingContactsQuery } = await import('../useProspectingContactsQuery')

// ── Helpers ──────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  Wrapper.displayName = 'TestQueryWrapper'
  return Wrapper
}

// ── Tests ──────────────────────────────────────────────

describe('useProspectingContactsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não faz query quando search < 2 chars', () => {
    const { result } = renderHook(() => useProspectingContactsQuery('a'), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockSearchContacts).not.toHaveBeenCalled()
  })

  it('faz query e transforma dados quando search >= 2 chars', async () => {
    mockSearchContacts.mockResolvedValue({
      data: [
        {
          id: 'c-1',
          name: 'João Silva',
          email: 'joao@test.com',
          stage: 'LEAD',
          temperature: 'HOT',
          owner_id: 'u-1',
          contact_phones: [
            { phone_number: '11999990000', is_primary: true },
            { phone_number: '11888880000', is_primary: false },
          ],
        },
      ],
      error: null,
    })

    const { result } = renderHook(() => useProspectingContactsQuery('João'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSearchContacts).toHaveBeenCalledWith('João')
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]).toEqual({
      id: 'c-1',
      name: 'João Silva',
      email: 'joao@test.com',
      stage: 'LEAD',
      temperature: 'HOT',
      primaryPhone: '11999990000',
      ownerId: 'u-1',
    })
  })

  it('usa primeiro telefone como fallback quando nenhum é primário', async () => {
    mockSearchContacts.mockResolvedValue({
      data: [
        {
          id: 'c-2',
          name: 'Maria',
          email: null,
          stage: null,
          temperature: null,
          owner_id: 'u-1',
          contact_phones: [
            { phone_number: '11777770000', is_primary: false },
          ],
        },
      ],
      error: null,
    })

    const { result } = renderHook(() => useProspectingContactsQuery('Maria'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].primaryPhone).toBe('11777770000')
  })

  it('retorna null para primaryPhone quando sem telefones', async () => {
    mockSearchContacts.mockResolvedValue({
      data: [
        {
          id: 'c-3',
          name: 'Carlos',
          email: null,
          stage: null,
          temperature: null,
          owner_id: 'u-1',
          contact_phones: null,
        },
      ],
      error: null,
    })

    const { result } = renderHook(() => useProspectingContactsQuery('Carlos'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].primaryPhone).toBeNull()
  })

  it('lança erro quando service retorna error', async () => {
    mockSearchContacts.mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    })

    const { result } = renderHook(() => useProspectingContactsQuery('Test'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('DB error')
  })
})
