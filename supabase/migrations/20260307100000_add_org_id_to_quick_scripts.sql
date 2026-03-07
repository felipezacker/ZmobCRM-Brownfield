-- =============================================================================
-- TD-2.2 QA Fix: Add organization_id to quick_scripts for multi-tenancy
-- =============================================================================
-- Issue: quick_scripts relies only on user_id RLS. When admin client is used
-- (MCP/API contexts), RLS is bypassed and scripts from all orgs are returned.
-- Fix: Add organization_id column, backfill from profiles, update RLS policies.
-- =============================================================================

-- 1. Add column
ALTER TABLE public.quick_scripts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Backfill: derive org_id from user_id via profiles
UPDATE public.quick_scripts qs
SET organization_id = p.organization_id
FROM public.profiles p
WHERE qs.user_id = p.id
  AND qs.organization_id IS NULL;

-- 3. Index for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_quick_scripts_org ON public.quick_scripts(organization_id);

-- 4. Update RLS policies to include organization_id scoping
-- SELECT: system scripts visible to all authenticated, user scripts scoped by org
DROP POLICY IF EXISTS "quick_scripts_select" ON public.quick_scripts;
CREATE POLICY "quick_scripts_select" ON public.quick_scripts
    FOR SELECT TO authenticated
    USING (
        is_system = true
        OR (
            user_id = auth.uid()
            AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- INSERT: user must belong to the org they're inserting into
DROP POLICY IF EXISTS "quick_scripts_insert" ON public.quick_scripts;
CREATE POLICY "quick_scripts_insert" ON public.quick_scripts
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- UPDATE: only own scripts within same org
DROP POLICY IF EXISTS "quick_scripts_update" ON public.quick_scripts;
CREATE POLICY "quick_scripts_update" ON public.quick_scripts
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- DELETE: only own scripts within same org
DROP POLICY IF EXISTS "quick_scripts_delete" ON public.quick_scripts;
CREATE POLICY "quick_scripts_delete" ON public.quick_scripts
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        AND is_system = false
        AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
