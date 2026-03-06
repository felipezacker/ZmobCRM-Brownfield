-- Migration: Create prospecting_saved_queues table
-- Story: CP-2.4 (Filas Salvas + Export PDF)
-- Description: Tabela para filas favoritas de prospecção com RLS e indexes

BEGIN;

-- ============================================================================
-- 1. Create Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prospecting_saved_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prospecting_saved_queues IS 'Saved filter configurations for prospecting queues (CP-2.4)';

-- ============================================================================
-- 2. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prospecting_saved_queues_owner_org
  ON public.prospecting_saved_queues(owner_id, organization_id);

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================

ALTER TABLE public.prospecting_saved_queues ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- SELECT: owner sees own, shared queues visible to all in org, admin/director sees all
CREATE POLICY "prospecting_saved_queues_select"
  ON public.prospecting_saved_queues FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      owner_id = auth.uid()
      OR is_shared = true
      OR public.is_admin_or_director(organization_id)
    )
  );

-- INSERT: authenticated users within their org
CREATE POLICY "prospecting_saved_queues_insert"
  ON public.prospecting_saved_queues FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- UPDATE: owner can update own, admin/director can update all in org
CREATE POLICY "prospecting_saved_queues_update"
  ON public.prospecting_saved_queues FOR UPDATE TO authenticated
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
CREATE POLICY "prospecting_saved_queues_delete"
  ON public.prospecting_saved_queues FOR DELETE TO authenticated
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
