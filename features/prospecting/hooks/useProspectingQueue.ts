/**
 * Feature hook para state management da fila de prospecção (CP-1.1)
 *
 * Layer pattern: features/{name}/hooks/ - UI logic + state management
 * Calls: lib/query/hooks/useProspectingQueueQuery.ts
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase/client'
import {
  useProspectingQueueItems,
  useAddToProspectingQueue,
  useUpdateQueueItemStatus,
  useRemoveFromQueue,
  useStartProspectingSession,
  useClearAllQueue,
  useScheduleRetry,
  useActivateReadyRetries,
  useResetRetry,
  useRemoveBatchItems,
  useMoveToTop,
  useReorderQueue,
} from '@/lib/query/hooks/useProspectingQueueQuery'
import type { ProspectingQueueItem } from '@/types'
import { PROSPECTING_CONFIG } from '@/features/prospecting/prospecting-config'

const RETRY_INTERVAL_KEY = 'prospecting_retry_interval'
const RETRY_OUTCOMES_KEY = 'prospecting_retry_outcomes'
const DEFAULT_RETRY_OUTCOMES = ['no_answer']

interface UseProspectingQueueOptions {
  viewOwnerId?: string
  /** Callback to sync currentIndex to parent (session persistence) */
  onCurrentIndexChange?: (index: number) => void
  /** Initial currentIndex to restore from a resumed session */
  initialCurrentIndex?: number
}

