# DB-AUDIT.md - Auditoria do Banco de Dados

> **Projeto:** ZmobCRM (CRM Imobiliario)
> **Gerado em:** 2026-03-03
> **Fase:** Brownfield Discovery - Phase 2 (@data-engineer / DB Sage)
> **Base:** 42 migration files analisados (20251201 a 20260303)
> **Referencia:** SCHEMA.md (gerado em paralelo)

---

## Sumario Executivo

| Categoria | CRITICAL | HIGH | MEDIUM | LOW | Total |
|-----------|----------|------|--------|-----|-------|
| Seguranca | 1 | 2 | 3 | 1 | 7 |
| Performance | 0 | 1 | 3 | 2 | 6 |
| Integridade de Dados | 1 | 2 | 3 | 1 | 7 |
| Design do Schema | 0 | 1 | 4 | 3 | 8 |
| Migrations | 1 | 1 | 1 | 0 | 3 |
| **Total** | **3** | **7** | **14** | **7** | **31** |

---

## 1. Auditoria de Seguranca

### 1.1 Cobertura RLS

**Status Geral: 95% adequada. 100% das tabelas tem RLS ENABLED.**

Todas as 36 tabelas ativas possuem `ENABLE ROW LEVEL SECURITY`. A grande maioria foi migrada de policies permissivas (`USING(true)`) para policies restritivas org-scoped entre as migrations 20260220-20260226. O trabalho de hardening foi significativo e bem executado.

#### Tabelas com RLS Residual Permissiva

| ID | Tabela | Problema | Severidade |
|----|--------|----------|------------|
| SEC-01 | `ai_suggestion_interactions` | RLS permissiva original (`USING(true)`) nunca foi restringida. Qualquer usuario autenticado pode ver/modificar interacoes de todos os usuarios. | **HIGH** |
| SEC-02 | `rate_limits` | RLS permissiva (`USING(true)`). Qualquer usuario pode ver todos os rate limits. Risco baixo pois nao contem dados sensiveis, mas permite information disclosure. | **LOW** |

**Recomendacao SEC-01:** Criar policies restritivas para `ai_suggestion_interactions` baseadas em `user_id = auth.uid()`.

**Recomendacao SEC-02:** Remover policy permissiva de `rate_limits`. Se necessario, adicionar SELECT/INSERT para `authenticated` com restricao por `identifier = auth.uid()::text`.

---

### 1.2 Qualidade das Policies

#### SEC-03: notify_deal_stage_changed() referencia tabelas inexistentes [CRITICAL]

A migration `20260225000000_coderabbit_pr5_fixes.sql` reescreveu a funcao `notify_deal_stage_changed()` usando nomes de tabelas que NAO existem no schema:

- `integration_webhook_events` (correto: `webhook_events_out`)
- `integration_webhook_deliveries` (correto: `webhook_deliveries`)

**Impacto:** Toda vez que um deal muda de stage, o trigger falha silenciosamente (ou lanca erro), impedindo webhooks outbound de funcionar. O erro e capturado pelo `EXCEPTION WHEN OTHERS`, entao o deal update em si nao falha, mas nenhum webhook e disparado.

**Severidade: CRITICAL**

**Correcao:** Reescrever a funcao usando os nomes corretos de tabela (`webhook_events_out`, `webhook_deliveries`) e campos correspondentes.

---

#### SEC-04: merge_contacts() como SECURITY DEFINER sem validacao de org [HIGH]

A funcao `merge_contacts()` usa `SECURITY DEFINER`, o que significa que bypassa RLS completamente. Ela nao valida se o usuario chamador pertence a mesma organizacao dos contatos sendo merged. Qualquer usuario autenticado poderia potencialmente fazer merge de contatos de outra organizacao.

**Impacto:** Cross-tenant data manipulation.

**Correcao:** Adicionar validacao de que ambos os contatos pertencem a org do usuario chamador, ou migrar para `SECURITY INVOKER` com RLS.

---

#### SEC-05: increment/decrement_contact_ltv() como SECURITY DEFINER sem validacao [MEDIUM]

