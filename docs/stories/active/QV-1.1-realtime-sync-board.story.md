# Story QV-1.1: Realtime Sync + Optimistic Update (Board)

## Metadata
- **Story ID:** QV-1.1
- **Epic:** QV (Quality Validation)
- **Status:** Ready
- **Priority:** P0
- **Estimated Points:** 8
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** usuario do ZmobCRM,
**I want** que ao mover um deal entre stages via drag & drop a UI reflita a mudanca imediatamente e que o realtime sync funcione entre abas,
**so that** nao precise fazer hard refresh para ver minhas acoes refletidas e possa trabalhar em multiplas abas com dados sincronizados.

## Descricao

4 bugs relacionados ao mesmo root cause: state sync apos mutacoes no board de deals.

**Bug #1 (HIGH):** Drag & drop de deal retorna visualmente ao stage anterior. O dado persiste no banco (confirmado via hard refresh cmd+shift+r), mas o estado local nao atualiza.

**Bug #17 (HIGH):** Deal criado na aba 1 aparece na aba 2 via realtime, mas sem nome/dados. Em ambas abas o deal nao abre ao clicar.

**Bug #18 (HIGH):** Mover deal na aba 1 nao sincroniza visualmente na aba 2.

**Bug #19 (MEDIUM):** Editar contato na aba 1 nao sincroniza na aba 2.

## Acceptance Criteria

- [ ] AC1: Given um deal no board, when arrastado para outro stage, then o deal permanece visualmente no novo stage sem necessidade de refresh
- [ ] AC2: Given um deal no board, when arrastado para outro stage, then o soft refresh (cmd+r) reflete a mudanca corretamente
- [ ] AC3: Given 2 abas abertas do CRM, when um deal e criado na aba 1, then aparece na aba 2 com todos os dados (nome, valor, contato)
- [ ] AC4: Given 2 abas abertas, when um deal e movido de stage na aba 1, then atualiza na aba 2
- [ ] AC5: Given 2 abas abertas, when um contato e editado na aba 1, then atualiza na aba 2
- [ ] AC6: Given um deal recem-criado (via UI ou IA), when clicado no board, then abre o modal do deal normalmente

## Scope

### IN
- Fix do optimistic update no drag & drop do board (pipeline)
- Fix do realtime subscription para deals (INSERT com dados completos)
- Fix do realtime subscription para deals (UPDATE de stage_id)
- Fix do realtime subscription para contacts (UPDATE)
- Fix de deal recem-criado que nao abre ao clicar

### OUT
- Realtime sync para activities (nao reportado como bug)
- Optimistic updates em contacts/activities (ja funcionando per checklist 2.12)

## Dependencies

- Nenhuma dependencia de outras stories — QV-1.1 e a primeira story do epic QV
- Requer acesso ao staging DB para testes com 2 abas

## Risks

- Cache invalidation pos-realtime pode conflitar com optimistic update existente em `useMoveDeal.ts` — testar ambos os fluxos (drag local + sync remoto)
- Realtime INSERT de deal faz cache insert direto sem refetch — dados parciais (sem join de contact/product) podem ser o root cause do Bug #17
- Corrigir handler de realtime para deals pode impactar o fluxo de automacoes (LinkedStage, NextBoard) em `useMoveDeal.ts`

## Tasks

- [x] Task 1 (AC1, AC2): Corrigir drag & drop no board
  - [x] 1.1: Analisar `features/boards/hooks/useBoardDragDrop.ts` — handler `handleDrop()` chama `moveDealMutation`
  - [x] 1.2: Analisar `lib/query/hooks/useMoveDeal.ts` — ja possui optimistic update via `onMutate`; verificar se cache key esta correta e se `onSettled` invalida corretamente
  - [x] 1.3: Verificar se o evento realtime UPDATE (de outra aba) esta revertendo o optimistic update local — possivel race condition entre `onSuccess` e o handler de realtime
  - [x] 1.4: Fix aplicado e testado: drag deal entre stages persiste visualmente
