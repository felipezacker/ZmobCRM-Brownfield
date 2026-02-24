-- DB-019: Document deals.status column relationship to stage_id
--
-- The `status` column on the `deals` table stores the stage UUID (same value as `stage_id`).
-- In the TypeScript frontend types, `Deal.status` is the canonical property name that maps
-- to the database `stage_id` column. AI tool SQL queries already use `stage_id` correctly.
--
-- References using Deal.status (TypeScript property, NOT direct SQL):
--   1. lib/ai/crmAgent.ts        — reads deal.status for prompt context
--   2. lib/ai/tasksClient.ts     — passes deal.status to AI task endpoints (x2)
--   3. lib/ai/actionsClient.ts   — passes deal.status to AI proxy endpoints (x2)
--
-- All SQL queries in lib/ai/tools/deal-tools.ts already use stage_id.
-- No migration of data or column rename is needed at this time.

COMMENT ON COLUMN public.deals.status IS
  'DEPRECATED mapping — frontend Deal.status maps to this column but canonical DB column is stage_id. '
  'Both store the board stage UUID. AI tool SQL queries use stage_id. '
  'See DB-019 for full audit. Do NOT use this column in new SQL — use stage_id instead.';
