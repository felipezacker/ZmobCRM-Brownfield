-- Migration: Add auto-retry fields to prospecting_queues
-- Story: CP-2.1 (Auto-Retry de Contatos + Histórico no PowerDialer)
-- Description: Adds retry_at, retry_count columns and retry_pending/exhausted statuses

BEGIN;

-- ============================================================================
-- 1. Add retry columns
-- ============================================================================

ALTER TABLE public.prospecting_queues
  ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.prospecting_queues.retry_at IS 'When this contact becomes eligible for retry (null = not scheduled)';
COMMENT ON COLUMN public.prospecting_queues.retry_count IS 'Number of retry attempts (max 3, then exhausted)';

-- ============================================================================
-- 2. Update status CHECK constraint to include new statuses
-- ============================================================================

-- Drop existing constraint and recreate with new statuses
ALTER TABLE public.prospecting_queues
  DROP CONSTRAINT IF EXISTS prospecting_queues_status_check;

ALTER TABLE public.prospecting_queues
  ADD CONSTRAINT prospecting_queues_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'retry_pending', 'exhausted'));

-- ============================================================================
-- 3. Index for efficient retry queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prospecting_queues_retry
  ON public.prospecting_queues(retry_at, status)
  WHERE retry_at IS NOT NULL AND status = 'retry_pending';

COMMIT;
