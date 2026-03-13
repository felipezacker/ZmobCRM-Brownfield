import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { handleContactUpdate } from '../contactUpdateSync';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Contact, PaginatedResponse } from '@/types';

vi.mock('../normalizeContactPayload', () => ({
  normalizeContactPayload: (data: Record<string, unknown>) => ({ ...data }),
}));

const makeContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-1',
  name: 'Test Contact',
  email: 'test@example.com',
  phone: '11999999999',
  status: 'ACTIVE',
  stage: 'LEAD',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01T10:00:00Z',
  ...overrides,
});

const makePaginatedResponse = (contacts: Contact[]): PaginatedResponse<Contact> => ({
  data: contacts,
  totalCount: contacts.length,
  pageIndex: 0,
  pageSize: 20,
  hasMore: false,
});

describe('handleContactUpdate', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('updates contact in paginated cache with new fields (AC1)', () => {
    const contact = makeContact({ id: 'contact-1', updatedAt: '2026-01-01T10:00:00Z' });
    const paginationKey = queryKeys.contacts.paginated({ pageIndex: 0, pageSize: 20 });
    queryClient.setQueryData<PaginatedResponse<Contact>>(paginationKey, makePaginatedResponse([contact]));

    handleContactUpdate(
      queryClient,
      { id: 'contact-1', name: 'Updated Name', updated_at: '2026-01-01T11:00:00Z' },
      {},
    );

    const cache = queryClient.getQueryData<PaginatedResponse<Contact>>(paginationKey);
    expect(cache?.data[0].name).toBe('Updated Name');
  });

  it('rejects stale update with older timestamp (AC2)', () => {
    const contact = makeContact({ id: 'contact-1', updatedAt: '2026-01-01T12:00:00Z' });
    const paginationKey = queryKeys.contacts.paginated({ pageIndex: 0, pageSize: 20 });
    queryClient.setQueryData<PaginatedResponse<Contact>>(paginationKey, makePaginatedResponse([contact]));

    handleContactUpdate(
      queryClient,
      { id: 'contact-1', name: 'Stale Name', updated_at: '2026-01-01T10:00:00Z' },
      {},
    );

    const cache = queryClient.getQueryData<PaginatedResponse<Contact>>(paginationKey);
    expect(cache?.data[0].name).toBe('Test Contact');
  });

  it('does not modify cache when contact not found in any page (AC3)', () => {
    const contact = makeContact({ id: 'contact-2' });
    const paginationKey = queryKeys.contacts.paginated({ pageIndex: 0, pageSize: 20 });
    queryClient.setQueryData<PaginatedResponse<Contact>>(paginationKey, makePaginatedResponse([contact]));

    handleContactUpdate(
      queryClient,
      { id: 'contact-999', name: 'Unknown', updated_at: '2026-01-02' },
      {},
    );

    const cache = queryClient.getQueryData<PaginatedResponse<Contact>>(paginationKey);
    expect(cache?.data).toHaveLength(1);
    expect(cache?.data[0].id).toBe('contact-2');
    expect(cache?.data[0].name).toBe('Test Contact');
  });

  it('invalidates stageCounts on any update (AC4)', () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const contact = makeContact({ id: 'contact-1' });
    const paginationKey = queryKeys.contacts.paginated({ pageIndex: 0, pageSize: 20 });
    queryClient.setQueryData<PaginatedResponse<Contact>>(paginationKey, makePaginatedResponse([contact]));

    handleContactUpdate(
      queryClient,
      { id: 'contact-1', stage: 'MQL', updated_at: '2026-01-02' },
      {},
    );

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.contacts.stageCounts() });
  });

  it('preserves enriched fields (avatar) after merge (Subtask 5.5)', () => {
    const contact = makeContact({
      id: 'contact-1',
      avatar: 'https://example.com/avatar.jpg',
      updatedAt: '2026-01-01T10:00:00Z',
    });
    const paginationKey = queryKeys.contacts.paginated({ pageIndex: 0, pageSize: 20 });
    queryClient.setQueryData<PaginatedResponse<Contact>>(paginationKey, makePaginatedResponse([contact]));

    handleContactUpdate(
      queryClient,
      { id: 'contact-1', phone: '11888888888', updated_at: '2026-01-01T11:00:00Z' },
      {},
    );

    const cache = queryClient.getQueryData<PaginatedResponse<Contact>>(paginationKey);
    expect(cache?.data[0].phone).toBe('11888888888');
    expect(cache?.data[0].avatar).toBe('https://example.com/avatar.jpg');
  });

  it('updates flat list cache (contacts.lists())', () => {
    const contact = makeContact({ id: 'contact-1', updatedAt: '2026-01-01T10:00:00Z' });
    queryClient.setQueryData<Contact[]>(queryKeys.contacts.lists(), [contact]);

    handleContactUpdate(
      queryClient,
      { id: 'contact-1', email: 'new@example.com', updated_at: '2026-01-01T11:00:00Z' },
      {},
    );

    const cache = queryClient.getQueryData<Contact[]>(queryKeys.contacts.lists());
    expect(cache?.[0].email).toBe('new@example.com');
  });

  it('updates detail cache if it exists', () => {
    const contact = makeContact({ id: 'contact-1', updatedAt: '2026-01-01T10:00:00Z' });
    queryClient.setQueryData<Contact>(queryKeys.contacts.detail('contact-1'), contact);

    handleContactUpdate(
      queryClient,
      { id: 'contact-1', name: 'Detail Updated', updated_at: '2026-01-01T11:00:00Z' },
      {},
    );

    const cache = queryClient.getQueryData<Contact>(queryKeys.contacts.detail('contact-1'));
    expect(cache?.name).toBe('Detail Updated');
  });

  it('updates contact across multiple paginated pages', () => {
    const contact = makeContact({ id: 'contact-1', updatedAt: '2026-01-01T10:00:00Z' });
    const page0Key = queryKeys.contacts.paginated({ pageIndex: 0, pageSize: 20 });
    const page1Key = queryKeys.contacts.paginated({ pageIndex: 1, pageSize: 20 });

    // Same contact in both pages (edge case)
    queryClient.setQueryData<PaginatedResponse<Contact>>(page0Key, makePaginatedResponse([contact]));
    queryClient.setQueryData<PaginatedResponse<Contact>>(page1Key, makePaginatedResponse([
      makeContact({ id: 'contact-other' }),
    ]));

    handleContactUpdate(
      queryClient,
      { id: 'contact-1', name: 'Multi-page Update', updated_at: '2026-01-01T11:00:00Z' },
      {},
    );

    const cache0 = queryClient.getQueryData<PaginatedResponse<Contact>>(page0Key);
    const cache1 = queryClient.getQueryData<PaginatedResponse<Contact>>(page1Key);
    expect(cache0?.data[0].name).toBe('Multi-page Update');
    // contact-1 not in page1, so page1 unaffected
    expect(cache1?.data[0].name).toBe('Test Contact');
  });
});
