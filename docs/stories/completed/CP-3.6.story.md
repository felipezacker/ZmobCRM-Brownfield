# Story CP-3.6: Contatos Negligenciados + Comparativo de Performance + Objecoes

## Metadata
- **Story ID:** CP-3.6
- **Epic:** CP-3 (Prospeccao com IA + Melhorias da Central)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 8 (M)
- **Wave:** 2
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** corretor/gestor usando a aba Metricas da Central de Prospeccao,
**I want** ver alertas de contatos quentes negligenciados, comparar minha performance com a media do time, e ter objecoes registradas automaticamente,
**so that** nao perca leads quentes, saiba onde melhorar, e tenha dados sobre as objecoes mais comuns.

## Descricao

3 widgets de inteligencia para a aba Metricas:

1. **NeglectedContactsAlert**: Alerta de contatos HOT/WARM sem contato >7 dias com acao direta de adicionar a fila.
2. **PerformanceComparison**: "Voce vs. Media do time" — metricas do corretor lado-a-lado com media, com indicador visual (acima/abaixo).
3. **Persistencia de objecoes**: Quando corretor marca checkboxes de objecao no ScriptGuide, salvar no `metadata.objections` da activity + widget "Top 5 objecoes".

## Acceptance Criteria

### Contatos negligenciados
- [x] AC1: Given contatos HOT/WARM com >7 dias sem contato e status ACTIVE, when a aba Metricas carrega, then exibe alerta "X leads quentes sem contato ha mais de 7 dias"
- [x] AC2: Given o alerta, when renderizado, then lista top 5 com nome, score, temperatura, dias sem contato
- [x] AC3: Given o alerta com contatos, when clico "Adicionar todos a fila", then adiciona em batch a fila de prospeccao
- [x] AC4: Given 0 contatos negligenciados, when aba Metricas carrega, then alerta nao aparece (sem empty state)

### Comparativo de performance
- [x] AC5: Given um corretor na aba Metricas, when renderizado, then exibe PerformanceComparison com suas metricas vs media do time
- [x] AC6: Given metricas comparadas (calls/dia, connection rate, avg duration, unique contacts), when corretor esta acima da media, then indicador verde com seta para cima
- [x] AC7: Given metricas comparadas, when corretor esta abaixo da media, then indicador vermelho com seta para baixo
- [x] AC8: Given usuario admin/diretor, when na aba Metricas, then PerformanceComparison nao aparece (usam CorretorRanking)

### Persistencia de objecoes
- [x] AC9: Given o ProspectingScriptGuide com checkboxes de objecao, when corretor marca objecoes durante ligacao, then objecoes sao salvas em `metadata.objections: string[]` da activity
- [x] AC10: Given objecoes persistidas, when aba Metricas renderiza, then exibe widget "Top 5 objecoes" com objecao e contagem
- [x] AC11: Given 0 objecoes registradas, when widget renderiza, then exibe "Nenhuma objecao registrada. Marque objecoes durante ligacoes para ver dados aqui."

## Scope

### IN
- Componente `NeglectedContactsAlert` acima dos MetricsCards
- Componente `PerformanceComparison` abaixo do DailyGoalCard (apenas corretores)
- Persistir objecoes em `metadata.objections` ao marcar checkboxes no ScriptGuide
- Widget `TopObjections` na aba Metricas
- Testes unitarios

### OUT
- Notificacoes push sobre contatos negligenciados
- Score de "saude do pipeline" baseado em negligenciados
- Export de objecoes para relatorio
- Gamificacao (badges por superar media)

## Tasks

### Task 1 — NeglectedContactsAlert (AC1, AC2, AC3, AC4)
- [x] Task 1.1: Criar componente `features/prospecting/components/NeglectedContactsAlert.tsx`
  - Query: RPC existente `get_prospecting_filtered_contacts` com `p_inactive_days=7` e `p_temperatures=['HOT','WARM']`
  - Exibir: icone alerta, contagem, lista top 5 (nome, LeadScoreBadge, temperatura, "{N} dias sem contato")
  - Botao "Adicionar todos a fila" → usa `getAllFilteredIds()` + `addBatchToQueue()` existentes
  - Se 0 contatos: nao renderizar (return null)
