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
  async getQueue(sessionId?: string): Promise<{ data: ProspectingQueueItem[] | null; error: Error | null }> {
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
};
