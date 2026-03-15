import { createClient, createStaticAdminClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { hasMinRole, type Role } from '@/lib/auth/roles';

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Handler HTTP `DELETE` deste endpoint (Next.js Route Handler).
 *
 * @param {Request} req - Objeto da requisição.
 * @param {{ params: Promise<{ id: string; }>; }} ctx - Contexto de execução.
 * @returns {Promise<Response>} Retorna um valor do tipo `Promise<Response>`.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const { id } = await ctx.params;

  const supabase = await createClient();
  const admin = createStaticAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single();

  if (meError || !me?.organization_id) return json({ error: 'Profile not found' }, 404);
  if (!hasMinRole(me.role as Role, 'diretor')) return json({ error: 'Forbidden' }, 403);

  if (id === user.id) return json({ error: 'Você não pode remover a si mesmo' }, 400);

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', id)
    .maybeSingle();

  if (targetError) return json({ error: targetError.message }, 500);
  if (!target) return json({ error: 'User not found' }, 404);
  if (target.organization_id !== me.organization_id) return json({ error: 'Forbidden' }, 403);

  // Diretor can only manage corretores
  if (me.role === 'diretor' && target.role !== 'corretor') {
    return json({ error: 'Diretores só podem gerenciar corretores' }, 403);
  }

  // Delete auth user first (cascades profile via FK, but we also try to remove profile explicitly)
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(id);
  if (authDeleteError) return json({ error: authDeleteError.message }, 500);

  await supabase.from('profiles').delete().eq('id', id);

  return json({ ok: true });
}

const VALID_ROLES = ['admin', 'diretor', 'corretor'] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'Body inválido' }, 400);

  const hasRole = 'role' in body;
  const hasIsActive = 'is_active' in body;

  if (!hasRole && !hasIsActive) {
    return json({ error: 'Informe role ou is_active' }, 400);
  }

  if (hasRole && !VALID_ROLES.includes(body.role)) {
    return json({ error: `Role inválido. Use: ${VALID_ROLES.join(', ')}` }, 400);
  }

  if (hasIsActive && typeof body.is_active !== 'boolean') {
    return json({ error: 'is_active deve ser boolean' }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single();

  if (meError || !me?.organization_id) return json({ error: 'Profile not found' }, 404);
  if (!hasMinRole(me.role as Role, 'admin')) return json({ error: 'Forbidden' }, 403);

  // Guard: cannot change own role
  if (hasRole && id === user.id) {
    return json({ error: 'Você não pode alterar o próprio role' }, 403);
  }

  // Guard: cannot deactivate yourself
  if (hasIsActive && body.is_active === false && id === user.id) {
    return json({ error: 'Você não pode desativar sua própria conta' }, 403);
  }

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, role, organization_id, is_active')
    .eq('id', id)
    .maybeSingle();

  if (targetError) return json({ error: targetError.message }, 500);
  if (!target) return json({ error: 'User not found' }, 404);
  if (target.organization_id !== me.organization_id) return json({ error: 'Forbidden' }, 403);

  // Guard: cannot deactivate the last active admin
  if (hasIsActive && body.is_active === false && target.role === 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', me.organization_id)
      .eq('role', 'admin')
      .eq('is_active', true);

    if ((count ?? 0) <= 1) {
      return json({ error: 'Não é possível desativar o único administrador da organização' }, 403);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (hasRole) updateData.role = body.role;
  if (hasIsActive) updateData.is_active = body.is_active;

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', me.organization_id);

  if (updateError) return json({ error: updateError.message }, 500);

  return json({ success: true });
}
