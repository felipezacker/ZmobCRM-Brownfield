-- =============================================================================
-- DB-012: CHECK constraints on numeric and status fields
-- =============================================================================
-- Idempotent: uses DO blocks to check constraint existence before adding.

DO $$
BEGIN
  -- deals.probability BETWEEN 0 AND 100
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'deals_probability_range'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_probability_range CHECK (probability >= 0 AND probability <= 100);
  END IF;

  -- deals.value >= 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'deals_value_non_negative'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_value_non_negative CHECK (value >= 0);
  END IF;

  -- deal_items.price >= 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'deal_items_price_non_negative'
  ) THEN
    ALTER TABLE public.deal_items
      ADD CONSTRAINT deal_items_price_non_negative CHECK (price >= 0);
  END IF;

  -- deal_items.quantity > 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'deal_items_quantity_positive'
  ) THEN
    ALTER TABLE public.deal_items
      ADD CONSTRAINT deal_items_quantity_positive CHECK (quantity > 0);
  END IF;

  -- contacts.email must contain '@' (if not null/empty)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'contacts_email_format'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_email_format CHECK (
        email IS NULL OR btrim(email) = '' OR email LIKE '%@%'
      );
  END IF;

  -- profiles.email must contain '@' (if not null/empty)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_email_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_email_format CHECK (
        email IS NULL OR btrim(email) = '' OR email LIKE '%@%'
      );
  END IF;
END $$;
