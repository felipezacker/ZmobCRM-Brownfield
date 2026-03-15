import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GenerateCommandCenterPDFOptions, CommandCenterPDFData } from '@/features/command-center/utils/generateCommandCenterPDF'

// ── Mocks ────────────────────────────────────────────────────
const mockSave = vi.fn()

const mockJsPDFInstance = {
  internal: { pageSize: { width: 210, height: 297 } },
  setFillColor: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  text: vi.fn(),
  roundedRect: vi.fn(),
  rect: vi.fn(),
  addPage: vi.fn(),
  save: mockSave,
  line: vi.fn(),
  getNumberOfPages: vi.fn().mockReturnValue(1),
  setPage: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(50),
  lastAutoTable: { finalY: 100 },
}

vi.mock('jspdf', () => ({
  jsPDF: class MockJsPDF {
    internal = mockJsPDFInstance.internal
    lastAutoTable = mockJsPDFInstance.lastAutoTable
    setFillColor = mockJsPDFInstance.setFillColor
    setFont = mockJsPDFInstance.setFont
    setFontSize = mockJsPDFInstance.setFontSize
    setTextColor = mockJsPDFInstance.setTextColor
    setDrawColor = mockJsPDFInstance.setDrawColor
    setLineWidth = mockJsPDFInstance.setLineWidth
    text = mockJsPDFInstance.text
    roundedRect = mockJsPDFInstance.roundedRect
    rect = mockJsPDFInstance.rect
    addPage = mockJsPDFInstance.addPage
    save = mockJsPDFInstance.save
    line = mockJsPDFInstance.line
    getNumberOfPages = mockJsPDFInstance.getNumberOfPages
    setPage = mockJsPDFInstance.setPage
    getTextWidth = mockJsPDFInstance.getTextWidth
  },
}))

const mockAutoTable = vi.fn()
vi.mock('jspdf-autotable', () => ({
  default: (...args: unknown[]) => {
    mockAutoTable(...args)
    // Simulate autoTable setting lastAutoTable.finalY
    const doc = args[0] as { lastAutoTable: { finalY: number } }
    const opts = args[1] as { startY?: number }
    doc.lastAutoTable = { finalY: (opts?.startY ?? 100) + 30 }
  },
}))

// ── Test Data ────────────────────────────────────────────────
function makeTestData(overrides: Partial<CommandCenterPDFData> = {}): CommandCenterPDFData {
  return {
    pipelineValue: 500000,
    generatedCommission: 25000,
    dealTypeSplit: { VENDA: { count: 5, value: 300000 }, LOCACAO: { count: 3, value: 200000 } },
    winRate: 35.5,
    activeContacts: 120,
    prospectingSummary: { totalCalls: 200, connectionRate: 28.5, scheduledMeetings: 10, proposalsSent: 5 },
    avgSalesCycle: 22,
    temperatureBreakdown: { hot: 15, warm: 45, cold: 60 },
    pulse: { revenue: 'green', winRate: 'yellow', volume: 'red', pipeline: 'green' },
    changes: { pipeline: 12.5, deals: -5.3, winRate: 2.1, revenue: 8.0 },
    funnelData: [
      { name: 'Qualificacao', count: 50 },
      { name: 'Proposta', count: 30 },
      { name: 'Negociacao', count: 15 },
      { name: 'Fechamento', count: 8 },
    ],
    leaderboard: [
      { ownerId: '1', ownerName: 'Maria Silva', wonCount: 5, wonValue: 200000, totalCalls: 80 },
      { ownerId: '2', ownerName: 'Joao Santos', wonCount: 3, wonValue: 150000, totalCalls: 60 },
      { ownerId: '3', ownerName: 'Ana Costa', wonCount: 1, wonValue: 50000, totalCalls: 40 },
    ],
    alerts: [
      { type: 'stagnant_deals', severity: 'high', message: '3 propostas paradas ha 7+ dias', affectedCount: 3, data: [] },
      { type: 'underperforming_brokers', severity: 'medium', message: '1 corretor abaixo de 50%', affectedCount: 1, data: [] },
    ],
    wonRevenue: 350000,
    ...overrides,
  }
}

