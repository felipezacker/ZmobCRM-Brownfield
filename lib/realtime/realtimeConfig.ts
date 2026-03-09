import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { queryKeys } from '@/lib/query/queryKeys';

export const DEBUG_REALTIME = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true';

// Global deduplication for INSERT events
const processedInserts = new Map<string, number>();
const PROCESSED_CACHE_TTL = 5000;

export function shouldProcessInsert(key: string): boolean {
  const now = Date.now();
  for (const [k, timestamp] of processedInserts) {
    if (now - timestamp > PROCESSED_CACHE_TTL) {
      processedInserts.delete(k);
    }
  }
  if (processedInserts.has(key)) {
    return false;
  }
  processedInserts.set(key, now);
  return true;
}

export type RealtimeTable =
  | 'deals'
  | 'contacts'
  | 'activities'
  | 'boards'
  | 'board_stages'
  | 'prospecting_queues'
  | 'prospecting_saved_queues'
  | 'prospecting_daily_goals'
  | 'organization_settings';

export const getTableQueryKeys = (table: RealtimeTable): readonly (readonly unknown[])[] => {
  const mapping: Record<RealtimeTable, readonly (readonly unknown[])[]> = {
    deals: [queryKeys.deals.all, queryKeys.dashboard.stats],
    contacts: [queryKeys.contacts.all, queryKeys.deals.all],
    activities: [queryKeys.activities.all, queryKeys.prospectingMetrics.all],
    boards: [queryKeys.boards.all],
    board_stages: [queryKeys.boards.all],
    prospecting_queues: [queryKeys.prospectingQueue.all],
    prospecting_saved_queues: [queryKeys.savedQueues.all],
    prospecting_daily_goals: [queryKeys.dailyGoals.all],
    organization_settings: [['settings'] as const],
  };
  return mapping[table];
};

export interface UseRealtimeSyncOptions {
  enabled?: boolean;
  debounceMs?: number;
  onchange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}
