/**
 * TanStack Query hooks for Deals - Supabase Edition
 *
 * Features:
 * - Real Supabase API calls
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation
 * - Ready for Realtime integration
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, DEALS_VIEW_KEY } from '../index';
import { dealsService, contactsService, boardStagesService, activitiesService, supabase } from '@/lib/supabase';
import { createDeal as createDealAction, updateDeal as updateDealAction, deleteDeal as deleteDealAction } from '@/app/actions/deals';
import { useAuth } from '@/context/AuthContext';
import type { Deal, DealView, DealItem, Contact } from '@/types';

// ============ QUERY HOOKS ============

export interface DealsFilters {
  boardId?: string;
  /** Stage id (UUID) do board_stages */
  status?: string;
  search?: string;
  minValue?: number;
  maxValue?: number;
}

/**
 * Hook to fetch all deals with optional filters
 * Waits for auth to be ready before fetching to ensure RLS works correctly
 */
export const useDeals = (filters?: DealsFilters) => {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: filters
      ? queryKeys.deals.list(filters as Record<string, unknown>)
      : queryKeys.deals.lists(),
    queryFn: async () => {
      const { data, error } = await dealsService.getAll();
      if (error) throw error;

      let deals = data || [];

      // Apply client-side filters
      if (filters) {
        deals = deals.filter(deal => {
          if (filters.boardId && deal.boardId !== filters.boardId) return false;
          if (filters.status && deal.status !== filters.status) return false;
          if (filters.minValue && deal.value < filters.minValue) return false;
          if (filters.maxValue && deal.value > filters.maxValue) return false;
          if (filters.search) {
            const search = filters.search.toLowerCase();
            if (!(deal.title || '').toLowerCase().includes(search)) return false;
          }
          return true;
        });
      }

      return deals;
    },
    enabled: !authLoading && !!user, // Only fetch when auth is ready
    refetchOnWindowFocus: false, // Realtime handles sync — avoid overwriting optimistic updates
  });
};

/**
 * Hook to fetch all deals with enriched company/contact data (DealView)
 * Waits for auth to be ready before fetching to ensure RLS works correctly
 */
export const useDealsView = (filters?: DealsFilters) => {
  const { user, loading: authLoading } = useAuth();

  return useQuery<DealView[]>({
    queryKey: filters
      ? [...queryKeys.deals.list(filters as Record<string, unknown>), 'view']
      : [...queryKeys.deals.lists(), 'view'],
    queryFn: async () => {
      // Step 1: Fetch deals and stages first (always needed)
      const [dealsResult, stagesResult] = await Promise.all([
        dealsService.getAll(),
        boardStagesService.getAll(),
      ]);

      if (dealsResult.error) throw dealsResult.error;

      const deals = dealsResult.data || [];
      const stages = stagesResult.data || [];

      // Step 2: Extract unique IDs referenced by deals (avoid fetching unused data)
      const contactIds = deals.map(d => d.contactId).filter(Boolean);
      const ownerIds = [...new Set(deals.map(d => d.ownerId).filter(Boolean))] as string[];

      // Step 3: Fetch only referenced contacts and owner profiles in parallel
      const [contactsResult, ownersResult] = await Promise.all([
        contactsService.getByIds(contactIds),
        ownerIds.length > 0 && supabase
          ? supabase.from('profiles').select('id, first_name, last_name, email, avatar_url').in('id', ownerIds)
          : Promise.resolve({ data: [] as { id: string; first_name?: string; last_name?: string; email?: string; avatar_url?: string }[] }),
      ]);

      const contacts = contactsResult.data || [];

      // Create lookup maps
      const contactMap = new Map(contacts.map(c => [c.id, c]));
      const stageMap = new Map(stages.map(s => [s.id, s.label || s.name]));

      // Owner profile map
      const ownerMap = new Map<string, { name: string; avatar: string }>();
      for (const o of (ownersResult.data || [])) {
        ownerMap.set(o.id, {
          name: [o.first_name, o.last_name].filter(Boolean).join(' ') || o.email?.split('@')[0] || 'Sem nome',
          avatar: o.avatar_url || '',
        });
      }

      // Enrich deals with contact names, owner profiles, and stageLabel
      let enrichedDeals: DealView[] = deals.map(deal => {
        const contact = contactMap.get(deal.contactId);
        const ownerData = deal.ownerId ? ownerMap.get(deal.ownerId) : undefined;
        return {
          ...deal,
          owner: ownerData || deal.owner,
          contactName: contact?.name || 'Sem contato',
          contactEmail: contact?.email || '',
          contactPhone: contact?.phone || '',
          contactTags: contact?.tags || [],
          contactCustomFields: contact?.customFields || {},
          stageLabel: stageMap.get(deal.status) || 'Estágio não identificado',
        };
      });

      // Apply client-side filters
      if (filters) {
        enrichedDeals = enrichedDeals.filter(deal => {
          if (filters.boardId && deal.boardId !== filters.boardId) return false;
          if (filters.status && deal.status !== filters.status) return false;
          if (filters.minValue && deal.value < filters.minValue) return false;
          if (filters.maxValue && deal.value > filters.maxValue) return false;
          if (filters.search) {
            const search = filters.search.toLowerCase();
            if (!(deal.title || '').toLowerCase().includes(search))
              return false;
          }
          return true;
        });
      }

      return enrichedDeals;
    },
    enabled: !authLoading && !!user, // Only fetch when auth is ready
  });
};

