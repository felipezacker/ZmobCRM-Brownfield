/**
 * TanStack Query hooks for Boards - Supabase Edition
 *
 * Features:
 * - Real Supabase API calls
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../index';
import { boardsService } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Board, BoardStage } from '@/types';

// ============ QUERY HOOKS ============

/**
 * Hook to fetch all boards
 * Waits for auth to be ready before fetching to ensure RLS works correctly
 */
export const useBoards = () => {
  const { user, loading: authLoading } = useAuth();

  return useQuery<Board[]>({
    queryKey: queryKeys.boards.lists(),
    queryFn: async () => {
      const { data, error } = await boardsService.getAll();
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - boards don't change often
    // Avoid "refetch storms" during UI focus/mount churn (especially in dev/StrictMode).
    // Updates happen via mutations + optimistic cache updates + explicit invalidations.
    refetchOnWindowFocus: false,
    // Refetch only when (a) never fetched or (b) explicitly invalidated.
    // This avoids refetch storms while still preventing "stale forever" on navigation.
    refetchOnMount: (query) => query.state.dataUpdatedAt === 0 || query.state.isInvalidated,
    refetchOnReconnect: false,
    enabled: !authLoading && !!user, // Only fetch when auth is ready
  });
};

/**
 * Hook to fetch a single board by ID
 * Derives data from the useBoards() cache via `select` — no extra network request.
 */
export const useBoard = (id: string | undefined) => {
  const { user, loading: authLoading } = useAuth();
  return useQuery<Board[], Error, Board | null>({
    queryKey: queryKeys.boards.lists(),
    queryFn: async () => {
      const { data, error } = await boardsService.getAll();
      if (error) throw error;
      return data || [];
    },
    select: (boards) => boards.find(b => b.id === id) || null,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: (query) => query.state.dataUpdatedAt === 0 || query.state.isInvalidated,
    refetchOnReconnect: false,
    enabled: !authLoading && !!user && !!id,
  });
};

/**
 * Hook to get the default board
 * Waits for auth to be ready before fetching to ensure RLS works correctly
 */
export const useDefaultBoard = () => {
  const { user, loading: authLoading } = useAuth();

  return useQuery<Board | null>({
    queryKey: [...queryKeys.boards.all, 'default'] as const,
    queryFn: async () => {
      const { data, error } = await boardsService.getAll();
      if (error) throw error;
      const chosen = (data || []).find(b => b.isDefault) || (data || [])[0] || null;
      return chosen;
    },
    // Keep it fresh-ish, but allow invalidation to force a refetch when coming back from other pages.
    staleTime: 5 * 60 * 1000,
    // Same reasoning as `useBoards`: prevent redundant refetches caused by focus/mount churn.
    refetchOnWindowFocus: false,
    // Critical: when user deleted boards elsewhere (settings), this query might be stale when the boards page mounts.
    // We want a stale query to refetch on mount so we don't show a deleted board until F5.
    refetchOnMount: (query) => query.state.dataUpdatedAt === 0 || query.state.isInvalidated,
    refetchOnReconnect: false,
    enabled: !authLoading && !!user, // Only fetch when auth is ready
  });
};

// ============ MUTATION HOOKS ============

/**
 * Hook to create a new board
 */
export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ board, order }: {
      board: Omit<Board, 'id' | 'createdAt'>;
      order?: number;
      /** Optional client-provided temp id used for optimistic insert + immediate selection */
      clientTempId?: string;
    }) => {
      const { data, error } = await boardsService.create(board, order);
      if (error) throw error;
      return data!;
    },
    onMutate: async ({ board, clientTempId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });

      const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());

      const tempId = clientTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const boardAsRecord = board as unknown as Record<string, unknown>;
      const tempBoard: Board = {
        ...boardAsRecord,
        stages: boardAsRecord?.stages ?? [],
        isDefault: boardAsRecord?.isDefault ?? false,
        id: tempId,
        createdAt: new Date().toISOString(),
      } as Board;

      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) => [tempBoard, ...old]);

      return { previousBoards, tempId };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(queryKeys.boards.lists(), context.previousBoards);
      }
    },
    onSuccess: (data, _vars, context) => {
      const tempId = (context as { tempId?: string } | undefined)?.tempId;
      if (!tempId) return;

      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) => {
        const withoutTemp = old.filter((b) => b.id !== tempId);
        const already = withoutTemp.some((b) => b.id === data.id);
        return already ? withoutTemp : [data, ...withoutTemp];
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

/**
 * Hook to update a board
 */
export const useUpdateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Board> }) => {
      const { error } = await boardsService.update(id, updates);
      if (error) throw error;
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });

      const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());

      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
        old.map(board => (board.id === id ? { ...board, ...updates } : board))
      );

      return { previousBoards };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(queryKeys.boards.lists(), context.previousBoards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

/**
 * Hook to delete a board
 */
export const useDeleteBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await boardsService.delete(id);
      if (error) throw error;
      return id;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });

      const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());

      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
        old.filter(board => board.id !== id)
      );

      return { previousBoards };
    },
    onError: (_error, _id, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(queryKeys.boards.lists(), context.previousBoards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      // Also invalidate deals since they reference boards
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
};

/**
 * Hook to delete a board after moving its deals to another board
 */
export const useDeleteBoardWithMove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, targetBoardId }: { boardId: string; targetBoardId: string }) => {
      const { error } = await boardsService.deleteWithMoveDeals(boardId, targetBoardId);
      if (error) throw error;
      return boardId;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
};

