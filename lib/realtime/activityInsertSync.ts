import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Activity } from '@/types';
import { shouldProcessInsert, DEBUG_REALTIME } from './realtimeConfig';
import { normalizeActivityPayload } from './normalizeActivityPayload';
import { sortActivitiesSmart } from '@/lib/utils/activitySort';

/**
 * Handle an activity INSERT from Realtime by adding directly to cache.
 * Prevents refetch storms by deduplicating and enriching from local optimistic data.
 *
 * @returns 'enriched' if processed with existing local data,
 *          'raw' if processed without enrichment (cross-tab),
 *          false if deduplicated
 */
export function handleActivityInsert(
  queryClient: QueryClient,
  newData: Record<string, unknown>,
): 'enriched' | 'raw' | false {
  const activityId = newData.id as string;
  const updatedAt = newData.updated_at as string;

  const dedupeKey = `activities-${activityId}-${updatedAt}`;
  if (!shouldProcessInsert(dedupeKey)) {
    if (DEBUG_REALTIME) {
      console.log(`[Realtime] Deduplicated activity INSERT: ${dedupeKey}`);
    }
    return false;
  }

  const normalizedActivity = normalizeActivityPayload(newData);
  let wasEnriched = false;

  queryClient.setQueryData<Activity[]>(
    queryKeys.activities.lists(),
    (old) => {
      if (!old || !Array.isArray(old)) return old;

      // Activity already exists in cache (optimistic insert) — merge and re-sort
      const existingIndex = old.findIndex((a) => a.id === activityId);
      if (existingIndex !== -1) {
        wasEnriched = true;
        const merged = old.map((a, i) =>
          i === existingIndex ? { ...a, ...normalizedActivity } as Activity : a
        );
        return sortActivitiesSmart(merged);
      }

      // New activity (cross-tab) — add and sort
      return sortActivitiesSmart([...old, normalizedActivity as unknown as Activity]);
    }
  );

  return wasEnriched ? 'enriched' : 'raw';
}
