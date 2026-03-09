-- =============================================================================
-- Migration: 20260308100000_db004_jwt_custom_claims_rls.sql
-- Story: DB-004 — JWT Custom Claims for RLS Performance
-- Date: 2026-03-08
--
-- PURPOSE:
--   Replace the hot subquery pattern used in ~111 RLS policies:
--     (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
--   with a JWT-based lookup:
--     public.get_user_organization_id()
--   which internally tries the JWT claim first and falls back to the subquery.
--
-- SCOPE:
--   1. Create auth hook function that injects organization_id into the JWT.
--   2. Update get_user_organization_id() to read from JWT claim first
--      (COALESCE JWT → subquery). This satisfies AC-12 (fallback).
--   3. Migrate 16 high-traffic tables to call get_user_organization_id()
--      instead of the inline subquery. Satisfies AC-11 (≥50% of 111 policies
--      migrated = at least 56; this migration targets ~60 policies across 16
--      tables, which exceeds the threshold).
--
-- ROLLBACK:
--   To revert: restore get_user_organization_id() to subquery-only form,
--   drop custom_access_token_hook, and re-apply the original policies from
--   each table's source migration (listed per section below).
--
-- IMPACT:
--   - No data changes. All changes are function definitions and RLS policy
--     replacements. Every policy preserves the exact same semantic as before.
--   - Requires registering custom_access_token_hook in Supabase Dashboard:
--       Auth > Hooks > Custom Access Token Hook
--       Function: public.custom_access_token_hook
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Auth Hook — custom_access_token_hook
-- =============================================================================
-- Supabase calls this function after authentication succeeds.
-- It adds organization_id to the JWT claims so RLS policies can read it
-- via auth.jwt()->>'organization_id' without hitting the profiles table.
--
-- SECURITY DEFINER: required so the function can read profiles without
-- being blocked by the profiles RLS (which calls get_user_organization_id,
-- which the hook is about to populate).
--
-- Grant to supabase_auth_admin: Supabase Auth invokes the hook as this role.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_organization_id UUID;
  v_claims jsonb;
BEGIN
  -- Extract user ID from the event payload
  v_user_id := (event->>'userId')::uuid;

  -- Look up the user's organization_id from profiles
  -- Bypass RLS: this function is SECURITY DEFINER and runs as auth admin
  SELECT organization_id INTO v_organization_id
  FROM public.profiles
  WHERE id = v_user_id;

  -- Read current claims and add organization_id
  v_claims := COALESCE(event->'claims', '{}'::jsonb);

  IF v_organization_id IS NOT NULL THEN
    v_claims := jsonb_set(
      v_claims,
      '{organization_id}',
      to_jsonb(v_organization_id::text)
    );
  END IF;

  -- Return the event with updated claims
  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

-- Grant execute to supabase_auth_admin (required for Supabase hook invocation)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  TO supabase_auth_admin;

-- Revoke from public for defense in depth
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM PUBLIC;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'DB-004: Auth hook that injects organization_id into JWT claims at login time. '
  'Must be registered in Supabase Dashboard under Auth > Hooks > Custom Access Token Hook. '
  'Enables RLS policies to use auth.jwt()->>''organization_id'' instead of a subquery '
  'against the profiles table on every row access.';


-- =============================================================================
-- PART 2: Update get_user_organization_id() — JWT-first with subquery fallback
-- =============================================================================
-- AC-12: When the JWT claim is present (post-login), use it (zero DB hit).
-- When the JWT claim is absent (e.g., service_role, old sessions, edge functions
-- that bypass auth hooks), fall back to the original subquery.
--
-- STABLE: result is constant within a single SQL statement (same JWT per request).
-- SECURITY DEFINER: retained from original to avoid RLS recursion on profiles.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- AC-12 path 1: read from JWT claim (fast, no DB hit after hook is active)
    (auth.jwt()->>'organization_id')::uuid,
    -- AC-12 path 2: fallback subquery (safe for old sessions / service_role)
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
$$;

COMMENT ON FUNCTION public.get_user_organization_id() IS
  'DB-004: Returns the current user''s organization_id. '
  'Tries JWT claim first (injected by custom_access_token_hook), '
  'falls back to subquery on profiles when claim is absent. '
  'SECURITY DEFINER to prevent infinite RLS recursion on profiles table.';


-- =============================================================================
-- PART 3: Migrate RLS policies — 16 tables
-- =============================================================================
-- Strategy: replace all inline subqueries in USING / WITH CHECK clauses with
-- public.get_user_organization_id(). This collapses the subquery to a single
-- function call that PostgreSQL can plan more efficiently.
--
-- Policies that use is_admin_or_director(organization_id) also benefit because
-- that function internally resolves org_id from get_user_organization_id().
--
-- Tables NOT touched here (already using function):
--   - profiles (uses get_user_organization_id() since migration 20260226000001)
--   - organizations (uses get_user_organization_id() since migration 20260226000001)
-- =============================================================================


-- ============================================================================
-- 3.1 DEALS
-- Source: 20260223100000 (insert), 20260223200002 (select, update, delete)
-- ============================================================================

DROP POLICY IF EXISTS "deals_select" ON public.deals;
DROP POLICY IF EXISTS "deals_insert" ON public.deals;
DROP POLICY IF EXISTS "deals_update" ON public.deals;
DROP POLICY IF EXISTS "deals_delete" ON public.deals;

CREATE POLICY "deals_select" ON public.deals
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "deals_insert" ON public.deals
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "deals_update" ON public.deals
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "deals_delete" ON public.deals
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );


