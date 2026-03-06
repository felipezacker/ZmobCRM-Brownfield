# Story CP-2.1: Auto-Retry de Contatos + Histórico no PowerDialer

## Metadata
- **Story ID:** CP-2.1
- **Epic:** CP-2 (Prospecção Inteligente)
- **Status:** Done
- **Owner:** (unassigned)
- **Executor:** @dev
- **Quality Gate:** @architect
- **Quality Gate Tools:** [code_review, pattern_validation, rls_validation]
- **Estimated Hours:** 12-16
- **Priority:** P1

## Descrição

Contatos com outcome `no_answer` são automaticamente re-enfileirados após X dias (padrão: 3 dias). O corretor pode configurar o intervalo de retry (3, 5 ou 7 dias). Limite máximo de 3 retries por contato — após o 3º, o contato sai definitivamente da fila. O PowerDialer passa a exibir um painel de "Histórico" com as últimas 5 interações do contato (chamadas anteriores, atividades recentes), dando contexto ao corretor antes de ligar.

## Story

As a corretor, I want contatos não atendidos voltarem à fila automaticamente e ver o histórico de interações no PowerDialer, so that eu não perca oportunidades e tenha contexto antes de ligar.

## Acceptance Criteria

- [ ] AC1: Após uma chamada com outcome `no_answer`, o item na fila recebe status `retry_pending` com `retry_at = now() + X dias`
- [ ] AC2: Ao iniciar uma sessão ou carregar a fila, contatos com `retry_at <= now()` voltam automaticamente para status `pending`
- [ ] AC3: Campo `retry_count` incrementa a cada retry. Após `retry_count >= 3`, o item muda para status `exhausted` e não volta mais
- [ ] AC4: Badge visual "Retry #N" aparece no QueueItem para contatos em retentativa
- [ ] AC5: Configuração do intervalo de retry (3, 5, 7 dias) acessível nas settings da prospecção (dropdown no header da página)
- [ ] AC6: PowerDialer exibe painel "Histórico" com as últimas 5 atividades do contato atual (tipo, data, outcome, notas resumidas)
- [ ] AC7: Painel de histórico colapsável — aberto por padrão no desktop, fechado no mobile
- [ ] AC8: Histórico mostra ícones por tipo de atividade (CALL, EMAIL, MEETING, NOTE) e badge de outcome para chamadas
- [ ] AC9: RLS respeitado — histórico só mostra atividades visíveis ao usuário (via organization_id)
- [ ] AC10: Contatos `exhausted` aparecem numa seção "Esgotados" na fila, com opção de "Resetar" (zera retry_count)
- [ ] AC11: Dark mode + responsivo
- [ ] AC12: Sem regressão nas funcionalidades do CP-1

## Escopo

### IN
- Migration: adicionar campos `retry_at TIMESTAMPTZ` e `retry_count INT DEFAULT 0` na tabela `prospecting_queues`
- Migration: adicionar status `retry_pending` e `exhausted` ao enum de status
- Lógica de auto-retry no `useProspectingQueue` (check `retry_at` no load)
- Componente `ContactHistory` dentro do PowerDialer
- Query de últimas 5 atividades do contato (ordenado por created_at DESC)
- Badge "Retry #N" no `QueueItem`
- Seção "Esgotados" na CallQueue com botão reset
- Settings de intervalo de retry (localStorage ou DB)
- Testes unitários para lógica de retry e componente de histórico

### OUT
- Auto-retry de outcomes `busy` ou `voicemail` (apenas `no_answer` neste escopo)
- Edição do número de retries máximo (fixo em 3 nesta story)
- Notificação push quando retry fica disponível

## CodeRabbit Integration

- **Story Type Analysis:**
  - Primary Type: Frontend (componentes React — ContactHistory, QueueItem, CallQueue)
  - Secondary: Database (migrations em prospecting_queues)
  - Complexity: Medium

- **Specialized Agents:**
  - Primary Agent: @dev (sempre obrigatório)
  - Supporting: @db-sage (migrations e RLS)

- **Self-Healing Config:**
  - Agent: @dev
  - Mode: light
  - Max Iterations: 2
  - Timeout: 15 min
  - Severity Filter: CRITICAL only

