-- Migration: security_constraints
-- Purpose: Add CHECK constraint on profiles.role and fix leads_insert policy
--          to enforce owner_id = auth.uid() (or allow admin/director assignment).

BEGIN;

-- ============================================================
-- 1. CHECK constraint on profiles.role
--    Restricts the role column to the three known application roles.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('admin', 'diretor', 'corretor'));
  END IF;
END $$;

-- ============================================================
-- 2. Fix leads_insert RLS policy
--    Replaces the previous policy so that:
--      - A regular user can only insert leads they own (owner_id = auth.uid())
--      - Admin or director users can insert leads on behalf of others
--        within the same organization.
-- ============================================================
DROP POLICY IF EXISTS "leads_insert" ON public.leads;

CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_admin_or_director(organization_id)
  );

COMMIT;