- [x] Task 1.2: Integrar em `ProspectingPage.tsx` na aba Metricas, acima dos MetricsCards
- [x] Task 1.3: Testes (4 testes: AC1-AC4 + LeadScoreBadge)

### Task 2 — PerformanceComparison (AC5, AC6, AC7, AC8)
- [x] Task 2.1: Criar componente `features/prospecting/components/PerformanceComparison.tsx`
  - Props: `userMetrics: BrokerMetric`, `teamAverage: BrokerMetric`, `isAdminOrDirector: boolean`, `periodDays: number`
  - Se `isAdminOrDirector`: return null (admin/director usam CorretorRanking)
  - Layout: 4 cards em grid (calls/dia, connection rate, avg duration, unique contacts)
  - Cada card: "Voce: X | Time: Y" com indicador visual (verde/vermelho/cinza ±5%)
- [x] Task 2.2: Calcular `teamAverage` e `userMetrics` a partir de `byBroker[]` em ProspectingPage via useMemo
  - Exclui brokers com 0 calls do calculo de media
- [x] Task 2.3: Integrar em `ProspectingPage.tsx` abaixo do DailyGoalCard
- [x] Task 2.4: Testes (8 testes: AC5-AC8 + edge cases)

### Task 3 — Persistencia de objecoes (AC9)
- [x] Task 3.1: Identificar onde objecoes sao marcadas no ScriptGuide/PowerDialer
  - Ja implementado: ProspectingScriptGuide tem onObjectionsChange callback
  - PowerDialer gerencia markedObjections state
- [x] Task 3.2: Ao completar chamada (`markCompleted`), incluir `objections` no metadata da activity
  - Ja implementado em PowerDialer.handleCallSave (linha 131): `...(markedObjections.length > 0 && { objections: markedObjections })`
- [x] Task 3.3: Testes (coberto por powerDialer.test.tsx existente)

### Task 4 — TopObjections widget (AC10, AC11)
- [x] Task 4.1: Criar componente `features/prospecting/components/TopObjections.tsx`
  - Reutiliza activities do metricsHook (sem query extra)
  - Agrega objections do metadata, ordena DESC, top 5
  - Empty state com mensagem informativa
- [x] Task 4.2: Integrar na aba Metricas (apos AutoInsights)
- [x] Task 4.3: Testes (5 testes: AC10, AC11 + edge cases)

### Task 5 — Quality Gate
- [x] Task 5.1: `npm run typecheck` passa
- [x] Task 5.2: `npm run lint` passa
- [x] Task 5.3: `npm test` passa (77 files, 807 testes)

## Dev Notes

### Contexto Arquitetural

**MetricsCards.tsx (~100 linhas):**
- KPIs: total calls, connected, connection rate, avg duration, unique contacts
- NeglectedContactsAlert vai acima deste componente

**DailyGoalCard (via GoalConfigModal):**
- Meta diaria configuravel, progresso visivel
- PerformanceComparison vai abaixo

**CorretorRanking:**
- Visivel apenas para admin/director
- PerformanceComparison e o equivalente para corretores

**useProspectingMetrics.ts:**
- `byBroker[]`: ja disponivel com totalCalls, connectedCalls, connectionRate, avgDuration, uniqueContacts
- Basta calcular media do array para o teamAverage

**ProspectingScriptGuide:**
- Componente com scripts por categoria
- Checkboxes de objecao (verificar se existem ou precisam ser criados)
- Objecoes comuns: preco, localizacao, tamanho, prazo, concorrencia

**Activity metadata JSONB:**
- Ja aceita campos livres (exposto em activity-tools.ts commit 4d0c884)
- Padrao: `{ outcome: string, duration: number, notes?: string }`
- Adicionar: `objections?: string[]`

**RPC get_prospecting_filtered_contacts:**
- Ja aceita `p_inactive_days` e `p_temperatures`
- Pode ser reutilizada para query de contatos negligenciados