/**
 * Hook to check if a board can be deleted
 */
export const useCanDeleteBoard = (boardId: string | undefined) => {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.boards.detail(boardId || ''), 'canDelete'] as const,
    queryFn: async () => {
      if (!boardId) return { canDelete: true, dealCount: 0 };
      return await boardsService.canDelete(boardId);
    },
    enabled: !authLoading && !!user && !!boardId,
  });
};

// ============ STAGE MUTATIONS ============

/**
 * Hook to add a stage to a board
 * Optimistic: inserts a temporary stage immediately, replaces with server data on success
 */
export const useAddBoardStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, stage }: { boardId: string; stage: Omit<BoardStage, 'id'> }) => {
      const { data, error } = await boardsService.addStage(boardId, stage);
      if (error) throw error;
      return { boardId, stage: data! };
    },
    onMutate: async ({ boardId, stage }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
      const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());
      const tempId = `temp-stage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const tempStage: BoardStage = { ...stage, id: tempId, boardId } as BoardStage;
      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
        old.map(b => b.id === boardId ? { ...b, stages: [...(b.stages || []), tempStage] } : b)
      );
      return { previousBoards, tempId };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(queryKeys.boards.lists(), context.previousBoards);
      }
    },
    onSuccess: (data, _vars, context) => {
      const tempId = context?.tempId;
      if (!tempId) return;
      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
        old.map(b => b.id === data.boardId
          ? { ...b, stages: (b.stages || []).map(s => s.id === tempId ? data.stage : s) }
          : b
        )
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

/**
 * Hook to update a board stage
 * Optimistic: applies updates immediately across all boards
 */
export const useUpdateBoardStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stageId, updates }: { stageId: string; updates: Partial<BoardStage> }) => {
      const { error } = await boardsService.updateStage(stageId, updates);
      if (error) throw error;
      return { stageId, updates };
    },
    onMutate: async ({ stageId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
      const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());
      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
        old.map(b => ({
          ...b,
          stages: (b.stages || []).map(s => s.id === stageId ? { ...s, ...updates } : s),
        }))
      );
      return { previousBoards };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(queryKeys.boards.lists(), context.previousBoards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

/**
 * Hook to delete a board stage
 * Optimistic: removes stage immediately from all boards
 */
export const useDeleteBoardStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await boardsService.deleteStage(stageId);
      if (error) throw error;
      return stageId;
    },
    onMutate: async (stageId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
      const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());
      queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
        old.map(b => ({ ...b, stages: (b.stages || []).filter(s => s.id !== stageId) }))
      );
      return { previousBoards };
    },
    onError: (_error, _stageId, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(queryKeys.boards.lists(), context.previousBoards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

// ============ UTILITY HOOKS ============

/**
 * Hook to invalidate all boards queries
 */
export const useInvalidateBoards = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
};
