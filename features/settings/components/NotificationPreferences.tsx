'use client'

import React from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useNotificationPreferences,
  NOTIFICATION_EVENTS,
  type NotificationEventKey,
} from '@/features/settings/hooks/useNotificationPreferences'

export function NotificationPreferences() {
  const { preferences, updatePreference, isLoading } = useNotificationPreferences()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Carregando preferencias...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-semibold">Notificacoes</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure quais eventos geram notificacoes para voce.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border dark:border-white/10 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Eventos de Negocio
        </h3>

        <div className="divide-y divide-border dark:divide-white/10">
          {NOTIFICATION_EVENTS.map(event => (
            <div
              key={event.key}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{event.label}</p>
              </div>
              <Button
                type="button"
                role="switch"
                aria-checked={preferences[event.key]}
                aria-label={`${event.label}: ${preferences[event.key] ? 'ativado' : 'desativado'}`}
                onClick={() =>
                  updatePreference(event.key as NotificationEventKey, !preferences[event.key])
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 p-0 ${
                  preferences[event.key]
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : 'bg-gray-300 dark:bg-white/20 hover:bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    preferences[event.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
