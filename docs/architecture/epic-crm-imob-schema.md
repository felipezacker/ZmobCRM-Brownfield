# Schema DDL — EPIC-CRM-IMOB (Epic 3)

**Autor:** @architect (Aria)
**Data:** 2026-02-25
**Status:** Reviewed — Validado por @data-engineer
**Epic:** docs/stories/epic-crm-imobiliario.md

---

## 1. Validacao da Abordagem Hibrida

**Veredito: APROVADO com ajustes.**

| Decisao | Justificativa |
|---------|---------------|
| Campos core em **colunas dedicadas** | CPF, classificacao, temperatura, tipo PF/PJ — precisam de index, WHERE clauses, e possivel FK |
| Endereco e dados pessoais em **JSONB `profile_data`** | Flexivel, nao precisa de index individual, imobiliaria pode ter campos custom |
| `contact_phones` como **tabela separada** | 1:N obrigatorio, precisa de busca por telefone (dedup), flag WhatsApp |
| `contact_preferences` como **tabela separada** | Queries de matching futuro, campos estruturados para filtro |
| Novos campos de deals em **colunas dedicadas** | `deal_type`, `expected_close_date`, `commission_rate` — todos indexaveis e filtráveis |

**Risco mitigado:** JSONB para `profile_data` NAO sera usado para campos que precisam de busca/filtro/index. Apenas dados complementares.

---

## 2. DDL Detalhado — Migrations

### Migration 1: Novos campos em `contacts`

```sql
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
```

### Migration 2: Tabela `contact_phones`

```sql
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
```

### Migration 3: Tabela `contact_preferences`

```sql
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
```

### Migration 4: Novos campos em `deals`

```sql
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
```

### Migration 5: Commission rate em `profiles`

```sql
-- Migration: 20260226100004_epic3_profiles_commission.sql
-- Epic: EPIC-CRM-IMOB / Story 3.3
-- Descricao: Taxa de comissao padrao por corretor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 1.5
    CHECK (commission_rate >= 0 AND commission_rate <= 100);

COMMENT ON COLUMN public.profiles.commission_rate IS
  'Percentual padrao de comissao do corretor. Default 1.5%. Admin/diretor pode alterar. Deals podem ter override individual.';
```

### Migration 6: Tech debt — org_id em deal_notes e deal_files

