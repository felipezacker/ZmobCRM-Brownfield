-- Migration: Move tags and custom_fields from deals to contacts
-- Tags and custom fields belong to the contact/lead, not the deal.
-- Deals will inherit contact data (read-only).

-- 1. Add columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- 2. Migrate data from deals to contacts (merge — one contact may have N deals)
WITH deal_tags AS (
  SELECT contact_id, array_agg(DISTINCT t) AS merged_tags
  FROM public.deals, unnest(COALESCE(tags, '{}')) AS t
  WHERE contact_id IS NOT NULL
    AND deleted_at IS NULL
    AND t IS NOT NULL
    AND t != ''
  GROUP BY contact_id
),
deal_cf AS (
  SELECT d.contact_id,
    jsonb_strip_nulls(jsonb_object_agg(kv.key, kv.value)) AS merged_cf
  FROM public.deals d, jsonb_each(COALESCE(d.custom_fields, '{}')) AS kv
  WHERE d.contact_id IS NOT NULL
    AND d.deleted_at IS NULL
  GROUP BY d.contact_id
)
UPDATE public.contacts c SET
  tags = COALESCE(dt.merged_tags, '{}'),
  custom_fields = COALESCE(dc.merged_cf, '{}')
FROM deal_tags dt
FULL OUTER JOIN deal_cf dc ON dt.contact_id = dc.contact_id
WHERE c.id = COALESCE(dt.contact_id, dc.contact_id);

-- 3. Drop columns from deals
ALTER TABLE public.deals DROP COLUMN IF EXISTS tags;
ALTER TABLE public.deals DROP COLUMN IF EXISTS custom_fields;

-- 4. Update custom_field_definitions default entity_type
ALTER TABLE public.custom_field_definitions
  ALTER COLUMN entity_type SET DEFAULT 'contact';

-- 5. Migrate existing definitions from 'deal' to 'contact'
UPDATE public.custom_field_definitions
  SET entity_type = 'contact'
  WHERE entity_type = 'deal';
