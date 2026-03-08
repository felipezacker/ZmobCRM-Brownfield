import { useState, useMemo } from 'react';
import { Board } from '@/types';
import {
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
  useDeleteBoardWithMove,
} from '@/lib/query/hooks/useBoardsQuery';

interface UseBoardCRUDParams {
  boards: Board[];
  activeBoard: Board | null;
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  defaultBoard: Board | null | undefined;
  addToast: (msg: string, type: any) => void;
}

const makeTempId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `temp-${crypto.randomUUID()}`;
    }
  } catch { /* ignore */ }
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const useBoardCRUD = ({
  boards, activeBoard, activeBoardId, setActiveBoardId, defaultBoard, addToast,
}: UseBoardCRUDParams) => {
  const createBoardMutation = useCreateBoard();
  const updateBoardMutation = useUpdateBoard();
  const deleteBoardMutation = useDeleteBoard();
  const deleteBoardWithMoveMutation = useDeleteBoardWithMove();

  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [boardCreateOverlay, setBoardCreateOverlay] = useState<{
    title: string; subtitle?: string;
  } | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<{
    id: string; name: string; dealCount: number; targetBoardId?: string;
  } | null>(null);

  const handleCreateBoard = async (boardData: Omit<Board, 'id' | 'createdAt'>, order?: number) => {
    const previousActiveBoardId = activeBoard?.id || activeBoardId || null;
    const tempId = makeTempId();
    setActiveBoardId(tempId);
    setBoardCreateOverlay({
      title: 'Criando board…',
      subtitle: boardData?.name ? `— ${boardData.name}` : undefined,
    });
    createBoardMutation.mutate({ board: boardData, order, clientTempId: tempId }, {
      onSuccess: newBoard => {
        try { sessionStorage.removeItem('createBoardDraft.v1'); } catch { /* noop */ }
        if (newBoard) setActiveBoardId(newBoard.id);
        setBoardCreateOverlay(null);
        setIsCreateBoardModalOpen(false);
        setIsWizardOpen(false);
      },
      onError: (error) => {
        console.error('[handleCreateBoard] Error:', error);
        addToast(error.message || 'Erro ao criar board', 'error');
        setBoardCreateOverlay(null);
        if (previousActiveBoardId) setActiveBoardId(previousActiveBoardId);
        setIsCreateBoardModalOpen(true);
      },
    });
  };

  const createBoardAsync = async (boardData: Omit<Board, 'id' | 'createdAt'>, order?: number) => {
    const previousActiveBoardId = activeBoard?.id || activeBoardId || null;
    try {
      const tempId = makeTempId();
      setActiveBoardId(tempId);
      const newBoard = await createBoardMutation.mutateAsync({ board: boardData, order, clientTempId: tempId });
      setActiveBoardId(newBoard.id);
      return newBoard;
    } catch (error) {
      const err = error as Error;
      console.error('[createBoardAsync] Error:', err);
      addToast(err.message || 'Erro ao criar board', 'error');
      if (previousActiveBoardId) setActiveBoardId(previousActiveBoardId);
      throw err;
    }
  };

  const updateBoardAsync = async (id: string, updates: Partial<Board>) => {
    try { await updateBoardMutation.mutateAsync({ id, updates }); }
    catch (error) {
      const err = error as Error;
      addToast(err.message || 'Erro ao atualizar board', 'error');
      throw err;
    }
  };

  const handleEditBoard = (board: Board) => { setEditingBoard(board); setIsCreateBoardModalOpen(true); };

  const handleUpdateBoard = (boardData: Omit<Board, 'id' | 'createdAt'>) => {
    if (!editingBoard) return;
    const { name, description, nextBoardId, linkedLifecycleStage, wonStageId, lostStageId, stages } = boardData;
    updateBoardMutation.mutate(
      { id: editingBoard.id, updates: { name, description, nextBoardId, linkedLifecycleStage, wonStageId, lostStageId, stages } },
      { onSuccess: () => { setEditingBoard(null); setIsCreateBoardModalOpen(false); } }
    );
  };

  const handleDeleteBoard = async (boardId: string) => {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    const result = await import('@/lib/supabase/boards').then(m =>
      m.boardsService.canDelete(boardId)
    );
    setBoardToDelete({ id: boardId, name: board.name, dealCount: result.dealCount ?? 0 });
  };

  const confirmDeleteBoard = async () => {
    if (!boardToDelete) return;
    const { targetBoardId } = boardToDelete;
    const onDeleted = (msg: string, newActiveId?: string) => {
      addToast(msg, 'success');
      if (newActiveId) setActiveBoardId(newActiveId);
      else if (boardToDelete.id === activeBoardId && defaultBoard && defaultBoard.id !== boardToDelete.id) {
        setActiveBoardId(defaultBoard.id);
      }
      setBoardToDelete(null);
    };
    const onError = (error: Error) => {
      addToast(error.message || 'Erro ao excluir board', 'error');
      setBoardToDelete(null);
    };

    if (targetBoardId === '__DELETE__') {
      try {
        const { dealsService } = await import('@/lib/supabase/deals');
        const { error } = await dealsService.deleteByBoardId(boardToDelete.id);
        if (error) { addToast('Erro ao excluir negócios: ' + error.message, 'error'); return; }
        deleteBoardMutation.mutate(boardToDelete.id, {
          onSuccess: () => onDeleted(`Board "${boardToDelete.name}" e seus negócios foram excluídos`),
          onError,
        });
      } catch { addToast('Erro inesperado ao excluir', 'error'); setBoardToDelete(null); }
      return;
    }

    if (boardToDelete.dealCount > 0 && targetBoardId) {
      deleteBoardWithMoveMutation.mutate(
        { boardId: boardToDelete.id, targetBoardId },
        {
          onSuccess: () => onDeleted(
            `Board "${boardToDelete.name}" excluído! Negócios movidos com sucesso.`,
            boardToDelete.id === activeBoardId ? targetBoardId : undefined
          ),
          onError,
        }
      );
      return;
    }

    deleteBoardMutation.mutate(boardToDelete.id, {
      onSuccess: () => onDeleted(`Board "${boardToDelete.name}" excluído com sucesso`),
      onError,
    });
  };

  const setTargetBoardForDelete = (targetBoardId: string) => {
    if (boardToDelete) setBoardToDelete({ ...boardToDelete, targetBoardId });
  };

  const availableBoardsForMove = useMemo(() => {
    if (!boardToDelete) return [];
    return boards.filter(b => b.id !== boardToDelete.id);
  }, [boards, boardToDelete]);

  return {
    handleCreateBoard, createBoardAsync, updateBoardAsync,
    handleEditBoard, handleUpdateBoard,
    handleDeleteBoard, confirmDeleteBoard,
    boardToDelete, setBoardToDelete, setTargetBoardForDelete, availableBoardsForMove,
    isCreateBoardModalOpen, setIsCreateBoardModalOpen,
    isWizardOpen, setIsWizardOpen,
    editingBoard, setEditingBoard,
    boardCreateOverlay,
  };
};
