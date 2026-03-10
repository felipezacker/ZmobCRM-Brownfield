import React from 'react';
import { DealDetailModal } from '@/features/boards/components/deal-detail';
import { CreateDealModal } from './Modals/CreateDealModal';
import { CreateBoardModal } from './Modals/CreateBoardModal';
import { BoardCreationWizard } from '@/features/boards/components/board-wizard';
import { DeleteBoardModal } from './Modals/DeleteBoardModal';
import { LossReasonModal } from '@/components/ui/LossReasonModal';
import { ExportTemplateModal } from './Modals/ExportTemplateModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Board, BoardStage } from '@/types';

interface PipelineModalsProps {
  // Create Deal
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (isOpen: boolean) => void;
  activeBoard: Board | null;
  activeBoardId: string | null;
  createModalStageId: string | undefined;
  setCreateModalStageId: (id: string | undefined) => void;
  handleDealCreated: (dealId: string) => void;
  // Deal Detail
  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;
  // Create Board
  isCreateBoardModalOpen: boolean;
  setIsCreateBoardModalOpen: (isOpen: boolean) => void;
  editingBoard: Board | null;
  setEditingBoard: (board: Board | null) => void;
  handleUpdateBoard: (board: Omit<Board, 'id' | 'createdAt'>) => void;
  handleCreateBoard: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => void;
  boards: Board[];
  handleEditBoard: (board: Board) => void;
  // Board Wizard
  isWizardOpen: boolean;
  setIsWizardOpen: (isOpen: boolean) => void;
  createBoardAsync?: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => Promise<Board>;
  updateBoardAsync?: (id: string, updates: Partial<Board>) => Promise<void>;
  // Delete Board
  boardToDelete: { id: string; name: string; dealCount: number; targetBoardId?: string } | null;
  setBoardToDelete: (board: { id: string; name: string; dealCount: number; targetBoardId?: string } | null) => void;
  confirmDeleteBoard: () => void;
  availableBoardsForMove: Board[];
  setTargetBoardForDelete: (targetBoardId: string) => void;
  // Loss Reason
  lossReasonModal: {
    isOpen: boolean;
    dealId: string;
    dealTitle: string;
    stageId: string;
  } | null;
  handleLossReasonConfirm: (reason: string) => void;
  handleLossReasonClose: () => void;
  // Export Template
  isExportModalOpen: boolean;
  setIsExportModalOpen: (isOpen: boolean) => void;
  // Bulk Delete
  isBulkDeleteOpen: boolean;
  setIsBulkDeleteOpen: (isOpen: boolean) => void;
  selectedDealIds: Set<string>;
  handleBulkDeleteDeals: () => void;
}

export const PipelineModals: React.FC<PipelineModalsProps> = ({
  // Create Deal
  isCreateModalOpen,
  setIsCreateModalOpen,
  activeBoard,
  activeBoardId,
  createModalStageId,
  setCreateModalStageId,
  handleDealCreated,
  // Deal Detail
  selectedDealId,
  setSelectedDealId,
  // Create Board
  isCreateBoardModalOpen,
  setIsCreateBoardModalOpen,
  editingBoard,
  setEditingBoard,
  handleUpdateBoard,
  handleCreateBoard,
  boards,
  handleEditBoard,
  // Board Wizard
  isWizardOpen,
  setIsWizardOpen,
  createBoardAsync,
  updateBoardAsync,
  // Delete Board
  boardToDelete,
  setBoardToDelete,
  confirmDeleteBoard,
  availableBoardsForMove,
  setTargetBoardForDelete,
  // Loss Reason
  lossReasonModal,
  handleLossReasonConfirm,
  handleLossReasonClose,
  // Export Template
  isExportModalOpen,
  setIsExportModalOpen,
  // Bulk Delete
  isBulkDeleteOpen,
  setIsBulkDeleteOpen,
  selectedDealIds,
  handleBulkDeleteDeals,
}) => (
  <>
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
);
