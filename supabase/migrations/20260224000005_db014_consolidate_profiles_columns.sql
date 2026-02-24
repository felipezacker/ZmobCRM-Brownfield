-- DB-014: Consolidate duplicate columns in profiles table
-- avatar (deprecated) -> avatar_url (canonical)
-- name (deprecated) -> first_name (canonical)
--
-- This migration:
-- 1. Copies data from deprecated columns to canonical where canonical is NULL
-- 2. Re-creates handle_new_user trigger to write to canonical columns
-- 3. Adds COMMENT marking deprecated columns (does NOT drop them yet)

-- =============================================================================
-- Step 1: Copy data from deprecated to canonical (idempotent)
-- =============================================================================

-- avatar -> avatar_url (where avatar_url is NULL but avatar has data)
UPDATE public.profiles
SET avatar_url = avatar
WHERE avatar_url IS NULL
  AND avatar IS NOT NULL;

-- name -> first_name (where first_name is NULL but name has data)
UPDATE public.profiles
SET first_name = name
WHERE first_name IS NULL
  AND name IS NOT NULL;

-- =============================================================================
-- Step 2: Mark deprecated columns with COMMENT
-- =============================================================================

COMMENT ON COLUMN public.profiles.avatar IS
  'DEPRECATED (DB-014): Use avatar_url instead. Will be dropped in a future migration.';

COMMENT ON COLUMN public.profiles.name IS
  'DEPRECATED (DB-014): Use first_name + last_name instead. Will be dropped in a future migration.';

-- =============================================================================
-- Step 3: Re-create handle_new_user to write to canonical columns
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- ALWAYS use singleton organization — ignore metadata to prevent cross-tenant enrollment
    v_org_id := public.get_singleton_organization_id();

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma organization encontrada. Rode o setup inicial antes de criar usuários.';
    END IF;

    -- Create Profile — ALWAYS 'corretor', ignoring any metadata role
    -- Writes to canonical columns (avatar_url, first_name) per DB-014
    INSERT INTO public.profiles (id, email, first_name, avatar_url, role, organization_id)
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
