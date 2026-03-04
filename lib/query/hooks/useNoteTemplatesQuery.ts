/**
 * TanStack Query hooks for Prospecting Note Templates (CP-2.2)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../index'
import { noteTemplatesService } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { NoteTemplate, CreateNoteTemplateInput } from '@/lib/supabase/noteTemplates'

export const useNoteTemplates = () => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: queryKeys.noteTemplates.lists(),
    queryFn: async () => {
      const { data, error } = await noteTemplatesService.getAll()
      if (error) throw error
      return data || []
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes — templates don't change often
  })
}

export const useNoteTemplatesByOutcome = (outcome: string) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: queryKeys.noteTemplates.list({ outcome }),
    queryFn: async () => {
      const { data, error } = await noteTemplatesService.getByOutcome(outcome)
      if (error) throw error
      return data || []
    },
    enabled: !authLoading && !!user && !!outcome,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateNoteTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateNoteTemplateInput) => {
      const { data, error } = await noteTemplatesService.create(input)
      if (error) throw error
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.noteTemplates.all })
    },
  })
}

export const useUpdateNoteTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateNoteTemplateInput> }) => {
      const { data, error } = await noteTemplatesService.update(id, input)
      if (error) throw error
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.noteTemplates.all })
    },
  })
}

export const useDeleteNoteTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await noteTemplatesService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.noteTemplates.all })
    },
  })
}
