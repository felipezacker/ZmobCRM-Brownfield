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
import {
  DEBUG_REALTIME,
  RealtimeTable,
  UseRealtimeSyncOptions,
  getTableQueryKeys,
} from './realtimeConfig';
import { handleDealInsert } from './dealInsertSync';
import { handleDealUpdate } from './dealUpdateSync';

export { type RealtimeTable, type UseRealtimeSyncOptions } from './realtimeConfig';

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
    const channelName = `realtime-sync-${tableList.join('-')}`;

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

          const keys = getTableQueryKeys(table);

          if (payload.eventType === 'INSERT' && table === 'board_stages') {
            keys.forEach(key => pendingInvalidateOnlyRef.current.add(key));
            pendingBoardStagesInsertCountRef.current += 1;
          } else {
            keys.forEach(key => pendingInvalidationsRef.current.add(key));
          }

          if (payload.eventType === 'INSERT') {
            if (table === 'deals') {
              const processed = handleDealInsert(queryClient, payload.new as Record<string, unknown>);
              if (!processed) return;
              return; // Don't invalidate — added directly
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
          } else if (payload.eventType === 'UPDATE' && table === 'deals') {
            handleDealUpdate(
              queryClient,
              payload.new as Record<string, unknown>,
              payload.old as Record<string, unknown>,
            );
          } else {
            // DELETE or other tables: debounce
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
      if (status === 'CHANNEL_ERROR') console.error(`[Realtime] Channel error for ${channelName}`);
      else if (status === 'TIMED_OUT') console.warn(`[Realtime] Channel timeout for ${channelName}`);
    });

    channelRef.current = channel;

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, tablesKey, debounceMs, queryClient]);

  return {
    sync: () => {
      const tableList = Array.isArray(tables) ? tables : [tables];
      tableList.forEach(table => {
        const keys = getTableQueryKeys(table);
        keys.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
      });
    },
    isConnected,
  };
}

/** Subscribe to all CRM-related tables at once */
export function useRealtimeSyncAll(options: UseRealtimeSyncOptions = {}) {
  return useRealtimeSync(['deals', 'contacts', 'activities', 'boards', 'prospecting_queues', 'prospecting_saved_queues', 'prospecting_daily_goals'], options);
}

/** Subscribe to Kanban-related tables */
export function useRealtimeSyncKanban(options: UseRealtimeSyncOptions = {}) {
  return useRealtimeSync(['deals', 'board_stages'], options);
}
