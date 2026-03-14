import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { queryKeys, NOTIFICATION_COUNT_KEY } from '@/lib/query/queryKeys';

export const DEBUG_REALTIME = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true';

/** Threshold (ms) for stale-detection: reject incoming if older than cache by this amount */
export const STALE_THRESHOLD_MS = 100;

// Global deduplication for INSERT events
const processedInserts = new Map<string, number>();
const PROCESSED_CACHE_TTL = 5000;
const CLEANUP_INTERVAL = 100; // purge expired entries every N calls
const CLEANUP_SIZE_THRESHOLD = 500; // force purge when Map exceeds this size
let insertCallCount = 0;

export function shouldProcessInsert(key: string): boolean {
  const now = Date.now();
  insertCallCount++;

  // Periodic cleanup instead of scanning every call
  if (insertCallCount % CLEANUP_INTERVAL === 0 || processedInserts.size > CLEANUP_SIZE_THRESHOLD) {
    for (const [k, timestamp] of processedInserts) {
      if (now - timestamp > PROCESSED_CACHE_TTL) {
        processedInserts.delete(k);
      }
    }
  }

  const existingTimestamp = processedInserts.get(key);
  if (existingTimestamp !== undefined) {
    if (now - existingTimestamp > PROCESSED_CACHE_TTL) {
      processedInserts.delete(key);
    } else {
      return false;
    }
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
  | 'prospecting_sessions'
  | 'organization_settings'
  | 'notifications'
  | 'deal_notes'
  | 'system_notifications';

export const getTableQueryKeys = (table: RealtimeTable): readonly (readonly unknown[])[] => {
  const mapping: Record<RealtimeTable, readonly (readonly unknown[])[]> = {
    deals: [queryKeys.deals.all, queryKeys.dashboard.stats],
    contacts: [queryKeys.contacts.all, queryKeys.deals.all],
    activities: [queryKeys.activities.all, queryKeys.prospectingMetrics.all, queryKeys.liveOperations.all],
    boards: [queryKeys.boards.all],
    board_stages: [queryKeys.boards.all],
    prospecting_queues: [queryKeys.prospectingQueue.all],
    prospecting_saved_queues: [queryKeys.savedQueues.all],
    prospecting_daily_goals: [queryKeys.dailyGoals.all],
    prospecting_sessions: [queryKeys.liveOperations.all],
    organization_settings: [['settings'] as const],
    notifications: [NOTIFICATION_COUNT_KEY],
    deal_notes: [queryKeys.activities.all],
    system_notifications: [['system_notifications'] as const],
  };
  return mapping[table];
};

export interface UseRealtimeSyncOptions {
  enabled?: boolean;
  debounceMs?: number;
  /** If provided, adds an organization_id=eq.{id} filter to subscriptions (defense-in-depth on top of RLS) */
  organizationId?: string;
  onchange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}