Ambas funcoes `increment_contact_ltv()` e `decrement_contact_ltv()` usam `SECURITY DEFINER` sem validar se o contato pertence a organizacao do usuario. Qualquer usuario autenticado pode manipular o `total_value` de qualquer contato.

**Impacto:** Cross-tenant data manipulation do campo LTV.

**Correcao:** Adicionar validacao de org ou migrar para `SECURITY INVOKER`.

---

#### SEC-06: contact_phones e contact_preferences RLS nao usa get_user_organization_id() [MEDIUM]

As tabelas `contact_phones` e `contact_preferences` usam subquery direta em `profiles` para obter `organization_id`:
```sql
organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
```

Isso pode causar recursao RLS se a policy de `profiles` for modificada. A funcao `get_user_organization_id()` (SECURITY DEFINER) foi criada especificamente para evitar esse problema.

**Impacto:** Potencial recursao RLS (42P17) se profiles_select mudar.

**Correcao:** Atualizar policies de `contact_phones`, `contact_preferences`, `notifications`, `lead_score_history` e outras tabelas que ainda usam subquery direta para usar `get_user_organization_id()`.

---

#### SEC-07: notifications sem DELETE policy [MEDIUM]

A tabela `notifications` tem policies para SELECT, INSERT e UPDATE, mas nao para DELETE. Isso significa que notificacoes nunca podem ser deletadas por usuarios autenticados (apenas service_role). Se intencional, esta correto; se nao, e um gap funcional.

**Impacto:** Acumulo indefinido de notificacoes, sem possibilidade de cleanup pelo usuario.

---

### 1.3 Dados Sensiveis

| ID | Tabela.Coluna | Risco | Mitigacao Atual | Status |
|----|---------------|-------|-----------------|--------|
| SEC-08 | organization_settings.ai_*_key | API keys de IA em texto claro | RLS admin-only | Aceitavel para MVP |
| SEC-09 | user_settings.ai_*_key | API keys de IA por usuario em texto claro | RLS user-only | Aceitavel para MVP |
| SEC-10 | integration_inbound_sources.secret | Webhook secret em texto claro | RLS admin-only | Deveria usar pgcrypto |
| SEC-11 | integration_outbound_endpoints.secret | Webhook secret em texto claro | RLS admin-only | Deveria usar pgcrypto |
| SEC-12 | api_keys.key_hash | Armazenado como SHA-256 hex | Correto | OK |
| SEC-13 | user_consents.ip_address | IP do usuario (LGPD) | RLS user/admin scoped | OK |

**Recomendacao:** Em uma evolucao futura, considerar usar Supabase Vault para chaves de API ao inves de texto claro nas tabelas.

### 1.4 Qualidade de Integracao com Auth

| Aspecto | Status | Notas |
|---------|--------|-------|
| Trigger on_auth_user_created | OK | Cria profile + user_settings |
| Role injection prevention | OK | Hardcoded 'corretor' (fix 20260223000001) |
| Org injection prevention | OK | Ignora metadata org_id (fix 20260223000002) |
| Email sync | OK | Trigger on_auth_user_email_updated |
| handle_new_user as DEFINER | NECESSARIO | Precisa acessar profiles sem RLS para insert |

---

## 2. Auditoria de Performance

### 2.1 Indexes Ausentes

| ID | Tabela | Coluna(s) | Razao | Severidade |
|----|--------|-----------|-------|------------|
| PERF-01 | deals | contact_id, board_id (composite) | Queries de kanban que filtram por contato dentro de um board | **MEDIUM** |
| PERF-02 | activities | organization_id, date DESC | Queries de timeline/agenda com filtro de org e ordenacao por data | **MEDIUM** |
| PERF-03 | deals | organization_id, is_won, is_lost | Dashboard stats query faz full scan nos flags booleanos com filtro de org | **MEDIUM** |
| PERF-04 | contacts | organization_id, name | Busca de contatos por nome dentro da org (a GIN trigram existe mas nao e composta com org_id) | **LOW** |
| PERF-05 | leads | organization_id, status | Listagem de leads por org e status | **LOW** |

---

### 2.2 Patterns N+1 Visiveis no Schema

