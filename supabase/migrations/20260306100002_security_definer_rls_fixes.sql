-- =============================================================================
-- Migration: 20260306100002_security_definer_rls_fixes.sql
-- Story: TD-1.1 — Security DEFINER + RLS Fixes
-- Date: 2026-03-06
--
-- 5 items resolved:
--   DB-025: Rewrite merge_contacts() EXECUTE dynamic SQL (SQL injection risk)
--   DB-014: Convert increment/decrement_contact_ltv() to SECURITY INVOKER
--   DB-022: Convert get_dashboard_stats() to SECURITY INVOKER
--   DB-019: Composite index for check_deal_duplicate()
--   DB-012: Apply updated_at triggers to all tables missing them
--
-- Rollback:
--   DB-025: Re-apply function from 20260306100001_fix_merge_contacts_cross_tenant.sql
--   DB-014: ALTER FUNCTION increment_contact_ltv(UUID,NUMERIC) SECURITY DEFINER;
--           ALTER FUNCTION decrement_contact_ltv(UUID,NUMERIC) SECURITY DEFINER;
--   DB-022: ALTER FUNCTION get_dashboard_stats(UUID) SECURITY DEFINER;
--   DB-019: DROP INDEX IF EXISTS idx_deals_duplicate_check;
--   DB-012: DROP TRIGGER IF EXISTS set_updated_at ON <each table>;
-- =============================================================================

BEGIN;

