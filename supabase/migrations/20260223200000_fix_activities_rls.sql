-- ============================================================
-- Fix: Activities RLS policy to handle NULL owner_id
-- Problem: Activities with owner_id = NULL are invisible after RLS
-- Solution: Allow org members to see activities where owner_id IS NULL
-- ============================================================

BEGIN;

-- Step 1: Backfill owner_id from associated deal's owner where possible
UPDATE public.activities a
SET owner_id = d.owner_id
FROM public.deals d
WHERE a.deal_id = d.id
  AND a.owner_id IS NULL
  AND d.owner_id IS NOT NULL;

-- Step 2: Replace SELECT policy to handle NULL owner_id
DROP POLICY IF EXISTS "activities_select" ON public.activities;

CREATE POLICY "activities_select" ON public.activities
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

-- Step 3: Also fix UPDATE/DELETE to allow admins to manage NULL-owner activities
DROP POLICY IF EXISTS "activities_update" ON public.activities;

CREATE POLICY "activities_update" ON public.activities
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

DROP POLICY IF EXISTS "activities_delete" ON public.activities;

CREATE POLICY "activities_delete" ON public.activities
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

COMMIT;
