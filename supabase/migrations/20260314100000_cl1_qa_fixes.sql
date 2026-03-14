-- Migration: CL-1 QA fixes
-- Story: CL-1 (Contact Lists) — QA review fixes
-- Fixes:
--   1. UNIQUE constraint on (organization_id, name) to prevent duplicate list names
--   2. RPC count_contacts_without_list for accurate sidebar count

BEGIN;

-- ============================================================================
-- 1. UNIQUE constraint: prevent duplicate list names within org
-- ============================================================================

CREATE UNIQUE INDEX idx_contact_lists_org_name_unique
    ON public.contact_lists (organization_id, lower(name));

-- ============================================================================
-- 2. RPC: count contacts not in any list (for "Sem Lista" sidebar count)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_contacts_without_list(p_org_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT COUNT(*)
    FROM public.contacts c
    WHERE c.organization_id = p_org_id
      AND c.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.contact_list_members clm
          WHERE clm.contact_id = c.id
      );
$$;

COMMIT;
