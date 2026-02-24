-- =============================================================================
-- CodeRabbit PR#5 Fixes — Consolidated Migration
-- =============================================================================
-- Addresses 5 findings from CodeRabbit review on PR #5:
--   FIX-1: db027 — organizations_select RLS exposes all orgs (tenant isolation)
--   FIX-2: db014 — profiles_select RLS USING(true) exposes all profiles
--   FIX-3: db014 — backfill skips empty-string canonical values
--   FIX-4: db015 — race condition on FK creation (missing LOCK)
--   FIX-5: db017 — notify_deal_stage_changed() reads cross-tenant data
--
-- NOTE: db012 (constraint_schema) was a FALSE POSITIVE — already correct.
-- =============================================================================

BEGIN;

-- =============================================================================
-- FIX-1: organizations_select — restrict to tenant membership
-- =============================================================================
-- BEFORE: USING (deleted_at IS NULL) — any authenticated user reads ALL orgs
-- AFTER:  Also requires user belongs to the org via profiles.organization_id

DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = organizations.id
    )
  );

-- =============================================================================
-- FIX-2: profiles_select — restrict to same organization
-- =============================================================================
-- BEFORE: USING (true) — any authenticated user reads ALL profiles
-- AFTER:  User can only see profiles in the same organization

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- =============================================================================
-- FIX-3: db014 backfill — also handle empty-string canonical values
-- =============================================================================
-- BEFORE: Only backfilled when canonical IS NULL
-- AFTER:  Also backfills when canonical is empty string

UPDATE public.profiles
SET avatar_url = NULLIF(avatar, '')
WHERE (avatar_url IS NULL OR avatar_url = '')
  AND avatar IS NOT NULL
  AND avatar <> '';

UPDATE public.profiles
SET first_name = NULLIF(name, '')
WHERE (first_name IS NULL OR first_name = '')
  AND name IS NOT NULL
  AND name <> '';

-- =============================================================================
-- FIX-4: db015 — add LOCK to prevent race condition on FK
-- =============================================================================
-- The original migration already ran, so the FK exists.
-- This fix is defensive: if the FK somehow doesn't exist, re-add with LOCK.
-- If it already exists, this is a no-op.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_contacts_stage_lifecycle_stages'
          AND table_schema = 'public'
          AND table_name = 'contacts'
    ) THEN
        -- Lock to prevent concurrent inserts from creating orphans
        LOCK TABLE public.contacts IN SHARE ROW EXCLUSIVE MODE;

        -- Fix orphans first
        UPDATE public.contacts
        SET stage = NULL
        WHERE stage IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.lifecycle_stages ls WHERE ls.id = contacts.stage
          );

        ALTER TABLE public.contacts
            ADD CONSTRAINT fk_contacts_stage_lifecycle_stages
            FOREIGN KEY (stage) REFERENCES public.lifecycle_stages(id);

        RAISE NOTICE 'FIX-4: FK fk_contacts_stage_lifecycle_stages created with LOCK';
    ELSE
        RAISE NOTICE 'FIX-4: FK fk_contacts_stage_lifecycle_stages already exists — no action';
    END IF;
END;
$$;

-- =============================================================================
-- FIX-5: notify_deal_stage_changed() — add organization_id filters
-- =============================================================================
-- BEFORE: Reads boards, board_stages, contacts by ID only (no tenant scope)
-- AFTER:  Adds AND organization_id = NEW.organization_id to each helper SELECT
-- Function remains SECURITY DEFINER (needed for webhook insert), but now
-- scoped to same tenant.

CREATE OR REPLACE FUNCTION public.notify_deal_stage_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  endpoint RECORD;
  board_name TEXT;
  from_label TEXT;
  to_label TEXT;
  contact_name TEXT;
  contact_phone TEXT;
  contact_email TEXT;
  payload JSONB;
  event_id UUID;
  delivery_id UUID;
  req_id BIGINT;
BEGIN
  IF (TG_OP <> 'UPDATE') THEN
    RETURN NEW;
  END IF;

  IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN
    RETURN NEW;
  END IF;

  -- FIX-5: Added organization_id filter to prevent cross-tenant data exposure
  SELECT b.name INTO board_name
  FROM public.boards b
  WHERE b.id = NEW.board_id
    AND b.organization_id = NEW.organization_id;

  SELECT bs.label INTO to_label
  FROM public.board_stages bs
  WHERE bs.id = NEW.stage_id
    AND bs.organization_id = NEW.organization_id;

  SELECT bs.label INTO from_label
  FROM public.board_stages bs
  WHERE bs.id = OLD.stage_id
    AND bs.organization_id = NEW.organization_id;

  IF NEW.contact_id IS NOT NULL THEN
    SELECT c.name, c.phone, c.email
      INTO contact_name, contact_phone, contact_email
    FROM public.contacts c
    WHERE c.id = NEW.contact_id
      AND c.organization_id = NEW.organization_id;
  END IF;

  FOR endpoint IN
    SELECT * FROM public.integration_outbound_endpoints e
    WHERE e.organization_id = NEW.organization_id
      AND e.active = true
      AND 'deal.stage_changed' = ANY(e.events)
  LOOP
    payload := jsonb_build_object(
      'event_type', 'deal.stage_changed',
      'occurred_at', now(),
      'deal', jsonb_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'value', NEW.value,
        'board_id', NEW.board_id,
        'board_name', board_name,
        'from_stage_id', OLD.stage_id,
        'from_stage_label', from_label,
        'to_stage_id', NEW.stage_id,
        'to_stage_label', to_label,
        'contact_id', NEW.contact_id
      ),
      'contact', jsonb_build_object(
        'name', contact_name,
        'phone', contact_phone,
        'email', contact_email
      ),
      'organization_id', NEW.organization_id
    );

    event_id := gen_random_uuid();
    delivery_id := gen_random_uuid();

    INSERT INTO public.integration_webhook_events (
      id, organization_id, event_type, payload, status, created_at
    ) VALUES (
      event_id, NEW.organization_id, 'deal.stage_changed', payload, 'pending', now()
    );

    INSERT INTO public.integration_webhook_deliveries (
      id, event_id, endpoint_id, status, created_at
    ) VALUES (
      delivery_id, event_id, endpoint.id, 'pending', now()
    );

    BEGIN
      SELECT net.http_post(
        url := endpoint.url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Webhook-Event', 'deal.stage_changed',
          'X-Webhook-Delivery', delivery_id::text,
          'X-Webhook-Secret', endpoint.secret
        ),
        body := payload
      ) INTO req_id;

      UPDATE public.integration_webhook_deliveries
      SET status = 'sent', request_id = req_id, sent_at = now()
      WHERE id = delivery_id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.integration_webhook_deliveries
      SET status = 'failed', error_message = SQLERRM, sent_at = now()
      WHERE id = delivery_id;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMIT;
