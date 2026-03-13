import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks (vi.hoisted so vi.mock factories can reference them) ───

const mocks = vi.hoisted(() => ({
  removeChannel: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  channel: vi.fn(),
  shouldProcessInsert: vi.fn(() => true),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: mocks.channel.mockImplementation(() => ({
      on: mocks.on.mockReturnThis(),
      subscribe: mocks.subscribe,
    })),
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock('@/lib/realtime/realtimeConfig', () => ({
  DEBUG_REALTIME: false,
  getTableQueryKeys: vi.fn((table: string) => [[table]]),
  shouldProcessInsert: mocks.shouldProcessInsert,
}));

vi.mock('@/lib/realtime/dealInsertSync', () => ({
  handleDealInsert: vi.fn(),
}));

vi.mock('@/lib/realtime/dealUpdateSync', () => ({
  handleDealUpdate: vi.fn(),
}));

vi.mock('@/lib/realtime/contactInsertSync', () => ({
  handleContactInsert: vi.fn(),
}));

vi.mock('@/lib/realtime/contactUpdateSync', () => ({
  handleContactUpdate: vi.fn(),
}));

vi.mock('@/lib/realtime/activityInsertSync', () => ({
  handleActivityInsert: vi.fn(),
}));

vi.mock('@/lib/realtime/activityUpdateSync', () => ({
  handleActivityUpdate: vi.fn(),
}));

import { useRealtimeSync } from '../useRealtimeSync';

// ── Helpers ──────────────────────────────────────────────

type PayloadCallback = (payload: Record<string, unknown>) => void;

let subscribeCallback: ((status: string) => void) | null = null;
const tableCallbacks = new Map<string, PayloadCallback>();

let queryClient: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  subscribeCallback = null;
  tableCallbacks.clear();
  mocks.shouldProcessInsert.mockClear().mockReturnValue(true);
  mocks.on.mockClear().mockImplementation(function (this: unknown, _event: string, filter: { table: string }, cb: PayloadCallback) {
    tableCallbacks.set(filter.table, cb);
    return this;
  });
  mocks.subscribe.mockClear().mockImplementation((cb: (status: string) => void) => { subscribeCallback = cb; });
  mocks.removeChannel.mockClear();
  mocks.channel.mockClear().mockImplementation(() => ({
    on: mocks.on,
    subscribe: mocks.subscribe,
  }));
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

function createWrapper() {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

function makeInsertPayload(table: string, id: string, updatedAt?: string) {
  return {
    eventType: 'INSERT',
    new: { id, updated_at: updatedAt ?? null },
    old: {},
    table,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('useRealtimeSync generic INSERT dedup (RT-4.3)', () => {
  it('calls shouldProcessInsert with correct key format for generic tables', () => {
    renderHook(() => useRealtimeSync('board_stages'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('board_stages');
    expect(cb).toBeDefined();

    act(() => cb!(makeInsertPayload('board_stages', 'stage-1', '2026-03-13T10:00:00Z')));

    expect(mocks.shouldProcessInsert).toHaveBeenCalledWith('board_stages-stage-1-2026-03-13T10:00:00Z');
  });

  it('uses empty string fallback when updated_at is missing', () => {
    renderHook(() => useRealtimeSync('boards'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('boards');
    act(() => cb!(makeInsertPayload('boards', 'board-1')));

    expect(mocks.shouldProcessInsert).toHaveBeenCalledWith('boards-board-1-');
  });

  it('discards duplicate INSERT when shouldProcessInsert returns false', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('prospecting_queues'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('prospecting_queues');

    // First INSERT — shouldProcessInsert returns true
    mocks.shouldProcessInsert.mockReturnValueOnce(true);
    await act(async () => {
      cb!(makeInsertPayload('prospecting_queues', 'pq-1', '2026-03-13'));
      await Promise.resolve(); // flush queueMicrotask
    });

    expect(invalidateSpy).toHaveBeenCalled();
    invalidateSpy.mockClear();

    // Second INSERT (duplicate) — shouldProcessInsert returns false
    mocks.shouldProcessInsert.mockReturnValueOnce(false);
    await act(async () => {
      cb!(makeInsertPayload('prospecting_queues', 'pq-1', '2026-03-13'));
      await Promise.resolve();
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('treats same id across different tables independently', () => {
    renderHook(() => useRealtimeSync(['boards', 'board_stages']), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const boardCb = tableCallbacks.get('boards');
    const stagesCb = tableCallbacks.get('board_stages');

    const sharedId = 'shared-uuid-123';
    const sharedTimestamp = '2026-03-13T12:00:00Z';

    // INSERT on boards
    act(() => boardCb!(makeInsertPayload('boards', sharedId, sharedTimestamp)));

    // INSERT on board_stages with same id
    act(() => stagesCb!(makeInsertPayload('board_stages', sharedId, sharedTimestamp)));

    // shouldProcessInsert must be called with different keys
    expect(mocks.shouldProcessInsert).toHaveBeenCalledWith(`boards-${sharedId}-${sharedTimestamp}`);
    expect(mocks.shouldProcessInsert).toHaveBeenCalledWith(`board_stages-${sharedId}-${sharedTimestamp}`);
  });

  it('first INSERT triggers invalidateQueries; duplicate does not', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('prospecting_saved_queues'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('prospecting_saved_queues');

    // First INSERT — allowed
    mocks.shouldProcessInsert.mockReturnValueOnce(true);
    await act(async () => {
      cb!(makeInsertPayload('prospecting_saved_queues', 'sq-1', '2026-03-13'));
      await Promise.resolve();
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    invalidateSpy.mockClear();

    // Second INSERT — deduplicated
    mocks.shouldProcessInsert.mockReturnValueOnce(false);
    await act(async () => {
      cb!(makeInsertPayload('prospecting_saved_queues', 'sq-1', '2026-03-13'));
      await Promise.resolve();
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('board_stages INSERT with dedup still uses pendingInvalidateOnlyRef path', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('board_stages'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('board_stages');

    mocks.shouldProcessInsert.mockReturnValueOnce(true);
    await act(async () => {
      cb!(makeInsertPayload('board_stages', 'bs-1', '2026-03-13'));
      await Promise.resolve();
    });

    // board_stages uses invalidateOnly path with refetchType based on count
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ refetchType: 'all' })
    );
  });
});
