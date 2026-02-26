-- Migration: 20260226100001_epic3_contact_phones.sql
-- Epic: EPIC-CRM-IMOB / Story 3.1
-- Descricao: Suporte a multiplos telefones por contato

CREATE TABLE IF NOT EXISTS public.contact_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_type TEXT NOT NULL DEFAULT 'CELULAR'
    CHECK (phone_type IN ('CELULAR', 'COMERCIAL', 'RESIDENCIAL')),
  is_whatsapp BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE TRIGGER update_contact_phones_updated_at
  BEFORE UPDATE ON public.contact_phones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_contact_phones_contact_id ON public.contact_phones(contact_id);
CREATE INDEX idx_contact_phones_org_id ON public.contact_phones(organization_id);
CREATE INDEX idx_contact_phones_number_org ON public.contact_phones(organization_id, phone_number);

-- RLS
ALTER TABLE public.contact_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_phones_select" ON public.contact_phones
  FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "contact_phones_insert" ON public.contact_phones
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "contact_phones_update" ON public.contact_phones
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "contact_phones_delete" ON public.contact_phones
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Garantir apenas 1 telefone primario por contato
CREATE UNIQUE INDEX idx_contact_phones_primary_unique
  ON public.contact_phones (contact_id)
  WHERE is_primary = true;
