'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

/**
 * 5 business notification events configurable by the user (ST-4.2).
 * System events (BIRTHDAY, CHURN_ALERT, etc.) are NOT configurable here.
 */
export const NOTIFICATION_EVENTS = [
  { key: 'DEAL_ASSIGNED', label: 'Novo deal atribuido' },
  { key: 'DEAL_WON', label: 'Deal ganho' },
  { key: 'DEAL_LOST', label: 'Deal perdido' },
  { key: 'TASK_CREATED', label: 'Nova tarefa criada' },
  { key: 'NOTE_MENTION', label: 'Mencao em nota' },
] as const

export type NotificationEventKey = typeof NOTIFICATION_EVENTS[number]['key']

type Preferences = Record<string, boolean>

/**
 * Checks if an event is enabled in the user's notification preferences.
 * Empty JSONB ({}) or missing key means the event is enabled (AC4).
 */
export function isEventEnabled(
  preferences: Preferences,
  eventKey: NotificationEventKey,
): boolean {
  return preferences[eventKey] !== false
}

export function useNotificationPreferences() {
  const { profile } = useAuth()
  const [preferences, setPreferences] = useState<Preferences>({})
  const [isLoading, setIsLoading] = useState(true)
  const prefsRef = useRef<Preferences>({})

  // Keep ref in sync with state
  prefsRef.current = preferences

  // Load preferences
  useEffect(() => {
    if (!profile?.id || !supabase) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      const { data, error } = await supabase!
        .from('user_settings')
        .select('notification_preferences')
        .eq('user_id', profile!.id)
        .single()

      if (cancelled) return

      if (!error && data) {
        const loaded = (data as { notification_preferences?: Preferences }).notification_preferences ?? {}
        setPreferences(loaded)
        prefsRef.current = loaded
      }
      setIsLoading(false)
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Update a single preference (toggle)
  const updatePreference = useCallback(
    async (eventKey: NotificationEventKey, enabled: boolean) => {
      if (!profile?.id || !supabase) return

      // Build new JSONB from ref (avoids stale closure race condition)
      const newPrefs = { ...prefsRef.current }
      if (enabled) {
        delete newPrefs[eventKey]
      } else {
        newPrefs[eventKey] = false
      }

      // Update ref + state atomically
      prefsRef.current = newPrefs
      setPreferences(newPrefs)

      await supabase
        .from('user_settings')
        .upsert(
          { user_id: profile.id, notification_preferences: newPrefs },
          { onConflict: 'user_id' },
        )
    },
    [profile?.id],
  )

  // Derive per-event boolean (true = enabled)
  const eventStates: Record<NotificationEventKey, boolean> = {} as Record<NotificationEventKey, boolean>
  for (const event of NOTIFICATION_EVENTS) {
    eventStates[event.key] = isEventEnabled(preferences, event.key)
  }

  return { preferences: eventStates, updatePreference, isLoading }
}
