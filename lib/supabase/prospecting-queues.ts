/**
 * @fileoverview Serviço Supabase para prospecting_queues (CP-1.1)
 *
 * Layer pattern: lib/supabase/ → raw Supabase calls
 * Consumed by: lib/query/hooks/useProspectingQueueQuery.ts
 */

import { supabase } from './client';
import { sanitizeUUID } from './utils';
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types';
import { PROSPECTING_CONFIG } from '@/features/prospecting/prospecting-config';

// ============================================
// HELPERS
// ============================================

/**
 * Calculate next shift for retry scheduling.
 * Weekday before 13h → same day 14:00. Weekday after 13h → next day 09:00.
 * Saturday (any) → Monday 09:00. Sunday (any) → Monday 09:00.
 * Friday afternoon → Saturday 09:00 (normal flow, no weekend skip).
 */
export function calculateNextShift(now: Date): Date {
  const { RETRY_SHIFT_MORNING_HOUR, RETRY_SHIFT_AFTERNOON_HOUR, RETRY_SHIFT_CUTOFF_HOUR } = PROSPECTING_CONFIG
  const day = now.getDay()
  const result = new Date(now)
  result.setMinutes(0, 0, 0)

  // Saturday or Sunday → Monday morning
  if (day === 6) {
    result.setDate(result.getDate() + 2)
    result.setHours(RETRY_SHIFT_MORNING_HOUR)
    return result
  }
  if (day === 0) {
    result.setDate(result.getDate() + 1)
    result.setHours(RETRY_SHIFT_MORNING_HOUR)
    return result
  }

  // Weekday
  if (now.getHours() < RETRY_SHIFT_CUTOFF_HOUR) {
    result.setHours(RETRY_SHIFT_AFTERNOON_HOUR)
  } else {
    result.setDate(result.getDate() + 1)
    result.setHours(RETRY_SHIFT_MORNING_HOUR)
  }

  return result
}

let cachedOrgUserId: string | null = null;
let cachedOrgId: string | null = null;

async function getOrganizationId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (cachedOrgUserId === user.id && cachedOrgId) return cachedOrgId;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const orgId = (profile as { organization_id?: string } | null)?.organization_id ?? null;
  cachedOrgUserId = user.id;
  cachedOrgId = orgId;
  return orgId;
}

// ============================================
// TRANSFORM
// ============================================

interface DbQueueItem {
  id: string;
  contact_id: string;
  owner_id: string;
  organization_id: string;
  status: string;
  position: number;
  session_id: string | null;
  assigned_by: string | null;
  retry_at: string | null;
  retry_count: number;
  skip_reason: string | null;
  created_at: string;
  updated_at: string;
  contacts?: {
    name: string;
    phone: string | null;
    stage: string | null;
    temperature: string | null;
    email: string | null;
    lead_score: number | null;
    contact_phones?: Array<{
      phone_number: string;
      is_primary: boolean;
    }>;
  } | null;
}

const transformQueueItem = (db: DbQueueItem): ProspectingQueueItem => ({
  id: db.id,
  contactId: db.contact_id,
  ownerId: db.owner_id,
  organizationId: db.organization_id,
  status: db.status as ProspectingQueueStatus,
  position: db.position,
  sessionId: db.session_id || undefined,
  assignedBy: db.assigned_by || undefined,
  retryAt: db.retry_at || undefined,
  retryCount: db.retry_count ?? 0,
  skipReason: db.skip_reason || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  contactName: db.contacts?.name,
  contactPhone: db.contacts?.contact_phones?.find(p => p.is_primary)?.phone_number
    || db.contacts?.contact_phones?.[0]?.phone_number
    || db.contacts?.phone
    || undefined,
  contactStage: db.contacts?.stage || undefined,
  contactTemperature: db.contacts?.temperature || undefined,
  contactEmail: db.contacts?.email || undefined,
  leadScore: db.contacts?.lead_score ?? null,
});

// ============================================
// SERVICE
// ============================================

