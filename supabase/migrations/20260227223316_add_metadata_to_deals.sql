-- Add metadata JSONB column to deals for deal-specific internal data.
-- This is NOT user-facing (unlike custom_fields which moved to contacts).
-- Used for: cockpit checklist, inbound source tracking, automation origin, etc.
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
