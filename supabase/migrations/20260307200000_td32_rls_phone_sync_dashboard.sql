-- Migration: TD-3.2 — RLS Rate Limits + Phone Sync + Dashboard Performance
-- Debits: DB-007, DB-015, DB-009
-- DB-024 (system_notifications INSERT policy) SKIPPED — already resolved by TD-1.2

BEGIN;

-- ============================================================================
-- DB-007: rate_limits — Replace permissive USING(true) with server-only policy
-- ============================================================================
-- Table has no organization_id and zero application code usage.
-- It is infrastructure-only (managed by cleanup_rate_limits() SECURITY DEFINER
-- and service_role). Block all authenticated user access.

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.rate_limits;

CREATE POLICY "rate_limits_server_only" ON public.rate_limits
    FOR ALL TO authenticated
    USING (false)
    WITH CHECK (false);

COMMENT ON TABLE public.rate_limits IS
  'Server-only rate limiting table. All client access blocked via RLS. '
  'Managed by cleanup_rate_limits() SECURITY DEFINER and service_role.';


-- ============================================================================
-- DB-015: Bidirectional phone sync — contacts.phone <-> contact_phones
-- ============================================================================

-- --------------------------------------------------------------------------
-- Step 1: Data reconciliation BEFORE triggers are installed
-- --------------------------------------------------------------------------

-- 1a. For contacts that have a phone but no contact_phones entry at all,
--     create a contact_phones record as primary.
INSERT INTO public.contact_phones (contact_id, phone_number, phone_type, is_primary, organization_id)
SELECT c.id, c.phone, 'CELULAR', true, c.organization_id
FROM public.contacts c
WHERE c.phone IS NOT NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contact_phones cp WHERE cp.contact_id = c.id
  );

-- 1b. For contacts where contact_phones has a primary but contacts.phone disagrees,
--     trust contact_phones (the newer, normalized table).
UPDATE public.contacts c
SET phone = cp.phone_number
FROM public.contact_phones cp
WHERE cp.contact_id = c.id
  AND cp.is_primary = true
  AND c.phone IS DISTINCT FROM cp.phone_number
  AND c.deleted_at IS NULL;

-- 1c. For contacts with contact_phones but no primary flagged,
--     set contacts.phone to NULL (will be fixed when user picks a primary).
UPDATE public.contacts c
SET phone = NULL
WHERE c.phone IS NOT NULL
  AND c.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.contact_phones cp WHERE cp.contact_id = c.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.contact_phones cp
    WHERE cp.contact_id = c.id AND cp.is_primary = true
  );

-- --------------------------------------------------------------------------
-- Step 2: Trigger function — contact_phones changes -> update contacts.phone
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_phones_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_primary_number TEXT;
BEGIN
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

  -- Update contacts.phone only if different (prevents infinite loop)
  UPDATE public.contacts
  SET phone = v_primary_number
  WHERE id = v_contact_id
    AND phone IS DISTINCT FROM v_primary_number;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.sync_phones_to_contact() IS
  'TD-3.2 DB-015: Syncs contacts.phone from contact_phones when phones are '
  'inserted, updated, or deleted. Uses IS DISTINCT FROM to prevent trigger loops.';

-- Trigger on INSERT and DELETE
DROP TRIGGER IF EXISTS trg_sync_phones_to_contact ON public.contact_phones;
CREATE TRIGGER trg_sync_phones_to_contact
  AFTER INSERT OR DELETE ON public.contact_phones
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_phones_to_contact();

-- Trigger on UPDATE (only when relevant columns change)
DROP TRIGGER IF EXISTS trg_sync_phones_to_contact_on_update ON public.contact_phones;
CREATE TRIGGER trg_sync_phones_to_contact_on_update
  AFTER UPDATE OF is_primary, phone_number ON public.contact_phones
  FOR EACH ROW
  WHEN (OLD.is_primary IS DISTINCT FROM NEW.is_primary
     OR OLD.phone_number IS DISTINCT FROM NEW.phone_number)
  EXECUTE FUNCTION public.sync_phones_to_contact();

-- --------------------------------------------------------------------------
-- Step 3: Trigger function — contacts.phone change -> update contact_phones
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_contact_phone_to_phones()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NULL THEN
    -- Phone cleared: unset primary flag on all phones for this contact
    UPDATE public.contact_phones
    SET is_primary = false
    WHERE contact_id = NEW.id AND is_primary = true;

  ELSIF EXISTS (
    SELECT 1 FROM public.contact_phones
    WHERE contact_id = NEW.id AND phone_number = NEW.phone
  ) THEN
    -- Phone matches an existing contact_phone: make it the primary
    -- First unset current primary (if different number)
    UPDATE public.contact_phones
    SET is_primary = false
    WHERE contact_id = NEW.id
      AND is_primary = true
      AND phone_number != NEW.phone;

    -- Then set the matching phone as primary
    UPDATE public.contact_phones
    SET is_primary = true
    WHERE contact_id = NEW.id
      AND phone_number = NEW.phone
      AND is_primary = false;

  ELSE
    -- Phone is a new number: unset current primary, insert new record
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

COMMENT ON FUNCTION public.sync_contact_phone_to_phones() IS
  'TD-3.2 DB-015: Syncs contact_phones from contacts.phone when phone field '
  'is updated directly via SQL. WHEN clause on trigger prevents loops.';

DROP TRIGGER IF EXISTS trg_sync_contact_phone_to_phones ON public.contacts;
CREATE TRIGGER trg_sync_contact_phone_to_phones
  AFTER UPDATE OF phone ON public.contacts
  FOR EACH ROW
  WHEN (OLD.phone IS DISTINCT FROM NEW.phone)
  EXECUTE FUNCTION public.sync_contact_phone_to_phones();


-- ============================================================================
-- DB-009: Optimize get_dashboard_stats — single scan per table
-- ============================================================================
-- Before: 6 separate subqueries (4 scanning deals table independently)
-- After:  3 queries (1 per table), deals uses COUNT(*) FILTER for 4 metrics

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_organization_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_contacts', cs.total_contacts,
    'total_deals', ds.total_deals,
    'total_activities', acts.total_activities,
    'open_deals', ds.open_deals,
    'won_deals', ds.won_deals,
    'pipeline_value', ds.pipeline_value
  ) INTO v_result
  FROM (
    -- Single scan of deals: 4 metrics via FILTER
    SELECT
      COUNT(*)                                                    AS total_deals,
      COUNT(*) FILTER (WHERE NOT is_won AND NOT is_lost)          AS open_deals,
      COUNT(*) FILTER (WHERE is_won)                              AS won_deals,
      COALESCE(SUM(value) FILTER (WHERE NOT is_won AND NOT is_lost), 0) AS pipeline_value
    FROM public.deals
    WHERE organization_id = p_organization_id
      AND deleted_at IS NULL
  ) ds,
  (
    SELECT COUNT(*) AS total_contacts
    FROM public.contacts
    WHERE organization_id = p_organization_id
      AND deleted_at IS NULL
  ) cs,
  (
    SELECT COUNT(*) AS total_activities
    FROM public.activities
    WHERE organization_id = p_organization_id
      AND deleted_at IS NULL
  ) acts;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION public.get_dashboard_stats(uuid) IS
  'TD-3.2 DB-009: Returns dashboard stats as JSONB. Optimized to scan each '
  'table only once (deals uses COUNT FILTER for 4 metrics in a single pass).';

COMMIT;