| ID | Padrao | Risco | Severidade |
|----|--------|-------|------------|
| PERF-06 | deals -> contact (FK sem eager) | Kanban carrega deals e faz N queries para resolver nomes de contatos | **HIGH** |
| PERF-07 | deals -> board_stages (FK) | Cada deal precisa do label do stage para exibicao | **MEDIUM** |

**Mitigacao:** PostgREST/Supabase suporta `select=*,contacts(*)` para evitar N+1, mas depende da implementacao frontend.

---

### 2.3 Funcoes com Potencial Performance Issue

| ID | Funcao | Problema | Severidade |
|----|--------|----------|------------|
| PERF-08 | `get_user_organization_id()` | Chamada em TODA policy RLS. E SECURITY DEFINER + STABLE, entao PostgreSQL pode cachear dentro da mesma transacao, mas e chamada repetidamente em cada row evaluation. | **LOW** (design intencional) |
| PERF-09 | `is_admin_or_director(p_org_id)` | Subquery em profiles para cada row avaliada na policy. O index `idx_profiles_org_role` ajuda, mas em tabelas grandes o overhead e significativo. | **LOW** (design intencional) |

---

### 2.4 Observacoes sobre Denormalizacao

| Aspecto | Status | Notas |
|---------|--------|-------|
| contacts.total_value | Denormalizado | LTV calculado via RPCs atomicos (increment/decrement). Correto para evitar queries pesadas de SUM. |
| contacts.lead_score | Denormalizado | Score mantido no contato, historico em lead_score_history. Correto. |
| deals.title synced com contact.name | Denormalizado | Data migration feita, mas sem trigger automatico para manter sync. Pode ficar desatualizado se contato muda de nome apos criacao do deal. |

---

## 3. Auditoria de Integridade de Dados

### 3.1 Constraints Ausentes

| ID | Tabela.Coluna | Problema | Severidade |
|----|---------------|----------|------------|
| INT-01 | deals.board_id | FK sem ON DELETE CASCADE ou SET NULL. Se um board for hard-deleted (nao soft), deals ficam orfaos. | **HIGH** |
| INT-02 | deals.stage_id | FK sem ON DELETE CASCADE ou SET NULL. Se um stage for removido, deals ficam com referencia invalida. | **HIGH** |
| INT-03 | deals.contact_id | FK sem ON DELETE action. Contatos soft-deleted manteem referencia, mas se alguma operacao fizer hard delete, deals ficam orfaos. | **MEDIUM** |
| INT-04 | activities.organization_id | Nullable sem NOT NULL. Dependeu de backfill (migration 20260223200001). Novos registros podem ter NULL se nao fornecerem. | **MEDIUM** |
| INT-05 | contacts.organization_id | Nullable, deveria ser NOT NULL como deals. | **MEDIUM** |
| INT-06 | boards.organization_id | Nullable, deveria ser NOT NULL. | **LOW** |
| INT-07 | products.price | Sem CHECK (>= 0). Deal_items tem, mas products nao. | **LOW** (menor risco) |

---

### 3.2 Risco de Registros Orfaos

| Relacao | ON DELETE | Risco |
|---------|-----------|-------|
| deals -> boards | (none) | Orfao se board hard-deleted |
| deals -> board_stages | (none) | Orfao se stage hard-deleted |
| deals -> contacts | (none) | Orfao se contact hard-deleted |
| deals -> profiles (owner_id) | (none) | Orfao se profile deletado |
| contacts -> profiles (owner_id) | (none) | Orfao se profile deletado |
| boards -> profiles (owner_id) | (none) | Orfao se profile deletado |
| activities -> profiles (owner_id) | (none) | Orfao se profile deletado |
| deal_items -> products | (none) | Orfao se product hard-deleted |
| notifications -> organizations | (none) | Orfao se org deletada |
| notifications -> profiles (owner_id) | (none) | Orfao se profile deletado |
| lead_score_history -> organizations | (none) | Orfao se org deletada |
| leads -> contacts (converted_to) | (none) | Orfao se contact hard-deleted |
| leads -> profiles (owner_id) | (none) | Orfao se profile deletado |

**Nota:** A maioria dos orfaos e mitigada pelo fato de o sistema usar soft delete (deleted_at) em vez de hard delete para entidades principais. O risco real e baixo para o uso normal, mas existiria se alguem usasse service_role para DELETE direto.