export const prospectingQueuesService = {
  /**
   * Get all queue items for the current user's active session (or all pending).
   */
  async getQueue(sessionId?: string, ownerId?: string): Promise<{ data: ProspectingQueueItem[] | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      let query = sb
        .from('prospecting_queues')
        .select(`
          *,
          contacts!inner (
            name,
            phone,
            stage,
            temperature,
            email,
            lead_score,
            contact_phones (phone_number, is_primary)
          )
        `)
        .order('position', { ascending: true });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      return {
        data: (data || []).map(d => transformQueueItem(d as unknown as DbQueueItem)),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Add a contact to the queue.
   */
  async addToQueue(contactId: string, sessionId?: string): Promise<{ data: ProspectingQueueItem | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const orgId = await getOrganizationId();
      if (!orgId) return { data: null, error: new Error('Organização não encontrada') };

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { data: null, error: new Error('Usuário não autenticado') };

      // Get max position
      const { data: maxPos } = await sb
        .from('prospecting_queues')
        .select('position')
        .eq('owner_id', user.id)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = maxPos ? (maxPos as { position: number }).position + 1 : 0;

      const { data, error } = await sb
        .from('prospecting_queues')
        .insert({
          contact_id: sanitizeUUID(contactId),
          owner_id: user.id,
          organization_id: orgId,
          status: 'pending',
          position: nextPosition,
          session_id: sessionId || null,
          assigned_by: user.id,
        })
        .select(`
          *,
          contacts!inner (
            name,
            phone,
            stage,
            temperature,
            email,
            lead_score,
            contact_phones (phone_number, is_primary)
          )
        `)
        .single();

      if (error) return { data: null, error };
      return { data: transformQueueItem(data as unknown as DbQueueItem), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Update queue item status.
   */
  async updateStatus(id: string, status: ProspectingQueueStatus, skipReason?: string): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const updateData: Record<string, unknown> = { status }
      if (status === 'skipped' && skipReason) {
        updateData.skip_reason = skipReason
      }

      const { error } = await sb
        .from('prospecting_queues')
        .update(updateData)
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Remove a contact from the queue.
   */
  async removeFromQueue(id: string): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const { error } = await sb
        .from('prospecting_queues')
        .delete()
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Clear completed/skipped items from queue.
   */
  async clearCompleted(): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { error: new Error('Usuário não autenticado') };

      const { error } = await sb
        .from('prospecting_queues')
        .delete()
        .eq('owner_id', user.id)
        .in('status', ['completed', 'skipped']);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Clear ALL items from queue for a specific owner (or current user).
   * Used by "Limpar fila" action.
   */
  async clearAll(ownerId?: string): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { error: new Error('Usuário não autenticado') };

      const targetOwnerId = ownerId || user.id;

      const { error } = await sb
        .from('prospecting_queues')
        .delete()
        .eq('owner_id', targetOwnerId);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Assign session_id to all pending items.
   * Skipped items from previous sessions are re-queued at the end (CP-4.2).
   */
  async startSession(): Promise<{ data: string | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { data: null, error: new Error('Usuário não autenticado') };

      const sessionId = crypto.randomUUID();

      // Step 1: Get MAX(position) of pending items
      const { data: maxPendingPos, error: maxPosError } = await sb
        .from('prospecting_queues')
        .select('position')
        .eq('owner_id', user.id)
        .eq('status', 'pending')
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxPosError) return { data: null, error: maxPosError };
      const maxPosition = maxPendingPos ? (maxPendingPos as { position: number }).position : -1;

      // Step 2: Get all skipped items ordered by position (preserve relative order)
      const { data: skippedItems, error: skippedError } = await sb
        .from('prospecting_queues')
        .select('id')
        .eq('owner_id', user.id)
        .eq('status', 'skipped')
        .order('position', { ascending: true });

      if (skippedError) return { data: null, error: skippedError };

      // Step 3: Reset skipped → pending with positions after max pending
      if (skippedItems && skippedItems.length > 0) {
        for (let i = 0; i < skippedItems.length; i++) {
          const item = skippedItems[i] as { id: string };
          const { error: resetError } = await sb
            .from('prospecting_queues')
            .update({ status: 'pending', position: maxPosition + i + 1 })
            .eq('id', item.id);
          if (resetError) return { data: null, error: resetError };
        }
      }

      // Step 4: Assign session_id to all pending items (including ex-skipped)
      const { error } = await sb
        .from('prospecting_queues')
        .update({ session_id: sessionId })
        .eq('owner_id', user.id)
        .eq('status', 'pending');

      if (error) return { data: null, error };
      return { data: sessionId, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Add multiple contacts to queue in batch (CP-1.3).
   * Skips duplicates (contacts already in queue for the target owner).
   * Supports director assigning queue to a specific corretor.
   */
  async addBatchToQueue(
    contactIds: string[],
    targetOwnerId?: string
  ): Promise<{ data: { added: number; skipped: number } | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const orgId = await getOrganizationId();
      if (!orgId) return { data: null, error: new Error('Organização não encontrada') };

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { data: null, error: new Error('Usuário não autenticado') };

      const ownerId = targetOwnerId || user.id;
      const assignedBy = targetOwnerId && targetOwnerId !== user.id ? user.id : null;

      // Get existing queue contact_ids for this owner to skip duplicates
      const { data: existing } = await sb
        .from('prospecting_queues')
        .select('contact_id')
        .eq('owner_id', ownerId)
        .in('status', ['pending', 'in_progress']);

      const existingSet = new Set((existing || []).map(e => (e as { contact_id: string }).contact_id));

      // Filter out duplicates
      const newContactIds = contactIds.filter(id => !existingSet.has(id));

      if (newContactIds.length === 0) {
        return { data: { added: 0, skipped: contactIds.length }, error: null };
      }

      // Hard limit: never exceed configured max items in queue
      const currentCount = existingSet.size;
      const maxNew = Math.max(0, PROSPECTING_CONFIG.QUEUE_MAX_CONTACTS - currentCount);
      const limitedContactIds = newContactIds.slice(0, maxNew);

      if (limitedContactIds.length === 0) {
        return { data: { added: 0, skipped: contactIds.length }, error: null };
      }

      // Get max position for this owner
      const { data: maxPos } = await sb
        .from('prospecting_queues')
        .select('position')
        .eq('owner_id', ownerId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextPosition = maxPos ? (maxPos as { position: number }).position + 1 : 0;

      // Build batch insert rows
      const rows = limitedContactIds.map(contactId => ({
        contact_id: sanitizeUUID(contactId),
        owner_id: ownerId,
        organization_id: orgId,
        status: 'pending' as const,
        position: nextPosition++,
        session_id: null,
        assigned_by: assignedBy,
      }));

      const { error } = await sb.from('prospecting_queues').insert(rows);

      if (error) return { data: null, error };

      return {
        data: { added: limitedContactIds.length, skipped: contactIds.length - limitedContactIds.length },
        error: null,
      };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Schedule a retry for a queue item (CP-2.1).
   * Sets status to retry_pending, increments retry_count, sets retry_at.
   * If retry_count >= 3, sets status to exhausted instead.
   */
  async scheduleRetry(id: string): Promise<{ data: { exhausted: boolean; retryAt?: string } | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      // Get current retry_count
      const { data: current, error: fetchError } = await sb
        .from('prospecting_queues')
        .select('retry_count')
        .eq('id', id)
        .single();

      if (fetchError) return { data: null, error: fetchError };

      const currentCount = (current as { retry_count?: number })?.retry_count ?? 0;
      const newCount = currentCount + 1;

      if (newCount >= 3) {
        // Exhausted — no more retries
        const { error } = await sb
          .from('prospecting_queues')
          .update({ status: 'exhausted', retry_count: newCount, retry_at: null })
          .eq('id', id);
        return { data: { exhausted: true }, error };
      }

      // Schedule retry for next shift
      const retryAt = calculateNextShift(new Date());

      const { error } = await sb
        .from('prospecting_queues')
        .update({
          status: 'retry_pending',
          retry_count: newCount,
          retry_at: retryAt.toISOString(),
        })
        .eq('id', id);

      return { data: { exhausted: false, retryAt: retryAt.toISOString() }, error };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Activate retries that are ready (retry_at <= now) — CP-2.1.
   * Moves retry_pending items back to pending status.
   */
  async activateReadyRetries(ownerId?: string): Promise<{ data: number | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { data: null, error: new Error('Usuário não autenticado') };

      const targetOwnerId = ownerId || user.id;

      const { data, error } = await sb
        .from('prospecting_queues')
        .update({ status: 'pending', retry_at: null })
        .eq('owner_id', targetOwnerId)
        .eq('status', 'retry_pending')
        .lte('retry_at', new Date().toISOString())
        .select('id');

      if (error) return { data: null, error };
      return { data: (data || []).length, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Reset an exhausted queue item (CP-2.1).
   * Zeroes retry_count and sets status back to pending.
   */
  async resetRetry(id: string): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const { error } = await sb
        .from('prospecting_queues')
        .update({ status: 'pending', retry_count: 0, retry_at: null })
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Get contact_ids currently in queue for a given owner (CP-1.3).
   * Used to show "Na fila" badge and prevent duplicates.
   */
  async getQueueContactIds(ownerId?: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      let query = sb
        .from('prospecting_queues')
        .select('contact_id')
        .in('status', ['pending', 'in_progress']);

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      return { data: (data || []).map(d => (d as { contact_id: string }).contact_id), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Remove múltiplos itens da fila em batch (CP-4.5).
   */
  async removeItems(ids: string[]): Promise<{ data: { removed: number } | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };
      if (ids.length === 0) return { data: { removed: 0 }, error: null };

      const { error, count } = await sb
        .from('prospecting_queues')
        .delete({ count: 'exact' })
        .in('id', ids);

      if (error) return { data: null, error };
      return { data: { removed: count ?? ids.length }, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Move itens selecionados para o topo da fila (CP-4.5).
   * Reordena por posição mantendo a ordem relativa dos demais.
   */
  async moveToTop(ids: string[], ownerId: string): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };
      if (ids.length === 0) return { error: null };

      // Busca todos os itens do owner ordenados por posição
      const { data: allItems, error: fetchError } = await sb
        .from('prospecting_queues')
        .select('id, position')
        .eq('owner_id', ownerId)
        .order('position', { ascending: true });

      if (fetchError) return { error: fetchError };
      if (!allItems || allItems.length === 0) return { error: null };

      const selectedSet = new Set(ids);
      const selected = allItems.filter(i => selectedSet.has(i.id));
      const rest = allItems.filter(i => !selectedSet.has(i.id));
      const reordered = [...selected, ...rest];

      // Atualiza posições via RPC atômico (RT-4.2)
      const updates = reordered.map((item, index) => ({ id: item.id, position: index }));
      const { error } = await sb.rpc('batch_update_queue_positions', {
        p_updates: JSON.stringify(updates),
      });
      if (error) return { error: new Error(error.message) };

      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Atualiza posições dos itens da fila (CP-4.7).
   * Usado para persistir reordenação via drag-and-drop.
   * Otimizado: single RPC call em vez de N queries paralelas.
   */
  async updatePositions(updates: { id: string; position: number }[]): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };
      if (updates.length === 0) return { error: null };

      const { error } = await sb.rpc('batch_update_queue_positions', {
        p_updates: JSON.stringify(updates),
      });

      if (error) {
        // Fallback to parallel updates if RPC doesn't exist yet
        if (error.message?.includes('function') || error.code === '42883') {
          const results = await Promise.all(
            updates.map(update =>
              sb.from('prospecting_queues')
                .update({ position: update.position })
                .eq('id', update.id)
            )
          );
          const firstError = results.find(r => r.error);
          if (firstError?.error) return { error: new Error(firstError.error.message) };
          return { error: null };
        }
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  },
};
