# Story RT-0.1: Fix trigger `notify_deal_stage_changed` — tabelas incorretas

## Metadata
- **Story ID:** RT-0.1
- **Epic:** RT (Realtime Everywhere)
- **Status:** Done
- **Priority:** P0
- **Estimated Points:** 2 (XS)
- **Phase:** 0 (Bugs Criticos)
- **Assigned Agent:** @data-engineer

## Executor Assignment
- **executor:** @data-engineer
- **quality_gate:** @qa
- **quality_gate_tools:** [migration_review, trigger_test, integration_test]

## Story

**As a** administrador do ZmobCRM que configurou webhooks outbound para integracoes externas,
**I want** que o trigger `notify_deal_stage_changed` insira corretamente eventos nas tabelas `webhook_events_out` e `webhook_deliveries`,
**so that** mudancas de estagio de deals disparem webhooks corretamente para sistemas integrados.

## Descricao

A funcao trigger `notify_deal_stage_changed()` foi refatorada na migration `20260225000000_coderabbit_pr5_fixes.sql` para adicionar filtros de `organization_id` e tornar-se SECURITY DEFINER. Porem, durante a refatoracao, os nomes das tabelas foram alterados incorretamente:

- `webhook_events_out` → `integration_webhook_events` (NAO EXISTE)
- `webhook_deliveries` → `integration_webhook_deliveries` (NAO EXISTE)

**Consequencia:** Todo INSERT falha com "relation not found". Nenhum webhook outbound e disparado quando deals mudam de estagio. A funcionalidade esta 100% quebrada desde a migration de fevereiro.

A versao original na migration `20251201000000_schema_init.sql` (linhas 2177-2183) usava os nomes corretos.

## Acceptance Criteria

- [x] AC1: Given um deal que muda de stage_id, when o trigger `notify_deal_stage_changed` dispara, then um registro e inserido em `webhook_events_out` com event_type `deal.stage_changed`, payload contendo deal_id, contact info, from_stage e to_stage
- [x] AC2: Given um evento inserido em `webhook_events_out` e endpoints ativos em `integration_outbound_endpoints`, when o trigger processa os endpoints, then um registro e inserido em `webhook_deliveries` para cada endpoint com status `queued`
- [x] AC3: Given a nova migration aplicada, when `SELECT * FROM pg_proc WHERE proname = 'notify_deal_stage_changed'` e executado, then a funcao NAO referencia `integration_webhook_events` nem `integration_webhook_deliveries`
- [x] AC4: Given a correcao aplicada, when nenhum endpoint outbound esta configurado para a organizacao, then o trigger completa sem erro e sem inserir eventos

## Scope

### IN
- Nova migration SQL corrigindo os nomes das tabelas na funcao `notify_deal_stage_changed()`
- Manter todas as melhorias da refatoracao PR#5 (SECURITY DEFINER, filtro organization_id, UUID pre-gerado)
- Alinhar schema do INSERT com as colunas reais de `webhook_events_out` e `webhook_deliveries`

### OUT
- Alteracao na logica de payload do trigger (apenas fix de nomes de tabelas)
- Criacao de novas tabelas
- Alteracao na estrutura de `webhook_events_out` ou `webhook_deliveries`
- Frontend/UI changes
- Testes de integracao end-to-end com webhooks reais

## Tasks

### Task 1 — Criar migration de correcao (AC1, AC2, AC3)
- [x] Task 1.1: Criar migration `supabase/migrations/20260312100004_fix_notify_deal_stage_changed_tables.sql`
  - `CREATE OR REPLACE FUNCTION public.notify_deal_stage_changed()` com correcoes
  - Substituir `integration_webhook_events` por `webhook_events_out`
  - Substituir `integration_webhook_deliveries` por `webhook_deliveries`
  - Alinhar colunas do INSERT com schema real de `webhook_events_out` (id, organization_id, event_type, payload, deal_id, from_stage_id, to_stage_id, created_at)
  - Alinhar colunas do INSERT com schema real de `webhook_deliveries` (id, organization_id, endpoint_id, event_id, status, attempted_at)
  - Manter SECURITY DEFINER e filtro de organization_id da refatoracao PR#5
- [x] Task 1.2: Verificar que o trigger ainda esta registrado (trigger usa `CREATE OR REPLACE FUNCTION`, trigger `trg_notify_deal_stage_changed` permanece intacto)

