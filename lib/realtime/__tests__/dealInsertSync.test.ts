import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { handleDealInsert } from '../dealInsertSync';
import { DEALS_VIEW_KEY } from '@/lib/query/queryKeys';
import type { DealView } from '@/types';

// Mock realtimeConfig
vi.mock('../realtimeConfig', () => ({
  shouldProcessInsert: vi.fn(() => true),
  DEBUG_REALTIME: false,
}));

vi.mock('../normalizeDealPayload', () => ({
  normalizeDealPayload: (data: Record<string, unknown>) => ({ ...data, status: data.stage_id ?? data.status }),
}));

import { shouldProcessInsert } from '../realtimeConfig';

const makeDeal = (overrides: Partial<DealView> = {}): DealView => ({
  id: 'deal-1',
  title: 'Test Deal',
  value: 1000,
  status: 'stage-a',
  boardId: 'board-1',
  contactId: 'contact-1',
  contactName: 'John',
  contactEmail: 'john@test.com',
  contactPhone: '123',
  isWon: false,
  isLost: false,
  priority: 'medium',
  ownerId: 'user-1',
  owner: { name: 'User', avatar: '' },
  items: [],
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
} as DealView);

describe('handleDealInsert', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(shouldProcessInsert).mockReturnValue(true);
  });

  it('returns false when deduplicated', () => {
    vi.mocked(shouldProcessInsert).mockReturnValue(false);
    const result = handleDealInsert(queryClient, { id: 'deal-1', updated_at: '2026-01-01' });
    expect(result).toBe(false);
  });

  it('returns "enriched" when deal already exists in cache', () => {
    const existing = makeDeal({ id: 'deal-1' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [existing]);

    const result = handleDealInsert(queryClient, { id: 'deal-1', updated_at: '2026-01-02', title: 'Updated' });

    expect(result).toBe('enriched');
    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].title).toBe('Updated');
  });

  it('returns "enriched" when temp deal matches by title', () => {
    const tempDeal = makeDeal({ id: 'temp-abc', title: 'New Deal', contactName: 'Jane' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [tempDeal]);

    const result = handleDealInsert(queryClient, { id: 'real-uuid', updated_at: '2026-01-01', title: 'New Deal' });

    expect(result).toBe('enriched');
    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache).toHaveLength(1);
    expect(cache?.[0].id).toBe('real-uuid');
    expect(cache?.[0].contactName).toBe('Jane');
  });

  it('returns "raw" when no temp deal and no existing match (cross-tab)', () => {
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [makeDeal({ id: 'other-deal' })]);

    const result = handleDealInsert(queryClient, { id: 'new-deal', updated_at: '2026-01-01', title: 'Cross Tab Deal' });

    expect(result).toBe('raw');
    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache).toHaveLength(2);
    expect(cache?.[0].id).toBe('new-deal');
  });

  it('returns "raw" when cache is empty', () => {
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, []);

    const result = handleDealInsert(queryClient, { id: 'deal-1', updated_at: '2026-01-01', title: 'First Deal' });

    expect(result).toBe('raw');
  });

  it('removes temp deal and preserves enriched fields', () => {
    const tempDeal = makeDeal({
      id: 'temp-123',
      title: 'My Deal',
      contactName: 'Enriched Name',
      contactEmail: 'enriched@test.com',
      contactPhone: '999',
    });
    const otherDeal = makeDeal({ id: 'other-1', title: 'Other' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [otherDeal, tempDeal]);

    handleDealInsert(queryClient, { id: 'real-id', updated_at: '2026-01-01', title: 'My Deal' });

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache).toHaveLength(2);
    const inserted = cache?.find(d => d.id === 'real-id');
    expect(inserted).toBeDefined();
    expect(inserted?.contactName).toBe('Enriched Name');
    expect(inserted?.contactEmail).toBe('enriched@test.com');
    // Temp deal should be removed
    expect(cache?.find(d => d.id === 'temp-123')).toBeUndefined();
  });
});
