import React from 'react';
import { Plus, LayoutList, Calendar as CalendarIcon, CalendarDays, ArrowDownUp } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import type { SortOrder } from '@/features/activities/types';

interface ActivitiesHeaderProps {
  viewMode: 'list' | 'calendar' | 'month';
  setViewMode: (mode: 'list' | 'calendar' | 'month') => void;
  onNewActivity?: () => void;
  dateFilter?: 'ALL' | 'overdue' | 'today' | 'upcoming';
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  overdueCount?: number;
}

export const ActivitiesHeader: React.FC<ActivitiesHeaderProps> = ({
  viewMode,
  setViewMode,
  onNewActivity,
  dateFilter = 'ALL',
  sortOrder,
  setSortOrder,
  overdueCount = 0,
}) => {
  const filterLabel =
    dateFilter === 'overdue'
      ? 'Atrasados'
      : dateFilter === 'today'
        ? 'Hoje'
        : dateFilter === 'upcoming'
          ? 'Próximos'
          : null;

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          Atividades
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-slate-500 dark:text-slate-400">Gerencie suas tarefas e compromissos</p>
          {filterLabel && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
              Filtro: {filterLabel}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
              {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white dark:bg-dark-card px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10">
          <ArrowDownUp size={16} className="text-slate-400" />
          <select
            aria-label="Ordenar atividades"
            className="bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
          </select>
        </div>
        <div className="flex bg-white dark:bg-dark-card p-1 rounded-lg border border-slate-200 dark:border-white/10">
          <Button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <LayoutList size={20} />
          </Button>
          <Button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'calendar'
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title="Semanal"
          >
            <CalendarIcon size={20} />
          </Button>
          <Button
            onClick={() => setViewMode('month')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'month'
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title="Mensal"
          >
            <CalendarDays size={20} />
          </Button>
        </div>
        {onNewActivity && (
          <Button
            onClick={onNewActivity}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20"
          >
            <Plus size={20} />
            Nova Atividade
          </Button>
        )}
      </div>
    </div>
  );
};
