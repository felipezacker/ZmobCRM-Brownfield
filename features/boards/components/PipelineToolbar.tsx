import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { KanbanHeader } from './Kanban/KanbanHeader';
import { BoardStrategyHeader } from './Kanban/BoardStrategyHeader';
import { AdvancedFiltersDrawer } from './AdvancedFiltersDrawer';
import { Button } from '@/components/ui/button';
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
  showAllRecent: boolean;
  setShowAllRecent: (value: boolean) => void;
  // Advanced filters (BUX-7)
  dealTypeFilter: string[];
  setDealTypeFilter: (v: string[]) => void;
  valueRange: { min: number | null; max: number | null };
  setValueRange: (v: { min: number | null; max: number | null }) => void;
  closeDateFilter: { start: string; end: string };
  setCloseDateFilter: (v: { start: string; end: string }) => void;
  productFilter: string[];
  setProductFilter: (v: string[]) => void;
  tagFilter: string[];
  setTagFilter: (v: string[]) => void;
  probabilityRange: { min: number; max: number };
  setProbabilityRange: (v: { min: number; max: number }) => void;
  clearAdvancedFilters: () => void;
  activeAdvancedFilterCount: number;
  uniqueProducts: string[];
  uniqueTags: string[];
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
  showAllRecent,
  setShowAllRecent,
  // Advanced filters (BUX-7)
  dealTypeFilter, setDealTypeFilter,
  valueRange, setValueRange,
  closeDateFilter, setCloseDateFilter,
  productFilter, setProductFilter,
  tagFilter, setTagFilter,
  probabilityRange, setProbabilityRange,
  clearAdvancedFilters, activeAdvancedFilterCount,
  uniqueProducts, uniqueTags,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
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
        activeAdvancedFilterCount={activeAdvancedFilterCount}
        onOpenAdvancedFilters={() => setDrawerOpen(true)}
      />

      <BoardStrategyHeader board={activeBoard} />

      {hiddenByRecentCount > 0 && !showAllRecent && (
        <div className="mx-4 mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-full text-xs text-amber-700 dark:text-amber-300">
          <Info size={12} className="shrink-0" />
          <span>{hiddenByRecentCount} oculto{hiddenByRecentCount > 1 ? 's' : ''} &gt; 30 dias</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAllRecent(true)}
            aria-label="Mostrar todos os deals ocultos"
            className="ml-1 h-auto w-auto p-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
          >
            <X size={12} />
          </Button>
        </div>
      )}

      <AdvancedFiltersDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        dealTypeFilter={dealTypeFilter}
        setDealTypeFilter={setDealTypeFilter}
        valueRange={valueRange}
        setValueRange={setValueRange}
        closeDateFilter={closeDateFilter}
        setCloseDateFilter={setCloseDateFilter}
        productFilter={productFilter}
        setProductFilter={setProductFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        probabilityRange={probabilityRange}
        setProbabilityRange={setProbabilityRange}
        clearAdvancedFilters={clearAdvancedFilters}
        uniqueProducts={uniqueProducts}
        uniqueTags={uniqueTags}
      />
    </>
  );
};
