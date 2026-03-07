# Data Engineer Agent Memory

## ZmobCRM Database Overview
- **52 migrations** in `supabase/migrations/` (20251201 to 20260306)
- **39 public tables** + 3 storage buckets
- **PostgreSQL 17** via Supabase
- **RLS 100%** coverage (all tables have ENABLE ROW LEVEL SECURITY)
- **RBAC 3-tier:** admin > diretor > corretor
- **Key helper functions:** `get_user_organization_id()` (anti-RLS-recursion), `is_admin_or_director()`

## Known Issues (verified 2026-03-06)
- `system_notifications` and `rate_limits` still have permissive RLS (USING(true))
- `activities.client_company_id` is an orphan column (crm_companies table was dropped)
- `merge_contacts()` is SECURITY DEFINER without org validation
- `increment/decrement_contact_ltv()` are SECURITY DEFINER without org check
- Main tables (contacts, deals, boards, profiles, activities) lack `updated_at` triggers
- `deals.status` TEXT column coexists with `is_won`/`is_lost` flags (legacy)

## Schema Docs
- SCHEMA.md: `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/supabase/docs/SCHEMA.md`
- DB-AUDIT.md: `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/supabase/docs/DB-AUDIT.md`

## Migration Patterns
- Schema init is a monolithic 1900+ line consolidation file
- Subsequent migrations are well-structured with story references
- No rollback scripts exist for any migration
- Good use of IF NOT EXISTS, BEGIN/COMMIT, DROP POLICY IF EXISTS patterns

## Environment
- Production: `fkfqwxjrgfuerysaxayr` (Oregon)
- Staging: `xbwbwnevtpmmehgxfvcp` (Sao Paulo)
- Local: `localhost:54321`
- `supabase db push` defaults to staging (safe)

## Sequence Incident (2026-03-02)
- auth.refresh_tokens_id_seq desync after data import caused login failures
- Fix: `SELECT setval('auth.refresh_tokens_id_seq', (SELECT MAX(id) FROM auth.refresh_tokens));`
- Always reset sequences after importing data into auth tables with bigint PKs