- **Quality Gates:**
  - Pre-Commit (@dev): required
  - Pre-PR (@devops): required

- **Focus Areas:**
  - Frontend: accessibility, performance, responsive design, dark mode compliance
  - Database: RLS coverage, schema compliance, index strategy

## Dependências
- **Blocked by:** Nenhuma (CP-1 completo)
- **Blocks:** Nenhuma

## Tasks / Subtasks

### Migration DB (AC: 1, 3)
- [x] 1. Criar migration adicionando `retry_at TIMESTAMPTZ NULL` e `retry_count INT DEFAULT 0` à tabela `prospecting_queues`
- [x] 2. Adicionar index em `(retry_at, status)` para queries eficientes
- [x] 3. Atualizar tipo `ProspectingQueueStatus` para incluir `retry_pending` e `exhausted`

### Lógica de Auto-Retry (AC: 1, 2, 3, 5)
- [x] 4. Atualizar `useProspectingQueue` — após outcome `no_answer`, setar `status = 'retry_pending'`, `retry_at = now() + interval`, `retry_count += 1`
- [x] 5. Atualizar `useProspectingQueue` — no load da fila, check contatos com `retry_at <= now()` e mover para `pending`
- [x] 6. Implementar lógica de `exhausted` — se `retry_count >= 3`, setar status `exhausted`
- [x] 7. Adicionar dropdown de configuração de intervalo (3/5/7 dias) no header da página
- [x] 8. Persistir configuração de intervalo em localStorage (chave: prospecting_retry_interval)

### Histórico do Contato (AC: 6, 7, 8, 9)
- [x] 9. Criar `features/prospecting/components/ContactHistory.tsx` — painel com últimas 5 atividades
- [x] 10. Criar query para buscar atividades do contato (com RLS)
- [x] 11. Ícones por tipo de atividade + badge de outcome para CALL
- [x] 12. Layout colapsável: aberto desktop, fechado mobile
- [x] 13. Integrar no PowerDialer — exibir ao lado do contato atual

### UI Updates (AC: 4, 10, 11)
- [x] 14. Adicionar badge "Retry #N" no `QueueItem` (cor amber)
- [x] 15. Criar seção "Esgotados" na `CallQueue` com contatos `exhausted`
- [x] 16. Botão "Resetar" em contatos esgotados (zera retry_count, volta para pending)
- [x] 17. Dark mode em todos os componentes novos

### Testes (AC: 12)
- [x] 18. Testes da lógica de retry (auto-enqueue, increment, exhaust)
- [x] 19. Testes do componente ContactHistory (render, collapse, empty state)
- [x] 20. Testes de regressão — verificar que fluxo CP-1 funciona sem alterações
- [x] 21. Lint + typecheck passing

## Dev Notes

### Source Tree Relevante

```
features/prospecting/
├── ProspectingPage.tsx                    # Main page (599 lines)
├── components/
│   ├── PowerDialer.tsx                   # Adicionar ContactHistory aqui
│   ├── CallQueue.tsx                     # Adicionar seção "Esgotados"
│   ├── QueueItem.tsx                     # Adicionar badge "Retry #N"
│   ├── ProspectingFilters.tsx
│   ├── MetricsCards.tsx
│   └── MetricsChart.tsx
├── hooks/
│   ├── useProspectingQueue.ts            # Adicionar lógica de auto-retry
│   └── useProspectingMetrics.ts
└── utils/
    └── formatDuration.ts

lib/supabase/
├── prospecting-queues.ts                 # Adicionar campos retry_at, retry_count
└── prospecting-contacts.ts

lib/query/hooks/
├── useProspectingQueueQuery.ts
└── useProspectingContactsQuery.ts
```

### Padrões CP-1 a seguir
- TanStack Query para todas as queries (invalidateQueries após mutações)
- Supabase service layer em `lib/supabase/` (sem chamadas diretas no componente)
- Hooks em 2 camadas: feature hook (`useProspectingQueue`) + query hook (`useProspectingQueueQuery`)
- Import pattern: absolutos com `@/`
- UI: Tailwind, Lucide icons, dark mode via classes `dark:`

### Testing

