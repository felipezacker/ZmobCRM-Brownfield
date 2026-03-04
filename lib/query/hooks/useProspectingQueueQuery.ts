/**
 * TanStack Query hooks for Prospecting Queue (CP-1.1)
 *
 * Layer pattern: lib/query/hooks/ → TanStack Query wrapper
 * Calls: lib/supabase/prospecting-queues.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { prospectingQueuesService } from '@/lib/supabase/prospecting-queues'
import { useAuth } from '@/context/AuthContext'
import type { ProspectingQueueItem, ProspectingQueueStatus } from '@/types'

// ============ QUERY HOOKS ============

export const useProspectingQueueItems = (sessionId?: string, ownerId?: string) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: sessionId
      ? queryKeys.prospectingQueue.list({ sessionId, ownerId })
      : ownerId
        ? queryKeys.prospectingQueue.list({ ownerId })
        : queryKeys.prospectingQueue.lists(),
    queryFn: async () => {
      const { data, error } = await prospectingQueuesService.getQueue(sessionId, ownerId)
      if (error) throw error
      return data || []
    },
    enabled: !authLoading && !!user,
    staleTime: 30 * 1000,
  })
}

// ============ MUTATION HOOKS ============

export const useAddToProspectingQueue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contactId, sessionId }: { contactId: string; sessionId?: string }) => {
      const { data, error } = await prospectingQueuesService.addToQueue(contactId, sessionId)
      if (error) throw error
      return data as ProspectingQueueItem
    },
    onSuccess: (newItem) => {
      // Immediately append new item to cached list for instant UI update
      queryClient.setQueryData<ProspectingQueueItem[]>(
        queryKeys.prospectingQueue.lists(),
        (old = []) => [...old, newItem]
      )
    },
    onSettled: () => {
      // Background sync with server to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

export const useUpdateQueueItemStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProspectingQueueStatus }) => {
      const { error } = await prospectingQueuesService.updateStatus(id, status)
      if (error) throw error
      return { id, status }
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.prospectingQueue.all })
      const previous = queryClient.getQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists())

      queryClient.setQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists(), (old = []) =>
        old.map(item => (item.id === id ? { ...item, status } : item))
      )

      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.prospectingQueue.lists(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

export const useRemoveFromQueue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await prospectingQueuesService.removeFromQueue(id)
      if (error) throw error
      return id
    },
    onMutate: async (id) => {
      // Cancel in-flight fetches to prevent them overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.prospectingQueue.all })

      const previousList = queryClient.getQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists())

      // Optimistically remove item from list cache
      queryClient.setQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists(), (old = []) =>
        old.filter(item => item.id !== id)
      )

      // Also remove from contactIds cache for badge consistency
      const contactToRemove = previousList?.find(item => item.id === id)
      if (contactToRemove) {
        queryClient.setQueriesData<string[]>(
          { queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'] },
          (old = []) => old.filter(cid => cid !== contactToRemove.contactId)
        )
      }

      return { previousList }
    },
    onError: (_error, _id, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.prospectingQueue.lists(), context.previousList)
      }
    },
    onSettled: () => {
      // Sync with server after mutation completes (success or error)
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

export const useStartProspectingSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await prospectingQueuesService.startSession()
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

// CP-1.3: Batch add contacts to queue
export const useAddBatchToProspectingQueue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contactIds, targetOwnerId }: { contactIds: string[]; targetOwnerId?: string }) => {
      const { data, error } = await prospectingQueuesService.addBatchToQueue(contactIds, targetOwnerId)
      if (error) throw error
      return data!
    },
    onSuccess: () => {
      // Force immediate refetch of queue list for instant UI update
      queryClient.refetchQueries({ queryKey: queryKeys.prospectingQueue.lists() })
      // Also invalidate all related queries (contactIds, etc.)
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

// CP-1.3: Get contact IDs currently in queue
export const useQueueContactIds = (targetOwnerId?: string) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: [...queryKeys.prospectingQueue.all, 'contactIds', targetOwnerId],
    queryFn: async () => {
      const { data, error } = await prospectingQueuesService.getQueueContactIds(targetOwnerId)
      if (error) throw error
      return data || []
    },
    enabled: !authLoading && !!user,
    staleTime: 10 * 1000,
  })
}

// CP-2.1: Schedule retry for a queue item
export const useScheduleRetry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, retryIntervalDays }: { id: string; retryIntervalDays: number }) => {
      const { data, error } = await prospectingQueuesService.scheduleRetry(id, retryIntervalDays)
      if (error) throw error
      return data!
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

// CP-2.1: Activate retries that are ready (retry_at <= now)
export const useActivateReadyRetries = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ownerId?: string) => {
      const { data, error } = await prospectingQueuesService.activateReadyRetries(ownerId)
      if (error) throw error
      return data ?? 0
    },
    onSuccess: (count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
      }
    },
  })
}

// CP-2.1: Reset an exhausted queue item
export const useResetRetry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await prospectingQueuesService.resetRetry(id)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

export const useClearCompletedQueue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await prospectingQueuesService.clearCompleted()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}

export const useClearAllQueue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ownerId?: string) => {
      const { error } = await prospectingQueuesService.clearAll(ownerId)
      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.prospectingQueue.all })
      const previousList = queryClient.getQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists())
      queryClient.setQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists(), [])
      return { previousList }
    },
    onError: (_error, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.prospectingQueue.lists(), context.previousList)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}
