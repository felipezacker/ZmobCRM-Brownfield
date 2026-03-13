import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Contact, PaginatedResponse } from '@/types';
import { normalizeContactPayload } from './normalizeContactPayload';
import { STALE_THRESHOLD_MS } from './realtimeConfig';

/**
 * Handle a contact UPDATE from Realtime by applying directly to cache.
 * Includes stale-detection logic to prevent reverting optimistic updates.
 * Updates all paginated caches, flat lists, and detail cache.
 */
export function handleContactUpdate(
  queryClient: QueryClient,
  newData: Record<string, unknown>,
  oldData: Record<string, unknown>,
): void {
  const contactId = newData.id as string;

  // Normalize once, reuse across all cache updates
  const normalizedData = normalizeContactPayload(newData);

  // Extract incoming timestamp for stale detection
  const incomingTs = (newData.updated_at || newData.updatedAt) as string | undefined;
  const incomingMs = typeof incomingTs === 'string' ? new Date(incomingTs).getTime() : 0;

  // ─── Update all paginated caches that contain this contact ───
  const queries = queryClient.getQueriesData<PaginatedResponse<Contact>>({
    queryKey: queryKeys.contacts.all,
  });

  for (const [key, cacheData] of queries) {
    if (!Array.isArray(key) || key[1] !== 'paginated') continue;
    if (!cacheData) continue;

    const idx = cacheData.data.findIndex(c => c.id === contactId);
    if (idx === -1) continue; // Not in this page — skip (AC3)

    // Stale detection: reject if incoming is older than cache (AC2)
    const currentContact = cacheData.data[idx];
    const currentTs = currentContact.updatedAt ||
      (currentContact as unknown as Record<string, unknown>).updated_at as string | undefined;
    const currentMs = typeof currentTs === 'string' ? new Date(currentTs).getTime() : 0;

    if (incomingMs > 0 && currentMs > 0 && incomingMs < currentMs - STALE_THRESHOLD_MS) {
      continue; // Stale — skip this key
    }

    queryClient.setQueryData<PaginatedResponse<Contact>>(key, (curr) => {
      if (!curr) return curr;
      const next = [...curr.data];
      next[idx] = { ...next[idx], ...normalizedData } as Contact;
      return { ...curr, data: next };
    });
  }

  // ─── Update flat list cache (contacts.lists()) if it exists ───
  queryClient.setQueryData<Contact[]>(
    queryKeys.contacts.lists(),
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      const exists = old.find(c => c.id === contactId);
      if (!exists) return old;

      // Stale detection for flat list
      const currentTs = exists.updatedAt ||
        (exists as unknown as Record<string, unknown>).updated_at as string | undefined;
      const currentMs = typeof currentTs === 'string' ? new Date(currentTs).getTime() : 0;
      if (incomingMs > 0 && currentMs > 0 && incomingMs < currentMs - STALE_THRESHOLD_MS) {
        return old; // Stale
      }

      return old.map(contact => {
        if (contact.id === contactId) {
          return { ...contact, ...normalizedData } as Contact;
        }
        return contact;
      });
    }
  );

  // ─── Update detail cache if it exists ───
  const detailData = queryClient.getQueryData<Contact>(queryKeys.contacts.detail(contactId));
  if (detailData) {
    const currentTs = detailData.updatedAt ||
      (detailData as unknown as Record<string, unknown>).updated_at as string | undefined;
    const currentMs = typeof currentTs === 'string' ? new Date(currentTs).getTime() : 0;
    if (!(incomingMs > 0 && currentMs > 0 && incomingMs < currentMs - STALE_THRESHOLD_MS)) {
      queryClient.setQueryData<Contact>(
        queryKeys.contacts.detail(contactId),
        { ...detailData, ...normalizedData } as Contact
      );
    }
  }

  // ─── Always invalidate stageCounts (AC4) ───
  queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stageCounts() });
}
