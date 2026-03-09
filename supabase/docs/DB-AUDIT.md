# DB-AUDIT.md - Auditoria Completa do Banco de Dados

> **Projeto:** ZmobCRM (CRM Imobiliario)
> **Gerado em:** 2026-03-06
> **Fase:** Brownfield Discovery - Phase 2 (@data-engineer Dara)
> **Banco:** PostgreSQL 17 (Supabase)
> **Ambientes:** Producao (`fkfqwxjrgfuerysaxayr`), Staging (`xbwbwnevtpmmehgxfvcp`), Local

---

## Sumario Executivo

| Categoria | Status | Debitos Encontrados |
|-----------|--------|---------------------|
| Seguranca (RLS) | BOM | 3 debitos (1 HIGH, 2 MEDIUM) |
| Performance (Indexes) | BOM | 5 debitos (1 HIGH, 3 MEDIUM, 1 LOW) |
| Integridade de Dados | ATENCAO | 6 debitos (2 HIGH, 4 MEDIUM) |
| Design de Schema | BOM | 5 debitos (1 HIGH, 3 MEDIUM, 1 LOW) |
| Migrations | BOM | 2 debitos (2 MEDIUM) |
| Funcoes e Triggers | ATENCAO | 3 debitos (1 HIGH, 2 MEDIUM) |
| **TOTAL** | **ATENCAO** | **24 debitos (0 CRITICAL, 6 HIGH, 14 MEDIUM, 4 LOW)** |

---

## 1. Auditoria de Seguranca (RLS)

### 1.1 Cobertura RLS

**Resultado: 100% de cobertura.** Todas as 39+ tabelas publicas tem `ENABLE ROW LEVEL SECURITY`.

A evolucao da seguranca foi significativa:
- **Schema init (20251201):** Muitas politicas `USING(true)` (acesso total para authenticated)
- **Security sprint (20260223):** Reescrita completa para org-scoped + role-based
- **CodeRabbit PR5 (20260225):** Fix de tenant isolation em profiles e organizations
- **RLS recursion fix (20260226):** Funcao `get_user_organization_id()` para evitar recursao circular

### 1.2 Vulnerabilidades Encontradas

#### SEC-01: `system_notifications` com RLS permissiva [HIGH]

**Tabela:** `system_notifications`
**Migration:** `20251201000000_schema_init.sql` (linha 1653)
**Problema:** Policy `USING(true)` para ALL operations. Qualquer usuario autenticado pode ler/escrever/deletar notificacoes de qualquer organizacao.
**Impacto:** Vazamento de dados entre tenants. Um usuario pode ver notificacoes de outra organizacao.
**Recomendacao:** Substituir por policy org-scoped:
```sql
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.system_notifications;
CREATE POLICY "system_notifications_select_org" ON public.system_notifications
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "system_notifications_insert_org" ON public.system_notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
```

#### SEC-02: `rate_limits` com RLS permissiva [MEDIUM]

**Tabela:** `rate_limits`
**Migration:** `20251201000000_schema_init.sql` (linha 1654)
**Problema:** Policy `USING(true)` para ALL. Qualquer usuario pode manipular rate limits de qualquer endpoint/IP.
**Impacto:** Baixo risco pratico (tabela de infraestrutura), mas permite que um usuario veja padroes de acesso de outros.
**Recomendacao:** Restringir: INSERT para service_role/DEFINER functions, SELECT admin-only ou nenhum (tabela interna).

#### SEC-03: `activities.client_company_id` - FK orfao [MEDIUM]

**Tabela:** `activities`
**Migration:** `20251201000000_schema_init.sql` (coluna adicionada), `20260220100000` (tabela crm_companies dropada)
**Problema:** A coluna `client_company_id` referencia `crm_companies(id)`, mas a tabela `crm_companies` foi dropada na migration `20260220100000_remove_companies_and_roles.sql`. A FK em `activities` nao foi removida explicitamente (a migration remove FKs de `deals` e `contacts`, mas nao de `activities`).
**Impacto:** A coluna pode conter UUIDs que apontam para nada. Inserts com valor nao-nulo falharao se a FK ainda existir.
**Recomendacao:** Verificar se a FK foi cascadeada pelo DROP TABLE. Se nao, dropar a coluna:
```sql
ALTER TABLE public.activities DROP COLUMN IF EXISTS client_company_id;
```

