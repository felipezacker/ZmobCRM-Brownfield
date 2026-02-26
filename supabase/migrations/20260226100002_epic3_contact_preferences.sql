-- Migration: 20260226100002_epic3_contact_preferences.sql
-- Epic: EPIC-CRM-IMOB / Story 3.2
-- Descricao: Perfil de interesse de imovel do contato

CREATE TABLE IF NOT EXISTS public.contact_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  property_types TEXT[] DEFAULT '{}',
  purpose TEXT
    CHECK (purpose IN ('MORADIA', 'INVESTIMENTO', 'VERANEIO')),
  price_min NUMERIC,
  price_max NUMERIC,
  regions TEXT[] DEFAULT '{}',
  bedrooms_min INTEGER,
  parking_min INTEGER,
  area_min NUMERIC,
  accepts_financing BOOLEAN,
  accepts_fgts BOOLEAN,
  urgency TEXT
    CHECK (urgency IN ('IMMEDIATE', '3_MONTHS', '6_MONTHS', '1_YEAR')),
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE TRIGGER update_contact_preferences_updated_at
  BEFORE UPDATE ON public.contact_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN public.contact_preferences.property_types IS
  'Valores esperados: APARTAMENTO, CASA, TERRENO, COMERCIAL, RURAL, GALPAO. Validacao no app layer.';

-- Indexes
CREATE INDEX idx_contact_prefs_contact_id ON public.contact_preferences(contact_id);
CREATE INDEX idx_contact_prefs_org_id ON public.contact_preferences(organization_id);

-- Index para matching futuro (quando modulo de imoveis existir)
CREATE INDEX idx_contact_prefs_price_range
  ON public.contact_preferences(organization_id, price_min, price_max)
  WHERE price_min IS NOT NULL OR price_max IS NOT NULL;

-- Constraint: price_min <= price_max
ALTER TABLE public.contact_preferences
  ADD CONSTRAINT chk_price_range CHECK (price_min IS NULL OR price_max IS NULL OR price_min <= price_max);

-- RLS (mesma politica de contacts — org-level)
ALTER TABLE public.contact_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_prefs_select" ON public.contact_preferences
  FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "contact_prefs_insert" ON public.contact_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "contact_prefs_update" ON public.contact_preferences
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "contact_prefs_delete" ON public.contact_preferences
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
