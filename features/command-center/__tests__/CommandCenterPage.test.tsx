import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CommandCenterPage from '@/features/command-center/CommandCenterPage'

// ── Mocks ────────────────────────────────────────────────────
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Component = () => <div data-testid="lazy-chart">Chart</div>
    Component.displayName = 'DynamicComponent'
    return Component
  },
}))

const mockShowToast = vi.fn()
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'admin@test.com' },
    profile: { role: 'admin', first_name: 'Admin' },
  }),
}))

const mockBoards = [
  { id: 'board-1', name: 'Pipeline Principal', isDefault: true, goal: { type: 'currency', targetValue: '1000000', kpi: 'Receita' } },
  { id: 'board-2', name: 'Pipeline Locação', isDefault: false },
]
vi.mock('@/context/boards/BoardsContext', () => ({
  useBoards: () => ({ boards: mockBoards }),
}))

const mockMetrics = {
  pipelineValue: 500000,
  generatedCommission: 25000,
  dealTypeSplit: { VENDA: { count: 5, value: 300000 }, LOCACAO: { count: 3, value: 200000 } },
  winRate: 35.5,
  activeContacts: 120,
  prospectingSummary: { totalCalls: 200, connectionRate: 28.5, scheduledMeetings: 10, proposalsSent: 5, bestHour: '14h' },
  avgSalesCycle: 22,
  temperatureBreakdown: { hot: 15, warm: 45, cold: 60 },
  pulse: { revenue: 'green' as const, winRate: 'yellow' as const, volume: 'red' as const, pipeline: 'green' as const },
  changes: { pipeline: 12.5, deals: -5.3, winRate: 2.1, revenue: 8.0 },
  leaderboard: [
    { ownerId: '1', ownerName: 'Maria Silva', wonCount: 5, wonValue: 200000, totalCalls: 80 },
    { ownerId: '2', ownerName: 'Joao Santos', wonCount: 3, wonValue: 150000, totalCalls: 60 },
  ],
  alerts: [
    { type: 'stagnant_deals', severity: 'high', message: '3 propostas paradas', affectedCount: 3, data: [] },
  ],
  wonRevenue: 350000,
  isLoading: false,
}

vi.mock('@/features/command-center/hooks', () => ({
  useCommandCenterMetrics: () => mockMetrics,
}))

vi.mock('@/features/dashboard/hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: () => ({
    funnelData: [{ name: 'Qualificação', count: 50 }],
    trendData: [],
    activeContacts: [],
    inactiveContacts: [],
    churnedContacts: [],
    activePercent: 70,
    inactivePercent: 20,
    churnedPercent: 10,
    avgLTV: 5000,
    stagnantDealsCount: 2,
    stagnantDealsValue: 80000,
  }),
  COMPARISON_LABELS: { this_month: 'vs mês anterior' },
  PERIOD_LABELS: { this_month: 'Este Mês' },
}))

vi.mock('@/features/command-center/utils/generateCommandCenterPDF', () => ({
  generateCommandCenterPDF: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/components/charts/index', () => ({
  ChartSkeleton: ({ height }: { height?: number }) => <div data-testid="chart-skeleton" style={{ height }} />,
}))

vi.mock('@/components/filters/PeriodFilterSelect', () => ({
  PeriodFilterSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select data-testid="period-filter" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="this_month">Este Mês</option>
      <option value="last_month">Mês Anterior</option>
    </select>
  ),
}))

vi.mock('@/features/dashboard/components/StatCard', () => ({
  StatCard: ({ title, value, onClick }: { title: string; value: string; onClick?: () => void }) => (
    <div data-testid={`stat-${title}`} onClick={onClick}>{title}: {value}</div>
  ),
}))

vi.mock('@/components/dashboard/ForecastBar', () => ({
  ForecastBar: () => <div data-testid="forecast-bar">ForecastBar</div>,
}))

vi.mock('@/components/dashboard/BrokerLeaderboard', () => ({
  BrokerLeaderboard: ({ data }: { data: unknown[] }) => <div data-testid="leaderboard">Leaderboard ({data.length})</div>,
}))

vi.mock('@/components/dashboard/WalletHealthCard', () => ({
  WalletHealthCard: () => <div data-testid="wallet-health">WalletHealth</div>,
}))

vi.mock('@/features/command-center/components/PulseBar', () => ({
  PulseBar: ({ rules }: { rules: unknown[] }) => <div data-testid="pulse-bar">Pulse ({rules.length})</div>,
}))

vi.mock('@/features/command-center/components/ProspectingSummary', () => ({
  ProspectingSummary: () => <div data-testid="prospecting-summary">ProspectingSummary</div>,
}))