### 1.3 Funcoes SECURITY DEFINER - Analise de Risco

| Funcao | Risco | Status | Notas |
|--------|-------|--------|-------|
| `handle_new_user()` | ALTO | MITIGADO | Fix em 20260223000002: ignora metadata org_id e role |
| `get_singleton_organization_id()` | MEDIO | OK | Retorna apenas org mais antiga, sem dados sensiveis |
| `get_user_organization_id()` | MEDIO | OK | Necessario para evitar recursao RLS |
| `is_instance_initialized()` | BAIXO | OK | Apenas booleano |
| `log_audit_event()` | MEDIO | OK | SET search_path = public |
| `merge_contacts()` | ALTO | ATENCAO | SECURITY DEFINER sem validacao de org (ver INT-05) |
| `increment/decrement_contact_ltv()` | MEDIO | ATENCAO | SECURITY DEFINER sem validacao de org (ver INT-06) |
| `create_api_key/revoke_api_key/validate_api_key` | ALTO | OK | Validacao interna de auth.uid() + role |
| `_api_key_make_token/_api_key_sha256_hex` | BAIXO | OK | Helpers internos |

---

## 2. Auditoria de Performance

### 2.1 Cobertura de Indexes

**Resultado: BOA.** A migration `20260205000000_add_performance_indexes.sql` adicionou indexes abrangentes, e migrations subsequentes continuaram o padrao.

#### Indexes presentes nas FKs mais criticas:

| FK Column | Tabela | Index | Status |
|-----------|--------|-------|--------|
| deals.board_id | deals | idx_deals_board_id | OK |
| deals.stage_id | deals | idx_deals_stage_id | OK |
| deals.contact_id | deals | idx_deals_contact_id | OK |
| deals.organization_id | deals | idx_deals_organization_id | OK |
| deals.owner_id | deals | idx_deals_owner_id | OK |
| activities.deal_id | activities | idx_activities_deal_id | OK |
| activities.contact_id | activities | idx_activities_contact_id | OK |
| contacts.organization_id | contacts | idx_contacts_organization_id | OK |
| contacts.owner_id | contacts | idx_contacts_owner_id | OK |
| board_stages.board_id | board_stages | idx_board_stages_board_id | OK |

### 2.2 Problemas de Performance Encontrados

#### PERF-01: RLS subqueries em profiles para cada request [HIGH]

**Problema:** Praticamente todas as politicas RLS fazem subquery em `profiles`:
```sql
organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
```
Essa subquery e executada para CADA LINHA avaliada pela politica. Embora o Postgres possa cachear o resultado dentro de uma mesma query (via `STABLE`), o padrao se repete em dezenas de politicas.

**Impacto:** Para tabelas com muitas linhas (contacts, deals, activities), cada SELECT paga o custo da subquery. O index `idx_profiles_org_role` ajuda, mas o padrao e inerentemente caro com RLS.

**Mitigacao atual:** Funcao `get_user_organization_id()` (SECURITY DEFINER, STABLE) reduz o custo em profiles/organizations.

**Recomendacao:** Considerar mover organization_id para JWT custom claims (Supabase Dashboard > Auth > JWT > Custom Claims) para evitar a subquery em runtime:
```sql
-- Exemplo com JWT claims
USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
```

#### PERF-02: `get_dashboard_stats()` faz 6 COUNT separados [MEDIUM]

**Funcao:** `get_dashboard_stats(p_organization_id)`
**Migration:** `20260220100000_remove_companies_and_roles.sql`
**Problema:** Executa 6 subqueries COUNT independentes contra deals, contacts, activities. Cada uma faz full-index scan.
**Impacto:** Lento se datasets crescerem (>10k deals). Cada chamada ao dashboard aciona 6 queries.
**Recomendacao:** Consolidar em CTEs ou materialized view com refresh periodico.

