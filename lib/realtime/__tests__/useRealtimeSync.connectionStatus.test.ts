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
}));

let subscribeCallback: ((status: string) => void) | null = null;

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
}));

vi.mock('@/lib/realtime/dealInsertSync', () => ({
  handleDealInsert: vi.fn(),
}));

vi.mock('@/lib/realtime/dealUpdateSync', () => ({
  handleDealUpdate: vi.fn(),
}));

import { useRealtimeSync } from '../useRealtimeSync';

// ── Helpers ──────────────────────────────────────────────

let queryClient: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  subscribeCallback = null;
  mocks.on.mockClear().mockReturnThis();
  mocks.subscribe.mockClear().mockImplementation((cb: (status: string) => void) => { subscribeCallback = cb; });
  mocks.removeChannel.mockClear();
  mocks.channel.mockClear().mockImplementation(() => ({
    on: mocks.on.mockReturnThis(),
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

// ── Tests ──────────────────────────────────────────────

describe('useRealtimeSync connectionStatus', () => {
  it('initial connectionStatus is connected', () => {
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.maxRetriesExhausted).toBe(false);
  });

  it('SUBSCRIBED sets connectionStatus to connected', () => {
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('SUBSCRIBED'));
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('CHANNEL_ERROR sets connectionStatus to reconnecting when retries available', () => {
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('CHANNEL_ERROR'));
    expect(result.current.connectionStatus).toBe('reconnecting');
    expect(result.current.isConnected).toBe(false);
  });

  it('TIMED_OUT sets connectionStatus to reconnecting when retries available', () => {
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });
    act(() => subscribeCallback!('TIMED_OUT'));
    expect(result.current.connectionStatus).toBe('reconnecting');
  });

  it('SUBSCRIBED after disconnect invalidates queries and resets to connected', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    // Disconnect
    act(() => subscribeCallback!('CHANNEL_ERROR'));
    expect(result.current.connectionStatus).toBe('reconnecting');
    invalidateSpy.mockClear();

    // Reconnect
    act(() => subscribeCallback!('SUBSCRIBED'));
    expect(result.current.connectionStatus).toBe('connected');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['deals'], exact: false })
    );
  });

  it('SUBSCRIBED on first connect does NOT invalidate queries', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    // First SUBSCRIBED (initial connect, not reconnection)
    act(() => subscribeCallback!('SUBSCRIBED'));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('maxRetriesExhausted after 5 retry attempts', () => {
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    // 5 errors consume all retries (retryCount goes 0→1→2→3→4→5)
    for (let i = 0; i < 5; i++) {
      act(() => subscribeCallback!('CHANNEL_ERROR'));
    }
    expect(result.current.connectionStatus).toBe('reconnecting');
    expect(result.current.maxRetriesExhausted).toBe(false);

    // 6th error: retryCount=5, 5<5 is false → exhausted
    act(() => subscribeCallback!('CHANNEL_ERROR'));
    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.maxRetriesExhausted).toBe(true);
  });

  it('resetRetry resets retries and sets reconnecting', () => {
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    // Exhaust retries
    for (let i = 0; i < 6; i++) {
      act(() => subscribeCallback!('CHANNEL_ERROR'));
    }
    expect(result.current.maxRetriesExhausted).toBe(true);

    // Reset retry
    act(() => result.current.resetRetry());
    expect(result.current.maxRetriesExhausted).toBe(false);
    expect(result.current.connectionStatus).toBe('reconnecting');
  });

  it('SUBSCRIBED after maxRetriesExhausted resets everything', () => {
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    // Exhaust retries
    for (let i = 0; i < 6; i++) {
      act(() => subscribeCallback!('CHANNEL_ERROR'));
    }
    expect(result.current.maxRetriesExhausted).toBe(true);

    // Successful reconnect
    act(() => subscribeCallback!('SUBSCRIBED'));
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.maxRetriesExhausted).toBe(false);
  });
});