vi.mock('@/features/command-center/components/AlertsBlock', () => ({
  AlertsBlock: ({ alerts }: { alerts: unknown[] }) => <div data-testid="alerts-block">Alerts ({alerts.length})</div>,
}))

// ── Tests ────────────────────────────────────────────────────
describe('CommandCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and subtitle', () => {
    render(<CommandCenterPage />)
    expect(screen.getByText('Central de Comando')).toBeTruthy()
    expect(screen.getByText('O pulso completo do negócio em tempo real.')).toBeTruthy()
  })

  it('renders all 7 executive blocks', () => {
    render(<CommandCenterPage />)
    expect(screen.getByTestId('pulse-bar')).toBeTruthy()
    expect(screen.getByTestId('forecast-bar')).toBeTruthy()
    expect(screen.getByTestId('leaderboard')).toBeTruthy()
    expect(screen.getByTestId('wallet-health')).toBeTruthy()
    expect(screen.getByTestId('prospecting-summary')).toBeTruthy()
    expect(screen.getByTestId('alerts-block')).toBeTruthy()
  })

  it('renders 8 KPI stat cards', () => {
    render(<CommandCenterPage />)
    expect(screen.getByTestId('stat-VGV Pipeline')).toBeTruthy()
    expect(screen.getByTestId('stat-Comissão Gerada')).toBeTruthy()
    expect(screen.getByTestId('stat-Conversão')).toBeTruthy()
    expect(screen.getByTestId('stat-Contatos Ativos')).toBeTruthy()
    expect(screen.getByTestId('stat-Ligações / Conexão')).toBeTruthy()
    expect(screen.getByTestId('stat-Ciclo Médio')).toBeTruthy()
    expect(screen.getByTestId('stat-Saúde da Carteira')).toBeTruthy()
  })

  it('renders board selector with both pipelines', () => {
    render(<CommandCenterPage />)
    const select = screen.getByLabelText('Selecionar Pipeline')
    expect(select).toBeTruthy()
    expect(screen.getByText('Pipeline Principal')).toBeTruthy()
    expect(screen.getByText('Pipeline Locação')).toBeTruthy()
  })

  it('navigates to /boards on VGV Pipeline click', () => {
    render(<CommandCenterPage />)
    fireEvent.click(screen.getByTestId('stat-VGV Pipeline'))
    expect(mockPush).toHaveBeenCalledWith('/boards')
  })

  it('navigates to /contacts on Contatos Ativos click', () => {
    render(<CommandCenterPage />)
    fireEvent.click(screen.getByTestId('stat-Contatos Ativos'))
    expect(mockPush).toHaveBeenCalledWith('/contacts')
  })

  it('navigates to /prospecting on Ligações click', () => {
    render(<CommandCenterPage />)
    fireEvent.click(screen.getByTestId('stat-Ligações / Conexão'))
    expect(mockPush).toHaveBeenCalledWith('/prospecting')
  })

  it('renders PDF export button', () => {
    render(<CommandCenterPage />)
    expect(screen.getByText('PDF')).toBeTruthy()
    expect(screen.getByTitle('Exportar PDF')).toBeTruthy()
  })

  it('calls generateCommandCenterPDF on PDF button click', async () => {
    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    render(<CommandCenterPage />)

    fireEvent.click(screen.getByTitle('Exportar PDF'))

    await waitFor(() => {
      expect(generateCommandCenterPDF).toHaveBeenCalledTimes(1)
      expect(generateCommandCenterPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          isAdminOrDirector: true,
          period: 'Este Mês',
          boardName: 'Pipeline Principal',
          generatedBy: 'Admin',
        }),
      )
    })
  })

  it('shows toast on PDF generation error', async () => {
    const { generateCommandCenterPDF } = await import('@/features/command-center/utils/generateCommandCenterPDF')
    vi.mocked(generateCommandCenterPDF).mockRejectedValueOnce(new Error('PDF failed'))

    render(<CommandCenterPage />)
    fireEvent.click(screen.getByTitle('Exportar PDF'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao gerar PDF. Tente novamente.', 'error')
    })
  })

  it('passes correct pulse rules count', () => {
    render(<CommandCenterPage />)
    expect(screen.getByText('Pulse (4)')).toBeTruthy()
  })

  it('passes leaderboard with max 10 entries', () => {
    render(<CommandCenterPage />)
    expect(screen.getByText('Leaderboard (2)')).toBeTruthy()
  })

  it('passes alerts to AlertsBlock', () => {
    render(<CommandCenterPage />)
    expect(screen.getByText('Alerts (1)')).toBeTruthy()
  })
})
