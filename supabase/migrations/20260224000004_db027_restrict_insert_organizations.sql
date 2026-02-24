-- =============================================================================
-- DB-027: Restrict INSERT on organizations
-- =============================================================================
-- Prevents direct INSERT on organizations table by non-service-role users.
-- Organizations should only be created through proper setup flows.
--
-- Strategy: Replace the existing permissive "authenticated_access" FOR ALL
-- policy with separate SELECT/UPDATE policies, and add NO insert policy
-- for regular authenticated users. The service_role bypasses RLS entirely,
-- so admin/setup flows using service_role are not affected.

BEGIN;

-- Drop the existing overly-permissive policy
DROP POLICY IF EXISTS "authenticated_access" ON public.organizations;

-- Allow SELECT for authenticated users (read org data)
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Allow UPDATE for admin users only (e.g., rename org)
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update"
  ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = organizations.id
        AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = organizations.id
        AND role = 'admin'
    )
  );

-- No INSERT policy for authenticated role = direct INSERT is blocked by RLS.
-- service_role (used by Edge Functions / setup) bypasses RLS and can still insert.

-- No DELETE policy either: organizations should never be hard-deleted by users.

COMMIT;
