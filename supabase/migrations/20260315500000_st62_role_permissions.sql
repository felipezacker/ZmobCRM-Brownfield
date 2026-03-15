-- ST-6.2: Permissoes Granulares por Role
-- Tabela para armazenar permissoes customizadas por organizacao/role.
-- Quando vazia para uma org, o sistema usa defaults hardcoded no hook usePermission.

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'diretor', 'corretor')),
  permission TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admin da org pode ler e escrever
CREATE POLICY "admin_full_access" ON public.role_permissions
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Todos os membros da org podem ler (para o hook usePermission funcionar)
CREATE POLICY "org_members_read" ON public.role_permissions
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