#### PERF-03: `system_notifications` sem index em `organization_id` [MEDIUM]

**Tabela:** `system_notifications`
**Problema:** Nao tem index em `organization_id`. Quando RLS for corrigida (SEC-01), queries filtradas por org farao full scan.
**Recomendacao:**
```sql
CREATE INDEX idx_system_notifications_org ON public.system_notifications(organization_id);
```

#### PERF-04: `deals.status` coluna legado sem uso claro [MEDIUM]

**Tabela:** `deals`
**Problema:** A coluna `status` (TEXT, nullable) coexiste com `is_won`/`is_lost` flags. A aplicacao usa `is_won`/`is_lost` para logica de negocio, mas `status` ainda existe. Queries podem estar consultando ambos, causando confusao e desperdicio de storage.
**Recomendacao:** Verificar uso no app. Se nao usado, dropar em migration futura. Se usado, documentar semantica vs `is_won`/`is_lost`.

#### PERF-05: Padrao N+1 em useDealsQuery [LOW]

**Arquivo:** `lib/query/hooks/useDealsQuery.ts` (linhas 97, 203)
**Problema:** Busca deals primeiro, depois faz segunda query para buscar profiles dos owners. Nao e tecnicamente N+1 (e 1+1), mas adiciona latencia extra.
**Recomendacao:** Usar PostgREST embedded select: `supabase.from('deals').select('*, owner:profiles(id, first_name, last_name)')`.

### 2.3 Padroes de Query na Aplicacao

**Analise de `lib/supabase/*.ts`:**

| Padrao | Frequencia | Avaliacao |
|--------|------------|-----------|
| `supabase.from('x').select('*')` | Alta | ATENCAO: select * em tabelas com JSONB e arrays e caro |
| `getCurrentOrganizationId()` | Toda operacao | OK: cached por user, mas 1 roundtrip extra na primeira chamada |
| Parallel queries (`Promise.all`) | Moderada | BOM: boards.ts faz boards+stages em paralelo |
| Batch inserts | Rara | OK quando usado (import de contatos) |
| N+1 queries | Encontrado | deals.ts busca profiles separadamente apos listar deals |

---

## 3. Auditoria de Integridade de Dados

### 3.1 Constraints CHECK Presentes

| Tabela | Coluna | Constraint | Migration |
|--------|--------|------------|-----------|
| profiles | role | `admin, diretor, corretor` | 20260220000000 |
| organization_invites | role | `admin, diretor, corretor` | 20260220000000 |
| contacts | contact_type | `PF, PJ` | 20260226100000 |
| contacts | classification | 6 valores | 20260226100000 |
| contacts | temperature | `HOT, WARM, COLD` | 20260226100000 |
| contacts | lead_score | `0-100` | 20260226200000 |
| contacts | address_state | `length = 2` | 20260226100000 |
| deals | deal_type | `VENDA, LOCACAO, PERMUTA` | 20260226100003 |
| deals | commission_rate | `0-100` | 20260226100003 |
| deals | is_won/is_lost | NOT NULL DEFAULT false | Inicial |
| activities | recurrence_type | `daily, weekly, monthly` | 20260226000000 |
| activities | recurrence constraint cruzada | end_date requer type | 20260226000000 |
| quick_scripts | category | 6 valores | Inicial |
| ai_suggestion_interactions | suggestion_type | 4 valores | Inicial |
| ai_suggestion_interactions | entity_type | `deal, contact` | Inicial |
| ai_suggestion_interactions | action | 3 valores | Inicial |
| user_consents | consent_type | 6 valores | Inicial |
| audit_logs | severity | 5 niveis | Inicial |
| notifications | type | 4 tipos | 20260226200001 |
| prospecting_queues | status | 6 valores | 20260304100000 |
| profiles | commission_rate | `0-100` | 20260226100004 |

### 3.2 Problemas de Integridade

#### INT-01: `activities.client_company_id` referencia tabela inexistente [HIGH]

