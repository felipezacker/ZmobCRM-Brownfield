/**
 * Supabase Realtime Sync Hook
 *
 * Provides real-time synchronization for multi-user scenarios.
 * When one user makes changes, all other users see updates instantly.
 *
 * Usage:
 *   useRealtimeSync('deals');  // Subscribe to deals table changes
 *   useRealtimeSync(['deals', 'activities']);  // Multiple tables
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryKeys, DEALS_VIEW_KEY } from '@/lib/query/queryKeys';
import type { DealView } from '@/types';

// Enable detailed Realtime logging in development or when DEBUG_REALTIME env var is set
const DEBUG_REALTIME = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true';

// Global deduplication for INSERT events - prevents multiple hook instances from processing the same event
// Key format: `${table}-${id}-${updatedAt}`
// Using Map with timestamp to handle TTL and atomic check-and-set
const processedInserts = new Map<string, number>();
const PROCESSED_CACHE_TTL = 5000; // 5 seconds TTL for processed events

// Atomic check-and-set for deduplication
function shouldProcessInsert(key: string): boolean {
  const now = Date.now();
  
  // Clean up old entries
  for (const [k, timestamp] of processedInserts) {
    if (now - timestamp > PROCESSED_CACHE_TTL) {
      processedInserts.delete(k);
    }
  }
  
  // Check if already processed
  if (processedInserts.has(key)) {
    return false;
  }
  
  // Mark as processed immediately (atomic in single-threaded JS)
  processedInserts.set(key, now);
  return true;
}

// Tables that support realtime sync
type RealtimeTable =
  | 'deals'
  | 'contacts'
  | 'activities'
  | 'boards'
  | 'board_stages'
  | 'prospecting_queues'
  | 'prospecting_saved_queues'
  | 'prospecting_daily_goals'
  | 'organization_settings'

// Lazy getter for query keys mapping - avoids initialization issues in tests
const getTableQueryKeys = (table: RealtimeTable): readonly (readonly unknown[])[] => {
  const mapping: Record<RealtimeTable, readonly (readonly unknown[])[]> = {
    deals: [queryKeys.deals.all, queryKeys.dashboard.stats],
    contacts: [queryKeys.contacts.all],
    activities: [queryKeys.activities.all, queryKeys.prospectingMetrics.all],
    boards: [queryKeys.boards.all],
    board_stages: [queryKeys.boards.all], // stages invalidate boards
    prospecting_queues: [queryKeys.prospectingQueue.all],
    prospecting_saved_queues: [queryKeys.savedQueues.all],
    prospecting_daily_goals: [queryKeys.dailyGoals.all],
    organization_settings: [['settings'] as const],
  };
  return mapping[table];
};

interface UseRealtimeSyncOptions {
  /** Whether sync is enabled (default: true) */
  enabled?: boolean;
  /** Debounce invalidation to avoid rapid updates (ms) */
  debounceMs?: number;
  /** Callback when a change is received */
  onchange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

/**
 * Subscribe to realtime changes on one or more tables
 */
