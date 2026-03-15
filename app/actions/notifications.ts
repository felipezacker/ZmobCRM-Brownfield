'use server'

import { createClient } from '@/lib/supabase/server'
import {
  generateAllNotifications,
  getUnreadCount as getUnreadCountService,
  getNotifications as getNotificationsService,
  markAsRead as markAsReadService,
  markAllAsRead as markAllAsReadService,
} from '@/lib/supabase/notifications'
import type { CrmNotification, NotificationType, SystemNotificationType } from '@/types'

export async function generateNotifications(
  orgId: string
): Promise<{ totals: Record<SystemNotificationType, number>; error: string | null }> {
  try {
    const supabase = await createClient()
    const { totals, error } = await generateAllNotifications(orgId, supabase)
    if (error) return { totals: { BIRTHDAY: 0, CHURN_ALERT: 0, DEAL_STAGNANT: 0, SCORE_DROP: 0 }, error: error.message }
    return { totals, error: null }
  } catch (e) {
    return { totals: { BIRTHDAY: 0, CHURN_ALERT: 0, DEAL_STAGNANT: 0, SCORE_DROP: 0 }, error: (e as Error).message }
  }
}

export async function fetchUnreadCount(
  orgId: string,
  ownerId?: string | null
): Promise<{ count: number; error: string | null }> {
  try {
    const supabase = await createClient()
    const { count, error } = await getUnreadCountService(orgId, ownerId, supabase)
    if (error) return { count: 0, error: error.message }
    return { count, error: null }
  } catch (e) {
    return { count: 0, error: (e as Error).message }
  }
}

export async function fetchNotifications(
  orgId: string,
  ownerId?: string | null,
  filters?: { isRead?: boolean; type?: NotificationType; limit?: number }
): Promise<{ data: CrmNotification[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await getNotificationsService(orgId, ownerId, filters, supabase)
    if (error) return { data: [], error: error.message }
    return { data, error: null }
  } catch (e) {
    return { data: [], error: (e as Error).message }
  }
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { error } = await markAsReadService(notificationId, supabase)
    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function markAllNotificationsRead(
  orgId: string,
  ownerId?: string | null
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { error } = await markAllAsReadService(orgId, ownerId, supabase)
    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
