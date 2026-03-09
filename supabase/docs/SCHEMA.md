# SCHEMA.md - Documentacao Completa do Banco de Dados

> **Projeto:** ZmobCRM (CRM Imobiliario)
> **Gerado em:** 2026-03-06
> **Fase:** Brownfield Discovery - Phase 2 (@data-engineer Dara)
> **Banco:** PostgreSQL 17 (Supabase)
> **Tabelas:** 39 tabelas public + 3 storage buckets
> **Migrations:** 50 arquivos em `supabase/migrations/`

---

## Sumario

1. [Extensoes](#1-extensoes)
2. [Tabelas - Dominio Principal](#2-tabelas---dominio-principal)
3. [Tabelas - IA e Automacao](#3-tabelas---ia-e-automacao)
4. [Tabelas - Seguranca e Compliance](#4-tabelas---seguranca-e-compliance)
5. [Tabelas - Integracoes e Webhooks](#5-tabelas---integracoes-e-webhooks)
6. [Tabelas - Prospeccao](#6-tabelas---prospeccao)
7. [Views e Funcoes](#7-views-e-funcoes)
8. [Triggers](#8-triggers)
9. [Indexes](#9-indexes)
10. [Politicas RLS](#10-politicas-rls)
11. [Diagrama de Relacionamentos](#11-diagrama-de-relacionamentos)
12. [Storage Buckets](#12-storage-buckets)
13. [Publicacoes Realtime](#13-publicacoes-realtime)

---

## 1. Extensoes

| Extensao | Schema | Finalidade |
|----------|--------|------------|
| `uuid-ossp` | extensions | Geracao de UUIDs (v4) |
| `pgcrypto` | extensions | Funcoes criptograficas (gen_random_uuid, digest) |
| `unaccent` | public | Remocao de acentos para slugs |
| `pg_net` | public | HTTP async para webhooks |
| `pg_trgm` | public | Busca trigram (similaridade textual) |

---

## 2. Tabelas - Dominio Principal

### 2.1 `organizations`

Tabela raiz do tenant. Modelo single-tenant (uma org por instancia).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name` | TEXT | NOT NULL | - | - |
| `deleted_at` | TIMESTAMPTZ | NULL | NULL | Soft delete |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Habilitada. SELECT restrito a membros da org via `get_user_organization_id()`.
**Trigger:** `on_org_created` -> cria `organization_settings` automaticamente.

---

### 2.2 `organization_settings`

Configuracoes globais de IA por organizacao. PK = `organization_id` (1:1 com organizations).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `organization_id` | UUID | NOT NULL | - | PK, FK -> organizations(id) CASCADE |
| `ai_provider` | TEXT | NULL | `'google'` | - |
| `ai_model` | TEXT | NULL | `'gemini-2.5-flash'` | - |
| `ai_google_key` | TEXT | NULL | - | Chave API sensivel |
| `ai_openai_key` | TEXT | NULL | - | Chave API sensivel |
| `ai_anthropic_key` | TEXT | NULL | - | Chave API sensivel |
| `ai_enabled` | BOOLEAN | NOT NULL | `true` | Toggle global IA |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Admin-only para escrita; membros da org podem ler.
**Realtime:** Adicionada a `supabase_realtime` (migration 20260306500000).

---

### 2.3 `profiles`

Estende `auth.users` com dados do CRM. 1:1 com auth.users.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | - | PK, FK -> auth.users(id) CASCADE |
| `email` | TEXT | NULL | - | - |
| `name` | TEXT | NULL | - | - |
| `avatar` | TEXT | NULL | - | Legado |
| `role` | TEXT | NULL | `'corretor'` | CHECK (`admin`, `diretor`, `corretor`) |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |
| `first_name` | TEXT | NULL | - | Consolidado (migration db014) |
| `last_name` | TEXT | NULL | - | Consolidado (migration db014) |
| `nickname` | TEXT | NULL | - | - |
| `phone` | TEXT | NULL | - | - |
| `avatar_url` | TEXT | NULL | - | Canonic |
| `commission_rate` | NUMERIC | NULL | `1.5` | CHECK (0-100), taxa padrao corretor |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** SELECT restrito a mesma org via `get_user_organization_id()`. UPDATE somente proprio perfil.
**Trigger:** `on_auth_user_created` -> cria profile + user_settings automaticamente.

---

### 2.4 `lifecycle_stages`

Estagios globais do funil de vendas. PK tipo TEXT (enum-like).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | TEXT | NOT NULL | - | PK |
| `name` | TEXT | NOT NULL | - | - |
| `color` | TEXT | NOT NULL | - | Classe CSS |
| `order` | INTEGER | NOT NULL | - | Ordenacao |
| `is_default` | BOOLEAN | NULL | `false` | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**Dados seed:** LEAD, MQL, PROSPECT, CUSTOMER, OTHER.
**RLS:** Org-scoped SELECT.

---

### 2.5 `boards`

Pipelines Kanban. Cada board representa um funil de vendas.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `key` | TEXT | NULL | - | Slug unico por org (partial unique index) |
| `name` | TEXT | NOT NULL | - | - |
| `description` | TEXT | NULL | - | - |
| `type` | TEXT | NULL | `'SALES'` | - |
| `is_default` | BOOLEAN | NULL | `false` | - |
| `template` | TEXT | NULL | - | - |
| `linked_lifecycle_stage` | TEXT | NULL | - | - |
| `next_board_id` | UUID | NULL | - | FK -> boards(id) self-ref |
| `goal_description` | TEXT | NULL | - | Descricao da meta |
| `goal_kpi` | TEXT | NULL | - | KPI alvo |
| `goal_target_value` | TEXT | NULL | - | Valor alvo |
| `goal_type` | TEXT | NULL | - | Tipo de meta |
| `agent_name` | TEXT | NULL | - | Persona IA |
| `agent_role` | TEXT | NULL | - | - |
| `agent_behavior` | TEXT | NULL | - | - |
| `entry_trigger` | TEXT | NULL | - | - |
| `automation_suggestions` | TEXT[] | NULL | - | - |
| `position` | INTEGER | NULL | `0` | Ordem de exibicao |
| `won_stage_id` | UUID | NULL | - | FK -> board_stages(id) |
| `lost_stage_id` | UUID | NULL | - | FK -> board_stages(id) |
| `won_stay_in_stage` | BOOLEAN | NULL | `false` | Manter na coluna ao ganhar |
| `lost_stay_in_stage` | BOOLEAN | NULL | `false` | Manter na coluna ao perder |
| `default_product_id` | UUID | NULL | - | FK -> products(id) |
| `deleted_at` | TIMESTAMPTZ | NULL | - | Soft delete |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `owner_id` | UUID | NULL | - | FK -> profiles(id) |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**Indexes:** `idx_boards_org_key_unique` (partial unique WHERE deleted_at IS NULL AND key IS NOT NULL).
**RLS:** Org-scoped. Update/Delete requer owner ou admin/diretor.
**Trigger:** `cascade_board_delete` -> soft-delete deals associados.

---

### 2.6 `board_stages`

Colunas dos boards Kanban.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `board_id` | UUID | NULL | - | FK -> boards(id) CASCADE |
| `name` | TEXT | NOT NULL | - | - |
| `label` | TEXT | NULL | - | - |
| `color` | TEXT | NULL | - | - |
| `order` | INTEGER | NOT NULL | - | Ordenacao |
| `is_default` | BOOLEAN | NULL | `false` | - |
| `linked_lifecycle_stage` | TEXT | NULL | - | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**RLS:** Org-scoped. Insert/Update/Delete requer admin/diretor.

---

### 2.7 `contacts`

Contatos do CRM com campos imobiliarios (Epic 3).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name` | TEXT | NOT NULL | - | Auto-INITCAP via trigger |
| `email` | TEXT | NULL | - | - |
| `phone` | TEXT | NULL | - | Telefone primario legado |
| `avatar` | TEXT | NULL | - | - |
| `notes` | TEXT | NULL | - | - |
| `status` | TEXT | NULL | `'ACTIVE'` | - |
| `stage` | TEXT | NULL | `'LEAD'` | Estagio funil |
| `source` | TEXT | NULL | - | Origem (hotmart, linkedin, etc) |
| `birth_date` | DATE | NULL | - | - |
| `last_interaction` | TIMESTAMPTZ | NULL | - | - |
| `last_purchase_date` | DATE | NULL | - | - |
| `total_value` | NUMERIC | NULL | `0` | LTV (atualizado via RPC) |
| `cpf` | TEXT | NULL | - | Epic 3: CPF (PF) |
| `contact_type` | TEXT | NULL | `'PF'` | CHECK (`PF`, `PJ`) |
| `classification` | TEXT | NULL | - | CHECK (COMPRADOR, VENDEDOR, etc) |
| `temperature` | TEXT | NULL | `'WARM'` | CHECK (HOT, WARM, COLD) |
| `address_cep` | TEXT | NULL | - | CEP |
| `address_city` | TEXT | NULL | - | Cidade |
| `address_state` | TEXT | NULL | - | UF (2 chars) |
| `profile_data` | JSONB | NULL | `'{}'` | Dados complementares |
| `lead_score` | INTEGER | NULL | `0` | CHECK (0-100) |
| `tags` | TEXT[] | NULL | `'{}'` | Migrado de deals (migration 20260227) |
| `custom_fields` | JSONB | NULL | `'{}'` | Migrado de deals |
| `deleted_at` | TIMESTAMPTZ | NULL | - | Soft delete |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `owner_id` | UUID | NULL | - | FK -> profiles(id) |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**Indexes:** `idx_contacts_cpf_org_unique` (partial unique), `idx_contacts_name_trgm` (GIN trigram), `idx_contacts_lead_score_org`, `idx_contacts_email_org`.
**RLS:** SELECT org-wide. INSERT/UPDATE/DELETE restrito a owner + admin/diretor.
**Trigger:** `trg_capitalize_contact_name` -> INITCAP automatico. `cascade_contact_delete` -> soft-delete activities.

---

### 2.8 `contact_phones`

Multiplos telefones por contato (Epic 3, Story 3.1).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `contact_id` | UUID | NOT NULL | - | FK -> contacts(id) CASCADE |
| `phone_number` | TEXT | NOT NULL | - | - |
| `phone_type` | TEXT | NOT NULL | `'CELULAR'` | CHECK (CELULAR, COMERCIAL, RESIDENCIAL) |
| `is_whatsapp` | BOOLEAN | NOT NULL | `false` | - |
| `is_primary` | BOOLEAN | NOT NULL | `false` | - |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Org-scoped via profiles.organization_id.

---

### 2.9 `contact_preferences`

Perfil de interesse imobiliario do contato (Epic 3, Story 3.2).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `contact_id` | UUID | NOT NULL | - | FK -> contacts(id) CASCADE |
| `property_types` | TEXT[] | NULL | `'{}'` | Tipos de imovel |
| `purpose` | TEXT | NULL | - | CHECK (MORADIA, INVESTIMENTO, VERANEIO) |
| `price_min` | NUMERIC | NULL | - | - |
| `price_max` | NUMERIC | NULL | - | - |
| `regions` | TEXT[] | NULL | `'{}'` | Regioes de interesse |
| `bedrooms_min` | INTEGER | NULL | - | - |
| `parking_min` | INTEGER | NULL | - | - |
| `area_min` | NUMERIC | NULL | - | - |
| `accepts_financing` | BOOLEAN | NULL | - | - |
| `accepts_fgts` | BOOLEAN | NULL | - | - |
| `urgency` | TEXT | NULL | - | CHECK (IMMEDIATE, 3_MONTHS, 6_MONTHS, 1_YEAR) |
| `notes` | TEXT | NULL | - | - |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Org-scoped via profiles.organization_id.

---

### 2.10 `deals`

Negocios/oportunidades no pipeline.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `title` | TEXT | NOT NULL | - | - |
| `value` | NUMERIC | NULL | `0` | Valor monetario |
| `probability` | INTEGER | NULL | `0` | Probabilidade (0-100) |
| `status` | TEXT | NULL | - | Legado |
| `priority` | TEXT | NULL | `'medium'` | - |
| `board_id` | UUID | NULL | - | FK -> boards(id) |
| `stage_id` | UUID | NULL | - | FK -> board_stages(id) |
| `contact_id` | UUID | NULL | - | FK -> contacts(id) |
| `ai_summary` | TEXT | NULL | - | Resumo IA |
| `loss_reason` | TEXT | NULL | - | Motivo de perda |
| `last_stage_change_date` | TIMESTAMPTZ | NULL | - | - |
| `is_won` | BOOLEAN | NOT NULL | `false` | Flag de vitoria |
| `is_lost` | BOOLEAN | NOT NULL | `false` | Flag de perda |
| `closed_at` | TIMESTAMPTZ | NULL | - | Data de fechamento |
| `deal_type` | TEXT | NULL | `'VENDA'` | CHECK (VENDA, LOCACAO, PERMUTA) |
| `expected_close_date` | DATE | NULL | - | Previsao de fechamento |
| `commission_rate` | NUMERIC | NULL | - | CHECK (0-100), override por deal |
| `property_ref` | TEXT | NULL | - | Referencia do imovel |
| `metadata` | JSONB | NULL | `'{}'` | Dados internos (checklist, origem) |
| `deleted_at` | TIMESTAMPTZ | NULL | - | Soft delete |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `owner_id` | UUID | NULL | - | FK -> profiles(id) |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |

**Indexes:** `idx_deals_board_id`, `idx_deals_stage_id`, `idx_deals_contact_id`, `idx_deals_board_stage_created`, `idx_deals_open` (partial), `idx_deals_type_org`, `idx_deals_expected_close`.
**RLS:** Org-scoped. UPDATE protege owner_id (corretor nao pode alterar).
**Trigger:** `check_deal_duplicate_trigger` -> impede duplicata contact+stage ativo.

---

### 2.11 `deal_items`

Produtos vinculados a deals (N:N via tabela associativa com quantidade).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `deal_id` | UUID | NULL | - | FK -> deals(id) CASCADE |
| `product_id` | UUID | NULL | - | FK -> products(id) |
| `name` | TEXT | NOT NULL | - | Nome snapshot |
| `quantity` | INTEGER | NOT NULL | `1` | - |
| `price` | NUMERIC | NOT NULL | `0` | Preco snapshot |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**RLS:** Org-scoped.

---

### 2.12 `deal_notes`

Notas de texto associadas a deals.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `deal_id` | UUID | NOT NULL | - | FK -> deals(id) CASCADE |
| `content` | TEXT | NOT NULL | - | - |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `created_by` | UUID | NULL | - | FK -> profiles(id) SET NULL |

**RLS:** Org-scoped. Update/Delete restrito ao criador + admin/diretor.
**Trigger:** `update_deal_notes_updated_at`.

---

### 2.13 `deal_files`

Arquivos associados a deals (armazenados no bucket `deal-files`).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `deal_id` | UUID | NOT NULL | - | FK -> deals(id) CASCADE |
| `file_name` | TEXT | NOT NULL | - | - |
| `file_path` | TEXT | NOT NULL | - | - |
| `file_size` | INTEGER | NULL | - | Bytes |
| `mime_type` | TEXT | NULL | - | - |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `created_by` | UUID | NULL | - | FK -> profiles(id) SET NULL |

**RLS:** Org-scoped. Delete restrito ao criador + admin/diretor.

---

### 2.14 `activities`

Atividades (tarefas, ligacoes, reunioes, emails, WhatsApp).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `title` | TEXT | NOT NULL | - | - |
| `description` | TEXT | NULL | - | - |
| `type` | TEXT | NOT NULL | - | CALL, MEETING, EMAIL, TASK (+ WHATSAPP no app) |
| `date` | TIMESTAMPTZ | NOT NULL | - | - |
| `completed` | BOOLEAN | NULL | `false` | - |
| `deal_id` | UUID | NULL | - | FK -> deals(id) CASCADE |
| `contact_id` | UUID | NULL | - | FK -> contacts(id) SET NULL |
| `client_company_id` | UUID | NULL | - | Legado (coluna orfao pos-drop crm_companies) |
| `participant_contact_ids` | UUID[] | NULL | - | Array de participantes |
| `recurrence_type` | TEXT | NULL | - | CHECK (daily, weekly, monthly) |
| `recurrence_end_date` | DATE | NULL | - | Requer recurrence_type (constraint cruzada) |
| `metadata` | JSONB | NULL | `'{}'` | Outcome de ligacao (CP-1.1) |
| `deleted_at` | TIMESTAMPTZ | NULL | - | Soft delete |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `owner_id` | UUID | NULL | - | FK -> profiles(id) |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**Indexes:** `idx_activities_date`, `idx_activities_deal_id`, `idx_activities_contact_id`, `idx_activities_recurrence` (partial).
**RLS:** Org-scoped. INSERT/UPDATE/DELETE restrito a owner + admin/diretor.
**NOTA:** `client_company_id` referencia tabela `crm_companies` que foi dropada (migration 20260220100000). FK pode estar dangling.

---

### 2.15 `products`

Catalogo de produtos/servicos.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name` | TEXT | NOT NULL | - | - |
| `description` | TEXT | NULL | - | - |
| `price` | NUMERIC | NOT NULL | `0` | - |
| `sku` | TEXT | NULL | - | - |
| `active` | BOOLEAN | NULL | `true` | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `owner_id` | UUID | NULL | - | FK -> profiles(id) |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**RLS:** Org-scoped.

---

### 2.16 `tags`

Sistema de tags compartilhadas por organizacao.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name` | TEXT | NOT NULL | - | UNIQUE(name, organization_id) |
| `color` | TEXT | NULL | `'bg-gray-500'` | Classe CSS |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**RLS:** Org-scoped.

---

### 2.17 `custom_field_definitions`

Definicoes de campos personalizados.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `key` | TEXT | NOT NULL | - | UNIQUE(key, organization_id) |
| `label` | TEXT | NOT NULL | - | - |
| `type` | TEXT | NOT NULL | - | Tipo do campo |
| `options` | TEXT[] | NULL | - | Opcoes para select |
| `entity_type` | TEXT | NOT NULL | `'contact'` | Entidade alvo (era 'deal', migrado) |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**RLS:** Org-scoped.

---

### 2.18 `leads`

Tabela de importacao de leads (pre-conversao a contato).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name` | TEXT | NOT NULL | - | - |
| `email` | TEXT | NULL | - | - |
| `source` | TEXT | NULL | - | - |
| `status` | TEXT | NULL | `'NEW'` | - |
| `notes` | TEXT | NULL | - | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `converted_to_contact_id` | UUID | NULL | - | FK -> contacts(id) |
| `owner_id` | UUID | NULL | - | FK -> profiles(id) |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |

**RLS:** Owner-scoped. INSERT requer owner_id = auth.uid() ou admin/diretor.
**NOTA:** Colunas `company_name` e `role` foram removidas (migration 20260220100000).

---

### 2.19 `user_settings`

Configuracoes individuais por usuario.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NULL | - | FK -> profiles(id) CASCADE, UNIQUE |
| `ai_provider` | TEXT | NULL | `'google'` | - |
| `ai_api_key` | TEXT | NULL | - | Legado |
| `ai_model` | TEXT | NULL | `'gemini-2.5-flash'` | - |
| `ai_thinking` | BOOLEAN | NULL | `true` | - |
| `ai_search` | BOOLEAN | NULL | `true` | - |
| `ai_anthropic_caching` | BOOLEAN | NULL | `false` | - |
| `ai_google_key` | TEXT | NULL | - | Chave Google |
| `ai_openai_key` | TEXT | NULL | - | Chave OpenAI |
| `ai_anthropic_key` | TEXT | NULL | - | Chave Anthropic |
| `dark_mode` | BOOLEAN | NULL | `true` | - |
| `default_route` | TEXT | NULL | `'/boards'` | - |
| `active_board_id` | UUID | NULL | - | FK -> boards(id) |
| `inbox_view_mode` | TEXT | NULL | `'list'` | - |
| `onboarding_completed` | BOOLEAN | NULL | `false` | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Isolado por user_id = auth.uid().

---

### 2.20 `quick_scripts`

Templates de scripts de vendas (sistema + usuario).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `title` | TEXT | NOT NULL | - | - |
| `category` | TEXT | NOT NULL | - | CHECK (followup, objection, closing, intro, rescue, other) |
| `template` | TEXT | NOT NULL | - | Texto com variaveis {nome}, etc |
| `icon` | TEXT | NULL | `'MessageSquare'` | Nome do icone Lucide |
| `is_system` | BOOLEAN | NULL | `false` | Scripts do sistema (nao deletaveis) |
| `user_id` | UUID | NULL | - | FK -> profiles(id) CASCADE |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** SELECT: sistema + proprios. INSERT/UPDATE/DELETE: somente proprios + nao-sistema.
**Seed:** 12 scripts de sistema pré-carregados.

---

### 2.21 `organization_invites`

Convites para novos usuarios.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |
| `email` | TEXT | NULL | - | - |
| `role` | TEXT | NOT NULL | `'corretor'` | CHECK (admin, diretor, corretor) |
| `token` | UUID | NOT NULL | `gen_random_uuid()` | Token unico |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `expires_at` | TIMESTAMPTZ | NULL | - | - |
| `used_at` | TIMESTAMPTZ | NULL | - | - |
| `created_by` | UUID | NULL | - | FK -> profiles(id) |

**RLS:** Admin-only para gestao; membros podem visualizar.

---

### 2.22 `notifications`

Notificacoes inteligentes do CRM (Epic 3, Story 3.9).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) |
| `type` | TEXT | NOT NULL | - | CHECK (BIRTHDAY, CHURN_ALERT, DEAL_STAGNANT, SCORE_DROP) |
| `title` | TEXT | NOT NULL | - | - |
| `description` | TEXT | NULL | - | - |
| `contact_id` | UUID | NULL | - | FK -> contacts(id) CASCADE |
| `deal_id` | UUID | NULL | - | FK -> deals(id) CASCADE |
| `is_read` | BOOLEAN | NULL | `false` | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `owner_id` | UUID | NULL | - | FK -> profiles(id) |

**Indexes:** `idx_notifications_org_unread`, `idx_notifications_owner_unread` (parciais).
**RLS:** Org-scoped.

---

### 2.23 `lead_score_history`

Historico de mudancas no lead score.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `contact_id` | UUID | NOT NULL | - | FK -> contacts(id) CASCADE |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) |
| `old_score` | INTEGER | NOT NULL | - | - |
| `new_score` | INTEGER | NOT NULL | - | - |
| `change` | INTEGER | NOT NULL | - | Diferenca (new - old) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |

**Indexes:** `idx_lead_score_history_contact`, `idx_lead_score_history_org`.
**RLS:** SELECT org-scoped. INSERT org-scoped.

---

## 3. Tabelas - IA e Automacao

### 3.1 `ai_conversations`

Historico de conversas com IA.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NULL | - | FK -> profiles(id) CASCADE |
| `conversation_key` | TEXT | NOT NULL | - | UNIQUE(user_id, conversation_key) |
| `messages` | JSONB | NULL | `'[]'` | Array de mensagens |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** User-scoped (somente proprias conversas).

### 3.2 `ai_decisions`

Fila de decisoes/sugestoes da IA.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NULL | - | FK -> profiles(id) CASCADE |
| `deal_id` | UUID | NULL | - | FK -> deals(id) CASCADE |
| `contact_id` | UUID | NULL | - | FK -> contacts(id) SET NULL |
| `decision_type` | TEXT | NOT NULL | - | - |
| `priority` | TEXT | NULL | `'medium'` | - |
| `title` | TEXT | NOT NULL | - | - |
| `description` | TEXT | NULL | - | - |
| `suggested_action` | JSONB | NULL | - | - |
| `status` | TEXT | NULL | `'pending'` | - |
| `snoozed_until` | TIMESTAMPTZ | NULL | - | - |
| `processed_at` | TIMESTAMPTZ | NULL | - | - |
| `ai_reasoning` | TEXT | NULL | - | - |
| `confidence_score` | NUMERIC(3,2) | NULL | - | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** User-scoped.

### 3.3 `ai_audio_notes`

Notas de audio transcritas por IA.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NULL | - | FK -> profiles(id) CASCADE |
| `deal_id` | UUID | NULL | - | FK -> deals(id) CASCADE |
| `contact_id` | UUID | NULL | - | FK -> contacts(id) SET NULL |
| `audio_url` | TEXT | NULL | - | - |
| `duration_seconds` | INTEGER | NULL | - | - |
| `transcription` | TEXT | NOT NULL | - | - |
| `sentiment` | TEXT | NULL | - | - |
| `next_action` | JSONB | NULL | - | - |
| `activity_created_id` | UUID | NULL | - | FK -> activities(id) |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** User-scoped.

### 3.4 `ai_suggestion_interactions`

Rastreamento de interacoes com sugestoes da IA.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NOT NULL | - | FK -> auth.users(id) CASCADE |
| `suggestion_type` | TEXT | NOT NULL | - | CHECK (UPSELL, STALLED, BIRTHDAY, RESCUE) |
| `entity_type` | TEXT | NOT NULL | - | CHECK (deal, contact) |
| `entity_id` | UUID | NOT NULL | - | - |
| `action` | TEXT | NOT NULL | - | CHECK (ACCEPTED, DISMISSED, SNOOZED) |
| `snoozed_until` | TIMESTAMPTZ | NULL | - | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**Constraint:** UNIQUE(user_id, suggestion_type, entity_id).
**RLS:** User-scoped.

### 3.5 `ai_prompt_templates`

Override/versionamento de prompts de IA por organizacao.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `key` | TEXT | NOT NULL | - | Chave do template |
| `version` | INTEGER | NOT NULL | `1` | UNIQUE(org_id, key, version) |
| `content` | TEXT | NOT NULL | - | Conteudo do prompt |
| `is_active` | BOOLEAN | NOT NULL | `true` | UNIQUE parcial (org, key) WHERE is_active |
| `created_by` | UUID | NULL | - | FK -> profiles(id) SET NULL |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Admin-only escrita; membros leitura.

### 3.6 `ai_feature_flags`

Feature flags de IA por organizacao.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `key` | TEXT | NOT NULL | - | UNIQUE(org_id, key) |
| `enabled` | BOOLEAN | NOT NULL | `true` | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Admin-only escrita; membros leitura.

---

## 4. Tabelas - Seguranca e Compliance

### 4.1 `rate_limits`

Rate limiting para Edge Functions.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `identifier` | TEXT | NOT NULL | - | IP ou user_id |
| `endpoint` | TEXT | NOT NULL | - | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |

**Indexes:** `idx_rate_limits_lookup` (identifier, endpoint, created_at DESC).
**RLS:** Habilitada (permissive para authenticated).

### 4.2 `user_consents` (LGPD)

Registro de consentimentos para compliance LGPD.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NOT NULL | - | FK -> auth.users(id) CASCADE |
| `consent_type` | TEXT | NOT NULL | - | CHECK (terms, privacy, marketing, analytics, data_processing, AI_CONSENT) |
| `version` | TEXT | NOT NULL | - | Versao do documento |
| `consented_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |
| `ip_address` | TEXT | NULL | - | - |
| `user_agent` | TEXT | NULL | - | - |
| `revoked_at` | TIMESTAMPTZ | NULL | - | - |

**RLS:** User-scoped (proprios). Admin pode ver da mesma org.

### 4.3 `audit_logs`

Monitoramento de seguranca.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NULL | - | FK -> auth.users(id) SET NULL |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) SET NULL |
| `action` | TEXT | NOT NULL | - | - |
| `resource_type` | TEXT | NOT NULL | - | - |
| `resource_id` | UUID | NULL | - | - |
| `details` | JSONB | NULL | `'{}'` | - |
| `ip_address` | TEXT | NULL | - | - |
| `user_agent` | TEXT | NULL | - | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |
| `severity` | TEXT | NOT NULL | `'info'` | CHECK (debug, info, warning, error, critical) |

**RLS:** SELECT admin-only da mesma org. INSERT somente na propria org. Append-only.

### 4.4 `security_alerts`

Sistema de alertas de seguranca.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NULL | - | FK -> organizations(id) CASCADE |
| `alert_type` | VARCHAR(50) | NOT NULL | - | - |
| `severity` | VARCHAR(20) | NOT NULL | `'warning'` | - |
| `title` | VARCHAR(255) | NOT NULL | - | - |
| `description` | TEXT | NULL | - | - |
| `details` | JSONB | NULL | - | - |
| `user_id` | UUID | NULL | - | FK -> auth.users(id) SET NULL |
| `acknowledged_at` | TIMESTAMPTZ | NULL | - | - |
| `acknowledged_by` | UUID | NULL | - | FK -> auth.users(id) SET NULL |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Admin-only da mesma org.

---

## 5. Tabelas - Integracoes e Webhooks

### 5.1 `api_keys`

Chaves de API para integracoes externas. Token armazenado como hash SHA256.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `name` | TEXT | NOT NULL | - | - |
| `key_prefix` | TEXT | NOT NULL | - | Primeiros 12 chars |
| `key_hash` | TEXT | NOT NULL | - | SHA256 hex |
| `created_by` | UUID | NULL | - | FK -> profiles(id) SET NULL |
| `revoked_at` | TIMESTAMPTZ | NULL | - | - |
| `last_used_at` | TIMESTAMPTZ | NULL | - | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Admin-only.

### 5.2 `integration_inbound_sources`

Configuracao de fontes de entrada de leads (webhooks).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `name` | TEXT | NOT NULL | `'Entrada de Leads'` | - |
| `entry_board_id` | UUID | NOT NULL | - | FK -> boards(id) |
| `entry_stage_id` | UUID | NOT NULL | - | FK -> board_stages(id) |
| `secret` | TEXT | NOT NULL | - | Segredo de validacao |
| `active` | BOOLEAN | NOT NULL | `true` | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Admin-only.

### 5.3 `integration_outbound_endpoints`

Configuracao de endpoints de saida (webhooks de notificacao).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `name` | TEXT | NOT NULL | `'Follow-up (Webhook)'` | - |
| `url` | TEXT | NOT NULL | - | URL de destino |
| `secret` | TEXT | NOT NULL | - | HMAC secret |
| `events` | TEXT[] | NOT NULL | `ARRAY['deal.stage_changed']` | Eventos assinados |
| `active` | BOOLEAN | NOT NULL | `true` | - |
| `created_at` | TIMESTAMPTZ | NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NULL | `NOW()` | - |

**RLS:** Admin-only.

### 5.4 `webhook_events_in`

Auditoria de eventos webhook recebidos.

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `source_id` | UUID | NOT NULL | - | FK -> integration_inbound_sources(id) CASCADE |
| `provider` | TEXT | NOT NULL | `'generic'` | - |
| `external_event_id` | TEXT | NULL | - | Dedupe |
| `payload` | JSONB | NOT NULL | `'{}'` | - |
| `status` | TEXT | NOT NULL | `'received'` | - |
| `error` | TEXT | NULL | - | - |
| `created_contact_id` | UUID | NULL | - | FK -> contacts(id) SET NULL |
| `created_deal_id` | UUID | NULL | - | FK -> deals(id) SET NULL |
| `received_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |

**Index:** `webhook_events_in_dedupe` (partial unique).
**RLS:** Admin-only leitura.

### 5.5 `webhook_events_out` e `webhook_deliveries`

Auditoria de eventos webhook enviados e entregas.

**RLS:** Admin-only leitura.

---

## 6. Tabelas - Prospeccao

### 6.1 `prospecting_queues`

Fila de prospeccao (call queue) para sessoes de power dialer (Epic CP).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `contact_id` | UUID | NOT NULL | - | FK -> contacts(id) CASCADE |
| `owner_id` | UUID | NOT NULL | - | FK -> auth.users(id) CASCADE |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `status` | TEXT | NOT NULL | `'pending'` | CHECK (pending, in_progress, completed, skipped, retry_pending, exhausted) |
| `position` | INT | NOT NULL | `0` | Ordem na fila |
| `session_id` | UUID | NULL | - | - |
| `assigned_by` | UUID | NULL | - | FK -> auth.users(id) SET NULL |
| `retry_at` | TIMESTAMPTZ | NULL | - | Quando pode ser tentado novamente |
| `retry_count` | INT | NOT NULL | `0` | Tentativas (max 3) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |

**Realtime:** Adicionada a `supabase_realtime`.
**RLS:** Owner-scoped. Admin/diretor pode ver toda org.

### 6.2 `prospecting_note_templates`

Templates de notas rapidas para prospeccao (CP-2.2).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `outcome` | TEXT | NOT NULL | - | Tipo de resultado |
| `text` | TEXT | NOT NULL | - | Texto do template |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `created_by` | UUID | NOT NULL | - | FK -> auth.users(id) CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |

**RLS:** SELECT org-wide. INSERT/UPDATE admin/diretor only.

### 6.3 `prospecting_daily_goals`

Metas diarias de prospeccao (CP-2.3).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `owner_id` | UUID | NOT NULL | - | FK -> auth.users(id) CASCADE, UNIQUE |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `calls_target` | INT | NOT NULL | `30` | - |
| `connection_rate_target` | DECIMAL | NOT NULL | `0.25` | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |

**Realtime:** Adicionada a `supabase_realtime`.
**RLS:** Owner-scoped. Admin/diretor pode ver toda org.

### 6.4 `prospecting_saved_queues`

Filas salvas/favoritas de prospeccao (CP-2.4).

| Coluna | Tipo | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name` | TEXT | NOT NULL | - | - |
| `filters` | JSONB | NOT NULL | - | Filtros salvos |
| `owner_id` | UUID | NOT NULL | - | FK -> auth.users(id) CASCADE |
| `organization_id` | UUID | NOT NULL | - | FK -> organizations(id) CASCADE |
| `is_shared` | BOOLEAN | NOT NULL | `false` | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | - |

**Realtime:** Adicionada a `supabase_realtime`.
**RLS:** Owner-scoped + shared. Admin/diretor vê toda org.

---

## 7. Views e Funcoes

### 7.1 Funcoes de Dominio

| Funcao | Tipo | Security | Descricao |
|--------|------|----------|-----------|
| `get_dashboard_stats(p_org_id)` | RETURNS JSONB | INVOKER | Estatisticas gerais do dashboard (org-scoped) |
| `mark_deal_won(deal_id)` | RETURNS VOID | INVOKER | Marca deal como ganho |
| `mark_deal_lost(deal_id, reason)` | RETURNS VOID | INVOKER | Marca deal como perdido |
| `reopen_deal(deal_id)` | RETURNS VOID | INVOKER | Reabre deal fechado |
| `get_contact_stage_counts(p_org_id)` | RETURNS TABLE | INVOKER | Contagem de contatos por estagio |
| `reassign_contact_with_deals(...)` | RETURNS JSON | INVOKER | Reatribuicao atomica de contato + deals |
| `merge_contacts(p_winner, p_loser, ...)` | RETURNS JSONB | DEFINER | Merge de contatos duplicados |
| `increment_contact_ltv(p_contact_id, p_amount)` | RETURNS VOID | DEFINER | Incrementa LTV atomicamente |
| `decrement_contact_ltv(p_contact_id, p_amount)` | RETURNS VOID | DEFINER | Decrementa LTV atomicamente |
| `get_prospecting_filtered_contacts(...)` | RETURNS TABLE | INVOKER | Busca filtrada de contatos para prospeccao |

### 7.2 Funcoes de Infraestrutura

| Funcao | Tipo | Security | Descricao |
|--------|------|----------|-----------|
| `is_instance_initialized()` | RETURNS BOOLEAN | DEFINER | Verifica se ha org cadastrada |
| `get_singleton_organization_id()` | RETURNS UUID | DEFINER | Retorna a unica org ativa |
| `get_user_organization_id()` | RETURNS UUID | DEFINER | Retorna org do usuario logado (anti-recursao RLS) |
| `is_admin_or_director(p_org_id)` | RETURNS BOOLEAN | INVOKER | Verifica se usuario é admin ou diretor |
| `log_audit_event(...)` | RETURNS UUID | DEFINER | Registra evento de auditoria |
| `cleanup_rate_limits(older_than_minutes)` | RETURNS INTEGER | DEFINER | Limpa rate limits antigos |
| `update_updated_at_column()` | RETURNS TRIGGER | - | Atualiza updated_at automaticamente |
| `fn_capitalize_contact_name()` | RETURNS TRIGGER | - | INITCAP no nome do contato |

### 7.3 Funcoes de API Keys

| Funcao | Tipo | Security | Descricao |
|--------|------|----------|-----------|
| `create_api_key(p_name)` | RETURNS TABLE | DEFINER | Cria chave API (admin, retorna token uma vez) |
| `revoke_api_key(p_api_key_id)` | RETURNS VOID | DEFINER | Revoga chave API (admin) |
| `validate_api_key(p_token)` | RETURNS TABLE | DEFINER | Valida token e retorna org (anon+authenticated) |
| `_api_key_make_token()` | RETURNS TEXT | DEFINER | Gera token base64url com prefixo `ncrm_` |
| `_api_key_sha256_hex(token)` | RETURNS TEXT | DEFINER | Hash SHA256 para armazenamento seguro |

---

## 8. Triggers

| Trigger | Tabela | Evento | Funcao | Descricao |
|---------|--------|--------|--------|-----------|
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` | Cria profile + settings |
| `on_auth_user_email_updated` | auth.users | AFTER UPDATE email | `handle_user_email_update()` | Sincroniza email |
| `on_org_created` | organizations | AFTER INSERT | `handle_new_organization()` | Cria org_settings |
| `cascade_board_delete` | boards | AFTER UPDATE deleted_at | `cascade_soft_delete_deals()` | Soft delete cascata |
| `cascade_contact_delete` | contacts | AFTER UPDATE deleted_at | `cascade_soft_delete_activities_by_contact()` | Soft delete cascata |
| `check_deal_duplicate_trigger` | deals | BEFORE INSERT/UPDATE | `check_deal_duplicate()` | Impede duplicata contact+stage |
| `update_deal_notes_updated_at` | deal_notes | BEFORE UPDATE | `update_updated_at_column()` | Auto updated_at |
| `update_quick_scripts_updated_at` | quick_scripts | BEFORE UPDATE | `update_updated_at_column()` | Auto updated_at |
| `update_contact_phones_updated_at` | contact_phones | BEFORE UPDATE | `update_updated_at_column()` | Auto updated_at |
| `update_contact_preferences_updated_at` | contact_preferences | BEFORE UPDATE | `update_updated_at_column()` | Auto updated_at |
| `trg_capitalize_contact_name` | contacts | BEFORE INSERT/UPDATE name | `fn_capitalize_contact_name()` | INITCAP automatico |

---

## 9. Indexes

### 9.1 Indexes de Performance (FK e filtros)

| Index | Tabela | Colunas | Tipo | Parcial |
|-------|--------|---------|------|---------|
| `idx_deals_board_id` | deals | board_id | btree | - |
| `idx_deals_stage_id` | deals | stage_id | btree | - |
| `idx_deals_contact_id` | deals | contact_id | btree | - |
| `idx_deals_board_stage_created` | deals | board_id, stage_id, created_at DESC | btree | - |
| `idx_deals_open` | deals | board_id, stage_id | btree | WHERE is_won=false AND is_lost=false |
| `idx_deals_type_org` | deals | organization_id, deal_type | btree | - |
| `idx_deals_expected_close` | deals | organization_id, expected_close_date | btree | WHERE NOT closed |
| `idx_deals_organization_id` | deals | organization_id | btree | - |
| `idx_deals_owner_id` | deals | owner_id | btree | - |
| `idx_deal_items_deal_id` | deal_items | deal_id | btree | - |
| `idx_deal_items_organization_id` | deal_items | organization_id | btree | - |
| `idx_contacts_stage` | contacts | stage | btree | - |
| `idx_contacts_status` | contacts | status | btree | - |
| `idx_contacts_created_at` | contacts | created_at DESC | btree | - |
| `idx_contacts_organization_id` | contacts | organization_id | btree | - |
| `idx_contacts_owner_id` | contacts | owner_id | btree | - |
| `idx_contacts_cpf_org_unique` | contacts | organization_id, cpf | btree | WHERE cpf NOT NULL AND deleted_at IS NULL |
| `idx_contacts_name_trgm` | contacts | name | GIN (trigram) | - |
| `idx_contacts_email_org` | contacts | organization_id, email | btree | WHERE email NOT NULL |
| `idx_contacts_lead_score_org` | contacts | organization_id, lead_score DESC | btree | WHERE deleted_at IS NULL |
| `idx_activities_date` | activities | date DESC | btree | - |
| `idx_activities_deal_id` | activities | deal_id | btree | - |
| `idx_activities_contact_id` | activities | contact_id | btree | - |
| `idx_activities_organization_id` | activities | organization_id | btree | - |
| `idx_activities_owner_id` | activities | owner_id | btree | - |
| `idx_activities_recurrence` | activities | recurrence_type, recurrence_end_date | btree | WHERE recurrence_type NOT NULL |
| `idx_board_stages_board_id` | board_stages | board_id | btree | - |
| `idx_board_stages_organization_id` | board_stages | organization_id | btree | - |
| `idx_boards_organization_id` | boards | organization_id | btree | - |
| `idx_boards_owner_id` | boards | owner_id | btree | - |
| `idx_profiles_org_role` | profiles | organization_id, role | btree | - |

### 9.2 Indexes Unicos e Deduplicacao

| Index | Tabela | Colunas | Tipo |
|-------|--------|---------|------|
| `idx_boards_org_key_unique` | boards | organization_id, key | UNIQUE parcial |
| `ai_prompt_templates_org_key_version_unique` | ai_prompt_templates | org_id, key, version | UNIQUE |
| `ai_prompt_templates_org_key_active_unique` | ai_prompt_templates | org_id, key | UNIQUE parcial WHERE is_active |
| `ai_feature_flags_org_key_unique` | ai_feature_flags | org_id, key | UNIQUE |
| `webhook_events_in_dedupe` | webhook_events_in | source_id, external_event_id | UNIQUE parcial |

---

## 10. Politicas RLS

### Resumo de Cobertura

| Tabela | RLS Habilitada | Padrao de Acesso |
|--------|----------------|------------------|
| organizations | Sim | Membros da org (via funcao helper) |
| organization_settings | Sim | Admin escrita, org leitura |
| profiles | Sim | Org-scoped leitura, self-update |
| lifecycle_stages | Sim | Org-scoped leitura |
| boards | Sim | Org-scoped, owner+admin/diretor escrita |
| board_stages | Sim | Org-scoped, admin/diretor gestao |
| contacts | Sim | Org-wide leitura, owner+admin/diretor escrita |
| contact_phones | Sim | Org-scoped |
| contact_preferences | Sim | Org-scoped |
| deals | Sim | Org-scoped, owner_id protegido |
| deal_items | Sim | Org-scoped |
| deal_notes | Sim | Org-scoped, criador+admin/diretor gestao |
| deal_files | Sim | Org-scoped, criador+admin/diretor delete |
| activities | Sim | Org-scoped, owner+admin/diretor escrita |
| products | Sim | Org-scoped |
| tags | Sim | Org-scoped |
| custom_field_definitions | Sim | Org-scoped |
| leads | Sim | Owner-scoped, admin/diretor insert |
| user_settings | Sim | User-scoped (user_id = auth.uid()) |
| quick_scripts | Sim | Sistema + proprio |
| organization_invites | Sim | Admin gestao, membros leitura |
| notifications | Sim | Org-scoped |
| lead_score_history | Sim | Org-scoped |
| ai_conversations | Sim | User-scoped |
| ai_decisions | Sim | User-scoped |
| ai_audio_notes | Sim | User-scoped |
| ai_suggestion_interactions | Sim | User-scoped |
| ai_prompt_templates | Sim | Admin escrita, membros leitura |
| ai_feature_flags | Sim | Admin escrita, membros leitura |
| rate_limits | Sim | Authenticated (permissive) |
| user_consents | Sim | User + admin org-scoped |
| audit_logs | Sim | Admin leitura, append-only |
| security_alerts | Sim | Admin-only |
| api_keys | Sim | Admin-only |
| integration_inbound_sources | Sim | Admin-only |
| integration_outbound_endpoints | Sim | Admin-only |
| webhook_events_in | Sim | Admin leitura |
| webhook_events_out | Sim | Admin leitura |
| webhook_deliveries | Sim | Admin leitura |
| prospecting_queues | Sim | Owner + admin/diretor |
| prospecting_note_templates | Sim | Org leitura, admin/diretor gestao |
| prospecting_daily_goals | Sim | Owner + admin/diretor |
| prospecting_saved_queues | Sim | Owner + shared + admin/diretor |
| system_notifications | Sim | Authenticated (permissive) |

**Cobertura RLS: 100%** - Todas as tabelas tem RLS habilitada.

---

## 11. Diagrama de Relacionamentos

```
                              auth.users
                                  |
                                  | 1:1 (PK=FK)
                                  v
                              profiles ----+
                                  |        |
                      +-----------+--------+-----------+
                      |           |                    |
                      v           v                    v
              organizations   user_settings    organization_settings
                      |
          +-----------+-----------+-----------+-----------+
          |           |           |           |           |
          v           v           v           v           v
       boards     contacts    products    leads    tags
          |           |           |
          v           |           v
    board_stages      |      deal_items
          |           |           |
          +-----+-----+-----+----+
                |
                v
              deals ----+----+----+
                |       |         |
                v       v         v
           deal_notes  deal_files  activities
                                      |
                                      v
                              (contact via FK)

    contacts ---+--- contact_phones
                |--- contact_preferences
                |--- lead_score_history
                |--- notifications (contact_id)

    organizations ---+--- api_keys
                     |--- integration_inbound_sources
                     |--- integration_outbound_endpoints
                     |--- webhook_events_in/out
                     |--- webhook_deliveries
                     |--- ai_prompt_templates
                     |--- ai_feature_flags
                     |--- prospecting_queues
                     |--- prospecting_note_templates
                     |--- prospecting_daily_goals
                     |--- prospecting_saved_queues

    profiles/auth.users ---+--- ai_conversations
                           |--- ai_decisions
                           |--- ai_audio_notes
                           |--- ai_suggestion_interactions
                           |--- quick_scripts
                           |--- audit_logs
                           |--- user_consents
                           |--- security_alerts
```

---

## 12. Storage Buckets

| Bucket | Publico | Limite | Descricao |
|--------|---------|--------|-----------|
| `avatars` | Sim | 50MB global | Fotos de perfil |
| `audio-notes` | Nao | 50MB global | Gravacoes de audio transcritas |
| `deal-files` | Nao | 10MB por arquivo | Documentos associados a deals |

**Policies de storage** (bucket `deal-files`): Org-scoped via deal ownership. Delete restrito a owner do deal + admin/diretor.

---

## 13. Publicacoes Realtime

| Tabela | Migration |
|--------|-----------|
| `prospecting_queues` | 20260306400000 |
| `prospecting_saved_queues` | 20260306400000 |
| `prospecting_daily_goals` | 20260306400000 |
| `organization_settings` | 20260306500000 |

---

## Historico de Migrations

| # | Arquivo | Descricao Resumida |
|---|---------|-------------------|
| 1 | `20251201000000_schema_init.sql` | Schema consolidado inicial (26 tabelas, RLS, triggers, functions) |
| 2 | `20260205000000_add_performance_indexes.sql` | ~20 indexes de performance |
| 3 | `20260220000000_rbac_corretor_diretor.sql` | RBAC 3-tier (admin > diretor > corretor) |
| 4 | `20260220100000_remove_companies_and_roles.sql` | Remove crm_companies, company_name, role |
| 5 | `20260220100001_rls_protect_owner_id.sql` | Protege owner_id de corretor |
| 6 | `20260220200000_rpc_reassign_contact_with_deals.sql` | RPC reassign atomico |
| 7 | `20260223000000_security_rls_critical.sql` | RLS restritiva em 9 tabelas criticas |
| 8 | `20260223000001_security_functions_fix.sql` | Fix cross-tenant em funcoes |
| 9 | `20260223000002_security_qa_fixes.sql` | Fix QA: LGPD, handle_new_user, stage_counts |
| 10 | `20260223000003_security_constraints.sql` | CHECK constraint profiles.role + leads_insert RLS |
| 11 | `20260223100000_rls_remaining_tables.sql` | RLS restritiva em ~12 tabelas restantes |
| 12 | `20260223100001_storage_policies.sql` | Storage policies org-scoped para deal-files |
| 13-16 | `20260223200000-20260224000002` | Fixes activities RLS, org_id, null owners, check constraints |
| 17 | `20260224000001_db017_optimize_trigger_deal_stage.sql` | Trigger notificacao deal stage change |
| 18-22 | `20260224000002-20260224000007` | Composite indexes, deal duplicate check, restrict insert org, consolidate profiles, FK contacts-stage, document deals status |
| 23 | `20260225000000_coderabbit_pr5_fixes.sql` | 5 fixes de CodeRabbit (tenant isolation, RLS) |
| 24 | `20260226000000_add_recurrence_fields.sql` | Campos de recorrencia em activities |
| 25 | `20260226000001_fix_rls_recursion.sql` | Fix recursao circular RLS profiles/organizations |
| 26-31 | `20260226100000-20260226100006` | Epic 3: campos imob, phones, preferences, deals imob, commission, tech debt org_id, merge contacts |
| 32-34 | `20260226200000-20260226200002` | Lead score, notifications, LTV RPCs |
| 35 | `20260227220048_move_tags_custom_fields_to_contacts.sql` | Migra tags/custom_fields de deals para contacts |
| 36 | `20260227223316_add_metadata_to_deals.sql` | Metadata JSONB em deals |
| 37-38 | `20260228160135-20260228200001` | Lead score history + org index |
| 39 | `20260228190051_fix_stage_counts_exclude_deleted.sql` | Fix contagem com soft-deleted |
| 40-41 | `20260301185436-20260301200000` | Sync deal titles, auto-capitalize names |
| 42 | `20260303120000_add_property_ref_to_deals.sql` | property_ref em deals |
| 43 | `20260303130000_add_metadata_to_activities.sql` | Metadata JSONB em activities |
| 44 | `20260303130001_create_prospecting_queues.sql` | Tabela prospecting_queues |
| 45 | `20260303201001_rls_contacts_select_org_wide.sql` | Fix contacts SELECT org-wide |
| 46 | `20260303210000_rpc_prospecting_filtered_contacts.sql` | RPC filtro prospeccao |
| 47 | `20260304100000_add_retry_fields_prospecting_queues.sql` | Retry fields prospecting |
| 48 | `20260304200000_create_prospecting_note_templates.sql` | Templates de notas |
| 49 | `20260306100000_create_prospecting_daily_goals.sql` | Metas diarias |
| 50 | `20260306200000_create_prospecting_saved_queues.sql` | Filas salvas |
| 51 | `20260306400000_add_prospecting_tables_to_realtime.sql` | Realtime prospeccao |
| 52 | `20260306500000_add_org_settings_to_realtime.sql` | Realtime org_settings |

---

*Documento gerado por @data-engineer (Dara) - Brownfield Discovery Phase 2*
*Ultima atualizacao: 2026-03-06*
