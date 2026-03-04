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
    onMutate: async ({ contactId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.prospectingQueue.all })

      // Snapshot contactIds caches for rollback
      const contactIdsSnapshot = queryClient.getQueriesData<string[]>({
        queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'],
      })

      // Optimistically add contactId to ALL contactIds caches (covers all ownerId variants)
      queryClient.setQueriesData<string[]>(
        { queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'] },
        (old) => old ? [...old, contactId] : [contactId]
      )

      return { contactIdsSnapshot }
    },
    onSuccess: (newItem) => {
      // Append new item to ALL list caches (prefix match covers filtered queries)
      queryClient.setQueriesData<ProspectingQueueItem[]>(
        { queryKey: queryKeys.prospectingQueue.lists() },
        (old) => old ? [...old, newItem] : [newItem]
      )
    },
    onError: (_error, _vars, context) => {
      context?.contactIdsSnapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
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

      // Snapshot ALL list queries for rollback (covers filtered keys like list({ ownerId }))
      const snapshot = queryClient.getQueriesData<ProspectingQueueItem[]>({
        queryKey: queryKeys.prospectingQueue.lists(),
      })

      // Optimistically update ALL list caches (prefix match)
      queryClient.setQueriesData<ProspectingQueueItem[]>(
        { queryKey: queryKeys.prospectingQueue.lists() },
        (old) => old ? old.map(item => (item.id === id ? { ...item, status } : item)) : old
      )

      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
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

      // Snapshot ALL list queries for rollback (covers filtered keys like list({ ownerId }))
      const snapshot = queryClient.getQueriesData<ProspectingQueueItem[]>({
        queryKey: queryKeys.prospectingQueue.lists(),
      })

      // Snapshot contactIds caches for rollback
      const contactIdsSnapshot = queryClient.getQueriesData<string[]>({
        queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'],
      })

      // Find the contact to remove (search across all cached lists)
      let contactToRemove: ProspectingQueueItem | undefined
      for (const [, data] of snapshot) {
        contactToRemove = data?.find(item => item.id === id)
        if (contactToRemove) break
      }

      // Optimistically remove item from ALL list caches (prefix match)
      queryClient.setQueriesData<ProspectingQueueItem[]>(
        { queryKey: queryKeys.prospectingQueue.lists() },
        (old) => old ? old.filter(item => item.id !== id) : old
      )

      // Remove from ALL contactIds caches (prefix match — covers all ownerId variants)
      if (contactToRemove) {
        queryClient.setQueriesData<string[]>(
          { queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'] },
          (old) => old ? old.filter(cid => cid !== contactToRemove!.contactId) : old
        )
      }

      return { snapshot, contactIdsSnapshot }
    },
    onError: (_error, _id, context) => {
      // Rollback all queries to snapshot
      context?.snapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      context?.contactIdsSnapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
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
    onMutate: async ({ contactIds }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.prospectingQueue.all })

      // Snapshot list and contactIds caches for rollback
      const listSnapshot = queryClient.getQueriesData<ProspectingQueueItem[]>({
        queryKey: queryKeys.prospectingQueue.lists(),
      })
      const contactIdsSnapshot = queryClient.getQueriesData<string[]>({
        queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'],
      })

      // Optimistically add all contactIds to ALL contactIds caches (covers all ownerId variants)
      queryClient.setQueriesData<string[]>(
        { queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'] },
        (old) => old ? [...old, ...contactIds] : [...contactIds]
      )

      return { listSnapshot, contactIdsSnapshot }
    },
    onError: (_error, _vars, context) => {
      // Rollback list cache
      context?.listSnapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      // Rollback contactIds cache
      context?.contactIdsSnapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
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

      // Snapshot ALL list queries for rollback
      const snapshot = queryClient.getQueriesData<ProspectingQueueItem[]>({
        queryKey: queryKeys.prospectingQueue.lists(),
      })

      // Snapshot contactIds caches for rollback
      const contactIdsSnapshot = queryClient.getQueriesData<string[]>({
        queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'],
      })

      // Optimistically clear ALL list caches
      queryClient.setQueriesData<ProspectingQueueItem[]>(
        { queryKey: queryKeys.prospectingQueue.lists() },
        () => []
      )

      // Optimistically clear ALL contactIds caches so badges disappear immediately
      queryClient.setQueriesData<string[]>(
        { queryKey: [...queryKeys.prospectingQueue.all, 'contactIds'] },
        () => []
      )

      return { snapshot, contactIdsSnapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      context?.contactIdsSnapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prospectingQueue.all })
    },
  })
}
