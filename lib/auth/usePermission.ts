import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { hasMinRole, DEFAULT_PERMISSIONS, type Role, type PermissionKey } from '@/lib/auth/roles'

interface RolePermissionRow {
  role: string
  permission: string
  enabled: boolean
}

function useRolePermissions() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['role-permissions', orgId],
    queryFn: async () => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission, enabled')
        .eq('organization_id', orgId!)

      if (error || !data) return []
      return data as RolePermissionRow[]
    },
    enabled: !!orgId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 min
  })
}

export function usePermission(permission: PermissionKey): boolean {
  const { profile } = useAuth()
  const { data: permissions } = useRolePermissions()

  const userRole = profile?.role as Role | undefined

  // Sem role = sem acesso
  if (!userRole || !hasMinRole(userRole, 'corretor')) return false

  // Buscar customizacao salva para este role + permission
  const custom = permissions?.find(
    (p) => p.role === userRole && p.permission === permission
  )

  if (custom !== undefined) {
    return custom.enabled
  }

  // Fallback: defaults hardcoded
  return DEFAULT_PERMISSIONS[userRole]?.[permission] ?? false
}

export function useAllPermissionsForRole(role: Role): Record<PermissionKey, boolean> {
  const { data: permissions } = useRolePermissions()

  const result = { ...DEFAULT_PERMISSIONS[role] }

  if (permissions) {
    for (const p of permissions) {
      if (p.role === role && p.permission in result) {
        result[p.permission as PermissionKey] = p.enabled
      }
    }
  }

  return result
}

export function useAllOrgPermissions(): Record<Role, Record<PermissionKey, boolean>> {
  const { data: permissions } = useRolePermissions()

  const result: Record<Role, Record<PermissionKey, boolean>> = {
    admin: { ...DEFAULT_PERMISSIONS.admin },
    diretor: { ...DEFAULT_PERMISSIONS.diretor },
    corretor: { ...DEFAULT_PERMISSIONS.corretor },
  }

  if (permissions) {
    for (const p of permissions) {
      const role = p.role as Role
      const perm = p.permission as PermissionKey
      if (role in result && perm in result[role]) {
        result[role][perm] = p.enabled
      }
    }
  }

  return result
}

export { useRolePermissions }
