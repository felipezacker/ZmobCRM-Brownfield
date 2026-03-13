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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  DEBUG_REALTIME,
  RealtimeTable,
  UseRealtimeSyncOptions,
  getTableQueryKeys,
} from './realtimeConfig';
import { handleDealInsert } from './dealInsertSync';
import { handleDealUpdate } from './dealUpdateSync';

export { type RealtimeTable, type UseRealtimeSyncOptions } from './realtimeConfig';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Subscribe to realtime changes on one or more tables
 */
export function useRealtimeSync(
  tables: RealtimeTable | RealtimeTable[],
  options: UseRealtimeSyncOptions = {}
) {
  const { enabled = true, debounceMs = 100, onchange } = options;
  const queryClient = useQueryClient();
  const instanceIdRef = useRef(crypto.randomUUID());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [maxRetriesExhausted, setMaxRetriesExhausted] = useState(false);
  const connectionStatusRef = useRef<ConnectionStatus>('connected');
  const pendingInvalidationsRef = useRef<Set<readonly unknown[]>>(new Set());
  const pendingInvalidateOnlyRef = useRef<Set<readonly unknown[]>>(new Set());
  const pendingBoardStagesInsertCountRef = useRef(0);
  const flushScheduledRef = useRef(false);
  const onchangeRef = useRef(onchange);

  useEffect(() => {
    onchangeRef.current = onchange;
  }, [onchange]);

  const tablesKey = JSON.stringify(tables);

  useEffect(() => {
    if (!enabled) return;

    const sb = supabase;
    if (!sb) {
      console.warn('[Realtime] Supabase client not available');
      return;
    }

    const parsed = JSON.parse(tablesKey);
    const tableList: RealtimeTable[] = Array.isArray(parsed) ? parsed : [parsed];
    // Generate fresh UUID on retry to avoid Supabase channel name collision
    if (retryTrigger > 0) instanceIdRef.current = crypto.randomUUID();
    const channelName = `realtime-sync-${tableList.join('-')}-${instanceIdRef.current}`;

    if (channelRef.current) {
      if (DEBUG_REALTIME) console.log(`[Realtime] Cleaning up existing channel: ${channelName}`);
      sb.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = sb.channel(channelName);

    tableList.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (DEBUG_REALTIME) console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          onchangeRef.current?.(payload);

          // ─── Deal UPDATE: apply directly to cache, skip pending queue ───
          // Prevents accumulated invalidations from causing stale refetch (Bug #1)
          if (payload.eventType === 'UPDATE' && table === 'deals') {
            handleDealUpdate(
              queryClient,
              payload.new as Record<string, unknown>,
              payload.old as Record<string, unknown>,
            );
            return;
          }

          // ─── Deal INSERT: add to cache, refetch only for cross-tab (unenriched) ───
          if (payload.eventType === 'INSERT' && table === 'deals') {
            const result = handleDealInsert(queryClient, payload.new as Record<string, unknown>);
            if (!result || result === 'enriched') return;
            // Cross-tab insert ('raw'): schedule refetch for complete DealView data (Bug #17)
            const dealKeys = getTableQueryKeys(table);
            dealKeys.forEach(key => pendingInvalidationsRef.current.add(key));
            if (!flushScheduledRef.current) {
              flushScheduledRef.current = true;
              queueMicrotask(() => {
                flushScheduledRef.current = false;
                const keysToFlush = Array.from(pendingInvalidationsRef.current);
                pendingInvalidationsRef.current.clear();
                keysToFlush.forEach(queryKey => {
                  queryClient.invalidateQueries({ queryKey, exact: false, refetchType: 'all' });
                });
              });
            }
            return;
          }

          // ─── Standard handling for all other events ───
          const keys = getTableQueryKeys(table);

          if (payload.eventType === 'INSERT' && table === 'board_stages') {
            keys.forEach(key => pendingInvalidateOnlyRef.current.add(key));
            pendingBoardStagesInsertCountRef.current += 1;
          } else {
            keys.forEach(key => pendingInvalidationsRef.current.add(key));
          }

          if (payload.eventType === 'INSERT') {
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

                keysToFlush.forEach(queryKey => {
                  queryClient.invalidateQueries({ queryKey, exact: false, refetchType: 'all' });
                });
                keysInvalidateOnly.forEach(queryKey => {
                  queryClient.invalidateQueries({
                    queryKey, exact: false,
                    refetchType: boardStagesInsertCount <= 1 ? 'all' : 'none',
                  });
                });
              });
            }
          } else {
            // DELETE or non-deal UPDATE: debounce
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              pendingInvalidationsRef.current.forEach(queryKey => {
                if (DEBUG_REALTIME) console.log(`[Realtime] Invalidating queries (debounced):`, queryKey);
                queryClient.invalidateQueries({ queryKey });
              });
              pendingInvalidationsRef.current.clear();
            }, debounceMs);
          }
        }
      );
    });

    channel.subscribe((status) => {
      if (DEBUG_REALTIME) console.log(`[Realtime] Channel ${channelName} status:`, status);
      setIsConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        // Resync if reconnecting after disconnection (AC3)
        if (connectionStatusRef.current !== 'connected') {
          tableList.forEach(table => {
            getTableQueryKeys(table).forEach(key =>
              queryClient.invalidateQueries({ queryKey: key, exact: false })
            );
          });
        }
        retryCountRef.current = 0;
        setMaxRetriesExhausted(false);
        setConnectionStatus('connected');
        connectionStatusRef.current = 'connected';
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const level = status === 'CHANNEL_ERROR' ? 'error' : 'warn';
        console[level](`[Realtime] Channel ${level} for ${channelName}`);
        // Exponential backoff retry (max 5 attempts, max 30s delay)
        if (retryCountRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          retryCountRef.current += 1;
          if (DEBUG_REALTIME) console.log(`[Realtime] Retry ${retryCountRef.current}/5 in ${delay}ms`);
          setConnectionStatus('reconnecting');
          connectionStatusRef.current = 'reconnecting';
          retryTimerRef.current = setTimeout(() => {
            // Force useEffect re-run which triggers cleanup+resubscribe
            setRetryTrigger(n => n + 1);
          }, delay);
        } else {
          setConnectionStatus('disconnected');
          connectionStatusRef.current = 'disconnected';
          setMaxRetriesExhausted(true);
        }
      }
    });

    channelRef.current = channel;

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  // retryTrigger forces effect re-run on exponential backoff reconnect
  }, [enabled, tablesKey, debounceMs, queryClient, retryTrigger]);

  // Browser connectivity & visibility listeners (AC4, AC5)
  useEffect(() => {
    if (!enabled) return;

    const parsed = JSON.parse(tablesKey);
    const tableList: RealtimeTable[] = Array.isArray(parsed) ? parsed : [parsed];

    const invalidateAll = () => {
      tableList.forEach(table => {
        getTableQueryKeys(table).forEach(key =>
          queryClient.invalidateQueries({ queryKey: key, exact: false })
        );
      });
    };

    const onOnline = () => {
      setConnectionStatus('connected');
      connectionStatusRef.current = 'connected';
      invalidateAll(); // AC4: resync imediato ao detectar rede
    };

    const onOffline = () => {
      setConnectionStatus('disconnected');
      connectionStatusRef.current = 'disconnected';
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') invalidateAll(); // AC5
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, tablesKey, queryClient]);

  const resetRetry = useCallback(() => {
    retryCountRef.current = 0;
    setMaxRetriesExhausted(false);
    setConnectionStatus('reconnecting');
    connectionStatusRef.current = 'reconnecting';
    setRetryTrigger(n => n + 1);
  }, []);

  return {
    sync: () => {
      const tableList = Array.isArray(tables) ? tables : [tables];
      tableList.forEach(table => {
        const keys = getTableQueryKeys(table);
        keys.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
      });
    },
    isConnected,
    connectionStatus,
    maxRetriesExhausted,
    resetRetry,
  };
}

/** Subscribe to all CRM-related tables at once */
export function useRealtimeSyncAll(options: UseRealtimeSyncOptions = {}) {
  return useRealtimeSync(['deals', 'contacts', 'activities', 'boards', 'board_stages', 'prospecting_queues', 'prospecting_saved_queues', 'prospecting_daily_goals'], options);
}

/** Subscribe to Kanban-related tables */
export function useRealtimeSyncKanban(options: UseRealtimeSyncOptions = {}) {
  return useRealtimeSync(['deals', 'board_stages', 'contacts'], options);
}
