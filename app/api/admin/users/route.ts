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
 * Handler HTTP `GET` deste endpoint (Next.js Route Handler).
 * @returns {Promise<Response>} Retorna um valor do tipo `Promise<Response>`.
 */
export async function GET() {
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
  if (!hasMinRole(me.role as Role, 'diretor')) return json({ error: 'Forbidden' }, 403);

  // Performance: evita payload grande em organizações com muitos usuários.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, role, first_name, last_name, organization_id, created_at')
    .eq('organization_id', me.organization_id)
    .limit(200)
    .order('created_at', { ascending: false });

  if (error) return json({ error: error.message }, 500);

  // Get last_sign_in_at from auth.users via admin client
  const admin = createStaticAdminClient();
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const lastSignInMap = new Map(
    (authData?.users || []).map((u) => [u.id, u.last_sign_in_at])
  );

  const users = (profiles || []).map((p) => {
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || null;
    return {
      id: p.id,
      email: p.email,
      role: p.role,
      full_name: fullName,
      organization_id: p.organization_id,
      created_at: p.created_at,
      last_sign_in_at: lastSignInMap.get(p.id) ?? null,
      status: 'active' as const,
    };
  });

  return json({ users });
}

/**
 * Handler HTTP `POST` deste endpoint (Next.js Route Handler).
 *
 * @param {Request} req - Objeto da requisição.
 * @returns {Promise<Response>} Retorna um valor do tipo `Promise<Response>`.
 */
export async function POST(req: Request) {
  // Reservado para futuro: criação direta de usuário pelo painel.
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  return json({ error: 'Not implemented' }, 501);
}
