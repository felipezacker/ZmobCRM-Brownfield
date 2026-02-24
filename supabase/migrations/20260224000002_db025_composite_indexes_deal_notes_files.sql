-- =============================================================================
-- DB-025: Composite indexes for deal_notes and deal_files
-- =============================================================================
-- NOTE: deal_notes and deal_files do NOT have an organization_id column.
-- The deal_id already implies organization context (via deals.organization_id).
-- Existing single-column indexes on deal_id already cover the primary query
-- pattern. Adding covering indexes with created_at for common sort patterns.

-- deal_notes: composite (deal_id, created_at DESC) for paginated note queries
CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_created
  ON public.deal_notes (deal_id, created_at DESC);

-- deal_files: composite (deal_id, created_at DESC) for paginated file queries
CREATE INDEX IF NOT EXISTS idx_deal_files_deal_created
  ON public.deal_files (deal_id, created_at DESC);
