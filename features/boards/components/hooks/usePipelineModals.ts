import { useState, useCallback, useRef, useEffect } from 'react';

interface UsePipelineModalsParams {
  setIsCreateModalOpen: (isOpen: boolean) => void;
  setSelectedDealId: (id: string | null) => void;
}

export const usePipelineModals = ({
  setIsCreateModalOpen,
  setSelectedDealId,
}: UsePipelineModalsParams) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [createModalStageId, setCreateModalStageId] = useState<string | undefined>(undefined);
  const bulkMoveRef = useRef<HTMLDivElement>(null);

  const handleDealCreated = useCallback((dealId: string) => {
    setIsCreateModalOpen(false);
    setCreateModalStageId(undefined);
    setSelectedDealId(dealId);
  }, [setIsCreateModalOpen, setSelectedDealId]);

  const handleAddDealToStage = useCallback((stageId: string) => {
    setCreateModalStageId(stageId);
    setIsCreateModalOpen(true);
  }, [setIsCreateModalOpen]);

  // Close bulk move dropdown on outside click
  useEffect(() => {
    if (!isBulkMoveOpen) return;
    const handler = (e: MouseEvent) => {
      if (bulkMoveRef.current && !bulkMoveRef.current.contains(e.target as Node)) {
        setIsBulkMoveOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isBulkMoveOpen]);

  return {
    isExportModalOpen,
    setIsExportModalOpen,
    isBulkDeleteOpen,
    setIsBulkDeleteOpen,
    isBulkMoveOpen,
    setIsBulkMoveOpen,
    createModalStageId,
    setCreateModalStageId,
    bulkMoveRef,
    handleDealCreated,
    handleAddDealToStage,
  };
};