**Recomendacao:** Adicionar `ON DELETE SET NULL` em FKs de owner_id para prevenir erros de constraint ao deletar profiles.

---

### 3.3 Defaults Ausentes

| ID | Tabela.Coluna | Problema | Severidade |
|----|---------------|----------|------------|
| INT-08 | contacts.status | Default 'ACTIVE' -- OK | -- |
| INT-09 | contacts.stage | Default 'LEAD' -- OK | -- |
| INT-10 | activities.type | NOT NULL sem default. Exige valor explicito. | Aceitavel |
| INT-11 | leads.phone | Coluna nao existe (removida com company_name/role). Nao havia campo phone originalmente. | Funcional (leads usa formularios externos) |

---

### 3.4 Consistencia de Dados

| ID | Problema | Severidade |
|----|----------|------------|
| INT-12 | `deals.status` e `deals.stage_id` coexistem -- `status` e DEPRECATED mas nao tem constraint ligando ao `stage_id`. Pode ter valores divergentes. | **MEDIUM** |
| INT-13 | `profiles.name` e `profiles.first_name` coexistem -- `name` e DEPRECATED (DB-014) mas ambos podem ser escritos. Trigger `handle_new_user` escreve apenas `first_name`, mas queries podem ler `name`. | **MEDIUM** (dados legacy) |
| INT-14 | `profiles.avatar` e `profiles.avatar_url` coexistem -- mesma situacao de `name`/`first_name`. | **LOW** |

---

## 4. Auditoria de Design do Schema

### 4.1 Normalizacao

| ID | Problema | Severidade |
|----|----------|------------|
| DES-01 | `contacts.tags` (TEXT[]) e `contacts.custom_fields` (JSONB) -- dados estruturados em colunas EAV-style. Tags poderia referenciar a tabela `tags`. Custom fields usa definicoes de `custom_field_definitions` mas armazena valores inline. Padrao aceitavel para CRM com campos flexiveis. | **LOW** |
| DES-02 | `deals.metadata` (JSONB) -- bag generico sem schema definido. Aceitavel para dados internos de automacao. | **LOW** |
| DES-03 | `contacts.profile_data` (JSONB) -- dados complementares sem schema. Documentado via COMMENT. Aceitavel. | **LOW** |

---

### 4.2 Consistencia de Nomenclatura

| ID | Problema | Severidade |
|----|----------|------------|
| DES-04 | Mistura de naming conventions em tabelas: `board_stages` (snake_case composto) vs `lifecycle_stages` vs `contact_phones` vs `deal_notes`. Consistente dentro do padrao `{entity}_{sub}`. | OK |
| DES-05 | `quick_scripts` nao segue o padrao de nomenclatura. Poderia ser `script_templates` ou similar. | **LOW** (cosmetic) |
| DES-06 | Duas tabelas de notificacoes: `system_notifications` (legado) e `notifications` (Epic 3). Sobreposicao funcional. | **MEDIUM** |
| DES-07 | Tabelas webhook usam dois padroes: `webhook_events_in`/`webhook_events_out`/`webhook_deliveries` (schema init) vs nomes em funcoes `integration_webhook_events`/`integration_webhook_deliveries` (coderabbit fix -- bug). | **HIGH** (ver SEC-03) |

---

### 4.3 Uso de Tipos

| Aspecto | Status | Notas |
|---------|--------|-------|
| UUIDs como PKs | Consistente | Todas as tabelas usam UUID com gen_random_uuid() |
| TIMESTAMPTZ vs TIMESTAMP | Consistente | Todas usam TIMESTAMPTZ |
| NUMERIC para valores monetarios | Correto | deals.value, deal_items.price, products.price |
| TEXT para enums | Consistente | Todas usam CHECK constraints em TEXT (nao ENUM type) |
| TEXT[] para arrays | Usado em tags, events, regions | Aceitavel para Supabase/PostgREST |
| JSONB para dados flexiveis | Consistente | messages, profile_data, metadata, custom_fields |
| VARCHAR vs TEXT | Inconsistente | `security_alerts` usa VARCHAR(50/20/255), todas as outras usam TEXT | **MEDIUM** |

