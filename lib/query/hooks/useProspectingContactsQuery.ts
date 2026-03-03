/**
 * TanStack Query hook for Prospecting Contacts search (CP-1.1)
 *
 * Layer pattern: lib/query/hooks/ → TanStack Query wrapper
 * Calls: lib/supabase/prospecting-contacts.ts
 */
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { prospectingContactsService, type ProspectingContactRow } from '@/lib/supabase/prospecting-contacts'

export interface ProspectingContact {
  id: string
  name: string
  email: string | null
  stage: string | null
  temperature: string | null
  primaryPhone: string | null
  ownerId: string | null
}

const transformContact = (row: ProspectingContactRow): ProspectingContact => ({
  id: row.id,
  name: row.name,
  email: row.email,
  stage: row.stage,
  temperature: row.temperature,
  primaryPhone:
    row.contact_phones?.find(p => p.is_primary)?.phone_number
    || row.contact_phones?.[0]?.phone_number
    || null,
  ownerId: row.owner_id,
})

export const useProspectingContactsQuery = (search: string) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: ['prospectingContacts', search],
    queryFn: async (): Promise<ProspectingContact[]> => {
      const { data, error } = await prospectingContactsService.searchContacts(search)
      if (error) throw error
      return (data || []).map(transformContact)
    },
    enabled: !authLoading && !!user && search.length >= 2,
    staleTime: 10 * 1000,
  })
}
