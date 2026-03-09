-- Migration: 20260306100001_fix_merge_contacts_cross_tenant.sql
-- Story: TD-0.1 — Fix cross-tenant vulnerability in merge_contacts()
--
-- Problem: merge_contacts() is SECURITY DEFINER and performs no authorization
-- checks. Any authenticated user can merge contacts belonging to a different
-- organization, violating tenant isolation.
--
-- Fix: After resolving the loser's organization_id (line 36 of original),
-- validate that:
--   1. The calling user belongs to that organization (via profiles → auth.uid())
--   2. The winner contact also belongs to that same organization
-- If either check fails, raise an exception before any data is modified.
--
-- Rollback: Re-apply the original function from
--   20260226100006_merge_contacts_rpc.sql (no authorization checks).

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
  v_key TEXT;
  v_set_clause TEXT := '';
  v_allowed_fields TEXT[] := ARRAY[
    'name','email','phone','cpf','classification','temperature',
    'contact_type','source','address_cep','address_city','address_state',
    'notes','birth_date'
  ];
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
  -- SECURITY FIX: Cross-tenant authorization checks (TD-0.1)
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
  -- END SECURITY FIX
  -- ============================================================

  -- 1. Copy selected fields from loser to winner (allowlisted columns only)
  FOR v_key IN SELECT jsonb_object_keys(p_field_updates) LOOP
    IF v_key = ANY(v_allowed_fields) THEN
      IF v_set_clause != '' THEN v_set_clause := v_set_clause || ', '; END IF;
      v_set_clause := v_set_clause || format('%I = %L', v_key, p_field_updates->>v_key);
    END IF;
  END LOOP;

  IF v_set_clause != '' THEN
    v_set_clause := v_set_clause || ', updated_at = NOW()';
    EXECUTE format('UPDATE contacts SET %s WHERE id = %L', v_set_clause, p_winner_id);
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

-- ==========================================================================
-- Inline security verification test (TD-0.1 AC4)
-- Validates that merge_contacts() has the expected cross-tenant guards.
-- Cannot test auth.uid() in migration context, so we inspect the catalog.
-- ==========================================================================
DO $$
DECLARE
  v_func_def TEXT;
  v_is_security_definer BOOLEAN;
BEGIN
  -- 1. Verify the function exists and retrieve its body + security mode
  SELECT prosrc, prosecdef
    INTO v_func_def, v_is_security_definer
    FROM pg_proc
   WHERE proname = 'merge_contacts'
     AND pronamespace = 'public'::regnamespace;

  IF v_func_def IS NULL THEN
    RAISE EXCEPTION 'FAIL: merge_contacts() function not found in public schema';
  END IF;

  -- 2. Verify SECURITY DEFINER (the reason manual checks are needed)
  ASSERT v_is_security_definer,
    'FAIL: merge_contacts() is not SECURITY DEFINER — authorization checks may be unnecessary or misconfigured';

  -- 3. Verify caller-org validation exists in function body
  ASSERT v_func_def LIKE '%Permission denied: you do not belong%',
    'FAIL: Missing caller organization validation (auth.uid() check)';

  -- 4. Verify winner-org validation exists in function body
  ASSERT v_func_def LIKE '%Permission denied: winner and loser%',
    'FAIL: Missing winner/loser cross-organization validation';

  -- 5. Verify auth.uid() is actually called (not just a comment)
  ASSERT v_func_def LIKE '%auth.uid()%',
    'FAIL: Function body does not call auth.uid() — caller identity is not verified';

  RAISE NOTICE 'PASS: merge_contacts() cross-tenant security checks verified (SECURITY DEFINER + caller org + winner org + auth.uid)';
END $$;
