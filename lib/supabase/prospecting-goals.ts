/**
 * Prospecting Daily Goals Service (CP-2.3)
 * CRUD for daily call goals per user
 */
import { supabase } from './client'

export interface DbDailyGoal {
  id: string
  owner_id: string
  organization_id: string
  calls_target: number
  connection_rate_target: number
  created_at: string
  updated_at: string
}

export interface UpsertGoalInput {
  ownerId: string
  callsTarget: number
  connectionRateTarget?: number
}

export const prospectingGoalsService = {
  async getMyGoal() {
    if (!supabase) return { data: null as DbDailyGoal | null, error: new Error('Supabase not configured') }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null as DbDailyGoal | null, error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('prospecting_daily_goals')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()

    return { data: data as DbDailyGoal | null, error }
  },

  async getTeamGoals() {
    if (!supabase) return { data: null as DbDailyGoal[] | null, error: new Error('Supabase not configured') }

    const { data, error } = await supabase
      .from('prospecting_daily_goals')
      .select('*')
      .order('owner_id')

    return { data: data as DbDailyGoal[] | null, error }
  },

  async upsertGoal(input: UpsertGoalInput) {
    if (!supabase) return { data: null as DbDailyGoal | null, error: new Error('Supabase not configured') }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null as DbDailyGoal | null, error: new Error('Not authenticated') }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) return { data: null as DbDailyGoal | null, error: new Error('No organization') }

    const { data, error } = await supabase
      .from('prospecting_daily_goals')
      .upsert(
        {
          owner_id: input.ownerId,
          organization_id: profile.organization_id,
          calls_target: input.callsTarget,
          connection_rate_target: input.connectionRateTarget ?? 0.25,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' },
      )
      .select()
      .single()

    return { data: data as DbDailyGoal | null, error }
  },
}
