import { useState, useEffect } from 'react'
import { boardsService } from '@/lib/supabase/boards'

interface BoardOption {
  id: string
  name: string
  stages: { id: string; name: string }[]
}

export function useBoards() {
  const [boards, setBoards] = useState<BoardOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    boardsService.getAll()
      .then(({ data }) => {
        if (cancelled) return
        setBoards(
          (data || []).map(b => ({
            id: b.id,
            name: b.name,
            stages: b.stages.map(s => ({ id: s.id, name: s.label })),
          }))
        )
      })
      .catch(() => {
        if (!cancelled) setBoards([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { boards, isLoading }
}
