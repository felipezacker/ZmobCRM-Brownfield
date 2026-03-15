import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAllowedOrigin } from '@/lib/security/sameOrigin'
import { hasMinRole, type Role, type PermissionKey } from '@/lib/auth/roles'

const VALID_PERMISSIONS: PermissionKey[] = [
  'ver_relatorios',
  'editar_pipeline',
  'gerenciar_equipe',
  'exportar_dados',
  'acessar_ia',
  'ver_todos_contatos',
]

const VALID_ROLES: Role[] = ['admin', 'diretor', 'corretor']

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  if (meError || !me?.organization_id) return json({ error: 'Profile not found' }, 404)

  const { data: permissions, error } = await supabase
    .from('role_permissions')
    .select('role, permission, enabled, updated_at')
    .eq('organization_id', me.organization_id)

  if (error) return json({ error: error.message }, 500)

  return json({ permissions: permissions || [] })
}

const PermissionItemSchema = z.object({
  role: z.enum(['admin', 'diretor', 'corretor']),
  permission: z.string(),
  enabled: z.boolean(),
})

const UpdatePermissionsSchema = z.object({
  permissions: z.array(PermissionItemSchema),
})

export async function PUT(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  if (meError || !me?.organization_id) return json({ error: 'Profile not found' }, 404)
  if (!hasMinRole(me.role as Role, 'admin')) return json({ error: 'Forbidden — admin only' }, 403)

  const raw = await req.json().catch(() => null)
  const parsed = UpdatePermissionsSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400)
  }

  // Validate all permissions and roles
  for (const item of parsed.data.permissions) {
    if (!VALID_ROLES.includes(item.role as Role)) {
      return json({ error: `Invalid role: ${item.role}` }, 400)
    }
    if (!VALID_PERMISSIONS.includes(item.permission as PermissionKey)) {
      return json({ error: `Invalid permission: ${item.permission}` }, 400)
    }
  }

  const rows = parsed.data.permissions.map((item) => ({
    organization_id: me.organization_id,
    role: item.role,
    permission: item.permission,
    enabled: item.enabled,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('role_permissions')
    .upsert(rows, { onConflict: 'organization_id,role,permission' })

  if (error) return json({ error: error.message }, 500)

  return json({ success: true })
}
