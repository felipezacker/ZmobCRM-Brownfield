/**
 * Feature hook for Prospecting Daily Goals (CP-2.3)
 *
 * Combines goal CRUD with today's call count from metrics
 * to compute real-time progress toward daily target.
 */
import { useMemo, useCallback, useState } from 'react'
import { useMyDailyGoal, useTeamDailyGoals, useUpsertDailyGoal } from '@/lib/query/hooks/useDailyGoalsQuery'
import { useAuth } from '@/context/AuthContext'
import type { CallActivity } from './useProspectingMetrics'

const DEFAULT_CALLS_TARGET = 30

export interface GoalProgress {
  target: number
  current: number
  percentage: number
  color: 'red' | 'yellow' | 'green'
  isComplete: boolean
}

export function useProspectingGoals(todayActivities: CallActivity[]) {
  const { profile } = useAuth()
  const goalQuery = useMyDailyGoal()
  const teamGoalsQuery = useTeamDailyGoals()
  const upsertMutation = useUpsertDailyGoal()

  const [showGoalModal, setShowGoalModal] = useState(false)

  const isAdminOrDirector = profile?.role === 'admin' || profile?.role === 'diretor'

  const callsTarget = goalQuery.data?.calls_target ?? DEFAULT_CALLS_TARGET

  const todayCallCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return todayActivities.filter(a => a.date.startsWith(today)).length
  }, [todayActivities])

  const progress: GoalProgress = useMemo(() => {
    const percentage = callsTarget > 0 ? Math.round((todayCallCount / callsTarget) * 100) : 0
    let color: GoalProgress['color'] = 'red'
    if (percentage >= 100) color = 'green'
    else if (percentage >= 50) color = 'yellow'

    return {
      target: callsTarget,
      current: todayCallCount,
      percentage,
      color,
      isComplete: percentage >= 100,
    }
  }, [todayCallCount, callsTarget])

  const updateGoal = useCallback(
    async (ownerId: string, callsTarget: number) => {
      await upsertMutation.mutateAsync({ ownerId, callsTarget })
    },
    [upsertMutation],
  )

  return {
    goal: goalQuery.data,
    teamGoals: teamGoalsQuery.data || [],
    progress,
    isLoading: goalQuery.isLoading,
    isAdminOrDirector,
    showGoalModal,
    setShowGoalModal,
    updateGoal,
    isUpdating: upsertMutation.isPending,
  }
}