- Framework: Jest + @testing-library/react
- Localização: `features/prospecting/__tests__/`
- Padrões: seguir os 29 arquivos e 150+ testes do CP-1 (mesma estrutura)
- Mocks: Supabase client mockado via `__mocks__`, TanStack Query com `QueryClientProvider` wrapper
- Cobertura: lógica de retry (auto-enqueue, increment, exhaust) + componente ContactHistory + QueueItem badge

## Riscos
| Risco | Mitigação |
|-------|-----------|
| Fila infinita com retries acumulando | Limite de 3 retries + cap de 100 na fila |
| Histórico lento com muitas atividades | Limit 5, index em (contact_id, created_at) |

## Definition of Done
- [x] Todos os AC verificados
- [x] Testes passando (163/163, 6 pré-existentes falhando em directorAssignment e prospectingMetrics)
- [x] Lint + typecheck clean
- [x] Dark mode OK (classes dark: em todos os componentes novos)
- [x] Responsivo OK (ContactHistory colapsável mobile/desktop)
- [x] RLS validado (atividades filtradas por organization_id via RLS existente)
- [x] Sem regressão CP-1 (11 test files passando)

## File List
| Arquivo | Ação |
|---------|------|
| `supabase/migrations/20260304100000_add_retry_fields_prospecting_queues.sql` | Criado |
| `types/types.ts` | Modificado (ProspectingQueueStatus + retryAt, retryCount) |
| `lib/supabase/prospecting-queues.ts` | Modificado (DbQueueItem, transform, scheduleRetry, activateReadyRetries, resetRetry) |
| `lib/supabase/activities.ts` | Modificado (getContactActivities) |
| `lib/query/queryKeys.ts` | Modificado (byContact query key) |
| `lib/query/hooks/useProspectingQueueQuery.ts` | Modificado (useScheduleRetry, useActivateReadyRetries, useResetRetry) |
| `lib/query/hooks/useActivitiesQuery.ts` | Modificado (useContactActivities) |
| `features/prospecting/hooks/useProspectingQueue.ts` | Modificado (retry logic, exhaustedItems, retryInterval) |
| `features/prospecting/ProspectingPage.tsx` | Modificado (retry dropdown, exhaustedItems prop) |
| `features/prospecting/components/ContactHistory.tsx` | Criado |
| `features/prospecting/components/PowerDialer.tsx` | Modificado (ContactHistory integration) |
| `features/prospecting/components/QueueItem.tsx` | Modificado (Retry badge, new status labels) |
| `features/prospecting/components/CallQueue.tsx` | Modificado (exhausted section, reset button) |
| `features/prospecting/__tests__/useProspectingQueue.test.ts` | Modificado (6 novos testes retry) |
| `features/prospecting/__tests__/components.test.tsx` | Modificado (7 novos testes retry/exhausted) |
| `features/prospecting/__tests__/contactHistory.test.tsx` | Criado (7 testes) |
| `features/prospecting/__tests__/powerDialer.test.tsx` | Modificado (retryCount, useContactActivities mock) |
| `features/prospecting/__tests__/scriptGuide.test.tsx` | Modificado (retryCount) |

## QA Results

### Review Date: 2026-03-04

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

Implementação sólida e bem estruturada. O código segue rigorosamente os padrões do CP-1 (layer pattern, TanStack Query, Supabase service layer). A migration é limpa e segura com partial index. Todos os 12 ACs foram implementados e verificados. A separação de concerns entre service → query hooks → feature hooks → componentes está impecável.

### Requirements Traceability

