import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/queryKeys'

export interface ContactAttempts {
  count: number
  lastAttempt: { date: string; outcome: string } | null
  isLoading: boolean
}

export function useContactAttempts(contactId: string | undefined): ContactAttempts {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.activities.byContact(contactId ?? ''), 'callAttempts'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured')

      const { data, error } = await supabase
        .from('activities')
        .select('date, metadata')
        .eq('contact_id', contactId!)
        .eq('type', 'CALL')
        .order('date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!contactId,
    staleTime: 30 * 1000,
  })

  const count = data?.length ?? 0
  const lastAttempt = count > 0 && data?.[0]
    ? {
        date: data[0].date as string,
        outcome: ((data[0].metadata as Record<string, unknown> | null)?.outcome as string) ?? 'no_answer',
      }
    : null

  return { count, lastAttempt, isLoading }
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24))
  const hours = date.getHours()

  if (diffDays === 0) return `hoje ${hours}h`
  if (diffDays === 1) return `ontem ${hours}h`
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${hours}h`
}

export const OUTCOME_LABELS: Record<string, string> = {
  connected: 'atendeu',
  no_answer: 'nao atendeu',
  voicemail: 'correio de voz',
  busy: 'ocupado',
}

export function getAttemptColorClass(count: number): string {
  if (count <= 2) return 'text-muted-foreground'
  if (count <= 4) return 'text-amber-600 dark:text-amber-400'
  return 'text-destructive'
}