-- =============================================================================
-- DB-025: Rewrite merge_contacts() — eliminate EXECUTE format with concatenation
-- =============================================================================
-- The previous version built a SET clause via string concatenation:
--   v_set_clause := v_set_clause || format('%I = %L', v_key, ...)
--   EXECUTE format('UPDATE contacts SET %s WHERE id = %L', v_set_clause, ...)
--
-- This is replaced with a direct UPDATE using CASE/COALESCE for each allowed
-- field, reading values from the p_field_updates JSONB parameter. No dynamic
-- SQL, no EXECUTE, no string concatenation.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.merge_contacts(
  p_winner_id UUID,
  p_loser_id UUID,
  p_field_updates JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT 'Sistema'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deals_count INT := 0;
  v_phones_count INT := 0;
  v_prefs_count INT := 0;
  v_deal_id UUID;
  v_loser_name TEXT;
  v_org_id UUID;
  v_winner_org_id UUID;
  v_caller_org_id UUID;
  v_has_updates BOOLEAN := false;
BEGIN
  -- Validate: cannot merge with self
  IF p_winner_id = p_loser_id THEN
    RAISE EXCEPTION 'Cannot merge contact with itself';
  END IF;

  -- Get loser info
  SELECT name, organization_id INTO v_loser_name, v_org_id
  FROM contacts
  WHERE id = p_loser_id AND deleted_at IS NULL;

  IF v_loser_name IS NULL THEN
    RAISE EXCEPTION 'Loser contact not found or already deleted';
  END IF;

  -- ============================================================
  -- SECURITY: Cross-tenant authorization checks (TD-0.1)
  -- The function is SECURITY DEFINER so RLS is bypassed.
  -- We must manually verify tenant isolation.
  -- ============================================================

  -- Check 1: Caller must belong to the same organization as the contacts
  SELECT organization_id INTO v_caller_org_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_org_id IS NULL OR v_caller_org_id != v_org_id THEN
    RAISE EXCEPTION 'Permission denied: you do not belong to the organization of these contacts';
  END IF;

  -- Check 2: Winner must belong to the same organization as the loser
  SELECT organization_id INTO v_winner_org_id
  FROM contacts
  WHERE id = p_winner_id AND deleted_at IS NULL;

  IF v_winner_org_id IS NULL THEN
    RAISE EXCEPTION 'Winner contact not found or already deleted';
  END IF;

  IF v_winner_org_id != v_org_id THEN
    RAISE EXCEPTION 'Permission denied: winner and loser contacts belong to different organizations';
  END IF;

  -- ============================================================
  -- END SECURITY CHECKS
  -- ============================================================

  -- 1. Copy selected fields from loser to winner (allowlisted columns only)
  -- DB-025 FIX: Direct UPDATE with CASE expressions instead of EXECUTE format
  -- Each field is only updated if present in p_field_updates AND is allowlisted.
  -- Fields NOT in p_field_updates retain their current value (ELSE col = col).
  v_has_updates := (
    p_field_updates ?| ARRAY[
      'name','email','phone','cpf','classification','temperature',
      'contact_type','source','address_cep','address_city','address_state',
      'notes','birth_date'
    ]
  );

  IF v_has_updates THEN
    UPDATE contacts SET
      name           = CASE WHEN p_field_updates ? 'name'           THEN (p_field_updates->>'name')                            ELSE name END,
      email          = CASE WHEN p_field_updates ? 'email'          THEN (p_field_updates->>'email')                           ELSE email END,
      phone          = CASE WHEN p_field_updates ? 'phone'          THEN (p_field_updates->>'phone')                           ELSE phone END,
      cpf            = CASE WHEN p_field_updates ? 'cpf'            THEN (p_field_updates->>'cpf')                             ELSE cpf END,
      classification = CASE WHEN p_field_updates ? 'classification' THEN (p_field_updates->>'classification')                  ELSE classification END,
      temperature    = CASE WHEN p_field_updates ? 'temperature'    THEN (p_field_updates->>'temperature')                     ELSE temperature END,
      contact_type   = CASE WHEN p_field_updates ? 'contact_type'   THEN (p_field_updates->>'contact_type')                    ELSE contact_type END,
      source         = CASE WHEN p_field_updates ? 'source'         THEN (p_field_updates->>'source')                          ELSE source END,
      address_cep    = CASE WHEN p_field_updates ? 'address_cep'    THEN (p_field_updates->>'address_cep')                     ELSE address_cep END,
      address_city   = CASE WHEN p_field_updates ? 'address_city'   THEN (p_field_updates->>'address_city')                    ELSE address_city END,
      address_state  = CASE WHEN p_field_updates ? 'address_state'  THEN (p_field_updates->>'address_state')                   ELSE address_state END,
      notes          = CASE WHEN p_field_updates ? 'notes'          THEN (p_field_updates->>'notes')                           ELSE notes END,
      birth_date     = CASE WHEN p_field_updates ? 'birth_date'     THEN (p_field_updates->>'birth_date')::DATE                ELSE birth_date END,
      updated_at     = NOW()
    WHERE id = p_winner_id;
  END IF;

  -- 2. Transfer deals
  SELECT COUNT(*) INTO v_deals_count
  FROM deals WHERE contact_id = p_loser_id AND deleted_at IS NULL;

  UPDATE deals
  SET contact_id = p_winner_id, updated_at = NOW()
  WHERE contact_id = p_loser_id AND deleted_at IS NULL;

  -- 3. Transfer phones
  SELECT COUNT(*) INTO v_phones_count
  FROM contact_phones WHERE contact_id = p_loser_id;

  UPDATE contact_phones
  SET contact_id = p_winner_id, updated_at = NOW()
  WHERE contact_id = p_loser_id;

  -- 4. Transfer preferences
  SELECT COUNT(*) INTO v_prefs_count
  FROM contact_preferences WHERE contact_id = p_loser_id;

  UPDATE contact_preferences
  SET contact_id = p_winner_id, updated_at = NOW()
  WHERE contact_id = p_loser_id;

  -- 5. Soft delete loser
  UPDATE contacts SET deleted_at = NOW() WHERE id = p_loser_id;

  -- 6. Audit log
  SELECT id INTO v_deal_id
  FROM deals
  WHERE contact_id = p_winner_id AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO activities (deal_id, type, title, description, date, completed, organization_id, owner_id)
  VALUES (
    v_deal_id,
    'NOTE',
    'Merge de contatos',
    format(
      'Contato "%s" (%s) foi unificado com este contato. %s deals, %s telefones e %s preferencias transferidos. Executado por %s.',
      v_loser_name, p_loser_id, v_deals_count, v_phones_count, v_prefs_count, p_user_name
    ),
    NOW(),
    true,
    v_org_id,
    p_user_id
  );

  RETURN jsonb_build_object(
    'winnerId', p_winner_id,
    'loserId', p_loser_id,
    'dealsTransferred', v_deals_count,
    'phonesTransferred', v_phones_count,
    'preferencesTransferred', v_prefs_count
  );
END;
$$;

-- Verification: merge_contacts() must NOT contain EXECUTE
DO $$
DECLARE
  v_func_def TEXT;
BEGIN
  SELECT prosrc INTO v_func_def
  FROM pg_proc
  WHERE proname = 'merge_contacts'
    AND pronamespace = 'public'::regnamespace;

  IF v_func_def IS NULL THEN
    RAISE EXCEPTION 'FAIL: merge_contacts() not found';
  END IF;

  -- Must NOT contain EXECUTE (the whole point of DB-025)
  IF v_func_def ~* '\bEXECUTE\b' THEN
    RAISE EXCEPTION 'FAIL: merge_contacts() still contains EXECUTE — DB-025 not resolved';
  END IF;

  -- Must still contain security checks (from TD-0.1)
  ASSERT v_func_def LIKE '%Permission denied: you do not belong%',
    'FAIL: Missing caller organization validation';
  ASSERT v_func_def LIKE '%Permission denied: winner and loser%',
    'FAIL: Missing winner/loser cross-organization validation';
  ASSERT v_func_def LIKE '%auth.uid()%',
    'FAIL: Function body does not call auth.uid()';

  RAISE NOTICE 'PASS: DB-025 — merge_contacts() rewritten without EXECUTE, security checks preserved';
END $$;


-- =============================================================================
-- DB-014: Convert increment/decrement_contact_ltv to SECURITY INVOKER
-- =============================================================================
-- These functions operate on contacts table which has org-scoped RLS.
-- As SECURITY INVOKER, the UPDATE will be filtered by the caller's RLS context,
-- preventing cross-tenant LTV manipulation.
-- =============================================================================

ALTER FUNCTION public.increment_contact_ltv(UUID, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.decrement_contact_ltv(UUID, NUMERIC) SECURITY INVOKER;

-- Verification: both must be SECURITY INVOKER (prosecdef = false)
DO $$
DECLARE
  v_secdef BOOLEAN;
BEGIN
  SELECT prosecdef INTO v_secdef
  FROM pg_proc
  WHERE proname = 'increment_contact_ltv'
    AND pronamespace = 'public'::regnamespace;
  ASSERT NOT v_secdef, 'FAIL: increment_contact_ltv is still SECURITY DEFINER';

  SELECT prosecdef INTO v_secdef
  FROM pg_proc
  WHERE proname = 'decrement_contact_ltv'
    AND pronamespace = 'public'::regnamespace;
  ASSERT NOT v_secdef, 'FAIL: decrement_contact_ltv is still SECURITY DEFINER';

  RAISE NOTICE 'PASS: DB-014 — increment/decrement_contact_ltv are now SECURITY INVOKER';
END $$;


-- =============================================================================
-- DB-022: Convert get_dashboard_stats to SECURITY INVOKER
-- =============================================================================
-- The function does SELECT only on contacts, deals, activities — all have
-- org-scoped RLS. As INVOKER, queries will be filtered by the caller's RLS
-- context. Even if p_organization_id points to another org, RLS will return
-- zero rows for tables the caller cannot access.
-- =============================================================================

ALTER FUNCTION public.get_dashboard_stats(UUID) SECURITY INVOKER;

-- Verification: must be SECURITY INVOKER (prosecdef = false)
DO $$
DECLARE
  v_secdef BOOLEAN;
BEGIN
  SELECT prosecdef INTO v_secdef
  FROM pg_proc
  WHERE proname = 'get_dashboard_stats'
    AND pronamespace = 'public'::regnamespace;
  ASSERT NOT v_secdef, 'FAIL: get_dashboard_stats is still SECURITY DEFINER';

  RAISE NOTICE 'PASS: DB-022 — get_dashboard_stats is now SECURITY INVOKER';
END $$;


-- =============================================================================
-- DB-019: Composite index for check_deal_duplicate trigger
-- =============================================================================
-- The trigger queries: WHERE contact_id = X AND stage_id = Y
--   AND deleted_at IS NULL AND is_won = FALSE AND is_lost = FALSE
-- This partial composite index covers that exact predicate.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_deals_duplicate_check
  ON public.deals (contact_id, stage_id)
  WHERE deleted_at IS NULL AND NOT is_won AND NOT is_lost;

-- Verification: index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'deals'
      AND indexname = 'idx_deals_duplicate_check'
  ) THEN
    RAISE EXCEPTION 'FAIL: DB-019 — idx_deals_duplicate_check was not created';
  END IF;

  RAISE NOTICE 'PASS: DB-019 — idx_deals_duplicate_check created';
END $$;


-- =============================================================================
-- DB-012: Apply updated_at triggers to all tables that have the column but
-- lack the trigger.
-- =============================================================================
-- The trigger function update_updated_at_column() already exists (schema_init).
-- Tables that ALREADY have the trigger (skip):
--   contacts, deals, deal_notes, quick_scripts, contact_phones,
--   contact_preferences, prospecting_queues
-- Tables that HAVE updated_at but LACK the trigger (apply):
--   organizations, organization_settings, profiles, boards, products,
--   user_settings, ai_conversations, ai_decisions, ai_prompt_templates,
--   ai_feature_flags, api_keys, integration_inbound_sources,
--   integration_outbound_endpoints, prospecting_daily_goals
-- =============================================================================

-- organizations
DROP TRIGGER IF EXISTS set_updated_at ON public.organizations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- organization_settings
DROP TRIGGER IF EXISTS set_updated_at ON public.organization_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profiles
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- boards
DROP TRIGGER IF EXISTS set_updated_at ON public.boards;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- products
DROP TRIGGER IF EXISTS set_updated_at ON public.products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_settings
DROP TRIGGER IF EXISTS set_updated_at ON public.user_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_conversations
DROP TRIGGER IF EXISTS set_updated_at ON public.ai_conversations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_decisions
DROP TRIGGER IF EXISTS set_updated_at ON public.ai_decisions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_prompt_templates
DROP TRIGGER IF EXISTS set_updated_at ON public.ai_prompt_templates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_feature_flags
DROP TRIGGER IF EXISTS set_updated_at ON public.ai_feature_flags;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- api_keys
DROP TRIGGER IF EXISTS set_updated_at ON public.api_keys;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- integration_inbound_sources
DROP TRIGGER IF EXISTS set_updated_at ON public.integration_inbound_sources;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.integration_inbound_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- integration_outbound_endpoints
DROP TRIGGER IF EXISTS set_updated_at ON public.integration_outbound_endpoints;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.integration_outbound_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- prospecting_daily_goals
DROP TRIGGER IF EXISTS set_updated_at ON public.prospecting_daily_goals;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.prospecting_daily_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verification: count triggers applied
DO $$
DECLARE
  v_count INT;
  v_expected INT := 14;
  v_tables TEXT[] := ARRAY[
    'organizations', 'organization_settings', 'profiles', 'boards',
    'products', 'user_settings', 'ai_conversations', 'ai_decisions',
    'ai_prompt_templates', 'ai_feature_flags', 'api_keys',
    'integration_inbound_sources', 'integration_outbound_endpoints',
    'prospecting_daily_goals'
  ];
  v_table TEXT;
  v_missing TEXT[] := '{}';
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = v_table
        AND trigger_name = 'set_updated_at'
    ) THEN
      v_missing := array_append(v_missing, v_table);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'FAIL: DB-012 — missing updated_at trigger on: %', array_to_string(v_missing, ', ');
  END IF;

  RAISE NOTICE 'PASS: DB-012 — updated_at triggers applied to all 14 tables';
END $$;

COMMIT;
