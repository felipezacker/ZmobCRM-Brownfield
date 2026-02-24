import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { Activity } from '@/types';
import { DateRangePicker } from '@/components/ui/date-range-picker';

export type DatePreset = 'ALL' | 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'thisMonth' | 'custom';
export type SortOrder = 'newest' | 'oldest';

interface ActivitiesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: Activity['type'] | 'ALL';
  setFilterType: (type: Activity['type'] | 'ALL') => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  showTypeFilter?: boolean;
}

export const ActivitiesFilters: React.FC<ActivitiesFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  datePreset,
  setDatePreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  showTypeFilter = true,
}) => {
  const selectClass = "bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white";

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar atividades..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      {showTypeFilter && (
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-slate-400" />
          <select
            className={selectClass}
            value={filterType}
            onChange={e => setFilterType(e.target.value as Activity['type'] | 'ALL')}
          >
            <option value="ALL">Todos os tipos</option>
            <option value="CALL">Ligações</option>
            <option value="MEETING">Reuniões</option>
            <option value="EMAIL">Emails</option>
            <option value="TASK">Tarefas</option>
          </select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Calendar size={20} className="text-slate-400" />
        <select
          className={selectClass}
          value={datePreset}
          onChange={e => setDatePreset(e.target.value as DatePreset)}
        >
          <option value="ALL">Todo o período</option>
          <option value="overdue">Atrasadas</option>
          <option value="today">Hoje</option>
          <option value="tomorrow">Amanhã</option>
          <option value="thisWeek">Esta semana</option>
          <option value="thisMonth">Este mês</option>
          <option value="custom">Personalizado</option>
        </select>
        {datePreset === 'custom' && (
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChangeFrom={setDateFrom}
            onChangeTo={setDateTo}
          />
        )}
      </div>
    </div>
  );
};
