/**
 * Hook for retry effectiveness metrics
 *
 * Measures how effective retries are at converting prospecting calls.
 * Groups queue items by retry_count and calculates completion rates.
 *
 * RLS automatically handles RBAC:
 *   - corretor: sees only own queue items
 *   - diretor/admin: sees all org queue items
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import { supabase } from '@/lib/supabase/client'

export interface RetryBucket {
  label: string
  completed: number
  total: number
  rate: number
}

export interface RetryEffectivenessData {
  firstAttempt: RetryBucket
  secondAttempt: RetryBucket
  thirdPlus: RetryBucket
  hasData: boolean
}

interface QueueRow {
  retry_count: number
  status: string
}

function buildBuckets(rows: QueueRow[]): RetryEffectivenessData {
  const buckets = {
    first: { completed: 0, total: 0 },
    second: { completed: 0, total: 0 },
    thirdPlus: { completed: 0, total: 0 },
  }

  for (const row of rows) {
    const isCompleted = row.status === 'completed'

    if (row.retry_count === 0) {
      buckets.first.total++
      if (isCompleted) buckets.first.completed++
    } else if (row.retry_count === 1) {
      buckets.second.total++
      if (isCompleted) buckets.second.completed++
    } else {
      buckets.thirdPlus.total++
      if (isCompleted) buckets.thirdPlus.completed++
    }
  }

  const makeRate = (c: number, t: number) => (t > 0 ? (c / t) * 100 : 0)

  const firstAttempt: RetryBucket = {
    label: '1a Tentativa',
    completed: buckets.first.completed,
    total: buckets.first.total,
    rate: makeRate(buckets.first.completed, buckets.first.total),
  }

  const secondAttempt: RetryBucket = {
    label: '2a Tentativa',
    completed: buckets.second.completed,
    total: buckets.second.total,
    rate: makeRate(buckets.second.completed, buckets.second.total),
  }

  const thirdPlus: RetryBucket = {
    label: '3+ Tentativas',
    completed: buckets.thirdPlus.completed,
    total: buckets.thirdPlus.total,
    rate: makeRate(buckets.thirdPlus.completed, buckets.thirdPlus.total),
  }

  const hasData = buckets.first.total + buckets.second.total + buckets.thirdPlus.total > 0

  return { firstAttempt, secondAttempt, thirdPlus, hasData }
}

export function useRetryEffectiveness(filterOwnerId?: string) {
  return useQuery({
    queryKey: [...queryKeys.prospectingQueue.all, 'retry-effectiveness', filterOwnerId || ''],
    queryFn: async (): Promise<RetryEffectivenessData> => {
      if (!supabase) {
        return buildBuckets([])
      }

      let query = supabase
        .from('prospecting_queues')
        .select('retry_count, status')

      if (filterOwnerId) {
        query = query.eq('owner_id', filterOwnerId)
      }

      const { data, error } = await query

      if (error) throw error

      return buildBuckets((data || []) as QueueRow[])
    },
    staleTime: 60_000,
  })
}
