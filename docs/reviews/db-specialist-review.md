# Database Specialist Review
**Reviewer:** @data-engineer (DB Sage)
**Data:** 2026-03-03
**Documento revisado:** docs/prd/technical-debt-DRAFT.md (Secao 2: Database, Secao 7: Perguntas)

---

## Metodologia

Cada debito foi verificado contra os arquivos de migration em `supabase/migrations/`, o schema documentado em `supabase/docs/SCHEMA.md` e a auditoria original em `supabase/docs/DB-AUDIT.md`. As horas estimadas incluem desenvolvimento, testes, migracao staging -> producao e rollback plan.

---

## 1. Debitos Validados

| ID | Debito | Sev. Original | Sev. Ajustada | Horas | Complexidade | Risco Fix | Dependencias | Notas |
|----|--------|---------------|---------------|-------|-------------|-----------|-------------|-------|
| TD-DB-001 | `notify_deal_stage_changed()` referencia `integration_webhook_events` / `integration_webhook_deliveries` (correto: `webhook_events_out` / `webhook_deliveries`) | CRITICAL | **CRITICAL** | 6-8 | Media | Baixo | TD-DB-008 (resolver junto) | Confirmado. Alem do nome das tabelas, os campos diferem significativamente (ver Secao 3 abaixo) |
| TD-DB-003 | `merge_contacts()` SECURITY DEFINER sem validacao de org | CRITICAL | **CRITICAL** | 4-6 | Media | Medio | Nenhuma | Confirmado. Funcao verifica `deleted_at` mas NAO verifica se winner e loser pertencem a mesma org do caller |
| TD-DB-004 | `ai_suggestion_interactions` RLS permissiva (`USING(true)`) | HIGH | **HIGH** | 2-3 | Simples | Baixo | Nenhuma | Confirmado. Linha 1581 do schema_init: `FOR ALL TO authenticated USING (true)`. Nunca restringida |
| TD-DB-005 | Duplicidade `system_notifications` vs `notifications` | HIGH | **MEDIUM** | 10-14 | Complexa | Alto | Verificar consumers no frontend | Ajustado. Ambas tabelas existem mas com schemas diferentes e propositos parcialmente distintos. NAO e um bloqueio operacional imediato. Risco esta na confusao de dominio, nao em seguranca |
| TD-DB-006 | N+1 deals -> contacts no kanban | HIGH | **HIGH** | 4-6 | Media | Baixo | Mudanca frontend obrigatoria | Confirmado. O schema suporta `select=*,contacts(*)` mas o frontend nao usa. Fix e primariamente frontend |
| TD-DB-007 | Migrations nao idempotentes | HIGH | **MEDIUM** | 4-6 | Simples | Baixo | Nenhuma | Ajustado. O impacto real e baixo porque migrations em Supabase rodam uma unica vez (`supabase db push` marca como aplicada). O risco so existe em cenarios de recovery manual. Aplicar `IF NOT EXISTS` apenas em novas migrations |
| TD-DB-008 | Naming inconsistente webhook tables vs funcoes | HIGH | **HIGH** | 0 | Simples | Nenhum | Resolvido junto com TD-DB-001 | Confirmado. Este debito e a CAUSA RAIZ de TD-DB-001. Resolver TD-DB-001 automaticamente elimina este. Horas = 0 porque ja esta contabilizado em TD-DB-001 |
| TD-DB-009 | `increment/decrement_contact_ltv()` SECURITY DEFINER sem validacao de org | MEDIUM | **HIGH** | 3-4 | Simples | Baixo | Nenhuma | Ajustado para HIGH. Mesma classe de vulnerabilidade que TD-DB-003 (cross-tenant manipulation via SECURITY DEFINER). Qualquer usuario autenticado pode alterar total_value de contato de outra org. Impacto financeiro direto |
| TD-DB-010 | RLS de `contact_phones` e `contact_preferences` usa subquery direta | MEDIUM | **MEDIUM** | 6-10 | Media | Medio | Impacto muito mais amplo que descrito | Confirmado MAS o escopo esta SUBESTIMADO. Ver Secao 2 (Debitos Adicionados) |
| TD-DB-011 | `notifications` sem DELETE policy | MEDIUM | **LOW** | 1 | Simples | Baixo | Nenhuma | Ajustado. Comportamento pode ser intencional (notificacoes como audit trail). Se cleanup for necessario, um endpoint service_role e mais seguro. Adicionar policy se houver requisito explicito de UX |
| TD-DB-012 | Index ausente `deals(contact_id, board_id)` | MEDIUM | **MEDIUM** | 1 | Simples | Nenhum | Nenhuma | Confirmado. CREATE INDEX CONCURRENTLY recomendado |
| TD-DB-013 | Index ausente `activities(organization_id, date DESC)` | MEDIUM | **MEDIUM** | 1 | Simples | Nenhum | Nenhuma | Confirmado |
| TD-DB-014 | Index ausente `deals(organization_id, is_won, is_lost)` | MEDIUM | **MEDIUM** | 1 | Simples | Nenhum | Nenhuma | Confirmado |
| TD-DB-015 | N+1 deals -> board_stages | MEDIUM | **MEDIUM** | 2-3 | Media | Baixo | Mudanca frontend | Confirmado. Mesma solucao que TD-DB-006 (eager loading via PostgREST) |
| TD-DB-016 | `deals.contact_id` FK sem ON DELETE action | MEDIUM | **MEDIUM** | 2 | Simples | Baixo | Resolver junto com TD-DB-002 | Confirmado. Mitigado por soft delete pattern |
| TD-DB-017 | `activities.organization_id` nullable | MEDIUM | **MEDIUM** | 3-4 | Media | Medio | Requer backfill se existem NULLs | Confirmado. Migration 20260223200001 fez backfill mas a coluna continua nullable |
| TD-DB-018 | `contacts.organization_id` nullable | MEDIUM | **MEDIUM** | 3-4 | Media | Medio | Requer backfill se existem NULLs | Confirmado. Linha 254 do schema_init: `organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE` -- sem NOT NULL |
| TD-DB-019 | `deals.status` e `deals.stage_id` coexistem | MEDIUM | **MEDIUM** | 4-6 | Media | Alto | Verificar TODOS os consumers de `deals.status` no frontend | Confirmado |
| TD-DB-020 | `profiles.name` e `profiles.first_name` coexistem | MEDIUM | **MEDIUM** | 4-6 | Media | Alto | Verificar consumers + trigger `handle_new_user` | Confirmado. Trigger escreve apenas `first_name` mas queries antigas podem ler `name` |
| TD-DB-021 | VARCHAR vs TEXT inconsistente em `security_alerts` | MEDIUM | **LOW** | 1 | Simples | Nenhum | Nenhuma | Ajustado. Puramente cosmetico. Nenhum impacto funcional. VARCHAR no PostgreSQL nao tem vantagem de performance sobre TEXT |
| TD-DB-022 | `notifications` sem schema qualifier | MEDIUM | **LOW** | 0.5 | Simples | Nenhum | Nenhuma | Ajustado. Funciona corretamente. Apenas inconsistencia cosmetica |
| TD-DB-023 | `rate_limits` RLS permissiva | LOW | **LOW** | 1 | Simples | Nenhum | Nenhuma | Confirmado. Dados nao sensiveis |
| TD-DB-024 | `boards.organization_id` nullable | LOW | **MEDIUM** | 2-3 | Media | Medio | Backfill necessario | Ajustado para MEDIUM. Boards sem org_id podem bypassar RLS se a policy depender de `organization_id = get_user_organization_id()`. O impacto e mais serio que LOW |
| TD-DB-025 | `products.price` sem CHECK (>= 0) | LOW | **LOW** | 0.5 | Simples | Nenhum | Nenhuma | Confirmado |
| TD-DB-026 | `profiles.avatar` e `profiles.avatar_url` coexistem | LOW | **LOW** | 2 | Simples | Baixo | Verificar consumers | Confirmado |
| TD-DB-027 | `contacts.tags` como TEXT[] | LOW | **LOW** | 0 | N/A | N/A | Nenhuma | Confirmado como NAO e problema. Design intencional para CRM. Normalizar para FK adicionaria complexidade sem beneficio |
| TD-DB-028 | `quick_scripts` naming | LOW | **LOW** | 0 | N/A | N/A | Nenhuma | Cosmetico. NAO recomendo renomear. Custo de migracao >> beneficio |
| TD-DB-029 | Index ausente `contacts(org_id, name)` | LOW | **LOW** | 1 | Simples | Nenhum | Nenhuma | Confirmado. GIN trigram ja existe para busca fuzzy |
| TD-DB-030 | Webhook secrets em texto claro | LOW | **MEDIUM** | 6-8 | Media | Medio | Requer pgcrypto ou Supabase Vault | Ajustado para MEDIUM. Se o banco for comprometido (e.g. backup vazado), esses secrets dao acesso a sistemas externos dos clientes. RLS mitiga acesso via API mas nao protege o dado em repouso |

