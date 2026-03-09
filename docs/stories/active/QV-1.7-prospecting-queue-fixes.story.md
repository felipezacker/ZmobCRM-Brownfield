# Story QV-1.7: Prospecting — Fila + Filas Salvas

## Metadata
- **Story ID:** QV-1.7
- **Epic:** QV (Quality Validation)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 5
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** usuario do ZmobCRM usando prospeccao,
**I want** que a fila de contatos respeite limites e previna duplicatas, que filas salvas restaurem corretamente, e que metas individuais por corretor funcionem,
**so that** minha experiencia de prospeccao seja confiavel e previsivel.

## Descricao

**Bug #6 (LOW):** Adicao individual de contato a fila nao respeita o limite de 100 contatos. A adicao em lote (`addBatchToQueue`) ja respeita esse limite, mas o handler individual em `AddToQueueSearch` nao possui essa validacao.

**Bug #7 (LOW):** Adicao individual permite duplicatas na fila. Novamente, a adicao em lote ja previne duplicatas, mas o handler individual carece desse check.

**Bug #8 (MEDIUM):** Carregar uma fila salva nao restaura os contatos — apenas reabre o painel de filtros. O schema atual de `prospecting_saved_queues` provavelmente persiste apenas os filtros (query params) e nao os IDs resultantes da fila no momento do save.

**Bug #9 (MEDIUM):** Ao configurar meta diaria individual para um corretor (ex: Gustavo) no `GoalConfigModal`, a visualizacao do `DailyGoalCard` nao atualiza para mostrar a meta do corretor filtrado — permanece exibindo a meta do usuario logado via `useMyDailyGoal()`. O problema e que o `DailyGoalCard` nao recebe/consome um `viewOwnerId` apos o save.

## Acceptance Criteria

- [x] AC1: Given a fila com 100 contatos, when adiciono um contato individual via `AddToQueueSearch`, then a adicao e bloqueada e um toast de warning exibe "Limite de 100 contatos atingido"
- [x] AC2: Given um contato ja presente na fila, when tento adiciona-lo individualmente via `AddToQueueSearch`, then a adicao e bloqueada e um toast de warning exibe "Contato ja esta na fila"
- [x] AC3: Given uma fila salva existente, when clico para carregar essa fila salva, then os contatos da fila sao restaurados na fila atual (substituindo a fila corrente, nao adicionando), e contatos deletados desde o save sao filtrados silenciosamente
- [x] AC4: Given o painel de metricas filtrado por um corretor (viewOwnerId), when admin configura meta diaria para aquele corretor via `GoalConfigModal`, then o `DailyGoalCard` atualiza para mostrar a meta do corretor filtrado (nao do admin logado)

## Scope

### IN
- Validacao de limite de 100 na adicao individual (`AddToQueueSearch` + `useProspectingQueue`)
- Validacao de duplicatas na adicao individual
- Fix de restauracao de filas salvas: persistir IDs de contatos + restaurar ao carregar
- Fix de visualizacao de meta individual: propagar `viewOwnerId` para `DailyGoalCard` apos save no `GoalConfigModal`
- Tratar edge case de contatos deletados em filas salvas (filtrar silenciosamente)

### OUT
- Mudancas na adicao em lote (ja funciona corretamente)
- Novas features de prospeccao nao relacionadas a estes bugs
- Mudancas no Kanban quick-add (QuickAddType separado)

## Dependencies

- `features/prospecting/__tests__/` — 22 arquivos de teste existentes (referencia para testes de regressao)
- `lib/supabase/prospecting-queues.ts` — `addBatchToQueue()` com validacao de dedup existente (replicar logica de dedup para adicao individual)
- `lib/supabase/prospecting-saved-queues.ts` — schema atual (a ser estendido para persistir IDs)
- `features/prospecting/components/FilteredContactsList.tsx` — QUEUE_LIMIT=100 (constante de referencia)
- Staging com 100+ contatos disponivel para testes manuais

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Schema change em prospecting_saved_queues quebra filas salvas existentes | Media | Alto | Migration + backward compat: campo `contact_ids` null-safe |
| viewOwnerId nao disponivel no contexto onde DailyGoalCard e renderizado | Media | Medio | Mapear fluxo completo em 4.1 antes de implementar |
| Contatos deletados causam erro silencioso ao carregar fila salva | Baixa | Baixo | Filtrar por IDs existentes via query (subtask 3.5) |