---

### 4.4 Qualidade dos Relacionamentos

| Aspecto | Status |
|---------|--------|
| organizations como tenant root | Correto. Todas as tabelas CRM referenciam org_id. |
| Soft delete pattern | Consistente (deleted_at TIMESTAMPTZ) em entidades principais |
| Cascade delete em filhas | Correto: deal_notes, deal_files, deal_items, contact_phones, contact_preferences usam ON DELETE CASCADE |
| Owner_id pattern | Consistente: contacts, deals, activities, boards tem owner_id FK -> profiles |

---

## 5. Auditoria de Migrations

### 5.1 Qualidade das Migrations

| ID | Problema | Severidade |
|----|----------|------------|
| MIG-01 | `20260225000000_coderabbit_pr5_fixes.sql` reescreveu `notify_deal_stage_changed()` referenciando tabelas que nao existem (`integration_webhook_events`, `integration_webhook_deliveries`). Isso quebrou o webhook outbound. | **CRITICAL** |
| MIG-02 | Varias migrations nao sao idempotentes. Ex: `20260226000000_add_recurrence_fields.sql` usa `ALTER TABLE ADD COLUMN` sem `IF NOT EXISTS` para constraints, e `CREATE INDEX` sem `IF NOT EXISTS`. Se rodada duas vezes, falharia. | **HIGH** |
| MIG-03 | Migration `20260226200001_epic3_notifications.sql` cria tabela `notifications` sem qualificar schema (`public.notifications`). Funciona mas inconsistente com o padrao do projeto. | **MEDIUM** |

---

### 5.2 Rollback

| Aspecto | Status |
|---------|--------|
| Migrations com BEGIN/COMMIT | Maioria sim (transacionais) |
| Scripts de rollback | NAO existem. Nenhuma migration tem script de reversao. |
| Additive vs destructive | Maioria e aditiva (ADD COLUMN, CREATE TABLE). Excecoes: DROP TABLE crm_companies, DROP COLUMN tags/custom_fields de deals. |

**Recomendacao:** Para futuras migrations, incluir script de rollback (mesmo como comentario) ou usar `supabase db diff --linked` para gerar reversos.

---

### 5.3 Breaking Changes

| Migration | Mudanca | Impacto |
|-----------|---------|---------|
| 20260220100000 | DROP TABLE crm_companies | Frontend que referenciava empresas precisou ser atualizado |
| 20260227220048 | DROP COLUMN deals.tags, deals.custom_fields | Frontend que lia tags/custom_fields de deals precisou migrar para contacts |
| 20260224000005 | profiles.name -> first_name | Trigger atualizado, mas queries diretas em name podem retornar dados antigos |

---

## 6. Debitos Tecnicos Consolidados

### CRITICAL (3)

| ID | Descricao | Tabela/Funcao | Risco |
|----|-----------|---------------|-------|
| SEC-03 | `notify_deal_stage_changed()` referencia tabelas inexistentes | Function | Webhooks outbound completamente quebrados |
| INT-01 | deals.board_id FK sem ON DELETE | deals | Orfaos e erros de integridade |
| MIG-01 | Migration coderabbit introduziu bug de tabela inexistente | Migration 24 | Mesmo que SEC-03 |

### HIGH (7)

| ID | Descricao | Tabela/Funcao | Risco |
|----|-----------|---------------|-------|
| SEC-01 | `ai_suggestion_interactions` RLS permissiva | ai_suggestion_interactions | Cross-user data access |
| SEC-04 | `merge_contacts()` DEFINER sem validacao de org | Function | Cross-tenant merge |
| INT-02 | deals.stage_id FK sem ON DELETE | deals | Orfaos |
| DES-07 | Naming inconsistente em webhook tables (bug) | Functions | Confusao + SEC-03 |
| PERF-06 | N+1 deals -> contacts no kanban | Schema design | Performance |
| MIG-02 | Migrations nao idempotentes | Varias | Re-run failure |
| DES-06 | Duplicidade system_notifications vs notifications | Schema design | Confusao de dominio |

### MEDIUM (14)