**Descricao:** Coluna `client_company_id` em `activities` referencava `crm_companies(id)`, mas `crm_companies` foi dropada. A FK pode ter sido removida implicitamente pelo CASCADE do DROP TABLE, mas a coluna permanece.
**Risco:** Coluna orfao ocupando espaco e causando confusao. Se FK nao foi removida, inserts falharao.
**Recomendacao:** `ALTER TABLE activities DROP COLUMN IF EXISTS client_company_id;`

#### INT-02: `deals.contact_id` nullable sem validacao [HIGH]

**Descricao:** Um deal pode existir sem contato associado (`contact_id IS NULL`). Isso permite deals "fantasmas" no pipeline sem nenhum contato vinculado.
**Risco:** Dados inconsistentes no CRM. O trigger `check_deal_duplicate` ja lida com NULL (retorna early), mas deals sem contato podem acumular.
**Recomendacao:** Avaliar se deals sem contato sao validos para o negocio imobiliario. Se nao, adicionar `NOT NULL` com migration de limpeza.

#### INT-03: `updated_at` trigger ausente em tabelas principais [MEDIUM]

**Descricao:** O trigger `update_updated_at_column()` so esta aplicado em:
- `deal_notes`
- `quick_scripts`
- `contact_phones`
- `contact_preferences`

Tabelas PRINCIPAIS como `contacts`, `deals`, `boards`, `profiles`, `activities` NAO tem trigger de updated_at. A aplicacao atualiza `updated_at = NOW()` manualmente no codigo TypeScript.