- [x] Task 2 (AC3, AC6): Corrigir realtime INSERT de deals
  - [x] 2.1: Analisar `lib/realtime/useRealtimeSync.ts` — handler `handleDealInsert` faz insert direto no cache
  - [x] 2.2: Verificar se o payload do INSERT inclui dados completos (contact, product) ou apenas colunas da tabela deals
  - [x] 2.3: Se payload parcial: implementar re-fetch do deal completo apos INSERT (usando a mesma query que popula o board)
  - [x] 2.4: Verificar se o deal inserido no cache tem o ID correto (UUID do banco, nao temporario) — root cause provavel do Bug #17 (deal nao abre ao clicar)
  - [x] 2.5: Fix aplicado e testado: deal criado na aba 1 aparece completo na aba 2 e abre ao clicar
- [x] Task 3 (AC4): Corrigir realtime UPDATE de deals (stage_id)
  - [x] 3.1: Analisar handler `handleDealUpdate` em `useRealtimeSync.ts` — verificar se UPDATE de stage_id atualiza a posicao do deal no board (mover entre colunas)
  - [x] 3.2: Se o handler apenas invalida cache: verificar se a invalidacao esta usando as query keys corretas (ver `getTableQueryKeys` em `realtimeConfig.ts`)
  - [x] 3.3: Fix aplicado e testado: mover deal na aba 1 reflete na aba 2
- [x] Task 4 (AC5): Corrigir realtime UPDATE de contacts
  - [x] 4.1: Verificar handler de contacts UPDATE em `useRealtimeSync.ts`
  - [x] 4.2: Verificar se a invalidacao de cache de contacts propaga para componentes que exibem dados do contato (board cards, modais)
  - [x] 4.3: Fix aplicado e testado: editar contato na aba 1 reflete na aba 2
- [ ] Task 5: Teste end-to-end com 2 abas abertas
  - [ ] 5.1: Abrir staging em 2 abas, mesmo usuario
  - [ ] 5.2: Validar todos os 6 ACs sequencialmente
  - [ ] 5.3: Validar que drag & drop + realtime nao conflitam (drag na aba 1, observar aba 2)
- [x] Task 6: Quality gates
  - [x] 6.1: `npm run typecheck` — 0 errors
  - [x] 6.2: `npm run lint` — 0 errors
  - [x] 6.3: `npm test` — todos passam, nenhum novo teste quebrado

## Criteria of Done

- Todos os 6 ACs passam em staging com 2 abas abertas
- Items #1, #17, #18, #19 do checklist `docs/checklists/post-td-validation.md` re-validados como PASS
- `npm run typecheck`, `npm run lint`, `npm test` passam
- Nenhuma regressao em funcionalidades existentes do board (criar deal, deletar deal, filtros)

## Dev Notes

### Arquitetura do Board (verificado)

**State Management:** Zustand (UI/forms via `lib/stores/index.ts`) + React Query (data async via `lib/query/hooks/`)

**Orquestracao do Board:** `features/boards/hooks/useBoardsController.ts` compoe:
- `useBoards()` — React Query, listagem de boards
- `useDealsByBoard()` — React Query, deals por board
- `useBoardDragDrop()` — handlers de drag & drop
- `useBoardCRUD()` — create/update/delete de boards
- `useBoardFilters()` — busca e filtros
- `useBoardView()` — modo kanban/list
- `useRealtimeSyncKanban()` — realtime para deals + board_stages
- `useMoveDeal()` — mutacao de movimento de deal

### Arquivos-chave

| Arquivo | Responsabilidade |
|---------|-----------------|
| `features/boards/hooks/useBoardDragDrop.ts` | Handlers de drag & drop (handleDrop, handleDragStart) |
| `lib/query/hooks/useMoveDeal.ts` | Mutacao de move deal com optimistic update (onMutate) + automacoes (LinkedStage, NextBoard) |
| `lib/realtime/useRealtimeSync.ts` | Subscriptions Supabase realtime — handlers handleDealInsert, handleDealUpdate |
| `lib/realtime/realtimeConfig.ts` | Mapeamento de tabelas, query keys, deduplicacao global |
| `features/boards/hooks/useBoardsController.ts` | Composicao de todos os hooks do board |
| `lib/stores/index.ts` | Zustand stores (useUIStore, useFormStore, useNotificationStore) |

