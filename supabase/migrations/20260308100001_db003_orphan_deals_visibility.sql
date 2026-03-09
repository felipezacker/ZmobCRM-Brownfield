-- Migration: DB-003 Orphan Deals Visibility
-- Task: Create RPC functions for identifying, listing, and managing orphan deals
-- AC13: Admin dashboard shows count of deals with contact_id IS NULL (orphans)
-- AC14: Mechanism to clean up or assign orphan deals

BEGIN;

-- =============================================================================
-- 1. RPC: get_orphan_deals_count()
-- =============================================================================
-- Returns integer count of deals where contact_id IS NULL AND deleted_at IS NULL
-- Scoped to user's organization via get_user_organization_id()
-- SECURITY INVOKER (uses caller's RLS context)

CREATE OR REPLACE FUNCTION public.get_orphan_deals_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.deals
  WHERE organization_id = public.get_user_organization_id()
    AND contact_id IS NULL
    AND deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_orphan_deals_count() IS
  'DB-003 AC13: Returns count of orphan deals in user''s organization. '
  'Orphan = contact_id IS NULL AND deleted_at IS NULL.';

-- =============================================================================
-- 2. RPC: list_orphan_deals(p_limit, p_offset)
-- =============================================================================
-- Returns paginated list of orphan deals ordered by updated_at DESC
-- Scoped to user's organization

CREATE OR REPLACE FUNCTION public.list_orphan_deals(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  value numeric,
  status text,
  board_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.title,
    d.value,
    d.status,
    d.board_id,
    d.created_at,
    d.updated_at
  FROM public.deals d
  WHERE d.organization_id = public.get_user_organization_id()
    AND d.contact_id IS NULL
    AND d.deleted_at IS NULL
  ORDER BY d.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.list_orphan_deals(integer, integer) IS
  'DB-003 AC13: Returns paginated list of orphan deals in user''s organization. '
  'Results ordered by updated_at DESC (most recent first).';

-- =============================================================================
-- 3. RPC: assign_orphan_deals_to_contact()
-- =============================================================================
-- Updates contact_id for specified orphan deals
-- Validates contact exists and belongs to same org
-- Only updates deals that are actually orphans (contact_id IS NULL)
-- Returns count of updated deals

CREATE OR REPLACE FUNCTION public.assign_orphan_deals_to_contact(
  p_deal_ids uuid[],
  p_contact_id uuid
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_contact_exists boolean;
  v_updated_count integer;
BEGIN
  -- Get user's organization
  v_org_id := public.get_user_organization_id();

  -- Validate contact exists and belongs to same organization
  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = p_contact_id
      AND c.organization_id = v_org_id
      AND c.deleted_at IS NULL
  ) INTO v_contact_exists;

  IF NOT v_contact_exists THEN
    RAISE EXCEPTION 'Contact % does not exist in your organization', p_contact_id;
  END IF;

  -- Update orphan deals: only update if contact_id IS NULL
  UPDATE public.deals d
  SET
    contact_id = p_contact_id,
    updated_at = NOW()
  WHERE d.id = ANY(p_deal_ids)
    AND d.organization_id = v_org_id
    AND d.contact_id IS NULL
    AND d.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

COMMENT ON FUNCTION public.assign_orphan_deals_to_contact(uuid[], uuid) IS
  'DB-003 AC14: Assign orphan deals to a contact. '
  'Returns count of successfully updated deals. '
  'Only updates deals that are actually orphans (contact_id IS NULL).';

-- =============================================================================
-- 4. RPC: delete_orphan_deals()
-- =============================================================================
-- Soft-deletes specified orphan deals (SET deleted_at = NOW())
-- Only deletes deals that are actually orphans (contact_id IS NULL)
-- Scoped to user's organization
-- Returns count of deleted deals

CREATE OR REPLACE FUNCTION public.delete_orphan_deals(p_deal_ids uuid[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_deleted_count integer;
BEGIN
  -- Get user's organization
  v_org_id := public.get_user_organization_id();

  -- Soft-delete orphan deals: only delete if contact_id IS NULL
  UPDATE public.deals d
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE d.id = ANY(p_deal_ids)
    AND d.organization_id = v_org_id
    AND d.contact_id IS NULL
    AND d.deleted_at IS NULL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.delete_orphan_deals(uuid[]) IS
  'DB-003 AC14: Soft-delete orphan deals in user''s organization. '
  'Returns count of successfully deleted deals. '
  'Only deletes deals that are actually orphans (contact_id IS NULL).';

-- =============================================================================
-- 5. Grant Permissions
-- =============================================================================
-- All functions accessible by authenticated users

GRANT EXECUTE ON FUNCTION public.get_orphan_deals_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_orphan_deals(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_orphan_deals_to_contact(uuid[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_orphan_deals(uuid[]) TO authenticated;

COMMIT;
