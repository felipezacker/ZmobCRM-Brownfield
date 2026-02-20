-- =============================================================================
-- MIGRATION: Remove Entities — crm_companies, role (cargo), company_name
-- =============================================================================
-- Story: 1.2 - Remover Empresas e Cargos
-- Date: 2026-02-20
-- Description:
--   1. Remove crm_companies from Realtime publication
--   2. Update get_dashboard_stats() to remove total_companies reference
--   3. Drop FK constraints on client_company_id
--   4. Drop indexes related to companies
--   5. Drop columns: client_company_id, company_name, role
--   6. Drop columns from leads table
--   7. Drop table crm_companies
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Remove crm_companies from Realtime BEFORE dropping table
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'crm_companies'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE crm_companies;
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Update get_dashboard_stats() — remove total_companies
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_organization_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_contacts', (
      SELECT count(*) FROM public.contacts
      WHERE organization_id = p_organization_id
        AND deleted_at IS NULL
    ),
    'total_deals', (
      SELECT count(*) FROM public.deals
      WHERE organization_id = p_organization_id
        AND deleted_at IS NULL
    ),
    'total_activities', (
      SELECT count(*) FROM public.activities
      WHERE organization_id = p_organization_id
        AND deleted_at IS NULL
    ),
    'open_deals', (
      SELECT count(*) FROM public.deals
      WHERE organization_id = p_organization_id
        AND deleted_at IS NULL
        AND is_won = false
        AND is_lost = false
    ),
    'won_deals', (
      SELECT count(*) FROM public.deals
      WHERE organization_id = p_organization_id
        AND deleted_at IS NULL
        AND is_won = true
    ),
    'pipeline_value', (
      SELECT COALESCE(sum(value), 0) FROM public.deals
      WHERE organization_id = p_organization_id
        AND deleted_at IS NULL
        AND is_won = false
        AND is_lost = false
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 3: Drop FK constraints (with IF EXISTS for safety)
-- =============================================================================

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_client_company_id_fkey;
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_client_company_id_fkey;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_client_company_id_fkey;

-- =============================================================================
-- STEP 4: Drop indexes
-- =============================================================================

DROP INDEX IF EXISTS public.idx_deals_client_company_id;
DROP INDEX IF EXISTS public.idx_crm_companies_created_at;
DROP INDEX IF EXISTS public.idx_activities_client_company_id;

-- =============================================================================
-- STEP 5: Drop columns from contacts, deals, activities
-- =============================================================================

ALTER TABLE public.contacts DROP COLUMN IF EXISTS client_company_id;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS company_name;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS role;

ALTER TABLE public.deals DROP COLUMN IF EXISTS client_company_id;

ALTER TABLE public.activities DROP COLUMN IF EXISTS client_company_id;

-- =============================================================================
-- STEP 6: Drop columns from leads table
-- =============================================================================

ALTER TABLE public.leads DROP COLUMN IF EXISTS company_name;
ALTER TABLE public.leads DROP COLUMN IF EXISTS role;

-- =============================================================================
-- STEP 7: Drop table crm_companies
-- =============================================================================

DROP TABLE IF EXISTS public.crm_companies;

COMMIT;