## Business Value

Quatro bugs validados em producao/staging que degradam a experiencia de prospeccao. Bug #8 (fila salva) e particularmente impactante — corretores salvam filas para sessoes futuras, mas ao carregar encontram uma fila vazia. Isso quebra o fluxo de trabalho e gera retrabalho manual.

## Criteria of Done

- [x] AC1 verificado manualmente: fila com 100 contatos bloqueia adicao individual com toast correto
- [x] AC2 verificado manualmente: contato duplicado bloqueado com toast correto
- [x] AC3 verificado manualmente: fila salva carregada restaura contatos (nao apenas filtros)
- [x] AC4 verificado manualmente: DailyGoalCard reflete meta do corretor filtrado apos GoalConfigModal save
- [x] Edge case AC3: contatos deletados sao ignorados silenciosamente (sem erro na UI)
- [x] `npm run typecheck` passa sem erros novos
- [x] `npm run lint` passa sem erros novos
- [x] `npm test` passa (regressao em features/prospecting/__tests__)
- [x] File List atualizado com arquivos modificados

## Tasks

- [x] Task 1 (AC1): Adicionar validacao de limite de 100 no handler de adicao individual
  - [x] 1.1: Localizar em `useProspectingQueue.ts` o metodo `addToQueue()` (adicao individual)
  - [x] 1.2: Replicar logica de limite baseada em `QUEUE_LIMIT=100` de `FilteredContactsList.tsx` (linha 9). NOTA: `addBatchToQueue()` tem logica de dedup, nao de limite — o check de limite esta em `FilteredContactsList.tsx` (linha 84)
  - [x] 1.3: Disparar toast de warning "Limite de 100 contatos atingido" ao bloquear
  - [x] 1.4: Atualizar `AddToQueueSearch.tsx` para consumir o erro/retorno de bloqueio

- [x] Task 2 (AC2): Adicionar validacao de duplicata no handler de adicao individual
  - [x] 2.1: Replicar logica de deduplicacao do `addBatchToQueue()` para `addToQueue()`
  - [x] 2.2: Disparar toast de warning "Contato ja esta na fila" ao bloquear duplicata
  - [x] 2.3: Garantir que a verificacao ocorre antes do request ao banco

- [x] Task 3 (AC3): Corrigir carregamento de fila salva — salvar IDs dos contatos e restaurar ao carregar
  - [x] 3.1: Decidir schema — adicionar campo `contact_ids: string[]` ao JSONB `filters` em `prospecting_saved_queues`, ou coluna separada (decisao a documentar no story change log)
  - [x] 3.2: Modificar `useSavedQueues.saveQueue()` para persistir IDs dos contatos junto com os filtros no momento do save
  - [x] 3.3: Modificar `getFiltersFromSaved()` para restaurar contatos a partir dos IDs persistidos (NOTA: `loadQueue()` nao existe como funcao — usar `getFiltersFromSaved()` de `useSavedQueues.ts`)
  - [x] 3.4: Definir UX: carregar fila salva SUBSTITUI a fila atual (nao adiciona ao topo)
  - [x] 3.5: Tratar edge case — contatos salvos que nao existem mais devem ser filtrados silenciosamente (query com `IN (ids)` retornara apenas os existentes)

- [x] Task 4 (AC4): Meta individual por corretor — propagar viewOwnerId para DailyGoalCard
  - [x] 4.1: Mapear o mecanismo de `viewOwnerId` no contexto de metricas: onde e definido, como flui ate o painel
  - [x] 4.2: Propagar `viewOwnerId` para o componente `DailyGoalCard` (via props ou contexto)
  - [x] 4.3: Modificar `DailyGoalCard` para aceitar `viewOwnerId` e usar hook alternativo ao `useMyDailyGoal()` quando um owner externo esta filtrado
  - [x] 4.4: Invalidar cache de goals no React Query apos save no `GoalConfigModal`, garantindo re-fetch com o owner correto

