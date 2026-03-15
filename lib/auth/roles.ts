export const ROLE_HIERARCHY = { admin: 3, diretor: 2, corretor: 1 } as const;

export type Role = keyof typeof ROLE_HIERARCHY;

export type PermissionKey =
  | 'ver_relatorios'
  | 'editar_pipeline'
  | 'gerenciar_equipe'
  | 'exportar_dados'
  | 'acessar_ia'
  | 'ver_todos_contatos';

export const DEFAULT_PERMISSIONS: Record<Role, Record<PermissionKey, boolean>> = {
  admin:    { ver_relatorios: true,  editar_pipeline: true,  gerenciar_equipe: true,  exportar_dados: true,  acessar_ia: true, ver_todos_contatos: true },
  diretor:  { ver_relatorios: true,  editar_pipeline: true,  gerenciar_equipe: false, exportar_dados: true,  acessar_ia: true, ver_todos_contatos: true },
  corretor: { ver_relatorios: false, editar_pipeline: false, gerenciar_equipe: false, exportar_dados: false, acessar_ia: true, ver_todos_contatos: false },
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  ver_relatorios: 'Ver Relatorios',
  editar_pipeline: 'Editar Pipeline',
  gerenciar_equipe: 'Gerenciar Equipe',
  exportar_dados: 'Exportar Dados',
  acessar_ia: 'Acessar I.A',
  ver_todos_contatos: 'Ver Todos os Contatos',
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  ver_relatorios: 'Acesso ao dashboard de metricas e relatorios de vendas',
  editar_pipeline: 'Criar/editar boards, mover deals entre estagios, configurar lifecycle',
  gerenciar_equipe: 'Convidar, desativar e alterar cargo de membros da equipe',
  exportar_dados: 'Baixar contatos, deals e relatorios em CSV/Excel',
  acessar_ia: 'Chat com IA, scripts automaticos, insights de prospeccao',
  ver_todos_contatos: 'Ver contatos de toda a organizacao (sem isso, ve apenas os proprios)',
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