/**
 * Hook to fetch a single deal by ID
 */
export const useDeal = (id: string | undefined) => {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: queryKeys.deals.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await dealsService.getById(id);
      if (error) throw error;
      return data;
    },
    enabled: !authLoading && !!user && !!id,
  });
};

/**
 * Hook to fetch deals by board (for Kanban view) - Returns DealView[]
 * 
 * IMPORTANTE: Este hook usa a MESMA query key que useDealsView para garantir
 * que todos os componentes compartilhem o mesmo cache (Single Source of Truth).
 * A filtragem por boardId é feita via `select` no cliente.
 */
export const useDealsByBoard = (boardId: string) => {
  const { user, loading: authLoading } = useAuth();
  return useQuery<DealView[], Error, DealView[]>({
    // CRÍTICO: Usar a mesma query key que useDealsView para compartilhar cache
    queryKey: [...queryKeys.deals.lists(), 'view'],
    queryFn: async () => {
      // Step 1: Fetch deals and stages first
      const [dealsResult, stagesResult] = await Promise.all([
        dealsService.getAll(),
        boardStagesService.getAll(),
      ]);

      if (dealsResult.error) throw dealsResult.error;

      const deals = dealsResult.data || [];
      const stages = stagesResult.data || [];

      // Step 2: Extract unique IDs referenced by deals
      const contactIds = deals.map(d => d.contactId).filter(Boolean);
      const ownerIds = [...new Set(deals.map(d => d.ownerId).filter(Boolean))] as string[];

      // Step 3: Fetch contacts, owner profiles, and activities in parallel
      const [contactsResult, ownersResult, activitiesResult] = await Promise.all([
        contactsService.getByIds(contactIds),
        ownerIds.length > 0 && supabase
          ? supabase.from('profiles').select('id, first_name, last_name, email, avatar_url').in('id', ownerIds)
          : Promise.resolve({ data: [] as { id: string; first_name?: string; last_name?: string; email?: string; avatar_url?: string }[] }),
        activitiesService.getAll(),
      ]);

      const contacts = contactsResult.data || [];
      const allActivities = activitiesResult.data || [];

      // Create lookup maps
      const contactMap = new Map(contacts.map(c => [c.id, c]));
      const stageMap = new Map(stages.map(s => [s.id, s.label || s.name]));

      // Owner profile map
      const ownerMap = new Map<string, { name: string; avatar: string }>();
      for (const o of (ownersResult.data || [])) {
        ownerMap.set(o.id, {
          name: [o.first_name, o.last_name].filter(Boolean).join(' ') || o.email?.split('@')[0] || 'Sem nome',
          avatar: o.avatar_url || '',
        });
      }

      // Build nextActivity map: dealId -> nearest incomplete activity
      const now = new Date();
      const nextActivityMap = new Map<string, { type: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP'; date: string; isOverdue: boolean }>();
      for (const act of allActivities) {
        if (!act.dealId || act.completed) continue;
        const actDate = new Date(act.date);
        const existing = nextActivityMap.get(act.dealId);
        if (!existing || actDate < new Date(existing.date)) {
          nextActivityMap.set(act.dealId, {
            type: act.type as 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP',
            date: act.date,
            isOverdue: actDate < now,
          });
        }
      }

      // Enrich ALL deals (filtering happens in select)
      const enrichedDeals: DealView[] = deals.map(deal => {
        const contact = contactMap.get(deal.contactId);
        const ownerData = deal.ownerId ? ownerMap.get(deal.ownerId) : undefined;
        return {
          ...deal,
          owner: ownerData || deal.owner,
          contactName: contact?.name || 'Sem contato',
          contactEmail: contact?.email || '',
          contactPhone: contact?.phone || '',
          contactTags: contact?.tags || [],
          contactCustomFields: contact?.customFields || {},
          stageLabel: stageMap.get(deal.status) || 'Estágio não identificado',
          nextActivity: nextActivityMap.get(deal.id),
        };
      });
      return enrichedDeals;
    },
    // Filtrar por boardId no cliente (compartilha cache mas retorna só os deals do board)
    select: (data) => {
      if (!boardId || boardId.startsWith('temp-')) return [];
      return data.filter(d => d.boardId === boardId);
    },
    enabled: !authLoading && !!user && !!boardId && !boardId.startsWith('temp-'),
    // Desabilitar refetch agressivo para deals — Realtime é a fonte de verdade para sync.
    // refetchOnWindowFocus causa race condition com optimistic updates (QV-1.1 regression).
    refetchOnWindowFocus: false,
  });
};

// ============ MUTATION HOOKS ============

// Input type for creating a deal (without auto-generated fields)
// isWon and isLost are optional and default to false
export type CreateDealInput = Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'isWon' | 'isLost'> & {
  isWon?: boolean;
  isLost?: boolean;
};

/**
 * Hook to create a new deal
 */
export const useCreateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: CreateDealInput) => {
      // Server Action: runs on server with authenticated Supabase client
      const fullDeal = {
        ...deal,
        isWon: deal.isWon ?? false,
        isLost: deal.isLost ?? false,
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await createDealAction(fullDeal);
      if (error) throw new Error(error);

      return data!;
    },
    onMutate: async newDeal => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.all });

      // Usa DEALS_VIEW_KEY - a única fonte de verdade
      const previousDeals = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);

      // Busca dados do contato no cache para enrichment
      const contacts = queryClient.getQueryData<Contact[]>(queryKeys.contacts.lists()) || [];
      const contact = newDeal.contactId ? contacts.find(c => c.id === newDeal.contactId) : undefined;

      const existingDeals = previousDeals || [];
      // Tenta encontrar o stageLabel nos deals existentes do mesmo board
      const siblingDeal = existingDeals.find(d => d.status === newDeal.status && d.stageLabel);

      // Optimistic update with temp ID - cria DealView enriquecido
      const tempId = `temp-${Date.now()}`;
      const tempDealView: DealView = {
        ...newDeal,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isWon: newDeal.isWon ?? false,
        isLost: newDeal.isLost ?? false,
        contactName: contact?.name || '',
        contactEmail: contact?.email || '',
        contactPhone: contact?.phone || '',
        contactTags: contact?.tags || [],
        contactCustomFields: contact?.customFields || {},
        stageLabel: siblingDeal?.stageLabel || '',
      } as DealView;

      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) => [tempDealView, ...old]);

      return { previousDeals, tempId, contact, stageLabel: siblingDeal?.stageLabel || '' };
    },
    onSuccess: (data, _variables, context) => {
      // Replace temp deal with real one from server
      const tempId = context?.tempId;
      const contact = context?.contact;
      const stageLabel = context?.stageLabel || '';

      // Enriquecer DealView com dados do contato do cache
      const dealAsView: DealView = {
        ...data,
        contactName: contact?.name || '',
        contactEmail: contact?.email || '',
        contactPhone: contact?.phone || '',
        contactTags: contact?.tags || [],
        contactCustomFields: contact?.customFields || {},
        stageLabel,
      } as DealView;

      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) => {
        if (!old) return [dealAsView];

        // Check if deal already exists (race condition: Realtime may have already added it)
        const existingIndex = old.findIndex(d => d.id === data.id);
        if (existingIndex !== -1) {
          // Deal already exists (Realtime beat us), keep the existing one (it has enriched data)
          return old;
        }

        if (tempId) {
          // Remove temp deal, add real one
          const withoutTemp = old.filter(d => d.id !== tempId);
          return [dealAsView, ...withoutTemp];
        }

        // If temp not found, just add the new one
        return [dealAsView, ...old];
      });
    },
    onError: (_error, _newDeal, context) => {
      if (context?.previousDeals) {
        // Restaura o estado anterior usando DEALS_VIEW_KEY
        queryClient.setQueryData(DEALS_VIEW_KEY, context.previousDeals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
};

/**
 * Hook to update a deal
 * Usa DEALS_VIEW_KEY como única fonte de verdade
 */
export const useUpdateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      const { error } = await updateDealAction(id, updates);
      if (error) throw new Error(error);
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.all });

      // Snapshot both caches for rollback
      const previousDeals = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
      const previousRawDeals = queryClient.getQueryData<Deal[]>(queryKeys.deals.lists());

      const applyUpdates = (deal: Deal | DealView) =>
        deal.id === id ? { ...deal, ...updates, updatedAt: new Date().toISOString() } : deal;

      // Update enriched cache (Kanban/DealCard)
      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
        old.map(deal => applyUpdates(deal) as DealView)
      );

      // Update raw cache (DealsContext → DealDetailModal)
      queryClient.setQueryData<Deal[]>(queryKeys.deals.lists(), (old = []) =>
        old.map(deal => applyUpdates(deal) as Deal)
      );

      // Update detail cache
      queryClient.setQueryData<Deal>(queryKeys.deals.detail(id), old =>
        old ? (applyUpdates(old) as Deal) : old
      );

      return { previousDeals, previousRawDeals };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(DEALS_VIEW_KEY, context.previousDeals);
      }
      if (context?.previousRawDeals) {
        queryClient.setQueryData(queryKeys.deals.lists(), context.previousRawDeals);
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(id) });
    },
  });
};

