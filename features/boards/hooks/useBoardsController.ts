import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBoards, useDefaultBoard } from '@/lib/query/hooks/useBoardsQuery';
import { useDealsByBoard, useDeleteDeal } from '@/lib/query/hooks/useDealsQuery';
import { useMoveDeal } from '@/lib/query/hooks/useMoveDeal';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/settings/SettingsContext';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useBoardCRUD } from './useBoardCRUD';
import { useBoardFilters } from './useBoardFilters';
import { useBoardDragDrop } from './useBoardDragDrop';
import { useBoardView } from './useBoardView';

// Re-export utilities for backward compatibility
export { isDealRotting, getActivityStatus } from './boardUtils';

export const useBoardsController = () => {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const { lifecycleStages } = useSettings();
  const searchParams = useSearchParams();

  // Board data queries
  const {
    data: boards = [], isLoading: boardsLoading,
    isFetched: boardsFetched, isFetching: boardsFetching, dataUpdatedAt: boardsUpdatedAt,
  } = useBoards();
  const { data: defaultBoard } = useDefaultBoard();

  // Active board state (persisted)
  const [activeBoardId, setActiveBoardId] = usePersistedState<string | null>('crm_active_board_id', null);

  useEffect(() => {
    if (!activeBoardId && defaultBoard) { setActiveBoardId(defaultBoard.id); return; }
    if (activeBoardId && boards.length > 0) {
      if (!boards.some(b => b.id === activeBoardId)) {
        setActiveBoardId(defaultBoard?.id || boards[0]?.id || null);
      }
    }
  }, [activeBoardId, defaultBoard, boards, setActiveBoardId]);

  const activeBoard = useMemo(() => {
    return boards.find(b => b.id === activeBoardId) || defaultBoard || null;
  }, [boards, activeBoardId, defaultBoard]);
  const effectiveActiveBoardId = activeBoard?.id || null;

  // Deals for active board
  const { data: deals = [] } = useDealsByBoard(activeBoardId || '');
  const moveDealMutation = useMoveDeal();
  const deleteDealMutation = useDeleteDeal();

  // View mode (lifted here to avoid circular dep between filters and view)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  useEffect(() => {
    if (!searchParams) return;
    const viewParam = searchParams.get('view');
    if (viewParam === 'list' || viewParam === 'kanban') setViewMode(viewParam);
  }, [searchParams]);

  // Organization members
  const { members: orgMembers } = useOrganizationMembers();
  const orgMembersById = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string }>();
    for (const m of orgMembers) map.set(m.id, { name: m.name, avatar: m.avatar_url || '' });
    return map;
  }, [orgMembers]);

  // Compose sub-hooks
  const filters = useBoardFilters({
    deals, profileId: profile?.id, profileNickname: profile?.nickname,
    profileFirstName: profile?.first_name, profileAvatarUrl: profile?.avatar_url,
    orgMembersById, viewMode,
  });

  const view = useBoardView({
    activeBoard, deals,
    searchTerm: filters.searchTerm, ownerFilter: filters.ownerFilter,
    statusFilter: filters.statusFilter, dateRange: filters.dateRange,
    boardsLoading, boardsFetching, boardsUpdatedAt, boardsCount: boards.length,
    moveDealMutation, deleteDealMutation, lifecycleStages,
    filteredDeals: filters.filteredDeals,
    clearDealSelectionTrigger: viewMode,
  });

  const crud = useBoardCRUD({
    boards, activeBoard, activeBoardId, setActiveBoardId, defaultBoard, addToast,
  });

  const dragDrop = useBoardDragDrop({
    deals, activeBoard, lifecycleStages, addToast,
    selectedDealId: view.selectedDealId, setSelectedDealId: view.setSelectedDealId,
  });

  const handleSelectBoard = (boardId: string) => {
    view.clearDealSelection();
    setActiveBoardId(boardId);
  };

  return {
    // Board data
    boards, boardsLoading, boardsFetched, activeBoard, activeBoardId, effectiveActiveBoardId,
    handleSelectBoard,
    // View
    viewMode, setViewMode,
    // Organization members for owner filter dropdown
    orgMembers,
    // Spread sub-hooks
    ...crud, ...filters, ...dragDrop, ...view,
    // Explicit overrides (sub-hooks may have conflicting keys)
    filteredDeals: filters.filteredDeals,
    hiddenByRecentCount: filters.hiddenByRecentCount,
    sortedDeals: filters.sortedDeals,
    showAllRecent: filters.showAllRecent,
    setShowAllRecent: filters.setShowAllRecent,
    // Advanced filters (BUX-7) — explicit to avoid spread conflicts
    dealTypeFilter: filters.dealTypeFilter,
    setDealTypeFilter: filters.setDealTypeFilter,
    valueRange: filters.valueRange,
    setValueRange: filters.setValueRange,
    closeDateFilter: filters.closeDateFilter,
    setCloseDateFilter: filters.setCloseDateFilter,
    productFilter: filters.productFilter,
    setProductFilter: filters.setProductFilter,
    tagFilter: filters.tagFilter,
    setTagFilter: filters.setTagFilter,
    probabilityRange: filters.probabilityRange,
    setProbabilityRange: filters.setProbabilityRange,
    clearAdvancedFilters: filters.clearAdvancedFilters,
    activeAdvancedFilterCount: filters.activeAdvancedFilterCount,
    uniqueProducts: filters.uniqueProducts,
    uniqueTags: filters.uniqueTags,
  };
};

// @deprecated - Use useBoardsController
export const usePipelineController = useBoardsController;
