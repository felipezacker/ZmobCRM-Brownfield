/**
 * @fileoverview Servico de notificacoes CRM (Story 3.9)
 *
 * Gera e gerencia notificacoes inteligentes:
 * - BIRTHDAY: aniversario de contato
 * - CHURN_ALERT: contato sem interacao ha 30+ dias
 * - DEAL_STAGNANT: deal no mesmo stage ha 15+ dias
 * - SCORE_DROP: lead score caiu mais de 20 pontos
 *
 * @module lib/supabase/notifications
 */

import { supabase } from './client';
import type { CrmNotification, NotificationType, SystemNotificationType } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// DB TYPES & TRANSFORM
// ============================================

interface DbNotification {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  description: string | null;
  contact_id: string | null;
  deal_id: string | null;
  is_read: boolean;
  created_at: string;
  owner_id: string | null;
}

const transformNotification = (db: DbNotification): CrmNotification => ({
  id: db.id,
  organizationId: db.organization_id,
  type: db.type as NotificationType,
  title: db.title,
  description: db.description,
  contactId: db.contact_id,
  dealId: db.deal_id,
  isRead: db.is_read,
  createdAt: db.created_at,
  ownerId: db.owner_id,
});

// ============================================
// DEDUPLICATION HELPER
// ============================================

async function notificationExistsToday(
  sb: SupabaseClient,
  orgId: string,
  type: NotificationType,
  contactId?: string | null,
  dealId?: string | null
): Promise<boolean> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  let query = sb
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('type', type)
    .gte('created_at', `${todayStr}T00:00:00Z`)
    .lt('created_at', `${nextDayStr}T00:00:00Z`);

  if (contactId) query = query.eq('contact_id', contactId);
  if (dealId) query = query.eq('deal_id', dealId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

// ============================================
// NOTIFICATION GENERATORS
// ============================================

/**
 * Gera notificacoes de aniversario para contatos com birth_date = hoje.
 */
export async function generateBirthdayNotifications(
  orgId: string,
  client?: SupabaseClient
): Promise<{ count: number; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { count: 0, error: new Error('Supabase nao configurado') };

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Busca contatos com aniversario hoje (MM-DD match)
    const { data: contacts, error } = await sb
      .from('contacts')
      .select('id, name, owner_id')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .not('birth_date', 'is', null)
      .limit(1000);

    if (error) return { count: 0, error };

    // Filtra contatos cujo birth_date cai hoje (MM-DD) via date parsing
    const birthdayContacts = (contacts || []).filter(c => {
      const bd = (c as { birth_date?: string | null }).birth_date;
      if (!bd) return false;
      const bdDate = new Date(bd);
      if (isNaN(bdDate.getTime())) return false;
      const bdMonth = String(bdDate.getUTCMonth() + 1).padStart(2, '0');
      const bdDay = String(bdDate.getUTCDate()).padStart(2, '0');
      return bdMonth === month && bdDay === day;
    });

    let created = 0;
    for (const contact of birthdayContacts) {
      const exists = await notificationExistsToday(sb, orgId, 'BIRTHDAY', contact.id);
      if (exists) continue;

      await sb.from('notifications').insert({
        organization_id: orgId,
        type: 'BIRTHDAY',
        title: `Hoje e aniversario de ${contact.name}`,
        description: `Aproveite para enviar uma mensagem de parabens!`,
        contact_id: contact.id,
        owner_id: contact.owner_id,
      });
      created++;
    }

    return { count: created, error: null };
  } catch (e) {
    return { count: 0, error: e as Error };
  }
}

/**
 * Gera notificacoes de churn para contatos sem interacao ha 30+ dias.
 */
export async function generateChurnAlertNotifications(
  orgId: string,
  client?: SupabaseClient
): Promise<{ count: number; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { count: 0, error: new Error('Supabase nao configurado') };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: contacts, error } = await sb
      .from('contacts')
      .select('id, name, last_interaction, owner_id')
      .eq('organization_id', orgId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .or(`last_interaction.is.null,last_interaction.lt.${thirtyDaysAgo.toISOString()}`)
      .limit(1000);

    if (error) return { count: 0, error };

    let created = 0;
    for (const contact of contacts || []) {
      const exists = await notificationExistsToday(sb, orgId, 'CHURN_ALERT', contact.id);
      if (exists) continue;

      await sb.from('notifications').insert({
        organization_id: orgId,
        type: 'CHURN_ALERT',
        title: `${contact.name} sem interacao ha 30 dias`,
        description: `Este contato pode estar esfriando. Considere entrar em contato.`,
        contact_id: contact.id,
        owner_id: contact.owner_id,
      });
      created++;
    }

    return { count: created, error: null };
  } catch (e) {
    return { count: 0, error: e as Error };
  }
}