---

## 2. Debitos Removidos

### TD-DB-002: deals.board_id FK sem ON DELETE CASCADE ou SET NULL
**Severidade Original:** CRITICAL
**Decisao:** REMOVER como CRITICAL, RECLASSIFICAR como **MEDIUM**

**Justificativa tecnica:**

O DRAFT classifica como CRITICAL afirmando que "se um board for hard-deleted, deals ficam orfaos". Porem:

1. **Boards usam soft delete** (`deleted_at`). A operacao normal NUNCA faz hard delete de boards.
2. **O unico cenario de hard delete seria via `service_role`** (admin manual no Supabase Dashboard ou migration).
3. **Na pratica, isso nunca aconteceu** e o risco real e minimo.
4. **O mesmo se aplica a `deals.stage_id`** -- stages tambem sao gerenciados pelo sistema, nao deletados manualmente.
5. **A severidade CRITICAL implica "produzindo dano agora"**. Nao ha dano atual.

Recomendo ON DELETE SET NULL para `deals.board_id` e `deals.stage_id` como melhoria de robustez (MEDIUM), NAO como fix critico urgente. Incluir no Cluster 4 (Integridade DB).

**Horas:** 2-3 (simples ALTER TABLE + teste)
**Complexidade:** Simples
**Risco:** Baixo (SET NULL e nao-destrutivo)

