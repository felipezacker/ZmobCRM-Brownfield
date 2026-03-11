import React from 'react';
import { Info } from 'lucide-react';
import { KanbanHeader } from './Kanban/KanbanHeader';
import { BoardStrategyHeader } from './Kanban/BoardStrategyHeader';
import { Board } from '@/types';
import type { OrgMember } from '@/hooks/useOrganizationMembers';

interface PipelineToolbarProps {
  boards: Board[];
  activeBoard: Board;
  onSelectBoard: (id: string) => void;
  onCreateBoard: () => void;
  onEditBoard: (board: Board) => void;
  onDeleteBoard: (id: string) => void;
  onExportTemplates?: () => void;
  viewMode: 'kanban' | 'list';
  setViewMode: (mode: 'kanban' | 'list') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  ownerFilter: string;
  setOwnerFilter: (filter: string) => void;
  statusFilter: 'open' | 'won' | 'lost' | 'all';
  setStatusFilter: (filter: 'open' | 'won' | 'lost' | 'all') => void;
  priorityFilter: 'all' | 'high' | 'medium' | 'low';
  setPriorityFilter: (filter: 'all' | 'high' | 'medium' | 'low') => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  orgMembers: OrgMember[];
  onNewDeal: () => void;
  hiddenByRecentCount: number;
}

export const PipelineToolbar: React.FC<PipelineToolbarProps> = ({
  boards,
  activeBoard,
  onSelectBoard,
  onCreateBoard,
  onEditBoard,
  onDeleteBoard,
  onExportTemplates,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  ownerFilter,
  setOwnerFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  dateRange,
  setDateRange,
  orgMembers,
  onNewDeal,
  hiddenByRecentCount,
}) => (
  <>
    <KanbanHeader
      boards={boards}
      activeBoard={activeBoard}
      onSelectBoard={onSelectBoard}
      onCreateBoard={onCreateBoard}
      onEditBoard={onEditBoard}
      onDeleteBoard={onDeleteBoard}
      onExportTemplates={onExportTemplates}
      viewMode={viewMode}
      setViewMode={setViewMode}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      ownerFilter={ownerFilter}
      setOwnerFilter={setOwnerFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      priorityFilter={priorityFilter}
      setPriorityFilter={setPriorityFilter}
      dateRange={dateRange}
      setDateRange={setDateRange}
      orgMembers={orgMembers}
      onNewDeal={onNewDeal}
    />

    <BoardStrategyHeader board={activeBoard} />

    {hiddenByRecentCount > 0 && (
      <div className="mx-4 mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
        <Info size={14} className="shrink-0" />
        <span>
          {hiddenByRecentCount} negocio{hiddenByRecentCount > 1 ? 's' : ''} ganho{hiddenByRecentCount > 1 ? 's' : ''}/perdido{hiddenByRecentCount > 1 ? 's' : ''} ha mais de 30 dias {hiddenByRecentCount > 1 ? 'estao ocultos' : 'esta oculto'}.{' '}
          Use o filtro <strong>Ganhos</strong> ou <strong>Perdidos</strong> para visualiza-{hiddenByRecentCount > 1 ? 'los' : 'lo'}.
        </span>
      </div>
    )}
  </>
);