/**
 * Hook to update deal status (for drag & drop in Kanban)
 * @deprecated Use useMoveDeal instead - this hook is not used anywhere
 * Usa DEALS_VIEW_KEY como única fonte de verdade
 */
export const useUpdateDealStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      lossReason,
      isWon,
      isLost,
    }: {
      id: string;
      status: string;
      lossReason?: string;
      isWon?: boolean;
      isLost?: boolean;
    }) => {
      const updates: Partial<Deal> = {
        status,
        lastStageChangeDate: new Date().toISOString(),
        ...(lossReason && { lossReason }),
      };

      if (isWon !== undefined) {
        updates.isWon = isWon;
        if (isWon) updates.closedAt = new Date().toISOString();
      }
      if (isLost !== undefined) {
        updates.isLost = isLost;
        if (isLost) updates.closedAt = new Date().toISOString();
      }
      if (isWon === false && isLost === false) {
        updates.closedAt = null as unknown as string;
      }

      const { error } = await updateDealAction(id, updates);
      if (error) throw new Error(error);
      return { id, status, lossReason, isWon, isLost };
    },
    onMutate: async ({ id, status, lossReason, isWon, isLost }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.all });

      // Usa DEALS_VIEW_KEY - única fonte de verdade
      const previousDeals = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);

      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
        old.map(deal =>
          deal.id === id
            ? {
              ...deal,
              status,
              lastStageChangeDate: new Date().toISOString(),
              ...(lossReason && { lossReason }),
              ...(isWon !== undefined && { isWon }),
              ...(isLost !== undefined && { isLost }),
            }
            : deal
        )
      );

      return { previousDeals };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(DEALS_VIEW_KEY, context.previousDeals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
};

