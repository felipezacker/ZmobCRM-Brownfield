/**
 * TanStack Query hooks for Prospecting Daily Goals (CP-2.3)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../index'
import { prospectingGoalsService } from '@/lib/supabase/prospecting-goals'
import { useAuth } from '@/context/AuthContext'
import type { UpsertGoalInput, DbDailyGoal } from '@/lib/supabase/prospecting-goals'

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

export const useDailyGoalByOwner = (ownerId: string | undefined) => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: queryKeys.dailyGoals.detail(ownerId || ''),
    queryFn: async () => {
      if (!ownerId) return null
      const { data, error } = await prospectingGoalsService.getGoalByOwner(ownerId)
      if (error) throw error
      return data
    },
    enabled: !authLoading && !!user && !!ownerId,
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dailyGoals.all })

      const previousGoal = queryClient.getQueryData<DbDailyGoal | null>(
        queryKeys.dailyGoals.detail(variables.ownerId)
      )

      queryClient.setQueryData<DbDailyGoal | null>(
        queryKeys.dailyGoals.detail(variables.ownerId),
        (old) => old
          ? { ...old, calls_target: variables.callsTarget, connection_rate_target: variables.connectionRateTarget ?? old.connection_rate_target, updated_at: new Date().toISOString() }
          : old
      )

      return { previousGoal }
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(
        queryKeys.dailyGoals.detail(variables.ownerId),
        context?.previousGoal
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyGoals.all })
    },
  })
}
