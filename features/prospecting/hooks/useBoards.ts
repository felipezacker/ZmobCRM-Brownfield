import { useQuery } from '@tanstack/react-query'
import { boardsService } from '@/lib/supabase/boards'

interface BoardOption {
  id: string
  name: string
  stages: { id: string; name: string }[]
}

export function useBoards() {
  const { data: boards = [], isLoading } = useQuery<BoardOption[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await boardsService.getAll()
      return (data || []).map(b => ({
        id: b.id,
        name: b.name,
        stages: b.stages.map(s => ({ id: s.id, name: s.label })),
      }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // refresh stale boards when user returns to tab
  })

  return { boards, isLoading }
}
