-- Migration: DB-003 Orphan Deals RPCs — Admin Role Guard
-- QA Observation #5: RPCs were accessible to all authenticated users.
-- UI already guards with isAdmin, but RPCs themselves had no role check.
-- This adds defense-in-depth: only admin/director roles can call these RPCs.

BEGIN;

-- =============================================================================
-- 1. get_orphan_deals_count() — add admin/director guard
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_orphan_deals_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'director') THEN
    RAISE EXCEPTION 'Permission denied: admin or director role required';
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.deals
    WHERE organization_id = public.get_user_organization_id()
      AND contact_id IS NULL
      AND deleted_at IS NULL
  );
END;
$$;

-- =============================================================================
-- 2. list_orphan_deals() — add admin/director guard
-- =============================================================================
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
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'director') THEN
    RAISE EXCEPTION 'Permission denied: admin or director role required';
  END IF;

  RETURN QUERY
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
END;
$$;

-- =============================================================================
-- 3. assign_orphan_deals_to_contact() — add admin/director guard
-- =============================================================================
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
  v_role TEXT;
  v_contact_exists boolean;
  v_updated_count integer;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'director') THEN
    RAISE EXCEPTION 'Permission denied: admin or director role required';
  END IF;

  v_org_id := public.get_user_organization_id();

  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = p_contact_id
      AND c.organization_id = v_org_id
      AND c.deleted_at IS NULL
  ) INTO v_contact_exists;

  IF NOT v_contact_exists THEN
    RAISE EXCEPTION 'Contact % does not exist in your organization', p_contact_id;
  END IF;

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

-- =============================================================================
-- 4. delete_orphan_deals() — add admin/director guard
-- =============================================================================
CREATE OR REPLACE FUNCTION public.delete_orphan_deals(p_deal_ids uuid[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role TEXT;
  v_deleted_count integer;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'director') THEN
    RAISE EXCEPTION 'Permission denied: admin or director role required';
  END IF;

  v_org_id := public.get_user_organization_id();

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

COMMIT;
