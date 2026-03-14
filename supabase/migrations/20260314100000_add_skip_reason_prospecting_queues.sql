-- Migration: Add skip_reason column to prospecting_queues
-- Description: Stores the reason why a contact was skipped during prospecting sessions

BEGIN;

ALTER TABLE public.prospecting_queues
  ADD COLUMN IF NOT EXISTS skip_reason TEXT;

COMMENT ON COLUMN public.prospecting_queues.skip_reason IS 'Reason for skipping contact (wrong_number, already_tried, bad_timing, no_interest, other)';

COMMIT;
