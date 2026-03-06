/**
 * Feature hook for saved prospecting queues (CP-2.4)
 *
 * Layer pattern: features/{name}/hooks/ -> UI logic + state management
 * Calls: lib/supabase/prospecting-saved-queues.ts
 */

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { queryKeys } from '@/lib/query/queryKeys'
import {
  prospectingSavedQueuesService,
  type SavedQueue,
} from '@/lib/supabase/prospecting-saved-queues'
import type { ProspectingFiltersState } from '../components/ProspectingFilters'

export function useSavedQueues() {
  const { user, loading: authLoading } = useAuth()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast
  const queryClient = useQueryClient()

  const { data: savedQueues = [], isLoading } = useQuery({
    queryKey: queryKeys.savedQueues.lists(),
    queryFn: async () => {
      const { data, error } = await prospectingSavedQueuesService.list()
      if (error) throw error
      return data || []
    },
    enabled: !authLoading && !!user,
    staleTime: 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async ({
      name,
      filters,
      isShared,
    }: {
      name: string
      filters: ProspectingFiltersState
      isShared: boolean
    }) => {
      const { data, error } = await prospectingSavedQueuesService.create(
        name,
        filters as unknown as Record<string, unknown>,
        isShared,
      )
      if (error) throw error
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedQueues.all })
      toast('Fila salva com sucesso', 'success')
    },
    onError: () => {
      toast('Erro ao salvar fila', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await prospectingSavedQueuesService.remove(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedQueues.all })
      toast('Fila excluída', 'success')
    },
    onError: () => {
      toast('Erro ao excluir fila', 'error')
    },
  })

  const saveQueue = useCallback(
    (name: string, filters: ProspectingFiltersState, isShared: boolean) => {
      return createMutation.mutateAsync({ name, filters, isShared })
    },
    [createMutation],
  )

  const deleteQueue = useCallback(
    (id: string) => {
      return deleteMutation.mutateAsync(id)
    },
    [deleteMutation],
  )

  const getFiltersFromSaved = useCallback(
    (queue: SavedQueue): ProspectingFiltersState => {
      const raw = queue.filters
      // Handle versioned format
      const filterData = raw.version === 'v1' ? raw.filters : raw
      return filterData as unknown as ProspectingFiltersState
    },
    [],
  )

  return {
    savedQueues,
    isLoading,
    isSaving: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveQueue,
    deleteQueue,
    getFiltersFromSaved,
  }
}
