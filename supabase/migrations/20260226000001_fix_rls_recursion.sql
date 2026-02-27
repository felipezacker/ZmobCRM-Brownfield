-- =============================================================================
-- FIX: RLS Circular Recursion (42P17) on profiles & organizations
-- =============================================================================
-- Root cause: profiles_select policy queries public.profiles in its own USING
-- clause, triggering RLS again => infinite recursion (PostgreSQL 42P17).
--
-- Solution: SECURITY DEFINER function that bypasses RLS to fetch the
-- current user's organization_id, then use it in both policies.
-- =============================================================================

BEGIN;

-- 1. Create helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Fix profiles_select — use function instead of subquery
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
  );

-- 3. Fix organizations_select — use function instead of subquery on profiles
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND id = public.get_user_organization_id()
  );

COMMIT;
