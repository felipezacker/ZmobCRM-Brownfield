-- =============================================================================
-- MIGRATION: Security Critical — Functions Cross-Tenant and Role Injection Fix
-- =============================================================================
-- Story: 1.2 (EPIC-TD)
-- Date: 2026-02-23
-- Description:
--   1. Migrate mark_deal_won/lost, reopen_deal to SECURITY INVOKER
--   2. DROP insecure get_dashboard_stats() (no-parameter version)
--   3. Fix handle_new_user() role injection — always force 'corretor'
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Migrate deal functions to SECURITY INVOKER
-- These functions currently use SECURITY DEFINER, bypassing RLS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_deal_won(deal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE public.deals
    SET
        is_won = TRUE,
        is_lost = FALSE,
        closed_at = NOW(),
        updated_at = NOW()
    WHERE id = deal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_deal_lost(deal_id UUID, reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE public.deals
    SET
        is_lost = TRUE,
        is_won = FALSE,
        loss_reason = COALESCE(reason, loss_reason),
        closed_at = NOW(),
        updated_at = NOW()
    WHERE id = deal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_deal(deal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE public.deals
    SET
        is_won = FALSE,
        is_lost = FALSE,
        closed_at = NULL,
        updated_at = NOW()
    WHERE id = deal_id;
END;
$$;

-- =============================================================================
-- STEP 2: DROP insecure get_dashboard_stats() without parameter
-- The version without org parameter leaks cross-tenant data
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_dashboard_stats();

-- =============================================================================
-- STEP 3: Fix handle_new_user() — ALWAYS force role 'corretor'
-- Previously: COALESCE(new.raw_user_meta_data->>'role', 'corretor')
-- This allowed role injection via signup metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id uuid;
BEGIN
    v_org_id := (new.raw_user_meta_data->>'organization_id')::uuid;
    IF v_org_id IS NULL THEN
        v_org_id := public.get_singleton_organization_id();
    END IF;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma organization encontrada. Rode o setup inicial antes de criar usuários.';
    END IF;

    -- Create Profile — ALWAYS 'corretor', ignoring any metadata role
    INSERT INTO public.profiles (id, email, name, avatar, role, organization_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        'corretor',  -- HARDCODED: prevents role injection via signup
        v_org_id
    );

    -- Create User Settings (idempotente)
    INSERT INTO public.user_settings (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
