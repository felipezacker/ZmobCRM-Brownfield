import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { createTestQueryClient, createWrapper as createWrapperFromFactory } from './helpers/queryClientFactory';
import { flushMicrotasks } from './helpers/flushMicrotasks';

// ── Mocks (vi.hoisted so vi.mock factories can reference them) ───

const mocks = vi.hoisted(() => ({
  removeChannel: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  channel: vi.fn(),
  shouldProcessInsert: vi.fn(() => true),
}));

type PayloadCallback = (payload: Record<string, unknown>) => void;

let subscribeCallback: ((status: string) => void) | null = null;
const tableCallbacks = new Map<string, PayloadCallback>();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

// Stable references for query keys — Set dedup relies on reference equality
const stableKeys: Record<string, readonly (readonly unknown[])[]> = {};
function getStableKeys(table: string) {
  if (!stableKeys[table]) stableKeys[table] = [[table]];
  return stableKeys[table];
}

vi.mock('@/lib/realtime/realtimeConfig', () => ({
  DEBUG_REALTIME: false,
  getTableQueryKeys: vi.fn((table: string) => getStableKeys(table)),
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
import { handleDealUpdate } from '../dealUpdateSync';
import { handleDealInsert } from '../dealInsertSync';
import { handleContactUpdate } from '../contactUpdateSync';
import { handleContactInsert } from '../contactInsertSync';
import { handleActivityUpdate } from '../activityUpdateSync';
import { handleActivityInsert } from '../activityInsertSync';

// ── Helpers ──────────────────────────────────────────────

let queryClient: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createTestQueryClient();
  subscribeCallback = null;
  tableCallbacks.clear();
  mocks.shouldProcessInsert.mockClear().mockReturnValue(true);
  mocks.on.mockClear().mockImplementation(function (
    this: unknown,
    _event: string,
    filter: { table: string },
    cb: PayloadCallback,
  ) {
    tableCallbacks.set(filter.table, cb);
    return this;
  });
  mocks.subscribe.mockClear().mockImplementation((cb: (status: string) => void) => {
    subscribeCallback = cb;
  });
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
  return createWrapperFromFactory(queryClient);
}

// ── AC1: Channel lifecycle ──────────────────────────────

describe('useRealtimeSync channel lifecycle (AC1)', () => {
  it('AC1.1: calls supabase.channel() with realtime-sync-{table} name and subscribes', () => {
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    expect(mocks.channel).toHaveBeenCalledTimes(1);
    const channelName = mocks.channel.mock.calls[0][0] as string;
    expect(channelName).toMatch(/^realtime-sync-deals-/);
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
  });

  it('AC1.2: unmount calls supabase.removeChannel()', () => {
    const { unmount } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    expect(mocks.removeChannel).not.toHaveBeenCalled();
    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('AC1.3: enabled=false does not create channel', () => {
    renderHook(() => useRealtimeSync('deals', { enabled: false }), { wrapper: createWrapper() });

    expect(mocks.channel).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it('AC1.4: multi-table calls channel.on() once per table', () => {
    renderHook(() => useRealtimeSync(['deals', 'contacts']), { wrapper: createWrapper() });

    const channelName = mocks.channel.mock.calls[0][0] as string;
    expect(channelName).toMatch(/^realtime-sync-deals-contacts-/);

    expect(mocks.on).toHaveBeenCalledTimes(2);
    const tables = mocks.on.mock.calls.map(
      (call: [string, { table: string }, PayloadCallback]) => call[1].table,
    );
    expect(tables).toContain('deals');
    expect(tables).toContain('contacts');
  });
});

// ── AC2: Debounce on DELETE ──────────────────────────────

describe('useRealtimeSync debounce on DELETE (AC2)', () => {
  function makeDeletePayload(table: string) {
    return {
      eventType: 'DELETE',
      new: {},
      old: { id: 'del-1' },
      table,
    };
  }

  it('AC2.1: DELETE does not invalidate queries immediately', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('contacts'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('contacts');
    act(() => cb!(makeDeletePayload('contacts')));

    // Immediately after event, no invalidation
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('AC2.2: DELETE invalidates queries after debounce timer expires', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('contacts', { debounceMs: 100 }), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('contacts');
    act(() => cb!(makeDeletePayload('contacts')));

    // Before debounce
    expect(invalidateSpy).not.toHaveBeenCalled();

    // After debounce
    act(() => vi.advanceTimersByTime(150));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contacts'] }),
    );
  });

  it('AC2.3: two rapid DELETEs trigger only one invalidation (debounce groups)', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('contacts', { debounceMs: 100 }), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('contacts');
    act(() => cb!(makeDeletePayload('contacts')));
    // 50ms later, another DELETE
    act(() => vi.advanceTimersByTime(50));
    act(() => cb!(makeDeletePayload('contacts')));

    // Wait for debounce from second event
    act(() => vi.advanceTimersByTime(150));

    // Should be called exactly once (debounce resets on second event)
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

// ── AC3: Microtask flush on INSERT ──────────────────────

describe('useRealtimeSync microtask flush on INSERT (AC3)', () => {
  function makeInsertPayload(table: string, id: string) {
    return {
      eventType: 'INSERT',
      new: { id, updated_at: '2026-01-01' },
      old: {},
      table,
    };
  }

  it('AC3.1: non-deal INSERT does not invalidate synchronously, only after microtask', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('boards'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('boards');

    // Fire INSERT synchronously — check no immediate invalidation
    let syncCallCount = 0;
    await act(async () => {
      cb!(makeInsertPayload('boards', 'board-1'));
      syncCallCount = invalidateSpy.mock.calls.length;
      await flushMicrotasks();
    });

    expect(syncCallCount).toBe(0);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('AC3.2: multiple INSERTs in same tick invalidate each unique key once', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync(['boards', 'board_stages']), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const boardCb = tableCallbacks.get('boards');
    const stagesCb = tableCallbacks.get('board_stages');

    await act(async () => {
      boardCb!(makeInsertPayload('boards', 'board-1'));
      stagesCb!(makeInsertPayload('board_stages', 'stage-1'));
      await flushMicrotasks();
    });

    // Both tables should be invalidated
    const calledKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] }).queryKey,
    );
    const flatKeys = calledKeys.map((k) => JSON.stringify(k));
    const uniqueKeys = new Set(flatKeys);

    // Each unique key should appear only once
    expect(uniqueKeys.size).toBe(flatKeys.length);
    // Both tables should be present
    expect(flatKeys.some((k) => k.includes('boards'))).toBe(true);
    expect(flatKeys.some((k) => k.includes('board_stages'))).toBe(true);
  });
});

// ── AC6.1: Race condition — rapid mount/unmount ──────────

describe('useRealtimeSync race conditions (AC6)', () => {
  it('AC6.1: rapid mount/unmount does not throw and handles null channel gracefully', () => {
    expect(() => {
      const { unmount } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
      // Unmount immediately before channel can be fully set up
      unmount();
    }).not.toThrow();

    // removeChannel should be called with the channel object, not null
    if (mocks.removeChannel.mock.calls.length > 0) {
      expect(mocks.removeChannel.mock.calls[0][0]).not.toBeNull();
    }
  });

  it('rapid re-render with changing tables cleans up previous channel', () => {
    const { rerender } = renderHook(
      ({ tables }: { tables: string }) => useRealtimeSync(tables as 'deals' | 'contacts'),
      {
        wrapper: createWrapper(),
        initialProps: { tables: 'deals' },
      },
    );

    const firstChannelCallCount = mocks.channel.mock.calls.length;
    expect(firstChannelCallCount).toBe(1);

    // Change tables — should cleanup old and create new
    rerender({ tables: 'contacts' });

    expect(mocks.removeChannel).toHaveBeenCalled();
    expect(mocks.channel.mock.calls.length).toBeGreaterThan(firstChannelCallCount);
  });
});

// ── Event dispatch to handlers ──────────────────────────

describe('useRealtimeSync event dispatch', () => {
  function makePayload(eventType: string, table: string, newData: Record<string, unknown>) {
    return { eventType, new: newData, old: {}, table };
  }

  it('deal UPDATE dispatches to handleDealUpdate', () => {
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('deals');
    const newData = { id: 'deal-1', stage_id: 'stage-b', updated_at: '2026-01-01' };
    act(() => cb!(makePayload('UPDATE', 'deals', newData)));

    expect(handleDealUpdate).toHaveBeenCalledWith(
      queryClient,
      newData,
      {},
    );
  });

  it('deal INSERT dispatches to handleDealInsert', () => {
    vi.mocked(handleDealInsert).mockReturnValue('enriched');
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('deals');
    const newData = { id: 'deal-1', updated_at: '2026-01-01', title: 'New' };
    act(() => cb!(makePayload('INSERT', 'deals', newData)));

    expect(handleDealInsert).toHaveBeenCalledWith(queryClient, newData);
  });

  it('deal INSERT "raw" schedules microtask invalidation', async () => {
    vi.mocked(handleDealInsert).mockReturnValue('raw');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('deals');
    await act(async () => {
      cb!(makePayload('INSERT', 'deals', { id: 'deal-1', updated_at: '2026-01-01' }));
      await flushMicrotasks();
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('deal INSERT "enriched" does NOT schedule invalidation', async () => {
    vi.mocked(handleDealInsert).mockReturnValue('enriched');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('deals');
    await act(async () => {
      cb!(makePayload('INSERT', 'deals', { id: 'deal-1', updated_at: '2026-01-01' }));
      await flushMicrotasks();
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('deal INSERT false (deduplicated) does NOT schedule invalidation', async () => {
    vi.mocked(handleDealInsert).mockReturnValue(false);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    invalidateSpy.mockClear();

    const cb = tableCallbacks.get('deals');
    await act(async () => {
      cb!(makePayload('INSERT', 'deals', { id: 'deal-1', updated_at: '2026-01-01' }));
      await flushMicrotasks();
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('contact UPDATE dispatches to handleContactUpdate', () => {
    renderHook(() => useRealtimeSync('contacts'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('contacts');
    const newData = { id: 'c-1', name: 'Updated' };
    act(() => cb!(makePayload('UPDATE', 'contacts', newData)));

    expect(handleContactUpdate).toHaveBeenCalledWith(queryClient, newData, {});
  });

  it('contact INSERT dispatches to handleContactInsert', () => {
    vi.mocked(handleContactInsert).mockReturnValue('enriched');
    renderHook(() => useRealtimeSync('contacts'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('contacts');
    act(() => cb!(makePayload('INSERT', 'contacts', { id: 'c-1' })));

    expect(handleContactInsert).toHaveBeenCalledWith(queryClient, { id: 'c-1' });
  });

  it('activity UPDATE dispatches to handleActivityUpdate', () => {
    renderHook(() => useRealtimeSync('activities'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('activities');
    const newData = { id: 'a-1', type: 'call' };
    act(() => cb!(makePayload('UPDATE', 'activities', newData)));

    expect(handleActivityUpdate).toHaveBeenCalledWith(queryClient, newData);
  });

  it('activity INSERT dispatches to handleActivityInsert', () => {
    vi.mocked(handleActivityInsert).mockReturnValue('enriched');
    renderHook(() => useRealtimeSync('activities'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('activities');
    act(() => cb!(makePayload('INSERT', 'activities', { id: 'a-1' })));

    expect(handleActivityInsert).toHaveBeenCalledWith(queryClient, { id: 'a-1' });
  });
});

// ── sync() function ──────────────────────────────────────

describe('useRealtimeSync sync() function', () => {
  it('sync() invalidates queries for all subscribed tables', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRealtimeSync(['deals', 'contacts']), {
      wrapper: createWrapper(),
    });

    invalidateSpy.mockClear();
    act(() => result.current.sync());

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['deals'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contacts'] }),
    );
  });

  it('sync() works for single table', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRealtimeSync('deals'), {
      wrapper: createWrapper(),
    });

    invalidateSpy.mockClear();
    act(() => result.current.sync());

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['deals'] }),
    );
  });
});

// ── onchange callback ────────────────────────────────────

describe('useRealtimeSync onchange callback', () => {
  it('calls onchange when event is received', () => {
    const onchange = vi.fn();
    renderHook(() => useRealtimeSync('deals', { onchange }), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));

    const cb = tableCallbacks.get('deals');
    const payload = { eventType: 'UPDATE', new: { id: 'd-1' }, old: {}, table: 'deals' };
    act(() => cb!(payload));

    expect(onchange).toHaveBeenCalledWith(payload);
  });
});
