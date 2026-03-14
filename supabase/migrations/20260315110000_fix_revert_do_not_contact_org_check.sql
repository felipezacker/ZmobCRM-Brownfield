-- Migration: Fix CRITICAL security issue in revert_do_not_contact
-- The original function checked role (admin/diretor) but did NOT verify
-- that the contact belongs to the caller's organization.
-- An admin from Org A could revert a block on a contact from Org B.
-- This adds org membership validation matching mark_do_not_contact parity.

BEGIN;

CREATE OR REPLACE FUNCTION public.revert_do_not_contact(
  p_contact_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_org_id UUID;
  v_contact_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, organization_id INTO v_user_role, v_user_org_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'diretor') THEN
    RAISE EXCEPTION 'Apenas admin ou diretor pode reverter bloqueio';
  END IF;

  SELECT organization_id INTO v_contact_org_id
  FROM public.contacts
  WHERE id = p_contact_id AND deleted_at IS NULL;

  IF v_contact_org_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  IF v_user_org_id IS DISTINCT FROM v_contact_org_id THEN
    RAISE EXCEPTION 'Access denied: different organization';
  END IF;

  UPDATE public.contacts
  SET
    do_not_contact = false,
    do_not_contact_reason = NULL,
    do_not_contact_at = NULL,
    do_not_contact_by = NULL,
    updated_at = now()
  WHERE id = p_contact_id;
END;
$$;

COMMIT;
