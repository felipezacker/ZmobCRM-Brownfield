# SCHEMA.md - Documentacao Completa do Banco de Dados

> **Projeto:** ZmobCRM (CRMIA)
> **Gerado em:** 2026-02-23
> **Fase:** Brownfield Discovery - Phase 2 (@data-engineer)
> **Banco:** Supabase (PostgreSQL)

---

## Sumario

- [Extensoes](#extensoes)
- [Tabelas](#tabelas)
- [Relacionamentos (Foreign Keys)](#relacionamentos)
- [Indices](#indices)
- [Views e Funcoes](#views-e-funcoes)
- [Triggers](#triggers)
- [Politicas RLS](#politicas-rls)
- [Storage Buckets](#storage-buckets)
- [Realtime](#realtime)
- [Grants](#grants)

---

## Extensoes

| Extensao | Schema | Proposito |
|----------|--------|-----------|
| `uuid-ossp` | extensions | Geracao de UUIDs |
| `pgcrypto` | extensions | Funcoes criptograficas (sha256, gen_random_bytes) |
| `unaccent` | public | Geracao de slugs sem acentos |
| `pg_net` | public | HTTP async para webhooks outbound |

---

## Tabelas

### 1. `organizations`
Organizacao (tenant). Single-tenant no momento.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL | - |
| `deleted_at` | TIMESTAMPTZ | - | NULL |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 2. `organization_settings`
Configuracoes globais de IA por organizacao.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `organization_id` | UUID | PK, FK -> organizations(id) ON DELETE CASCADE | - |
| `ai_provider` | TEXT | - | `'google'` |
| `ai_model` | TEXT | - | `'gemini-2.5-flash'` |
| `ai_google_key` | TEXT | - | - |
| `ai_openai_key` | TEXT | - | - |
| `ai_anthropic_key` | TEXT | - | - |
| `ai_enabled` | BOOLEAN | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | - | `now()` |
| `updated_at` | TIMESTAMPTZ | - | `now()` |

---

### 3. `profiles`
Usuarios do sistema (estende `auth.users`).

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK, FK -> auth.users(id) ON DELETE CASCADE | - |
| `email` | TEXT | - | - |
| `name` | TEXT | - | - |
| `avatar` | TEXT | - | - |
| `role` | TEXT | CHECK (role IN ('admin', 'diretor', 'corretor')) | `'corretor'` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |
| `first_name` | TEXT | - | - |
| `last_name` | TEXT | - | - |
| `nickname` | TEXT | - | - |
| `phone` | TEXT | - | - |
| `avatar_url` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 4. `lifecycle_stages`
Estagios do funil de vendas (dados globais/seed).

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | TEXT | PK | - |
| `name` | TEXT | NOT NULL | - |
| `color` | TEXT | NOT NULL | - |
| `order` | INTEGER | NOT NULL | - |
| `is_default` | BOOLEAN | - | `false` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |

**Seed data:** LEAD, MQL, PROSPECT, CUSTOMER, OTHER

---

### 5. `boards`
Quadros Kanban (pipelines de vendas).

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `key` | TEXT | UNIQUE (org, key) WHERE deleted_at IS NULL | - |
| `name` | TEXT | NOT NULL | - |
| `description` | TEXT | - | - |
| `type` | TEXT | - | `'SALES'` |
| `is_default` | BOOLEAN | - | `false` |
| `template` | TEXT | - | - |
| `linked_lifecycle_stage` | TEXT | - | - |
| `next_board_id` | UUID | FK -> boards(id) | - |
| `goal_description` | TEXT | - | - |
| `goal_kpi` | TEXT | - | - |
| `goal_target_value` | TEXT | - | - |
| `goal_type` | TEXT | - | - |
| `agent_name` | TEXT | - | - |
| `agent_role` | TEXT | - | - |
| `agent_behavior` | TEXT | - | - |
| `entry_trigger` | TEXT | - | - |
| `automation_suggestions` | TEXT[] | - | - |
| `position` | INTEGER | - | `0` |
| `default_product_id` | UUID | FK -> products(id) | - |
| `won_stage_id` | UUID | FK -> board_stages(id) | - |
| `lost_stage_id` | UUID | FK -> board_stages(id) | - |
| `won_stay_in_stage` | BOOLEAN | - | `FALSE` |
| `lost_stay_in_stage` | BOOLEAN | - | `FALSE` |
| `deleted_at` | TIMESTAMPTZ | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |
| `owner_id` | UUID | FK -> profiles(id) | - |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

---

### 6. `board_stages`
Colunas/estagios dos quadros Kanban.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `board_id` | UUID | FK -> boards(id) ON DELETE CASCADE | - |
| `name` | TEXT | NOT NULL | - |
| `label` | TEXT | - | - |
| `color` | TEXT | - | - |
| `order` | INTEGER | NOT NULL | - |
| `is_default` | BOOLEAN | - | `false` |
| `linked_lifecycle_stage` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

---

### 7. `contacts`
Contatos do CRM.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL | - |
| `email` | TEXT | - | - |
| `phone` | TEXT | - | - |
| `avatar` | TEXT | - | - |
| `notes` | TEXT | - | - |
| `status` | TEXT | - | `'ACTIVE'` |
| `stage` | TEXT | - | `'LEAD'` |
| `source` | TEXT | - | - |
| `birth_date` | DATE | - | - |
| `last_interaction` | TIMESTAMPTZ | - | - |
| `last_purchase_date` | DATE | - | - |
| `total_value` | NUMERIC | - | `0` |
| `deleted_at` | TIMESTAMPTZ | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |
| `owner_id` | UUID | FK -> profiles(id) | - |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

> **Nota:** Colunas `client_company_id`, `company_name` e `role` foram removidas pela migration `20260220100000`.

---

### 8. `products`
Catalogo de produtos/servicos.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL | - |
| `description` | TEXT | - | - |
| `price` | NUMERIC | NOT NULL | `0` |
| `sku` | TEXT | - | - |
| `active` | BOOLEAN | - | `true` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |
| `owner_id` | UUID | FK -> profiles(id) | - |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

---

### 9. `deals`
Negocios/oportunidades.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `title` | TEXT | NOT NULL | - |
| `value` | NUMERIC | - | `0` |
| `probability` | INTEGER | - | `0` |
| `status` | TEXT | - | - |
| `priority` | TEXT | - | `'medium'` |
| `board_id` | UUID | FK -> boards(id) | - |
| `stage_id` | UUID | FK -> board_stages(id) | - |
| `contact_id` | UUID | FK -> contacts(id) | - |
| `ai_summary` | TEXT | - | - |
| `loss_reason` | TEXT | - | - |
| `tags` | TEXT[] | - | `'{}'` |
| `last_stage_change_date` | TIMESTAMPTZ | - | - |
| `custom_fields` | JSONB | - | `'{}'` |
| `is_won` | BOOLEAN | NOT NULL | `FALSE` |
| `is_lost` | BOOLEAN | NOT NULL | `FALSE` |
| `closed_at` | TIMESTAMPTZ | - | - |
| `deleted_at` | TIMESTAMPTZ | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |
| `owner_id` | UUID | FK -> profiles(id) | - |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |

> **Nota:** Coluna `client_company_id` removida pela migration `20260220100000`.

---

### 10. `deal_items`
Produtos vinculados a deals.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `deal_id` | UUID | FK -> deals(id) ON DELETE CASCADE | - |
| `product_id` | UUID | FK -> products(id) | - |
| `name` | TEXT | NOT NULL | - |
| `quantity` | INTEGER | NOT NULL | `1` |
| `price` | NUMERIC | NOT NULL | `0` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

---

### 11. `activities`
Atividades: tarefas, ligacoes, reunioes.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `title` | TEXT | NOT NULL | - |
| `description` | TEXT | - | - |
| `type` | TEXT | NOT NULL | - |
| `date` | TIMESTAMPTZ | NOT NULL | - |
| `completed` | BOOLEAN | - | `false` |
| `deal_id` | UUID | FK -> deals(id) ON DELETE CASCADE | - |
| `contact_id` | UUID | FK -> contacts(id) ON DELETE SET NULL | - |
| `participant_contact_ids` | UUID[] | - | - |
| `deleted_at` | TIMESTAMPTZ | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `owner_id` | UUID | FK -> profiles(id) | - |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

> **Nota:** Coluna `client_company_id` removida pela migration `20260220100000`.

---

### 12. `tags`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL, UNIQUE(name, organization_id) | - |
| `color` | TEXT | - | `'bg-gray-500'` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

---

### 13. `custom_field_definitions`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `key` | TEXT | NOT NULL, UNIQUE(key, organization_id) | - |
| `label` | TEXT | NOT NULL | - |
| `type` | TEXT | NOT NULL | - |
| `options` | TEXT[] | - | - |
| `entity_type` | TEXT | NOT NULL | `'deal'` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

---

### 14. `leads`
Importacao de leads.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL | - |
| `email` | TEXT | - | - |
| `source` | TEXT | - | - |
| `status` | TEXT | - | `'NEW'` |
| `notes` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `converted_to_contact_id` | UUID | FK -> contacts(id) | - |
| `owner_id` | UUID | FK -> profiles(id) | - |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |

> **Nota:** Colunas `company_name` e `role` removidas pela migration `20260220100000`.

---

### 15. `user_settings`
Configuracoes por usuario.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | FK -> profiles(id) ON DELETE CASCADE, UNIQUE | - |
| `ai_provider` | TEXT | - | `'google'` |
| `ai_api_key` | TEXT | - (legado) | - |
| `ai_model` | TEXT | - | `'gemini-2.5-flash'` |
| `ai_thinking` | BOOLEAN | - | `true` |
| `ai_search` | BOOLEAN | - | `true` |
| `ai_anthropic_caching` | BOOLEAN | - | `false` |
| `ai_google_key` | TEXT | - | NULL |
| `ai_openai_key` | TEXT | - | NULL |
| `ai_anthropic_key` | TEXT | - | NULL |
| `dark_mode` | BOOLEAN | - | `true` |
| `default_route` | TEXT | - | `'/boards'` |
| `active_board_id` | UUID | FK -> boards(id) | - |
| `inbox_view_mode` | TEXT | - | `'list'` |
| `onboarding_completed` | BOOLEAN | - | `false` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 16. `ai_conversations`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | FK -> profiles(id) ON DELETE CASCADE | - |
| `conversation_key` | TEXT | NOT NULL, UNIQUE(user_id, conversation_key) | - |
| `messages` | JSONB | - | `'[]'` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 17. `ai_decisions`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | FK -> profiles(id) ON DELETE CASCADE | - |
| `deal_id` | UUID | FK -> deals(id) ON DELETE CASCADE | - |
| `contact_id` | UUID | FK -> contacts(id) ON DELETE SET NULL | - |
| `decision_type` | TEXT | NOT NULL | - |
| `priority` | TEXT | - | `'medium'` |
| `title` | TEXT | NOT NULL | - |
| `description` | TEXT | - | - |
| `suggested_action` | JSONB | - | - |
| `status` | TEXT | - | `'pending'` |
| `snoozed_until` | TIMESTAMPTZ | - | - |
| `processed_at` | TIMESTAMPTZ | - | - |
| `ai_reasoning` | TEXT | - | - |
| `confidence_score` | NUMERIC(3,2) | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 18. `ai_audio_notes`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | FK -> profiles(id) ON DELETE CASCADE | - |
| `deal_id` | UUID | FK -> deals(id) ON DELETE CASCADE | - |
| `contact_id` | UUID | FK -> contacts(id) ON DELETE SET NULL | - |
| `audio_url` | TEXT | - | - |
| `duration_seconds` | INTEGER | - | - |
| `transcription` | TEXT | NOT NULL | - |
| `sentiment` | TEXT | - | - |
| `next_action` | JSONB | - | - |
| `activity_created_id` | UUID | FK -> activities(id) | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 19. `organization_invites`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |
| `email` | TEXT | - | - |
| `role` | TEXT | NOT NULL, CHECK (role IN ('admin', 'diretor', 'corretor')) | `'corretor'` |
| `token` | UUID | NOT NULL | `gen_random_uuid()` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `expires_at` | TIMESTAMPTZ | - | - |
| `used_at` | TIMESTAMPTZ | - | - |
| `created_by` | UUID | FK -> profiles(id) | - |

---

### 20. `system_notifications`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |
| `type` | TEXT | NOT NULL | - |
| `title` | TEXT | NOT NULL | - |
| `message` | TEXT | NOT NULL | - |
| `link` | TEXT | - | - |
| `severity` | TEXT | CHECK (IN ('high', 'medium', 'low')) | `'medium'` |
| `read_at` | TIMESTAMPTZ | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 21. `ai_suggestion_interactions`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE | - |
| `suggestion_type` | TEXT | NOT NULL, CHECK (IN ('UPSELL', 'STALLED', 'BIRTHDAY', 'RESCUE')) | - |
| `entity_type` | TEXT | NOT NULL, CHECK (IN ('deal', 'contact')) | - |
| `entity_id` | UUID | NOT NULL | - |
| `action` | TEXT | NOT NULL, CHECK (IN ('ACCEPTED', 'DISMISSED', 'SNOOZED')) | - |
| `snoozed_until` | TIMESTAMPTZ | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |

**Unique:** (user_id, suggestion_type, entity_id)

---

### 22. `ai_prompt_templates`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `key` | TEXT | NOT NULL | - |
| `version` | INTEGER | NOT NULL | `1` |
| `content` | TEXT | NOT NULL | - |
| `is_active` | BOOLEAN | NOT NULL | `true` |
| `created_by` | UUID | FK -> profiles(id) ON DELETE SET NULL | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

**Unique:** (organization_id, key, version), (organization_id, key) WHERE is_active

---

### 23. `ai_feature_flags`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `key` | TEXT | NOT NULL | - |
| `enabled` | BOOLEAN | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

**Unique:** (organization_id, key)

---

### 24. `rate_limits`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `identifier` | TEXT | NOT NULL | - |
| `endpoint` | TEXT | NOT NULL | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

---

### 25. `user_consents` (LGPD)

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE | - |
| `consent_type` | TEXT | NOT NULL, CHECK (IN ('terms', 'privacy', 'marketing', 'analytics', 'data_processing', 'AI_CONSENT')) | - |
| `version` | TEXT | NOT NULL | - |
| `consented_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `ip_address` | TEXT | - | - |
| `user_agent` | TEXT | - | - |
| `revoked_at` | TIMESTAMPTZ | - | - |

---

### 26. `audit_logs`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | FK -> auth.users(id) ON DELETE SET NULL | - |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE SET NULL | - |
| `action` | TEXT | NOT NULL | - |
| `resource_type` | TEXT | NOT NULL | - |
| `resource_id` | UUID | - | - |
| `details` | JSONB | - | `'{}'` |
| `ip_address` | TEXT | - | - |
| `user_agent` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `severity` | TEXT | NOT NULL, CHECK (IN ('debug', 'info', 'warning', 'error', 'critical')) | `'info'` |

---

### 27. `security_alerts`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | FK -> organizations(id) ON DELETE CASCADE | - |
| `alert_type` | VARCHAR(50) | NOT NULL | - |
| `severity` | VARCHAR(20) | NOT NULL | `'warning'` |
| `title` | VARCHAR(255) | NOT NULL | - |
| `description` | TEXT | - | - |
| `details` | JSONB | - | - |
| `user_id` | UUID | FK -> auth.users(id) ON DELETE SET NULL | - |
| `acknowledged_at` | TIMESTAMPTZ | - | - |
| `acknowledged_by` | UUID | FK -> auth.users(id) ON DELETE SET NULL | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 28. `deal_notes`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `deal_id` | UUID | NOT NULL, FK -> deals(id) ON DELETE CASCADE | - |
| `content` | TEXT | NOT NULL | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |
| `created_by` | UUID | FK -> profiles(id) ON DELETE SET NULL | - |

---

### 29. `deal_files`

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `deal_id` | UUID | NOT NULL, FK -> deals(id) ON DELETE CASCADE | - |
| `file_name` | TEXT | NOT NULL | - |
| `file_path` | TEXT | NOT NULL | - |
| `file_size` | INTEGER | - | - |
| `mime_type` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `created_by` | UUID | FK -> profiles(id) ON DELETE SET NULL | - |

---

### 30. `quick_scripts`
Templates de scripts de vendas.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `title` | TEXT | NOT NULL | - |
| `category` | TEXT | NOT NULL, CHECK (IN ('followup', 'objection', 'closing', 'intro', 'rescue', 'other')) | - |
| `template` | TEXT | NOT NULL | - |
| `icon` | TEXT | - | `'MessageSquare'` |
| `is_system` | BOOLEAN | - | `false` |
| `user_id` | UUID | FK -> profiles(id) ON DELETE CASCADE | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 31. `api_keys`
Chaves de API publica para integracoes.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `name` | TEXT | NOT NULL | - |
| `key_prefix` | TEXT | NOT NULL | - |
| `key_hash` | TEXT | NOT NULL | - |
| `created_by` | UUID | FK -> profiles(id) ON DELETE SET NULL | - |
| `revoked_at` | TIMESTAMPTZ | - | - |
| `last_used_at` | TIMESTAMPTZ | - | - |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 32. `integration_inbound_sources`
Configuracao de fontes inbound de leads.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `name` | TEXT | NOT NULL | `'Entrada de Leads'` |
| `entry_board_id` | UUID | NOT NULL, FK -> boards(id) | - |
| `entry_stage_id` | UUID | NOT NULL, FK -> board_stages(id) | - |
| `secret` | TEXT | NOT NULL | - |
| `active` | BOOLEAN | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 33. `integration_outbound_endpoints`
Endpoints de webhooks de saida.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `name` | TEXT | NOT NULL | `'Follow-up (Webhook)'` |
| `url` | TEXT | NOT NULL | - |
| `secret` | TEXT | NOT NULL | - |
| `events` | TEXT[] | NOT NULL | `ARRAY['deal.stage_changed']` |
| `active` | BOOLEAN | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | - | `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | `NOW()` |

---

### 34. `webhook_events_in`
Auditoria de eventos inbound.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `source_id` | UUID | NOT NULL, FK -> integration_inbound_sources(id) ON DELETE CASCADE | - |
| `provider` | TEXT | NOT NULL | `'generic'` |
| `external_event_id` | TEXT | - | - |
| `payload` | JSONB | NOT NULL | `'{}'` |
| `status` | TEXT | NOT NULL | `'received'` |
| `error` | TEXT | - | - |
| `created_contact_id` | UUID | FK -> contacts(id) ON DELETE SET NULL | - |
| `created_deal_id` | UUID | FK -> deals(id) ON DELETE SET NULL | - |
| `received_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

**Unique:** (source_id, external_event_id) WHERE external_event_id IS NOT NULL

---

### 35. `webhook_events_out`
Auditoria de eventos outbound.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `event_type` | TEXT | NOT NULL | - |
| `payload` | JSONB | NOT NULL | `'{}'` |
| `deal_id` | UUID | FK -> deals(id) ON DELETE SET NULL | - |
| `from_stage_id` | UUID | FK -> board_stages(id) ON DELETE SET NULL | - |
| `to_stage_id` | UUID | FK -> board_stages(id) ON DELETE SET NULL | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |

---

### 36. `webhook_deliveries`
Registros de entrega de webhooks.

| Coluna | Tipo | Constraints | Default |
|--------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `organization_id` | UUID | NOT NULL, FK -> organizations(id) ON DELETE CASCADE | - |
| `endpoint_id` | UUID | NOT NULL, FK -> integration_outbound_endpoints(id) ON DELETE CASCADE | - |
| `event_id` | UUID | NOT NULL, FK -> webhook_events_out(id) ON DELETE CASCADE | - |
| `request_id` | BIGINT | - | - |
| `status` | TEXT | NOT NULL | `'queued'` |
| `attempted_at` | TIMESTAMPTZ | NOT NULL | `NOW()` |
| `response_status` | INT | - | - |
| `error` | TEXT | - | - |

---

## Tabela Removida

### ~~`crm_companies`~~ (REMOVIDA)
Removida pela migration `20260220100000_remove_companies_and_roles.sql`. Todas as FKs e indices relacionados foram dropados.

---

## Relacionamentos

```
auth.users(id) <-- profiles(id) [1:1]
organizations(id) <-- profiles(organization_id) [1:N]
organizations(id) <-- organization_settings(organization_id) [1:1]
organizations(id) <-- boards(organization_id) [1:N]
organizations(id) <-- contacts(organization_id) [1:N]
organizations(id) <-- deals(organization_id) [1:N]
organizations(id) <-- api_keys(organization_id) [1:N]
organizations(id) <-- integration_inbound_sources(organization_id) [1:N]
organizations(id) <-- integration_outbound_endpoints(organization_id) [1:N]

profiles(id) <-- boards(owner_id) [1:N]
profiles(id) <-- contacts(owner_id) [1:N]
profiles(id) <-- deals(owner_id) [1:N]
profiles(id) <-- activities(owner_id) [1:N]
profiles(id) <-- user_settings(user_id) [1:1]

boards(id) <-- board_stages(board_id) [1:N]
boards(id) <-- deals(board_id) [1:N]
board_stages(id) <-- deals(stage_id) [1:N]

contacts(id) <-- deals(contact_id) [1:N]
deals(id) <-- deal_items(deal_id) [1:N]
deals(id) <-- deal_notes(deal_id) [1:N]
deals(id) <-- deal_files(deal_id) [1:N]
deals(id) <-- activities(deal_id) [1:N]
deals(id) <-- ai_decisions(deal_id) [1:N]
deals(id) <-- ai_audio_notes(deal_id) [1:N]

products(id) <-- deal_items(product_id) [1:N]
products(id) <-- boards(default_product_id) [1:N]
```

---

## Indices

### Deals
| Indice | Colunas | Condicao |
|--------|---------|----------|
| `idx_deals_board_id` | board_id | - |
| `idx_deals_stage_id` | stage_id | - |
| `idx_deals_contact_id` | contact_id | - |
| `idx_deals_board_stage_created` | board_id, stage_id, created_at DESC | - |
| `idx_deals_open` | board_id, stage_id | WHERE is_won=false AND is_lost=false |

### Deal Items
| `idx_deal_items_deal_id` | deal_id | - |

### Contacts
| Indice | Colunas |
|--------|---------|
| `idx_contacts_stage` | stage |
| `idx_contacts_status` | status |
| `idx_contacts_created_at` | created_at DESC |

### Activities
| Indice | Colunas |
|--------|---------|
| `idx_activities_date` | date DESC |
| `idx_activities_deal_id` | deal_id |
| `idx_activities_contact_id` | contact_id |
| `idx_activities_client_company_id` | client_company_id (REMOVIDO pela migration) |
| `idx_activities_participant_contact_ids` | participant_contact_ids (GIN) |

### Board Stages
| `idx_board_stages_board_id` | board_id |

### Boards
| `idx_boards_org_key_unique` | organization_id, key (UNIQUE, WHERE deleted_at IS NULL AND key IS NOT NULL) |
| `boards_default_product_id_idx` | default_product_id |

### Deal Notes / Deal Files
| `idx_deal_notes_deal` | deal_id |
| `idx_deal_notes_created` | created_at DESC |
| `idx_deal_files_deal` | deal_id |

### Quick Scripts
| `idx_quick_scripts_user` | user_id |
| `idx_quick_scripts_category` | category |

### AI
| `idx_ai_suggestion_user` | user_id |
| `idx_ai_suggestion_entity` | entity_type, entity_id |
| `idx_ai_prompt_templates_org_key` | organization_id, key |
| `idx_ai_prompt_templates_org_key_active` | organization_id, key, is_active |
| `idx_ai_feature_flags_org` | organization_id |

### API Keys
| `idx_api_keys_org` | organization_id |
| `idx_api_keys_org_active` | organization_id WHERE revoked_at IS NULL |

### Rate Limits
| `idx_rate_limits_lookup` | identifier, endpoint, created_at DESC |

### Webhook
| `webhook_events_in_dedupe` | source_id, external_event_id (UNIQUE, WHERE external_event_id IS NOT NULL) |

---

## Views e Funcoes

### Funcoes Utilitarias

| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| `is_instance_initialized()` | BOOLEAN | Verifica se existe ao menos 1 organizacao |
| `get_singleton_organization_id()` | UUID | Retorna o ID da unica org ativa |
| `get_dashboard_stats(p_organization_id UUID)` | JSONB | Estatisticas do dashboard (atualizada para receber org_id) |
| `get_contact_stage_counts()` | TABLE(stage, count) | Contagem de contatos por estagio |

### Funcoes de Deal

| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| `mark_deal_won(deal_id)` | VOID | Marca deal como ganho |
| `mark_deal_lost(deal_id, reason)` | VOID | Marca deal como perdido |
| `reopen_deal(deal_id)` | VOID | Reabre deal fechado |

### Funcoes de Auditoria

| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| `log_audit_event(action, resource_type, resource_id, details, severity)` | UUID | Registra evento de auditoria |
| `cleanup_rate_limits(older_than_minutes)` | INTEGER | Limpa registros antigos de rate limit |

### Funcoes de API Key

| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| `_api_key_make_token()` | TEXT | Gera token (prefixo `ncrm_`) |
| `_api_key_sha256_hex(token)` | TEXT | Hash SHA256 do token |
| `create_api_key(p_name)` | TABLE(api_key_id, token, key_prefix, organization_id) | Cria nova API key (admin) |
| `revoke_api_key(p_api_key_id)` | VOID | Revoga API key (admin) |
| `validate_api_key(p_token)` | TABLE(api_key_id, api_key_prefix, organization_id, organization_name) | Valida token |

### Funcoes de Reatribuicao

| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| `reassign_contact_with_deals(...)` | JSON | Reatribui contato e opcionalmente seus deals ativos (SECURITY INVOKER) |

### Funcoes de Webhook

| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| `notify_deal_stage_changed()` | TRIGGER | Dispara webhooks outbound quando deal muda de estagio |

### Funcoes Auxiliares

| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| `update_updated_at_column()` | TRIGGER | Auto-atualiza campo updated_at |

---

## Triggers

| Trigger | Tabela | Evento | Funcao |
|---------|--------|--------|--------|
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` |
| `on_auth_user_email_updated` | auth.users | AFTER UPDATE OF email | `handle_user_email_update()` |
| `on_org_created` | organizations | AFTER INSERT | `handle_new_organization()` |
| `cascade_board_delete` | boards | AFTER UPDATE OF deleted_at | `cascade_soft_delete_deals()` |
| `cascade_contact_delete` | contacts | AFTER UPDATE OF deleted_at | `cascade_soft_delete_activities_by_contact()` |
| `check_deal_duplicate_trigger` | deals | BEFORE INSERT OR UPDATE | `check_deal_duplicate()` |
| `trg_notify_deal_stage_changed` | deals | AFTER UPDATE | `notify_deal_stage_changed()` |
| `update_deal_notes_updated_at` | deal_notes | BEFORE UPDATE | `update_updated_at_column()` |
| `update_quick_scripts_updated_at` | quick_scripts | BEFORE UPDATE | `update_updated_at_column()` |

---

## Politicas RLS

### Tabelas com RBAC Adequado (admin/diretor/corretor)

| Tabela | Politica | Operacao | Regra |
|--------|----------|----------|-------|
| **deals** | Users can view deals | SELECT | owner_id = auth.uid() OR admin/diretor na org |
| **deals** | Users can insert deals | INSERT | membro da org |
| **deals** | Users can update own deals... | UPDATE | owner_id = auth.uid() (corretor nao muda owner_id) OR admin/diretor |
| **deals** | Only admins can delete deals | DELETE | admin na org |
| **contacts** | Users can view contacts | SELECT | owner_id = auth.uid() OR admin/diretor na org |
| **contacts** | Users can insert contacts | INSERT | membro da org |
| **contacts** | Users can update own contacts... | UPDATE | owner_id = auth.uid() (corretor nao muda owner_id) OR admin/diretor |
| **contacts** | Only admins can delete contacts | DELETE | admin na org |
| **organization_invites** | Admins and directors can manage | ALL | admin/diretor na org |
| **organization_invites** | Members can view | SELECT | membro da org |
| **organization_settings** | Admins can manage | ALL | admin na org |
| **organization_settings** | Members can view | SELECT | membro da org |
| **api_keys** | Admins can manage | ALL | admin na org |
| **ai_prompt_templates** | Admins can manage | ALL | admin na org |
| **ai_prompt_templates** | Members can view | SELECT | membro da org |
| **ai_feature_flags** | Admins can manage | ALL | admin na org |
| **ai_feature_flags** | Members can view | SELECT | membro da org |
| **integration_inbound_sources** | Admins can manage | ALL | admin na org |
| **integration_outbound_endpoints** | Admins can manage | ALL | admin na org |
| **webhook_events_in** | Admins can view | SELECT | admin na org |
| **webhook_events_out** | Admins can view | SELECT | admin na org |
| **webhook_deliveries** | Admins can view | SELECT | admin na org |

### Tabelas com Politicas Corretas por Usuario

| Tabela | Politica | Regra |
|--------|----------|-------|
| **profiles** | profiles_select | SELECT: qualquer autenticado |
| **profiles** | profiles_update | UPDATE: apenas proprio (id = auth.uid()) |
| **user_settings** | user_settings_isolate | ALL: apenas proprio (user_id = auth.uid()) |
| **quick_scripts** | select/insert/update/delete | SELECT: sistema + proprios; INSERT/UPDATE/DELETE: apenas proprios, nao sistema |

### Tabelas com Politicas PERMISSIVAS (`USING (true)`) -- RISCO ALTO

| Tabela | Politica |
|--------|----------|
| **boards** | 4 policies (SELECT/INSERT/UPDATE/DELETE) USING (true) |
| **board_stages** | 4 policies (SELECT/INSERT/UPDATE/DELETE) USING (true) |
| **lifecycle_stages** | FOR ALL USING (true) |
| **products** | FOR ALL USING (true) |
| **deal_items** | FOR ALL USING (true) |
| **activities** | FOR ALL USING (true) |
| **tags** | FOR ALL USING (true) |
| **custom_field_definitions** | FOR ALL USING (true) |
| **leads** | FOR ALL USING (true) |
| **ai_conversations** | FOR ALL USING (true) |
| **ai_decisions** | FOR ALL USING (true) |
| **ai_audio_notes** | FOR ALL USING (true) |
| **ai_suggestion_interactions** | FOR ALL USING (true) |
| **system_notifications** | FOR ALL USING (true) |
| **rate_limits** | FOR ALL USING (true) |
| **user_consents** | FOR ALL USING (true) |
| **audit_logs** | FOR ALL USING (true) |
| **security_alerts** | FOR ALL USING (true) |
| **deal_notes** | FOR ALL USING (true) |
| **deal_files** | FOR ALL USING (true) |

### Politica Especial

| Tabela | Politica |
|--------|----------|
| **organizations** | FOR ALL USING (deleted_at IS NULL) WITH CHECK (true) |

---

## Storage Buckets

| Bucket | Publico | Limite |
|--------|---------|--------|
| `avatars` | Sim | - |
| `audio-notes` | Nao | - |
| `deal-files` | Nao | 10MB |

### Storage Policies
- **avatars:** upload (authenticated), select (public), update/delete (authenticated)
- **deal-files:** upload/select/delete (authenticated)

---

## Realtime

Tabelas publicadas no `supabase_realtime`:
- `deals`
- `activities`
- `contacts`
- `board_stages`
- `boards`

> **Nota:** `crm_companies` foi removida da publicacao pela migration `20260220100000`.

---

## Grants

| Funcao | Roles |
|--------|-------|
| `is_instance_initialized` | anon, authenticated |
| `get_dashboard_stats` | authenticated |
| `mark_deal_won` | authenticated |
| `mark_deal_lost` | authenticated |
| `reopen_deal` | authenticated |
| `log_audit_event` | authenticated |
| `get_contact_stage_counts` | authenticated |
| `create_api_key` | authenticated (REVOKED from PUBLIC) |
| `revoke_api_key` | authenticated (REVOKED from PUBLIC) |
| `validate_api_key` | anon, authenticated (REVOKED from PUBLIC) |

---

## Historico de Migrations

| Migration | Data | Descricao |
|-----------|------|-----------|
| `20251201000000_schema_init.sql` | 2025-12-01 | Schema consolidado inicial |
| `20260205000000_add_performance_indexes.sql` | 2026-02-05 | Indices de performance |
| `20260220000000_rbac_corretor_diretor.sql` | 2026-02-20 | RBAC 3 niveis (admin/diretor/corretor) |
| `20260220100000_remove_companies_and_roles.sql` | 2026-02-20 | Remocao de crm_companies e colunas role/company_name |
| `20260220100001_rls_protect_owner_id.sql` | 2026-02-20 | Protecao de owner_id contra alteracao por corretor |
| `20260220200000_rpc_reassign_contact_with_deals.sql` | 2026-02-20 | RPC de reatribuicao em cascata |
