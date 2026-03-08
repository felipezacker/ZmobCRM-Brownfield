import { QueryClient } from '@tanstack/react-query';
import { DEALS_VIEW_KEY } from '@/lib/query/queryKeys';
import type { DealView } from '@/types';
import { shouldProcessInsert, DEBUG_REALTIME } from './realtimeConfig';
import { normalizeDealPayload } from './normalizeDealPayload';

/**
 * Handle a deal INSERT from Realtime by adding directly to cache.
 * This prevents the "flash and disappear" bug caused by invalidation
 * removing temp deals before the server response arrives.
 *
 * @returns true if the event was processed, false if deduplicated
 */
export function handleDealInsert(
  queryClient: QueryClient,
  newData: Record<string, unknown>,
): boolean {
  const dealId = newData.id as string;
  const updatedAt = newData.updated_at as string;

  const dedupeKey = `deals-${dealId}-${updatedAt}`;
  if (!shouldProcessInsert(dedupeKey)) {
    if (DEBUG_REALTIME) {
      console.log(`[Realtime] Deduplicated deal INSERT: ${dedupeKey}`);
    }
    return false;
  }

  const normalizedDeal = normalizeDealPayload(newData);

  queryClient.setQueryData<DealView[]>(
    DEALS_VIEW_KEY,
    (old) => {
      if (!old || !Array.isArray(old)) return old;

      // Deal already exists — update
      const existingIndex = old.findIndex((d) => d.id === dealId);
      if (existingIndex !== -1) {
        return old.map((d, i) => i === existingIndex ? { ...d, ...normalizedDeal } as DealView : d);
      }

      // Find temp deal to preserve enriched fields (contactName, etc.)
      const tempDeal = old.find((d) => {
        const isTemp = typeof d.id === 'string' && d.id.startsWith('temp-');
        const sameTitle = d.title === newData.title;
        return isTemp && sameTitle;
      });

      // Remove temp deals with same title
      const tempDealsRemoved = old.filter((d) => {
        const isTemp = typeof d.id === 'string' && d.id.startsWith('temp-');
        const sameTitle = d.title === newData.title;
        return !(isTemp && sameTitle);
      });

      // Enrich with fields from temp deal
      const enrichedDeal = tempDeal
        ? {
            contactName: tempDeal.contactName,
            contactEmail: tempDeal.contactEmail,
            contactPhone: tempDeal.contactPhone,
            ...normalizedDeal,
          }
        : normalizedDeal;

      return [enrichedDeal as unknown as DealView, ...tempDealsRemoved];
    }
  );

  return true;
}
