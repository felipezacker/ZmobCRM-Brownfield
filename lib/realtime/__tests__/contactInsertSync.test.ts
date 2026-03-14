import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { handleContactInsert } from '../contactInsertSync';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Contact, PaginatedResponse } from '@/types';

vi.mock('../realtimeConfig', () => ({
  shouldProcessInsert: vi.fn(() => true),
  DEBUG_REALTIME: false,
}));

vi.mock('../normalizeContactPayload', () => ({
  normalizeContactPayload: (data: Record<string, unknown>) => ({ ...data }),
}));

import { shouldProcessInsert } from '../realtimeConfig';

const makeContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-1',
  name: 'Test Contact',
  email: 'test@example.com',
  phone: '11999999999',
  status: 'ACTIVE',
  stage: 'LEAD',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const makePaginatedResponse = (contacts: Contact[]): PaginatedResponse<Contact> => ({
  data: contacts,
  totalCount: contacts.length,
  pageIndex: 0,
  pageSize: 20,
  hasMore: false,
});

describe('handleContactInsert', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(shouldProcessInsert).mockReturnValue(true);
  });

  it('returns false when deduplicated (AC7)', () => {
    vi.mocked(shouldProcessInsert).mockReturnValue(false);
    const result = handleContactInsert(queryClient, { id: 'contact-1', updated_at: '2026-01-01' });
    expect(result).toBe(false);
  });

  it('returns "enriched" when temp contact exists in contacts.lists() (AC5)', () => {
    const tempContact = makeContact({
      id: 'temp-123',
      name: 'New Contact',
      avatar: 'https://example.com/temp-avatar.jpg',
    });
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), [tempContact]);

    const result = handleContactInsert(queryClient, {
      id: 'real-uuid',
      updated_at: '2026-01-01',
      name: 'New Contact',
    });

    expect(result).toBe('enriched');
    const cache = queryClient.getQueryData<Contact[]>(queryKeys.contacts.lists());
    expect(cache).toHaveLength(1);
    expect(cache?.[0].id).toBe('real-uuid');
    expect(cache?.[0].avatar).toBe('https://example.com/temp-avatar.jpg');
  });

  it('returns "enriched" when temp contact exists in paginated cache (AC5)', () => {
    const tempContact = makeContact({
      id: 'temp-456',
      name: 'Paginated Temp',
      avatar: 'https://example.com/avatar.jpg',
    });
    const paginationKey = queryKeys.contacts.paginated({ pageIndex: 0, pageSize: 20 });
    queryClient.setQueryData<PaginatedResponse<Contact>>(paginationKey, makePaginatedResponse([tempContact]));
    // Empty flat list (no match there)
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), []);

    const result = handleContactInsert(queryClient, {
      id: 'real-uuid-2',
      updated_at: '2026-01-01',
      name: 'Paginated Temp',
    });

    expect(result).toBe('enriched');
    const cache = queryClient.getQueryData<PaginatedResponse<Contact>>(paginationKey);
    expect(cache?.data[0].id).toBe('real-uuid-2');
    expect(cache?.data[0].avatar).toBe('https://example.com/avatar.jpg');
  });

  it('returns "raw" when no temp found — cross-tab (AC6)', () => {
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), [
      makeContact({ id: 'other-contact' }),
    ]);

    const result = handleContactInsert(queryClient, {
      id: 'cross-tab-contact',
      updated_at: '2026-01-01',
      name: 'Cross Tab Contact',
    });

    expect(result).toBe('raw');
  });

  it('removes temp contact and preserves enriched fields (Subtask 6.4)', () => {
    const tempContact = makeContact({
      id: 'temp-789',
      name: 'Enriched Contact',
      avatar: 'https://example.com/enriched.jpg',
      email: undefined,
      phone: undefined,
    });
    const otherContact = makeContact({ id: 'other-1', name: 'Other' });
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), [otherContact, tempContact]);

    handleContactInsert(queryClient, {
      id: 'real-id',
      updated_at: '2026-01-01',
      name: 'Enriched Contact',
      email: 'real@example.com',
    });

    const cache = queryClient.getQueryData<Contact[]>(queryKeys.contacts.lists());
    expect(cache).toHaveLength(2);
    const inserted = cache?.find(c => c.id === 'real-id');
    expect(inserted).toBeDefined();
    expect(inserted?.avatar).toBe('https://example.com/enriched.jpg');
    // Temp should be removed
    expect(cache?.find(c => c.id === 'temp-789')).toBeUndefined();
  });

  it('invalidates stageCounts in any case (AC8)', () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), []);

    handleContactInsert(queryClient, {
      id: 'contact-new',
      updated_at: '2026-01-01',
      name: 'Any Contact',
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.contacts.stageCounts() });
  });

  it('returns "raw" when cache is empty', () => {
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), []);

    const result = handleContactInsert(queryClient, {
      id: 'first-contact',
      updated_at: '2026-01-01',
      name: 'First Contact',
    });

    expect(result).toBe('raw');
  });

  it('returns "enriched" when contact already exists in flat list (update case)', () => {
    const existing = makeContact({ id: 'contact-1', name: 'Existing' });
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), [existing]);

    const result = handleContactInsert(queryClient, {
      id: 'contact-1',
      updated_at: '2026-01-02',
      name: 'Updated Via Insert',
    });

    expect(result).toBe('enriched');
    const cache = queryClient.getQueryData<Contact[]>(queryKeys.contacts.lists());
    expect(cache?.[0].name).toBe('Updated Via Insert');
  });
});