export function useRealtimeSync(
  tables: RealtimeTable | RealtimeTable[],
  options: UseRealtimeSyncOptions = {}
) {
  const { enabled = true, debounceMs = 100, onchange } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInvalidationsRef = useRef<Set<readonly unknown[]>>(new Set());
  const pendingInvalidateOnlyRef = useRef<Set<readonly unknown[]>>(new Set());
  // Track bursty board_stages INSERTs (creating a board inserts multiple stages).
  // We'll refetch on single INSERT (realtime stage created by someone else),
  // but avoid storms on bursts (treat burst as invalidate-only).
  const pendingBoardStagesInsertCountRef = useRef(0);
  const flushScheduledRef = useRef(false);
  const onchangeRef = useRef(onchange);
  
  // Keep callback ref up to date without causing re-renders
  useEffect(() => {
    onchangeRef.current = onchange;
  }, [onchange]);

  // Stable serialization of tables param — avoids resubscription when caller
  // passes a new array literal with identical content each render.
  const tablesKey = JSON.stringify(tables);

  useEffect(() => {
    if (!enabled) return;

    const sb = supabase;
    if (!sb) {
      console.warn('[Realtime] Supabase client not available');
      return;
    }

    const tableList: RealtimeTable[] = JSON.parse(tablesKey);
    const channelName = `realtime-sync-${tableList.join('-')}`;

    // Cleanup existing channel if any
    if (channelRef.current) {
      if (DEBUG_REALTIME) {
        console.log(`[Realtime] Cleaning up existing channel: ${channelName}`);
      }
      sb.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create channel
    // Note: Supabase Realtime handles reconnection automatically
    const channel = sb.channel(channelName);

    // Subscribe to each table
    tableList.forEach(table => {
      channel.on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (DEBUG_REALTIME) {
            console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          }

          // Call custom callback (if provided)
          onchangeRef.current?.(payload);

          // Queue query keys for invalidation (lazy loaded)
          const keys = getTableQueryKeys(table);
          // NOTE: `board_stages` INSERTs happen in bursts when creating a board (one per stage).
          // Refetching boards on each stage INSERT causes a request storm.
          // For that specific case, we can refetch on a single INSERT (true realtime),
          // but treat bursts as invalidate-only and let the board create mutation handle timing.
          if (payload.eventType === 'INSERT' && table === 'board_stages') {
            keys.forEach(key => pendingInvalidateOnlyRef.current.add(key));
            pendingBoardStagesInsertCountRef.current += 1;
          } else {
            keys.forEach(key => pendingInvalidationsRef.current.add(key));
          }

          // INSERT events can happen in bursts (ex.: creating a board inserts multiple board_stages).
          // Instead of refetching per-row, batch within the same tick using a microtask.
          // This keeps UI instant (optimistic updates handle UX) while preventing refetch storms.
          if (payload.eventType === 'INSERT') {
            // SPECIAL HANDLING FOR DEALS INSERT:
            // Instead of invalidating (which causes refetch that removes temp deal),
            // add the deal directly to the cache. This prevents the "flash and disappear" bug.
            if (table === 'deals') {
              const newData = payload.new as Record<string, unknown>;
              const dealId = newData.id as string;
              const updatedAt = newData.updated_at as string;
              
              // Deduplication: prevent multiple hook instances from processing the same INSERT
              const dedupeKey = `deals-${dealId}-${updatedAt}`;
              if (!shouldProcessInsert(dedupeKey)) {
                return; // Skip this event, already processed by another hook instance
              }

              // Normalize snake_case to camelCase for cache compatibility
              const normalizedDeal: Record<string, unknown> = { ...newData };
              if (newData.stage_id !== undefined) {
                normalizedDeal.status = newData.stage_id;
                delete normalizedDeal.stage_id;
              }
              if (newData.updated_at !== undefined) {
                normalizedDeal.updatedAt = newData.updated_at;
                delete normalizedDeal.updated_at;
              }
              if (newData.created_at !== undefined) {
                normalizedDeal.createdAt = newData.created_at;
                delete normalizedDeal.created_at;
              }
              if (newData.is_won !== undefined) {
                normalizedDeal.isWon = newData.is_won;
                delete normalizedDeal.is_won;
              }
              if (newData.is_lost !== undefined) {
                normalizedDeal.isLost = newData.is_lost;
                delete normalizedDeal.is_lost;
              }
              if (newData.board_id !== undefined) {
                normalizedDeal.boardId = newData.board_id;
                delete normalizedDeal.board_id;
              }
              if (newData.contact_id !== undefined) {
                normalizedDeal.contactId = newData.contact_id;
                delete normalizedDeal.contact_id;
              }
              if (newData.closed_at !== undefined) {
                normalizedDeal.closedAt = newData.closed_at;
                delete normalizedDeal.closed_at;
              }
              if (newData.last_stage_change_date !== undefined) {
                normalizedDeal.lastStageChangeDate = newData.last_stage_change_date;
                delete normalizedDeal.last_stage_change_date;
              }
              if (newData.organization_id !== undefined) {
                normalizedDeal.organizationId = newData.organization_id;
                delete normalizedDeal.organization_id;
              }
              if (newData.loss_reason !== undefined) {
                normalizedDeal.lossReason = newData.loss_reason;
                delete normalizedDeal.loss_reason;
              }

              // CRÍTICO: Atualizar APENAS DEALS_VIEW_KEY (única fonte de verdade)
              // O Kanban (useDealsByBoard) agora usa essa mesma query com filtragem client-side
              // NÃO usar setQueriesData com prefix matcher - isso atualiza queries erradas!
              queryClient.setQueryData<DealView[]>(
                DEALS_VIEW_KEY,
                (old) => {
                  if (!old || !Array.isArray(old)) return old;
                  
                  // Check if deal already exists (by real ID)
                  const existingIndex = old.findIndex((d) => d.id === dealId);
                  if (existingIndex !== -1) {
                    // Deal already exists, update it
                    return old.map((d, i) => i === existingIndex ? { ...d, ...normalizedDeal } as DealView : d);
                  }
                  
                  // Capture temp deal before removing to preserve enriched fields
                  // (e.g. contactName) that aren't in the raw DB Realtime payload
                  const tempDeal = old.find((d) => {
                    const isTemp = typeof d.id === 'string' && d.id.startsWith('temp-');
                    const sameTitle = d.title === newData.title;
                    return isTemp && sameTitle;
                  });

                  // Remove any temp deals with same title (they are placeholders for this deal)
                  const tempDealsRemoved = old.filter((d) => {
                    const isTemp = typeof d.id === 'string' && d.id.startsWith('temp-');
                    const sameTitle = d.title === newData.title;
                    return !(isTemp && sameTitle);
                  });

                  // Enrich raw deal with fields preserved from temp (contactName, etc.)
                  // useCRMActions will also enrich later, but this covers the race window
                  const enrichedDeal = tempDeal
                    ? {
                        contactName: tempDeal.contactName,
                        contactEmail: tempDeal.contactEmail,
                        contactPhone: tempDeal.contactPhone,
                        ...normalizedDeal,
                      }
                    : normalizedDeal;

                  // Add new deal at the beginning
                  return [enrichedDeal as unknown as DealView, ...tempDealsRemoved];
                }
              );
              
              // Don't invalidate for deals INSERT - we've added it directly
              return;
            }
            
            if (!flushScheduledRef.current) {
              flushScheduledRef.current = true;
              queueMicrotask(() => {
                flushScheduledRef.current = false;

                const keysToFlush = Array.from(pendingInvalidationsRef.current);
                pendingInvalidationsRef.current.clear();
                const keysInvalidateOnly = Array.from(pendingInvalidateOnlyRef.current);
                pendingInvalidateOnlyRef.current.clear();
                const boardStagesInsertCount = pendingBoardStagesInsertCountRef.current;
                pendingBoardStagesInsertCountRef.current = 0;

                keysToFlush.forEach((queryKey) => {
                  queryClient.invalidateQueries({
                    queryKey,
                    exact: false,
                    refetchType: 'all',
                  });
                });

                // For bursty INSERT sources (ex.: board_stages create-board burst),
                // invalidate-only (no refetch) to avoid storms. But for single INSERT, refetch to keep realtime UX.
                keysInvalidateOnly.forEach((queryKey) => {
                  queryClient.invalidateQueries({
                    queryKey,
                    exact: false,
                    refetchType: boardStagesInsertCount <= 1 ? 'all' : 'none',
                  });
                });
              });
            }
          } else {
            // For deals UPDATE: apply directly to cache to avoid race condition with optimistic updates
            // When user moves a deal:
            // 1. Optimistic update moves it visually
            // 2. Server confirms
            // 3. Realtime UPDATE arrives
            // If we invalidate here, we might refetch stale data and the deal "jumps back"
            // Instead, apply the update directly to cache
            if (payload.eventType === 'UPDATE' && table === 'deals') {
              const newData = payload.new as Record<string, unknown>;
              const oldData = payload.old as Record<string, unknown>;
              const dealId = newData.id as string;
              // CRITICAL: Realtime sends stage_id as the source of truth for deal stage.
              // The `status` field in Realtime payload may be stale/incorrect.
              // Always prioritize stage_id over status!
              const incomingStatus = typeof newData.stage_id === 'string' ? newData.stage_id : 
                                    typeof newData.status === 'string' ? newData.status : null;
              const payloadOldStatus = typeof oldData.stage_id === 'string' ? oldData.stage_id :
                                       typeof oldData.status === 'string' ? oldData.status : null;

              // Apply update directly to DEALS_VIEW_KEY (única fonte de verdade)
              // This avoids race condition where invalidation refetches stale data
              // IMPORTANT: Only apply if the incoming status is different from current cache status
              // This prevents Realtime from reverting optimistic updates with stale data
              queryClient.setQueryData<DealView[]>(
                DEALS_VIEW_KEY,
                (old) => {
                  if (!old || !Array.isArray(old)) {
                    return old;
                  }
                  
                  // Find the deal in cache first to check current status
                  const currentDeal = old.find((d) => d.id === dealId);
                  const currentStatus = currentDeal && typeof currentDeal.status === 'string' ? currentDeal.status : null;
                  
                  // If deal not found in cache, apply the update (it might be a new deal or from another tab)
                  if (!currentDeal) {
                    // Add the deal to cache (this can happen if deal was created in another tab)
                    return [...old, newData as unknown as DealView];
                  }
                  
                  // Guard: When status hasn't changed, still merge non-status fields
                  // (owner_id, value, title, etc.) if the incoming timestamp is newer.
                  // This enables cross-tab sync for changes that don't affect stage.
                  if (currentStatus && incomingStatus && currentStatus === incomingStatus) {
                    const incomingTs = (newData.updated_at || newData.updatedAt) as string | undefined;
                    const currentTs = currentDeal.updatedAt || (currentDeal as unknown as Record<string, unknown>).updated_at as string | undefined;
                    const incomingMs = typeof incomingTs === 'string' ? new Date(incomingTs).getTime() : 0;
                    const currentMs = typeof currentTs === 'string' ? new Date(currentTs).getTime() : 0;

                    // Only skip if incoming is significantly older (stale payload)
                    if (incomingMs > 0 && currentMs > 0 && incomingMs < currentMs - 100) {
                      return old; // Stale update, skip
                    }
                    // Otherwise fall through to merge non-status fields below
                  }
                  
                  // Guard: If current status is different from incoming, check if this is a stale update
                  // This prevents Realtime from reverting optimistic updates
                  // CRITICAL: When status differs, we need to be extra careful to avoid stale updates
                  if (currentStatus && incomingStatus && currentStatus !== incomingStatus) {
                    // payloadOldStatus already extracted above
                    
                    // If incoming status matches payload oldStatus, this is stale (reverting to old state)
                    // This happens when we receive a delayed update that reverts our optimistic update
                    if (payloadOldStatus && incomingStatus === payloadOldStatus) {
                      return old; // Skip stale update
                    }
                    
                    // If payload oldStatus is empty, we need to use a heuristic to determine if it's stale
                    // Use updatedAt timestamp to check if the incoming update is newer than current
                    // NOTE: Realtime payload uses snake_case (updated_at), cache uses camelCase (updatedAt)
                    if (!payloadOldStatus || payloadOldStatus === '') {
                      const incomingUpdatedAtRaw = (newData.updated_at || newData.updatedAt) as string | undefined;
                      const incomingUpdatedAt = typeof incomingUpdatedAtRaw === 'string' ? new Date(incomingUpdatedAtRaw).getTime() : null;
                      const currentUpdatedAtRaw = currentDeal && (currentDeal.updatedAt || (currentDeal as unknown as Record<string, unknown>).updated_at as string | undefined);
                      const currentUpdatedAt = typeof currentUpdatedAtRaw === 'string' ? new Date(currentUpdatedAtRaw).getTime() : null;
                      
                      // CRITICAL: When payload.old.status is empty, we can't verify if the update is stale.
                      // Strategy: Trust the server timestamp. If incoming timestamp is newer (even slightly), apply it.
                      // This ensures cross-tab synchronization works even when timestamps are close.
                      // Only skip if incoming timestamp is significantly older (<-100ms), which indicates a stale update.
                      if (incomingUpdatedAt && currentUpdatedAt) {
                        const diffMs = incomingUpdatedAt - currentUpdatedAt;
                        
                        // If incoming timestamp is significantly older (<-100ms), skip it (stale)
                        // This prevents applying updates from previous operations that arrived out of order
                        if (diffMs < -100) {
                          return old; // Skip stale update
                        }
                        
                        // If incoming timestamp is newer or close (>=-100ms), apply it
                        // This ensures cross-tab synchronization works even when timestamps are close
                        // Continue to apply the update below
                      } else {
                        // Can't compare timestamps, be conservative: only apply if status matches
                        if (incomingStatus === currentStatus) {
                          // Continue to apply the update below
                        } else {
                          return old; // Skip update - too risky without timestamp comparison
                        }
                      }
                    }
                    
                    // If we have both oldStatus and newStatus, and newStatus is different from currentStatus,
                    // this is likely a valid update from another tab - apply it!
                    if (payloadOldStatus) {
                      // Continue to apply the update below
                    }
                  }
                  
                  // Also apply if currentStatus is null but incomingStatus exists (deal exists but status is missing)
                  if (!currentStatus && incomingStatus) {
                    // Continue to apply the update below
                  }
                  
                  const updated = old.map((deal) => {
                    if (deal.id === dealId) {
                      // Transform Realtime payload (snake_case) to app format (camelCase)
                      // This ensures fields are properly updated in cache
                      // CRITICAL: Without this normalization, updatedAt from Realtime (updated_at) won't update cache (updatedAt)
                      const normalizedData: Record<string, unknown> = { ...newData };
                      
                      // Normalize timestamp fields
                      if (newData.updated_at && !newData.updatedAt) {
                        normalizedData.updatedAt = newData.updated_at;
                        delete normalizedData.updated_at;
                      }
                      if (newData.created_at && !newData.createdAt) {
                        normalizedData.createdAt = newData.created_at;
                        delete normalizedData.created_at;
                      }
                      
                      // Normalize status field (Realtime sends stage_id, cache uses status)
                      // CRITICAL: Always use stage_id when available, as it's the source of truth!
                      // The status field in Realtime payload may be stale/incorrect.
                      if (newData.stage_id !== undefined) {
                        normalizedData.status = newData.stage_id;
                        delete normalizedData.stage_id;
                      }
                      
                      // Normalize boolean fields
                      if (newData.is_won !== undefined && newData.isWon === undefined) {
                        normalizedData.isWon = newData.is_won;
                        delete normalizedData.is_won;
                      }
                      if (newData.is_lost !== undefined && newData.isLost === undefined) {
                        normalizedData.isLost = newData.is_lost;
                        delete normalizedData.is_lost;
                      }
                      
                      // Normalize ID reference fields
                      if (newData.owner_id !== undefined && newData.ownerId === undefined) {
                        normalizedData.ownerId = newData.owner_id;
                        delete normalizedData.owner_id;
                      }
                      if (newData.contact_id !== undefined && newData.contactId === undefined) {
                        normalizedData.contactId = newData.contact_id;
                        delete normalizedData.contact_id;
                      }
                      if (newData.board_id !== undefined && newData.boardId === undefined) {
                        normalizedData.boardId = newData.board_id;
                        delete normalizedData.board_id;
                      }

                      // Normalize date fields
                      if (newData.closed_at !== undefined && newData.closedAt === undefined) {
                        normalizedData.closedAt = newData.closed_at;
                        delete normalizedData.closed_at;
                      }
                      if (newData.last_stage_change_date !== undefined && newData.lastStageChangeDate === undefined) {
                        normalizedData.lastStageChangeDate = newData.last_stage_change_date;
                        delete normalizedData.last_stage_change_date;
                      }
                      
                      // Merge normalized data into existing deal (preserves enriched fields like companyName, owner, etc.)
                      return { ...deal, ...normalizedData };
                    }
                    return deal;
                  });
                  return updated;
                }
              );

              // Still invalidate dashboard stats (they need recalculation)
              queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
            } else {
              // For other tables or DELETE: debounce invalidation
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }

              debounceTimerRef.current = setTimeout(() => {
                // Invalidate all pending queries
                pendingInvalidationsRef.current.forEach(queryKey => {
                  if (DEBUG_REALTIME) {
                    console.log(`[Realtime] Invalidating queries (debounced):`, queryKey);
                  }
                  queryClient.invalidateQueries({ queryKey });
                });
                pendingInvalidationsRef.current.clear();
              }, debounceMs);
            }
          }
        }
      );
    });

    // Subscribe to channel
    channel.subscribe((status) => {
      if (DEBUG_REALTIME) {
        console.log(`[Realtime] Channel ${channelName} status:`, status);
      }
      
      setIsConnected(status === 'SUBSCRIBED');
      
      if (status === 'SUBSCRIBED') {
        if (DEBUG_REALTIME) {
          console.log(`[Realtime] Successfully subscribed to ${tableList.join(', ')}`);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error for ${channelName}`);
      } else if (status === 'TIMED_OUT') {
        console.warn(`[Realtime] Channel timeout for ${channelName}`);
      } else if (status === 'CLOSED') {
        if (DEBUG_REALTIME) {
          console.warn(`[Realtime] Channel closed for ${channelName}`);
        }
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
    // queryClient is stable (from QueryClientProvider), onchange is handled via ref
  }, [enabled, tablesKey, debounceMs, queryClient]);

  return {
    /** Manually trigger a sync */
    sync: () => {
      const tableList = Array.isArray(tables) ? tables : [tables];
      tableList.forEach(table => {
        const keys = getTableQueryKeys(table);
        keys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      });
    },
    /** Check if channel is connected */
    isConnected,
  };
}

/**
 * Subscribe to all CRM-related tables at once
 * Ideal for the main app layout
 */
export function useRealtimeSyncAll(options: UseRealtimeSyncOptions = {}) {
  return useRealtimeSync(['deals', 'contacts', 'activities', 'boards', 'prospecting_queues', 'prospecting_saved_queues', 'prospecting_daily_goals'], options);
}

/**
 * Subscribe to Kanban-related tables
 * Optimized for the boards page
 */
export function useRealtimeSyncKanban(options: UseRealtimeSyncOptions = {}) {
  return useRealtimeSync(['deals', 'board_stages'], options);
}