**Risco:** Se algum UPDATE no banco (via RPC, trigger ou admin) esquecer de atualizar `updated_at`, o campo fica desatualizado.
**Recomendacao:** Aplicar trigger em todas as tabelas com `updated_at`:
```sql
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### INT-04: Soft delete sem index dedicado em `deleted_at` [MEDIUM]

**Descricao:** Tabelas com soft delete (contacts, deals, boards, activities) filtram `WHERE deleted_at IS NULL` constantemente, mas nenhuma tem index parcial dedicado para registros ativos.
**Risco:** Os indexes compostos existentes (ex: `idx_deals_open`) ja cobrem parte dos casos, mas queries que filtram apenas `deleted_at IS NULL` nao se beneficiam.
**Recomendacao:** Considerar indexes parciais se queries de "ativos" forem predominantes:
```sql
CREATE INDEX idx_contacts_active ON contacts(organization_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_active ON deals(organization_id, created_at DESC) WHERE deleted_at IS NULL;
```

#### INT-05: `merge_contacts()` SECURITY DEFINER sem validacao de org [MEDIUM]

**Funcao:** `merge_contacts()`
**Migration:** `20260226100006_merge_contacts_rpc.sql`
**Problema:** Funcao SECURITY DEFINER que faz UPDATE/DELETE em contacts, deals, phones, preferences sem verificar se os IDs pertencem a mesma organizacao do usuario chamador.
**Risco:** Um usuario poderia teoricamente chamar a funcao com IDs de contatos de outra org (se conhecesse os UUIDs). Na pratica, o frontend envia IDs validos, mas a defesa nao esta no banco.
**Recomendacao:** Adicionar validacao de org_id dentro da funcao:
```sql
-- Verificar que ambos contatos pertencem a org do caller
IF v_org_id != (SELECT organization_id FROM contacts WHERE id = p_winner_id) THEN
  RAISE EXCEPTION 'Unauthorized: contact does not belong to your organization';
END IF;
```

#### INT-06: `increment/decrement_contact_ltv()` SECURITY DEFINER sem validacao [MEDIUM]

**Funcoes:** `increment_contact_ltv()`, `decrement_contact_ltv()`
**Migration:** `20260226200002_epic3_ltv_rpc.sql`
**Problema:** SECURITY DEFINER sem verificar se o contact_id pertence a org do caller.
**Recomendacao:** Converter para SECURITY INVOKER (RLS protegera) ou adicionar check de org.

---

## 4. Auditoria de Design de Schema

### 4.1 Normalizacao

**Resultado: ADEQUADA para CRM SaaS.** O schema segue 3NF com desnormalizacoes pragmaticas:
- `contacts.phone` (legado) coexiste com tabela `contact_phones` (correto)
- `deals.title` duplica `contacts.name` (intencional, migration 20260301)
- `contacts.tags` e `TEXT[]` inline (pragmatico, evita tabela N:N para volume baixo)

### 4.2 Problemas de Design

#### DES-01: `lifecycle_stages` PK tipo TEXT sem FK enforcement [HIGH]

**Tabela:** `lifecycle_stages`
**Problema:** PK e TEXT ('LEAD', 'MQL', etc), e `contacts.stage` referencia essa tabela semanticamente mas NAO tinha FK constraint. A migration `20260224000006_db015_fk_contacts_stage.sql` adicionou a FK.
**Risco:** Se a FK foi criada com sucesso, OK. Verificar estado atual do banco.
**Recomendacao:** Validar que a constraint existe em producao:
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'contacts'::regclass AND confrelid = 'lifecycle_stages'::regclass;
```

#### DES-02: `contacts.phone` legado vs `contact_phones` [MEDIUM]

**Problema:** Existem dois locais para telefone: `contacts.phone` (coluna legado TEXT) e `contact_phones` (tabela dedicada com tipo, WhatsApp, primario). O app pode usar ambos inconsistentemente.
**Recomendacao:** Manter `contacts.phone` como cache do telefone primario (synced via trigger) ou deprecar com timeline. Documentar decisao.

#### DES-03: `deals.status` TEXT legado vs `is_won`/`is_lost` [MEDIUM]

**Problema:** Dois sistemas de status coexistem. `status` TEXT (sem CHECK, sem default claro) e `is_won`/`is_lost` booleans.
**Recomendacao:** Se `status` nao e usado pelo app, dropar. Se e, definir CHECK constraint e documentar relacao com flags.

#### DES-04: Tabelas sem `updated_at` [MEDIUM]

**Tabelas afetadas:** `lifecycle_stages`, `board_stages`, `rate_limits`, `ai_audio_notes`, `ai_suggestion_interactions`, `lead_score_history`, `webhook_events_in`, `webhook_events_out`, `webhook_deliveries`, `notifications`
**Problema:** Nao tem coluna `updated_at`. Para tabelas append-only (audit_logs, lead_score_history) isso e aceitavel, mas para `notifications` (que tem `is_read` mutavel) e `board_stages` (que podem ser reordenadas) e um problema.
**Recomendacao:** Adicionar `updated_at` em `notifications` e `board_stages` com trigger.

#### DES-05: Mistura VARCHAR e TEXT [LOW]

**Tabelas:** `security_alerts` usa `VARCHAR(50)`, `VARCHAR(20)`, `VARCHAR(255)` enquanto todo o resto do schema usa `TEXT`.
**Problema:** Inconsistencia de convencao. Em PostgreSQL, VARCHAR e TEXT tem mesma performance.
**Recomendacao:** Padronizar como TEXT em migration futura (nao e urgente).

---

## 5. Auditoria de Migrations

### 5.1 Padroes Observados

| Padrao | Frequencia | Avaliacao |
|--------|------------|-----------|
| `IF NOT EXISTS` / `IF EXISTS` | Alta | BOM: idempotencia |
| `BEGIN; ... COMMIT;` | Moderada | BOM: transacionalidade |
| `DROP POLICY IF EXISTS` antes de `CREATE POLICY` | Alta | BOM: re-executavel |
| Comentarios descritivos | Alta | BOM: documentacao inline |
| Versionamento por story | Alta | BOM: rastreabilidade |

### 5.2 Problemas de Migration

#### MIG-01: Ausencia de rollback scripts [MEDIUM]

**Problema:** Nenhuma migration tem script de rollback correspondente. Se uma migration falhar parcialmente ou precisar ser revertida, nao ha procedimento documentado.
**Recomendacao:** Para migrations futuras, incluir bloco de rollback comentado ou arquivo `.rollback.sql`.

#### MIG-02: Schema init muito grande (1900+ linhas) [MEDIUM]

**Arquivo:** `20251201000000_schema_init.sql`
**Problema:** Arquivo consolidado com 26 tabelas, funcoes, triggers, RLS, seeds. Dificulta auditoria, debugging e rollback parcial.
**Recomendacao:** Para proxima consolidacao, considerar split por dominio (core, ai, security, integrations).

---

## 6. Auditoria de Funcoes e Triggers

### 6.1 Funcoes SECURITY DEFINER - Analise de Risco

#### FUNC-01: `merge_contacts()` sem validacao cross-tenant [HIGH]

**Detalhado em INT-05.** Funcao DEFINER que opera em multiplas tabelas sem verificar ownership.

#### FUNC-02: `get_dashboard_stats()` performance [MEDIUM]

**Detalhado em PERF-02.** 6 subqueries independentes.

#### FUNC-03: `check_deal_duplicate()` sem indice otimizado [MEDIUM]

**Funcao:** `check_deal_duplicate()` (trigger em deals)
**Problema:** Faz SELECT em `deals` com filtro `contact_id + stage_id + !is_won + !is_lost + !deleted_at`. Nao existe index composto dedicado para essa combinacao especifica.
**Impacto:** Lento em organizacoes com muitos deals ativos.
**Recomendacao:**
```sql
CREATE INDEX idx_deals_contact_stage_active ON deals(contact_id, stage_id)
  WHERE is_won = false AND is_lost = false AND deleted_at IS NULL;
```

---

## 7. Inventario de Debitos Tecnicos

### 7.1 Priorizacao

| ID | Severidade | Categoria | Descricao | Esforco |
|----|------------|-----------|-----------|---------|
| SEC-01 | HIGH | Seguranca | `system_notifications` RLS permissiva | Baixo |
| INT-01 | HIGH | Integridade | `activities.client_company_id` orfao | Baixo |
| INT-02 | HIGH | Integridade | `deals.contact_id` nullable | Medio |
| PERF-01 | HIGH | Performance | RLS subqueries em profiles | Alto |
| DES-01 | HIGH | Design | `lifecycle_stages` FK verificar | Baixo |
| FUNC-01 | HIGH | Seguranca | `merge_contacts()` cross-tenant | Baixo |
| SEC-02 | MEDIUM | Seguranca | `rate_limits` RLS permissiva | Baixo |
| SEC-03 | MEDIUM | Seguranca | FK orfao client_company_id | Baixo |
| PERF-02 | MEDIUM | Performance | `get_dashboard_stats()` 6 counts | Medio |
| PERF-03 | MEDIUM | Performance | `system_notifications` sem index org | Baixo |
| PERF-04 | MEDIUM | Performance | `deals.status` legado | Baixo |
| INT-03 | MEDIUM | Integridade | `updated_at` trigger ausente em tabelas principais | Baixo |
| INT-04 | MEDIUM | Integridade | Soft delete sem index `deleted_at` | Baixo |
| INT-05 | MEDIUM | Integridade | `merge_contacts()` org check | Baixo |
| INT-06 | MEDIUM | Integridade | LTV RPCs DEFINER sem org check | Baixo |
| DES-02 | MEDIUM | Design | `contacts.phone` legado vs `contact_phones` | Medio |
| DES-03 | MEDIUM | Design | `deals.status` vs `is_won/is_lost` | Baixo |
| DES-04 | MEDIUM | Design | Tabelas sem `updated_at` | Baixo |
| FUNC-02 | MEDIUM | Performance | Dashboard stats 6 counts | Medio |
| FUNC-03 | MEDIUM | Performance | Deal duplicate sem index otimizado | Baixo |
| MIG-01 | MEDIUM | Migrations | Sem rollback scripts | Medio |
| MIG-02 | MEDIUM | Migrations | Schema init monolitico | Baixo |
| DES-05 | LOW | Design | VARCHAR vs TEXT inconsistencia | Trivial |
| PERF-05 | LOW | Performance | N+1 em useDealsQuery (1+1) | Baixo |

### 7.2 Plano de Acao Recomendado

#### Sprint 1 - Quick Wins (esforco baixo, impacto alto)

1. **SEC-01**: Corrigir RLS de `system_notifications` (1 migration, 10 linhas)
2. **INT-01**: Dropar `activities.client_company_id` (1 ALTER DROP)
3. **DES-01**: Verificar FK `contacts.stage -> lifecycle_stages.id` em producao
4. **FUNC-01/INT-05**: Adicionar validacao de org em `merge_contacts()` (5 linhas)
5. **INT-06**: Converter LTV RPCs para SECURITY INVOKER (2 linhas cada)
6. **PERF-03**: Adicionar index em `system_notifications.organization_id` (1 linha)
7. **FUNC-03**: Adicionar index `idx_deals_contact_stage_active` (1 linha)

#### Sprint 2 - Melhorias Estruturais (esforco medio)

8. **INT-03**: Adicionar triggers `updated_at` em tabelas principais (contacts, deals, boards, profiles, activities)
9. **DES-02**: Documentar relacao `contacts.phone` vs `contact_phones` e definir estrategia
10. **DES-03**: Avaliar e limpar `deals.status` (verificar uso no app antes)
11. **INT-04**: Adicionar indexes parciais para `deleted_at IS NULL`
12. **DES-04**: Adicionar `updated_at` em `notifications` e `board_stages`

#### Sprint 3 - Otimizacoes (esforco alto)

13. **PERF-01**: Avaliar JWT custom claims para org_id (requer mudanca em auth + todas as policies)
14. **PERF-02**: Refatorar `get_dashboard_stats()` com CTEs ou materialized view
15. **MIG-01**: Estabelecer padrao de rollback scripts para migrations futuras

---

## 8. Incidentes Anteriores

### Incidente: auth.refresh_tokens sequence desync (2026-03-02)

- **Sintoma:** "Database error granting user" no login em producao
- **Causa raiz:** `auth.refresh_tokens_id_seq` com `last_value=84`, mas `MAX(id)=280` -> PK duplicada
- **Fix:** `SELECT setval('auth.refresh_tokens_id_seq', (SELECT MAX(id) FROM auth.refresh_tokens));`
- **Origem:** Copia de dados sem reset de sequence
- **Prevencao:** Apos importacao de dados em tabelas auth com bigint PKs, sempre executar setval

---

## 9. Metricas do Schema

| Metrica | Valor |
|---------|-------|
| Total de tabelas public | 39 |
| Tabelas com soft delete | 5 (contacts, deals, boards, activities, organizations) |
| Tabelas com RLS habilitada | 39/39 (100%) |
| Funcoes public | ~25 |
| Triggers | 11 |
| Indexes (excl. PK) | ~60+ |
| Migrations | 52 arquivos |
| Storage buckets | 3 (avatars, audio-notes, deal-files) |
| Tabelas no Realtime | 4 (prospecting_queues, saved_queues, daily_goals, org_settings) |
| Extensoes | 5 (uuid-ossp, pgcrypto, unaccent, pg_net, pg_trgm) |
| RBAC roles | 3 (admin > diretor > corretor) |

---

## 10. Conclusao

O banco de dados do ZmobCRM esta em bom estado geral, com uma evolucao clara de seguranca (de politicas permissivas para org-scoped + role-based) ao longo das 52 migrations. Os principais pontos de atencao sao:

1. **Seguranca:** 2 tabelas (`system_notifications`, `rate_limits`) ainda com RLS permissiva do schema original; funcao `merge_contacts()` sem validacao cross-tenant.

2. **Performance:** O padrao de subquery em profiles para RLS e funcional mas nao ideal para escala. JWT custom claims seria a evolucao natural.

3. **Integridade:** Ausencia de triggers `updated_at` em tabelas principais e coluna orfao `activities.client_company_id` sao os itens mais impactantes.

4. **Design:** Schema bem estruturado com normalizacao pragmatica. Debitos legados (`deals.status`, `contacts.phone`) sao conhecidos e gerenciaveis.

Nenhum debito CRITICAL foi encontrado. Os 6 debitos HIGH podem ser resolvidos em 1-2 sprints com esforco baixo a medio.

---

*Documento gerado por @data-engineer (Dara) - Brownfield Discovery Phase 2*
*Ultima atualizacao: 2026-03-06*
