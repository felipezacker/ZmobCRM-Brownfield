/**
 * Feature hook para state management da fila de prospecção (CP-1.1)
 *
 * Layer pattern: features/{name}/hooks/ - UI logic + state management
 * Calls: lib/query/hooks/useProspectingQueueQuery.ts
 */
import { useState, useCallback, useMemo } from 'react'
import { useToast } from '@/context/ToastContext'
import {
  useProspectingQueueItems,
  useAddToProspectingQueue,
  useUpdateQueueItemStatus,
  useRemoveFromQueue,
  useStartProspectingSession,
  useClearAllQueue,
} from '@/lib/query/hooks/useProspectingQueueQuery'
import type { ProspectingQueueItem } from '@/types'

interface UseProspectingQueueOptions {
  viewOwnerId?: string
}

export const useProspectingQueue = (options?: UseProspectingQueueOptions) => {
  const [sessionActive, setSessionActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | undefined>()

  const { data: rawQueue = [], isLoading, refetch } = useProspectingQueueItems(undefined, options?.viewOwnerId)
  const addMutation = useAddToProspectingQueue()
  const updateStatusMutation = useUpdateQueueItemStatus()
  const removeMutation = useRemoveFromQueue()
  const clearAllMutation = useClearAllQueue()
  const startSessionMutation = useStartProspectingSession()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast

  // Sort by position, keep consistent
  const queue = useMemo(
    () => [...rawQueue].sort((a, b) => a.position - b.position),
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
      await updateStatusMutation.mutateAsync({ id: item.id, status: 'completed' })
      advanceToNext()
    } catch {
      toast('Erro ao marcar como completo', 'error')
    }
  }, [queue, currentIndex, updateStatusMutation, advanceToNext, toast])

  const addToQueue = useCallback(async (contactId: string) => {
    try {
      await addMutation.mutateAsync({ contactId, sessionId })
      toast('Contato adicionado à fila', 'success')
    } catch {
      toast('Erro ao adicionar contato', 'error')
    }
  }, [addMutation, sessionId, toast])

  const removeFromQueue = useCallback(async (id: string) => {
    try {
      await removeMutation.mutateAsync(id)
      toast('Contato removido da fila', 'success')
    } catch {
      toast('Erro ao remover contato', 'error')
    }
  }, [removeMutation, toast])

  const clearQueue = useCallback(async () => {
    try {
      await clearAllMutation.mutateAsync(options?.viewOwnerId)
      toast('Fila limpa com sucesso', 'success')
    } catch {
      toast('Erro ao limpar fila', 'error')
    }
  }, [clearAllMutation, options?.viewOwnerId, toast])

  return {
    queue,
    currentIndex,
    sessionActive,
    sessionId,
    isLoading,
    isClearingQueue: clearAllMutation.isPending,
    startSession,
    endSession,
    next,
    skip,
    markCompleted,
    addToQueue,
    removeFromQueue,
    clearQueue,
    refetch,
  }
}
