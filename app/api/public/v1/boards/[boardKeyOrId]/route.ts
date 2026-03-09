import { NextResponse } from 'next/server';
import { authPublicApi } from '@/lib/public-api/auth';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/supabase/utils';
import { withRateLimit } from '@/app/api/public/v1/with-rate-limit';

export const runtime = 'nodejs';

export const GET = withRateLimit(async function GET(request: Request, ctx: { params: Promise<{ boardKeyOrId: string }> }) {
  const auth = await authPublicApi(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const { boardKeyOrId } = await ctx.params;
  const value = String(boardKeyOrId || '').trim();
  if (!value) return NextResponse.json({ error: 'Missing board identifier', code: 'BAD_REQUEST' }, { status: 400 });

  const sb = createStaticAdminClient();
  let query = sb
    .from('boards')
    .select('id,key,name,description,position,is_default,created_at,updated_at')
    .eq('organization_id', auth.organizationId)
    .is('deleted_at', null);

  query = isValidUUID(value) ? query.eq('id', value) : query.eq('key', value);

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Board not found', code: 'NOT_FOUND' }, { status: 404 });

  const row = data as Record<string, unknown>;
  return NextResponse.json({
    data: {
      id: row.id,
      key: row.key ?? null,
      name: row.name,
      description: row.description ?? null,
      position: row.position ?? 0,
      is_default: !!row.is_default,
    },
  });
});