### Detalhes tecnicos

- **Drag & drop** usa React DragEvent nativa (nao react-beautiful-dnd ou similar)
- **useMoveDeal.ts** ja possui optimistic update via `onMutate` — o bug #1 provavelmente esta na invalidacao de cache: o evento realtime UPDATE (de `useRealtimeSyncKanban`) pode estar revertendo o estado otimista antes do `onSettled`
- **Realtime INSERT** faz insert direto no cache React Query sem refetch — payload do Supabase realtime contem apenas colunas da tabela (sem joins), entao o deal aparece sem contact/product (Bug #17)
- **Tabelas com subscription ativa:** deals, contacts, activities, boards, board_stages, prospecting_queues, prospecting_saved_queues, prospecting_daily_goals, organization_settings
- **Deduplicacao:** Handler global evita processar mesmo evento 2x

### Testing

**Framework:** Jest + React Testing Library (existente)
**Teste manual obrigatorio:** Abrir 2 abas no staging (`https://<preview-url>`) e validar cada AC
**Cenarios de teste:**
1. Drag & drop deal entre stages — permanece no novo stage
2. Criar deal na aba 1 — aparece completo na aba 2 e abre ao clicar
3. Mover deal na aba 1 — reflete na aba 2
4. Editar contato na aba 1 — reflete na aba 2
5. Drag deal + observar na outra aba simultaneamente (race condition test)

**Comandos:**
```bash
npm run typecheck   # 0 errors
npm run lint        # 0 errors
npm test            # todos passam
```

## CodeRabbit Integration

### Story Type Analysis
- **Primary Type:** Frontend (React state management, realtime subscriptions)
- **Secondary Type(s):** API (Supabase realtime handlers)
- **Complexity:** Medium-High (state sync entre abas, race conditions)

### Specialized Agent Assignment
**Primary Agents:**
- @dev: Implementacao e pre-commit review

**Supporting Agents:**
- @architect: Quality gate review (patterns, cache management)

### Quality Gate Tasks
- [ ] Pre-Commit (@dev): Run before marking story complete
- [ ] Pre-PR (@devops): Run before creating pull request

### Self-Healing Configuration
**Expected Self-Healing:**
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutes
- Severity Filter: [CRITICAL]

**Predicted Behavior:**
- CRITICAL issues: auto_fix (max 2 iterations)
- HIGH issues: document_as_debt
- MEDIUM/LOW: ignore

### CodeRabbit Focus Areas
**Primary Focus:**
- React Query cache invalidation patterns (onMutate, onSettled, onError)
- Supabase realtime event handler correctness

**Secondary Focus:**
- Race condition entre optimistic update e realtime event
- Performance: evitar refetch desnecessario em cascata

## File List

| Arquivo | Mudanca |
|---------|---------|
| `lib/realtime/useRealtimeSync.ts` | Bug #1: deal UPDATE early return antes de adicionar ao pending; Bug #17: deal INSERT com check de enrichment e refetch cross-tab; Bug #19: useRealtimeSyncKanban agora inclui 'contacts' |
| `lib/realtime/dealInsertSync.ts` | Bug #17: return type mudou de boolean para 'enriched'/'raw'/false para indicar se enrichment foi aplicado |
| `lib/realtime/dealUpdateSync.ts` | Bug #18: removido `return old` conservador quando timestamps indisponiveis, permitindo cross-tab sync |
| `lib/realtime/realtimeConfig.ts` | Bug #19: contacts query keys agora incluem queryKeys.deals.all para propagar contact updates ao deals cache |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @po | Validacao NO-GO (7/10): 3 critical + 5 should-fix |
| 2026-03-09 | @sm | Rework: quality_gate→@architect, +CodeRabbit, +Risks, +Dependencies, +Testing, +DoD, Dev Notes reescritos com file paths verificados |
| 2026-03-09 | @po | Re-validacao GO (10/10) — Status Draft→Ready |

---
*Story gerada por @sm (River) — Epic QV*
