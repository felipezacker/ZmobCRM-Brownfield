export const ROLE_HIERARCHY = { admin: 3, diretor: 2, corretor: 1 } as const;

export type Role = keyof typeof ROLE_HIERARCHY;

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
