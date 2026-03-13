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
});

function createWrapper() {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

// ── Tests ──────────────────────────────────────────────

describe('useRealtimeSync online/offline/visibility listeners', () => {
  it('online event sets connectionStatus to connected and invalidates queries', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRealtimeSync(['deals', 'contacts']), { wrapper: createWrapper() });

    // First set offline to see the transition
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.connectionStatus).toBe('disconnected');

    invalidateSpy.mockClear();

    // Online event
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current.connectionStatus).toBe('connected');
    // Should invalidate queries for both tables
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['deals'], exact: false })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contacts'], exact: false })
    );
  });

  it('offline event sets connectionStatus to disconnected without invalidation', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    invalidateSpy.mockClear();
    act(() => { window.dispatchEvent(new Event('offline')); });

    expect(result.current.connectionStatus).toBe('disconnected');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('visibilitychange to visible invalidates queries', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    invalidateSpy.mockClear();

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['deals'], exact: false })
    );
  });

  it('visibilitychange to hidden does NOT invalidate queries', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    invalidateSpy.mockClear();

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('cleanup removes all event listeners (no calls after unmount)', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { unmount } = renderHook(() => useRealtimeSync('deals'), { wrapper: createWrapper() });

    unmount();
    invalidateSpy.mockClear();

    // These should NOT trigger any handler after unmount
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('offline'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('listeners are not registered when enabled=false', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useRealtimeSync('deals', { enabled: false }), { wrapper: createWrapper() });

    invalidateSpy.mockClear();

    act(() => { window.dispatchEvent(new Event('online')); });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