-- ============================================================================
-- 3.2 CONTACTS
-- Source: 20260303201001 (select), 20260223100000 (insert),
--         20260223200002 (update, delete)
-- ============================================================================

DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;

-- SELECT: org-wide (all members see all contacts in org — see 20260303201001)
CREATE POLICY "contacts_select" ON public.contacts
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contacts_insert" ON public.contacts
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contacts_update" ON public.contacts
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "contacts_delete" ON public.contacts
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );


-- ============================================================================
-- 3.3 ACTIVITIES
-- Source: 20260223100000 (insert), 20260223200000 (select, update, delete)
-- ============================================================================

DROP POLICY IF EXISTS "activities_select" ON public.activities;
DROP POLICY IF EXISTS "activities_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_update" ON public.activities;
DROP POLICY IF EXISTS "activities_delete" ON public.activities;

CREATE POLICY "activities_select" ON public.activities
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "activities_insert" ON public.activities
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "activities_update" ON public.activities
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "activities_delete" ON public.activities
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );


-- ============================================================================
-- 3.4 BOARDS
-- Source: 20260223100000 (select, insert), 20260223200002 (update, delete)
-- ============================================================================

DROP POLICY IF EXISTS "boards_select" ON public.boards;
DROP POLICY IF EXISTS "boards_insert" ON public.boards;
DROP POLICY IF EXISTS "boards_update" ON public.boards;
DROP POLICY IF EXISTS "boards_delete" ON public.boards;

CREATE POLICY "boards_select" ON public.boards
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "boards_insert" ON public.boards
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "boards_update" ON public.boards
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "boards_delete" ON public.boards
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );


-- ============================================================================
-- 3.5 BOARD_STAGES
-- Source: 20260223100000
-- ============================================================================

DROP POLICY IF EXISTS "board_stages_select" ON public.board_stages;
DROP POLICY IF EXISTS "board_stages_insert" ON public.board_stages;
DROP POLICY IF EXISTS "board_stages_update" ON public.board_stages;
DROP POLICY IF EXISTS "board_stages_delete" ON public.board_stages;

CREATE POLICY "board_stages_select" ON public.board_stages
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "board_stages_insert" ON public.board_stages
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "board_stages_update" ON public.board_stages
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "board_stages_delete" ON public.board_stages
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND public.is_admin_or_director(organization_id)
    );


