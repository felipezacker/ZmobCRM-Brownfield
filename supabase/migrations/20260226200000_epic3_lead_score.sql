-- Migration: Story 3.8 — Lead Scoring com IA
-- Adiciona coluna lead_score (0-100) na tabela contacts com index para ordenacao

-- Coluna lead_score com constraint de range
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0
  CHECK (lead_score >= 0 AND lead_score <= 100);

-- Index para ordenacao por score dentro da org (filtra soft-deleted)
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score_org
  ON public.contacts(organization_id, lead_score DESC)
  WHERE deleted_at IS NULL;

-- Backfill: garantir que todos contatos existentes tenham score 0
UPDATE public.contacts
SET lead_score = 0
WHERE lead_score IS NULL;