| ID | Descricao | Tabela |
|----|-----------|--------|
| SEC-05 | LTV RPCs DEFINER sem validacao | Functions |
| SEC-06 | RLS subquery direta em vez de helper function | contact_phones, contact_preferences, etc. |
| SEC-07 | notifications sem DELETE policy | notifications |
| PERF-01 | Index ausente deals(contact_id, board_id) | deals |
| PERF-02 | Index ausente activities(org_id, date DESC) | activities |
| PERF-03 | Index ausente deals(org_id, is_won, is_lost) | deals |
| PERF-07 | N+1 deals -> board_stages | Schema design |
| INT-03 | deals.contact_id FK sem ON DELETE | deals |
| INT-04 | activities.organization_id nullable | activities |
| INT-05 | contacts.organization_id nullable | contacts |
| INT-12 | deals.status e stage_id coexistem (deprecated) | deals |
| INT-13 | profiles.name e first_name coexistem (deprecated) | profiles |
| DES-08 | VARCHAR vs TEXT inconsistente em security_alerts | security_alerts |
| MIG-03 | notifications sem schema qualifier | Migration |

### LOW (7)

| ID | Descricao | Tabela |
|----|-----------|--------|
| SEC-02 | rate_limits RLS permissiva | rate_limits |
| INT-06 | boards.organization_id nullable | boards |
| INT-07 | products.price sem CHECK (>= 0) | products |
| INT-14 | profiles.avatar e avatar_url coexistem | profiles |
| DES-01 | contacts.tags como TEXT[] (nao FK) | contacts |
| DES-05 | quick_scripts naming inconsistente | quick_scripts |
| PERF-04 | Index ausente contacts(org_id, name) | contacts |

---

## 7. Plano de Acao Recomendado

### Prioridade 1 - Imediata (CRITICAL)

1. **Fix notify_deal_stage_changed()** -- Reescrever funcao usando nomes corretos de tabelas (`webhook_events_out`, `webhook_deliveries`) e campos correspondentes. Migration corretiva.

2. **Adicionar ON DELETE SET NULL/CASCADE em FKs criticas** -- `deals.board_id` e `deals.stage_id` devem ter ON DELETE SET NULL para prevenir erros de constraint.

### Prioridade 2 - Proxima Sprint (HIGH)

3. **Restringir RLS de ai_suggestion_interactions** -- Criar policy `user_id = auth.uid()`.

4. **Validar org em merge_contacts()** -- Adicionar check de que ambos contatos pertencem a org do caller.

5. **Unificar system_notifications e notifications** -- Definir qual tabela e a canonica.

### Prioridade 3 - Backlog (MEDIUM)

6. Migrar subqueries diretas para `get_user_organization_id()` em policies.
7. Adicionar NOT NULL em organization_id das tabelas contacts, activities, boards.
8. Adicionar indexes MEDIUM listados.
9. Validar org em increment/decrement_contact_ltv().
10. Adicionar DELETE policy em notifications (se necessario).
11. Tornar migrations futuras idempotentes (IF NOT EXISTS).

### Prioridade 4 - Opcional (LOW)

12. Normalizar VARCHAR -> TEXT em security_alerts.
13. Adicionar CHECK (>= 0) em products.price.
14. Planejar DROP de colunas deprecated (profiles.name, profiles.avatar, deals.status) com migration segura.
15. Considerar Supabase Vault para chaves de API.

---

## 8. Metricas do Schema

| Metrica | Valor |
|---------|-------|
| Total de tabelas | 36 (excluindo crm_companies removida) |
| Tabelas com RLS | 36/36 (100%) |
| Tabelas com soft delete | 8 (organizations, boards, contacts, deals, activities, leads + crm_companies removida) |
| Total de indexes | ~60+ |
| Total de functions | ~20 |
| Total de triggers | 14 |
| Storage buckets | 3 (avatars, audio-notes, deal-files) |
| Realtime tables | 5 (deals, activities, contacts, board_stages, boards) |
| SECURITY DEFINER functions | ~12 (helper, auth, api_key, ltv, merge, notify) |
| SECURITY INVOKER functions | ~8 (deal ops, stage counts, reassign, audit, duplicate check) |
| CHECK constraints | ~15 |
| UNIQUE constraints | ~8 |
| Foreign keys | ~45+ |
