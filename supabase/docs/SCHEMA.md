# SCHEMA.md - Documentacao Completa do Banco de Dados

> **Projeto:** ZmobCRM (CRM Imobiliario)
> **Gerado em:** 2026-03-03
> **Fase:** Brownfield Discovery - Phase 2 (@data-engineer / DB Sage)
> **PostgreSQL:** 17 (Supabase)
> **Migrations:** 42 arquivos (20251201 a 20260303)
> **Tabelas ativas:** 36 (crm_companies foi removida)

---

## Sumario

1. [Extensoes](#1-extensoes)
2. [Tabelas Principais](#2-tabelas-principais)
3. [Tabelas de IA](#3-tabelas-de-ia)
4. [Tabelas de Seguranca](#4-tabelas-de-seguranca)
5. [Tabelas de Integracoes/Webhooks](#5-tabelas-de-integracoes-webhooks)
6. [Tabelas de CRM Imobiliario (Epic 3)](#6-tabelas-de-crm-imobiliario-epic-3)
7. [Relacionamentos (Foreign Keys)](#7-relacionamentos-foreign-keys)
8. [Indexes](#8-indexes)
9. [RLS Policies](#9-rls-policies)
10. [Functions](#10-functions)
11. [Triggers](#11-triggers)
12. [Tipos Customizados e Enums](#12-tipos-customizados-e-enums)
13. [Storage Buckets](#13-storage-buckets)
14. [Realtime](#14-realtime)
15. [Historico de Migrations](#15-historico-de-migrations)

---

## 1. Extensoes

| Extensao | Schema | Proposito |
|----------|--------|-----------|
| `uuid-ossp` | extensions | Geracao de UUIDs (uuid_generate_v4) |
| `pgcrypto` | extensions | Funcoes criptograficas (gen_random_bytes, digest) |
| `unaccent` | public | Remocao de acentos para slugs (boards.key) |
| `pg_net` | -- | HTTP async para webhooks outbound |
| `pg_trgm` | public | Busca trigram para nomes de contatos |

---

## 2. Tabelas Principais

### 2.1 organizations

Organizacao (tenant). Single-tenant na pratica mas com estrutura multi-tenant.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| name | TEXT | NOT NULL | -- | -- |
| deleted_at | TIMESTAMPTZ | NULL | NULL | Soft delete |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. SELECT restrito a membros da org. UPDATE restrito a admins. No INSERT/DELETE policy (service_role only).

---

### 2.2 organization_settings

Configuracoes globais de IA por organizacao. 1:1 com organizations.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| organization_id | UUID | NOT NULL | -- | PK, FK -> organizations(id) ON DELETE CASCADE |
| ai_provider | TEXT | NULL | 'google' | -- |
| ai_model | TEXT | NULL | 'gemini-2.5-flash' | -- |
| ai_google_key | TEXT | NULL | -- | SENSITIVE |
| ai_openai_key | TEXT | NULL | -- | SENSITIVE |
| ai_anthropic_key | TEXT | NULL | -- | SENSITIVE |
| ai_enabled | BOOLEAN | NOT NULL | true | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. SELECT para membros da org. INSERT/UPDATE/DELETE apenas admin.

---

### 2.3 profiles

Perfil de usuario. Estende auth.users. 1:1 com auth.users.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | -- | PK, FK -> auth.users(id) ON DELETE CASCADE |
| email | TEXT | NULL | -- | CHECK (email LIKE '%@%' or null/empty) |
| name | TEXT | NULL | -- | **DEPRECATED** (usar first_name) |
| avatar | TEXT | NULL | -- | **DEPRECATED** (usar avatar_url) |
| role | TEXT | NULL | 'corretor' | CHECK (role IN ('admin','diretor','corretor')) |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| first_name | TEXT | NULL | -- | Canonical (DB-014) |
| last_name | TEXT | NULL | -- | -- |
| nickname | TEXT | NULL | -- | -- |
| phone | TEXT | NULL | -- | -- |
| avatar_url | TEXT | NULL | -- | Canonical (DB-014) |
| commission_rate | NUMERIC | NULL | 1.5 | CHECK (0 <= x <= 100) |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. SELECT via `get_user_organization_id()` (mesma org). UPDATE apenas o proprio usuario.

---

### 2.4 lifecycle_stages

Estagios do funil de vendas. Tabela global de referencia (nao org-scoped).

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | TEXT | NOT NULL | -- | PK |
| name | TEXT | NOT NULL | -- | -- |
| color | TEXT | NOT NULL | -- | -- |
| order | INTEGER | NOT NULL | -- | -- |
| is_default | BOOLEAN | NULL | false | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |

**Seed data:** LEAD(0), MQL(1), PROSPECT(2), CUSTOMER(3), OTHER(4)

**RLS:** Enabled. SELECT para todos autenticados. INSERT/UPDATE/DELETE apenas admin.

---

### 2.5 boards

Quadros Kanban (pipelines de vendas).

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| key | TEXT | NULL | -- | Slug, UNIQUE per org (active) |
| name | TEXT | NOT NULL | -- | -- |
| description | TEXT | NULL | -- | -- |
| type | TEXT | NULL | 'SALES' | -- |
| is_default | BOOLEAN | NULL | false | -- |
| template | TEXT | NULL | -- | -- |
| linked_lifecycle_stage | TEXT | NULL | -- | -- |
| next_board_id | UUID | NULL | -- | FK -> boards(id) self-ref |
| goal_description | TEXT | NULL | -- | -- |
| goal_kpi | TEXT | NULL | -- | -- |
| goal_target_value | TEXT | NULL | -- | -- |
| goal_type | TEXT | NULL | -- | -- |
| agent_name | TEXT | NULL | -- | AI agent config |
| agent_role | TEXT | NULL | -- | AI agent config |
| agent_behavior | TEXT | NULL | -- | AI agent config |
| entry_trigger | TEXT | NULL | -- | -- |
| automation_suggestions | TEXT[] | NULL | -- | -- |
| position | INTEGER | NULL | 0 | -- |
| default_product_id | UUID | NULL | -- | FK -> products(id) |
| won_stage_id | UUID | NULL | -- | FK -> board_stages(id) |
| lost_stage_id | UUID | NULL | -- | FK -> board_stages(id) |
| won_stay_in_stage | BOOLEAN | NULL | false | -- |
| lost_stay_in_stage | BOOLEAN | NULL | false | -- |
| deleted_at | TIMESTAMPTZ | NULL | -- | Soft delete |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |
| owner_id | UUID | NULL | -- | FK -> profiles(id) |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. SELECT para membros da org. INSERT para membros da org. UPDATE/DELETE para owner, NULL owner ou admin/diretor.

---

### 2.6 board_stages

Colunas/estagios dos quadros Kanban.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| board_id | UUID | NULL | -- | FK -> boards(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL | -- | -- |
| label | TEXT | NULL | -- | Display label |
| color | TEXT | NULL | -- | -- |
| order | INTEGER | NOT NULL | -- | -- |
| is_default | BOOLEAN | NULL | false | -- |
| linked_lifecycle_stage | TEXT | NULL | -- | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. SELECT para membros da org. INSERT/UPDATE/DELETE apenas admin/diretor.

---

### 2.7 contacts

Contatos (leads/clientes). Entidade central do CRM.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| name | TEXT | NOT NULL | -- | Auto INITCAP via trigger |
| email | TEXT | NULL | -- | CHECK (email LIKE '%@%' or null/empty) |
| phone | TEXT | NULL | -- | Legacy (usar contact_phones) |
| avatar | TEXT | NULL | -- | -- |
| notes | TEXT | NULL | -- | -- |
| status | TEXT | NULL | 'ACTIVE' | -- |
| stage | TEXT | NULL | 'LEAD' | FK -> lifecycle_stages(id) |
| source | TEXT | NULL | -- | -- |
| birth_date | DATE | NULL | -- | -- |
| last_interaction | TIMESTAMPTZ | NULL | -- | -- |
| last_purchase_date | DATE | NULL | -- | -- |
| total_value | NUMERIC | NULL | 0 | LTV acumulado |
| cpf | TEXT | NULL | -- | UNIQUE per org (active) |
| contact_type | TEXT | NULL | 'PF' | CHECK (IN 'PF','PJ') |
| classification | TEXT | NULL | -- | CHECK (IN 'COMPRADOR','VENDEDOR','LOCATARIO','LOCADOR','INVESTIDOR','PERMUTANTE') |
| temperature | TEXT | NULL | 'WARM' | CHECK (IN 'HOT','WARM','COLD') |
| address_cep | TEXT | NULL | -- | -- |
| address_city | TEXT | NULL | -- | -- |
| address_state | TEXT | NULL | -- | CHECK (length = 2) |
| profile_data | JSONB | NULL | '{}' | Dados complementares |
| lead_score | INTEGER | NULL | 0 | CHECK (0 <= x <= 100) |
| tags | TEXT[] | NULL | '{}' | Movido de deals |
| custom_fields | JSONB | NULL | '{}' | Movido de deals |
| deleted_at | TIMESTAMPTZ | NULL | -- | Soft delete |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | Auto via trigger |
| owner_id | UUID | NULL | -- | FK -> profiles(id) |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. SELECT/UPDATE/DELETE: owner, NULL owner ou admin/diretor (mesma org). INSERT: membros da org.

---

### 2.8 deals

Negocios/Oportunidades. Vinculado a board + stage.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| title | TEXT | NOT NULL | -- | Sync com contact.name |
| value | NUMERIC | NULL | 0 | CHECK (>= 0) |
| probability | INTEGER | NULL | 0 | CHECK (0 <= x <= 100) |
| status | TEXT | NULL | -- | **DEPRECATED** (usar stage_id) |
| priority | TEXT | NULL | 'medium' | -- |
| board_id | UUID | NULL | -- | FK -> boards(id) |
| stage_id | UUID | NULL | -- | FK -> board_stages(id) |
| contact_id | UUID | NULL | -- | FK -> contacts(id) |
| ai_summary | TEXT | NULL | -- | -- |
| loss_reason | TEXT | NULL | -- | -- |
| last_stage_change_date | TIMESTAMPTZ | NULL | -- | -- |
| is_won | BOOLEAN | NOT NULL | false | -- |
| is_lost | BOOLEAN | NOT NULL | false | -- |
| closed_at | TIMESTAMPTZ | NULL | -- | -- |
| deal_type | TEXT | NULL | 'VENDA' | CHECK (IN 'VENDA','LOCACAO','PERMUTA') |
| expected_close_date | DATE | NULL | -- | Forecast |
| commission_rate | NUMERIC | NULL | -- | CHECK (0 <= x <= 100), override do corretor |
| metadata | JSONB | NULL | '{}' | Dados internos (checklist, inbound source) |
| property_ref | TEXT | NULL | -- | Referencia ao imovel (texto livre) |
| deleted_at | TIMESTAMPTZ | NULL | -- | Soft delete |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | Auto via trigger |
| owner_id | UUID | NULL | -- | FK -> profiles(id) |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**Trigger:** `check_deal_duplicate` previne deal duplicado (mesmo contact + stage + open).

**RLS:** Enabled. SELECT/UPDATE/DELETE: owner, NULL owner ou admin/diretor (mesma org). INSERT: membros da org.

---

### 2.9 deal_items

Produtos/itens vinculados a deals.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| deal_id | UUID | NULL | -- | FK -> deals(id) ON DELETE CASCADE |
| product_id | UUID | NULL | -- | FK -> products(id) |
| name | TEXT | NOT NULL | -- | -- |
| quantity | INTEGER | NOT NULL | 1 | CHECK (> 0) |
| price | NUMERIC | NOT NULL | 0 | CHECK (>= 0) |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. CRUD org-scoped.

---

### 2.10 activities

Atividades (tarefas, ligacoes, reunioes, notas).

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| title | TEXT | NOT NULL | -- | -- |
| description | TEXT | NULL | -- | -- |
| type | TEXT | NOT NULL | -- | Ex: 'CALL','MEETING','TASK','NOTE' |
| date | TIMESTAMPTZ | NOT NULL | -- | -- |
| completed | BOOLEAN | NULL | false | -- |
| deal_id | UUID | NULL | -- | FK -> deals(id) ON DELETE CASCADE |
| contact_id | UUID | NULL | -- | FK -> contacts(id) ON DELETE SET NULL |
| participant_contact_ids | UUID[] | NULL | -- | GIN indexed |
| recurrence_type | TEXT | NULL | NULL | CHECK (IN 'daily','weekly','monthly') |
| recurrence_end_date | DATE | NULL | NULL | Requires recurrence_type |
| deleted_at | TIMESTAMPTZ | NULL | -- | Soft delete |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| owner_id | UUID | NULL | -- | FK -> profiles(id) |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. SELECT/UPDATE/DELETE: owner, NULL owner ou admin/diretor (mesma org). INSERT: membros da org.

---

### 2.11 products

Catalogo de produtos/servicos.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| name | TEXT | NOT NULL | -- | -- |
| description | TEXT | NULL | -- | -- |
| price | NUMERIC | NOT NULL | 0 | -- |
| sku | TEXT | NULL | -- | -- |
| active | BOOLEAN | NULL | true | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |
| owner_id | UUID | NULL | -- | FK -> profiles(id) |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. SELECT para membros da org. INSERT/UPDATE/DELETE apenas admin/diretor.

---

### 2.12 tags

Sistema de tags organizacionais.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| name | TEXT | NOT NULL | -- | UNIQUE(name, organization_id) |
| color | TEXT | NULL | 'bg-gray-500' | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. CRUD org-scoped.

---

### 2.13 custom_field_definitions

Definicoes de campos personalizados.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| key | TEXT | NOT NULL | -- | UNIQUE(key, organization_id) |
| label | TEXT | NOT NULL | -- | -- |
| type | TEXT | NOT NULL | -- | -- |
| options | TEXT[] | NULL | -- | Para tipos select/radio |
| entity_type | TEXT | NOT NULL | 'contact' | Originalmente 'deal', migrado para 'contact' |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**RLS:** Enabled. SELECT para membros da org. INSERT/UPDATE/DELETE apenas admin/diretor.

---

### 2.14 leads

Tabela de importacao de leads (staging).

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| name | TEXT | NOT NULL | -- | -- |
| email | TEXT | NULL | -- | -- |
| source | TEXT | NULL | -- | -- |
| status | TEXT | NULL | 'NEW' | -- |
| notes | TEXT | NULL | -- | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| converted_to_contact_id | UUID | NULL | -- | FK -> contacts(id) |
| owner_id | UUID | NULL | -- | FK -> profiles(id) |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |

**Nota:** Colunas `company_name` e `role` foram removidas na migration 20260220100000.

**RLS:** Enabled. SELECT/UPDATE: owner ou admin/diretor. INSERT: owner ou admin/diretor. DELETE: admin only.

---

### 2.15 deal_notes

Notas por deal.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| deal_id | UUID | NOT NULL | -- | FK -> deals(id) ON DELETE CASCADE |
| content | TEXT | NOT NULL | -- | -- |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | Auto via trigger |
| created_by | UUID | NULL | -- | FK -> profiles(id) ON DELETE SET NULL |

**RLS:** Enabled. SELECT/INSERT: org-scoped. UPDATE/DELETE: criador ou admin/diretor.

---

### 2.16 deal_files

Arquivos por deal.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| deal_id | UUID | NOT NULL | -- | FK -> deals(id) ON DELETE CASCADE |
| file_name | TEXT | NOT NULL | -- | -- |
| file_path | TEXT | NOT NULL | -- | -- |
| file_size | INTEGER | NULL | -- | -- |
| mime_type | TEXT | NULL | -- | -- |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| created_by | UUID | NULL | -- | FK -> profiles(id) ON DELETE SET NULL |

**RLS:** Enabled. SELECT/INSERT: org-scoped. UPDATE/DELETE: criador ou admin/diretor.

---

### 2.17 quick_scripts

Templates de scripts de vendas.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| title | TEXT | NOT NULL | -- | -- |
| category | TEXT | NOT NULL | -- | CHECK (IN 'followup','objection','closing','intro','rescue','other') |
| template | TEXT | NOT NULL | -- | Texto com placeholders {nome} |
| icon | TEXT | NULL | 'MessageSquare' | Icone Lucide |
| is_system | BOOLEAN | NULL | false | Scripts do sistema (imutaveis) |
| user_id | UUID | NULL | -- | FK -> profiles(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | Auto via trigger |

**RLS:** Enabled. SELECT: scripts do sistema + proprios. INSERT/UPDATE/DELETE: apenas proprios (nao system).

---

### 2.18 user_settings

Configuracoes por usuario.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NULL | -- | FK -> profiles(id) ON DELETE CASCADE, UNIQUE |
| ai_provider | TEXT | NULL | 'google' | -- |
| ai_api_key | TEXT | NULL | -- | **DEPRECATED** (usar ai_*_key) |
| ai_model | TEXT | NULL | 'gemini-2.5-flash' | -- |
| ai_thinking | BOOLEAN | NULL | true | -- |
| ai_search | BOOLEAN | NULL | true | -- |
| ai_anthropic_caching | BOOLEAN | NULL | false | -- |
| ai_google_key | TEXT | NULL | -- | SENSITIVE |
| ai_openai_key | TEXT | NULL | -- | SENSITIVE |
| ai_anthropic_key | TEXT | NULL | -- | SENSITIVE |
| dark_mode | BOOLEAN | NULL | true | -- |
| default_route | TEXT | NULL | '/boards' | -- |
| active_board_id | UUID | NULL | -- | FK -> boards(id) |
| inbox_view_mode | TEXT | NULL | 'list' | -- |
| onboarding_completed | BOOLEAN | NULL | false | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. CRUD apenas para o proprio usuario.

---

### 2.19 organization_invites

Convites para novos usuarios.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| email | TEXT | NULL | -- | -- |
| role | TEXT | NOT NULL | 'corretor' | CHECK (IN 'admin','diretor','corretor') |
| token | UUID | NOT NULL | gen_random_uuid() | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| expires_at | TIMESTAMPTZ | NULL | -- | -- |
| used_at | TIMESTAMPTZ | NULL | -- | -- |
| created_by | UUID | NULL | -- | FK -> profiles(id) |

**RLS:** Enabled. Admin e diretor podem gerenciar. Membros podem visualizar.

---

### 2.20 system_notifications

Notificacoes do sistema.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| type | TEXT | NOT NULL | -- | -- |
| title | TEXT | NOT NULL | -- | -- |
| message | TEXT | NOT NULL | -- | -- |
| link | TEXT | NULL | -- | -- |
| severity | TEXT | NULL | 'medium' | CHECK (IN 'high','medium','low') |
| read_at | TIMESTAMPTZ | NULL | -- | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. SELECT/UPDATE/DELETE org-scoped. No INSERT policy (server-side only).

---

## 3. Tabelas de IA

### 3.1 ai_conversations

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NULL | -- | FK -> profiles(id) ON DELETE CASCADE |
| conversation_key | TEXT | NOT NULL | -- | UNIQUE(user_id, conversation_key) |
| messages | JSONB | NULL | '[]' | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. CRUD own. Admin/diretor can SELECT org.

---

### 3.2 ai_decisions

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NULL | -- | FK -> profiles(id) ON DELETE CASCADE |
| deal_id | UUID | NULL | -- | FK -> deals(id) ON DELETE CASCADE |
| contact_id | UUID | NULL | -- | FK -> contacts(id) ON DELETE SET NULL |
| decision_type | TEXT | NOT NULL | -- | -- |
| priority | TEXT | NULL | 'medium' | -- |
| title | TEXT | NOT NULL | -- | -- |
| description | TEXT | NULL | -- | -- |
| suggested_action | JSONB | NULL | -- | -- |
| status | TEXT | NULL | 'pending' | -- |
| snoozed_until | TIMESTAMPTZ | NULL | -- | -- |
| processed_at | TIMESTAMPTZ | NULL | -- | -- |
| ai_reasoning | TEXT | NULL | -- | -- |
| confidence_score | NUMERIC(3,2) | NULL | -- | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. CRUD own. Admin/diretor can SELECT org.

---

### 3.3 ai_audio_notes

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NULL | -- | FK -> profiles(id) ON DELETE CASCADE |
| deal_id | UUID | NULL | -- | FK -> deals(id) ON DELETE CASCADE |
| contact_id | UUID | NULL | -- | FK -> contacts(id) ON DELETE SET NULL |
| audio_url | TEXT | NULL | -- | -- |
| duration_seconds | INTEGER | NULL | -- | -- |
| transcription | TEXT | NOT NULL | -- | -- |
| sentiment | TEXT | NULL | -- | -- |
| next_action | JSONB | NULL | -- | -- |
| activity_created_id | UUID | NULL | -- | FK -> activities(id) |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. CRUD own. Admin/diretor can SELECT org.

---

### 3.4 ai_suggestion_interactions

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NOT NULL | -- | FK -> auth.users(id) ON DELETE CASCADE |
| suggestion_type | TEXT | NOT NULL | -- | CHECK (IN 'UPSELL','STALLED','BIRTHDAY','RESCUE') |
| entity_type | TEXT | NOT NULL | -- | CHECK (IN 'deal','contact') |
| entity_id | UUID | NOT NULL | -- | -- |
| action | TEXT | NOT NULL | -- | CHECK (IN 'ACCEPTED','DISMISSED','SNOOZED') |
| snoozed_until | TIMESTAMPTZ | NULL | -- | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |

**Unique:** (user_id, suggestion_type, entity_id)

**RLS:** Enabled (permissive from init, no org-scoped rewrite applied).

---

### 3.5 ai_prompt_templates

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| key | TEXT | NOT NULL | -- | UNIQUE(org, key, version) |
| version | INTEGER | NOT NULL | 1 | -- |
| content | TEXT | NOT NULL | -- | -- |
| is_active | BOOLEAN | NOT NULL | true | UNIQUE(org, key) WHERE is_active |
| created_by | UUID | NULL | -- | FK -> profiles(id) ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. Admin CRUD. Members SELECT.

---

### 3.6 ai_feature_flags

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| key | TEXT | NOT NULL | -- | UNIQUE(org, key) |
| enabled | BOOLEAN | NOT NULL | true | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. Admin CRUD. Members SELECT.

---

## 4. Tabelas de Seguranca

### 4.1 rate_limits

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| identifier | TEXT | NOT NULL | -- | -- |
| endpoint | TEXT | NOT NULL | -- | -- |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | -- |

**RLS:** Enabled (permissive from init).

---

### 4.2 user_consents (LGPD)

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NOT NULL | -- | FK -> auth.users(id) ON DELETE CASCADE |
| consent_type | TEXT | NOT NULL | -- | CHECK (IN 'terms','privacy','marketing','analytics','data_processing','AI_CONSENT') |
| version | TEXT | NOT NULL | -- | -- |
| consented_at | TIMESTAMPTZ | NOT NULL | NOW() | -- |
| ip_address | TEXT | NULL | -- | -- |
| user_agent | TEXT | NULL | -- | -- |
| revoked_at | TIMESTAMPTZ | NULL | -- | -- |

**RLS:** Enabled. Users see/manage own. Admin sees org (org-scoped fix applied).

---

### 4.3 audit_logs

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| user_id | UUID | NULL | -- | FK -> auth.users(id) ON DELETE SET NULL |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE SET NULL |
| action | TEXT | NOT NULL | -- | -- |
| resource_type | TEXT | NOT NULL | -- | -- |
| resource_id | UUID | NULL | -- | -- |
| details | JSONB | NULL | '{}' | -- |
| ip_address | TEXT | NULL | -- | -- |
| user_agent | TEXT | NULL | -- | -- |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | -- |
| severity | TEXT | NOT NULL | 'info' | CHECK (IN 'debug','info','warning','error','critical') |

**RLS:** Enabled. SELECT admin only. INSERT own org + own user_id. No UPDATE/DELETE (append-only).

---

### 4.4 security_alerts

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| alert_type | VARCHAR(50) | NOT NULL | -- | -- |
| severity | VARCHAR(20) | NOT NULL | 'warning' | -- |
| title | VARCHAR(255) | NOT NULL | -- | -- |
| description | TEXT | NULL | -- | -- |
| details | JSONB | NULL | -- | -- |
| user_id | UUID | NULL | -- | FK -> auth.users(id) ON DELETE SET NULL |
| acknowledged_at | TIMESTAMPTZ | NULL | -- | -- |
| acknowledged_by | UUID | NULL | -- | FK -> auth.users(id) ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. Admin only (CRUD org-scoped).

---

## 5. Tabelas de Integracoes/Webhooks

### 5.1 api_keys

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL | -- | -- |
| key_prefix | TEXT | NOT NULL | -- | Primeiros 12 chars |
| key_hash | TEXT | NOT NULL | -- | SHA-256 hex |
| created_by | UUID | NULL | -- | FK -> profiles(id) ON DELETE SET NULL |
| revoked_at | TIMESTAMPTZ | NULL | -- | -- |
| last_used_at | TIMESTAMPTZ | NULL | -- | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. Admin only.

---

### 5.2 integration_inbound_sources

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL | 'Entrada de Leads' | -- |
| entry_board_id | UUID | NOT NULL | -- | FK -> boards(id) |
| entry_stage_id | UUID | NOT NULL | -- | FK -> board_stages(id) |
| secret | TEXT | NOT NULL | -- | SENSITIVE |
| active | BOOLEAN | NOT NULL | true | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. Admin only.

---

### 5.3 integration_outbound_endpoints

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL | 'Follow-up (Webhook)' | -- |
| url | TEXT | NOT NULL | -- | -- |
| secret | TEXT | NOT NULL | -- | SENSITIVE |
| events | TEXT[] | NOT NULL | ARRAY['deal.stage_changed'] | -- |
| active | BOOLEAN | NOT NULL | true | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | -- |

**RLS:** Enabled. Admin only.

---

### 5.4 webhook_events_in

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| source_id | UUID | NOT NULL | -- | FK -> integration_inbound_sources(id) ON DELETE CASCADE |
| provider | TEXT | NOT NULL | 'generic' | -- |
| external_event_id | TEXT | NULL | -- | UNIQUE(source_id, external_event_id) WHERE NOT NULL |
| payload | JSONB | NOT NULL | '{}' | -- |
| status | TEXT | NOT NULL | 'received' | -- |
| error | TEXT | NULL | -- | -- |
| created_contact_id | UUID | NULL | -- | FK -> contacts(id) ON DELETE SET NULL |
| created_deal_id | UUID | NULL | -- | FK -> deals(id) ON DELETE SET NULL |
| received_at | TIMESTAMPTZ | NOT NULL | NOW() | -- |

**RLS:** Enabled. Admin SELECT only.

---

### 5.5 webhook_events_out

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| event_type | TEXT | NOT NULL | -- | -- |
| payload | JSONB | NOT NULL | '{}' | -- |
| deal_id | UUID | NULL | -- | FK -> deals(id) ON DELETE SET NULL |
| from_stage_id | UUID | NULL | -- | FK -> board_stages(id) ON DELETE SET NULL |
| to_stage_id | UUID | NULL | -- | FK -> board_stages(id) ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | -- |

**RLS:** Enabled. Admin SELECT only.

---

### 5.6 webhook_deliveries

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| endpoint_id | UUID | NOT NULL | -- | FK -> integration_outbound_endpoints(id) ON DELETE CASCADE |
| event_id | UUID | NOT NULL | -- | FK -> webhook_events_out(id) ON DELETE CASCADE |
| request_id | BIGINT | NULL | -- | pg_net request ID |
| status | TEXT | NOT NULL | 'queued' | -- |
| attempted_at | TIMESTAMPTZ | NOT NULL | NOW() | -- |
| response_status | INT | NULL | -- | -- |
| error | TEXT | NULL | -- | -- |

**RLS:** Enabled. Admin SELECT only.

---

## 6. Tabelas de CRM Imobiliario (Epic 3)

### 6.1 contact_phones

Multiplos telefones por contato.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| contact_id | UUID | NOT NULL | -- | FK -> contacts(id) ON DELETE CASCADE |
| phone_number | TEXT | NOT NULL | -- | -- |
| phone_type | TEXT | NOT NULL | 'CELULAR' | CHECK (IN 'CELULAR','COMERCIAL','RESIDENCIAL') |
| is_whatsapp | BOOLEAN | NOT NULL | false | -- |
| is_primary | BOOLEAN | NOT NULL | false | UNIQUE per contact WHERE is_primary |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | Auto via trigger |

**RLS:** Enabled. CRUD org-scoped.

---

### 6.2 contact_preferences

Perfil de interesse imobiliario do contato.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| contact_id | UUID | NOT NULL | -- | FK -> contacts(id) ON DELETE CASCADE |
| property_types | TEXT[] | NULL | '{}' | Valores: APARTAMENTO, CASA, TERRENO, etc. |
| purpose | TEXT | NULL | -- | CHECK (IN 'MORADIA','INVESTIMENTO','VERANEIO') |
| price_min | NUMERIC | NULL | -- | CHECK (price_min <= price_max) |
| price_max | NUMERIC | NULL | -- | -- |
| regions | TEXT[] | NULL | '{}' | -- |
| bedrooms_min | INTEGER | NULL | -- | -- |
| parking_min | INTEGER | NULL | -- | -- |
| area_min | NUMERIC | NULL | -- | -- |
| accepts_financing | BOOLEAN | NULL | -- | -- |
| accepts_fgts | BOOLEAN | NULL | -- | -- |
| urgency | TEXT | NULL | -- | CHECK (IN 'IMMEDIATE','3_MONTHS','6_MONTHS','1_YEAR') |
| notes | TEXT | NULL | -- | -- |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| updated_at | TIMESTAMPTZ | NULL | NOW() | Auto via trigger |

**RLS:** Enabled. CRUD org-scoped.

---

### 6.3 notifications

Notificacoes CRM inteligentes.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) |
| type | TEXT | NOT NULL | -- | CHECK (IN 'BIRTHDAY','CHURN_ALERT','DEAL_STAGNANT','SCORE_DROP') |
| title | TEXT | NOT NULL | -- | -- |
| description | TEXT | NULL | -- | -- |
| contact_id | UUID | NULL | -- | FK -> contacts(id) ON DELETE CASCADE |
| deal_id | UUID | NULL | -- | FK -> deals(id) ON DELETE CASCADE |
| is_read | BOOLEAN | NULL | false | -- |
| created_at | TIMESTAMPTZ | NULL | NOW() | -- |
| owner_id | UUID | NULL | -- | FK -> profiles(id) |

**RLS:** Enabled. SELECT/INSERT/UPDATE org-scoped. No DELETE policy.

---

### 6.4 lead_score_history

Historico de mudancas de lead score.

| Coluna | Tipo | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| contact_id | UUID | NOT NULL | -- | FK -> contacts(id) ON DELETE CASCADE |
| organization_id | UUID | NOT NULL | -- | FK -> organizations(id) |
| old_score | INTEGER | NOT NULL | -- | -- |
| new_score | INTEGER | NOT NULL | -- | -- |
| change | INTEGER | NOT NULL | -- | -- |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | -- |

**RLS:** Enabled. SELECT/INSERT org-scoped.

---

## 7. Relacionamentos (Foreign Keys)

### Diagrama Simplificado

```
auth.users --(1:1)--> profiles --(N:1)--> organizations
                                              |
         +------------------------------------+
         |              |            |
       boards    contacts        deals
         |          |    \         /   \
    board_stages    |   contact_phones  deal_items
         |          |   contact_prefs   deal_notes
         |          |                   deal_files
       deals <------+
         |
    activities
```

### Lista Completa de FKs

| Tabela | Coluna | Referencia | ON DELETE |
|--------|--------|------------|-----------|
| profiles | id | auth.users(id) | CASCADE |
| profiles | organization_id | organizations(id) | CASCADE |
| boards | organization_id | organizations(id) | CASCADE |
| boards | owner_id | profiles(id) | -- |
| boards | next_board_id | boards(id) | -- |
| boards | default_product_id | products(id) | -- |
| boards | won_stage_id | board_stages(id) | -- |
| boards | lost_stage_id | board_stages(id) | -- |
| board_stages | board_id | boards(id) | CASCADE |
| board_stages | organization_id | organizations(id) | CASCADE |
| contacts | owner_id | profiles(id) | -- |
| contacts | organization_id | organizations(id) | CASCADE |
| contacts | stage | lifecycle_stages(id) | -- |
| deals | board_id | boards(id) | -- |
| deals | stage_id | board_stages(id) | -- |
| deals | contact_id | contacts(id) | -- |
| deals | owner_id | profiles(id) | -- |
| deals | organization_id | organizations(id) | CASCADE |
| deal_items | deal_id | deals(id) | CASCADE |
| deal_items | product_id | products(id) | -- |
| deal_items | organization_id | organizations(id) | CASCADE |
| deal_notes | deal_id | deals(id) | CASCADE |
| deal_notes | organization_id | organizations(id) | CASCADE |
| deal_notes | created_by | profiles(id) | SET NULL |
| deal_files | deal_id | deals(id) | CASCADE |
| deal_files | organization_id | organizations(id) | CASCADE |
| deal_files | created_by | profiles(id) | SET NULL |
| activities | deal_id | deals(id) | CASCADE |
| activities | contact_id | contacts(id) | SET NULL |
| activities | owner_id | profiles(id) | -- |
| activities | organization_id | organizations(id) | CASCADE |
| contact_phones | contact_id | contacts(id) | CASCADE |
| contact_phones | organization_id | organizations(id) | CASCADE |
| contact_preferences | contact_id | contacts(id) | CASCADE |
| contact_preferences | organization_id | organizations(id) | CASCADE |
| notifications | organization_id | organizations(id) | -- |
| notifications | contact_id | contacts(id) | CASCADE |
| notifications | deal_id | deals(id) | CASCADE |
| notifications | owner_id | profiles(id) | -- |
| lead_score_history | contact_id | contacts(id) | CASCADE |
| lead_score_history | organization_id | organizations(id) | -- |
| leads | converted_to_contact_id | contacts(id) | -- |
| leads | owner_id | profiles(id) | -- |
| leads | organization_id | organizations(id) | CASCADE |

---

## 8. Indexes

### Performance Indexes

| Index | Tabela | Colunas | Tipo | Condicao |
|-------|--------|---------|------|----------|
| idx_deals_board_id | deals | board_id | btree | -- |
| idx_deals_stage_id | deals | stage_id | btree | -- |
| idx_deals_contact_id | deals | contact_id | btree | -- |
| idx_deals_board_stage_created | deals | board_id, stage_id, created_at DESC | btree | -- |
| idx_deals_open | deals | board_id, stage_id | btree | WHERE is_won=false AND is_lost=false |
| idx_deals_organization_id | deals | organization_id | btree | -- |
| idx_deals_owner_id | deals | owner_id | btree | -- |
| idx_deals_type_org | deals | organization_id, deal_type | btree | -- |
| idx_deals_expected_close | deals | organization_id, expected_close_date | btree | WHERE NOT NULL AND open |
| idx_contacts_stage | contacts | stage | btree | -- |
| idx_contacts_status | contacts | status | btree | -- |
| idx_contacts_created_at | contacts | created_at DESC | btree | -- |
| idx_contacts_organization_id | contacts | organization_id | btree | -- |
| idx_contacts_owner_id | contacts | owner_id | btree | -- |
| idx_contacts_name_trgm | contacts | name | GIN (trigram) | -- |
| idx_contacts_email_org | contacts | organization_id, email | btree | WHERE email NOT NULL |
| idx_contacts_updated_at | contacts | updated_at DESC | btree | -- |
| idx_contacts_classification | contacts | organization_id, classification | btree | -- |
| idx_contacts_temperature | contacts | organization_id, temperature | btree | -- |
| idx_contacts_contact_type | contacts | organization_id, contact_type | btree | -- |
| idx_contacts_lead_score_org | contacts | organization_id, lead_score DESC | btree | WHERE deleted_at IS NULL |
| idx_contacts_cpf_org_unique | contacts | organization_id, cpf | UNIQUE | WHERE cpf NOT NULL AND deleted_at IS NULL |
| idx_activities_date | activities | date DESC | btree | -- |
| idx_activities_deal_id | activities | deal_id | btree | -- |
| idx_activities_contact_id | activities | contact_id | btree | -- |
| idx_activities_organization_id | activities | organization_id | btree | -- |
| idx_activities_owner_id | activities | owner_id | btree | -- |
| idx_activities_recurrence | activities | recurrence_type, recurrence_end_date | btree | WHERE recurrence_type NOT NULL |
| idx_boards_organization_id | boards | organization_id | btree | -- |
| idx_boards_owner_id | boards | owner_id | btree | -- |
| idx_boards_org_key_unique | boards | organization_id, key | UNIQUE | WHERE deleted_at IS NULL AND key NOT NULL |
| idx_board_stages_board_id | board_stages | board_id | btree | -- |
| idx_board_stages_organization_id | board_stages | organization_id | btree | -- |
| idx_deal_notes_deal_id | deal_notes | deal_id | btree | -- |
| idx_deal_notes_deal_created | deal_notes | deal_id, created_at DESC | btree | -- |
| idx_deal_notes_org_id | deal_notes | organization_id | btree | -- |
| idx_deal_files_deal_id | deal_files | deal_id | btree | -- |
| idx_deal_files_deal_created | deal_files | deal_id, created_at DESC | btree | -- |
| idx_deal_files_org_id | deal_files | organization_id | btree | -- |
| idx_deal_items_deal_id | deal_items | deal_id | btree | -- |
| idx_deal_items_organization_id | deal_items | organization_id | btree | -- |
| idx_products_organization_id | products | organization_id | btree | -- |
| idx_tags_organization_id | tags | organization_id | btree | -- |
| idx_custom_field_definitions_organization_id | custom_field_definitions | organization_id | btree | -- |
| idx_profiles_org_role | profiles | organization_id, role | btree | -- |
| idx_contact_phones_contact_id | contact_phones | contact_id | btree | -- |
| idx_contact_phones_org_id | contact_phones | organization_id | btree | -- |
| idx_contact_phones_number_org | contact_phones | organization_id, phone_number | btree | -- |
| idx_contact_phones_primary_unique | contact_phones | contact_id | UNIQUE | WHERE is_primary = true |
| idx_contact_prefs_contact_id | contact_preferences | contact_id | btree | -- |
| idx_contact_prefs_org_id | contact_preferences | organization_id | btree | -- |
| idx_contact_prefs_price_range | contact_preferences | organization_id, price_min, price_max | btree | WHERE price range NOT NULL |
| idx_notifications_org_unread | notifications | organization_id, is_read | btree | WHERE is_read = false |
| idx_notifications_owner_unread | notifications | owner_id, is_read, created_at DESC | btree | WHERE is_read = false |
| idx_lead_score_history_contact | lead_score_history | contact_id, created_at DESC | btree | -- |
| idx_lead_score_history_org | lead_score_history | organization_id | btree | -- |
| idx_rate_limits_lookup | rate_limits | identifier, endpoint, created_at DESC | btree | -- |

---

## 9. RLS Policies

### Modelo RBAC: admin > diretor > corretor

- **admin:** CRUD completo em toda a org
- **diretor:** Visualiza tudo na org, gerencia recursos proprios e compartilhados
- **corretor:** CRUD apenas nos proprios registros (owner_id = auth.uid())

### Helper Functions para RLS

| Funcao | Tipo | Proposito |
|--------|------|-----------|
| `is_admin_or_director(p_org_id)` | SECURITY INVOKER | Verifica se usuario e admin/diretor na org |
| `get_user_organization_id()` | SECURITY DEFINER | Retorna org_id do usuario (evita recursao RLS) |

### Resumo de Cobertura RLS

| Tabela | RLS Enabled | Padrao |
|--------|-------------|--------|
| organizations | YES | SELECT: membro. UPDATE: admin. No INSERT/DELETE |
| organization_settings | YES | SELECT: membro. Modify: admin |
| profiles | YES | SELECT: mesma org. UPDATE: self only |
| lifecycle_stages | YES | SELECT: all auth. Modify: admin |
| boards | YES | SELECT/INSERT: org. UPDATE/DELETE: owner/null/admin |
| board_stages | YES | SELECT: org. Modify: admin/diretor |
| contacts | YES | SELECT/UPDATE/DELETE: owner/null/admin. INSERT: org |
| deals | YES | SELECT/UPDATE/DELETE: owner/null/admin. INSERT: org |
| deal_items | YES | CRUD: org-scoped |
| deal_notes | YES | SELECT/INSERT: org. UPDATE/DELETE: creator/admin |
| deal_files | YES | SELECT/INSERT: org. UPDATE/DELETE: creator/admin |
| activities | YES | SELECT/UPDATE/DELETE: owner/null/admin. INSERT: org |
| products | YES | SELECT: org. Modify: admin/diretor |
| tags | YES | CRUD: org-scoped |
| custom_field_definitions | YES | SELECT: org. Modify: admin/diretor |
| leads | YES | SELECT/UPDATE: owner/admin. INSERT: owner/admin. DELETE: admin |
| user_settings | YES | CRUD: self only |
| quick_scripts | YES | SELECT: system + own. Modify: own non-system |
| ai_conversations | YES | CRUD own. Admin/diretor SELECT org |
| ai_decisions | YES | CRUD own. Admin/diretor SELECT org |
| ai_audio_notes | YES | CRUD own. Admin/diretor SELECT org |
| ai_suggestion_interactions | YES | Permissive (USING true) -- NOT ORG-SCOPED |
| ai_prompt_templates | YES | Admin CRUD. Members SELECT |
| ai_feature_flags | YES | Admin CRUD. Members SELECT |
| organization_invites | YES | Admin/diretor manage. Members SELECT |
| system_notifications | YES | SELECT/UPDATE/DELETE: org. No INSERT |
| rate_limits | YES | Permissive (USING true) |
| user_consents | YES | Own + admin org-scoped |
| audit_logs | YES | SELECT: admin. INSERT: own org. Append-only |
| security_alerts | YES | Admin only |
| api_keys | YES | Admin only |
| integration_inbound_sources | YES | Admin only |
| integration_outbound_endpoints | YES | Admin only |
| webhook_events_in | YES | Admin SELECT only |
| webhook_events_out | YES | Admin SELECT only |
| webhook_deliveries | YES | Admin SELECT only |
| contact_phones | YES | CRUD: org-scoped |
| contact_preferences | YES | CRUD: org-scoped |
| notifications | YES | SELECT/INSERT/UPDATE: org. No DELETE |
| lead_score_history | YES | SELECT/INSERT: org |

---

## 10. Functions

### Business Logic

| Funcao | Security | Retorno | Descricao |
|--------|----------|---------|-----------|
| `get_dashboard_stats(p_org_id)` | DEFINER | JSONB | Stats do dashboard (total contacts, deals, pipeline value) |
| `mark_deal_won(deal_id)` | INVOKER | VOID | Marca deal como ganho |
| `mark_deal_lost(deal_id, reason)` | INVOKER | VOID | Marca deal como perdido |
| `reopen_deal(deal_id)` | INVOKER | VOID | Reabre deal |
| `get_contact_stage_counts(p_org_id)` | INVOKER | TABLE | Contagem de contatos por estagio (exclui deleted) |
| `reassign_contact_with_deals(...)` | INVOKER | JSON | Reatribuicao cascata de contato + deals |
| `merge_contacts(winner, loser, ...)` | DEFINER | JSONB | Unifica dois contatos (deals, phones, prefs) |
| `increment_contact_ltv(id, amount)` | DEFINER | VOID | Incremento atomico de LTV |
| `decrement_contact_ltv(id, amount)` | DEFINER | VOID | Decremento atomico de LTV (floor 0) |
| `check_deal_duplicate()` | INVOKER | TRIGGER | Previne deal duplicado (contact + stage + open) |

### Infrastructure

| Funcao | Security | Retorno | Descricao |
|--------|----------|---------|-----------|
| `handle_new_user()` | DEFINER | TRIGGER | Cria profile + user_settings ao registrar |
| `handle_new_organization()` | DEFINER | TRIGGER | Cria organization_settings automaticamente |
| `handle_user_email_update()` | DEFINER | TRIGGER | Sincroniza email de auth.users para profiles |
| `is_instance_initialized()` | DEFINER | BOOLEAN | Verifica se org existe |
| `get_singleton_organization_id()` | DEFINER | UUID | Retorna primeira org ativa |
| `get_user_organization_id()` | DEFINER | UUID | Retorna org_id do usuario (RLS helper) |
| `is_admin_or_director(p_org_id)` | INVOKER | BOOLEAN | Verifica role (RLS helper) |
| `log_audit_event(...)` | INVOKER | UUID | Cria entrada no audit_logs |
| `cleanup_rate_limits(minutes)` | DEFINER | INTEGER | Remove rate limits antigos |
| `update_updated_at_column()` | -- | TRIGGER | Auto-update updated_at |
| `fn_capitalize_contact_name()` | -- | TRIGGER | INITCAP no nome do contato |
| `notify_deal_stage_changed()` | DEFINER | TRIGGER | Webhook outbound ao mudar stage |
| `cascade_soft_delete_deals()` | -- | TRIGGER | Cascade soft delete boards -> deals |
| `cascade_soft_delete_activities_by_contact()` | -- | TRIGGER | Cascade soft delete contacts -> activities |

### API Key Management

| Funcao | Security | Retorno | Descricao |
|--------|----------|---------|-----------|
| `create_api_key(name)` | DEFINER | TABLE | Cria chave API (admin only) |
| `revoke_api_key(id)` | DEFINER | VOID | Revoga chave API (admin only) |
| `validate_api_key(token)` | DEFINER | TABLE | Valida chave (anon + auth) |
| `_api_key_make_token()` | DEFINER | TEXT | Gera token base64url |
| `_api_key_sha256_hex(token)` | DEFINER | TEXT | Hash SHA-256 |

---

## 11. Triggers

| Trigger | Tabela | Evento | Funcao |
|---------|--------|--------|--------|
| on_auth_user_created | auth.users | AFTER INSERT | handle_new_user() |
| on_auth_user_email_updated | auth.users | AFTER UPDATE OF email | handle_user_email_update() |
| on_org_created | organizations | AFTER INSERT | handle_new_organization() |
| trg_notify_deal_stage_changed | deals | AFTER UPDATE OF stage_id | notify_deal_stage_changed() |
| check_deal_duplicate_trigger | deals | BEFORE INSERT OR UPDATE | check_deal_duplicate() |
| cascade_board_delete | boards | AFTER UPDATE OF deleted_at | cascade_soft_delete_deals() |
| cascade_contact_delete | contacts | AFTER UPDATE OF deleted_at | cascade_soft_delete_activities_by_contact() |
| update_deal_notes_updated_at | deal_notes | BEFORE UPDATE | update_updated_at_column() |
| update_quick_scripts_updated_at | quick_scripts | BEFORE UPDATE | update_updated_at_column() |
| update_contacts_updated_at | contacts | BEFORE UPDATE | update_updated_at_column() |
| update_deals_updated_at | deals | BEFORE UPDATE | update_updated_at_column() |
| update_contact_phones_updated_at | contact_phones | BEFORE UPDATE | update_updated_at_column() |
| update_contact_preferences_updated_at | contact_preferences | BEFORE UPDATE | update_updated_at_column() |
| trg_capitalize_contact_name | contacts | BEFORE INSERT OR UPDATE OF name | fn_capitalize_contact_name() |

---

## 12. Tipos Customizados e Enums

Nao ha tipos customizados (ENUMs PostgreSQL) definidos. Todos os "enums" sao implementados via CHECK constraints em colunas TEXT.

### CHECK Constraints como Enums

| Tabela.Coluna | Valores Permitidos |
|---------------|--------------------|
| profiles.role | 'admin', 'diretor', 'corretor' |
| organization_invites.role | 'admin', 'diretor', 'corretor' |
| contacts.contact_type | 'PF', 'PJ' |
| contacts.classification | 'COMPRADOR', 'VENDEDOR', 'LOCATARIO', 'LOCADOR', 'INVESTIDOR', 'PERMUTANTE' |
| contacts.temperature | 'HOT', 'WARM', 'COLD' |
| deals.deal_type | 'VENDA', 'LOCACAO', 'PERMUTA' |
| activities.recurrence_type | 'daily', 'weekly', 'monthly' |
| quick_scripts.category | 'followup', 'objection', 'closing', 'intro', 'rescue', 'other' |
| system_notifications.severity | 'high', 'medium', 'low' |
| audit_logs.severity | 'debug', 'info', 'warning', 'error', 'critical' |
| user_consents.consent_type | 'terms', 'privacy', 'marketing', 'analytics', 'data_processing', 'AI_CONSENT' |
| ai_suggestion_interactions.suggestion_type | 'UPSELL', 'STALLED', 'BIRTHDAY', 'RESCUE' |
| ai_suggestion_interactions.entity_type | 'deal', 'contact' |
| ai_suggestion_interactions.action | 'ACCEPTED', 'DISMISSED', 'SNOOZED' |
| notifications.type | 'BIRTHDAY', 'CHURN_ALERT', 'DEAL_STAGNANT', 'SCORE_DROP' |
| contact_phones.phone_type | 'CELULAR', 'COMERCIAL', 'RESIDENCIAL' |
| contact_preferences.purpose | 'MORADIA', 'INVESTIMENTO', 'VERANEIO' |
| contact_preferences.urgency | 'IMMEDIATE', '3_MONTHS', '6_MONTHS', '1_YEAR' |

---

## 13. Storage Buckets

| Bucket | Publico | Limite | Proposito |
|--------|---------|--------|-----------|
| avatars | true | -- | Fotos de perfil |
| audio-notes | false | -- | Audios de notas de IA |
| deal-files | false | 10MB | Arquivos anexados a deals |

### Storage RLS (deal-files)

- SELECT/INSERT/UPDATE: membros da org (via deals.organization_id extraido do path)
- DELETE: owner do deal ou admin/diretor

---

## 14. Realtime

Tabelas publicadas no `supabase_realtime`:

- deals
- activities
- contacts
- board_stages
- boards

**Nota:** `crm_companies` foi removida do realtime na migration 20260220100000.

---

## 15. Historico de Migrations

| # | Timestamp | Nome | Descricao |
|---|-----------|------|-----------|
| 1 | 20251201000000 | schema_init | Schema consolidado completo (26 tabelas, triggers, functions, RLS, storage, realtime) |
| 2 | 20260205000000 | add_performance_indexes | Indexes para deals, contacts, activities, board_stages |
| 3 | 20260220000000 | rbac_corretor_diretor | RBAC 3-tier: vendedor->corretor, add diretor |
| 4 | 20260220100000 | remove_companies_and_roles | Drop crm_companies, remove company_name/role columns |
| 5 | 20260220100001 | rls_protect_owner_id | Protejer owner_id contra mudanca por corretor |
| 6 | 20260220200000 | rpc_reassign_contact_with_deals | RPC cascata reatribuicao contato+deals |
| 7 | 20260223000000 | security_rls_critical | RLS restritiva em 9 tabelas criticas + helper is_admin_or_director |
| 8 | 20260223000001 | security_functions_fix | Migrar deal functions para INVOKER, fix role injection |
| 9 | 20260223000002 | security_qa_fixes | Fix cross-tenant leaks (consents, handle_new_user, stage_counts) |
| 10 | 20260223000003 | security_constraints | CHECK profiles.role, fix leads_insert policy |
| 11 | 20260223100000 | rls_remaining_tables | RLS restritiva para 12+ tabelas restantes |
| 12 | 20260223100001 | storage_policies | Storage policies restritivas para deal-files |
| 13 | 20260223200000 | fix_activities_rls | Fix activities com owner_id NULL |
| 14 | 20260223200001 | fix_activities_org_id | Backfill organization_id em activities |
| 15 | 20260223200002 | fix_null_owners_all_tables | Backfill NULL owner_id + fix policies |
| 16 | 20260224000000 | db012_check_constraints | CHECK constraints em deals, deal_items, contacts, profiles |
| 17 | 20260224000001 | db017_optimize_trigger | Otimizar trigger deal stage change |
| 18 | 20260224000002 | db025_composite_indexes | Indexes compostos deal_notes e deal_files |
| 19 | 20260224000003 | db026_check_deal_duplicate_invoker | check_deal_duplicate -> SECURITY INVOKER |
| 20 | 20260224000004 | db027_restrict_insert_organizations | Restringir INSERT em organizations |
| 21 | 20260224000005 | db014_consolidate_profiles_columns | Consolidar avatar->avatar_url, name->first_name |
| 22 | 20260224000006 | db015_fk_contacts_stage | FK contacts.stage -> lifecycle_stages.id |
| 23 | 20260224000007 | db019_document_deals_status | Documentar deals.status como DEPRECATED |
| 24 | 20260225000000 | coderabbit_pr5_fixes | Fix org_select, profiles_select, notify cross-tenant |
| 25 | 20260226000000 | add_recurrence_fields | Campos de recorrencia em activities |
| 26 | 20260226000001 | fix_rls_recursion | Fix recursao RLS com get_user_organization_id() |
| 27 | 20260226100000 | epic3_contacts_imob_fields | Campos imobiliarios em contacts (cpf, type, classification, temperature, address, profile_data) |
| 28 | 20260226100001 | epic3_contact_phones | Tabela contact_phones (multiplos telefones) |
| 29 | 20260226100002 | epic3_contact_preferences | Tabela contact_preferences (preferencias imobiliarias) |
| 30 | 20260226100003 | epic3_deals_imob_fields | Campos imobiliarios em deals (deal_type, expected_close, commission_rate) |
| 31 | 20260226100004 | epic3_profiles_commission | commission_rate em profiles |
| 32 | 20260226100005 | epic3_tech_debt_org_id | organization_id em deal_notes e deal_files + RLS |
| 33 | 20260226100006 | merge_contacts_rpc | RPC merge_contacts() |
| 34 | 20260226200000 | epic3_lead_score | lead_score em contacts |
| 35 | 20260226200001 | epic3_notifications | Tabela notifications |
| 36 | 20260226200002 | epic3_ltv_rpc | RPCs increment/decrement_contact_ltv |
| 37 | 20260227220048 | move_tags_custom_fields_to_contacts | Mover tags e custom_fields de deals para contacts |
| 38 | 20260227223316 | add_metadata_to_deals | Coluna metadata JSONB em deals |
| 39 | 20260228160135 | lead_score_history | Tabela lead_score_history |
| 40 | 20260228190051 | fix_stage_counts_exclude_deleted | Fix get_contact_stage_counts (excluir deleted) |
| 41 | 20260228200001 | lead_score_history_org_index | Index organization_id em lead_score_history |
| 42 | 20260301185436 | sync_deal_titles_with_contact_names | Sincronizar titulos de deals com nomes de contatos |
| 43 | 20260301200000 | auto_capitalize_contact_names | Trigger INITCAP para nomes de contatos |
| 44 | 20260303120000 | add_property_ref_to_deals | Coluna property_ref TEXT em deals |
