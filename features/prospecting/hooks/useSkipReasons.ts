/**
 * Hook para agregar motivos de skip na fila de prospecção.
 *
 * Query na tabela prospecting_queues filtrando status='skipped' e skip_reason IS NOT NULL,
 * agrupando por skip_reason com contagem.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/query/queryKeys'

export interface SkipReasonCount {
  reason: string
  count: number
}

interface UseSkipReasonsOptions {
  filterOwnerId?: string
}

export const useSkipReasons = (options?: UseSkipReasonsOptions) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: [...queryKeys.prospectingQueue.all, 'skipReasons', options?.filterOwnerId],
    queryFn: async (): Promise<SkipReasonCount[]> => {
      if (!supabase) throw new Error('Supabase not configured')

      let query = supabase
        .from('prospecting_queues')
        .select('skip_reason')
        .eq('status', 'skipped')
        .not('skip_reason', 'is', null)

      if (options?.filterOwnerId) {
        query = query.eq('owner_id', options.filterOwnerId)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return []

      // Aggregate counts by skip_reason
      const counts = new Map<string, number>()
      for (const row of data) {
        const reason = row.skip_reason as string
        counts.set(reason, (counts.get(reason) || 0) + 1)
      }

      return Array.from(counts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
    },
    enabled: !authLoading && !!user,
    staleTime: 60 * 1000,
  })
}
