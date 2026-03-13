import React from 'react';
import { DollarSign, Hash, TrendingUp, Trophy, Clock, AlertTriangle } from 'lucide-react';

const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface SummaryBarProps {
  pipelineValue: number;
  totalDeals: number;
  avgTicket: number;
  winRate: number;
  stagnantDeals: number;
  overdueDeals: number;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
  warn?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, alert, warn }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 min-w-0 shrink-0">
    <span className={
      alert ? 'text-red-500 dark:text-red-400' :
      warn ? 'text-amber-500 dark:text-amber-400' :
      'text-muted-foreground'
    }>
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground leading-none mb-0.5 truncate">{label}</p>
      <p className={`text-sm font-semibold leading-none truncate ${
        alert ? 'text-red-600 dark:text-red-400' :
        warn ? 'text-amber-600 dark:text-amber-400' :
        'text-foreground'
      }`}>
        {value}
      </p>
    </div>
  </div>
);

export const SummaryBar: React.FC<SummaryBarProps> = ({
  pipelineValue, totalDeals, avgTicket, winRate, stagnantDeals, overdueDeals,
}) => (
  <div className="mx-4 mt-1 px-2 py-1 bg-white/60 dark:bg-card/60 backdrop-blur border border-border/50 rounded-lg flex items-center gap-1 overflow-x-auto scrollbar-none">
    <MetricCard
      icon={<DollarSign size={14} />}
      label="Pipeline"
      value={BRL_CURRENCY.format(pipelineValue)}
    />
    <div className="w-px h-6 bg-border/50 shrink-0" />
    <MetricCard
      icon={<Hash size={14} />}
      label="Deals"
      value={String(totalDeals)}
    />
    <div className="w-px h-6 bg-border/50 shrink-0" />
    <MetricCard
      icon={<TrendingUp size={14} />}
      label="Ticket Medio"
      value={BRL_CURRENCY.format(avgTicket)}
    />
    <div className="w-px h-6 bg-border/50 shrink-0" />
    <MetricCard
      icon={<Trophy size={14} />}
      label="Win Rate"
      value={`${(Number.isFinite(winRate) ? winRate : 0).toFixed(1)}%`}
    />
    <div className="w-px h-6 bg-border/50 shrink-0" />
    <MetricCard
      icon={<Clock size={14} />}
      label="Parados"
      value={String(stagnantDeals)}
      warn={stagnantDeals > 0}
    />
    <div className="w-px h-6 bg-border/50 shrink-0" />
    <MetricCard
      icon={<AlertTriangle size={14} />}
      label="Atrasados"
      value={String(overdueDeals)}
      alert={overdueDeals > 0}
    />
  </div>
);
