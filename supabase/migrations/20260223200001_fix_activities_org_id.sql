-- ============================================================
-- Fix: Backfill organization_id on activities
-- Problem: Most activities have organization_id = NULL, RLS hides them
-- Solution: Fill from associated deal or from the single organization
-- ============================================================

BEGIN;

-- Step 1: Fill organization_id from associated deal
UPDATE public.activities a
SET organization_id = d.organization_id
FROM public.deals d
WHERE a.deal_id = d.id
  AND a.organization_id IS NULL
  AND d.organization_id IS NOT NULL;

-- Step 2: Fill organization_id from associated contact
UPDATE public.activities a
SET organization_id = c.organization_id
FROM public.contacts c
WHERE a.contact_id = c.id
  AND a.organization_id IS NULL
  AND c.organization_id IS NOT NULL;

-- Step 3: Fill remaining NULLs from the singleton organization
UPDATE public.activities
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

-- Step 4: Also backfill owner_id from the user who has activities
-- (for activities created by triggers/system with no owner)
UPDATE public.activities a
SET owner_id = d.owner_id
FROM public.deals d
WHERE a.deal_id = d.id
  AND a.owner_id IS NULL
  AND d.owner_id IS NOT NULL;

COMMIT;