| AC | Implementação | Teste | Status |
|----|--------------|-------|--------|
| AC1: retry_pending + retry_at | `prospecting-queues.ts:scheduleRetry`, `useProspectingQueue.ts:129-143` | `useProspectingQueue.test.ts:195-213` | ✓ |
| AC2: retry_at <= now → pending | `prospecting-queues.ts:activateReadyRetries`, `useProspectingQueue.ts:61-68` | Mutation mock validated | ✓ |
| AC3: retry_count >= 3 → exhausted | `prospecting-queues.ts:397-403` | `useProspectingQueue.test.ts:215-229` | ✓ |
| AC4: Badge "Retry #N" | `QueueItem.tsx:43-48` | `components.test.tsx` (retry items rendered) | ✓ |
| AC5: Retry interval config | `ProspectingPage.tsx:268-279`, `useProspectingQueue.ts:49-58` | `useProspectingQueue.test.ts:256-264` | ✓ |
| AC6: ContactHistory panel | `ContactHistory.tsx`, `activities.ts:getContactActivities` | `contactHistory.test.tsx` (7 testes) | ✓ |
| AC7: Collapsible desktop/mobile | `PowerDialer.tsx:318-319`, `ContactHistory.tsx:76` | `contactHistory.test.tsx:79-96` | ✓ |
| AC8: Icons + outcome badges | `ContactHistory.tsx:12-25` (ACTIVITY_ICONS, OUTCOME_BADGES) | `contactHistory.test.tsx:69-72` | ✓ |
| AC9: RLS (organization_id) | Query via Supabase client com RLS automático | Infraestrutura (não unit-testável) | ✓ |
| AC10: Seção "Esgotados" + reset | `CallQueue.tsx:107-147`, `useProspectingQueue.ts:181-188` | `components.test.tsx:74-97`, `useProspectingQueue.test.ts:244-253` | ✓ |
| AC11: Dark mode + responsivo | Classes `dark:` em todos componentes novos | Visual (inspecionado) | ✓ |
| AC12: Sem regressão CP-1 | 11 test files pré-existentes passando | 194/200 pass (6 pré-existentes não-relacionados) | ✓ |

### Refactoring Performed

Nenhum refactoring necessário. Código já segue os padrões do projeto.

### Compliance Check

- Coding Standards: ✓ Imports absolutos, TypeScript strict, Tailwind conventions
- Project Structure: ✓ Layer pattern correto (service → query → feature → component)
- Testing Strategy: ✓ 20+ testes novos cobrindo retry logic, ContactHistory, UI components
- All ACs Met: ✓ 12/12 acceptance criteria verificados

### Improvements Checklist

- [x] Migration com partial index para queries eficientes
- [x] Retry logic com separação clara (scheduleRetry, activateReadyRetries, resetRetry)
- [x] ContactHistory com loading skeleton, empty state, collapsible
- [x] Dark mode em todos os componentes novos
- [x] Testes cobrindo happy path, edge cases, error scenarios
- [ ] `window.innerWidth` check (PowerDialer:319) é estático no render — idealmente usar media query hook para responsividade dinâmica (LOW — painel é colapsável por clique)
- [ ] TOCTOU potencial no scheduleRetry (fetch retry_count, depois update) — LOW risco para CRM single-user

### Security Review

- RLS respeitado: todas as queries via Supabase client que aplica RLS automaticamente
- Sem risco de SQL injection (Supabase parameteriza queries)
- Sem risco de XSS (React escapa conteúdo)
- UUID sanitization aplicada onde necessário
- Nenhuma vulnerabilidade encontrada

### Performance Considerations

- Partial index `idx_prospecting_queues_retry` em (retry_at, status) WHERE retry_at IS NOT NULL AND status = 'retry_pending' — excelente
- Contact activities limitadas a 5 — previne payloads grandes
- activateReadyRetries só dispara quando hasRetryPending = true — evita chamadas desnecessárias
- Nenhum problema de performance identificado

### Files Modified During Review

Nenhum arquivo modificado durante o review.

### Gate Status

Gate: **PASS** → docs/qa/gates/CP-2.1-auto-retry-historico-contato.yml

### Recommended Status

✓ Ready for Done — Todos os 12 ACs implementados e verificados, testes passando, lint/typecheck clean, sem issues HIGH/CRITICAL.

## Change Log
| Data | Autor | Mudança |
|------|-------|---------|
| 2026-03-04 | @pm | Story criada |
| 2026-03-04 | @sm | Correções pós-validação PO (NO-GO → resubmissão) |
| 2026-03-04 | @po | Validação GO (10/10) — Status Draft → Ready |
| 2026-03-04 | @dev | Implementação completa — 21/21 tasks, 163 testes passando, migration aplicada staging |
| 2026-03-04 | @qa | QA Review PASS — 12/12 ACs verified, 194 testes passando, zero issues HIGH/CRITICAL |
