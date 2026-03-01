-- Migration: 20260226100005_epic3_tech_debt_org_id.sql
-- Epic: EPIC-CRM-IMOB / Story 3.4
-- Descricao: Adicionar organization_id em deal_notes e deal_files + RLS correta

-- ===== LIMPEZA DE ORFAOS (seguranca do backfill) =====
-- Registros cujo deal foi hard-deleted nao tem como derivar org_id
DELETE FROM public.deal_notes WHERE deal_id NOT IN (SELECT id FROM public.deals);
DELETE FROM public.deal_files WHERE deal_id NOT IN (SELECT id FROM public.deals);

-- ===== deal_notes =====
ALTER TABLE public.deal_notes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill org_id a partir do deal pai
UPDATE public.deal_notes dn
  SET organization_id = d.organization_id
  FROM public.deals d
  WHERE dn.deal_id = d.id AND dn.organization_id IS NULL;

-- Tornar NOT NULL apos backfill
ALTER TABLE public.deal_notes
  ALTER COLUMN organization_id SET NOT NULL;

-- Index
CREATE INDEX idx_deal_notes_org_id ON public.deal_notes(organization_id);

-- Drop RLS antiga e criar restritiva
-- NOTA: RLS anterior ja tinha padrao criador+admin/diretor para UPDATE/DELETE.
-- Mantemos esse padrao, agora usando organization_id direto (sem JOIN) para melhor performance.
DROP POLICY IF EXISTS "deal_notes_select" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_insert" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_update" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_delete" ON public.deal_notes;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.deal_notes;

ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: org-level (todos da org podem ler notas)
CREATE POLICY "deal_notes_select" ON public.deal_notes
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- INSERT: org-level
CREATE POLICY "deal_notes_insert" ON public.deal_notes
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- UPDATE: apenas criador OU admin/diretor (preserva padrao existente)
CREATE POLICY "deal_notes_update" ON public.deal_notes
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );

-- DELETE: apenas criador OU admin/diretor (preserva padrao existente)
CREATE POLICY "deal_notes_delete" ON public.deal_notes
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );

-- ===== deal_files =====
-- Limpeza de orfaos ja feita acima

ALTER TABLE public.deal_files
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.deal_files df
  SET organization_id = d.organization_id
  FROM public.deals d
  WHERE df.deal_id = d.id AND df.organization_id IS NULL;

ALTER TABLE public.deal_files
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX idx_deal_files_org_id ON public.deal_files(organization_id);

DROP POLICY IF EXISTS "deal_files_select" ON public.deal_files;
DROP POLICY IF EXISTS "deal_files_insert" ON public.deal_files;
DROP POLICY IF EXISTS "deal_files_update" ON public.deal_files;
DROP POLICY IF EXISTS "deal_files_delete" ON public.deal_files;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.deal_files;

ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

-- SELECT: org-level
CREATE POLICY "deal_files_select" ON public.deal_files
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- INSERT: org-level
CREATE POLICY "deal_files_insert" ON public.deal_files
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- UPDATE: apenas criador OU admin/diretor
CREATE POLICY "deal_files_update" ON public.deal_files
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );

-- DELETE: apenas criador OU admin/diretor
CREATE POLICY "deal_files_delete" ON public.deal_files
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );
