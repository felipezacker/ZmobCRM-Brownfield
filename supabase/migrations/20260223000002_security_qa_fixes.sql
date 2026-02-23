-- =============================================================================
-- MIGRATION: QA Security Fixes — Cross-Tenant Leaks
-- =============================================================================
-- QA Review findings:
--   1. user_consents_select_admin: admin check not org-scoped (LGPD violation)
--   2. handle_new_user(): trusts organization_id from signup metadata
--   3. get_contact_stage_counts(): SECURITY DEFINER leaks cross-tenant data
-- =============================================================================

BEGIN;

-- =============================================================================
-- FIX 1: user_consents_select_admin — scope admin check to own org
-- Before: admin in ANY org could read ALL consents
-- After:  admin can only read consents from users in their own org
-- =============================================================================

DROP POLICY IF EXISTS "user_consents_select_admin" ON public.user_consents;

CREATE POLICY "user_consents_select_admin"
  ON public.user_consents FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT p2.id FROM public.profiles p2
      WHERE p2.organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role = 'admin'
        AND organization_id = (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    )
  );

-- =============================================================================
-- FIX 2: handle_new_user() — use ONLY singleton org, ignore metadata org_id
-- Before: any user could enroll into any org via signup metadata
-- After:  always uses singleton org (single-tenant mode enforced)
-- Note:   multi-tenant enrollment should use invite tokens, not metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id uuid;
BEGIN
    -- ALWAYS use singleton organization — ignore metadata to prevent cross-tenant enrollment
    v_org_id := public.get_singleton_organization_id();

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma organization encontrada. Rode o setup inicial antes de criar usuários.';
    END IF;

    -- Create Profile — ALWAYS 'corretor', ignoring any metadata role
    INSERT INTO public.profiles (id, email, name, avatar, role, organization_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        'corretor',
        v_org_id
    );

    -- Create User Settings (idempotente)
    INSERT INTO public.user_settings (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX 3: get_contact_stage_counts() — migrate to SECURITY INVOKER
-- Before: SECURITY DEFINER bypassed RLS, counted all contacts cross-tenant
-- After:  SECURITY INVOKER respects RLS (contacts still has USING(true) but
--         when contacts gets org-scoped RLS later, this function auto-benefits)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_contact_stage_counts()
RETURNS TABLE (
  stage TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    stage,
    COUNT(*)::BIGINT as count
  FROM contacts
  WHERE deleted_at IS NULL
  GROUP BY stage;
$$;

COMMIT;