### TD-DB-027 e TD-DB-028: Nao requerem acao
Confirmados como design choices, nao debitos. Manter no inventario como LOW/informacional mas NAO priorizar. Horas estimadas = 0.

---

## 3. Debitos Adicionados

### TD-DB-NEW-001: `notify_deal_stage_changed()` tem schema de colunas INCOMPATIVEL alem do nome da tabela
**Severidade:** CRITICAL (agravamento de TD-DB-001)
**Fonte:** Comparacao direta entre migration 20260225000000 e migration 20251201000000

A funcao reescrita pelo CodeRabbit (linhas 196-206 de `20260225000000_coderabbit_pr5_fixes.sql`) tenta inserir em `integration_webhook_events` com colunas: `id, organization_id, event_type, payload, status, created_at`.

Porem, a tabela real `webhook_events_out` tem colunas: `id, organization_id, event_type, payload, deal_id, from_stage_id, to_stage_id, created_at` -- **NAO tem coluna `status`**, e TEM colunas `deal_id`, `from_stage_id`, `to_stage_id` que a funcao reescrita ignora.

Da mesma forma, `integration_webhook_deliveries` (que deveria ser `webhook_deliveries`) tem schema diferente: a tabela real tem `organization_id, endpoint_id, event_id, request_id, status, attempted_at, response_status, error` enquanto a funcao tenta inserir `id, event_id, endpoint_id, status, created_at`.

**Impacto:** Corrigir TD-DB-001 NAO e apenas trocar nomes de tabelas. E necessario reescrever os INSERTs para corresponder ao schema real. A funcao original no schema_init (linhas 2177-2205) e o modelo correto.

**Horas:** Ja contabilizado em TD-DB-001 (6-8h inclui essa complexidade)
**Correcao:** Restaurar a funcao ao formato original (schema_init linhas 2114-2209) com as melhorias de seguranca do CodeRabbit (filtros de org_id nos SELECTs) mantidas.

