import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DealView, Board, CustomFieldDefinition, LifecycleStage } from '@/types';
import { useAI } from '@/context/AIContext';
import { isDealRotting } from './boardUtils';
import { useRangeSelection } from '@/hooks/useRangeSelection';

interface UseBoardViewParams {
  activeBoard: Board | null;
  deals: DealView[];
  searchTerm: string;
  ownerFilter: string;
  statusFilter: string;
  dateRange: { start: string; end: string };
  boardsLoading: boolean;
  boardsFetching: boolean;
  boardsUpdatedAt: number;
  boardsCount: number;
  moveDealMutation: { mutate: (args: { dealId: string; targetStageId: string; deal: DealView; board: Board; lifecycleStages: LifecycleStage[] }) => void };
  deleteDealMutation: { mutate: (id: string) => void };
  lifecycleStages: LifecycleStage[];
  filteredDeals: DealView[];
  clearDealSelectionTrigger: 'kanban' | 'list'; // viewMode for clearing on switch
}

export const useBoardView = ({
  activeBoard, deals, searchTerm, ownerFilter, statusFilter, dateRange,
  boardsLoading, boardsFetching, boardsUpdatedAt, boardsCount,
  moveDealMutation, deleteDealMutation, lifecycleStages, filteredDeals, clearDealSelectionTrigger,
}: UseBoardViewParams) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setContext } = useAI();

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openActivityMenuId, setOpenActivityMenuId] = useState<string | null>(null);
  const { selectedIds: selectedDealIds, toggle: toggleDealSelect, toggleAll: toggleDealSelectAll, clear: clearDealSelection } = useRangeSelection({ items: filteredDeals });
  const customFieldDefinitions: CustomFieldDefinition[] = [];

  // Clear selection on view mode switch
  useEffect(() => { clearDealSelection(); }, [clearDealSelectionTrigger, clearDealSelection]);

  // Open deal from URL param
  useEffect(() => {
    if (!searchParams) return;
    const dealIdFromUrl = searchParams.get('deal');
    if (dealIdFromUrl) {
      setSelectedDealId(dealIdFromUrl);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('deal');
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  // Click outside handler for activity menu
  useEffect(() => {
    const handleClickOutside = () => setOpenActivityMenuId(null);
    if (openActivityMenuId) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openActivityMenuId]);

  // Bulk move deals to stage
  const handleBulkMoveDealToStage = useCallback((targetStageId: string) => {
    if (!activeBoard) return;
    const dealsToMove = deals.filter(d => selectedDealIds.has(d.id) && !d.id.startsWith('temp-'));
    for (const deal of dealsToMove) {
      moveDealMutation.mutate({ dealId: deal.id, targetStageId, deal, board: activeBoard, lifecycleStages });
    }
    clearDealSelection();
  }, [activeBoard, deals, selectedDealIds, moveDealMutation, lifecycleStages, clearDealSelection]);

  const handleBulkDeleteDeals = useCallback(() => {
    for (const dealId of selectedDealIds) {
      if (!dealId.startsWith('temp-')) deleteDealMutation.mutate(dealId);
    }
    clearDealSelection();
  }, [selectedDealIds, deleteDealMutation, clearDealSelection]);

  // Combined loading state
  const hasEverLoadedBoards = boardsUpdatedAt > 0;
  const isLoading = (boardsLoading || boardsFetching || !hasEverLoadedBoards) && boardsCount === 0;

  // Board metrics from filtered deals (used by SummaryBar)
  const boardMetrics = useMemo(() => {
    if (!activeBoard || activeBoard.id.startsWith('temp-')) return null;
    let pipelineValue = 0, stagnantDeals = 0, overdueDeals = 0;
    let wonCount = 0, lostCount = 0, totalDeals = 0;
    for (const d of filteredDeals) {
      totalDeals++;
      pipelineValue += d.value ?? 0;
      if (isDealRotting(d) && !d.isWon && !d.isLost) stagnantDeals++;
      if (d.nextActivity?.isOverdue) overdueDeals++;
      if (d.isWon) wonCount++;
      if (d.isLost) lostCount++;
    }
    const closedTotal = wonCount + lostCount;
    const winRate = closedTotal > 0 ? (wonCount / closedTotal) * 100 : 0;
    const avgTicket = totalDeals > 0 ? pipelineValue / totalDeals : 0;
    return { pipelineValue, totalDeals, avgTicket, winRate, stagnantDeals, overdueDeals };
  }, [activeBoard, filteredDeals]);

  // AI Context
  const lastContextSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeBoard || activeBoard.id.startsWith('temp-') || !boardMetrics) return;
    const stageIdToLabel = new Map<string, string>();
    const dealsPerStage: Record<string, number> = {};
    for (const stage of activeBoard.stages) {
      stageIdToLabel.set(stage.id, stage.label);
      dealsPerStage[stage.label] = 0;
    }
    for (const d of deals) {
      const label = stageIdToLabel.get(d.status);
      if (label) dealsPerStage[label] = (dealsPerStage[label] ?? 0) + 1;
    }
    const wonStageLabel = activeBoard.wonStageId ? stageIdToLabel.get(activeBoard.wonStageId) : undefined;
    const lostStageLabel = activeBoard.lostStageId ? stageIdToLabel.get(activeBoard.lostStageId) : undefined;
    const contextSignature = [
      activeBoard.id, statusFilter, ownerFilter, searchTerm || '',
      dateRange.start || '', dateRange.end || '', String(deals.length),
      String(boardMetrics.pipelineValue), String(boardMetrics.stagnantDeals), String(boardMetrics.overdueDeals),
    ].join('|');
    if (lastContextSignatureRef.current === contextSignature) return;
    lastContextSignatureRef.current = contextSignature;

    setContext({
      view: { type: 'kanban', name: activeBoard.name, url: `/boards/${activeBoard.id}` },
      activeObject: {
        type: 'board', id: activeBoard.id, name: activeBoard.name,
        metadata: {
          boardId: activeBoard.id, description: activeBoard.description, goal: activeBoard.goal,
          columns: activeBoard.stages.map(s => s.label).join(', '),
          stages: activeBoard.stages.map(s => ({ id: s.id, name: s.label })),
          dealCount: deals.length, pipelineValue: boardMetrics.pipelineValue,
          dealsPerStage, stagnantDeals: boardMetrics.stagnantDeals, overdueDeals: boardMetrics.overdueDeals,
          wonStage: wonStageLabel, lostStage: lostStageLabel,
          linkedLifecycleStage: activeBoard.linkedLifecycleStage,
          agentPersona: activeBoard.agentPersona, entryTrigger: activeBoard.entryTrigger,
          automationSuggestions: activeBoard.automationSuggestions,
        },
      },
      filters: {
        status: statusFilter, owner: ownerFilter,
        search: searchTerm || undefined,
        dateRange: (dateRange.start || dateRange.end) ? dateRange : undefined,
      },
    });
  }, [activeBoard, deals, boardMetrics, statusFilter, ownerFilter, searchTerm, dateRange, setContext]);

  return {
    selectedDealId, setSelectedDealId,
    isCreateModalOpen, setIsCreateModalOpen,
    openActivityMenuId, setOpenActivityMenuId,
    selectedDealIds, toggleDealSelect, toggleDealSelectAll, clearDealSelection,
    handleBulkMoveDealToStage, handleBulkDeleteDeals,
    customFieldDefinitions, isLoading, boardMetrics,
  };
};