/**
 * Gera notificacoes de deals estagnados (mesmo stage ha 15+ dias).
 */
export async function generateDealStagnantNotifications(
  orgId: string,
  client?: SupabaseClient
): Promise<{ count: number; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { count: 0, error: new Error('Supabase nao configurado') };

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const { data: deals, error } = await sb
      .from('deals')
      .select('id, title, contact_id, owner_id, last_stage_change_date')
      .eq('organization_id', orgId)
      .eq('is_won', false)
      .eq('is_lost', false)
      .is('deleted_at', null)
      .lt('last_stage_change_date', fifteenDaysAgo.toISOString())
      .limit(1000);

    if (error) return { count: 0, error };

    let created = 0;
    for (const deal of deals || []) {
      const exists = await notificationExistsToday(sb, orgId, 'DEAL_STAGNANT', null, deal.id);
      if (exists) continue;

      await sb.from('notifications').insert({
        organization_id: orgId,
        type: 'DEAL_STAGNANT',
        title: `Deal "${deal.title}" estagnado`,
        description: `Este deal esta no mesmo stage ha mais de 15 dias. Considere avancar ou reavaliar.`,
        contact_id: deal.contact_id,
        deal_id: deal.id,
        owner_id: deal.owner_id,
      });
      created++;
    }

    return { count: created, error: null };
  } catch (e) {
    return { count: 0, error: e as Error };
  }
}

/**
 * Gera notificacoes de queda de lead score (> 20 pontos).
 * Depende de Story 3.8 (lead_score column).
 */
export async function generateScoreDropNotifications(
  orgId: string,
  client?: SupabaseClient
): Promise<{ count: number; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { count: 0, error: new Error('Supabase nao configurado') };

    // Use lead_score_history to detect actual drops (>= 20 points) in the last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDrops, error } = await sb
      .from('lead_score_history')
      .select('contact_id, old_score, new_score, change')
      .eq('organization_id', orgId)
      .lt('change', -19) // drops of 20+ points
      .gte('created_at', oneDayAgo)
      .limit(500);

    if (error) return { count: 0, error };

    // Deduplicate by contact_id (keep biggest drop)
    const dropByContact = new Map<string, { old_score: number; new_score: number; change: number }>();
    for (const row of recentDrops || []) {
      const existing = dropByContact.get(row.contact_id);
      if (!existing || row.change < existing.change) {
        dropByContact.set(row.contact_id, row);
      }
    }

    if (dropByContact.size === 0) return { count: 0, error: null };

    // Fetch contact names for notification text
    const contactIds = [...dropByContact.keys()];
    const { data: contacts } = await sb
      .from('contacts')
      .select('id, name, owner_id')
      .in('id', contactIds)
      .is('deleted_at', null);

    let created = 0;
    for (const contact of contacts || []) {
      const drop = dropByContact.get(contact.id);
      if (!drop) continue;

      const exists = await notificationExistsToday(sb, orgId, 'SCORE_DROP', contact.id);
      if (exists) continue;

      await sb.from('notifications').insert({
        organization_id: orgId,
        type: 'SCORE_DROP',
        title: `Lead score de ${contact.name} caiu ${Math.abs(drop.change)} pontos`,
        description: `Score: ${drop.old_score} → ${drop.new_score}. Considere reengajar este contato.`,
        contact_id: contact.id,
        owner_id: contact.owner_id,
      });
      created++;
    }

    return { count: created, error: null };
  } catch (e) {
    return { count: 0, error: e as Error };
  }
}

/**
 * Gera todas as notificacoes para uma organizacao.
 */
