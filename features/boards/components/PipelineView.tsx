import React from 'react';
import { Info } from 'lucide-react';
import { DealDetailModal } from '@/features/boards/components/deal-detail';
import { CreateDealModal } from './Modals/CreateDealModal';
import { CreateBoardModal } from './Modals/CreateBoardModal';
import { BoardCreationWizard } from '@/features/boards/components/board-wizard';
import { KanbanHeader } from './Kanban/KanbanHeader';
import { BoardStrategyHeader } from './Kanban/BoardStrategyHeader';
import { KanbanBoard } from './Kanban/KanbanBoard';
import { KanbanList } from './Kanban/KanbanList';
import { DeleteBoardModal } from './Modals/DeleteBoardModal';
import { LossReasonModal } from '@/components/ui/LossReasonModal';
import { DealView, CustomFieldDefinition, Board, BoardStage, DealSortableColumn } from '@/types';
import { ExportTemplateModal } from './Modals/ExportTemplateModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useAuth } from '@/context/AuthContext';
import PageLoader from '@/components/PageLoader';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowRightCircle, ChevronDown, X } from 'lucide-react';

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
  ownerFilter: 'all' | 'mine';
  setOwnerFilter: (filter: 'all' | 'mine') => void;
  statusFilter: 'open' | 'won' | 'lost' | 'all';
  setStatusFilter: (filter: 'open' | 'won' | 'lost' | 'all') => void;
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
  /** Keyboard-accessible handler to move a deal to a new stage */
  handleMoveDealToStage: (dealId: string, newStageId: string) => void;
  handleQuickAddActivity: (
    dealId: string,
    type: 'CALL' | 'MEETING' | 'EMAIL',
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

/**
 * Componente React `PipelineView`.
 *
 * @param {PipelineViewProps} {
  // Boards
  boards,
  activeBoard,
  activeBoardId,
  handleSelectBoard,
  handleCreateBoard,
  createBoardAsync,
  updateBoardAsync,
  handleEditBoard,
  handleUpdateBoard,
  handleDeleteBoard,
  confirmDeleteBoard,
  boardToDelete,
  setBoardToDelete,
  setTargetBoardForDelete,
  availableBoardsForMove,
  isCreateBoardModalOpen,
  setIsCreateBoardModalOpen,
  isWizardOpen,
  setIsWizardOpen,
  editingBoard,
  setEditingBoard,
  // View
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  ownerFilter,
  setOwnerFilter,
  statusFilter,
  setStatusFilter,
  draggingId,
  selectedDealId,
  setSelectedDealId,
  isCreateModalOpen,
  setIsCreateModalOpen,
  openActivityMenuId,
  setOpenActivityMenuId,
  filteredDeals,
  customFieldDefinitions,
  isLoading,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleMoveDealToStage,
  handleQuickAddActivity,
  setLastMouseDownDealId,
  // Loss Reason Modal
  lossReasonModal,
  handleLossReasonConfirm,
  handleLossReasonClose,
} - Parâmetro `{
  // Boards
  boards,
  activeBoard,
  activeBoardId,
  handleSelectBoard,
  handleCreateBoard,
  createBoardAsync,
  updateBoardAsync,
  handleEditBoard,
  handleUpdateBoard,
  handleDeleteBoard,
  confirmDeleteBoard,
  boardToDelete,
  setBoardToDelete,
  setTargetBoardForDelete,
  availableBoardsForMove,
  isCreateBoardModalOpen,
  setIsCreateBoardModalOpen,
  isWizardOpen,
  setIsWizardOpen,
  editingBoard,
  setEditingBoard,
  // View
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  ownerFilter,
  setOwnerFilter,
  statusFilter,
  setStatusFilter,
  draggingId,
  selectedDealId,
  setSelectedDealId,
  isCreateModalOpen,
  setIsCreateModalOpen,
  openActivityMenuId,
  setOpenActivityMenuId,
  filteredDeals,
  customFieldDefinitions,
  isLoading,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleMoveDealToStage,
  handleQuickAddActivity,
  setLastMouseDownDealId,
  // Loss Reason Modal
  lossReasonModal,
  handleLossReasonConfirm,
  handleLossReasonClose,
}`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const PipelineView: React.FC<PipelineViewProps> = ({
  // Boards
  boards,
  activeBoard,
  activeBoardId,
  handleSelectBoard,
  handleCreateBoard,
  createBoardAsync,
  updateBoardAsync,
  handleEditBoard,
  handleUpdateBoard,
  handleDeleteBoard,
  confirmDeleteBoard,
  boardToDelete,
  setBoardToDelete,
  setTargetBoardForDelete,
  availableBoardsForMove,
  isCreateBoardModalOpen,
  setIsCreateBoardModalOpen,
  isWizardOpen,
  setIsWizardOpen,
  editingBoard,
  setEditingBoard,
  // View
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  ownerFilter,
  setOwnerFilter,
  statusFilter,
  setStatusFilter,
  draggingId,
  selectedDealId,
  setSelectedDealId,
  isCreateModalOpen,
  setIsCreateModalOpen,
  openActivityMenuId,
  setOpenActivityMenuId,
  filteredDeals,
  customFieldDefinitions,
  isLoading,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleMoveDealToStage,
  handleQuickAddActivity,
  setLastMouseDownDealId,
  // Quick Actions
  handleWinDeal,
  handleLoseDeal,
  handleDeleteDeal,
  // Deal Selection & Sort (list view)
  selectedDealIds,
  toggleDealSelect,
  toggleDealSelectAll,
  clearDealSelection,
  dealSortBy,
  dealSortOrder,
  handleDealSort,
  sortedDeals,
  hiddenByRecentCount = 0,
  handleBulkMoveDealToStage,
  handleBulkDeleteDeals,
  // Loss Reason Modal
  lossReasonModal,
  handleLossReasonConfirm,
  handleLossReasonClose,
  boardCreateOverlay,
}) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = React.useState(false);
  const bulkMoveRef = React.useRef<HTMLDivElement>(null);

  // State para quick-add por coluna
  const [createModalStageId, setCreateModalStageId] = React.useState<string | undefined>(undefined);

  const handleDealCreated = React.useCallback((dealId: string) => {
    setIsCreateModalOpen(false);
    setCreateModalStageId(undefined);
    setSelectedDealId(dealId);
  }, [setIsCreateModalOpen, setSelectedDealId]);

  const handleAddDealToStage = React.useCallback((stageId: string) => {
    setCreateModalStageId(stageId);
    setIsCreateModalOpen(true);
  }, [setIsCreateModalOpen]);

  // Close bulk move dropdown on outside click
  React.useEffect(() => {
    if (!isBulkMoveOpen) return;
    const handler = (e: MouseEvent) => {
      if (bulkMoveRef.current && !bulkMoveRef.current.contains(e.target as Node)) {
        setIsBulkMoveOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isBulkMoveOpen]);

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
          <div className="relative z-10 w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-slate-900 dark:text-white">
                  {boardCreateOverlay.title}
                </div>
                {boardCreateOverlay.subtitle && (
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {boardCreateOverlay.subtitle}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Bem-vindo ao seu CRM
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Você ainda não tem nenhum board criado. Comece criando seu primeiro fluxo de trabalho
            para organizar seus negócios.
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
          <KanbanHeader
            boards={boards}
            activeBoard={activeBoard}
            onSelectBoard={handleSelectBoard}
            onCreateBoard={() => setIsWizardOpen(true)}
            onEditBoard={handleEditBoard}
            onDeleteBoard={handleDeleteBoard}
            onExportTemplates={isAdmin ? () => setIsExportModalOpen(true) : undefined}
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            ownerFilter={ownerFilter}
            setOwnerFilter={setOwnerFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onNewDeal={() => setIsCreateModalOpen(true)}
          />

          <BoardStrategyHeader board={activeBoard} />

          {hiddenByRecentCount > 0 && (
            <div className="mx-4 mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              <span>
                {hiddenByRecentCount} negócio{hiddenByRecentCount > 1 ? 's' : ''} ganho{hiddenByRecentCount > 1 ? 's' : ''}/perdido{hiddenByRecentCount > 1 ? 's' : ''} há mais de 30 dias {hiddenByRecentCount > 1 ? 'estão ocultos' : 'está oculto'}.{' '}
                Use o filtro <strong>Ganhos</strong> ou <strong>Perdidos</strong> para visualizá-{hiddenByRecentCount > 1 ? 'los' : 'lo'}.
              </span>
            </div>
          )}

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
                onAddDealToStage={handleAddDealToStage}
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

      <CreateDealModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setCreateModalStageId(undefined); }}
        activeBoard={activeBoard}
        activeBoardId={activeBoardId ?? undefined}
        initialStageId={createModalStageId}
        onCreated={handleDealCreated}
      />

      <DealDetailModal
        dealId={selectedDealId}
        isOpen={!!selectedDealId}
        onClose={() => setSelectedDealId(null)}
      />

      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => {
          setIsCreateBoardModalOpen(false);
          setEditingBoard(null);
        }}
        onSave={editingBoard ? handleUpdateBoard : handleCreateBoard}
        editingBoard={editingBoard || undefined}
        availableBoards={boards}
        onSwitchEditingBoard={handleEditBoard}
      />

      <BoardCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreate={handleCreateBoard}
        onCreateBoardAsync={createBoardAsync}
        onUpdateBoardAsync={updateBoardAsync}
        onOpenCustomModal={() => setIsCreateBoardModalOpen(true)}
      />

      <DeleteBoardModal
        isOpen={!!boardToDelete}
        onClose={() => setBoardToDelete(null)}
        onConfirm={confirmDeleteBoard}
        boardName={boardToDelete?.name || ''}
        dealCount={boardToDelete?.dealCount || 0}
        availableBoards={availableBoardsForMove}
        selectedTargetBoardId={boardToDelete?.targetBoardId}
        onSelectTargetBoard={setTargetBoardForDelete}
      />

      <LossReasonModal
        isOpen={lossReasonModal?.isOpen ?? false}
        onClose={handleLossReasonClose}
        onConfirm={handleLossReasonConfirm}
        dealTitle={lossReasonModal?.dealTitle}
      />

      {activeBoard && (
        <ExportTemplateModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          boards={boards}
          activeBoard={activeBoard}
          onCreateBoardAsync={createBoardAsync}
        />
      )}

      {/* Bulk Actions Bar (list view only) */}
      {viewMode === 'list' && selectedDealIds.size > 0 && (
        <>
          {/* Spacer to prevent content from being hidden behind fixed bar */}
          <div className="h-16" />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 shadow-lg px-6 py-3">
            <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedDealIds.size} negocio{selectedDealIds.size !== 1 ? 's' : ''} selecionado{selectedDealIds.size !== 1 ? 's' : ''}
                </span>
                <Button
                  onClick={clearDealSelection}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <X size={14} /> Limpar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {/* Move to stage dropdown */}
                <div className="relative" ref={bulkMoveRef}>
                  <Button
                    onClick={() => setIsBulkMoveOpen(!isBulkMoveOpen)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors"
                  >
                    <ArrowRightCircle size={16} />
                    Mover para Estagio
                    <ChevronDown size={14} className={`transition-transform ${isBulkMoveOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {isBulkMoveOpen && activeBoard && (
                    <div className="absolute bottom-full mb-1 right-0 min-w-[200px] rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-lg py-1 z-50">
                      {activeBoard.stages.map(stage => (
                        <Button
                          key={stage.id}
                          variant="ghost"
                          onClick={() => {
                            handleBulkMoveDealToStage(stage.id);
                            setIsBulkMoveOpen(false);
                          }}
                          className="w-full justify-start px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors h-auto rounded-none"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color || '#94a3b8' }}
                          />
                          <span className="text-slate-700 dark:text-slate-200">{stage.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <Button
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Excluir
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Delete Confirm */}
          <ConfirmModal
            isOpen={isBulkDeleteOpen}
            onClose={() => setIsBulkDeleteOpen(false)}
            onConfirm={() => {
              handleBulkDeleteDeals();
              setIsBulkDeleteOpen(false);
            }}
            title="Excluir negocios"
            message={`Tem certeza que deseja excluir ${selectedDealIds.size} negocio${selectedDealIds.size !== 1 ? 's' : ''}? Esta acao nao pode ser desfeita.`}
            confirmText="Excluir"
            variant="danger"
          />
        </>
      )}
    </div>
  );
};
