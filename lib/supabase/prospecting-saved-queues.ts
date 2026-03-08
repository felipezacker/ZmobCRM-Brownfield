/**
 * @fileoverview Serviço Supabase para prospecting_saved_queues (CP-2.4)
 *
 * Layer pattern: lib/supabase/ -> raw Supabase calls
 * Consumed by: features/prospecting/hooks/useSavedQueues.ts
 */

import { supabase } from './client'

export interface SavedQueue {
  id: string
  name: string
  filters: { version: string; filters: Record<string, unknown> }
  ownerId: string
  organizationId: string
  isShared: boolean
  createdAt: string
}

interface DbSavedQueue {
  id: string
  name: string
  filters: Record<string, unknown>
  owner_id: string
  organization_id: string
  is_shared: boolean
  created_at: string
}

const transform = (db: DbSavedQueue): SavedQueue => ({
  id: db.id,
  name: db.name,
  filters: db.filters as SavedQueue['filters'],
  ownerId: db.owner_id,
  organizationId: db.organization_id,
  isShared: db.is_shared,
  createdAt: db.created_at,
})

async function getOrgAndUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = (profile as { organization_id?: string } | null)?.organization_id as string | null
  if (!orgId) return null

  return { userId: user.id, orgId }
}

export const prospectingSavedQueuesService = {
  async list(): Promise<{ data: SavedQueue[] | null; error: Error | null }> {
    try {
      if (!supabase) return { data: null, error: new Error('Supabase não configurado') }

      const { data, error } = await supabase
        .from('prospecting_saved_queues')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) return { data: null, error }
      return {
        data: (data || []).map(d => transform(d as unknown as DbSavedQueue)),
        error: null,
      }
    } catch (e) {
      return { data: null, error: e as Error }
    }
  },

  async create(
    name: string,
    filters: Record<string, unknown>,
    isShared: boolean,
  ): Promise<{ data: SavedQueue | null; error: Error | null }> {
    try {
      if (!supabase) return { data: null, error: new Error('Supabase não configurado') }

      const ctx = await getOrgAndUser()
      if (!ctx) return { data: null, error: new Error('Usuário não autenticado') }

      const { data, error } = await supabase
        .from('prospecting_saved_queues')
        .insert({
          name,
          filters: { version: 'v1', filters },
          owner_id: ctx.userId,
          organization_id: ctx.orgId,
          is_shared: isShared,
        })
        .select('*')
        .single()

      if (error) return { data: null, error }
      return { data: transform(data as unknown as DbSavedQueue), error: null }
    } catch (e) {
      return { data: null, error: e as Error }
    }
  },

  async remove(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) return { error: new Error('Supabase não configurado') }

      const { error } = await supabase
        .from('prospecting_saved_queues')
        .delete()
        .eq('id', id)

      return { error }
    } catch (e) {
      return { error: e as Error }
    }
  },
}
