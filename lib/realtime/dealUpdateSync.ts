import { QueryClient } from '@tanstack/react-query';
import { queryKeys, DEALS_VIEW_KEY } from '@/lib/query/queryKeys';
import type { DealView } from '@/types';
import { normalizeDealPayload } from './normalizeDealPayload';

/**
 * Handle a deal UPDATE from Realtime by applying directly to cache.
 * Includes stale-detection logic to prevent reverting optimistic updates.
 */
export function handleDealUpdate(
  queryClient: QueryClient,
  newData: Record<string, unknown>,
  oldData: Record<string, unknown>,
): void {
  const dealId = newData.id as string;
  const incomingStatus = typeof newData.stage_id === 'string' ? newData.stage_id :
                         typeof newData.status === 'string' ? newData.status : null;
  const payloadOldStatus = typeof oldData.stage_id === 'string' ? oldData.stage_id :
                           typeof oldData.status === 'string' ? oldData.status : null;

  queryClient.setQueryData<DealView[]>(
    DEALS_VIEW_KEY,
    (old) => {
      if (!old || !Array.isArray(old)) return old;

      const currentDeal = old.find((d) => d.id === dealId);
      const currentStatus = currentDeal && typeof currentDeal.status === 'string' ? currentDeal.status : null;

      if (!currentDeal) {
        return [...old, newData as unknown as DealView];
      }

      // Same status — merge non-status fields if timestamp is newer
      if (currentStatus && incomingStatus && currentStatus === incomingStatus) {
        const incomingTs = (newData.updated_at || newData.updatedAt) as string | undefined;
        const currentTs = currentDeal.updatedAt || (currentDeal as unknown as Record<string, unknown>).updated_at as string | undefined;
        const incomingMs = typeof incomingTs === 'string' ? new Date(incomingTs).getTime() : 0;
        const currentMs = typeof currentTs === 'string' ? new Date(currentTs).getTime() : 0;

        if (incomingMs > 0 && currentMs > 0 && incomingMs < currentMs - 100) {
          return old; // Stale
        }
      }

      // Different status — stale detection
      if (currentStatus && incomingStatus && currentStatus !== incomingStatus) {
        if (payloadOldStatus && incomingStatus === payloadOldStatus) {
          return old; // Reverting to old state — stale
        }

        if (!payloadOldStatus || payloadOldStatus === '') {
          const incomingUpdatedAtRaw = (newData.updated_at || newData.updatedAt) as string | undefined;
          const incomingUpdatedAt = typeof incomingUpdatedAtRaw === 'string' ? new Date(incomingUpdatedAtRaw).getTime() : null;
          const currentUpdatedAtRaw = currentDeal.updatedAt || (currentDeal as unknown as Record<string, unknown>).updated_at as string | undefined;
          const currentUpdatedAt = typeof currentUpdatedAtRaw === 'string' ? new Date(currentUpdatedAtRaw).getTime() : null;

          if (incomingUpdatedAt && currentUpdatedAt) {
            if (incomingUpdatedAt - currentUpdatedAt < -100) {
              return old; // Stale
            }
          } else if (incomingStatus !== currentStatus) {
            return old; // Too risky without timestamp
          }
        }
      }

      const normalizedData = normalizeDealPayload(newData);

      return old.map((deal) => {
        if (deal.id === dealId) {
          return { ...deal, ...normalizedData };
        }
        return deal;
      });
    }
  );

  // Still invalidate dashboard stats
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
}
