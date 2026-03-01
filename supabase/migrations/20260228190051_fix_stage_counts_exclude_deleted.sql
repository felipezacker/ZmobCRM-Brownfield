-- Fix: get_contact_stage_counts was counting soft-deleted contacts
-- The LEFT JOIN was missing AND c.deleted_at IS NULL, causing stage tabs
-- to show ghost counts for contacts that were already deleted.

CREATE OR REPLACE FUNCTION public.get_contact_stage_counts(p_org_id UUID)
RETURNS TABLE(stage_id TEXT, stage_name TEXT, contact_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        ls.id AS stage_id,
        ls.name AS stage_name,
        COUNT(c.id) AS contact_count
    FROM public.lifecycle_stages ls
    LEFT JOIN public.contacts c
        ON c.stage = ls.id
        AND c.organization_id = p_org_id
        AND c.deleted_at IS NULL
    GROUP BY ls.id, ls.name, ls.order
    ORDER BY ls.order;
$$;