---

### TD-DB-NEW-002: Subquery direta em RLS afeta MUITO mais tabelas que o reportado
**Severidade:** MEDIUM
**Fonte:** Grep em todas as migrations

O DRAFT (TD-DB-010) menciona apenas `contact_phones` e `contact_preferences`. Na realidade, o padrao `(SELECT organization_id FROM public.profiles WHERE id = auth.uid())` em vez de `get_user_organization_id()` esta presente em:

| Tabela | Migration | Policies Afetadas |
|--------|-----------|-------------------|
| contact_phones | 20260226100001 | SELECT, INSERT, UPDATE, DELETE (4) |
| contact_preferences | 20260226100002 | SELECT, INSERT, UPDATE, DELETE (4) |
| notifications | 20260226200001 | SELECT, INSERT, UPDATE (3) |
| lead_score_history | 20260228160135 | SELECT, INSERT (2) |
| deal_notes | 20260226100005 | SELECT, INSERT, UPDATE, DELETE (4) |
| deal_files | 20260226100005 | SELECT, INSERT, UPDATE, DELETE (4) |
| ai_feature_flags | 20260223100000 | Multiplas |
| ai_prompt_templates | 20260223100000 | Multiplas |
| integration_inbound_sources | 20260223100000 | Multiplas |
| integration_outbound_endpoints | 20260223100000 | Multiplas |
| webhook_events_in | 20260223100000 | Multiplas |
| webhook_events_out | 20260223100000 | Multiplas |
| webhook_deliveries | 20260223100000 | Multiplas |

Total: **~13 tabelas** com ~40+ policies usando subquery direta.

**Impacto:** Atualmente funciona porque `profiles_select` usa `get_user_organization_id()` (corrigido em 20260226000001), entao a subquery resolve sem recursao. Porem, qualquer alteracao futura na policy de profiles que adicione condicoes na USING clause pode reintroduzir recursao 42P17 em TODAS essas tabelas simultaneamente.

**Horas:** 8-12 (migration unica para reescrever ~40 policies)
**Complexidade:** Media (repetitiva mas requer teste extensivo)
**Risco:** Baixo (mudar subquery por funcao e semanticamente equivalente)

---

### TD-DB-NEW-003: `merge_contacts()` vulneravel a SQL injection via `format(%I = %L)`
**Severidade:** MEDIUM
**Fonte:** Analise de `20260226100006_merge_contacts_rpc.sql` linhas 45-49

A funcao constroi SQL dinamico usando `format('%I = %L', v_key, p_field_updates->>v_key)` e depois executa via `EXECUTE format('UPDATE contacts SET %s WHERE id = %L', v_set_clause, p_winner_id)`.

Embora `%I` (identifier quoting) e `%L` (literal quoting) do `format()` do PostgreSQL sejam seguros contra SQL injection, e a funcao valida campos contra uma allowlist (`v_allowed_fields`), o uso de EXECUTE com string concatenada em SECURITY DEFINER sempre merece auditoria cuidadosa.

**Risco atual:** BAIXO (allowlist + format escaping protegem). Porem, se alguem adicionar um campo a `v_allowed_fields` com caracteres especiais ou se o formato mudar, o risco aumenta.

**Recomendacao:** Considerar reescrever sem EXECUTE, usando UPDATE direto com CASE statements para cada campo. Agrupar com o fix de org validation (TD-DB-003).

**Horas:** Incluido no fix de TD-DB-003 (4-6h)

---

### TD-DB-NEW-004: `boards.organization_id` nullable com impacto em RLS
**Severidade:** MEDIUM (upgrade de TD-DB-024 de LOW para MEDIUM)

Ja documentado no DRAFT como TD-DB-024 (LOW). Reclassifico como MEDIUM porque boards e uma tabela central: deals referenciam boards via `board_id`, e se um board nao tem `organization_id`, a policy RLS baseada em org pode ter comportamento inesperado em JOINs. Mover para Cluster 4.

---

### TD-DB-NEW-005: Webhook secrets em texto claro deve ser MEDIUM
**Severidade:** MEDIUM (upgrade de TD-DB-030 de LOW para MEDIUM)