/**
 * Hook to delete a deal
 * Usa DEALS_VIEW_KEY como única fonte de verdade
 */
export const useDeleteDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteDealAction(id);
      if (error) throw new Error(error);
      return id;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.all });

      // Usa DEALS_VIEW_KEY - a única fonte de verdade
      const previousDeals = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);

      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
        old.filter(deal => deal.id !== id)
      );

      return { previousDeals };
    },
    onError: (_error, _id, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(DEALS_VIEW_KEY, context.previousDeals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
};

// ============ DEAL ITEMS MUTATIONS ============

/**
 * Hook to add an item to a deal
 * Usa DEALS_VIEW_KEY para optimistic update no Kanban
 */
export const useAddDealItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, item }: { dealId: string; item: Omit<DealItem, 'id'> }) => {
      const { data, error } = await dealsService.addItem(dealId, item);
      if (error) throw error;
      return { dealId, item: data! };
    },
    onMutate: async ({ dealId, item }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.all });
      const previousDeals = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
      const previousRawDeals = queryClient.getQueryData<Deal[]>(queryKeys.deals.lists());

      const tempItem: DealItem = { id: `temp-item-${Date.now()}`, ...item };

      const addItem = (deal: Deal | DealView) => {
        if (deal.id !== dealId) return deal;
        const items = [...(deal.items || []), tempItem];
        const value = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
        return { ...deal, items, value, updatedAt: new Date().toISOString() };
      };

      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
        old.map(deal => addItem(deal) as DealView)
      );
      queryClient.setQueryData<Deal[]>(queryKeys.deals.lists(), (old = []) =>
        old.map(deal => addItem(deal) as Deal)
      );

      return { previousDeals, previousRawDeals };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(DEALS_VIEW_KEY, context.previousDeals);
      }
      if (context?.previousRawDeals) {
        queryClient.setQueryData(queryKeys.deals.lists(), context.previousRawDeals);
      }
    },
    onSuccess: ({ dealId, item }, _variables) => {
      // Substituir item temporário pelo item real retornado do servidor e recalcular valor
      const replaceTemp = (deal: Deal | DealView) => {
        if (deal.id !== dealId) return deal;
        const items = (deal.items || []).map(i =>
          i.id.startsWith('temp-item-') ? item : i
        );
        const newValue = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
        return { ...deal, items, value: newValue };
      };
      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
        old.map(deal => replaceTemp(deal) as DealView)
      );
      queryClient.setQueryData<Deal[]>(queryKeys.deals.lists(), (old = []) =>
        old.map(deal => replaceTemp(deal) as Deal)
      );
    },
    onSettled: (_data, _error, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) });
    },
  });
};

