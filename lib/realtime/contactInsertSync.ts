import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Contact, PaginatedResponse } from '@/types';
import { shouldProcessInsert, DEBUG_REALTIME } from './realtimeConfig';
import { normalizeContactPayload } from './normalizeContactPayload';

/**
 * Handle a contact INSERT from Realtime by adding directly to cache.
 * Conservative approach for paginated contacts: only replaces temp contacts,
 * never inserts into paginated caches (page may not match active filters).
 *
 * @returns 'enriched' if processed with temp contact data,
 *          'raw' if processed without enrichment (cross-tab),
 *          false if deduplicated
 */
export function handleContactInsert(
  queryClient: QueryClient,
  newData: Record<string, unknown>,
): 'enriched' | 'raw' | false {
  const contactId = newData.id as string;
  const updatedAt = newData.updated_at as string;

  // ─── Dedup (AC7) ───
  const dedupeKey = `contacts-${contactId}-${updatedAt}`;
  if (!shouldProcessInsert(dedupeKey)) {
    if (DEBUG_REALTIME) {
      console.log(`[Realtime] Deduplicated contact INSERT: ${dedupeKey}`);
    }
    return false;
  }

  const normalizedContact = normalizeContactPayload(newData);
  let wasEnriched = false;

  // ─── Check flat list cache for temp contact (AC5) ───
  queryClient.setQueryData<Contact[]>(
    queryKeys.contacts.lists(),
    (old) => {
      if (!old || !Array.isArray(old)) return old;

      // Contact already exists — update
      const existingIndex = old.findIndex(c => c.id === contactId);
      if (existingIndex !== -1) {
        wasEnriched = true;
        return old.map((c, i) => i === existingIndex ? { ...c, ...normalizedContact } as Contact : c);
      }

      // Find temp contact (id starts with 'temp-') matching by name
      const tempContact = old.find(c => {
        const isTemp = typeof c.id === 'string' && c.id.startsWith('temp-');
        const sameName = c.name === newData.name;
        return isTemp && sameName;
      });

      if (tempContact) {
        wasEnriched = true;
        // Remove temp, add real enriched with temp's extra fields
        const filtered = old.filter(c => !(typeof c.id === 'string' && c.id.startsWith('temp-') && c.name === newData.name));
        const enrichedContact = {
          avatar: tempContact.avatar,
          ...normalizedContact,
        };
        return [enrichedContact as unknown as Contact, ...filtered];
      }

      return old;
    }
  );

  // ─── Check paginated caches for temp contact (AC5) ───
  if (!wasEnriched) {
    const queries = queryClient.getQueriesData<PaginatedResponse<Contact>>({
      queryKey: queryKeys.contacts.all,
    });

    for (const [key, cacheData] of queries) {
      if (!Array.isArray(key) || key[1] !== 'paginated') continue;
      if (!cacheData) continue;

      const tempIdx = cacheData.data.findIndex(c =>
        typeof c.id === 'string' && c.id.startsWith('temp-') && c.name === newData.name
      );

      if (tempIdx !== -1) {
        wasEnriched = true;
        const tempContact = cacheData.data[tempIdx];
        queryClient.setQueryData<PaginatedResponse<Contact>>(key, (curr) => {
          if (!curr) return curr;
          const next = [...curr.data];
          next[tempIdx] = {
            avatar: tempContact.avatar,
            ...normalizedContact,
          } as unknown as Contact;
          return { ...curr, data: next };
        });
        break; // Temp only exists in one page
      }
    }
  }

  // ─── Always invalidate stageCounts (AC8) ───
  queryClient.invalidateQueries({ queryKey: queryKeys.contacts.stageCounts() });

  if (wasEnriched) return 'enriched';

  // ─── Cross-tab: don't insert into paginated caches (AC6) ───
  return 'raw';
}