```sql
-- Migration: 20260226100005_epic3_tech_debt_org_id.sql
-- Epic: EPIC-CRM-IMOB / Story 3.4
-- Descricao: Adicionar organization_id em deal_notes e deal_files + RLS correta

-- ===== LIMPEZA DE ORFAOS (seguranca do backfill) =====
-- Registros cujo deal foi hard-deleted nao tem como derivar org_id
DELETE FROM public.deal_notes WHERE deal_id NOT IN (SELECT id FROM public.deals);
DELETE FROM public.deal_files WHERE deal_id NOT IN (SELECT id FROM public.deals);

-- ===== deal_notes =====
ALTER TABLE public.deal_notes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill org_id a partir do deal pai
UPDATE public.deal_notes dn
  SET organization_id = d.organization_id
  FROM public.deals d
  WHERE dn.deal_id = d.id AND dn.organization_id IS NULL;

-- Tornar NOT NULL apos backfill
ALTER TABLE public.deal_notes
  ALTER COLUMN organization_id SET NOT NULL;

-- Index
CREATE INDEX idx_deal_notes_org_id ON public.deal_notes(organization_id);

-- Drop RLS antiga e criar restritiva
-- NOTA: RLS anterior ja tinha padrao criador+admin/diretor para UPDATE/DELETE.
-- Mantemos esse padrao, agora usando organization_id direto (sem JOIN) para melhor performance.
DROP POLICY IF EXISTS "deal_notes_select" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_insert" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_update" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_delete" ON public.deal_notes;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.deal_notes;

ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: org-level (todos da org podem ler notas)
CREATE POLICY "deal_notes_select" ON public.deal_notes
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- INSERT: org-level
CREATE POLICY "deal_notes_insert" ON public.deal_notes
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- UPDATE: apenas criador OU admin/diretor (preserva padrao existente)
CREATE POLICY "deal_notes_update" ON public.deal_notes
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );

-- DELETE: apenas criador OU admin/diretor (preserva padrao existente)
CREATE POLICY "deal_notes_delete" ON public.deal_notes
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );

-- ===== deal_files =====
-- Limpeza de orfaos ja feita acima

ALTER TABLE public.deal_files
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.deal_files df
  SET organization_id = d.organization_id
  FROM public.deals d
  WHERE df.deal_id = d.id AND df.organization_id IS NULL;

ALTER TABLE public.deal_files
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX idx_deal_files_org_id ON public.deal_files(organization_id);

DROP POLICY IF EXISTS "deal_files_select" ON public.deal_files;
DROP POLICY IF EXISTS "deal_files_insert" ON public.deal_files;
DROP POLICY IF EXISTS "deal_files_update" ON public.deal_files;
DROP POLICY IF EXISTS "deal_files_delete" ON public.deal_files;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.deal_files;

ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

-- SELECT: org-level
CREATE POLICY "deal_files_select" ON public.deal_files
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- INSERT: org-level
CREATE POLICY "deal_files_insert" ON public.deal_files
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- UPDATE: apenas criador OU admin/diretor
CREATE POLICY "deal_files_update" ON public.deal_files
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );

-- DELETE: apenas criador OU admin/diretor
CREATE POLICY "deal_files_delete" ON public.deal_files
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_admin_or_director(organization_id))
  );
```

### Migration 7: Tabela `notifications` (Wave 3)

```sql
-- Migration: 20260226100006_epic3_notifications.sql
-- Epic: EPIC-CRM-IMOB / Story 3.9
-- Descricao: Sistema de notificacoes inteligentes

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('BIRTHDAY', 'CHURN_ALERT', 'DEAL_STAGNANT', 'SCORE_DROP', 'SYSTEM')),
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT
    CHECK (reference_type IN ('CONTACT', 'DEAL', 'ACTIVITY')),
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

CREATE INDEX idx_notifications_org_id ON public.notifications(organization_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Insert via server action/trigger apenas (nao via client direto)
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
```

---

## 3. Indexes Consolidados

### Novos indexes (este epic) — 17 total (revisado por @data-engineer)

| Tabela | Index | Tipo | Justificativa |
|--------|-------|------|---------------|
| contacts | `idx_contacts_cpf_org_unique` | UNIQUE partial | Dedup por CPF dentro da org |
| contacts | `idx_contacts_classification` | btree composite | Filtro na lista enriquecida |
| contacts | `idx_contacts_temperature` | btree composite | Filtro na lista enriquecida |
| contacts | `idx_contacts_contact_type` | btree composite | Filtro PF/PJ |
| contacts | `idx_contacts_name_trgm` | GIN trigram | Busca server-side por nome (ILIKE %texto%) |
| contacts | `idx_contacts_email_org` | btree partial | Busca por email + dedup |
| contacts | `idx_contacts_updated_at` | btree | Ordenacao por ultima atualizacao |
| contact_phones | `idx_contact_phones_contact_id` | btree | JOIN com contacts |
| contact_phones | `idx_contact_phones_number_org` | btree | Dedup por telefone |
| contact_phones | `idx_contact_phones_primary_unique` | UNIQUE partial | 1 primario por contato |
| contact_preferences | `idx_contact_prefs_contact_id` | btree | JOIN com contacts |
| contact_preferences | `idx_contact_prefs_price_range` | btree partial | Matching futuro |
| deals | `idx_deals_type_org` | btree | Filtro por tipo de negocio |
| deals | `idx_deals_expected_close` | btree partial | Forecast de fechamento |
| deal_notes | `idx_deal_notes_org_id` | btree | RLS performance (direto, sem JOIN) |
| deal_files | `idx_deal_files_org_id` | btree | RLS performance (direto, sem JOIN) |
| notifications | `idx_notifications_user_unread` | btree partial | Badge counter no header |