Ja documentado no DRAFT como TD-DB-030 (LOW). Reclassifico porque secrets de webhook em texto claro em `integration_inbound_sources.secret` e `integration_outbound_endpoints.secret` representam credenciais de integracao com sistemas externos dos clientes. Um backup de banco vazado expoe esses secrets. RLS protege acesso via API, mas nao protege dados em repouso.

---

## 4. Respostas ao Architect

### Pergunta 1: Mapeamento de campos em `notify_deal_stage_changed()`

> "Alem de corrigir os nomes de tabela em `notify_deal_stage_changed()`, a funcao precisa de mapeamento de campos?"

**Sim, absolutamente.** Os campos NAO correspondem 1:1. Detalhamento:

**`webhook_events_out` (tabela real):**
- `id, organization_id, event_type, payload, deal_id, from_stage_id, to_stage_id, created_at`

**O que a funcao CodeRabbit tenta inserir em `integration_webhook_events`:**
- `id, organization_id, event_type, payload, status, created_at`

Diferencas: a tabela real NAO tem `status` e TEM `deal_id`, `from_stage_id`, `to_stage_id`. A funcao reescrita perde a auditoria granular de qual deal e quais stages mudaram.

**`webhook_deliveries` (tabela real):**
- `id, organization_id, endpoint_id, event_id, request_id, status, attempted_at, response_status, error`

**O que a funcao tenta inserir em `integration_webhook_deliveries`:**
- `id, event_id, endpoint_id, status, created_at`

Diferencas: a tabela real exige `organization_id` (NOT NULL), nao tem `created_at` (usa `attempted_at`), e a funcao nao insere `organization_id`.

**Recomendacao:** Usar a funcao original do schema_init (linhas 2114-2209) como base, adicionando APENAS os filtros de org_id nos SELECTs (a unica melhoria valida do CodeRabbit). Nao inventar novos campos.

---

### Pergunta 2: ON DELETE SET NULL ou CASCADE para deals.board_id/stage_id?

> "Para deals.board_id e deals.stage_id, a preferencia e ON DELETE SET NULL ou ON DELETE CASCADE?"

**ON DELETE SET NULL** para ambos. Justificativa:

1. **Deals sao entidades de alto valor.** Um deal com historico de interacoes, notas, arquivos e valor monetario NAO deve ser deletado em cascata por causa de um board ser removido.
2. **Boards usam soft delete** -- o cenario de hard delete e excepcional (service_role cleanup).
3. **SET NULL preserva o deal** e permite reatribuicao a outro board via UI ou migration.
4. **Para `stage_id`:** SET NULL e preferivel porque o deal pode ser reatribuido a um novo stage sem perda. Um deal sem stage e melhor que um deal deletado.
5. **Consideracao de frontend:** O frontend ja deve lidar com `board_id = null` e `stage_id = null` gracefully (mostrar "Sem board" / "Sem estagio"). Verificar se ha guards no codigo.

---

### Pergunta 3: Unificacao de `system_notifications` e `notifications`

> "Para unificar `system_notifications` e `notifications`, qual tabela deve ser a canonica?"

**`notifications` (Epic 3) deve ser a canonica.** Razoes:

1. **Schema mais rico:** `notifications` tem `contact_id`, `deal_id`, `owner_id`, `is_read`, tipagem via CHECK constraint (BIRTHDAY, CHURN_ALERT, DEAL_STAGNANT, SCORE_DROP). E especifica para CRM.
2. **RLS org-scoped:** `notifications` ja tem policies restritivas (org-level).
3. **`system_notifications` e legado:** Schema simples com `type` generico, `message`, `severity`, `link`, `read_at`. Mais adequado para mensagens de sistema (instalacao, updates), nao para CRM.

**Estrategia de migracao recomendada:**

1. Inventariar queries frontend que leem `system_notifications`. Se zero consumers ativos -> apenas documentar como deprecated, nao migrar dados.
2. Se houver consumers: avaliar se os tipos de `system_notifications` podem ser mapeados para o CHECK constraint de `notifications`. Se nao encaixam nos tipos existentes, adicionar novos tipos ao CHECK.
3. NAO deletar `system_notifications` imediatamente. Marcar como deprecated via COMMENT ON TABLE e planejar remocao em 2-3 sprints.

