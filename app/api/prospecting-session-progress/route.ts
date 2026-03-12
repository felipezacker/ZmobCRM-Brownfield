import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/prospecting-session-progress
 *
 * Receives session progress updates via navigator.sendBeacon (beforeunload).
 * Body: { session_id: string, stats: object }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id, stats } = body

    if (!session_id || !stats) {
      return NextResponse.json({ error: 'Missing session_id or stats' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth guard: verify authenticated user owns this session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { error, count } = await supabase
      .from('prospecting_sessions')
      .update({ stats })
      .eq('id', session_id)
      .eq('owner_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Session not found or not owned by user' }, { status: 403 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
