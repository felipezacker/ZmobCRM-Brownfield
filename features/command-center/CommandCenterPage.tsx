import React, { Suspense, useMemo, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  DollarSign,
  Handshake,
  Target,
  UserPlus,
  Phone,
  Clock,
  HeartPulse,
  Download,
} from 'lucide-react'
import { useCommandCenterMetrics } from '@/features/command-center/hooks'
import { generateCommandCenterPDF, type CommandCenterPDFData } from '@/features/command-center/utils/generateCommandCenterPDF'
import { useDashboardMetrics, type PeriodFilter, COMPARISON_LABELS, PERIOD_LABELS } from '@/features/dashboard/hooks/useDashboardMetrics'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { PeriodFilterSelect } from '@/components/filters/PeriodFilterSelect'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { ForecastBar } from '@/components/dashboard/ForecastBar'
import { BrokerLeaderboard, type BrokerRow } from '@/components/dashboard/BrokerLeaderboard'
import { WalletHealthCard } from '@/components/dashboard/WalletHealthCard'
import { PulseBar, type PulseRule } from '@/features/command-center/components/PulseBar'
import { ProspectingSummary } from '@/features/command-center/components/ProspectingSummary'
import { AlertsBlock } from '@/features/command-center/components/AlertsBlock'
import { useBoards } from '@/context/boards/BoardsContext'
import { ChartSkeleton } from '@/components/charts/index'
import { Button } from '@/components/ui/button'

