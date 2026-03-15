import { describe, it, expect } from 'vitest'
import {
  getPulseStatus,
  getPulseStatusForRevenue,
  getPulseStatusForWinRate,
  getPulseStatusForVolume,
} from '@/features/command-center/utils/pulse-rules'
import {
  detectStagnantDeals,
  detectHotLeadsWithoutActivity,
  detectUnderperformingBrokers,
  detectHighChurn,
} from '@/features/command-center/utils/alert-rules'
import { calculateCommission } from '@/features/command-center/hooks/useCommandCenterMetrics'
import type { Deal, Contact, BoardStage } from '@/types/types'

// ============================================================
// PULSE RULES TESTS (AC6)
// ============================================================

describe('pulse-rules', () => {
  describe('getPulseStatus', () => {
    it('returns green when change > +10%', () => {
      expect(getPulseStatus(15)).toBe('green')
      expect(getPulseStatus(10.1)).toBe('green')
      expect(getPulseStatus(100)).toBe('green')
    })

    it('returns yellow when change between -5% and +10% (inclusive)', () => {
      expect(getPulseStatus(10)).toBe('yellow')
      expect(getPulseStatus(0)).toBe('yellow')
      expect(getPulseStatus(-5)).toBe('yellow')
      expect(getPulseStatus(2)).toBe('yellow')
      expect(getPulseStatus(5)).toBe('yellow')
    })

    it('returns red when change < -5%', () => {
      expect(getPulseStatus(-5.1)).toBe('red')
      expect(getPulseStatus(-10)).toBe('red')
      expect(getPulseStatus(-50)).toBe('red')
    })

    it('handles exact boundary values', () => {
      expect(getPulseStatus(10)).toBe('yellow')  // exactly +10% is yellow, not green
      expect(getPulseStatus(-5)).toBe('yellow')   // exactly -5% is yellow, not red
    })

    it('supports custom thresholds', () => {
      const customThresholds = { greenAbove: 20, redBelow: -10 }
      expect(getPulseStatus(25, customThresholds)).toBe('green')
      expect(getPulseStatus(15, customThresholds)).toBe('yellow')
      expect(getPulseStatus(-15, customThresholds)).toBe('red')
    })
  })

  describe('specialized pulse functions', () => {
    it('getPulseStatusForRevenue delegates correctly', () => {
      expect(getPulseStatusForRevenue(15)).toBe('green')
      expect(getPulseStatusForRevenue(0)).toBe('yellow')
      expect(getPulseStatusForRevenue(-10)).toBe('red')
    })

    it('getPulseStatusForWinRate delegates correctly', () => {
      expect(getPulseStatusForWinRate(15)).toBe('green')
      expect(getPulseStatusForWinRate(0)).toBe('yellow')
      expect(getPulseStatusForWinRate(-10)).toBe('red')
    })

    it('getPulseStatusForVolume delegates correctly', () => {
      expect(getPulseStatusForVolume(15)).toBe('green')
      expect(getPulseStatusForVolume(0)).toBe('yellow')
      expect(getPulseStatusForVolume(-10)).toBe('red')
    })
  })
})

// ============================================================
// COMMISSION CALCULATION TESTS (AC4)
// ============================================================

describe('commission calculation (using exported calculateCommission)', () => {
  it('uses explicit commissionRate when provided', () => {
    const deals = [
      { value: 100000, commissionRate: 6 },
    ]
    expect(calculateCommission(deals)).toBe(6000) // 100000 * 6/100
  })

  it('falls back to 5% when commissionRate is null', () => {
    const deals = [
      { value: 100000, commissionRate: null },
    ]
    expect(calculateCommission(deals)).toBe(5000) // 100000 * 5/100
  })

  it('falls back to 5% when commissionRate is undefined', () => {
    const deals = [
      { value: 50000 },
    ]
    expect(calculateCommission(deals)).toBe(2500) // 50000 * 5/100
  })

  it('sums commission across multiple deals', () => {
    const deals = [
      { value: 100000, commissionRate: 6 },     // 6000
      { value: 50000, commissionRate: null },    // 2500
      { value: 200000, commissionRate: 3 },      // 6000
    ]
    expect(calculateCommission(deals)).toBe(14500)
  })

  it('returns 0 for empty deals array', () => {
    expect(calculateCommission([])).toBe(0)
  })

  it('handles zero-value deals', () => {
    const deals = [{ value: 0, commissionRate: 6 }]
    expect(calculateCommission(deals)).toBe(0)
  })
})