-- ============================================================================
-- 3.6 DEAL_NOTES
-- Source: 20260226100005
-- NOTE: deal_notes now has its own organization_id column (added in that migration).
--       Policies use organization_id directly (not via JOIN on deals).
-- ============================================================================

DROP POLICY IF EXISTS "deal_notes_select" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_insert" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_update" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_delete" ON public.deal_notes;

CREATE POLICY "deal_notes_select" ON public.deal_notes
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "deal_notes_insert" ON public.deal_notes
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

-- UPDATE: creator or admin/director within the same org
CREATE POLICY "deal_notes_update" ON public.deal_notes
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            created_by = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );

-- DELETE: creator or admin/director within the same org
CREATE POLICY "deal_notes_delete" ON public.deal_notes
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            created_by = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );


-- ============================================================================
-- 3.7 DEAL_ITEMS
-- Source: 20260223100000
-- ============================================================================

DROP POLICY IF EXISTS "deal_items_select" ON public.deal_items;
DROP POLICY IF EXISTS "deal_items_insert" ON public.deal_items;
DROP POLICY IF EXISTS "deal_items_update" ON public.deal_items;
DROP POLICY IF EXISTS "deal_items_delete" ON public.deal_items;

CREATE POLICY "deal_items_select" ON public.deal_items
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "deal_items_insert" ON public.deal_items
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "deal_items_update" ON public.deal_items
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "deal_items_delete" ON public.deal_items
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );


-- ============================================================================
-- 3.8 PRODUCTS
-- Source: 20260223100000
-- ============================================================================

DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_select" ON public.products
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "products_insert" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "products_update" ON public.products
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND public.is_admin_or_director(organization_id)
    );

CREATE POLICY "products_delete" ON public.products
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND public.is_admin_or_director(organization_id)
    );


-- ============================================================================
-- 3.9 QUICK_SCRIPTS
-- Source: 20260307100000
-- NOTE: quick_scripts has mixed access — system scripts (is_system=true) are
--       visible to all authenticated users; user scripts are org-scoped.
--       The SELECT policy preserves this distinction.
-- ============================================================================

DROP POLICY IF EXISTS "quick_scripts_select" ON public.quick_scripts;
DROP POLICY IF EXISTS "quick_scripts_insert" ON public.quick_scripts;
DROP POLICY IF EXISTS "quick_scripts_update" ON public.quick_scripts;
DROP POLICY IF EXISTS "quick_scripts_delete" ON public.quick_scripts;

CREATE POLICY "quick_scripts_select" ON public.quick_scripts
    FOR SELECT TO authenticated
    USING (
        is_system = true
        OR (
            user_id = auth.uid()
            AND organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "quick_scripts_insert" ON public.quick_scripts
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = public.get_user_organization_id()
    );

CREATE POLICY "quick_scripts_update" ON public.quick_scripts
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = public.get_user_organization_id()
    )
    WITH CHECK (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = public.get_user_organization_id()
    );

CREATE POLICY "quick_scripts_delete" ON public.quick_scripts
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = public.get_user_organization_id()
    );


-- ============================================================================
-- 3.10 NOTIFICATIONS
-- Source: 20260226200001
-- NOTE: policy names include "_org" suffix (preserved from source migration)
-- ============================================================================

DROP POLICY IF EXISTS "notifications_select_org" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_org" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_org" ON public.notifications;

CREATE POLICY "notifications_select_org" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "notifications_insert_org" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "notifications_update_org" ON public.notifications
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );


-- ============================================================================
-- 3.11 PROSPECTING_QUEUES
-- Source: 20260303130001
-- ============================================================================

DROP POLICY IF EXISTS "prospecting_queues_select" ON public.prospecting_queues;
DROP POLICY IF EXISTS "prospecting_queues_insert" ON public.prospecting_queues;
DROP POLICY IF EXISTS "prospecting_queues_update" ON public.prospecting_queues;
DROP POLICY IF EXISTS "prospecting_queues_delete" ON public.prospecting_queues;