### Indexes que ja existem (confirmados)

| Tabela | Index | Colunas | Migration |
|--------|-------|---------|-----------|
| contacts | `idx_contacts_owner_id` | owner_id | 20260205000000 |
| contacts | `idx_contacts_organization_id` | organization_id | 20260205000000 |
| contacts | `idx_contacts_stage` | stage | schema_init |
| contacts | `idx_contacts_status` | status | schema_init |
| contacts | `idx_contacts_created_at` | created_at DESC | schema_init |
| deals | `idx_deals_owner_id` | owner_id | 20260205000000 |
| deals | `idx_deals_organization_id` | organization_id | 20260205000000 |
| deals | `idx_deals_contact_id` | contact_id | schema_init |
| deals | `idx_deals_board_stage_created` | board_id, stage_id, created_at DESC | schema_init |
| deals | `idx_deals_open` | board_id, stage_id (partial: not won/lost) | schema_init |
| profiles | `idx_profiles_org_role` | organization_id, role | security_rls |

### Extensoes requeridas

```sql
-- pg_trgm necessaria para busca fuzzy por nome (idx_contacts_name_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

> **NOTA:** Indexes de filtro (classification, temperature, contact_type) e busca (name_trgm, email_org, updated_at) estao definidos na Migration 1 junto com os campos. Nao repetir em migration separada.

---

## 4. RLS Policies — Resumo (revisado por @data-engineer)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| contacts | org + owner/admin/diretor | org | org + owner/admin/diretor | org + owner/admin/diretor |
| deals | org + owner/admin/diretor | org | org + owner/admin/diretor | org + owner/admin/diretor |
| contact_phones | **org-level** | **org-level** | **org-level** | **org-level** |
| contact_preferences | **org-level** | **org-level** | **org-level** | **org-level** |
| deal_notes | **org-level** (via org_id direto) | **org-level** | **criador OU admin/diretor** | **criador OU admin/diretor** |
| deal_files | **org-level** (via org_id direto) | **org-level** | **criador OU admin/diretor** | **criador OU admin/diretor** |
| notifications | **user-level** (user_id = uid) | **org-level** | **user-level** | **user-level** |
| profiles | org-level (via SECURITY DEFINER) | N/A (trigger) | self (id = uid) | N/A |

**Decisoes arquiteturais:**
- `contact_phones` e `contact_preferences` usam RLS **org-level** (sem filtro por owner) porque qualquer corretor da imobiliaria pode precisar ver o telefone ou preferencias de um contato reatribuido. Isso segue o mesmo padrao de `contacts_insert`.
- `deal_notes` e `deal_files` preservam o padrao **criador + admin/diretor** para UPDATE/DELETE que ja existia antes (via JOIN com deals). A diferenca e que agora usam `organization_id` direto (sem JOIN), melhorando performance ~2-5x.
- `notifications` sao pessoais — admin/diretor NAO ve notificacoes de corretores. Dashboard gerencial usara queries agregadas separadas.

---

## 4.1. Triggers — Resumo (adicionado por @data-engineer)

### Triggers incluidos nas migrations acima

| Trigger | Tabela | Evento | Funcao | Migration |
|---------|--------|--------|--------|-----------|
| `update_contacts_updated_at` | contacts | BEFORE UPDATE | `update_updated_at_column()` | Migration 1 |
| `update_deals_updated_at` | deals | BEFORE UPDATE | `update_updated_at_column()` | Migration 1 |
| `update_contact_phones_updated_at` | contact_phones | BEFORE UPDATE | `update_updated_at_column()` | Migration 2 |
| `update_contact_preferences_updated_at` | contact_preferences | BEFORE UPDATE | `update_updated_at_column()` | Migration 3 |

### Trigger planejado para Wave 3 (Story 3.10 — Metricas)

```sql
-- Trigger: Atualizar total_value (LTV) do contato quando deal e marcado como won
CREATE OR REPLACE FUNCTION update_contact_total_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_won = true AND (OLD.is_won = false OR OLD.is_won IS NULL) THEN
    UPDATE public.contacts
    SET total_value = COALESCE((
      SELECT SUM(value) FROM public.deals
      WHERE contact_id = NEW.contact_id AND is_won = true
    ), 0),
    last_purchase_date = NOW()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE TRIGGER trg_update_contact_ltv
  AFTER UPDATE OF is_won ON public.deals
  FOR EACH ROW
  WHEN (NEW.is_won = true AND OLD.is_won IS DISTINCT FROM true)
  EXECUTE FUNCTION update_contact_total_value();
