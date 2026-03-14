-- Migration: Create contact_lists and contact_list_members tables
-- Story: CL-1 (Contact Lists)
-- Description: Static named lists for organizing contacts by origin/profile.
--   Org-level shared lists, N:N relationship via contact_list_members.

BEGIN;

-- ============================================================================
-- 1. Table: contact_lists
-- ============================================================================

CREATE TABLE public.contact_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.contact_lists IS 'Named static lists for organizing contacts (CL-1). Org-level shared.';

-- ============================================================================
-- 2. Table: contact_list_members (junction N:N)
-- ============================================================================

CREATE TABLE public.contact_list_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    added_by UUID REFERENCES public.profiles(id),
    UNIQUE(list_id, contact_id)
);

COMMENT ON TABLE public.contact_list_members IS 'Junction table: contacts <-> lists (N:N). CASCADE on both sides.';

-- ============================================================================
-- 3. Indexes
-- ============================================================================

CREATE INDEX idx_contact_lists_organization_id ON public.contact_lists(organization_id);
CREATE INDEX idx_contact_list_members_list_id ON public.contact_list_members(list_id);
CREATE INDEX idx_contact_list_members_contact_id ON public.contact_list_members(contact_id);

-- ============================================================================
-- 4. Trigger: updated_at on contact_lists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_contact_lists_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contact_lists_updated_at
    BEFORE UPDATE ON public.contact_lists
    FOR EACH ROW
    EXECUTE FUNCTION public.set_contact_lists_updated_at();

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_list_members ENABLE ROW LEVEL SECURITY;

-- contact_lists: org-level (shared with everyone in org)
CREATE POLICY "contact_lists_select" ON public.contact_lists
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_lists_insert" ON public.contact_lists
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_lists_update" ON public.contact_lists
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "contact_lists_delete" ON public.contact_lists
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_user_organization_id()
    );

-- contact_list_members: access via list's organization
CREATE POLICY "contact_list_members_select" ON public.contact_list_members
    FOR SELECT TO authenticated
    USING (
        list_id IN (
            SELECT id FROM public.contact_lists
            WHERE organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "contact_list_members_insert" ON public.contact_list_members
    FOR INSERT TO authenticated
    WITH CHECK (
        list_id IN (
            SELECT id FROM public.contact_lists
            WHERE organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "contact_list_members_delete" ON public.contact_list_members
    FOR DELETE TO authenticated
    USING (
        list_id IN (
            SELECT id FROM public.contact_lists
            WHERE organization_id = public.get_user_organization_id()
        )
    );

-- No UPDATE policy on members — rows are inserted/deleted only (no fields to update)

COMMIT;
