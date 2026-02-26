-- Migration: 20260226100003_epic3_deals_imob_fields.sql
-- Epic: EPIC-CRM-IMOB / Story 3.3
-- Descricao: Campos imobiliarios no modelo de deals

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'VENDA'
    CHECK (deal_type IN ('VENDA', 'LOCACAO', 'PERMUTA')),
  ADD COLUMN IF NOT EXISTS expected_close_date DATE,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC
    CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100));

-- Index para filtro por tipo de negocio
CREATE INDEX idx_deals_type_org ON public.deals(organization_id, deal_type);

-- Index para forecast (data prevista de fechamento)
CREATE INDEX idx_deals_expected_close ON public.deals(organization_id, expected_close_date)
  WHERE expected_close_date IS NOT NULL AND is_won = false AND is_lost = false;

COMMENT ON COLUMN public.deals.commission_rate IS
  'Percentual de comissao para este deal. Se NULL, usa o commission_rate do corretor (profiles). Calculado: deal.value * (rate / 100).';
