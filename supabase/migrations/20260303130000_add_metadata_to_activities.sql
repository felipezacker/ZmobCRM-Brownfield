-- Migration: Add metadata JSONB to activities
-- Story: CP-1.1 (Central de Prospecção)
-- Description: Adiciona coluna metadata JSONB para salvar outcome estruturado
--   de ligações: { outcome: 'connected'|'no_answer'|'voicemail'|'busy', duration_seconds: number }

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.activities.metadata IS 'Structured metadata for activity outcomes (e.g. call outcome, duration)';