### Task 2 — Validacao (AC3, AC4)
- [x] Task 2.1: Aplicar migration no staging (`supabase db push`)
- [x] Task 2.2: Verificar que funcao nao referencia tabelas incorretas: 0 ocorrencias de `integration_webhook_events`/`integration_webhook_deliveries`
- [x] Task 2.3: Testar cenario sem endpoints configurados — trigger completou sem erro, 0 eventos criados
- [x] Task 2.4: Testar cenario com endpoint configurado — INSERT em `webhook_events_out` e `webhook_deliveries` confirmado

### Task 3 — Quality Gate
- [ ] Task 3.1: Review da migration por @dev (nomes de tabelas, colunas, SECURITY DEFINER)
- [x] Task 3.2: Verificar que nenhuma outra referencia a `integration_webhook_events`/`integration_webhook_deliveries` existe no codebase (apenas na migration antiga PR#5, nenhuma no codigo da aplicacao)

## Dev Notes

### Contexto do Bug

**Migration original (correta):**
[Source: `supabase/migrations/20251201000000_schema_init.sql` linhas 2177-2183]
```sql
INSERT INTO public.webhook_events_out (organization_id, event_type, payload, deal_id, from_stage_id, to_stage_id)
VALUES (NEW.organization_id, 'deal.stage_changed', payload, NEW.id, OLD.stage_id, NEW.stage_id)
RETURNING id INTO event_id;

INSERT INTO public.webhook_deliveries (organization_id, endpoint_id, event_id, status)
VALUES (NEW.organization_id, endpoint.id, event_id, 'queued')
RETURNING id INTO delivery_id;
```

**Migration refatorada (com bug):**
[Source: `supabase/migrations/20260225000000_coderabbit_pr5_fixes.sql` linhas 196-206]
```sql
INSERT INTO public.integration_webhook_events (
  id, organization_id, event_type, payload, status, created_at
) VALUES (
  event_id, NEW.organization_id, 'deal.stage_changed', payload, 'pending', now()
);

INSERT INTO public.integration_webhook_deliveries (
  id, event_id, endpoint_id, status, created_at
) VALUES (
  delivery_id, event_id, endpoint.id, 'pending', now()
);
```

**Diferencas alem dos nomes de tabelas:**
- Refatoracao adicionou colunas `status` e `created_at` que NAO existem em `webhook_events_out` (nao tem coluna `status`)
- Refatoracao removeu colunas `deal_id`, `from_stage_id`, `to_stage_id` do INSERT em `webhook_events_out`
- Refatoracao removeu `organization_id` do INSERT em `webhook_deliveries`
- Refatoracao usa `RETURNING` implicitamente diferente — a versao original usa `RETURNING id INTO event_id` apos o INSERT

**Schema real de `webhook_events_out`:**
[Source: `supabase/migrations/20251201000000_schema_init.sql` linhas 1976-1988]
```
id UUID PK (default gen_random_uuid())
organization_id UUID NOT NULL FK → organizations
event_type TEXT NOT NULL
payload JSONB NOT NULL DEFAULT '{}'
deal_id UUID FK → deals (nullable)
from_stage_id UUID FK → board_stages (nullable)
to_stage_id UUID FK → board_stages (nullable)
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
Nota: NAO tem coluna `status`.

**Schema real de `webhook_deliveries`:**
[Source: `supabase/migrations/20251201000000_schema_init.sql` linhas 1991-2003]
```
id UUID PK (default gen_random_uuid())
organization_id UUID NOT NULL FK → organizations
endpoint_id UUID NOT NULL FK → integration_outbound_endpoints
event_id UUID NOT NULL FK → webhook_events_out
request_id BIGINT (nullable)
status TEXT NOT NULL DEFAULT 'queued'
attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
response_status INT (nullable)
error TEXT (nullable)
```

### Arquivos Afetados

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `supabase/migrations/20251201000000_schema_init.sql` | 1976-2003 | Definicao das tabelas corretas (referencia) |
| `supabase/migrations/20251201000000_schema_init.sql` | 2110-2210 | Trigger original correto (referencia) |
| `supabase/migrations/20260225000000_coderabbit_pr5_fixes.sql` | 114-232 | Funcao refatorada com bug |

### Decisoes para @data-engineer

- A funcao refatorada adicionou `status` ao INSERT de `webhook_events_out` mas essa coluna NAO existe na tabela. Remover.
- Restaurar colunas `deal_id`, `from_stage_id`, `to_stage_id` no INSERT de `webhook_events_out` (existem na tabela original).
- Restaurar `organization_id` no INSERT de `webhook_deliveries`.
- Manter SECURITY DEFINER e SET search_path da refatoracao PR#5 (necessario para bypass de RLS).
- Manter o filtro `AND e.organization_id = NEW.organization_id` no SELECT de endpoints (seguranca multi-tenant).

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Database
- Complexity: Low (1 migration, 1 funcao, fix de nomes)
- Secondary Types: N/A

**Specialized Agent Assignment:**
- Primary: @data-engineer (migration SQL)
- Supporting: @dev (quality gate review)

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — review da migration SQL
- [ ] Pre-PR review (@devops) — if PR created

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Nomes de tabelas corretos (`webhook_events_out`, `webhook_deliveries`)
- Colunas do INSERT alinhadas com schema real
- SECURITY DEFINER mantido
- Filtro organization_id mantido (multi-tenant)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Colunas do INSERT desalinhadas com schema atual | Baixa | Alto | Verificar schema real via `\d webhook_events_out` antes de escrever migration |
| Trigger nao re-registrado apos CREATE OR REPLACE | Muito Baixa | Alto | Verificar `pg_trigger` apos migration |
| Conflito com outra migration pendente | Baixa | Baixo | Verificar `supabase migration list` antes de criar |

## Dependencies

- **Nenhuma dependencia de outras stories** — RT-0.1 pode ser implementada imediatamente
- **Bloqueante para:** Nenhuma story depende diretamente, mas a funcionalidade de webhooks outbound so volta a funcionar com este fix

## Testing

- Testar `UPDATE deals SET stage_id = 'novo-stage' WHERE id = 'deal-id'` com e sem endpoints configurados
- Verificar `SELECT * FROM webhook_events_out ORDER BY created_at DESC LIMIT 1` apos update
- Verificar `SELECT * FROM webhook_deliveries ORDER BY attempted_at DESC LIMIT 1` apos update com endpoint ativo

## Criteria of Done

- [x] Migration criada e aplicada sem erros no staging
- [x] Funcao `notify_deal_stage_changed` NAO referencia tabelas inexistentes
- [x] INSERT em `webhook_events_out` usa colunas corretas do schema
- [x] INSERT em `webhook_deliveries` usa colunas corretas do schema
- [x] Trigger dispara sem erro quando deal muda de stage (com e sem endpoints)
- [x] Nenhuma regressao em funcionalidade existente de deals
- [ ] Review por @dev aprovado

## QA Results

**Reviewer:** @qa (Quinn)
**Date:** 2026-03-12
**Verdict:** PASS

| Check | Result |
|-------|--------|
| Code Review | PASS — tabelas e colunas corretas, idempotente |
| Testes | PASS — 4 cenarios validados no staging |
| Acceptance Criteria | PASS — AC1-AC4 todos validados |
| No Regressions | PASS — trigger e funcao signature inalterados |
| Performance | N/A — mesma complexidade |
| Security | PASS — SECURITY DEFINER + search_path + org_id filters |
| Documentacao | PASS — header da migration explica o bug e fix |

**Staging Evidence:**
- Trigger `trg_notify_deal_stage_changed` ativo, WHEN clause correta
- `prosecdef=true`, `proconfig={search_path=public}`
- INSERT columns alinhadas com schema real (verificado via `information_schema.columns`)
- Zero referencias a `integration_webhook_events`/`integration_webhook_deliveries` no prosrc

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/20260312100004_fix_notify_deal_stage_changed_tables.sql` | Created | Migration corrigindo nomes de tabelas e colunas na funcao trigger |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-12 | @sm | Story criada a partir do Epic RT (Realtime Everywhere), Fase 0 |
| 2026-03-12 | @po | Validacao GO (10/10). Status Draft → Ready. 3 should-fix nao-bloqueantes documentados. |
| 2026-03-12 | @po | Fix: quality_gate @dev → @qa (alinhamento com epic corrigido) |
| 2026-03-12 | @data-engineer | Implementacao: migration 20260312100004 criada, aplicada no staging, todos ACs validados |
| 2026-03-13 | @qa | QA Gate: PASS. 7-point check completo, zero issues. |
| 2026-03-13 | @dev | Status InProgress → Done. Story completa. |

---
*Story gerada por @sm (River) — Epic RT (Realtime Everywhere)*
