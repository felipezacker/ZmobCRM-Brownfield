-- Migration: TD-3.2 Fix — Phone sync triggers with loop prevention and primary uniqueness
-- Fixes: unique constraint violation on direct INSERT with is_primary=true
-- Strategy: pg_trigger_depth() > 1 guard prevents infinite loops between bidirectional triggers
-- Added: BEFORE trigger to auto-manage is_primary uniqueness

BEGIN;

-- ============================================================================
-- 1. BEFORE trigger: Auto-manage is_primary uniqueness on contact_phones
-- ============================================================================
-- When inserting/updating a phone with is_primary=true, automatically unset
-- existing primaries for the same contact. This prevents unique index violations
-- and removes the need for callers to manage primary uniqueness manually.

CREATE OR REPLACE FUNCTION public.ensure_single_primary_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.contact_phones
    SET is_primary = false
    WHERE contact_id = NEW.contact_id
      AND is_primary = true
      AND id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.ensure_single_primary_phone() IS
  'TD-3.2 DB-015: BEFORE trigger that auto-unsets existing primary phones '
  'when a new primary is being inserted/updated. Prevents unique index violations.';

DROP TRIGGER IF EXISTS trg_ensure_single_primary_phone ON public.contact_phones;
CREATE TRIGGER trg_ensure_single_primary_phone
  BEFORE INSERT OR UPDATE OF is_primary ON public.contact_phones
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.ensure_single_primary_phone();

-- ============================================================================
-- 2. AFTER trigger: contact_phones -> contacts.phone (with depth guard)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_phones_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_primary_number TEXT;
BEGIN
  -- Prevent infinite loop: skip if fired by another trigger
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_contact_id := COALESCE(NEW.contact_id, OLD.contact_id);

  -- Find the primary phone number
  SELECT phone_number INTO v_primary_number
  FROM public.contact_phones
  WHERE contact_id = v_contact_id AND is_primary = true
  LIMIT 1;

  -- Fallback: oldest phone if no primary exists
  IF v_primary_number IS NULL THEN
    SELECT phone_number INTO v_primary_number
    FROM public.contact_phones
    WHERE contact_id = v_contact_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Update contacts.phone only if different
  UPDATE public.contacts
  SET phone = v_primary_number
  WHERE id = v_contact_id
    AND phone IS DISTINCT FROM v_primary_number;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. AFTER trigger: contacts.phone -> contact_phones (with depth guard)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_contact_phone_to_phones()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent infinite loop: skip if fired by another trigger
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.phone IS NULL THEN
    -- Phone cleared: unset primary flag
    UPDATE public.contact_phones
    SET is_primary = false
    WHERE contact_id = NEW.id AND is_primary = true;

  ELSIF EXISTS (
    SELECT 1 FROM public.contact_phones
    WHERE contact_id = NEW.id AND phone_number = NEW.phone
  ) THEN
    -- Phone matches existing: make it primary
    UPDATE public.contact_phones
    SET is_primary = false
    WHERE contact_id = NEW.id
      AND is_primary = true
      AND phone_number != NEW.phone;

    UPDATE public.contact_phones
    SET is_primary = true
    WHERE contact_id = NEW.id
      AND phone_number = NEW.phone
      AND is_primary = false;

  ELSE
    -- New number: unset current primary, insert new record
    UPDATE public.contact_phones
    SET is_primary = false
    WHERE contact_id = NEW.id AND is_primary = true;

    INSERT INTO public.contact_phones
      (contact_id, phone_number, phone_type, is_primary, organization_id)
    VALUES
      (NEW.id, NEW.phone, 'CELULAR', true, NEW.organization_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
