/**
 * @fileoverview Serviço Supabase para prospecting_queues (CP-1.1)
 *
 * Layer pattern: lib/supabase/ → raw Supabase calls
 * Consumed by: lib/query/hooks/useProspectingQueueQuery.ts
 */

import { supabase } from './client';
import { sanitizeUUID } from './utils';
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types';

// ============================================
// HELPERS
// ============================================

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

  const orgId = (profile as any)?.organization_id as string | null;
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
  created_at: string;
  updated_at: string;
  contacts?: {
    name: string;
    stage: string | null;
    temperature: string | null;
    email: string | null;
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
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  contactName: db.contacts?.name,
  contactPhone: db.contacts?.contact_phones?.find(p => p.is_primary)?.phone_number
    || db.contacts?.contact_phones?.[0]?.phone_number,
  contactStage: db.contacts?.stage || undefined,
  contactTemperature: db.contacts?.temperature || undefined,
  contactEmail: db.contacts?.email || undefined,
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
            stage,
            temperature,
            email,
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

      const nextPosition = maxPos ? (maxPos as any).position + 1 : 0;

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
            stage,
            temperature,
            email,
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
  async updateStatus(id: string, status: ProspectingQueueStatus): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const { error } = await sb
        .from('prospecting_queues')
        .update({ status })
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
   */
  async startSession(): Promise<{ data: string | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { data: null, error: new Error('Usuário não autenticado') };

      const sessionId = crypto.randomUUID();

      const { error } = await sb
        .from('prospecting_queues')
        .update({ session_id: sessionId, status: 'pending' })
        .eq('owner_id', user.id)
        .in('status', ['pending']);

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

      const existingSet = new Set((existing || []).map(e => (e as any).contact_id as string));

      // Filter out duplicates
      const newContactIds = contactIds.filter(id => !existingSet.has(id));

      if (newContactIds.length === 0) {
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

      let nextPosition = maxPos ? (maxPos as any).position + 1 : 0;

      // Build batch insert rows
      const rows = newContactIds.map(contactId => ({
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
        data: { added: newContactIds.length, skipped: contactIds.length - newContactIds.length },
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
  async scheduleRetry(id: string, retryIntervalDays: number): Promise<{ data: { exhausted: boolean } | null; error: Error | null }> {
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

      const currentCount = (current as any)?.retry_count ?? 0;
      const newCount = currentCount + 1;

      if (newCount >= 3) {
        // Exhausted — no more retries
        const { error } = await sb
          .from('prospecting_queues')
          .update({ status: 'exhausted', retry_count: newCount, retry_at: null })
          .eq('id', id);
        return { data: { exhausted: true }, error };
      }

      // Schedule retry
      const retryAt = new Date();
      retryAt.setDate(retryAt.getDate() + retryIntervalDays);

      const { error } = await sb
        .from('prospecting_queues')
        .update({
          status: 'retry_pending',
          retry_count: newCount,
          retry_at: retryAt.toISOString(),
        })
        .eq('id', id);

      return { data: { exhausted: false }, error };
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

      return { data: (data || []).map(d => (d as any).contact_id as string), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },
};
