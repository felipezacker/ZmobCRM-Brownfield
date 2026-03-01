import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Sem organização.' }, { status: 400 });
    }

    const { data: boards, error } = await supabase
      .from('boards')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null)
      .order('position');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch stages for each board
    const boardIds = (boards || []).map(b => b.id);
    const { data: stages } = await supabase
      .from('board_stages')
      .select('id, name, board_id')
      .in('board_id', boardIds)
      .order('order');

    const stagesByBoard = new Map<string, Array<{ id: string; name: string }>>();
    for (const s of (stages || []) as Array<{ id: string; name: string; board_id: string }>) {
      const arr = stagesByBoard.get(s.board_id) || [];
      arr.push({ id: s.id, name: s.name });
      stagesByBoard.set(s.board_id, arr);
    }

    const result = (boards || []).map(b => ({
      id: b.id,
      name: b.name,
      stages: stagesByBoard.get(b.id) || [],
    }));

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
