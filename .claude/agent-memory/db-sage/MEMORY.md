# DB Sage Memory - ZmobCRM

## Schema Overview (as of 2026-03-03)
- 36 active tables, 42 migrations, PostgreSQL 17 on Supabase
- Single-tenant in practice, multi-tenant structure (organizations as root)
- RBAC: admin > diretor > corretor (CHECK constraints on profiles.role)
- RLS: 100% enabled, org-scoped with helper functions
- Key helper: `get_user_organization_id()` (SECURITY DEFINER, avoids RLS recursion)
- Key helper: `is_admin_or_director(p_org_id)` (SECURITY INVOKER)

## Critical Known Bugs
1. `notify_deal_stage_changed()` references non-existent tables `integration_webhook_events` / `integration_webhook_deliveries` (introduced by migration 20260225000000_coderabbit_pr5_fixes.sql). Correct tables: `webhook_events_out` / `webhook_deliveries`. Webhooks outbound are broken.
2. `merge_contacts()` cross-tenant risk - FIXED by migration 20260306100001 (added auth.uid() org check + winner/loser same-org check).
3. `ai_suggestion_interactions` still has permissive RLS (USING true) - never hardened.

## Schema Design Notes
- Soft delete pattern (deleted_at) on: organizations, boards, contacts, deals, activities, leads
- Deprecated columns in profiles: name (use first_name), avatar (use avatar_url)
- Deprecated column in deals: status (use stage_id)
- Tags and custom_fields moved from deals to contacts (migration 20260227220048)
- contact_phones and contact_preferences are Epic 3 (CRM imobiliario) additions
- notifications table is separate from system_notifications (duplication)

## File Locations
- Migrations: `supabase/migrations/` (42 files)
- Schema doc: `supabase/docs/SCHEMA.md`
- Audit doc: `supabase/docs/DB-AUDIT.md`
- Config: `supabase/config.toml`
