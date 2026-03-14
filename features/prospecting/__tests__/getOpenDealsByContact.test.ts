/**
 * Unit tests for getOpenDealsByContact (CP-5.1 + CP-7.3 board_id)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('getOpenDealsByContact', () => {
  const mockMaybeSingle = vi.fn()
  const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockOrder = vi.fn(() => ({ limit: mockLimit }))
  const mockIs = vi.fn(() => ({ order: mockOrder }))
  const mockEqIsLost = vi.fn(() => ({ is: mockIs }))
  const mockEqIsWon = vi.fn(() => ({ eq: mockEqIsLost }))
  const mockEqContactId = vi.fn(() => ({ eq: mockEqIsWon }))
  const mockSelect = vi.fn(() => ({ eq: mockEqContactId }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns deal with board_id when contact has open deal', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'deal-1',
        title: 'Apt 101',
        value: 350000,
        property_ref: 'REF-001',
        stage_id: 'stage-1',
        board_stages: { name: 'Qualificação', board_id: 'board-1' },
        deal_items: [{ name: 'Apt 3 quartos' }],
      },
      error: null,
    })

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('contact-1')

    expect(result).toEqual({
      id: 'deal-1',
      title: 'Apt 101',
      value: 350000,
      property_ref: 'REF-001',
      product_name: 'Apt 3 quartos',
      stage_id: 'stage-1',
      stage_name: 'Qualificação',
      board_id: 'board-1',
    })
    expect(mockFrom).toHaveBeenCalledWith('deals')
    expect(mockSelect).toHaveBeenCalledWith('id, title, value, property_ref, stage_id, board_stages(name, board_id), deal_items(name)')
    expect(mockEqContactId).toHaveBeenCalledWith('contact_id', 'contact-1')
    expect(mockEqIsWon).toHaveBeenCalledWith('is_won', false)
    expect(mockEqIsLost).toHaveBeenCalledWith('is_lost', false)
  })

  it('returns board_id null when board_stages is null', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'deal-1', title: 'Apt 101' },
      error: null,
    })

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('contact-1')

    expect(result).toEqual({ id: 'deal-1', title: 'Apt 101', value: null, property_ref: null, product_name: null, stage_id: null, stage_name: null, board_id: null })
  })

  it('returns null when contact has no open deals', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('contact-2')

    expect(result).toBeNull()
  })

  it('returns null on query error', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    })

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('contact-3')

    expect(result).toBeNull()
  })

  it('returns null when contactId is empty', async () => {
    vi.doMock('@/lib/supabase/client', () => ({
      supabase: { from: mockFrom },
    }))

    const { getOpenDealsByContact } = await import('@/lib/supabase/deals')
    const result = await getOpenDealsByContact('')

    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