export const useProspectingQueue = (options?: UseProspectingQueueOptions) => {
  const [sessionActive, setSessionActive] = useState(false)
  const [currentIndex, setCurrentIndexRaw] = useState(options?.initialCurrentIndex ?? 0)
  const [sessionId, setSessionId] = useState<string | undefined>()

  // Stable ref for the callback to avoid deps churn
  const onIndexChangeRef = useRef(options?.onCurrentIndexChange)
  onIndexChangeRef.current = options?.onCurrentIndexChange

  // Wrap setCurrentIndex to also notify parent for session persistence
  const setCurrentIndex = useCallback((valueOrFn: number | ((prev: number) => number)) => {
    setCurrentIndexRaw(prev => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn
      onIndexChangeRef.current?.(next)
      return next
    })
  }, [])

  // '__all__' means no filter (admin sees all via RLS)
  const effectiveOwnerId = options?.viewOwnerId === '__all__' ? undefined : options?.viewOwnerId
  const { data: rawQueue = [], isLoading, refetch } = useProspectingQueueItems(undefined, effectiveOwnerId)
  const addMutation = useAddToProspectingQueue()
  const updateStatusMutation = useUpdateQueueItemStatus()
  const removeMutation = useRemoveFromQueue()
  const clearAllMutation = useClearAllQueue()
  const startSessionMutation = useStartProspectingSession()
  const scheduleRetryMutation = useScheduleRetry()
  const activateRetriesMutation = useActivateReadyRetries()
  const resetRetryMutation = useResetRetry()
  const removeBatchMutation = useRemoveBatchItems()
  const moveToTopMutation = useMoveToTop()
  const reorderMutation = useReorderQueue()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  // CP-2.1: Retry interval from localStorage
  const [retryInterval, setRetryIntervalState] = useState<number>(() => {
    if (typeof window === 'undefined') return PROSPECTING_CONFIG.DEFAULT_RETRY_INTERVAL_DAYS
    const stored = localStorage.getItem(RETRY_INTERVAL_KEY)
    return stored ? parseInt(stored, 10) : PROSPECTING_CONFIG.DEFAULT_RETRY_INTERVAL_DAYS
  })

  const setRetryInterval = useCallback((days: number) => {
    setRetryIntervalState(days)
    localStorage.setItem(RETRY_INTERVAL_KEY, String(days))
  }, [])

  // CP-3.2: Configurable retry outcomes
  const [retryOutcomes, setRetryOutcomesState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_RETRY_OUTCOMES
    try {
      const stored = localStorage.getItem(RETRY_OUTCOMES_KEY)
      return stored ? JSON.parse(stored) : DEFAULT_RETRY_OUTCOMES
    } catch {
      return DEFAULT_RETRY_OUTCOMES
    }
  })

  const setRetryOutcomes = useCallback((outcomes: string[]) => {
    setRetryOutcomesState(outcomes)
    localStorage.setItem(RETRY_OUTCOMES_KEY, JSON.stringify(outcomes))
  }, [])

  // CP-2.1: Activate ready retries on queue load (run only once)
  const hasActivatedRetries = useRef(false)
  useEffect(() => {
    if (!isLoading && rawQueue.length > 0 && !hasActivatedRetries.current) {
      const hasRetryPending = rawQueue.some(item => item.status === 'retry_pending')
      if (hasRetryPending) {
        hasActivatedRetries.current = true
        activateRetriesMutation.mutate(effectiveOwnerId)
      }
    }
  }, [isLoading, rawQueue, activateRetriesMutation, effectiveOwnerId])

  // CP-3.5: Cleanup exhausted queue items >30 days (fire-and-forget, once per mount)
  const hasCleanedUp = useRef(false)
  useEffect(() => {
    if (!isLoading && !hasCleanedUp.current && supabase) {
      hasCleanedUp.current = true
      Promise.resolve(
        supabase.rpc('cleanup_exhausted_queue_items', {
          p_days_old: PROSPECTING_CONFIG.EXHAUSTED_CLEANUP_DAYS,
        })
      ).then(({ data }) => {
        if (data && data > 0) {
          console.log(`CP-3.5 Cleanup: ${data} items exauridos removidos`)
        }
      }).catch(() => {
        // Fire-and-forget: don't block on cleanup failure
      })
    }
  }, [isLoading])

  // Sort by position, keep consistent — exclude exhausted from main queue
  const queue = useMemo(
    () => [...rawQueue]
      .filter(item => item.status !== 'exhausted')
      .sort((a, b) => a.position - b.position),
    [rawQueue]
  )

  // CP-2.1: Separate list of exhausted items
  const exhaustedItems = useMemo(
    () => rawQueue.filter(item => item.status === 'exhausted'),
    [rawQueue]
  )

  const startSession = useCallback(async () => {
    try {
      const sid = await startSessionMutation.mutateAsync()
      setSessionId(sid)
      setSessionActive(true)
      setCurrentIndex(0)
      toast('Sessão de prospecção iniciada', 'success')
    } catch (e) {
      toast('Erro ao iniciar sessão', 'error')
    }
  }, [startSessionMutation, toast, setCurrentIndex])

  const endSession = useCallback(() => {
    setSessionActive(false)
    setCurrentIndex(0)
    setSessionId(undefined)
  }, [setCurrentIndex])

  /** Jump to a specific queue index (used for session resume) */
  const jumpToIndex = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [setCurrentIndex])

  const advanceToNext = useCallback(() => {
    const nextPending = queue.findIndex(
      (item, idx) => idx > currentIndex && item.status === 'pending'
    )
    if (nextPending >= 0) {
      setCurrentIndex(nextPending)
    } else {
      // No more pending — session complete
      setSessionActive(false)
    }
  }, [queue, currentIndex, setCurrentIndex])

  const next = useCallback(() => {
    advanceToNext()
  }, [advanceToNext])

  const skip = useCallback(async (reason?: string) => {
    const item = queue[currentIndex]
    if (!item) return
    try {
      await updateStatusMutation.mutateAsync({ id: item.id, status: 'skipped', skipReason: reason })
      advanceToNext()
    } catch {
      toast('Erro ao pular contato', 'error')
    }
  }, [queue, currentIndex, updateStatusMutation, advanceToNext, toast])

  const markCompleted = useCallback(async (outcome?: string) => {
    const item = queue[currentIndex]
    if (!item) return
    try {
      // CP-3.2: Auto-retry for configurable outcomes (was: only no_answer)
      if (outcome && retryOutcomes.includes(outcome)) {
        const result = await scheduleRetryMutation.mutateAsync({
          id: item.id,
          retryIntervalDays: retryInterval,
        })
        if (result.exhausted) {
          toast('Contato esgotou tentativas de retry', 'info')
        } else {
          toast(`Retry agendado para ${retryInterval} dias`, 'info')
        }
      } else {
        await updateStatusMutation.mutateAsync({ id: item.id, status: 'completed' })
      }
      advanceToNext()
    } catch {
      toast('Erro ao marcar como completo', 'error')
    }
  }, [queue, currentIndex, updateStatusMutation, scheduleRetryMutation, retryInterval, retryOutcomes, advanceToNext, toast])

  const addToQueue = useCallback(async (contactId: string) => {
    // QV-1.7 Bug #6: Validate queue limit (100)
    if (queue.length >= PROSPECTING_CONFIG.QUEUE_MAX_CONTACTS) {
      toast(`Limite de ${PROSPECTING_CONFIG.QUEUE_MAX_CONTACTS} contatos atingido`, 'warning')
      return
    }

    // QV-1.7 Bug #7: Validate duplicate
    if (queue.some(item => item.contactId === contactId)) {
      toast('Contato já está na fila', 'warning')
      return
    }

    try {
      await addMutation.mutateAsync({ contactId, sessionId })
      toast('Contato adicionado à fila', 'success')
      // Force refetch to guarantee list is updated even if optimistic cache didn't match
      await refetch()
    } catch {
      toast('Erro ao adicionar contato', 'error')
    }
  }, [addMutation, sessionId, toast, refetch, queue])

  const removeFromQueue = useCallback(async (id: string) => {
    try {
      await removeMutation.mutateAsync(id)
      toast('Contato removido da fila', 'success')
      // Force refetch as safety net for optimistic update
      await refetch()
    } catch {
      toast('Erro ao remover contato', 'error')
    }
  }, [removeMutation, toast, refetch])

  const clearQueue = useCallback(async () => {
    try {
      await clearAllMutation.mutateAsync(options?.viewOwnerId)
      toast('Fila limpa com sucesso', 'success')
      // Force refetch as safety net for optimistic update
      await refetch()
    } catch {
      toast('Erro ao limpar fila', 'error')
    }
  }, [clearAllMutation, options?.viewOwnerId, toast, refetch])

  // CP-2.1: Reset an exhausted item back to pending
  const resetExhaustedItem = useCallback(async (id: string) => {
    try {
      await resetRetryMutation.mutateAsync(id)
      toast('Contato resetado para fila', 'success')
    } catch {
      toast('Erro ao resetar contato', 'error')
    }
  }, [resetRetryMutation, toast])

  // CP-4.5: Remove múltiplos itens em batch
  const removeBatchItems = useCallback(async (ids: string[]) => {
    try {
      await removeBatchMutation.mutateAsync(ids)
      toast(`${ids.length} contato(s) removidos da fila`, 'success')
      await refetch()
    } catch {
      toast('Erro ao remover contatos', 'error')
    }
  }, [removeBatchMutation, toast, refetch])

  // CP-4.5: Move itens selecionados para o topo da fila
  const moveToTop = useCallback(async (ids: string[]) => {
    try {
      if (!supabase) throw new Error('Supabase não configurado')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')
      await moveToTopMutation.mutateAsync({ ids, ownerId: effectiveOwnerId || user.id })
      toast(`${ids.length} contato(s) movidos para o topo`, 'success')
      await refetch()
    } catch {
      toast('Erro ao mover contatos', 'error')
    }
  }, [moveToTopMutation, effectiveOwnerId, toast, refetch])

  // CP-4.7: Reordenar fila via drag-and-drop
  const reorderQueue = useCallback((newItems: ProspectingQueueItem[]) => {
    const updates = newItems.map((item, index) => ({ id: item.id, position: index }))
    reorderMutation.mutate(updates, {
      onError: () => toast('Erro ao salvar ordem', 'error'),
    })
  }, [reorderMutation, toast])

  return {
    queue,
    exhaustedItems,
    currentIndex,
    sessionActive,
    sessionId,
    isLoading,
    isClearingQueue: clearAllMutation.isPending,
    removingId: removeMutation.isPending ? (removeMutation.variables as string | undefined) : undefined,
    retryInterval,
    setRetryInterval,
    retryOutcomes,
    setRetryOutcomes,
    startSession,
    endSession,
    next,
    skip,
    markCompleted,
    addToQueue,
    removeFromQueue,
    clearQueue,
    resetExhaustedItem,
    removeBatchItems,
    moveToTop,
    reorderQueue,
    isReordering: reorderMutation.isPending,
    jumpToIndex,
    refetch,
  }
}
