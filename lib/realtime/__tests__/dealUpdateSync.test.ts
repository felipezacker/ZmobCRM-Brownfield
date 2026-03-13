import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { handleDealUpdate } from '../dealUpdateSync';
import { DEALS_VIEW_KEY } from '@/lib/query/queryKeys';
import type { DealView } from '@/types';

vi.mock('../normalizeDealPayload', () => ({
  normalizeDealPayload: (data: Record<string, unknown>) => {
    const result = { ...data, status: data.stage_id ?? data.status };
    if ('board_id' in data) {
      (result as Record<string, unknown>).boardId = data.board_id;
      delete (result as Record<string, unknown>).board_id;
    }
    return result;
  },
}));

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
  updatedAt: '2026-01-01T10:00:00Z',
  ...overrides,
} as DealView);

describe('handleDealUpdate', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('adds deal to cache when not found', () => {
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, []);

    handleDealUpdate(queryClient, { id: 'new-deal', stage_id: 'stage-b', updated_at: '2026-01-02' }, {});

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache).toHaveLength(1);
    expect(cache?.[0].id).toBe('new-deal');
  });

  it('updates deal when same status and newer timestamp', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-a', updatedAt: '2026-01-01T10:00:00Z' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-a', title: 'Updated Title', updated_at: '2026-01-01T11:00:00Z' },
      { stage_id: 'stage-a' },
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].title).toBe('Updated Title');
  });

  it('rejects stale update when same status and older timestamp', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-a', updatedAt: '2026-01-01T12:00:00Z' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-a', title: 'Stale Title', updated_at: '2026-01-01T10:00:00Z' },
      { stage_id: 'stage-a' },
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].title).toBe('Test Deal');
  });

  it('rejects reverting status change (stale reversal detection)', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-b' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    // Incoming says "move to stage-a", but old was also stage-a — this is a reversal
    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-a', updated_at: '2026-01-02' },
      { stage_id: 'stage-a' },
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].status).toBe('stage-b');
  });

  it('allows cross-tab status change when timestamps unavailable (Bug #18 fix)', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-a' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    // Cross-tab: no old status, no timestamps — should allow through
    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-c' },
      {},
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].status).toBe('stage-c');
  });

  it('allows cross-tab status change with newer timestamp', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-a', updatedAt: '2026-01-01T10:00:00Z' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-b', updated_at: '2026-01-01T12:00:00Z' },
      {},
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].status).toBe('stage-b');
  });

  it('rejects cross-tab status change with older timestamp', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-a', updatedAt: '2026-01-01T12:00:00Z' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-b', updated_at: '2026-01-01T08:00:00Z' },
      {},
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].status).toBe('stage-a');
  });

  it('updates boardId to null when Realtime sends board_id: null (AC2)', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-a', boardId: 'board-1', updatedAt: '2026-01-01T10:00:00Z' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-a', board_id: null, updated_at: '2026-01-01T11:00:00Z' },
      { stage_id: 'stage-a' },
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].boardId).toBeNull();
  });

  it('merges non-status fields preserving existing deal data', () => {
    const deal = makeDeal({ id: 'deal-1', status: 'stage-a', contactName: 'John' });
    queryClient.setQueryData<DealView[]>(DEALS_VIEW_KEY, [deal]);

    handleDealUpdate(
      queryClient,
      { id: 'deal-1', stage_id: 'stage-a', value: 5000, updated_at: '2026-01-02' },
      { stage_id: 'stage-a' },
    );

    const cache = queryClient.getQueryData<DealView[]>(DEALS_VIEW_KEY);
    expect(cache?.[0].value).toBe(5000);
    expect(cache?.[0].contactName).toBe('John');
  });
});
