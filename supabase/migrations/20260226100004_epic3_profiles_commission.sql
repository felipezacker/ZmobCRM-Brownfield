-- Migration: 20260226100004_epic3_profiles_commission.sql
-- Epic: EPIC-CRM-IMOB / Story 3.3
-- Descricao: Taxa de comissao padrao por corretor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 1.5
    CHECK (commission_rate >= 0 AND commission_rate <= 100);

COMMENT ON COLUMN public.profiles.commission_rate IS
  'Percentual padrao de comissao do corretor. Default 1.5%. Admin/diretor pode alterar. Deals podem ter override individual.';