- [x] Task 5: Quality gate
  - [x] 5.1: `npm run typecheck` sem novos erros
  - [x] 5.2: `npm run lint` sem novos erros
  - [x] 5.3: `npm test` — regressao completa em `features/prospecting/__tests__/`

## Dev Notes

### Contexto Tecnico

- Validacoes de limite e duplicata ja existem em `addBatchToQueue()` em `lib/supabase/prospecting-queues.ts` — replicar essa logica para o handler individual em vez de reimplementar do zero.
- Filas salvas provavelmente salvam apenas filtros (query params) no campo JSONB `filters` de `prospecting_saved_queues`. O fix do Bug #8 exige estender esse schema para incluir os IDs resultantes.
- Bug #9: `DailyGoalCard` consome `useMyDailyGoal()` que retorna a meta do usuario logado. Nao ha conceito de `viewOwnerId` nesse hook. A solucao envolve propagar o `viewOwnerId` do painel de metricas ate o card e usar um hook/query parametrizado quando um owner externo esta selecionado.

### Source Tree

**Arquivos a modificar:**
- `features/prospecting/components/AddToQueueSearch.tsx` — Tasks 1, 2: consumir bloqueio de limite e duplicata, exibir toasts
- `features/prospecting/hooks/useProspectingQueue.ts` — Tasks 1, 2: adicionar checks em `addToQueue()`
- `features/prospecting/hooks/useSavedQueues.ts` — Task 3: salvar/restaurar IDs de contatos
- `lib/supabase/prospecting-saved-queues.ts` — Task 3: schema de persistencia (contact_ids)
- `features/prospecting/components/GoalConfigModal.tsx` — Task 4: invalidar cache apos save
- `features/prospecting/components/DailyGoalCard.tsx` — Task 4: aceitar viewOwnerId como prop
- `features/prospecting/hooks/useProspectingGoals.ts` — Task 4: suportar owner filtrado

**Arquivos de referencia (somente leitura):**
- `features/prospecting/components/FilteredContactsList.tsx` — constante QUEUE_LIMIT=100
- `lib/supabase/prospecting-queues.ts` — `addBatchToQueue()` com validacoes existentes (referencia de logica)
- `features/prospecting/__tests__/` — 22 arquivos de teste (referencia de regressao)

### Testing

**Abordagem:** Manual + Regressao automatizada (testes existentes)
**Framework:** Jest + React Testing Library
**Cenarios por AC:**
- AC1: Fila com 100 contatos no staging → adicionar 1 contato individual → deve bloquear com toast "Limite de 100 contatos atingido"
- AC2: Contato ja presente na fila → adicionar novamente → deve bloquear com toast "Contato ja esta na fila"
- AC3: Salvar fila com N contatos → recarregar pagina → carregar fila salva → contatos devem ser restaurados (nao apenas filtros reabertos); testar tambem com 1 contato deletado no staging para verificar filtragem silenciosa
- AC4: Admin logado no staging → filtrar painel por corretor Gustavo → GoalConfigModal → salvar meta → DailyGoalCard deve exibir meta do Gustavo (nao do admin)
**Testes existentes relevantes:** `features/prospecting/__tests__/` (22 arquivos) — rodar regressao completa apos cada task
**Dados de teste necessarios:** 100+ contatos no staging, fila salva existente, 2 corretores com roles distintos (admin + corretor)

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Full-Stack
- Complexity: High
- Secondary Types: State Management, Database

**Specialized Agent Assignment:**
- Primary: @dev
- Type-specific: @data-engineer (se migration for necessaria para coluna separada em prospecting_saved_queues)

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED
- [ ] Pre-PR review (@devops) — if PR created

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Queue validation logic (limite 100, duplicatas em addToQueue)
- JSONB schema changes em prospecting_saved_queues (contact_ids null-safe)
- React Query cache invalidation apos GoalConfigModal save
- State propagation entre GoalConfigModal e DailyGoalCard (viewOwnerId)
- Edge cases: contatos deletados em filas salvas restauradas

