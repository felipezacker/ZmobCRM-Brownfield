'use client';

import React from 'react';
import type { ConnectionStatus } from '@/lib/realtime';

interface RealtimeConnectionBadgeProps {
  status: ConnectionStatus;
}

const STATUS_CONFIG = {
  connected: {
    className: 'bg-green-500',
    label: 'Realtime conectado',
  },
  reconnecting: {
    className: 'bg-yellow-500 animate-pulse',
    label: 'Reconectando...',
  },
  disconnected: {
    className: 'bg-red-500',
    label: 'Realtime desconectado',
  },
} as const;

export function RealtimeConnectionBadge({ status }: RealtimeConnectionBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span role="status" aria-live="polite" aria-label={config.label} title={config.label}>
      <span className={`w-2 h-2 rounded-full inline-block ${config.className}`} />
    </span>
  );
}
