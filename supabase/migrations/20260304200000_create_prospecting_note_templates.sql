-- Migration: Create prospecting_note_templates table
-- Story: CP-2.2 - Quick Actions + Note Templates
BEGIN;

CREATE TABLE IF NOT EXISTS public.prospecting_note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome TEXT NOT NULL,
  text TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient queries by org + outcome
CREATE INDEX IF NOT EXISTS idx_note_templates_org_outcome
  ON public.prospecting_note_templates(organization_id, outcome);

ALTER TABLE public.prospecting_note_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: all users in the same organization can read templates
CREATE POLICY "note_templates_select" ON public.prospecting_note_templates
  FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- INSERT: only admin/director can create templates
CREATE POLICY "note_templates_insert" ON public.prospecting_note_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_director(organization_id)
    AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- UPDATE: only admin/director can update templates
CREATE POLICY "note_templates_update" ON public.prospecting_note_templates
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_director(organization_id)
  );

-- DELETE: only admin/director can delete templates
CREATE POLICY "note_templates_delete" ON public.prospecting_note_templates
  FOR DELETE TO authenticated
  USING (
    public.is_admin_or_director(organization_id)
  );

COMMIT;
