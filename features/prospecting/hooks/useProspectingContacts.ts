/**
 * Hook para buscar contatos disponíveis para prospecção (CP-1.1)
 *
 * RBAC:
 * - Corretor: owner_id = auth.uid()
 * - Diretor/Admin: todos da org (via is_admin_or_director)
 *
 * RLS no Supabase cuida do filtro automaticamente.
 * Join com contact_phones para telefone principal (phone_number, NOT phone).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface ProspectingContact {
  id: string
  name: string
  email: string | null
  stage: string | null
  temperature: string | null
  primaryPhone: string | null
  ownerId: string | null
}

export const useProspectingContacts = (search: string) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: ['prospectingContacts', search],
    queryFn: async (): Promise<ProspectingContact[]> => {
      if (!supabase) return []

      let query = supabase
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
        query = query.or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error

      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        stage: c.stage,
        temperature: c.temperature,
        primaryPhone:
          c.contact_phones?.find((p: any) => p.is_primary)?.phone_number
          || c.contact_phones?.[0]?.phone_number
          || null,
        ownerId: c.owner_id,
      }))
    },
    enabled: !authLoading && !!user && search.length >= 2,
    staleTime: 10 * 1000,
  })
}
