-- =============================================================================
-- MIGRATION: RBAC Evolution — Rename 'vendedor' to 'corretor' + Add 'diretor'
-- =============================================================================
-- Story: 1.1 - Evolução RBAC
-- Date: 2026-02-20
-- Description:
--   1. Rename role 'vendedor' → 'corretor' (CRM imobiliário)
--   2. Rename legacy role 'user' → 'corretor'
--   3. Add new role 'diretor' (mid-level management)
--   4. Add CHECK constraints on role columns
--   5. Update trigger handle_new_user fallback
--   6. Update RLS policies for 3-tier hierarchy (admin > diretor > corretor)
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Migrate existing data (BEFORE adding CHECK constraints)
-- =============================================================================

-- 1.2: Update profiles — convert legacy 'user' and 'vendedor' to 'corretor'
UPDATE public.profiles
SET role = 'corretor'
WHERE role IN ('user', 'vendedor');

-- 1.3: Update organization_invites — convert 'vendedor' to 'corretor'
UPDATE public.organization_invites
SET role = 'corretor'
WHERE role = 'vendedor';

-- =============================================================================
-- STEP 2: Add CHECK constraints (data is now clean)
-- =============================================================================

-- 1.4: Add CHECK constraint on profiles.role
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'diretor', 'corretor'));

-- 1.5: Change default on profiles.role
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'corretor';

-- 1.6: Add CHECK constraint on organization_invites.role
ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_role_check
  CHECK (role IN ('admin', 'diretor', 'corretor'));

-- 1.7: Change default on organization_invites.role
ALTER TABLE public.organization_invites
  ALTER COLUMN role SET DEFAULT 'corretor';

-- =============================================================================
-- STEP 3: Update trigger handle_new_user — fallback 'user' → 'corretor'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id uuid;
BEGIN
    v_org_id := (new.raw_user_meta_data->>'organization_id')::uuid;
    IF v_org_id IS NULL THEN
        v_org_id := public.get_singleton_organization_id();
    END IF;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma organization encontrada. Rode o setup inicial antes de criar usuários.';
    END IF;

    -- Create Profile
    INSERT INTO public.profiles (id, email, name, avatar, role, organization_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        COALESCE(new.raw_user_meta_data->>'role', 'corretor'),
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
-- STEP 4: RLS Policies — deals (owner-based for corretor, full for admin/diretor)
-- =============================================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.deals;

-- Corretor: can only SELECT/INSERT/UPDATE their own deals
-- Diretor/Admin: full access within org
CREATE POLICY "Users can view deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = deals.organization_id
        AND role IN ('admin', 'diretor')
    )
  );

CREATE POLICY "Users can insert deals"
  ON public.deals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = deals.organization_id
    )
  );

CREATE POLICY "Users can update own deals or managers can update all"
  ON public.deals
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = deals.organization_id
        AND role IN ('admin', 'diretor')
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = deals.organization_id
        AND role IN ('admin', 'diretor')
    )
  );

CREATE POLICY "Only admins can delete deals"
  ON public.deals
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = deals.organization_id
        AND role = 'admin'
    )
  );

-- =============================================================================
-- STEP 5: RLS Policies — contacts (same pattern as deals)
-- =============================================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.contacts;

CREATE POLICY "Users can view contacts"
  ON public.contacts
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = contacts.organization_id
        AND role IN ('admin', 'diretor')
    )
  );

CREATE POLICY "Users can insert contacts"
  ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = contacts.organization_id
    )
  );

CREATE POLICY "Users can update own contacts or managers can update all"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = contacts.organization_id
        AND role IN ('admin', 'diretor')
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = contacts.organization_id
        AND role IN ('admin', 'diretor')
    )
  );

CREATE POLICY "Only admins can delete contacts"
  ON public.contacts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = contacts.organization_id
        AND role = 'admin'
    )
  );

-- =============================================================================
-- STEP 6: RLS Policy — organization_invites (allow diretor to manage)
-- =============================================================================

DROP POLICY IF EXISTS "Admins can manage organization invites" ON public.organization_invites;

CREATE POLICY "Admins and directors can manage organization invites"
  ON public.organization_invites
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = organization_invites.organization_id
        AND role IN ('admin', 'diretor')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE organization_id = organization_invites.organization_id
        AND role IN ('admin', 'diretor')
    )
  );

-- =============================================================================
-- STEP 7: Admin-only policies remain unchanged
-- (ai_prompt_templates, ai_feature_flags, organization_settings, api_keys,
--  integration_inbound_sources, integration_outbound_endpoints,
--  webhook_events_in, webhook_events_out, webhook_deliveries)
-- These already check role = 'admin' and need NO changes.
-- =============================================================================

COMMIT;
