import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Clock, Target, DollarSign, Download } from 'lucide-react';
import { useDashboardMetrics, PeriodFilter, COMPARISON_LABELS } from '../dashboard/hooks/useDashboardMetrics';
import { PeriodFilterSelect } from '@/components/filters/PeriodFilterSelect';
import { LazyRevenueTrendChart, ChartWrapper } from '@/components/charts';
import { generateReportPDF } from './utils/generateReportPDF';
import { ForecastBar } from '@/components/dashboard/ForecastBar';
import { BrokerLeaderboard, type BrokerRow } from '@/components/dashboard/BrokerLeaderboard';
import { useBoards } from '@/context/boards/BoardsContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * Componente React `ReportsPage`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
const ReportsPage: React.FC = () => {
  const router = useRouter();
  const { boards } = useBoards();
  const { profile } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');

  // Performance: avoid recomputing the "default board id" logic inside the effect.
  const defaultBoardId = useMemo(() => {
    if (!boards.length) return '';
    const defaultB = boards.find(b => b.isDefault) || boards[0];
    return defaultB?.id || '';
  }, [boards]);

  // Inicializar board selecionado
  useEffect(() => {
    if (!selectedBoardId && defaultBoardId) {
      setSelectedBoardId(defaultBoardId);
    }
  }, [defaultBoardId, selectedBoardId]);

  // Pegar o board selecionado para acessar a meta
  const selectedBoard = useMemo(() => {
    return boards.find(b => b.id === selectedBoardId);
  }, [boards, selectedBoardId]);

  const {
    trendData,
    avgSalesCycle,
    fastestDeal,
    slowestDeal,
    wonDealsWithDates,
    actualWinRate,
    wonDeals,
    lostDeals,
    topLossReasons,
    topDeals,
    wonRevenue,
    pipelineValue,
    deals,
    changes,
    funnelData,
  } = useDashboardMetrics(period, selectedBoardId);

  // Extrair meta do board selecionado
  const boardGoal = selectedBoard?.goal;
  const goalType = (boardGoal?.type || 'currency') as 'currency' | 'percentage' | 'number';
  const goalTarget = parseFloat(boardGoal?.targetValue || '0') || 0;
  const goalKpi = boardGoal?.kpi || 'Receita';

  // Calcular valor atual baseado no tipo de meta (PADRÃO HUBSPOT/SALESFORCE)
  const currentValue = React.useMemo(() => {
    switch (goalType) {
      case 'currency':
        return wonRevenue;
      case 'percentage':
        return actualWinRate;
      case 'number':
      default:
        return wonDeals.length;
    }
  }, [goalType, wonRevenue, actualWinRate, wonDeals.length]);

  // Formatador de moeda
  const formatCurrency = useCallback((value: number) => {
    if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
    return `R$${value.toLocaleString()}`;
  }, []);

  // Calcular Performance por Corretor (Leaderboard)
  const leaderboardRows = useMemo((): BrokerRow[] => {
    const repsMap: Record<string, { name: string; avatar: string; won: number; lost: number; revenue: number }> = {};

    wonDeals.forEach(deal => {
      const ownerKey = deal.owner?.name || 'unknown';
      const ownerName = deal.owner?.name || 'Sem Dono';
      const ownerAvatar = deal.owner?.avatar || '';

      if (!repsMap[ownerKey]) {
        repsMap[ownerKey] = { name: ownerName, avatar: ownerAvatar, won: 0, lost: 0, revenue: 0 };
      }
      repsMap[ownerKey].won += 1;
      repsMap[ownerKey].revenue += deal.value;
    });

    lostDeals.forEach(deal => {
      const ownerKey = deal.owner?.name || 'unknown';
      const ownerName = deal.owner?.name || 'Sem Dono';
      const ownerAvatar = deal.owner?.avatar || '';

      if (!repsMap[ownerKey]) {
        repsMap[ownerKey] = { name: ownerName, avatar: ownerAvatar, won: 0, lost: 0, revenue: 0 };
      }
      repsMap[ownerKey].lost += 1;
    });

    return Object.entries(repsMap)
      .map(([id, data]) => {
        const total = data.won + data.lost;
        return {
          id,
          name: data.name,
          avatar: data.avatar,
          deals: data.won,
          revenue: data.revenue,
          winRate: total > 0 ? Math.round((data.won / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [wonDeals, lostDeals]);

  const generatedBy = useMemo(() => {
    if (profile?.first_name && profile?.last_name) return `${profile.first_name} ${profile.last_name}`;
    return profile?.first_name || profile?.email || 'Usuário';
  }, [profile?.email, profile?.first_name, profile?.last_name]);

  const handleExportPDF = useCallback(async () => {
    await generateReportPDF(
      {
        pipelineValue,
        actualWinRate,
        avgSalesCycle,
        fastestDeal,
        wonRevenue,
        wonDeals,
        changes,
        funnelData,
      },
      period,
      selectedBoard?.name,
      generatedBy
    );
  }, [
    actualWinRate,
    avgSalesCycle,
    changes,
    fastestDeal,
    funnelData,
    generatedBy,
    period,
    pipelineValue,
    selectedBoard?.name,
    wonDeals,
    wonRevenue,
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] space-y-4">
      {/* Header com Filtros */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
            Relatórios de Performance
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm mt-1">
            Análise detalhada de vendas e tendências.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            aria-label="Selecionar Pipeline"
            className="px-3 py-2 bg-white dark:bg-card border border-border dark:border-border rounded-lg text-sm font-medium text-secondary-foreground dark:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {boards.map(board => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>

          <PeriodFilterSelect value={period} onChange={setPeriod} />

          <Button
            type="button"
            onClick={handleExportPDF}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg glass border border-border/50 text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white hover:border-border dark:hover:border-white/20 transition-all duration-200"
            title="Exportar PDF"
          >
            <Download size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium opacity-80 group-hover:opacity-100">PDF</span>
          </Button>
        </div>
      </div>

      {/* Forecast Bar — extracted component */}
      <ForecastBar
        currentValue={currentValue}
        goalTarget={goalTarget}
        goalType={goalType}
        goalKpi={goalKpi}
        onConfigureClick={() => router.push('/boards')}
        className="shrink-0"
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="glass p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <DollarSign className="text-blue-500" size={18} />
            </div>
            <span className="text-xs text-muted-foreground">Pipeline Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(pipelineValue)}</p>
          <p className={`text-xs ${changes.pipeline >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {changes.pipeline >= 0 ? '+' : ''}{changes.pipeline.toFixed(1)}% {COMPARISON_LABELS[period]}
          </p>
        </div>

        <div className="glass p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Target className="text-emerald-500" size={18} />
            </div>
            <span className="text-xs text-muted-foreground">Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{actualWinRate.toFixed(1)}%</p>
          <p className={`text-xs ${changes.winRate >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {changes.winRate >= 0 ? '+' : ''}{changes.winRate.toFixed(1)}% {COMPARISON_LABELS[period]}
          </p>
        </div>

        <div className="glass p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="text-purple-500" size={18} />
            </div>
            <span className="text-xs text-muted-foreground">Ciclo Médio</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{avgSalesCycle} dias</p>
          <p className="text-xs text-muted-foreground">
            Rápido: {fastestDeal}d | Lento: {slowestDeal}d
          </p>
        </div>

        <div className="glass p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingUp className="text-orange-500" size={18} />
            </div>
            <span className="text-xs text-muted-foreground">Deals Fechados</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            <span className="text-emerald-500">{wonDeals.length}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-red-500">{lostDeals.length}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Ganhos / Perdas
          </p>
        </div>
      </div>

      {/* Bottom Grid - Charts & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-[250px]">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 glass p-5 rounded-xl border border-border shadow-sm flex flex-col h-full">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h2 className="text-lg font-bold text-foreground font-display">
              Tendência de Receita
            </h2>
            <span className="text-xs text-muted-foreground bg-muted dark:bg-white/5 px-2 py-1 rounded">
              Últimos 6 Meses
            </span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <ChartWrapper height="100%">
                <LazyRevenueTrendChart data={trendData} />
              </ChartWrapper>
            </div>
          </div>
        </div>

        {/* Leaderboard — extracted component */}
        <BrokerLeaderboard data={leaderboardRows} formatCurrency={formatCurrency} />
      </div>
    </div>
  );
};

export default ReportsPage;
