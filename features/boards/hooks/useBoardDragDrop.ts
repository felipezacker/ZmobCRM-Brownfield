import React, { useState, useRef } from 'react';
import { DealView, Board, LifecycleStage } from '@/types';
import { useMoveDeal } from '@/lib/query/hooks/useMoveDeal';
import { useDeleteDeal } from '@/lib/query/hooks/useDealsQuery';
import { useCreateActivity } from '@/lib/query/hooks/useActivitiesQuery';

interface UseBoardDragDropParams {
  deals: DealView[];
  activeBoard: Board | null;
  lifecycleStages: LifecycleStage[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;
}

export const useBoardDragDrop = ({
  deals, activeBoard, lifecycleStages, addToast, selectedDealId, setSelectedDealId,
}: UseBoardDragDropParams) => {
  const moveDealMutation = useMoveDeal();
  const deleteDealMutation = useDeleteDeal();
  const createActivityMutation = useCreateActivity();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lossReasonModal, setLossReasonModal] = useState<{
    isOpen: boolean; dealId: string; dealTitle: string; stageId: string;
  } | null>(null);
  const lastMouseDownDealId = useRef<string | null>(null);

  const setLastMouseDownDealId = (id: string | null) => {
    lastMouseDownDealId.current = id;
  };

  const handleDragStart = (e: React.DragEvent, id: string, title: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('dealId', id);
    e.dataTransfer.setData('dealTitle', title || '');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId') || lastMouseDownDealId.current;
    const dealTitle = e.dataTransfer.getData('dealTitle') || '';
    if (dealId && activeBoard) {
      let deal = deals.find(d => d.id === dealId);
      if (!deal && dealTitle) {
        const candidates = deals.filter(d => (d.title || '') === dealTitle);
        if (candidates.length === 1) deal = candidates[0];
        else if (candidates.length > 1) {
          addToast('Não foi possível mover: existem múltiplos negócios com o mesmo título. Aguarde salvar e tente novamente.', 'info');
        }
      }
      if (!deal) { setDraggingId(null); return; }
      if (deal.id.startsWith('temp-')) {
        addToast('Aguarde o negócio salvar para mover (1s) e tente novamente.', 'info');
        setDraggingId(null);
        return;
      }
      const targetStage = activeBoard.stages.find(s => s.id === stageId);
      if (targetStage?.linkedLifecycleStage === 'OTHER') {
        setLossReasonModal({ isOpen: true, dealId, dealTitle: deal.title, stageId });
      } else {
        moveDealMutation.mutate({ dealId, targetStageId: stageId, deal, board: activeBoard, lifecycleStages });
      }
    }
    setDraggingId(null);
  };

  const handleLossReasonConfirm = (reason: string) => {
    if (lossReasonModal && activeBoard) {
      const deal = deals.find(d => d.id === lossReasonModal.dealId);
      if (deal) {
        moveDealMutation.mutate({
          dealId: lossReasonModal.dealId, targetStageId: lossReasonModal.stageId,
          lossReason: reason, deal, board: activeBoard, lifecycleStages,
        });
      }
      setLossReasonModal(null);
    }
  };

  const handleLossReasonClose = () => setLossReasonModal(null);

  const handleMoveDealToStage = (dealId: string, newStageId: string) => {
    if (!activeBoard) return;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    if (deal.id.startsWith('temp-')) {
      addToast('Aguarde o negócio salvar para mover (1s) e tente novamente.', 'info');
      return;
    }
    const targetStage = activeBoard.stages.find(s => s.id === newStageId);
    if (targetStage?.linkedLifecycleStage === 'OTHER') {
      setLossReasonModal({ isOpen: true, dealId, dealTitle: deal.title, stageId: newStageId });
    } else {
      moveDealMutation.mutate({ dealId, targetStageId: newStageId, deal, board: activeBoard, lifecycleStages });
    }
  };

  const handleQuickAddActivity = (
    dealId: string, type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP', dealTitle: string,
  ) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const titles = { CALL: 'Ligar para Cliente', MEETING: 'Reunião de Acompanhamento', EMAIL: 'Enviar Email de Follow-up', WHATSAPP: 'Enviar WhatsApp' };
    createActivityMutation.mutate({ activity: {
      dealId, dealTitle, type, title: titles[type],
      description: 'Agendado via Acesso Rápido', date: tomorrow.toISOString(),
      completed: false, user: { name: 'Eu', avatar: '' },
    } }, {});
  };

  const handleWinDeal = (dealId: string) => {
    if (!activeBoard?.wonStageId) {
      addToast('Este board não tem estágio de ganho configurado', 'info');
      return;
    }
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    moveDealMutation.mutate({
      dealId, targetStageId: activeBoard.wonStageId, deal, board: activeBoard, lifecycleStages,
    });
  };

  const handleLoseDeal = (dealId: string, dealTitle: string) => {
    if (!activeBoard?.lostStageId) {
      addToast('Este board não tem estágio de perda configurado', 'info');
      return;
    }
    setLossReasonModal({ isOpen: true, dealId, dealTitle, stageId: activeBoard.lostStageId });
  };

  const handleDeleteDeal = (dealId: string) => {
    deleteDealMutation.mutate(dealId, {
      onSuccess: () => {
        addToast('Negócio excluído', 'success');
        if (selectedDealId === dealId) setSelectedDealId(null);
      },
      onError: (error: Error) => addToast(error.message || 'Erro ao excluir negócio', 'error'),
    });
  };

  return {
    draggingId, setLastMouseDownDealId,
    handleDragStart, handleDragOver, handleDrop,
    handleMoveDealToStage, handleQuickAddActivity,
    handleWinDeal, handleLoseDeal, handleDeleteDeal,
    lossReasonModal, handleLossReasonConfirm, handleLossReasonClose,
  };
};