**Consumidores a verificar:** Buscar por `system_notifications` no codebase frontend (stores, hooks, API calls).

---

### Pergunta 4: Race condition em `merge_contacts()`

> "Na funcao `merge_contacts()`, alem de validar org, existe risco de race condition se dois usuarios tentarem merge simultaneo dos mesmos contatos?"

**Sim, existe risco REAL mas MITIGADO.**

A funcao NAO usa `SELECT FOR UPDATE` ou LOCK explicito. Se dois usuarios simultaneamente tentarem:
- User A: merge(contact_1, contact_2)
- User B: merge(contact_1, contact_3)

Ambos podem executar sem conflito porque operam em rows diferentes. Porem:
- User A: merge(contact_1, contact_2)
- User B: merge(contact_2, contact_3)

Neste caso, User A soft-deleta contact_2, e User B tenta operar em contact_2 (que ja esta deleted). O check `deleted_at IS NULL` na linha 38 protege contra isso -- User B receberia erro "Loser contact not found or already deleted".

**Risco residual:** Se User A e User B fizerem merge com o MESMO winner simultaneamente, ambos podem transferir deals/phones para o winner sem conflito, mas a auditoria (activity log) pode registrar contagens imprecisas porque cada funcao conta antes de transferir.

**Recomendacao:** Adicionar `SELECT ... FOR UPDATE` no SELECT do loser para serializar acessos concorrentes ao mesmo contato:

```sql
SELECT name, organization_id INTO v_loser_name, v_org_id
FROM contacts
WHERE id = p_loser_id AND deleted_at IS NULL
FOR UPDATE;
```

Custo: 0.5h adicional ao fix de TD-DB-003.

---

### Pergunta 5: Migrations idempotentes retroativamente

> "Para tornar migrations idempotentes retroativamente, a preferencia e criar uma migration corretiva ou apenas aplicar o padrao para novas migrations?"

**Apenas aplicar o padrao para NOVAS migrations.** Razoes:

