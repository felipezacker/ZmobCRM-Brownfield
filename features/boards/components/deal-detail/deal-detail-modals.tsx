import React from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { LossReasonModal } from '@/components/ui/LossReasonModal';
import { ActivityFormModal } from '@/features/activities/components/ActivityFormModal';
import type { DealDetailModalsProps } from '@/features/boards/components/deal-detail/types';

export const DealDetailModals: React.FC<DealDetailModalsProps> = ({
  deal,
  deals,
  dealBoard,
  deleteId,
  showLossReasonModal,
  lossReasonOrigin,
  pendingLostStageId,
  isActivityFormOpen,
  editingActivity,
  activityFormData,
  onCloseDelete,
  onConfirmDelete,
  onCloseLossReason,
  onConfirmLossReason,
  onCloseActivityForm,
  onSubmitActivityForm,
  onSetActivityFormData,
  onClose,
  moveDeal,
  updateDeal,
}) => {
  return (
    <>
      <ActivityFormModal
        isOpen={isActivityFormOpen}
        onClose={onCloseActivityForm}
        onSubmit={onSubmitActivityForm}
        formData={activityFormData}
        setFormData={onSetActivityFormData}
        editingActivity={editingActivity}
        deals={deals}
      />

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title="Excluir Negocio"
        message="Tem certeza que deseja excluir este negocio? Esta acao nao pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />

      <LossReasonModal
        isOpen={showLossReasonModal}
        onClose={onCloseLossReason}
        onConfirm={(reason) => {
          // Priority:
          // 0. Stay in stage flag (Archive)
          // 1. Pending Stage (if set via click or explicit button)
          // 2. Explicit Lost Stage on Board
          // 3. Stage linked to 'OTHER' lifecycle

          if (dealBoard?.lostStayInStage) {
            moveDeal(deal, deal.status, reason, false, true); // explicitLost = true
            onCloseLossReason();
            if (lossReasonOrigin === 'button') onClose();
            return;
          }

          let targetStageId = pendingLostStageId;

          if (!targetStageId && dealBoard?.lostStageId) {
            targetStageId = dealBoard.lostStageId;
          }

          if (!targetStageId) {
            targetStageId =
              dealBoard?.stages.find(s => s.linkedLifecycleStage === 'OTHER')?.id ?? null;
          }

          if (targetStageId) {
            moveDeal(deal, targetStageId, reason);
          } else {
            // Fallback: just mark as lost without moving
            updateDeal(deal.id, { isLost: true, isWon: false, closedAt: new Date().toISOString(), lossReason: reason });
          }
          onCloseLossReason();
          // Only close the deal modal if it was triggered via the "PERDIDO" button
          if (lossReasonOrigin === 'button') onClose();
        }}
        dealTitle={deal.title}
      />
    </>
  );
};
