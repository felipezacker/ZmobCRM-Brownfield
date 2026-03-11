import React from 'react';
import { KanbanBoard } from './Kanban/KanbanBoard';
import { KanbanList } from './Kanban/KanbanList';
import { PipelineToolbar } from './PipelineToolbar';
import { PipelineModals } from './PipelineModals';
import { BulkActionsBar } from './BulkActionsBar';
import { usePipelineModals } from './hooks/usePipelineModals';
import { DealView, CustomFieldDefinition, Board, BoardStage, DealSortableColumn } from '@/types';
import { useAuth } from '@/context/AuthContext';
import PageLoader from '@/components/PageLoader';
import { Button } from '@/components/ui/button';
import type { OrgMember } from '@/hooks/useOrganizationMembers';

interface PipelineViewProps {
  // Boards
  boards: Board[];
  activeBoard: Board | null;
  activeBoardId: string | null;
  handleSelectBoard: (id: string) => void;
  handleCreateBoard: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => void;
  createBoardAsync?: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => Promise<Board>;
  updateBoardAsync?: (id: string, updates: Partial<Board>) => Promise<void>;
  handleEditBoard: (board: Board) => void;
  handleUpdateBoard: (board: Omit<Board, 'id' | 'createdAt'>) => void;
  handleDeleteBoard: (id: string) => void;
  confirmDeleteBoard: () => void;
  boardToDelete: { id: string; name: string; dealCount: number; targetBoardId?: string } | null;
  setBoardToDelete: (board: { id: string; name: string; dealCount: number; targetBoardId?: string } | null) => void;
  setTargetBoardForDelete: (targetBoardId: string) => void;
  availableBoardsForMove: Board[];
  isCreateBoardModalOpen: boolean;
  setIsCreateBoardModalOpen: (isOpen: boolean) => void;
  isWizardOpen: boolean;
  setIsWizardOpen: (isOpen: boolean) => void;
  editingBoard: Board | null;
  setEditingBoard: (board: Board | null) => void;
  // View
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
  draggingId: string | null;
  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (isOpen: boolean) => void;
  openActivityMenuId: string | null;
  setOpenActivityMenuId: (id: string | null) => void;
  filteredDeals: DealView[];
  customFieldDefinitions: CustomFieldDefinition[];
  isLoading: boolean;
  handleDragStart: (e: React.DragEvent, id: string, title: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, stageId: string) => void;
  handleMoveDealToStage: (dealId: string, newStageId: string) => void;
  handleQuickAddActivity: (
    dealId: string,
    type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP',
    dealTitle: string
  ) => void;
  setLastMouseDownDealId: (id: string | null) => void;
  // Quick Actions
  handleWinDeal: (dealId: string) => void;
  handleLoseDeal: (dealId: string, dealTitle: string) => void;
  handleDeleteDeal: (dealId: string) => void;
  // Deal Selection & Sort (list view)
  selectedDealIds: Set<string>;
  toggleDealSelect: (dealId: string) => void;
  toggleDealSelectAll: (allIds: string[]) => void;
  clearDealSelection: () => void;
  dealSortBy: DealSortableColumn;
  dealSortOrder: 'asc' | 'desc';
  handleDealSort: (column: DealSortableColumn) => void;
  sortedDeals: DealView[];
  hiddenByRecentCount?: number;
  handleBulkMoveDealToStage: (targetStageId: string) => void;
  handleBulkDeleteDeals: () => void;
  // Loss Reason Modal
  lossReasonModal: {
    isOpen: boolean;
    dealId: string;
    dealTitle: string;
    stageId: string;
  } | null;
  handleLossReasonConfirm: (reason: string) => void;
  handleLossReasonClose: () => void;
  boardCreateOverlay?: { title: string; subtitle?: string } | null;
}

