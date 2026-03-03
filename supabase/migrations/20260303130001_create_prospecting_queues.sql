-- Migration: Create prospecting_queues table
-- Story: CP-1.1 (Central de Prospecção)
-- Description: Tabela para persistir fila de prospecção (call queue) com RLS e indexes

BEGIN;

-- ============================================================================
-- 1. Create Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prospecting_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  position INT NOT NULL DEFAULT 0,
  session_id UUID,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prospecting_queues IS 'Call queue for prospecting sessions (CP-1.1)';

-- ============================================================================
-- 2. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prospecting_queues_owner_session_status
  ON public.prospecting_queues(owner_id, session_id, status);

CREATE INDEX IF NOT EXISTS idx_prospecting_queues_org
  ON public.prospecting_queues(organization_id);

CREATE INDEX IF NOT EXISTS idx_prospecting_queues_contact
  ON public.prospecting_queues(contact_id);

-- ============================================================================
-- 3. updated_at trigger (reuse existing pattern)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.prospecting_queues;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.prospecting_queues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. Enable RLS
-- ============================================================================

ALTER TABLE public.prospecting_queues ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

-- SELECT: owner sees own queue, admin/director sees all in org
CREATE POLICY "prospecting_queues_select"
  ON public.prospecting_queues FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      owner_id = auth.uid()
      OR public.is_admin_or_director(organization_id)
    )
  );

-- INSERT: authenticated users within their org
CREATE POLICY "prospecting_queues_insert"
  ON public.prospecting_queues FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- UPDATE: owner can update own, admin/director can update all in org
CREATE POLICY "prospecting_queues_update"
  ON public.prospecting_queues FOR UPDATE TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      owner_id = auth.uid()
      OR public.is_admin_or_director(organization_id)
    )
  );

-- DELETE: owner can delete own, admin/director can delete all in org
CREATE POLICY "prospecting_queues_delete"
  ON public.prospecting_queues FOR DELETE TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      owner_id = auth.uid()
      OR public.is_admin_or_director(organization_id)
    )
  );

COMMIT;
