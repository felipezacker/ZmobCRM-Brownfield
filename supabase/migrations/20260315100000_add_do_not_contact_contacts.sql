-- Migration: Add do_not_contact fields to contacts + RPC functions (CP-7.1)
-- LGPD compliance: opt-out mechanism with reason tracking

BEGIN;

-- Subtask 1.1: Add do_not_contact columns
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_contact_reason TEXT,
  ADD COLUMN IF NOT EXISTS do_not_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS do_not_contact_by UUID REFERENCES auth.users(id);

-- Subtask 1.2: Index for queue filtering performance
CREATE INDEX IF NOT EXISTS idx_contacts_do_not_contact
  ON public.contacts(do_not_contact)
  WHERE do_not_contact = true;

-- Subtask 1.3: RPC mark_do_not_contact
-- Any authenticated user in the same org can block a contact.
-- Also removes the contact from all active prospecting queues atomically.
CREATE OR REPLACE FUNCTION public.mark_do_not_contact(
  p_contact_id UUID,
  p_reason TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_org_id UUID;
  v_contact_org_id UUID;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_user_org_id
  FROM public.profiles
  WHERE id = v_user_id;

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
    do_not_contact = true,
    do_not_contact_reason = p_reason,
    do_not_contact_at = now(),
    do_not_contact_by = v_user_id,
    updated_at = now()
  WHERE id = p_contact_id;

  UPDATE public.prospecting_queues
  SET status = 'completed', updated_at = now()
  WHERE contact_id = p_contact_id
    AND status IN ('pending', 'in_progress', 'retry_pending');
END;
$$;

-- Subtask 1.4: RPC revert_do_not_contact
-- Only admin or diretor can revert (validated via JWT user_role from custom_access_token_hook).
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_user_role := (auth.jwt() ->> 'user_role');

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'diretor') THEN
    RAISE EXCEPTION 'Apenas admin ou diretor pode reverter bloqueio';
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

-- Subtask 1.5: NOT altering existing RLS policies (RPCs use SECURITY DEFINER)

COMMIT;
