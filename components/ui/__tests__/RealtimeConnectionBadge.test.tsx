import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RealtimeConnectionBadge } from '../RealtimeConnectionBadge';

describe('RealtimeConnectionBadge', () => {
  it('renders connected state with green dot and correct aria-label', () => {
    render(<RealtimeConnectionBadge status="connected" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Realtime conectado');
    expect(badge.querySelector('span')).toHaveClass('bg-green-500');
  });

  it('renders disconnected state with red dot and correct aria-label', () => {
    render(<RealtimeConnectionBadge status="disconnected" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Realtime desconectado');
    expect(badge.querySelector('span')).toHaveClass('bg-red-500');
  });

  it('renders reconnecting state with yellow pulsing dot and correct aria-label', () => {
    render(<RealtimeConnectionBadge status="reconnecting" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Reconectando...');
    const dot = badge.querySelector('span');
    expect(dot).toHaveClass('bg-yellow-500');
    expect(dot).toHaveClass('animate-pulse');
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    render(<RealtimeConnectionBadge status="connected" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('has title attribute matching aria-label for tooltip', () => {
    render(<RealtimeConnectionBadge status="disconnected" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('title', 'Realtime desconectado');
  });
});