CREATE POLICY "prospecting_queues_select"
    ON public.prospecting_queues FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "prospecting_queues_insert"
    ON public.prospecting_queues FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "prospecting_queues_update"
    ON public.prospecting_queues FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "prospecting_queues_delete"
    ON public.prospecting_queues FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );


-- ============================================================================
-- 3.12 PROSPECTING_SAVED_QUEUES
-- Source: 20260306200000
-- ============================================================================

DROP POLICY IF EXISTS "prospecting_saved_queues_select" ON public.prospecting_saved_queues;
DROP POLICY IF EXISTS "prospecting_saved_queues_insert" ON public.prospecting_saved_queues;
DROP POLICY IF EXISTS "prospecting_saved_queues_update" ON public.prospecting_saved_queues;
DROP POLICY IF EXISTS "prospecting_saved_queues_delete" ON public.prospecting_saved_queues;

-- SELECT: owner sees own, shared queues visible to all in org, admin/director sees all
CREATE POLICY "prospecting_saved_queues_select"
    ON public.prospecting_saved_queues FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR is_shared = true
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "prospecting_saved_queues_insert"
    ON public.prospecting_saved_queues FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "prospecting_saved_queues_update"
    ON public.prospecting_saved_queues FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );

CREATE POLICY "prospecting_saved_queues_delete"
    ON public.prospecting_saved_queues FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );


-- ============================================================================
-- 3.13 PROSPECTING_DAILY_GOALS
-- Source: 20260306100000
-- NOTE: SELECT/UPDATE/DELETE use owner_id or is_admin_or_director — no direct
--       org subquery in USING for those. INSERT uses the subquery in WITH CHECK.
--       Only the INSERT WITH CHECK subquery is replaced here.
-- ============================================================================

DROP POLICY IF EXISTS "daily_goals_select" ON public.prospecting_daily_goals;
DROP POLICY IF EXISTS "daily_goals_insert" ON public.prospecting_daily_goals;
DROP POLICY IF EXISTS "daily_goals_update" ON public.prospecting_daily_goals;
DROP POLICY IF EXISTS "daily_goals_delete" ON public.prospecting_daily_goals;

-- SELECT: owner sees own, admin/director sees all in org
-- (organization_id not in USING — resolved via is_admin_or_director internally)
CREATE POLICY "daily_goals_select" ON public.prospecting_daily_goals
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.is_admin_or_director(organization_id)
    );

-- INSERT: org-scope enforced via get_user_organization_id() + owner/role check
CREATE POLICY "daily_goals_insert" ON public.prospecting_daily_goals
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND (
            owner_id = auth.uid()
            OR public.is_admin_or_director(organization_id)
        )
    );

-- UPDATE: owner can update own, admin/director can update any in org
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


-- ============================================================================
-- 3.14 LEAD_SCORE_HISTORY
-- Source: 20260228160135
-- NOTE: policy names are long-form sentences (preserved exactly from source)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view score history of their org" ON public.lead_score_history;
DROP POLICY IF EXISTS "System can insert score history" ON public.lead_score_history;

CREATE POLICY "Users can view score history of their org" ON public.lead_score_history
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "System can insert score history" ON public.lead_score_history
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );


-- ============================================================================
-- 3.15 CONTACT_PHONES
-- Source: 20260226100001
-- ============================================================================

DROP POLICY IF EXISTS "contact_phones_select" ON public.contact_phones;
DROP POLICY IF EXISTS "contact_phones_insert" ON public.contact_phones;
DROP POLICY IF EXISTS "contact_phones_update" ON public.contact_phones;
DROP POLICY IF EXISTS "contact_phones_delete" ON public.contact_phones;

CREATE POLICY "contact_phones_select" ON public.contact_phones
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_phones_insert" ON public.contact_phones
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_phones_update" ON public.contact_phones
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_phones_delete" ON public.contact_phones
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );


-- ============================================================================
-- 3.16 CONTACT_PREFERENCES
-- Source: 20260226100002
-- NOTE: policy names use "contact_prefs_" prefix (preserved from source)
-- ============================================================================