export async function generateAllNotifications(
  orgId: string,
  client?: SupabaseClient
): Promise<{ totals: Record<SystemNotificationType, number>; error: Error | null }> {
  const totals: Record<SystemNotificationType, number> = {
    BIRTHDAY: 0,
    CHURN_ALERT: 0,
    DEAL_STAGNANT: 0,
    SCORE_DROP: 0,
  };

  const results = await Promise.allSettled([
    generateBirthdayNotifications(orgId, client),
    generateChurnAlertNotifications(orgId, client),
    generateDealStagnantNotifications(orgId, client),
    generateScoreDropNotifications(orgId, client),
  ]);

  const types: SystemNotificationType[] = ['BIRTHDAY', 'CHURN_ALERT', 'DEAL_STAGNANT', 'SCORE_DROP'];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      totals[types[i]] = result.value.count;
    }
  }

  return { totals, error: null };
}

// ============================================
// CRUD OPERATIONS (Task 3)
// ============================================

/**
 * Conta notificacoes nao-lidas.
 */
export async function getUnreadCount(
  orgId: string,
  ownerId?: string | null,
  client?: SupabaseClient
): Promise<{ count: number; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { count: 0, error: new Error('Supabase nao configurado') };

    let query = sb
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_read', false);

    if (ownerId) query = query.eq('owner_id', ownerId);

    const { count, error } = await query;
    if (error) return { count: 0, error };
    return { count: count ?? 0, error: null };
  } catch (e) {
    return { count: 0, error: e as Error };
  }
}

/**
 * Busca notificacoes com filtros opcionais.
 */
export async function getNotifications(
  orgId: string,
  ownerId?: string | null,
  filters?: { isRead?: boolean; type?: NotificationType; limit?: number },
  client?: SupabaseClient
): Promise<{ data: CrmNotification[]; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { data: [], error: new Error('Supabase nao configurado') };

    let query = sb
      .from('notifications')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (ownerId) query = query.eq('owner_id', ownerId);
    if (filters?.isRead !== undefined) query = query.eq('is_read', filters.isRead);
    if (filters?.type) query = query.eq('type', filters.type);
    query = query.limit(filters?.limit ?? 100);

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: (data || []).map(n => transformNotification(n as DbNotification)), error: null };
  } catch (e) {
    return { data: [], error: e as Error };
  }
}

/**
 * Marca uma notificacao como lida.
 */
export async function markAsRead(
  notificationId: string,
  client?: SupabaseClient
): Promise<{ error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { error: new Error('Supabase nao configurado') };

    const { error } = await sb
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return { error: error ?? null };
  } catch (e) {
    return { error: e as Error };
  }
}

/**
 * Marca todas as notificacoes como lidas para um owner/org.
 */
export async function markAllAsRead(
  orgId: string,
  ownerId?: string | null,
  client?: SupabaseClient
): Promise<{ error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { error: new Error('Supabase nao configurado') };

    let query = sb
      .from('notifications')
      .update({ is_read: true })
      .eq('organization_id', orgId)
      .eq('is_read', false);

    if (ownerId) query = query.eq('owner_id', ownerId);

    const { error } = await query;
    return { error: error ?? null };
  } catch (e) {
    return { error: e as Error };
  }
}

// ============================================
// BUSINESS NOTIFICATIONS (ST-4.2)
// ============================================

import type { BusinessNotificationType } from '@/types';

/**
 * Creates a business notification for a specific user, respecting their
 * notification_preferences. If the user has disabled this event type,
 * no notification is created.
 *
 * JSONB semantics: {} or missing key = event enabled; key = false = disabled.
 */
export async function createBusinessNotification(
  sb: SupabaseClient,
  orgId: string,
  recipientUserId: string,
  eventKey: BusinessNotificationType,
  title: string,
  description?: string,
  metadata?: { contactId?: string; dealId?: string },
): Promise<void> {
  try {
    // 1. Check recipient's notification preferences
    const { data } = await sb
      .from('user_settings')
      .select('notification_preferences')
      .eq('user_id', recipientUserId)
      .single();

    const prefs = (data as { notification_preferences?: Record<string, boolean> } | null)
      ?.notification_preferences ?? {};

    // 2. If preference is explicitly false, skip
    if (prefs[eventKey] === false) return;

    // 3. Insert notification
    await sb.from('notifications').insert({
      organization_id: orgId,
      owner_id: recipientUserId,
      type: eventKey,
      title,
      description: description ?? null,
      contact_id: metadata?.contactId ?? null,
      deal_id: metadata?.dealId ?? null,
    });
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error(`[notifications] Failed to create ${eventKey} notification:`, err);
  }
}
