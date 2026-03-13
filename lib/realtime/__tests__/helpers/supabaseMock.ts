import { vi } from 'vitest';

type PayloadCallback = (payload: Record<string, unknown>) => void;

export interface ChannelMock {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
}

export interface SupabaseMock {
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
}

export interface RealtimeMocks {
  supabase: SupabaseMock;
  subscribeCallback: { current: ((status: string) => void) | null };
  tableCallbacks: Map<string, PayloadCallback>;
  mocks: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    removeChannel: ReturnType<typeof vi.fn>;
    channel: ReturnType<typeof vi.fn>;
  };
  reset: () => void;
}

export function createRealtimeMocks(): RealtimeMocks {
  const state: RealtimeMocks = {
    supabase: null!,
    subscribeCallback: { current: null },
    tableCallbacks: new Map(),
    mocks: {
      on: vi.fn(),
      subscribe: vi.fn(),
      removeChannel: vi.fn(),
      channel: vi.fn(),
    },
    reset: null!,
  };

  function reset() {
    state.subscribeCallback.current = null;
    state.tableCallbacks.clear();

    state.mocks.on.mockClear().mockImplementation(function (
      this: unknown,
      _event: string,
      filter: { table: string },
      cb: PayloadCallback,
    ) {
      state.tableCallbacks.set(filter.table, cb);
      return this;
    });

    state.mocks.subscribe.mockClear().mockImplementation((cb: (status: string) => void) => {
      state.subscribeCallback.current = cb;
    });

    state.mocks.removeChannel.mockClear();

    state.mocks.channel.mockClear().mockImplementation(() => ({
      on: state.mocks.on,
      subscribe: state.mocks.subscribe,
    }));
  }

  state.reset = reset;
  state.supabase = {
    channel: state.mocks.channel,
    removeChannel: state.mocks.removeChannel,
  };

  reset();
  return state;
}