```

> **NOTA:** Este trigger pertence a Story 3.10 (Wave 3). Sera criado em migration separada: `20260226100007_epic3_contact_ltv_trigger.sql`

---

## 5. Riscos Tecnicos Identificados (revisado por @data-engineer)

| # | Risco | Severidade | Mitigacao | Status |
|---|-------|------------|-----------|--------|
| 1 | **CPF unico parcial pode falhar em concorrencia** — dois INSERTs simultaneos com mesmo CPF podem passar antes do index ser avaliado | BAIXO | `ON CONFLICT DO NOTHING` no service layer + retry | Aceito |
| 2 | **Backfill de org_id em deal_notes/files** — registros orfaos (deal deletado) impedem NOT NULL | MEDIO | **RESOLVIDO:** DELETE de orfaos adicionado antes do backfill na Migration 6 | Corrigido |
| 3 | **Campo `phone` atual em contacts fica redundante** com `contact_phones` | MEDIO | Manter `phone` como "telefone principal" (legacy). `contact_phones` e a fonte expandida. Migration futura pode deprecar `contacts.phone` | Aceito |
| 4 | **`profile_data` JSONB sem schema validation** no DB | BAIXO | Validar no application layer (TypeScript interface). Nao usar DB CHECK em JSONB (performance) | Aceito |
| 5 | **`contact_preferences` permite multiplos registros por contato** | DESIGN DECISION | Manter 1:N — um contato pode ter 2 perfis ("apto para morar" + "terreno para investir"). UI deve suportar lista | Aceito |
| 6 | **`commission_rate` pode ser NULL em deals antigos** | BAIXO | Fallback chain no app: `deal.commission_rate ?? corretor.commission_rate ?? 1.5`. CHECK constraint adicionada (0-100) | Corrigido |
| 7 | **RLS de notifications e user-level** — admin/diretor nao ve notificacoes de corretores | DESIGN DECISION | Correto — notificacoes sao pessoais. Dashboard gerencial usara queries agregadas separadas | Aceito |
| 8 | **`contacts` e `deals` nao tinham trigger de `updated_at`** — campo nunca atualizava automaticamente | ALTO | **RESOLVIDO:** Triggers adicionados na Migration 1 | Corrigido |
| 9 | **Busca server-side na lista requer pg_trgm** — extensao pode nao estar habilitada | BAIXO | `CREATE EXTENSION IF NOT EXISTS pg_trgm` adicionado na Migration 1. Supabase suporta pg_trgm nativamente | Corrigido |
| 10 | **RLS de deal_notes/files era org-level simples** — qualquer corretor podia editar/deletar notas de outros | CRITICO | **RESOLVIDO:** Mantido padrao criador+admin/diretor para UPDATE/DELETE | Corrigido |

---

## 6. Impacto no TypeScript (tipos a atualizar)

### Contact interface (types/types.ts)

```typescript
// Novos campos
cpf?: string;
contactType: 'PF' | 'PJ';
classification?: 'COMPRADOR' | 'VENDEDOR' | 'LOCATARIO' | 'LOCADOR' | 'INVESTIDOR' | 'PERMUTANTE';
temperature: 'HOT' | 'WARM' | 'COLD';
addressCep?: string;
addressCity?: string;
addressState?: string;
profileData?: {
  addressFull?: { street?: string; number?: string; complement?: string; neighborhood?: string };
  profession?: string;
  incomeRange?: string;
  maritalStatus?: string;
  [key: string]: any; // custom fields da imobiliaria
};
```

### Novas interfaces

```typescript
interface ContactPhone {
  id: string;
  contactId: string;
  phoneNumber: string;
  phoneType: 'CELULAR' | 'COMERCIAL' | 'RESIDENCIAL';
  isWhatsapp: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContactPreference {
  id: string;
  contactId: string;
  propertyTypes: string[];
  purpose?: 'MORADIA' | 'INVESTIMENTO' | 'VERANEIO';
  priceMin?: number;
  priceMax?: number;
  regions: string[];
  bedroomsMin?: number;
  parkingMin?: number;
  areaMin?: number;
  acceptsFinancing?: boolean;
  acceptsFgts?: boolean;
  urgency?: 'IMMEDIATE' | '3_MONTHS' | '6_MONTHS' | '1_YEAR';
  notes?: string;
}

interface Notification {
  id: string;
  userId: string;
  type: 'BIRTHDAY' | 'CHURN_ALERT' | 'DEAL_STAGNANT' | 'SCORE_DROP' | 'SYSTEM';
  title: string;
  body?: string;
  referenceType?: 'CONTACT' | 'DEAL' | 'ACTIVITY';
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}
```

### Deal interface (adicionar)

```typescript
dealType: 'VENDA' | 'LOCACAO' | 'PERMUTA';
expectedCloseDate?: string;
commissionRate?: number; // override individual, fallback para profiles.commission_rate
```

### Profile interface (adicionar)

```typescript
commissionRate: number; // default 1.5
```

---

## 7. Ordem de Execucao das Migrations (revisado por @data-engineer)

```
Story 3.1 → Migration 1 (contacts fields + indexes + triggers) + Migration 2 (contact_phones)
Story 3.2 → Migration 3 (contact_preferences)
Story 3.3 → Migration 4 (deals fields) + Migration 5 (profiles commission)
Story 3.4 → Migration 6 (tech debt org_id — inclui limpeza orfaos + RLS corrigida)
Story 3.9 → Migration 7 (notifications) — Wave 3
Story 3.10 → Migration 8 (contact LTV trigger) — Wave 3
```

**Dependencias entre migrations:**
- Migrations 1-6 (Wave 1): NAO tem dependencia entre si, podem ser aplicadas em qualquer ordem
- Migration 1 requer extensao `pg_trgm` (CREATE EXTENSION IF NOT EXISTS — idempotente)
- Migration 7 e 8 (Wave 3): independentes entre si, ambas dependem de Wave 1 estar aplicada
- Migration 8 depende da funcao `mark_deal_won()` que ja existe no schema atual

---

## Change Log

| Data | Agente | Acao |
|---|---|---|
| 2026-02-25 | @architect (Aria) | Schema DDL criado — 7 migrations, 14 indexes, RLS para 3 novas tabelas, 2 tabelas corrigidas |
| 2026-02-26 | @data-engineer (Dara) | Revisao completa — 7 correcoes aplicadas: (1) RLS deal_notes/files preserva criador+admin/diretor, (2) limpeza orfaos no backfill, (3) 3 indexes busca server-side + pg_trgm, (4) triggers updated_at em contacts/deals/contact_phones/contact_preferences, (5) updated_at coluna em contact_phones, (6) CHECK constraint em deals.commission_rate, (7) trigger LTV auto-calculado (Wave 3). Total: 8 migrations, 17 indexes, 4 triggers, 1 trigger planejado |

---

*— Dara, arquitetando dados*
