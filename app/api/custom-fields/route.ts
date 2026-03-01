import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const entityType = url.searchParams.get('entity_type') || 'contact';

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .select('id, key, label, type, options')
      .eq('organization_id', profile.organization_id)
      .eq('entity_type', entityType)
      .order('label');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data || []);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const { key, label, type, entity_type } = body as {
      key: string;
      label: string;
      type: string;
      entity_type?: string;
    };

    if (!key || !label || !type) {
      return NextResponse.json({ error: 'key, label e type são obrigatórios.' }, { status: 400 });
    }

    const VALID_TYPES = ['text', 'number', 'date', 'select'];
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `type inválido. Valores aceitos: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        key,
        label,
        type,
        entity_type: entity_type || 'contact',
        organization_id: profile.organization_id,
      })
      .select('id, key, label, type')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