**LeadScoreBadge (de CP-3.2):**
- Se CP-3.2 ja estiver feita, reutilizar componente
- Se nao, criar inline ou componente local

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/NeglectedContactsAlert.tsx` | Created | Alerta de leads negligenciados |
| `features/prospecting/components/PerformanceComparison.tsx` | Created | Voce vs Time |
| `features/prospecting/components/TopObjections.tsx` | Created | Top 5 objecoes |
| `features/prospecting/ProspectingPage.tsx` | Modified | Integrar 3 novos componentes |
| `features/prospecting/hooks/useProspectingQueue.ts` | Modified | Incluir objections no markCompleted |

### Dependencia de CP-3.5 (soft)

- Se `prospecting-config.ts` ja existir (CP-3.5): usar `PROSPECTING_CONFIG.HEATMAP_MIN_CALLS` etc.
- Se nao: usar valores inline (funciona, apenas nao centralizado)
- Se `useProspectingMetrics` ja usar RPC (CP-3.5): byBroker vem do server
- Se nao: byBroker ja existe no hook atual (client-side) — funciona igual

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Medium (3 componentes independentes + persistencia de objecoes)
- Secondary Types: —

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa

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
- NeglectedContactsAlert: query eficiente, nao recarregar a cada render
- PerformanceComparison: calcular media corretamente (excluir broker sem dados)
- Objecoes: nao quebrar metadata existente ao adicionar campo
- Responsividade: widgets devem funcionar em mobile

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Query de contatos negligenciados pesada | Baixa | Medio | Usar RPC existente com filtros, cachear com React Query |
| Objecoes nao salvas se chamada concluida sem script | Media | Baixo | Se checkedObjections vazio, nao incluir campo no metadata |
| Media do time distorcida por corretor inativo | Baixa | Baixo | Excluir brokers com 0 calls do calculo de media |

## Dependencies

- **CP-3.1:** Done (base)
- **CP-3.2:** Soft (reutilizar LeadScoreBadge se disponivel)
- **CP-3.5:** Soft (reutilizar constantes se disponiveis, funciona sem)
- **Nenhuma migration necessaria**

## Criteria of Done

- [x] Alerta de contatos negligenciados com acao direta
- [x] Comparativo "Voce vs. Media do time" para corretores
- [x] Objecoes persistidas no metadata da activity
- [x] Widget "Top 5 objecoes" na aba Metricas
- [x] `npm run typecheck` passa
- [x] `npm run lint` passa
- [x] `npm test` passa
- [x] Testes cobrindo 3 novos componentes + persistencia

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/NeglectedContactsAlert.tsx` | Created | Alerta HOT/WARM >7 dias com add-to-queue batch |
| `features/prospecting/components/PerformanceComparison.tsx` | Created | Voce vs Media do Time (4 cards comparativos) |
| `features/prospecting/components/TopObjections.tsx` | Created | Top 5 objecoes agregadas do metadata |
| `features/prospecting/ProspectingPage.tsx` | Modified | Integrar 3 widgets + calcular teamAverage/userMetrics/periodDays |
| `features/prospecting/__tests__/neglectedContactsAlert.test.tsx` | Created | 4 testes (AC1-AC4) |
| `features/prospecting/__tests__/performanceComparison.test.tsx` | Created | 8 testes (AC5-AC8 + edge cases) |
| `features/prospecting/__tests__/topObjections.test.tsx` | Created | 5 testes (AC10-AC11 + edge cases) |

## QA Results

**Verdict:** PASS
**Reviewed by:** @qa (Quinn)
**Date:** 2026-03-10

**Quality Gates:** typecheck PASS | lint PASS | test PASS (807/807)
**AC Traceability:** 11/11 PASS
**Test Coverage:** 17 new tests (4 + 8 + 5) + 3 existing scriptGuide tests

**Observations (LOW):**
- ~~`handleAddAll` in NeglectedContactsAlert lacks catch block~~ RESOLVED: Added `onError` callback prop + throw on `result.error` + toast integration in ProspectingPage. Test added.

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic CP-3 |
| 2026-03-10 | @po | Validacao GO (10/10). 0 issues. 3 componentes independentes, deps soft bem documentadas. Status Draft → Ready. |
| 2026-03-10 | @dev | Implementacao completa: 3 componentes + integracao + 17 testes. Task 3 (objecoes) ja estava implementada em PowerDialer. Status Ready → InProgress. |
| 2026-03-10 | @qa | QA review PASS. 11/11 ACs verified. 1 LOW observation (handleAddAll error feedback). |
| 2026-03-10 | @po | Status InReview → Done. QA gate PASS, all ACs met. |

---
*Story gerada por @sm (River) — Epic CP-3*