// ============================================================
// ALERT RULES TESTS (AC7)
// ============================================================

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-1',
    title: 'Test Deal',
    contactId: 'contact-1',
    boardId: 'board-1',
    value: 100000,
    items: [],
    status: 'stage-3',
    isWon: false,
    isLost: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    probability: 50,
    priority: 'medium',
    owner: { name: 'Test', avatar: '' },
    ...overrides,
  }
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'contact-1',
    name: 'Test Contact',
    email: 'test@test.com',
    phone: '11999999999',
    status: 'ACTIVE',
    stage: 'lead',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const mockStages: BoardStage[] = [
  { id: 'stage-1', label: 'Primeiro Contato', color: 'bg-blue-500' },
  { id: 'stage-2', label: 'Visita', color: 'bg-yellow-500' },
  { id: 'stage-3', label: 'Proposta', color: 'bg-orange-500' },
  { id: 'stage-4', label: 'Negociação', color: 'bg-purple-500' },
  { id: 'stage-5', label: 'Fechamento', color: 'bg-green-500' },
]

describe('alert-rules', () => {
  describe('detectStagnantDeals', () => {
    it('detects deals stuck in late stages for 8+ days', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      const deals = [
        makeDeal({ id: 'deal-1', status: 'stage-4', lastStageChangeDate: eightDaysAgo, value: 50000 }),
        makeDeal({ id: 'deal-2', status: 'stage-5', lastStageChangeDate: eightDaysAgo, value: 80000 }),
      ]

      const alert = detectStagnantDeals(deals, mockStages, 7, 3)
      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('stagnant_deals')
      expect(alert!.affectedCount).toBe(2)
    })

    it('ignores deals in late stages that changed recently (5 days)', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const deals = [
        makeDeal({ status: 'stage-4', lastStageChangeDate: fiveDaysAgo }),
      ]

      const alert = detectStagnantDeals(deals, mockStages, 7, 3)
      expect(alert).toBeNull()
    })

    it('ignores deals in early stages even if stuck', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      const deals = [
        makeDeal({ status: 'stage-1', lastStageChangeDate: tenDaysAgo }),
      ]

      const alert = detectStagnantDeals(deals, mockStages, 7, 3)
      expect(alert).toBeNull()
    })

    it('ignores won/lost deals', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      const deals = [
        makeDeal({ status: 'stage-5', lastStageChangeDate: tenDaysAgo, isWon: true }),
        makeDeal({ status: 'stage-5', lastStageChangeDate: tenDaysAgo, isLost: true }),
      ]

      const alert = detectStagnantDeals(deals, mockStages, 7, 3)
      expect(alert).toBeNull()
    })

    it('returns null for empty stages', () => {
      const deals = [makeDeal()]
      expect(detectStagnantDeals(deals, [], 7)).toBeNull()
    })

    it('triggers at exactly 7 days (boundary)', () => {
      const exactlySevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const deals = [
        makeDeal({ status: 'stage-4', lastStageChangeDate: exactlySevenDaysAgo }),
      ]

      const alert = detectStagnantDeals(deals, mockStages, 7, 3)
      expect(alert).not.toBeNull()
      expect(alert!.affectedCount).toBe(1)
    })

    it('uses createdAt as fallback when lastStageChangeDate is missing', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      const deals = [
        makeDeal({
          status: 'stage-4',
          lastStageChangeDate: undefined,
          createdAt: tenDaysAgo,
        }),
      ]

      const alert = detectStagnantDeals(deals, mockStages, 7, 3)
      expect(alert).not.toBeNull()
      expect(alert!.affectedCount).toBe(1)
    })
  })

  describe('detectHotLeadsWithoutActivity', () => {
    it('detects HOT leads with no activity in 4 days', () => {
      const contacts = [
        makeContact({ id: 'c1', temperature: 'HOT', status: 'ACTIVE' }),
        makeContact({ id: 'c2', temperature: 'HOT', status: 'ACTIVE' }),
      ]
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const lastActivityMap = new Map([
        ['c1', fiveDaysAgo],
        // c2 has no activity at all
      ])

      const alert = detectHotLeadsWithoutActivity(contacts, lastActivityMap, 3)
      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('hot_leads_inactive')
      expect(alert!.affectedCount).toBe(2)
    })

    it('does not trigger for HOT leads with recent activity', () => {
      const contacts = [
        makeContact({ id: 'c1', temperature: 'HOT', status: 'ACTIVE' }),
      ]
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const lastActivityMap = new Map([['c1', yesterday]])

      const alert = detectHotLeadsWithoutActivity(contacts, lastActivityMap, 3)
      expect(alert).toBeNull()
    })

    it('ignores WARM/COLD contacts', () => {
      const contacts = [
        makeContact({ id: 'c1', temperature: 'WARM', status: 'ACTIVE' }),
        makeContact({ id: 'c2', temperature: 'COLD', status: 'ACTIVE' }),
      ]
      const lastActivityMap = new Map<string, string>()

      const alert = detectHotLeadsWithoutActivity(contacts, lastActivityMap, 3)
      expect(alert).toBeNull()
    })

    it('ignores HOT contacts with INACTIVE/CHURNED status', () => {
      const contacts = [
        makeContact({ id: 'c1', temperature: 'HOT', status: 'INACTIVE' }),
        makeContact({ id: 'c2', temperature: 'HOT', status: 'CHURNED' }),
      ]
      const lastActivityMap = new Map<string, string>()

      const alert = detectHotLeadsWithoutActivity(contacts, lastActivityMap, 3)
      expect(alert).toBeNull()
    })
  })

  describe('detectUnderperformingBrokers', () => {
    it('detects broker at 40% of top performer', () => {
      const brokers = [
        { ownerId: 'b1', ownerName: 'Top', wonCount: 10, wonValue: 100000 },
        { ownerId: 'b2', ownerName: 'Under', wonCount: 4, wonValue: 40000 },
      ]

      const alert = detectUnderperformingBrokers(brokers, 0.5)
      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('underperforming_brokers')
      expect(alert!.affectedCount).toBe(1)
    })

    it('does not trigger when broker is at 60%', () => {
      const brokers = [
        { ownerId: 'b1', ownerName: 'Top', wonCount: 10, wonValue: 100000 },
        { ownerId: 'b2', ownerName: 'OK', wonCount: 6, wonValue: 60000 },
      ]

      const alert = detectUnderperformingBrokers(brokers, 0.5)
      expect(alert).toBeNull()
    })

    it('returns null for single broker', () => {
      const brokers = [
        { ownerId: 'b1', ownerName: 'Only', wonCount: 5, wonValue: 50000 },
      ]

      expect(detectUnderperformingBrokers(brokers, 0.5)).toBeNull()
    })

    it('returns null when all brokers have 0 deals', () => {
      const brokers = [
        { ownerId: 'b1', ownerName: 'A', wonCount: 0, wonValue: 0 },
        { ownerId: 'b2', ownerName: 'B', wonCount: 0, wonValue: 0 },
      ]

      expect(detectUnderperformingBrokers(brokers, 0.5)).toBeNull()
    })
  })

  describe('detectHighChurn', () => {
    it('detects churn above 10%', () => {
      const alert = detectHighChurn(80, 20, 0.1) // 20% churn
      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('high_churn')
      expect(alert!.affectedCount).toBe(20)
    })

    it('does not trigger when churn below threshold', () => {
      const alert = detectHighChurn(95, 5, 0.1) // 5% churn
      expect(alert).toBeNull()
    })

    it('returns null when no contacts', () => {
      expect(detectHighChurn(0, 0, 0.1)).toBeNull()
    })

    it('assigns critical severity for churn >= 20%', () => {
      const alert = detectHighChurn(70, 30, 0.1) // 30% churn
      expect(alert).not.toBeNull()
      expect(alert!.severity).toBe('critical')
    })

    it('assigns high severity for churn between threshold and 20%', () => {
      const alert = detectHighChurn(85, 15, 0.1) // 15% churn
      expect(alert).not.toBeNull()
      expect(alert!.severity).toBe('high')
    })

    it('does not trigger at exactly the threshold (10%)', () => {
      const alert = detectHighChurn(90, 10, 0.1) // exactly 10% churn
      expect(alert).toBeNull()
    })
  })
})
