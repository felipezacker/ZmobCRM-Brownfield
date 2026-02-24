-- ============================================================
-- Fix: Backfill NULL owner_id across all tables
-- Also ensure deals/contacts SELECT policies work for NULL owners
-- ============================================================

BEGIN;

-- ============================================================
-- PART 1: BACKFILL owner_id WHERE POSSIBLE
-- ============================================================

-- Contacts: set owner to the org's first admin
UPDATE public.contacts c
SET owner_id = (
    SELECT p.id FROM public.profiles p
    WHERE p.organization_id = c.organization_id
      AND p.role = 'admin'
    LIMIT 1
)
WHERE c.owner_id IS NULL
  AND c.organization_id IS NOT NULL;

-- Deals: set owner to the org's first admin
UPDATE public.deals d
SET owner_id = (
    SELECT p.id FROM public.profiles p
    WHERE p.organization_id = d.organization_id
      AND p.role = 'admin'
    LIMIT 1
)
WHERE d.owner_id IS NULL
  AND d.organization_id IS NOT NULL;

-- ============================================================
-- PART 2: FIX POLICIES TO HANDLE NULL owner_id
-- ============================================================

-- DEALS: Allow NULL owner to be visible to org members
DROP POLICY IF EXISTS "deals_select" ON public.deals;
CREATE POLICY "deals_select" ON public.deals
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

DROP POLICY IF EXISTS "deals_update" ON public.deals;
CREATE POLICY "deals_update" ON public.deals
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

DROP POLICY IF EXISTS "deals_delete" ON public.deals;
CREATE POLICY "deals_delete" ON public.deals
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

-- CONTACTS: Allow NULL owner to be visible to org members
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
CREATE POLICY "contacts_update" ON public.contacts
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
CREATE POLICY "contacts_delete" ON public.contacts
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            owner_id = auth.uid()
            OR owner_id IS NULL
            OR public.is_admin_or_director(organization_id)
        )
    );

-- BOARDS: Same pattern (owner_id can be NULL)
DROP POLICY IF EXISTS "boards_update" ON public.boards;
CREATE POLICY "boards_update" ON public.boards
    FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR owner_id IS NULL OR public.is_admin_or_director(organization_id))
    );

DROP POLICY IF EXISTS "boards_delete" ON public.boards;
CREATE POLICY "boards_delete" ON public.boards
    FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (owner_id = auth.uid() OR owner_id IS NULL OR public.is_admin_or_director(organization_id))
    );

COMMIT;
