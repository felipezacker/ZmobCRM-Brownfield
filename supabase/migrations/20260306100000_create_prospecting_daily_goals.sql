-- Migration: Create prospecting_daily_goals table
-- Story: CP-2.3 - Metas Diarias + Heatmap de Melhor Horario
BEGIN;

CREATE TABLE IF NOT EXISTS public.prospecting_daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calls_target INT NOT NULL DEFAULT 30,
  connection_rate_target DECIMAL NOT NULL DEFAULT 0.25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_goals_owner_org
  ON public.prospecting_daily_goals(owner_id, organization_id);

ALTER TABLE public.prospecting_daily_goals ENABLE ROW LEVEL SECURITY;

-- SELECT: owner can see own goal, admin/director can see all in org
CREATE POLICY "daily_goals_select" ON public.prospecting_daily_goals
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin_or_director(organization_id)
  );

-- INSERT: owner can create own goal, admin/director can create for others
CREATE POLICY "daily_goals_insert" ON public.prospecting_daily_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (
      owner_id = auth.uid()
      OR public.is_admin_or_director(organization_id)
    )
  );

-- UPDATE: owner can update own goal, admin/director can update any in org
CREATE POLICY "daily_goals_update" ON public.prospecting_daily_goals
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin_or_director(organization_id)
  );

-- DELETE: only admin/director can delete goals
CREATE POLICY "daily_goals_delete" ON public.prospecting_daily_goals
  FOR DELETE TO authenticated
  USING (
    public.is_admin_or_director(organization_id)
  );

COMMIT;