/**
 * Hook to remove an item from a deal
 * Usa DEALS_VIEW_KEY para optimistic update no Kanban
 */
export const useRemoveDealItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, itemId }: { dealId: string; itemId: string }) => {
      const { error } = await dealsService.removeItem(dealId, itemId);
      if (error) throw error;
      return { dealId, itemId };
    },
    onMutate: async ({ dealId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.all });
      const previousDeals = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
      const previousRawDeals = queryClient.getQueryData<Deal[]>(queryKeys.deals.lists());

      const removeItem = (deal: Deal | DealView) => {
        if (deal.id !== dealId) return deal;
        const items = (deal.items || []).filter(i => i.id !== itemId);
        const value = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
        return { ...deal, items, value, updatedAt: new Date().toISOString() };
      };

      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
        old.map(deal => removeItem(deal) as DealView)
      );
      queryClient.setQueryData<Deal[]>(queryKeys.deals.lists(), (old = []) =>
        old.map(deal => removeItem(deal) as Deal)
      );

      return { previousDeals, previousRawDeals };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(DEALS_VIEW_KEY, context.previousDeals);
      }
      if (context?.previousRawDeals) {
        queryClient.setQueryData(queryKeys.deals.lists(), context.previousRawDeals);
      }
    },
    onSuccess: ({ dealId }, _variables) => {
      // Recalcular valor do deal após remoção de item em ambos os caches
      const recalcValue = (deal: Deal | DealView) => {
        if (deal.id !== dealId) return deal;
        const newValue = (deal.items || []).reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
        return { ...deal, value: newValue };
      };
      queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, (old = []) =>
        old.map(deal => recalcValue(deal) as DealView)
      );
      queryClient.setQueryData<Deal[]>(queryKeys.deals.lists(), (old = []) =>
        old.map(deal => recalcValue(deal) as Deal)
      );
    },
    onSettled: (_data, _error, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) });
    },
  });
};

// ============ UTILITY HOOKS ============

/**
 * Hook to invalidate all deals queries (useful after bulk operations)
 */
export const useInvalidateDeals = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
};

/**
 * Hook to prefetch a deal (for hover previews)
 */
export const usePrefetchDeal = () => {
  const queryClient = useQueryClient();
  return async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.deals.detail(id),
      queryFn: async () => {
        const { data, error } = await dealsService.getById(id);
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
};
