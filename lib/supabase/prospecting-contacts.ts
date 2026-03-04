/**
 * @fileoverview Serviço Supabase para busca de contatos de prospecção (CP-1.1)
 *
 * Layer pattern: lib/supabase/ → raw Supabase calls
 * Consumed by: lib/query/hooks/useProspectingContactsQuery.ts
 */

import { supabase } from './client'

export interface ProspectingContactRow {
  id: string
  name: string
  email: string | null
  stage: string | null
  temperature: string | null
  owner_id: string | null
  contact_phones: Array<{
    phone_number: string
    is_primary: boolean
  }> | null
}

export const prospectingContactsService = {
  async searchContacts(
    search: string
  ): Promise<{ data: ProspectingContactRow[] | null; error: Error | null }> {
    try {
      const sb = supabase
      if (!sb) return { data: null, error: new Error('Supabase não configurado') }

      let query = sb
        .from('contacts')
        .select(`
          id,
          name,
          email,
          stage,
          temperature,
          owner_id,
          contact_phones (phone_number, is_primary)
        `)
        .eq('status', 'ACTIVE')
        .order('name')
        .limit(20)

      if (search.trim()) {
        // Sanitize: remove PostgREST DSL special chars to prevent filter injection
        const sanitized = search.trim().replace(/[,().%\\]/g, '')
        if (sanitized.length >= 2) {
          query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
        }
      }

      const { data, error } = await query
      if (error) return { data: null, error }

      return { data: (data || []) as unknown as ProspectingContactRow[], error: null }
    } catch (e) {
      return { data: null, error: e as Error }
    }
  },
}
