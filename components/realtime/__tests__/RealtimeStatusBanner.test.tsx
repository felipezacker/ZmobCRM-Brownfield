import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { RealtimeStatusBanner } from '../RealtimeStatusBanner';

// ── Setup ──────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────

describe('RealtimeStatusBanner', () => {
  it('renders null when connectionStatus is connected (initial)', () => {
    const { container } = render(
      <RealtimeStatusBanner connectionStatus="connected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows disconnected banner after 3s grace period', () => {
    render(
      <RealtimeStatusBanner connectionStatus="disconnected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    // Before grace period — not visible
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // After 3s grace period
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Conexão em tempo real perdida.')).toBeInTheDocument();
  });

  it('shows reconnecting banner after 3s grace period', () => {
    render(
      <RealtimeStatusBanner connectionStatus="reconnecting" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Reconectando...')).toBeInTheDocument();
  });

  it('shows retry button when maxRetriesExhausted is true', () => {
    const onRetry = vi.fn();
    render(
      <RealtimeStatusBanner connectionStatus="disconnected" maxRetriesExhausted={true} onRetry={onRetry} />
    );

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Não foi possível reconectar.')).toBeInTheDocument();

    const retryButton = screen.getByText('Tentar novamente');
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does NOT show retry button when maxRetriesExhausted is false', () => {
    render(
      <RealtimeStatusBanner connectionStatus="disconnected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText('Tentar novamente')).not.toBeInTheDocument();
  });

  it('shows "Conexão restaurada." and auto-dismisses after 3s', () => {
    const { rerender } = render(
      <RealtimeStatusBanner connectionStatus="disconnected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    // Show banner
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Reconnect
    rerender(
      <RealtimeStatusBanner connectionStatus="connected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    expect(screen.getByText('Conexão restaurada.')).toBeInTheDocument();

    // Auto-dismiss after 3s
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not show banner if reconnection happens within grace period', () => {
    const { rerender } = render(
      <RealtimeStatusBanner connectionStatus="disconnected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    // Reconnect before grace period ends (within 3s)
    act(() => { vi.advanceTimersByTime(1000); });
    rerender(
      <RealtimeStatusBanner connectionStatus="connected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    // Should not have shown banner
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Even after more time
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has role="alert" and aria-live="polite" on all visible states', () => {
    const { rerender } = render(
      <RealtimeStatusBanner connectionStatus="disconnected" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );
    act(() => { vi.advanceTimersByTime(3000); });
    const alertDisconnected = screen.getByRole('alert');
    expect(alertDisconnected).toHaveAttribute('aria-live', 'polite');

    rerender(
      <RealtimeStatusBanner connectionStatus="reconnecting" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );
    const alertReconnecting = screen.getByRole('alert');
    expect(alertReconnecting).toHaveAttribute('aria-live', 'polite');
  });

  it('transitions from reconnecting to disconnected+exhausted correctly', () => {
    const { rerender } = render(
      <RealtimeStatusBanner connectionStatus="reconnecting" maxRetriesExhausted={false} onRetry={vi.fn()} />
    );

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Reconectando...')).toBeInTheDocument();

    // Retries exhausted
    rerender(
      <RealtimeStatusBanner connectionStatus="disconnected" maxRetriesExhausted={true} onRetry={vi.fn()} />
    );

    expect(screen.getByText('Não foi possível reconectar.')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });
});