function makeOptions(overrides: Partial<GenerateCommandCenterPDFOptions> = {}): GenerateCommandCenterPDFOptions {
  return {
    data: makeTestData(overrides.data as Partial<CommandCenterPDFData>),
    period: 'Este Mes',
    boardName: 'Pipeline Principal',
    generatedBy: 'Admin',
    isAdminOrDirector: true,
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────
describe('generateCommandCenterPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJsPDFInstance.getNumberOfPages.mockReturnValue(1)
    mockJsPDFInstance.lastAutoTable = { finalY: 100 }
  })

  it('does not throw with valid complete data', async () => {
    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    await expect(generateCommandCenterPDF(makeOptions())).resolves.not.toThrow()
  })

  it('calls doc.save with correct filename pattern', async () => {
    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    await generateCommandCenterPDF(makeOptions())

    expect(mockSave).toHaveBeenCalledTimes(1)
    const filename = mockSave.mock.calls[0][0] as string
    expect(filename).toMatch(/^central-de-comando-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it('filters ranking for non-admin (isAdminOrDirector=false)', async () => {
    mockAutoTable.mockClear()

    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    await generateCommandCenterPDF(makeOptions({ isAdminOrDirector: false }))

    // Find the ranking table call (head has 'Corretor')
    const rankingCall = mockAutoTable.mock.calls.find(
      (call: unknown[]) => {
        const opts = call[1] as { head?: string[][] }
        return opts.head?.[0]?.includes('Corretor')
      },
    )
    expect(rankingCall).toBeDefined()

    // Non-admin should only see 1 row (their own)
    const body = (rankingCall![1] as { body: string[][] }).body
    expect(body.length).toBe(1)
  })

  it('filters alerts for non-admin (underperforming_brokers hidden)', async () => {
    mockAutoTable.mockClear()

    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    await generateCommandCenterPDF(makeOptions({ isAdminOrDirector: false }))

    // Find the alerts table call (head has 'Severidade')
    const alertsCall = mockAutoTable.mock.calls.find(
      (call: unknown[]) => {
        const opts = call[1] as { head?: string[][] }
        return opts.head?.[0]?.includes('Severidade')
      },
    )
    expect(alertsCall).toBeDefined()

    const body = (alertsCall![1] as { body: string[][] }).body
    // underperforming_brokers should be filtered — only 'stagnant_deals' remains
    expect(body.length).toBe(1)
    expect(body[0][1]).toContain('propostas paradas')
  })

  it('degrades gracefully with empty data', async () => {
    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    const emptyOptions = makeOptions({
      data: {
        pipelineValue: 0,
        generatedCommission: 0,
        dealTypeSplit: { VENDA: { count: 0, value: 0 }, LOCACAO: { count: 0, value: 0 } },
        winRate: 0,
        activeContacts: 0,
        prospectingSummary: { totalCalls: 0, connectionRate: 0, scheduledMeetings: 0, proposalsSent: 0 },
        avgSalesCycle: 0,
        temperatureBreakdown: { hot: 0, warm: 0, cold: 0 },
        pulse: { revenue: 'red', winRate: 'red', volume: 'red', pipeline: 'red' },
        changes: { pipeline: 0, deals: 0, winRate: 0, revenue: 0 },
        funnelData: [],
        leaderboard: [],
        alerts: [],
        wonRevenue: 0,
      } as unknown as Partial<CommandCenterPDFData>,
    })

    await expect(generateCommandCenterPDF(emptyOptions)).resolves.not.toThrow()
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('admin sees all leaderboard entries (up to 10)', async () => {
    mockAutoTable.mockClear()

    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    await generateCommandCenterPDF(makeOptions({ isAdminOrDirector: true }))

    const rankingCall = mockAutoTable.mock.calls.find(
      (call: unknown[]) => {
        const opts = call[1] as { head?: string[][] }
        return opts.head?.[0]?.includes('Corretor')
      },
    )
    expect(rankingCall).toBeDefined()

    const body = (rankingCall![1] as { body: string[][] }).body
    expect(body.length).toBe(3) // All 3 test brokers visible
  })
})
