/**
 * @fileoverview Service for filtered prospecting contacts (CP-1.3)
 *
 * Layer pattern: lib/supabase/ -> raw Supabase calls
 * Consumed by: features/prospecting/hooks/useProspectingFilteredContacts.ts
 */

import { supabase } from './client'

export interface ProspectingFilteredContact {
  id: string
  name: string
  email: string | null
  stage: string | null
  temperature: string | null
  classification: string | null
  source: string | null
  ownerId: string | null
  createdAt: string
  primaryPhone: string | null
  hasPhone: boolean
  daysSinceLastActivity: number | null
  leadScore: number | null
}

export interface FilteredContactsResult {
  data: ProspectingFilteredContact[]
  totalCount: number
}

export interface FilteredContactsParams {
  stages?: string[]
  temperatures?: string[]
  classifications?: string[]
  tags?: string[]
  source?: string
  ownerId?: string
  inactiveDays?: number
  onlyWithPhone?: boolean
  page?: number
  pageSize?: number
}

export const prospectingFilteredContactsService = {
  async getFilteredContacts(
    params: FilteredContactsParams
  ): Promise<{ data: FilteredContactsResult | null; error: Error | null }> {
    try {
      const sb = supabase
      if (!sb) return { data: null, error: new Error('Supabase não configurado') }

      const { data, error } = await sb.rpc('get_prospecting_filtered_contacts', {
        p_stages: params.stages?.length ? params.stages : null,
        p_temperatures: params.temperatures?.length ? params.temperatures : null,
        p_classifications: params.classifications?.length ? params.classifications : null,
        p_tags: params.tags?.length ? params.tags : null,
        p_source: params.source || null,
        p_owner_id: params.ownerId || null,
        p_inactive_days: params.inactiveDays ?? null,
        p_only_with_phone: params.onlyWithPhone ?? false,
        p_page: params.page ?? 0,
        p_page_size: params.pageSize ?? 50,
      })

      if (error) return { data: null, error }

      const rows = (data || []) as Array<{
        id: string
        name: string
        email: string | null
        stage: string | null
        temperature: string | null
        classification: string | null
        source: string | null
        owner_id: string | null
        created_at: string
        primary_phone: string | null
        has_phone: boolean
        days_since_last_activity: number | null
        lead_score: number | null
        total_count: number
      }>

      const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0

      return {
        data: {
          data: rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            stage: row.stage,
            temperature: row.temperature,
            classification: row.classification,
            source: row.source,
            ownerId: row.owner_id,
            createdAt: row.created_at,
            primaryPhone: row.primary_phone,
            hasPhone: row.has_phone,
            daysSinceLastActivity: row.days_since_last_activity,
            leadScore: row.lead_score ?? null,
          })),
          totalCount,
        },
        error: null,
      }
    } catch (e) {
      return { data: null, error: e as Error }
    }
  },

  async getAllFilteredIds(
    params: FilteredContactsParams
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const sb = supabase
      if (!sb) return { data: null, error: new Error('Supabase não configurado') }

      const { data, error } = await sb.rpc('get_prospecting_filtered_contact_ids', {
        p_stages: params.stages?.length ? params.stages : null,
        p_temperatures: params.temperatures?.length ? params.temperatures : null,
        p_classifications: params.classifications?.length ? params.classifications : null,
        p_tags: params.tags?.length ? params.tags : null,
        p_source: params.source || null,
        p_owner_id: params.ownerId || null,
        p_inactive_days: params.inactiveDays ?? null,
        p_only_with_phone: params.onlyWithPhone ?? false,
      })

      if (error) return { data: null, error }
      return { data: (data || []).map((r: { id: string }) => r.id), error: null }
    } catch (e) {
      return { data: null, error: e as Error }
    }
  },
}
