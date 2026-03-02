import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Deal, DealView, DealItem, Contact, Board } from '@/types';
import { dealsService } from '@/lib/supabase';
import { useAuth } from '../AuthContext';
import { queryKeys, DEALS_VIEW_KEY } from '@/lib/query';
import {
  useDeals as useTanStackDealsQuery,
  useAddDealItem,
  useRemoveDealItem,
} from '@/lib/query/hooks/useDealsQuery';

interface DealsContextType {
  // Raw data (agora vem direto do TanStack Query)
  rawDeals: Deal[];
  loading: boolean;
  error: string | null;

  // CRUD Operations
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt'>) => Promise<Deal | null>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<void>;
  updateDealStatus: (id: string, newStatus: string, lossReason?: string) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;

  // Items
  addItemToDeal: (dealId: string, item: Omit<DealItem, 'id'>) => Promise<DealItem | null>;
  removeItemFromDeal: (dealId: string, itemId: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

const DealsContext = createContext<DealsContextType | undefined>(undefined);

/**
 * Componente React `DealsProvider`.
 *
 * @param {{ children: ReactNode; }} { children } - Parâmetro `{ children }`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const DealsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const addItemMutation = useAddDealItem();
  const removeItemMutation = useRemoveDealItem();

  // ============================================
  // TanStack Query como fonte única de verdade
  // ============================================
  const {
    data: rawDeals = [],
    isLoading: loading,
    error: queryError,
  } = useTanStackDealsQuery();

  // Converte erro do TanStack Query para string
  const error = queryError ? (queryError as Error).message : null;

  // Refresh = invalidar cache do TanStack Query
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
  }, [queryClient]);

  // ============================================
  // CRUD Operations - Usam service + invalidam cache
  // ============================================
  const addDeal = useCallback(
    async (deal: Omit<Deal, 'id' | 'createdAt'>): Promise<Deal | null> => {
      if (!profile) {
        console.error('Usuário não autenticado');
        return null;
      }
      const { data, error: addError } = await dealsService.create(deal);

      if (addError) {
        console.error('Erro ao criar deal:', addError.message);
        return null;
      }

      // NÃO invalidar deals aqui! O CRMContext já fez insert otimista e o Realtime
      // também adiciona ao cache. invalidateQueries causaria um refetch que poderia
      // sobrescrever o cache otimista com dados desatualizados (eventual consistency).
      // Apenas dashboard stats pode ser invalidado (não afeta deals cache)
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });

      return data;
    },
    [profile, queryClient]
  );

  const updateDeal = useCallback(async (id: string, updates: Partial<Deal>) => {
    // Snapshot para rollback limpo
    const prevView = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    const prevRaw = queryClient.getQueryData<Deal[]>(queryKeys.deals.lists());

    const applyUpdates = (deal: Deal | DealView) =>
      deal.id === id ? { ...deal, ...updates, updatedAt: new Date().toISOString() } : deal;

    // Optimistic update - atualiza ambos os caches imediatamente
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
      old.map(deal => applyUpdates(deal) as DealView)
    );
    queryClient.setQueryData<Deal[]>(queryKeys.deals.lists(), (old = []) =>
      old.map(deal => applyUpdates(deal) as Deal)
    );

    const { error: updateError } = await dealsService.update(id, updates);

    if (updateError) {
      console.error('Erro ao atualizar deal:', updateError.message);
      // Rollback: restaura snapshot
      if (prevView) queryClient.setQueryData(DEALS_VIEW_KEY, prevView);
      if (prevRaw) queryClient.setQueryData(queryKeys.deals.lists(), prevRaw);
      return;
    }

    // Sucesso: Realtime vai sincronizar. Não precisa de invalidateQueries.
  }, [queryClient]);

  const updateDealStatus = useCallback(
    async (id: string, newStatus: string, lossReason?: string) => {
      const updates: Partial<Deal> = {
        status: newStatus as Deal['status'],
        lastStageChangeDate: new Date().toISOString(),
        ...(lossReason && { lossReason }),
        ...(newStatus === 'WON' && { closedAt: new Date().toISOString(), isWon: true }),
        ...(newStatus === 'LOST' && { closedAt: new Date().toISOString(), isLost: true }),
      };

      await updateDeal(id, updates);
    },
    [updateDeal]
  );

  const deleteDeal = useCallback(async (id: string) => {
    // Optimistic update - remove da UI imediatamente
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
      old.filter(deal => deal.id !== id)
    );

    const { error: deleteError } = await dealsService.delete(id);

    if (deleteError) {
      console.error('Erro ao deletar deal:', deleteError.message);
      // Rollback: invalida para refetch em caso de erro
      await queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
      return;
    }

    // Sucesso: atualiza stats do dashboard
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
  }, [queryClient]);

  // ============================================
  // Items Operations
  // ============================================
  const addItemToDeal = useCallback(
    async (dealId: string, item: Omit<DealItem, 'id'>): Promise<DealItem | null> => {
      try {
        const result = await addItemMutation.mutateAsync({ dealId, item });
        return result.item;
      } catch {
        return null;
      }
    },
    [addItemMutation.mutateAsync]
  );

  const removeItemFromDeal = useCallback(async (dealId: string, itemId: string) => {
    try {
      await removeItemMutation.mutateAsync({ dealId, itemId });
    } catch {
      // onError da mutation já faz rollback do cache
    }
  }, [removeItemMutation.mutateAsync]);

  const value = useMemo(
    () => ({
      rawDeals,
      loading,
      error,
      addDeal,
      updateDeal,
      updateDealStatus,
      deleteDeal,
      addItemToDeal,
      removeItemFromDeal,
      refresh,
    }),
    [
      rawDeals,
      loading,
      error,
      addDeal,
      updateDeal,
      updateDealStatus,
      deleteDeal,
      addItemToDeal,
      removeItemFromDeal,
      refresh,
    ]
  );

  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>;
};

/**
 * Hook React `useDeals` que encapsula uma lógica reutilizável.
 * @returns {DealsContextType} Retorna um valor do tipo `DealsContextType`.
 */
export const useDeals = () => {
  const context = useContext(DealsContext);
  if (context === undefined) {
    throw new Error('useDeals must be used within a DealsProvider');
  }
  return context;
};

// Hook para deals com view projection (desnormalizado)
/**
 * Hook React `useDealsView` que encapsula uma lógica reutilizável.
 *
 * @param {Record<string, Contact>} contactMap - Parâmetro `contactMap`.
 * @param {Board[]} boards - Parâmetro `boards`.
 * @returns {DealView[]} Retorna um valor do tipo `DealView[]`.
 */
export const useDealsView = (
  contactMap: Record<string, Contact>,
  boards: Board[] = []
): DealView[] => {
  const { rawDeals } = useDeals();

  // Map de stageId -> stageLabel para lookup direto O(1)
  const stageLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const board of boards) {
      if (board.stages) {
        for (const stage of board.stages) {
          map.set(stage.id, stage.label);
        }
      }
    }
    return map;
  }, [boards]);

  return useMemo(() => {
    return rawDeals.map(deal => {
      // Lookups O(1) usando Maps pré-construídos
      const stageLabel = stageLabelMap.get(deal.status) || 'Desconhecido';

      return {
        ...deal,
        contactName: deal.contactId ? (contactMap[deal.contactId]?.name || 'Sem Contato') : 'Sem Contato',
        contactEmail: deal.contactId ? (contactMap[deal.contactId]?.email || '') : '',
        contactPhone: deal.contactId ? (contactMap[deal.contactId]?.phone || '') : '',
        contactTags: deal.contactId ? (contactMap[deal.contactId]?.tags || []) : [],
        contactCustomFields: deal.contactId ? (contactMap[deal.contactId]?.customFields || {}) : {},
        stageLabel,
      };
    });
  }, [rawDeals, contactMap, stageLabelMap]);
};
