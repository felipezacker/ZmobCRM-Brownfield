-- =============================================================================
-- MIGRATION: RPC for cascading contact+deals owner reassignment
-- =============================================================================
-- Story: 1.4 - Cascata de Reatribuição
-- Date: 2026-02-20
-- Description:
--   Creates a SECURITY INVOKER function that atomically:
--   1. Updates the owner_id (and optionally name/email/phone) of a contact
--   2. Optionally updates owner_id of all active deals linked to that contact
--   RLS policies (Story 1.3) ensure only admin/diretor can call this.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.reassign_contact_with_deals(
  p_contact_id UUID,
  p_new_owner_id UUID,
  p_cascade_deals BOOLEAN DEFAULT FALSE,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_deals_updated INTEGER := 0;
BEGIN
  -- Update contact owner + optional fields
  UPDATE public.contacts
  SET owner_id = p_new_owner_id,
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      phone = COALESCE(p_phone, phone),
      updated_at = NOW()
  WHERE id = p_contact_id;

  -- Cascade to active deals if requested
  IF p_cascade_deals THEN
    UPDATE public.deals
    SET owner_id = p_new_owner_id,
        updated_at = NOW()
    WHERE contact_id = p_contact_id
      AND is_won = false
      AND is_lost = false
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deals_updated = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'contact_updated', true,
    'deals_updated', v_deals_updated
  );
END;
$$;

COMMIT;