DROP POLICY IF EXISTS "contact_prefs_select" ON public.contact_preferences;
DROP POLICY IF EXISTS "contact_prefs_insert" ON public.contact_preferences;
DROP POLICY IF EXISTS "contact_prefs_update" ON public.contact_preferences;
DROP POLICY IF EXISTS "contact_prefs_delete" ON public.contact_preferences;

CREATE POLICY "contact_prefs_select" ON public.contact_preferences
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_prefs_insert" ON public.contact_preferences
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_prefs_update" ON public.contact_preferences
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_prefs_delete" ON public.contact_preferences
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );


-- =============================================================================
-- PART 4: Verification
-- =============================================================================
-- Confirm that custom_access_token_hook is in place and get_user_organization_id
-- now references the JWT path.

DO $$
DECLARE
  v_hook_exists BOOLEAN;
  v_func_def TEXT;
  v_policy_count INT;
  v_expected_tables TEXT[] := ARRAY[
    'deals', 'contacts', 'activities', 'boards', 'board_stages',
    'deal_notes', 'deal_items', 'products', 'quick_scripts',
    'notifications', 'prospecting_queues', 'prospecting_saved_queues',
    'prospecting_daily_goals', 'lead_score_history',
    'contact_phones', 'contact_preferences'
  ];
  v_tbl TEXT;
  v_tbl_count INT;
BEGIN

  -- 1. custom_access_token_hook must exist
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'custom_access_token_hook'
      AND pronamespace = 'public'::regnamespace
  ) INTO v_hook_exists;

  IF NOT v_hook_exists THEN
    RAISE EXCEPTION 'FAIL: custom_access_token_hook not found';
  END IF;
  RAISE NOTICE 'PASS: custom_access_token_hook exists';

  -- 2. get_user_organization_id must reference 'organization_id' (JWT claim path)
  SELECT prosrc INTO v_func_def
  FROM pg_proc
  WHERE proname = 'get_user_organization_id'
    AND pronamespace = 'public'::regnamespace;

  IF v_func_def IS NULL THEN
    RAISE EXCEPTION 'FAIL: get_user_organization_id not found';
  END IF;

  IF v_func_def NOT LIKE '%auth.jwt()%' THEN
    RAISE EXCEPTION 'FAIL: get_user_organization_id does not reference auth.jwt()';
  END IF;
  RAISE NOTICE 'PASS: get_user_organization_id references auth.jwt() (JWT-first path active)';

  -- 3. Each target table must have at least 1 RLS policy
  FOREACH v_tbl IN ARRAY v_expected_tables LOOP
    SELECT COUNT(*) INTO v_tbl_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_tbl;

    IF v_tbl_count = 0 THEN
      RAISE EXCEPTION 'FAIL: table "%" has no RLS policies after migration', v_tbl;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: All 16 target tables have active RLS policies';

  -- 4. Report total migrated policy count
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY(v_expected_tables);

  RAISE NOTICE 'INFO: Total active policies on migrated tables: %', v_policy_count;

END $$;


-- =============================================================================
-- POST-MIGRATION CHECKLIST (manual steps required):
-- =============================================================================
--
-- 1. Register auth hook in Supabase Dashboard:
--      Auth > Hooks > Custom Access Token Hook
--      Schema: public
--      Function: custom_access_token_hook
--
-- 2. Test login flow end-to-end: verify JWT contains "organization_id" claim.
--    Example (decode JWT at jwt.io or via psql):
--      SELECT auth.jwt()->'organization_id';
--
-- 3. Validate RLS smoke test:
--      EXEC AS user: SELECT * FROM deals LIMIT 1;  -- must return only own org rows
--
-- 4. Old sessions (issued before this migration) will use the subquery fallback
--    until the user logs out and back in. This is safe — AC-12 guarantees it.
--
-- 5. Edge functions / service_role bypass JWT entirely. The subquery fallback
--    in get_user_organization_id() handles these callers correctly.
--
-- =============================================================================

COMMIT;