1. **Migrations ja aplicadas NAO serao re-executadas** pelo Supabase CLI. O sistema marca cada migration como aplicada em `supabase_migrations.schema_migrations`.
2. **Criar uma migration retroativa e risco desnecessario:** Reescrever 42 migrations com IF NOT EXISTS pode introduzir bugs novos sem beneficio pratico.
3. **O cenario de "re-run" e raro:** Apenas acontece em recovery manual de banco ou setup de novo ambiente. Nesses casos, rodar todas as migrations do zero funciona.
4. **Padrao para novas migrations:**
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS` ou `CREATE INDEX CONCURRENTLY` (nao-blocking)
   - `ALTER TABLE ADD COLUMN IF NOT EXISTS`
   - `DO $$ IF NOT EXISTS ... END $$` para constraints

**Horas revisadas:** 0h retroativo, 0h adicional (apenas padrao de codificacao para futures).

---

### Pergunta 6: Plano para remover `deals.status`

> "Existe plano para remover a coluna `deals.status` (DEPRECATED)?"

**NAO existe plano formalizado.** Recomendo a seguinte estrategia:

**Fase 1 (Sprint atual):** Auditoria de consumers
- Grep por `deals.status`, `.status`, `status:` no codebase frontend
- Identificar quais queries leem/escrevem `deals.status`
- Verificar se alguma logica depende de `status` ao inves de `stage_id`

**Fase 2 (Proximo sprint):** Deprecation enforcement
- Adicionar COMMENT ON COLUMN: `DEPRECATED: Use stage_id instead. Will be removed in v2.0`
- Criar computed column ou VIEW que mapeia `stage_id` -> status text (compatibilidade)
- Migrar todos os consumers no frontend para usar `stage_id`

**Fase 3 (Sprint seguinte):** Remocao
- Migration: `ALTER TABLE deals DROP COLUMN status`
- NAO usar rename (rename em PostgreSQL adquire ACCESS EXCLUSIVE lock)
- Risco: lock de tabela durante DROP. Em tabelas grandes, preferir horario de baixo trafego

**Mesma estrategia para `profiles.name` e `profiles.avatar`.**

---

## 5. Recomendacoes

### 5.1 Ordem de Resolucao Recomendada

**Sprint 1 -- Seguranca (12-18h)**

| Prioridade | ID | Debito | Horas | Justificativa |
|-----------|-----|--------|-------|---------------|
| 1 | TD-DB-001 + TD-DB-008 + TD-DB-NEW-001 | Fix `notify_deal_stage_changed()` (nomes + campos + org filter) | 6-8 | Feature quebrada em producao. Webhooks outbound nao funcionam |
| 2 | TD-DB-003 + TD-DB-NEW-003 | Fix `merge_contacts()` (org validation + FOR UPDATE + cleanup EXECUTE) | 4-6 | Cross-tenant data manipulation |
| 3 | TD-DB-009 | Fix `increment/decrement_contact_ltv()` (org validation) | 3-4 | Cross-tenant LTV manipulation |

**Sprint 2 -- Seguranca + Performance (8-12h)**

| Prioridade | ID | Debito | Horas | Justificativa |
|-----------|-----|--------|-------|---------------|
| 4 | TD-DB-004 | Restringir RLS de `ai_suggestion_interactions` | 2-3 | Cross-user data access |
| 5 | TD-DB-012 + TD-DB-013 + TD-DB-014 | Adicionar 3 indexes compostos | 3 | Performance (kanban, timeline, dashboard) |
| 6 | TD-DB-006 + TD-DB-015 | N+1 kanban (requer coordenacao com frontend) | 4-6 | Performance. Maior impacto percebido pelo usuario |

**Sprint 3 -- Integridade (12-16h)**

| Prioridade | ID | Debito | Horas | Justificativa |
|-----------|-----|--------|-------|---------------|
| 7 | TD-DB-017 + TD-DB-018 + TD-DB-024 | NOT NULL em org_id (activities, contacts, boards) com backfill | 8-11 | RLS depende de org_id para isolamento |
| 8 | TD-DB-002 (reclassificado) | ON DELETE SET NULL em deals.board_id, deals.stage_id, deals.contact_id | 2-3 | Robustez de integridade referencial |
| 9 | TD-DB-011 | DELETE policy em notifications (se necessario) | 1 | Funcionalidade de cleanup |

**Sprint 4 -- Debt Cleanup (12-18h)**

| Prioridade | ID | Debito | Horas | Justificativa |
|-----------|-----|--------|-------|---------------|
| 10 | TD-DB-NEW-002 | Migrar ~40 policies de subquery para `get_user_organization_id()` | 8-12 | Prevenir recursao RLS futura |
| 11 | TD-DB-030 (reclassificado) | Criptografar webhook secrets com pgcrypto | 6-8 | Seguranca em repouso |

**Sprint 5 -- Consolidacao (8-14h)**

| Prioridade | ID | Debito | Horas | Justificativa |
|-----------|-----|--------|-------|---------------|
| 12 | TD-DB-005 | Unificar system_notifications (se houver consumer) | 6-10 | Dominio limpo |
| 13 | TD-DB-019 + TD-DB-020 + TD-DB-026 | Planejar remocao de colunas deprecated | 4-6 | Depende de auditoria frontend |

**Nao priorizar (manter como LOW):**
- TD-DB-021, TD-DB-022, TD-DB-023, TD-DB-025, TD-DB-027, TD-DB-028, TD-DB-029

---

### 5.2 Estrategia de Migration

**Principios gerais:**

1. **Cada fix = 1 migration file.** NAO consolidar fixes de seguranca com fixes de performance em um unico arquivo.
2. **Todas as migrations dentro de `BEGIN;...COMMIT;`** para atomicidade.
3. **Testar em staging PRIMEIRO** (`supabase db push`). Verificar com queries manuais.
4. **Produzir migration + rollback script** para cada fix.
5. **Indexes: usar `CREATE INDEX CONCURRENTLY`** (nao bloqueia reads/writes). ATENCAO: CONCURRENTLY nao pode rodar dentro de transacao -- separar em migration propria.

**Para fixes de funcoes (TD-DB-001, TD-DB-003, TD-DB-009):**
```sql
-- Padrao: CREATE OR REPLACE FUNCTION (atomico, sem downtime)
-- Rollback: guardar versao anterior como comentario no script
BEGIN;
-- Salvar versao anterior para rollback (como referencia)
-- ORIGINAL: [paste da funcao atual]
CREATE OR REPLACE FUNCTION ... AS $$ ... $$;
COMMIT;
```

**Para ON DELETE SET NULL (TD-DB-002 reclassificado):**
```sql
-- Requer DROP + ADD constraint (ALTER CONSTRAINT nao suporta ON DELETE change)
-- Lock implicito: ACCESS EXCLUSIVE na tabela por milessimos
BEGIN;
ALTER TABLE deals DROP CONSTRAINT deals_board_id_fkey;
ALTER TABLE deals ADD CONSTRAINT deals_board_id_fkey
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL;
-- ... similar para stage_id, contact_id
COMMIT;
```

**Para NOT NULL enforcement (TD-DB-017, TD-DB-018, TD-DB-024):**
```sql
-- CRITICO: Backfill ANTES de NOT NULL
BEGIN;
-- 1. Backfill orfaos (derivar org_id de relacao pai)
UPDATE contacts SET organization_id = (
  SELECT organization_id FROM profiles WHERE id = contacts.owner_id
) WHERE organization_id IS NULL AND owner_id IS NOT NULL;
-- 2. Verificar se restam NULLs
-- SELECT COUNT(*) FROM contacts WHERE organization_id IS NULL;
-- 3. SET NOT NULL (falha se existem NULLs)
ALTER TABLE contacts ALTER COLUMN organization_id SET NOT NULL;
COMMIT;
```

---

### 5.3 Riscos de Implementacao

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Fix de `notify_deal_stage_changed()` com campos errados | Media | Alto (webhook continua quebrado) | Testar em staging com deal move real e verificar insert em `webhook_events_out` |
| Backfill de org_id encontra registros sem owner_id | Media | Medio (NOT NULL falha) | Executar SELECT COUNT(*) antes do ALTER; resolver orfaos manualmente |
| Lock de tabela durante ALTER CONSTRAINT em deals | Baixa | Medio (bloqueio momentaneo) | Executar em horario de baixo trafego; deals tem ~poucos milhares de rows neste estagio |
| Subquery -> function migration quebra policies existentes | Baixa | Alto (perda de acesso) | Testar CADA tabela pos-migration com query manual como usuario regular |
| `merge_contacts()` fix quebra frontend que depende do retorno | Baixa | Baixo | A funcao retorna JSONB; manter mesmo schema de retorno |
| Indexes CONCURRENTLY falham no meio | Baixa | Baixo | Re-rodar; index invalido e auto-limpo |

---

### 5.4 Estimativa Total Revisada

| Cluster | Horas Estimadas (DRAFT) | Horas Revisadas | Delta |
|---------|------------------------|-----------------|-------|
| Seguranca DB (Sprint 1) | 8-18h | 13-18h | +5h (complexidade campos webhook) |
| Seguranca + Performance (Sprint 2) | 6-12h | 9-12h | +3h (indexes) |
| Integridade (Sprint 3) | 12-24h | 11-15h | -5h (TD-DB-002 simplificado) |
| Debt Cleanup (Sprint 4) | 6-12h | 14-20h | +8h (escopo real subquery muito maior) |
| Consolidacao (Sprint 5) | 12-20h | 10-16h | -4h (system_notifications pode nao precisar migracao) |
| **Total DB** | **~74-116h** | **~57-81h** | Reducao por reclassificacao e priorizacao |

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @data-engineer (DB Sage) | Review inicial. 30 debitos validados, 1 reclassificado (TD-DB-002 CRITICAL -> MEDIUM), 5 debitos adicionados/expandidos (TD-DB-NEW-001 a NEW-005). 6 perguntas do architect respondidas. Ordem de resolucao em 5 sprints proposta. |
