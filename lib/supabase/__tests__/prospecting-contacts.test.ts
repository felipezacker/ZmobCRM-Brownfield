import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prospectingContactsService } from '../prospecting-contacts'

// ── Mock Supabase ──────────────────────────────────────────────

const mockOr = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnValue({
  or: mockOr,
  then: vi.fn(),
})

// Capture last .or() call arg for assertion
let lastOrArg: string | null = null
mockOr.mockImplementation((arg: string) => {
  lastOrArg = arg
  return Promise.resolve({ data: [], error: null })
})

// Make limit return an object that has .or() but also resolves as query
mockLimit.mockReturnValue({
  or: (arg: string) => {
    lastOrArg = arg
    return Promise.resolve({ data: [], error: null })
  },
  then: (resolve: (val: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
})

vi.mock('../client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              or: (arg: string) => {
                lastOrArg = arg
                return Promise.resolve({ data: [], error: null })
              },
              then: (resolve: (val: { data: unknown[]; error: null }) => void) =>
                resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}))

// ── Tests ──────────────────────────────────────────────

describe('prospectingContactsService.searchContacts', () => {
  beforeEach(() => {
    lastOrArg = null
  })

  it('retorna data vazia para busca curta (< 2 chars)', async () => {
    const result = await prospectingContactsService.searchContacts('a')
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('remove vírgulas do input (previne filter injection)', async () => {
    await prospectingContactsService.searchContacts('João,Silva')
    expect(lastOrArg).not.toContain(',João')
    // Sanitized: "JoãoSilva"
    if (lastOrArg) {
      expect(lastOrArg).toContain('JoãoSilva')
    }
  })

  it('remove parênteses do input', async () => {
    await prospectingContactsService.searchContacts('test(inject)')
    if (lastOrArg) {
      expect(lastOrArg).not.toContain('(')
      expect(lastOrArg).not.toContain(')')
      expect(lastOrArg).toContain('testinject')
    }
  })

  it('remove pontos do input', async () => {
    await prospectingContactsService.searchContacts('test.inject')
    if (lastOrArg) {
      expect(lastOrArg).not.toContain('test.inject')
      expect(lastOrArg).toContain('testinject')
    }
  })

  it('remove percentuais do input', async () => {
    await prospectingContactsService.searchContacts('100%match')
    if (lastOrArg) {
      expect(lastOrArg).not.toContain('100%')
      expect(lastOrArg).toContain('100match')
    }
  })

  it('remove backslashes do input', async () => {
    await prospectingContactsService.searchContacts('test\\inject')
    if (lastOrArg) {
      expect(lastOrArg).not.toContain('\\')
    }
  })

  it('busca vazia não chama .or()', async () => {
    await prospectingContactsService.searchContacts('')
    expect(lastOrArg).toBeNull()
  })

  it('busca com apenas espaços não chama .or()', async () => {
    await prospectingContactsService.searchContacts('   ')
    expect(lastOrArg).toBeNull()
  })

  it('busca que fica < 2 chars após sanitização não chama .or()', async () => {
    await prospectingContactsService.searchContacts('()')
    expect(lastOrArg).toBeNull()
  })

  it('busca válida gera query .or() com ilike para name e email', async () => {
    await prospectingContactsService.searchContacts('João')
    expect(lastOrArg).toBe('name.ilike.%João%,email.ilike.%João%')
  })
})