const LazyFunnelChart = dynamic(
  () => import('@/components/charts/FunnelChart').then(m => ({ default: m.FunnelChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)
const LazyRevenueTrendChart = dynamic(
  () => import('@/components/charts/RevenueTrendChart').then(m => ({ default: m.RevenueTrendChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

function formatCurrency(value: number): string {
  if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`
  return `R$${value.toLocaleString()}`
}

function formatChange(value: number): { text: string; isPositive: boolean } {
  const isPositive = value >= 0
  return { text: `${isPositive ? '+' : ''}${value.toFixed(1)}%`, isPositive }
}

const CommandCenterPage: React.FC = () => {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const { boards } = useBoards()
  const [period, setPeriod] = useState<PeriodFilter>('this_month')
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [isPDFGenerating, setIsPDFGenerating] = useState(false)

  const isAdminOrDirector = profile?.role === 'admin' || profile?.role === 'diretor'

  const defaultBoardId = useMemo(() => {
    if (!boards.length) return ''
    const defaultB = boards.find(b => b.isDefault) || boards[0]
    return defaultB?.id || ''
  }, [boards])

  useEffect(() => {
    if (!selectedBoardId && defaultBoardId) {
      setSelectedBoardId(defaultBoardId)
    }
  }, [defaultBoardId, selectedBoardId])

  const selectedBoard = useMemo(() => boards.find(b => b.id === selectedBoardId), [boards, selectedBoardId])

  const metrics = useCommandCenterMetrics(period, selectedBoardId)

  // Board goal
  const boardGoal = selectedBoard?.goal
  const goalType = boardGoal?.type || 'currency'
  const goalTarget = parseFloat(boardGoal?.targetValue || '0') || 0
  const goalKpi = boardGoal?.kpi || 'Receita'
  const goalCurrentValue = useMemo(() => {
    switch (goalType) {
      case 'currency': return metrics.wonRevenue
      case 'percentage': return metrics.winRate
      case 'number': return metrics.dealTypeSplit.VENDA.count + metrics.dealTypeSplit.LOCACAO.count
      default: return metrics.wonRevenue
    }
  }, [goalType, metrics.wonRevenue, metrics.winRate, metrics.dealTypeSplit])

  // Pulse rules for PulseBar
  const pulseRules = useMemo((): PulseRule[] => [
    { label: 'Receita', status: metrics.pulse.revenue, detail: `Variação: ${metrics.changes.revenue.toFixed(1)}%` },
    { label: 'Conversão', status: metrics.pulse.winRate, detail: `Variação: ${metrics.changes.winRate.toFixed(1)}%` },
    { label: 'Volume', status: metrics.pulse.volume, detail: `Variação: ${metrics.changes.deals.toFixed(1)}%` },
    { label: 'Pipeline', status: metrics.pulse.pipeline, detail: `Variação: ${metrics.changes.pipeline.toFixed(1)}%` },
  ], [metrics.pulse, metrics.changes])

  // KPIs
  const revenueChange = formatChange(metrics.changes.revenue)
  const pipelineChange = formatChange(metrics.changes.pipeline)
  const winRateChange = formatChange(metrics.changes.winRate)
  const dealsChange = formatChange(metrics.changes.deals)
  const totalClosedDeals = metrics.dealTypeSplit.VENDA.count + metrics.dealTypeSplit.LOCACAO.count

  // Leaderboard data
  const leaderboardRows = useMemo((): BrokerRow[] =>
    metrics.leaderboard.slice(0, 10).map((entry, index) => ({
      id: entry.ownerId,
      name: entry.ownerName,
      deals: entry.wonCount,
      revenue: entry.wonValue,
      winRate: 0,
      calls: entry.totalCalls,
      isUnderperforming: metrics.alerts.some(
        a => a.type === 'underperforming_brokers' &&
          Array.isArray(a.data) &&
          (a.data as Array<{ ownerId: string }>).some(d => d.ownerId === entry.ownerId),
      ),
    })),
  [metrics.leaderboard, metrics.alerts])

  // Chart data from useDashboardMetrics (TanStack Query deduplicates underlying queries)
  const dashboardData = useDashboardMetrics(period, selectedBoardId)
  const funnelData = dashboardData.funnelData || []
  const trendData = dashboardData.trendData || []

  const handleExportPDF = useCallback(async () => {
    setIsPDFGenerating(true)
    try {
      const pdfData: CommandCenterPDFData = {
        pipelineValue: metrics.pipelineValue,
        generatedCommission: metrics.generatedCommission,
        dealTypeSplit: metrics.dealTypeSplit,
        winRate: metrics.winRate,
        activeContacts: metrics.activeContacts,
        prospectingSummary: metrics.prospectingSummary,
        avgSalesCycle: metrics.avgSalesCycle,
        temperatureBreakdown: metrics.temperatureBreakdown,
        pulse: metrics.pulse,
        changes: metrics.changes,
        funnelData,
        leaderboard: metrics.leaderboard,
        alerts: metrics.alerts,
        wonRevenue: metrics.wonRevenue,
      }
      await generateCommandCenterPDF({
        data: pdfData,
        period: PERIOD_LABELS[period] || period,
        boardName: selectedBoard?.name,
        generatedBy: profile?.first_name || user?.email || undefined,
        isAdminOrDirector,
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      showToast('Erro ao gerar PDF. Tente novamente.', 'error')
    } finally {
      setIsPDFGenerating(false)
    }
  }, [metrics, funnelData, period, selectedBoard, profile, user, isAdminOrDirector])

  return (
    <div className="flex flex-col h-full space-y-6 p-6">
      {/* Header (AC-2) */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
            Central de Comando
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            O pulso completo do negócio em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            aria-label="Selecionar Pipeline"
            className="px-3 py-2 bg-white dark:bg-card border border-border rounded-lg text-sm font-medium text-secondary-foreground dark:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {boards.map(board => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
          <PeriodFilterSelect value={period} onChange={setPeriod} />
          <Button
            onClick={handleExportPDF}
            disabled={isPDFGenerating}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg glass border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all duration-200 disabled:opacity-50"
            title="Exportar PDF"
          >
            <Download size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium opacity-80 group-hover:opacity-100">
              {isPDFGenerating ? 'Gerando...' : 'PDF'}
            </span>
          </Button>
        </div>
      </div>

      {/* Bloco 1 — Pulso (AC-3) */}
      <PulseBar rules={pulseRules} />

      {/* Bloco 2 — KPIs (AC-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="VGV Pipeline"
          value={formatCurrency(metrics.pipelineValue)}
          subtext={pipelineChange.text}
          subtextPositive={pipelineChange.isPositive}
          icon={TrendingUp}
          color="bg-blue-500"
          onClick={() => router.push('/boards')}
          comparisonLabel={COMPARISON_LABELS[period]}
        />
        <StatCard
          title="Comissão Gerada"
          value={formatCurrency(metrics.generatedCommission)}
          subtext={revenueChange.text}
          subtextPositive={revenueChange.isPositive}
          icon={DollarSign}
          color="bg-emerald-500"
          comparisonLabel={COMPARISON_LABELS[period]}
        />
        <StatCard
          title={`Fechados ${metrics.dealTypeSplit.VENDA.count}V / ${metrics.dealTypeSplit.LOCACAO.count}L`}
          value={`${totalClosedDeals}`}
          subtext={dealsChange.text}
          subtextPositive={dealsChange.isPositive}
          icon={Handshake}
          color="bg-violet-500"
          comparisonLabel={COMPARISON_LABELS[period]}
        />
        <StatCard
          title="Conversão"
          value={`${metrics.winRate.toFixed(1)}%`}
          subtext={winRateChange.text}
          subtextPositive={winRateChange.isPositive}
          icon={Target}
          color="bg-indigo-500"
          onClick={() => router.push('/reports')}
          comparisonLabel={COMPARISON_LABELS[period]}
        />
        <StatCard
          title="Contatos Ativos"
          value={`${metrics.activeContacts}`}
          subtext={`${metrics.temperatureBreakdown.hot} HOT`}
          subtextPositive={metrics.temperatureBreakdown.hot > 0}
          icon={UserPlus}
          color="bg-cyan-500"
          onClick={() => router.push('/contacts')}
          comparisonLabel="temperatura"
        />
        <StatCard
          title="Ligações / Conexão"
          value={`${metrics.prospectingSummary.totalCalls}`}
          subtext={`${metrics.prospectingSummary.connectionRate.toFixed(1)}% conexão`}
          subtextPositive={metrics.prospectingSummary.connectionRate > 30}
          icon={Phone}
          color="bg-orange-500"
          onClick={() => router.push('/prospecting')}
          comparisonLabel="taxa"
        />
        <StatCard
          title="Ciclo Médio"
          value={`${metrics.avgSalesCycle} dias`}
          subtext="tempo de fechamento"
          subtextPositive={metrics.avgSalesCycle < 30}
          icon={Clock}
          color="bg-pink-500"
          comparisonLabel=""
        />
        <StatCard
          title="Saúde da Carteira"
          value={`${metrics.temperatureBreakdown.hot + metrics.temperatureBreakdown.warm + metrics.temperatureBreakdown.cold}`}
          subtext={`${metrics.temperatureBreakdown.hot}🔥 ${metrics.temperatureBreakdown.warm}🟡 ${metrics.temperatureBreakdown.cold}🔵`}
          subtextPositive={metrics.temperatureBreakdown.hot > metrics.temperatureBreakdown.cold}
          icon={HeartPulse}
          color="bg-teal-500"
          onClick={() => router.push('/contacts')}
          comparisonLabel="distribuição"
        />
      </div>

      {/* Bloco 3 — Meta (AC-5) */}
      <ForecastBar
        currentValue={goalCurrentValue}
        goalTarget={goalTarget}
        goalType={goalType as 'currency' | 'percentage' | 'number'}
        goalKpi={goalKpi}
        onConfigureClick={() => router.push('/boards')}
      />

      {/* Bloco 4 — Funil + Tendência (AC-6) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 glass p-4 rounded-xl border border-border shadow-sm min-h-[300px]">
          <h3 className="text-lg font-bold text-foreground font-display mb-2">Funil</h3>
          <div className="h-[250px]">
            <Suspense fallback={<ChartSkeleton height={250} />}>
              <LazyFunnelChart data={funnelData} />
            </Suspense>
          </div>
        </div>
        <div className="lg:col-span-3 glass p-4 rounded-xl border border-border shadow-sm min-h-[300px]">
          <h3 className="text-lg font-bold text-foreground font-display mb-2">Tendência de Receita</h3>
          <div className="h-[250px]">
            <Suspense fallback={<ChartSkeleton height={250} />}>
              <LazyRevenueTrendChart data={trendData} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Bloco 5 — Ranking (AC-7) */}
      <div className="glass p-1 rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h3 className="text-lg font-bold text-foreground font-display">Ranking de Corretores</h3>
          <span className="text-xs text-muted-foreground bg-muted dark:bg-white/5 px-2 py-1 rounded">
            {COMPARISON_LABELS[period] || period}
          </span>
        </div>
        <BrokerLeaderboard data={leaderboardRows} showCalls className="border-0 shadow-none" />
      </div>

      {/* Bloco 6 — Carteira + Prospecção (AC-8) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WalletHealthCard
          data={{
            activeCount: dashboardData.activeContacts.length,
            inactiveCount: dashboardData.inactiveContacts.length,
            churnedCount: dashboardData.churnedContacts.length,
            activePercent: dashboardData.activePercent,
            inactivePercent: dashboardData.inactivePercent,
            churnedPercent: dashboardData.churnedPercent,
            hot: metrics.temperatureBreakdown.hot,
            warm: metrics.temperatureBreakdown.warm,
            cold: metrics.temperatureBreakdown.cold,
            avgLTV: dashboardData.avgLTV,
            stagnantDealsCount: dashboardData.stagnantDealsCount,
            stagnantDealsValue: dashboardData.stagnantDealsValue,
          }}
          onContactsClick={() => router.push('/contacts')}
          onAlertsClick={() => router.push('/boards')}
        />
        <ProspectingSummary data={metrics.prospectingSummary} />
      </div>

      {/* Bloco 7 — Alertas (AC-9) */}
      <AlertsBlock alerts={metrics.alerts} />
    </div>
  )
}


export default CommandCenterPage
