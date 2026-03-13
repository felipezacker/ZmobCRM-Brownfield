'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConnectionStatus } from '@/lib/realtime/useRealtimeSync';

interface RealtimeStatusBannerProps {
  connectionStatus: ConnectionStatus;
  maxRetriesExhausted: boolean;
  onRetry: () => void;
}

const GRACE_PERIOD_MS = 3000;
const AUTO_DISMISS_MS = 3000;

export function RealtimeStatusBanner({
  connectionStatus,
  maxRetriesExhausted,
  onRetry,
}: RealtimeStatusBannerProps) {
  const [visible, setVisible] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef(connectionStatus);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = connectionStatus;

    // Clear pending timers on every status change
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (connectionStatus === 'connected') {
      if (prevStatus !== 'connected' && visible) {
        // Was showing disconnected/reconnecting banner → show "Reconectado" then auto-dismiss
        setShowReconnected(true);
        dismissTimerRef.current = setTimeout(() => {
          setVisible(false);
          setShowReconnected(false);
        }, AUTO_DISMISS_MS);
      } else {
        // Reconnected within grace period or initial mount → stay hidden
        setVisible(false);
        setShowReconnected(false);
      }
    } else {
      // disconnected or reconnecting → show after grace period
      setShowReconnected(false);
      if (!visible) {
        graceTimerRef.current = setTimeout(() => {
          setVisible(true);
        }, GRACE_PERIOD_MS);
      }
    }

    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [connectionStatus, visible]);

  if (!visible) return null;

  const bannerClass = 'fixed left-0 right-0 top-0 z-[var(--z-toast)] md:left-[var(--app-sidebar-width,0px)]';

  if (showReconnected) {
    return (
      <div role="alert" aria-live="polite" className={bannerClass}>
        <div className="bg-success/10 border-b border-success/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-success shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-success">Conexão restaurada.</span>
          </div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'reconnecting') {
    return (
      <div role="alert" aria-live="polite" className={bannerClass}>
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-warning animate-spin shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-warning">Reconectando...</span>
          </div>
        </div>
      </div>
    );
  }

  // disconnected state
  return (
    <div role="alert" aria-live="polite" className={bannerClass}>
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-destructive">
            {maxRetriesExhausted
              ? 'Não foi possível reconectar.'
              : 'Conexão em tempo real perdida.'}
          </span>
          {maxRetriesExhausted && (
            <Button
              type="button"
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="ml-auto text-xs h-7"
            >
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
