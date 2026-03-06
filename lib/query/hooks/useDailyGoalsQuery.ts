/**
 * TanStack Query hooks for Prospecting Daily Goals (CP-2.3)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../index'
import { prospectingGoalsService } from '@/lib/supabase/prospecting-goals'
import { useAuth } from '@/context/AuthContext'
import type { UpsertGoalInput } from '@/lib/supabase/prospecting-goals'

export const useMyDailyGoal = () => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: queryKeys.dailyGoals.detail(user?.id || ''),
    queryFn: async () => {
      const { data, error } = await prospectingGoalsService.getMyGoal()
      if (error) throw error
      return data
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000,
  })
}

export const useTeamDailyGoals = () => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: queryKeys.dailyGoals.lists(),
    queryFn: async () => {
      const { data, error } = await prospectingGoalsService.getTeamGoals()
      if (error) throw error
      return data || []
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000,
  })
}

export const useUpsertDailyGoal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpsertGoalInput) => {
      const { data, error } = await prospectingGoalsService.upsertGoal(input)
      if (error) throw error
      return data!
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        queryKeys.dailyGoals.detail(variables.ownerId),
        data,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyGoals.all })
    },
  })
}