export const PipelineView: React.FC<PipelineViewProps> = (props) => {
  const {
    boards, activeBoard, activeBoardId,
    handleSelectBoard, handleCreateBoard, createBoardAsync, updateBoardAsync,
    handleEditBoard, handleUpdateBoard, handleDeleteBoard, confirmDeleteBoard,
    boardToDelete, setBoardToDelete, setTargetBoardForDelete, availableBoardsForMove,
    isCreateBoardModalOpen, setIsCreateBoardModalOpen,
    isWizardOpen, setIsWizardOpen, editingBoard, setEditingBoard,
    viewMode, setViewMode, searchTerm, setSearchTerm,
    ownerFilter, setOwnerFilter, statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter, dateRange, setDateRange, orgMembers,
    draggingId, selectedDealId, setSelectedDealId,
    isCreateModalOpen, setIsCreateModalOpen,
    openActivityMenuId, setOpenActivityMenuId,
    filteredDeals, customFieldDefinitions, isLoading,
    handleDragStart, handleDragOver, handleDrop, handleMoveDealToStage,
    handleQuickAddActivity, setLastMouseDownDealId,
    handleWinDeal, handleLoseDeal, handleDeleteDeal,
    selectedDealIds, toggleDealSelect, toggleDealSelectAll, clearDealSelection,
    dealSortBy, dealSortOrder, handleDealSort, sortedDeals,
    hiddenByRecentCount = 0, handleBulkMoveDealToStage, handleBulkDeleteDeals,
    lossReasonModal, handleLossReasonConfirm, handleLossReasonClose,
    boardCreateOverlay,
  } = props;

  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const modals = usePipelineModals({ setIsCreateModalOpen, setSelectedDealId });

  const handleUpdateStage = (updatedStage: BoardStage) => {
    if (!activeBoard) return;
    const newStages = activeBoard.stages.map(s => (s.id === updatedStage.id ? updatedStage : s));
    handleUpdateBoard({ ...activeBoard, stages: newStages });
  };

  if (isLoading) {
    return (
      <div className="h-full">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {boardCreateOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <div className="relative z-10 w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-white/95 dark:bg-card/95 backdrop-blur p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-foreground">
                  {boardCreateOverlay.title}
                </div>
                {boardCreateOverlay.subtitle && (
                  <div className="mt-1 text-sm text-secondary-foreground dark:text-muted-foreground">
                    {boardCreateOverlay.subtitle}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-accent dark:bg-white/10 overflow-hidden">
                <div className="h-full w-1/2 bg-primary-500/80 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!activeBoard ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bem-vindo ao seu CRM
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground max-w-md mb-8">
            Voce ainda nao tem nenhum board criado. Comece criando seu primeiro fluxo de trabalho
            para organizar seus negocios.
          </p>
          <Button
            onClick={() => setIsWizardOpen(true)}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-primary-600/20"
          >
            ✨ Criar meu primeiro Board
          </Button>
        </div>
      ) : (
        <>
          <PipelineToolbar
            boards={boards}
            activeBoard={activeBoard}
            onSelectBoard={handleSelectBoard}
            onCreateBoard={() => setIsWizardOpen(true)}
            onEditBoard={handleEditBoard}
            onDeleteBoard={handleDeleteBoard}
            onExportTemplates={isAdmin ? () => modals.setIsExportModalOpen(true) : undefined}
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
            onNewDeal={() => setIsCreateModalOpen(true)}
            hiddenByRecentCount={hiddenByRecentCount}
          />

          <div className="flex-1 overflow-hidden">
            {viewMode === 'kanban' ? (
              <KanbanBoard
                stages={activeBoard.stages}
                filteredDeals={filteredDeals}
                draggingId={draggingId}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                setSelectedDealId={setSelectedDealId}
                openActivityMenuId={openActivityMenuId}
                setOpenActivityMenuId={setOpenActivityMenuId}
                handleQuickAddActivity={handleQuickAddActivity}
                setLastMouseDownDealId={setLastMouseDownDealId}
                onMoveDealToStage={handleMoveDealToStage}
                onWinDeal={activeBoard?.wonStageId ? handleWinDeal : undefined}
                onLoseDeal={activeBoard?.lostStageId ? handleLoseDeal : undefined}
                onDeleteDeal={handleDeleteDeal}
                wonStageId={activeBoard.wonStageId}
                lostStageId={activeBoard.lostStageId}
                onAddDealToStage={modals.handleAddDealToStage}
              />
            ) : (
              <KanbanList
                stages={activeBoard.stages}
                filteredDeals={sortedDeals}
                customFieldDefinitions={customFieldDefinitions}
                setSelectedDealId={setSelectedDealId}
                openActivityMenuId={openActivityMenuId}
                setOpenActivityMenuId={setOpenActivityMenuId}
                handleQuickAddActivity={handleQuickAddActivity}
                onMoveDealToStage={handleMoveDealToStage}
                selectedDealIds={selectedDealIds}
                toggleDealSelect={toggleDealSelect}
                toggleDealSelectAll={toggleDealSelectAll}
                sortBy={dealSortBy}
                sortOrder={dealSortOrder}
                onSort={handleDealSort}
                totalCount={sortedDeals.length}
                onDeleteDeal={handleDeleteDeal}
              />
            )}
          </div>
        </>
      )}

      <PipelineModals
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        activeBoard={activeBoard}
        activeBoardId={activeBoardId}
        createModalStageId={modals.createModalStageId}
        setCreateModalStageId={modals.setCreateModalStageId}
        handleDealCreated={modals.handleDealCreated}
        selectedDealId={selectedDealId}
        setSelectedDealId={setSelectedDealId}
        isCreateBoardModalOpen={isCreateBoardModalOpen}
        setIsCreateBoardModalOpen={setIsCreateBoardModalOpen}
        editingBoard={editingBoard}
        setEditingBoard={setEditingBoard}
        handleUpdateBoard={handleUpdateBoard}
        handleCreateBoard={handleCreateBoard}
        boards={boards}
        handleEditBoard={handleEditBoard}
        isWizardOpen={isWizardOpen}
        setIsWizardOpen={setIsWizardOpen}
        createBoardAsync={createBoardAsync}
        updateBoardAsync={updateBoardAsync}
        boardToDelete={boardToDelete}
        setBoardToDelete={setBoardToDelete}
        confirmDeleteBoard={confirmDeleteBoard}
        availableBoardsForMove={availableBoardsForMove}
        setTargetBoardForDelete={setTargetBoardForDelete}
        lossReasonModal={lossReasonModal}
        handleLossReasonConfirm={handleLossReasonConfirm}
        handleLossReasonClose={handleLossReasonClose}
        isExportModalOpen={modals.isExportModalOpen}
        setIsExportModalOpen={modals.setIsExportModalOpen}
        isBulkDeleteOpen={modals.isBulkDeleteOpen}
        setIsBulkDeleteOpen={modals.setIsBulkDeleteOpen}
        selectedDealIds={selectedDealIds}
        handleBulkDeleteDeals={handleBulkDeleteDeals}
      />

      {viewMode === 'list' && selectedDealIds.size > 0 && activeBoard && (
        <BulkActionsBar
          selectedDealIds={selectedDealIds}
          clearDealSelection={clearDealSelection}
          stages={activeBoard.stages}
          handleBulkMoveDealToStage={handleBulkMoveDealToStage}
          isBulkMoveOpen={modals.isBulkMoveOpen}
          setIsBulkMoveOpen={modals.setIsBulkMoveOpen}
          bulkMoveRef={modals.bulkMoveRef}
          setIsBulkDeleteOpen={modals.setIsBulkDeleteOpen}
        />
      )}
    </div>
  );
};
