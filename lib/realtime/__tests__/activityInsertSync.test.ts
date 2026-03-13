import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { handleActivityInsert } from '../activityInsertSync';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Activity } from '@/types';

vi.mock('../realtimeConfig', () => ({
  shouldProcessInsert: vi.fn(() => true),
  DEBUG_REALTIME: false,
}));

vi.mock('../normalizeActivityPayload', () => ({
  normalizeActivityPayload: (data: Record<string, unknown>) => ({ ...data }),
}));

import { shouldProcessInsert } from '../realtimeConfig';

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-1',
  dealId: 'deal-1',
  contactId: 'contact-1',
  dealTitle: 'Test Deal',
  type: 'TASK',
  title: 'Test Activity',
  date: '2026-03-13T10:00:00Z',
  user: { name: 'Test User', avatar: '' },
  completed: false,
  ...overrides,
});

describe('handleActivityInsert', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(shouldProcessInsert).mockReturnValue(true);
  });

  it('returns false when deduplicated (AC-4)', () => {
    vi.mocked(shouldProcessInsert).mockReturnValue(false);
    const result = handleActivityInsert(queryClient, { id: 'activity-1', updated_at: '2026-03-13' });
    expect(result).toBe(false);
  });

  it('adds new activity to cache and returns "raw" for cross-tab (AC-3)', () => {
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [
      makeActivity({ id: 'existing-1' }),
    ]);

    const result = handleActivityInsert(queryClient, {
      id: 'cross-tab-activity',
      updated_at: '2026-03-13',
      title: 'Cross Tab Activity',
      date: '2026-03-13T15:00:00Z',
      type: 'CALL',
    });

    expect(result).toBe('raw');
    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache).toHaveLength(2);
    expect(cache?.find(a => a.id === 'cross-tab-activity')).toBeDefined();
  });

  it('returns "enriched" when activity already exists in cache (optimistic, AC-4 merge)', () => {
    const existing = makeActivity({ id: 'activity-1', title: 'Optimistic Activity' });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [existing]);

    const result = handleActivityInsert(queryClient, {
      id: 'activity-1',
      updated_at: '2026-03-13',
      title: 'Server Activity',
      date: '2026-03-13T10:00:00Z',
    });

    expect(result).toBe('enriched');
    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache).toHaveLength(1);
    expect(cache?.[0].title).toBe('Server Activity');
  });

  it('sorts activities after insert — overdue before future (AC-7)', () => {
    const futureActivity = makeActivity({
      id: 'future-1',
      date: '2099-12-31T10:00:00Z',
    });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [futureActivity]);

    handleActivityInsert(queryClient, {
      id: 'overdue-1',
      updated_at: '2026-03-13',
      title: 'Overdue Activity',
      date: '2020-01-01T10:00:00Z',
      type: 'TASK',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache?.[0].id).toBe('overdue-1');
    expect(cache?.[1].id).toBe('future-1');
  });

  it('calls shouldProcessInsert with correct deduplication key', () => {
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), []);

    handleActivityInsert(queryClient, {
      id: 'activity-abc',
      updated_at: '2026-03-13T09:00:00Z',
    });

    expect(shouldProcessInsert).toHaveBeenCalledWith('activities-activity-abc-2026-03-13T09:00:00Z');
  });

  it('returns "raw" when cache is empty', () => {
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), []);

    const result = handleActivityInsert(queryClient, {
      id: 'first-activity',
      updated_at: '2026-03-13',
      title: 'First Activity',
      date: '2026-03-13T10:00:00Z',
    });

    expect(result).toBe('raw');
    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache).toHaveLength(1);
  });

  it('preserves existing activity fields on merge (enriched)', () => {
    const existing = makeActivity({
      id: 'activity-1',
      description: 'Local description',
      user: { name: 'Local User', avatar: 'local.jpg' },
    });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [existing]);

    handleActivityInsert(queryClient, {
      id: 'activity-1',
      updated_at: '2026-03-13',
      title: 'Server Title',
      date: '2026-03-13T10:00:00Z',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    // Spread order: { ...existing, ...normalized } means server fields override
    expect(cache?.[0].title).toBe('Server Title');
    // Fields not in server payload are preserved from existing
    expect(cache?.[0].description).toBe('Local description');
  });
});
