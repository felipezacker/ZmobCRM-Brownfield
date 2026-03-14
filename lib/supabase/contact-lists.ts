/**
 * @fileoverview Supabase service for contact lists (CL-1).
 *
 * CRUD for contact_lists and contact_list_members tables.
 * All queries are org-scoped via RLS.
 *
 * @module lib/supabase/contact-lists
 */

import { supabase } from './client';
import type { ContactList } from '@/types';

// ============================================
// DB Interfaces
// ============================================

interface DbContactList {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const transformList = (db: DbContactList, memberCount?: number): ContactList => ({
  id: db.id,
  organizationId: db.organization_id,
  name: db.name,
  color: db.color || '#6B7280',
  description: db.description || undefined,
  createdBy: db.created_by || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at || undefined,
  memberCount: memberCount ?? 0,
});

// ============================================
// CONTACT LISTS SERVICE
// ============================================

export const contactListsService = {
  /**
   * Fetch all lists for the user's org with member counts.
   */
  async fetchAll(): Promise<{ data: ContactList[] | null; error: Error | null }> {
    try {
      if (!supabase) return { data: null, error: new Error('Supabase not configured') };

      const { data, error } = await supabase
        .from('contact_lists')
        .select('*, contact_list_members(count)')
        .order('name', { ascending: true });

      if (error) return { data: null, error };

      const lists = (data || []).map((row: Record<string, unknown>) => {
        const members = row.contact_list_members as Array<{ count: number }> | undefined;
        const count = members?.[0]?.count ?? 0;
        return transformList(row as unknown as DbContactList, count);
      });

      return { data: lists, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Create a new contact list.
   */
  async create(params: {
    name: string;
    color?: string;
    description?: string;
    organizationId: string;
    createdBy?: string;
  }): Promise<{ data: ContactList | null; error: Error | null }> {
    try {
      if (!supabase) return { data: null, error: new Error('Supabase not configured') };

      const { data, error } = await supabase
        .from('contact_lists')
        .insert({
          name: params.name,
          color: params.color || '#6B7280',
          description: params.description || null,
          organization_id: params.organizationId,
          created_by: params.createdBy || null,
        })
        .select()
        .single();

      if (error) return { data: null, error };
      return { data: transformList(data as DbContactList, 0), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Update a contact list (name, color, description).
   */
  async update(
    id: string,
    updates: { name?: string; color?: string; description?: string }
  ): Promise<{ error: Error | null }> {
    try {
      if (!supabase) return { error: new Error('Supabase not configured') };

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;

      const { error } = await supabase
        .from('contact_lists')
        .update(dbUpdates)
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Delete a contact list. CASCADE removes members automatically.
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) return { error: new Error('Supabase not configured') };

      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Add contacts to a list (upsert — ignores duplicates via ON CONFLICT).
   */
  async addContacts(
    listId: string,
    contactIds: string[],
    addedBy?: string
  ): Promise<{ error: Error | null }> {
    try {
      if (!supabase) return { error: new Error('Supabase not configured') };
      if (contactIds.length === 0) return { error: null };

      const rows = contactIds.map(contactId => ({
        list_id: listId,
        contact_id: contactId,
        added_by: addedBy || null,
      }));

      const { error } = await supabase
        .from('contact_list_members')
        .upsert(rows, { onConflict: 'list_id,contact_id', ignoreDuplicates: true });

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Remove contacts from a list.
   */
  async removeContacts(
    listId: string,
    contactIds: string[]
  ): Promise<{ error: Error | null }> {
    try {
      if (!supabase) return { error: new Error('Supabase not configured') };
      if (contactIds.length === 0) return { error: null };

      const { error } = await supabase
        .from('contact_list_members')
        .delete()
        .eq('list_id', listId)
        .in('contact_id', contactIds);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Fetch contact IDs that belong to a specific list.
   */
  async fetchContactIdsByList(listId: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      if (!supabase) return { data: null, error: new Error('Supabase not configured') };

      const { data, error } = await supabase
        .from('contact_list_members')
        .select('contact_id')
        .eq('list_id', listId);

      if (error) return { data: null, error };
      return { data: (data || []).map(r => r.contact_id), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Fetch contact IDs that do NOT belong to any list (orphans).
   */
  async fetchContactIdsWithoutList(orgId: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      if (!supabase) return { data: null, error: new Error('Supabase not configured') };

      // Contacts in this org that have no entry in contact_list_members
      const { data, error } = await supabase
        .rpc('get_contacts_without_list', { p_org_id: orgId });

      if (error) {
        // Fallback: if RPC doesn't exist, do it client-side
        // Fetch all contact IDs
        const { data: allContacts, error: allErr } = await supabase
          .from('contacts')
          .select('id')
          .eq('organization_id', orgId)
          .is('deleted_at', null);

        if (allErr) return { data: null, error: allErr };

        // Fetch all contact IDs that are in at least one list
        const { data: membered, error: memErr } = await supabase
          .from('contact_list_members')
          .select('contact_id');

        if (memErr) return { data: null, error: memErr };

        const memberedSet = new Set((membered || []).map(r => r.contact_id));
        const orphans = (allContacts || [])
          .map(c => c.id)
          .filter(id => !memberedSet.has(id));

        return { data: orphans, error: null };
      }

      return { data: (data || []).map((r: { id: string }) => r.id), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Count contacts without any list.
   */
  async countContactsWithoutList(orgId: string): Promise<{ count: number; error: Error | null }> {
    try {
      if (!supabase) return { count: 0, error: new Error('Supabase not configured') };

      // Get total contacts count
      const { count: totalCount, error: allErr } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      if (allErr) return { count: 0, error: allErr };

      // Get list IDs for this org first
      const { data: orgLists, error: listErr } = await supabase
        .from('contact_lists')
        .select('id')
        .eq('organization_id', orgId);

      if (listErr) return { count: 0, error: listErr };

      const listIds = (orgLists || []).map(l => l.id);
      if (listIds.length === 0) {
        // No lists exist — all contacts are "without list"
        return { count: totalCount ?? 0, error: null };
      }

      // Count distinct contacts that ARE in at least one list
      const { data: membered, error: memErr } = await supabase
        .from('contact_list_members')
        .select('contact_id')
        .in('list_id', listIds);

      if (memErr) return { count: 0, error: memErr };

      const uniqueMembered = new Set((membered || []).map(r => r.contact_id));
      const total = totalCount ?? 0;

      return { count: total - uniqueMembered.size, error: null };
    } catch (e) {
      return { count: 0, error: e as Error };
    }
  },
};
