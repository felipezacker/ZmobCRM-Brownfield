-- Migration: 20260226100006_merge_contacts_rpc.sql
-- Story 3.7 — RPC function for merge_contacts (transactional safety)
-- All merge operations wrapped in a single transaction.

CREATE OR REPLACE FUNCTION public.merge_contacts(
  p_winner_id UUID,
  p_loser_id UUID,
  p_field_updates JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT 'Sistema'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deals_count INT := 0;
  v_phones_count INT := 0;
  v_prefs_count INT := 0;
  v_deal_id UUID;
  v_loser_name TEXT;
  v_org_id UUID;
  v_key TEXT;
  v_set_clause TEXT := '';
  v_allowed_fields TEXT[] := ARRAY[
    'name','email','phone','cpf','classification','temperature',
    'contact_type','source','address_cep','address_city','address_state',
    'notes','birth_date'
  ];
BEGIN
  -- Validate
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

  -- 6. Audit log — always created (deal_id is nullable on activities table)
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
