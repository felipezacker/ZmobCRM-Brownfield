/**
 * Feature hook para state management da fila de prospecção (CP-1.1)
 *
 * Layer pattern: features/{name}/hooks/ - UI logic + state management
 * Calls: lib/query/hooks/useProspectingQueueQuery.ts
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useToast } from '@/context/ToastContext'
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
} from '@/lib/query/hooks/useProspectingQueueQuery'
import type { ProspectingQueueItem } from '@/types'

const RETRY_INTERVAL_KEY = 'prospecting_retry_interval'
const DEFAULT_RETRY_INTERVAL = 3

interface UseProspectingQueueOptions {
  viewOwnerId?: string
}

export const useProspectingQueue = (options?: UseProspectingQueueOptions) => {
  const [sessionActive, setSessionActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | undefined>()

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
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  // CP-2.1: Retry interval from localStorage
  const [retryInterval, setRetryIntervalState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_RETRY_INTERVAL
    const stored = localStorage.getItem(RETRY_INTERVAL_KEY)
    return stored ? parseInt(stored, 10) : DEFAULT_RETRY_INTERVAL
  })

  const setRetryInterval = useCallback((days: number) => {
    setRetryIntervalState(days)
    localStorage.setItem(RETRY_INTERVAL_KEY, String(days))
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
  }, [startSessionMutation, toast])

  const endSession = useCallback(() => {
    setSessionActive(false)
    setCurrentIndex(0)
    setSessionId(undefined)
  }, [])

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
  }, [queue, currentIndex])

  const next = useCallback(() => {
    advanceToNext()
  }, [advanceToNext])

  const skip = useCallback(async () => {
    const item = queue[currentIndex]
    if (!item) return
    try {
      await updateStatusMutation.mutateAsync({ id: item.id, status: 'skipped' })
      advanceToNext()
    } catch {
      toast('Erro ao pular contato', 'error')
    }
  }, [queue, currentIndex, updateStatusMutation, advanceToNext, toast])

  const markCompleted = useCallback(async (outcome?: string) => {
    const item = queue[currentIndex]
    if (!item) return
    try {
      // CP-2.1: Auto-retry for no_answer outcomes
      if (outcome === 'no_answer') {
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
  }, [queue, currentIndex, updateStatusMutation, scheduleRetryMutation, retryInterval, advanceToNext, toast])

  const addToQueue = useCallback(async (contactId: string) => {
    try {
      await addMutation.mutateAsync({ contactId, sessionId })
      toast('Contato adicionado à fila', 'success')
      // Force refetch to guarantee list is updated even if optimistic cache didn't match
      await refetch()
    } catch {
      toast('Erro ao adicionar contato', 'error')
    }
  }, [addMutation, sessionId, toast, refetch])

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
    startSession,
    endSession,
    next,
    skip,
    markCompleted,
    addToQueue,
    removeFromQueue,
    clearQueue,
    resetExhaustedItem,
    refetch,
  }
}
