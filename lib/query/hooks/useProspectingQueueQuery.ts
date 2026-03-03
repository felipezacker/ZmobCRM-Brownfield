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

export const useProspectingQueueItems = (sessionId?: string) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: sessionId
      ? queryKeys.prospectingQueue.list({ sessionId })
      : queryKeys.prospectingQueue.lists(),
    queryFn: async () => {
      const { data, error } = await prospectingQueuesService.getQueue(sessionId)
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
    onSuccess: () => {
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
      await queryClient.cancelQueries({ queryKey: queryKeys.prospectingQueue.all })
      const previous = queryClient.getQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists())

      queryClient.setQueryData<ProspectingQueueItem[]>(queryKeys.prospectingQueue.lists(), (old = []) =>
        old.filter(item => item.id !== id)
      )

      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.prospectingQueue.lists(), context.previous)
      }
    },
    onSettled: () => {
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
