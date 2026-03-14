import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface BoardStage {
  id: string
  name: string
  position: number
}

export function useBoardStages(boardId: string | null) {
  const [stages, setStages] = useState<BoardStage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!boardId || !supabase) {
      setStages([])
      return
    }

    let cancelled = false
    setIsLoading(true)

    supabase
      .from('board_stages')
      .select('id, name, position')
      .eq('board_id', boardId)
      .order('position')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[useBoardStages] Failed to fetch stages:', error)
          setStages([])
        } else {
          setStages((data || []) as BoardStage[])
        }
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [boardId])

  return { stages, isLoading }
}
