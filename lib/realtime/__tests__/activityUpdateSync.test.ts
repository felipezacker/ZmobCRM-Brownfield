import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { handleActivityUpdate } from '../activityUpdateSync';
import { queryKeys } from '@/lib/query/queryKeys';
import type { Activity } from '@/types';

vi.mock('../normalizeActivityPayload', () => ({
  normalizeActivityPayload: (data: Record<string, unknown>) => ({ ...data }),
}));

const makeActivity = (overrides: Partial<Activity & { updatedAt: string }> = {}): Activity & { updatedAt: string } => ({
  id: 'activity-1',
  dealId: 'deal-1',
  contactId: 'contact-1',
  dealTitle: 'Test Deal',
  type: 'TASK',
  title: 'Test Activity',
  date: '2026-03-13T10:00:00Z',
  user: { name: 'Test User', avatar: '' },
  completed: false,
  updatedAt: '2026-03-13T10:00:00Z',
  ...overrides,
});

describe('handleActivityUpdate', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('updates activity in cache with new fields (AC-1)', () => {
    const activity = makeActivity({ id: 'activity-1', updatedAt: '2026-03-13T10:00:00Z' });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [activity]);

    handleActivityUpdate(queryClient, {
      id: 'activity-1',
      title: 'Updated Title',
      updated_at: '2026-03-13T11:00:00Z',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache?.[0].title).toBe('Updated Title');
  });

  it('rejects stale update with older timestamp (AC-2)', () => {
    const activity = makeActivity({ id: 'activity-1', updatedAt: '2026-03-13T12:00:00Z' });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [activity]);

    handleActivityUpdate(queryClient, {
      id: 'activity-1',
      title: 'Stale Title',
      updated_at: '2026-03-13T10:00:00Z',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache?.[0].title).toBe('Test Activity');
  });

  it('re-sorts when date changes to overdue (AC-7)', () => {
    const futureActivity = makeActivity({
      id: 'activity-1',
      date: '2099-12-31T10:00:00Z',
      updatedAt: '2026-03-13T10:00:00Z',
    });
    const overdueActivity = makeActivity({
      id: 'activity-2',
      date: '2020-01-01T10:00:00Z',
      updatedAt: '2026-03-13T10:00:00Z',
    });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [futureActivity, overdueActivity]);

    handleActivityUpdate(queryClient, {
      id: 'activity-1',
      date: '2020-01-02T10:00:00Z',
      updated_at: '2026-03-13T11:00:00Z',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    // Both overdue now — activity-2 (2020-01-01) should come before activity-1 (2020-01-02)
    expect(cache?.[0].id).toBe('activity-2');
    expect(cache?.[1].id).toBe('activity-1');
  });

  it('does not modify cache when activity not found', () => {
    const activity = makeActivity({ id: 'activity-1' });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [activity]);

    handleActivityUpdate(queryClient, {
      id: 'activity-999',
      title: 'Unknown',
      updated_at: '2026-03-14',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache).toHaveLength(1);
    expect(cache?.[0].id).toBe('activity-1');
    expect(cache?.[0].title).toBe('Test Activity');
  });

  it('returns undefined on empty cache', () => {
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), undefined);

    handleActivityUpdate(queryClient, {
      id: 'activity-1',
      title: 'No Cache',
      updated_at: '2026-03-14',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache).toBeUndefined();
  });

  it('preserves existing fields not in payload (merge behavior)', () => {
    const activity = makeActivity({
      id: 'activity-1',
      description: 'Keep this',
      updatedAt: '2026-03-13T10:00:00Z',
    });
    queryClient.setQueryData<Activity[]>(queryKeys.activities.lists(), [activity]);

    handleActivityUpdate(queryClient, {
      id: 'activity-1',
      completed: true,
      updated_at: '2026-03-13T11:00:00Z',
    });

    const cache = queryClient.getQueryData<Activity[]>(queryKeys.activities.lists());
    expect(cache?.[0].completed).toBe(true);
    expect(cache?.[0].description).toBe('Keep this');
  });
});