## File List

| Arquivo | Acao | Task |
|---------|------|------|
| `features/prospecting/hooks/useProspectingQueue.ts` | Modified | 1, 2 — QUEUE_LIMIT + validacao limite/duplicata em addToQueue() |
| `features/prospecting/hooks/useSavedQueues.ts` | Modified | 3 — saveQueue aceita contactIds, getContactIdsFromSaved() |
| `features/prospecting/hooks/useProspectingGoals.ts` | Modified | 4 — aceita viewOwnerId, usa useDailyGoalByOwner |
| `features/prospecting/ProspectingPage.tsx` | Modified | 3, 4 — handleLoadSavedQueue restaura contatos, saveQueue persiste IDs, goalsHook com metricsFilterOwnerId |
| `lib/supabase/prospecting-saved-queues.ts` | Modified | 3 — SavedQueue.filters.contact_ids, create() aceita contactIds |
| `lib/supabase/prospecting-goals.ts` | Modified | 4 — getGoalByOwner() |
| `lib/query/hooks/useDailyGoalsQuery.ts` | Modified | 4 — useDailyGoalByOwner() |
| `features/prospecting/__tests__/useSavedQueues.test.ts` | Modified | 5 — expect atualizado para novo param contactIds |
| `features/prospecting/__tests__/useProspectingQueue.test.ts` | Modified | 5 — 2 testes adicionados: limite 100 + duplicata |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @sm | Rework aplicado por solicitacao do @po: SYS-1 (CodeRabbit Integration), SYS-2 (Testing em Dev Notes), SYS-3 (Source Tree em Dev Notes), SYS-4 (Tasks decompostas em Subtasks); FIX-1.7.1 (AC4 reescrito com viewOwnerId), FIX-1.7.2 (Task 3 com decisao de schema e edge cases), FIX-1.7.3 (toasts especificados em AC1 e AC2), FIX-1.7.4 (Task 4 decomposta em subtasks); secoes Dependencies, Risks, Business Value e Criteria of Done adicionadas |
| 2026-03-09 | @po | Validacao GO CONDICIONAL (10/10, readiness 9/10). Status Draft -> Ready. Should-fix: SF-1 subtask 1.2 referencia limite em addBatchToQueue mas limite real esta em FilteredContactsList.tsx (QUEUE_LIMIT=100), nao em addBatchToQueue (que so tem dedup). SF-2 Dependencies idem. Dev deve usar FilteredContactsList como referencia para limite e addBatchToQueue apenas para dedup. NH-1 loadQueue() nao existe como funcao, usar getFiltersFromSaved(). |
| 2026-03-09 | @sm | Fix SF-1: subtask 1.2 corrigida (FilteredContactsList como referencia de limite, nao addBatchToQueue). Fix SF-2: Dependencies corrigido. Fix NH-1: loadQueue() substituido por getFiltersFromSaved(). quality_gate corrigido de @qa para @architect |
| 2026-03-09 | @dev | Implementacao completa: Tasks 1-5. Schema decision: contact_ids armazenado dentro do JSONB filters (sem migration). Bug #9 resolvido via useDailyGoalByOwner + viewOwnerId propagado de metricsFilterOwnerId. 22 test suites / 282 tests passando. typecheck e lint OK. |
| 2026-03-09 | @qa | Review CONCERNS: TEST-GAP-1 (sem testes limite/duplicata), CONCERN-1 (clearQueue+addBatch nao atomico), CONCERN-2 (targetOwnerId ao carregar fila salva) |
| 2026-03-09 | @dev | Fix QA: +2 testes (limite 100 + duplicata), try/catch unificado com refetch no catch, targetOwnerId usa resolvedViewOwnerId. 284 tests passando. |
| 2026-03-09 | @qa | Re-review PASS. Todas as 3 issues resolvidas. Gate aprovado. |
| 2026-03-09 | @po | Testes manuais AC1-AC4 confirmados pelo usuario. Status Ready for Review -> Done. Commit dfc9d76. |

---
*Story gerada por @sm (River) — Epic QV*
