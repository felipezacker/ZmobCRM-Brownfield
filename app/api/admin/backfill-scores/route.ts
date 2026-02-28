import { createClient } from '@/lib/supabase/server'
import { batchRecalculateScores } from '@/lib/supabase/lead-scoring'
import { hasMinRole } from '@/lib/auth/roles'

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !hasMinRole(profile.role, 'admin')) {
    return json({ error: 'Forbidden — admin only' }, 403)
  }

  const { updated, error } = await batchRecalculateScores(
    profile.organization_id,
    supabase
  )

  if (error) {
    return json({ error: 'Batch failed', details: error.message, updated }, 500)
  }

  return json({ success: true, updated })
}
