-- Migration: 20260226100000_epic3_contacts_imob_fields.sql
-- Epic: EPIC-CRM-IMOB / Story 3.1
-- Descricao: Adicionar campos imobiliarios ao modelo de contatos

-- Novos campos core (colunas dedicadas)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'PF'
    CHECK (contact_type IN ('PF', 'PJ')),
  ADD COLUMN IF NOT EXISTS classification TEXT
    CHECK (classification IN ('COMPRADOR', 'VENDEDOR', 'LOCATARIO', 'LOCADOR', 'INVESTIDOR', 'PERMUTANTE')),
  ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'WARM'
    CHECK (temperature IN ('HOT', 'WARM', 'COLD')),
  ADD COLUMN IF NOT EXISTS address_cep TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT
    CHECK (address_state IS NULL OR length(address_state) = 2),
  ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}';

-- Unique CPF por organizacao (permite NULL, impede duplicata dentro da mesma org)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_cpf_org_unique
  ON public.contacts (organization_id, cpf)
  WHERE cpf IS NOT NULL AND deleted_at IS NULL;

-- Comment para documentar profile_data schema
-- NOTA: address_cep/city/state sao colunas dedicadas (indexaveis para dedup e filtro por regiao).
-- profile_data contem APENAS dados complementares que NAO precisam de index.
COMMENT ON COLUMN public.contacts.profile_data IS
  'JSONB flexivel — dados complementares SEM necessidade de index/filtro. Campos: address_full {street, number, complement, neighborhood}, profession, income_range (TEXT), marital_status (TEXT). Endereco indexavel esta em address_cep/city/state (colunas dedicadas).';

-- Indexes para busca server-side na lista enriquecida
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm
  ON public.contacts USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_email_org
  ON public.contacts(organization_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_updated_at
  ON public.contacts(updated_at DESC);

-- Indexes de filtro para lista enriquecida
CREATE INDEX IF NOT EXISTS idx_contacts_classification ON public.contacts(organization_id, classification);
CREATE INDEX IF NOT EXISTS idx_contacts_temperature ON public.contacts(organization_id, temperature);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON public.contacts(organization_id, contact_type);

-- Triggers updated_at (contacts e deals nao tinham)
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
