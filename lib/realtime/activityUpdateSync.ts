import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Activity } from '@/types';
import { sortActivitiesSmart } from '@/lib/utils/activitySort';
import { normalizeActivityPayload } from './normalizeActivityPayload';
import { DEBUG_REALTIME, STALE_THRESHOLD_MS } from './realtimeConfig';

/**
 * Handle an activity UPDATE from Realtime by applying directly to cache.
 * Includes stale-detection via updated_at to prevent reverting optimistic updates.
 * Re-sorts via sortActivitiesSmart after applying changes.
 */
export function handleActivityUpdate(
  queryClient: QueryClient,
  newData: Record<string, unknown>,
): void {
  const activityId = newData.id as string;
  const normalizedData = normalizeActivityPayload(newData);

  queryClient.setQueryData<Activity[]>(
    queryKeys.activities.lists(),
    (old) => {
      if (!old || !Array.isArray(old)) return old;

      const currentActivity = old.find((a) => a.id === activityId);
      if (!currentActivity) {
        if (DEBUG_REALTIME) {
          console.log(`[Realtime] Activity UPDATE for unknown id ${activityId}, skipping`);
        }
        return old;
      }

      // Stale-detection: compare updated_at timestamps
      const incomingTs = (newData.updated_at || newData.updatedAt) as string | undefined;
      const currentTs = (currentActivity as unknown as Record<string, unknown>).updatedAt as string | undefined;
      const incomingMs = typeof incomingTs === 'string' ? new Date(incomingTs).getTime() : 0;
      const currentMs = typeof currentTs === 'string' ? new Date(currentTs).getTime() : 0;

      if (incomingMs > 0 && currentMs > 0 && incomingMs < currentMs - STALE_THRESHOLD_MS) {
        if (DEBUG_REALTIME) {
          console.log(`[Realtime] Stale activity UPDATE for ${activityId}, skipping`);
        }
        return old;
      }

      const updated = old.map((activity) => {
        if (activity.id === activityId) {
          return { ...activity, ...normalizedData } as Activity;
        }
        return activity;
      });

      return sortActivitiesSmart(updated);
    }
  );
}
