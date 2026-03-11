# Story CP-4.5: Selecao em Lote + Acoes na Fila

## Metadata
- **Story ID:** CP-4.5
- **Epic:** CP-4 (Prospeccao — Filas & Sessao UX)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 5 (M)
- **Wave:** 2
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, a11y_check]

## Story

**As a** corretor usando a Central de Prospeccao,
**I want** selecionar multiplos contatos da fila de uma vez e executar acoes em lote,
**so that** possa reorganizar ou limpar a fila de forma eficiente sem ter que agir item por item.

## Descricao

A fila de prospecção atualmente não oferece mecanismo de seleção múltipla. O corretor precisa remover contatos um por um, e não há como promover itens ao topo da fila. Esta story adiciona suporte a checkboxes nos itens da fila com duas ações em lote: remover selecionados (com confirmação) e mover selecionados para o topo da fila (reposicionamento por position).

A feature fica bloqueada (não renderizada) durante sessão ativa — quando `sessionActive === true` no hook `useProspectingQueue` — para evitar mutações enquanto o corretor está ligando.

## Acceptance Criteria

- [ ] AC1: Dado que o corretor visualiza a fila de prospecção, quando a lista tem itens pendentes, então um checkbox aparece à esquerda de cada item da fila
- [ ] AC2: Dado que o header da fila é exibido, quando há itens na fila, então existe um controle "Selecionar todos" que marca/desmarca todos os checkboxes simultaneamente
- [ ] AC3: Dado que nenhum item está selecionado, quando o corretor marca pelo menos 1 checkbox, então uma barra de ações aparece abaixo do header mostrando "X selecionados" e os botões de ação
- [ ] AC4: Dado que itens estão selecionados, quando o corretor clica em "Remover selecionados", então um modal/inline de confirmação aparece; após confirmar, os itens são removidos e a seleção é limpa
- [ ] AC5: Dado que itens estão selecionados, quando o corretor clica em "Mover para o topo", então os itens selecionados são reposicionados para position 0, 1, 2... (mantendo a ordem relativa entre eles) e a seleção é limpa
- [ ] AC6: Dado que uma ação em lote foi executada com sucesso (remover ou mover), quando a operação completa, então a seleção é zerada automaticamente
- [ ] AC7: Dado que uma sessão de prospecção está ativa (`sessionActive === true`), quando o corretor visualiza a fila, então os checkboxes e a barra de ações não são exibidos

## Scope

### IN
- Checkbox em cada `QueueItem` (controlado via prop `selected` + `onToggle`)
- "Selecionar todos" no header do `CallQueue`
- `BatchActionsBar` renderizada dentro de `CallQueue` quando `selectedIds.size >= 1`
- `removeBatchItems(ids: string[])` no service `prospectingQueuesService`
- `moveToTop(ids: string[])` no service — reposiciona com positions 0..n-1 para selecionados, depois desloca os demais
- Novos callbacks `onBatchRemove` e `onBatchMoveToTop` em `CallQueue`
- Lógica de seleção em estado local do `CallQueue` (não em Zustand — escopo UI puro)
- Confirmação inline para "Remover selecionados" (reutilizar o padrão de `confirmClear` já existente)
- Bloqueio durante sessão ativa (`isSessionActive` prop em `CallQueue`)
- Testes unitários para `removeBatchItems`, `moveToTop` e lógica de seleção
- Acessibilidade: `aria-checked`, `aria-label`, `role="checkbox"` nos checkboxes

### OUT
- Drag-and-drop para reordenação manual de itens individuais (escopo de outra story)
- Seleção em itens esgotados (`exhaustedItems`) — apenas itens da fila principal
- Desfazer (undo) após ação em lote
- Persistência da seleção entre renders/navegação
- Kanban quick-add ou alteração do enum de status

## Dependencies

- Nenhuma dependência de story anterior pendente. Todos os pré-requisitos (hook `useProspectingQueue`, service `prospectingQueuesService`, componentes `CallQueue` e `QueueItem`) já existem no codebase.

## Risks

- **LOW — Conflito de posição concorrente:** Se dois usuários moverem para o topo ao mesmo tempo, pode haver colisão de `position`. Mitigação: `moveToTop` usa transação implícita do Supabase ao atualizar N rows; para MVP aceita última-escrita-ganha.
- **LOW — Callback hell em CallQueue:** Adicionar `onBatchRemove` e `onBatchMoveToTop` aumenta a interface do componente. Mitigação: agrupar em objeto `batchActions` opcional.

## Business Value

Permite ao corretor reorganizar a fila de trabalho em segundos, eliminando atrito de manutenção. Caso típico: adicionar 20 contatos em lote e promover os 5 mais prioritários ao topo antes de iniciar a sessão.

## Criteria of Done

- [ ] AC1–AC7 todos implementados e verificados manualmente
- [ ] Testes unitários passando: `removeItems`, `moveToTop` no service; lógica de toggle/selectAll no componente
- [ ] `npm run lint` sem erros
- [ ] `npm run typecheck` sem erros
- [ ] Nenhuma regressão nas features existentes de remoção individual e "Limpar tudo"
- [ ] Checkboxes acessíveis: navegáveis por teclado, com `aria-label` adequado

## Tasks

### Task 1 — Service layer: removeItems + moveToTop (AC4, AC5)
- [x] 1.1: Adicionar `removeItems(ids: string[]): Promise<{data: {removed: number} | null; error: Error | null}>` em `lib/supabase/prospecting-queues.ts`
  - Deleta rows via `.in('id', ids)` + filtro `owner_id` (RLS garante isolamento)
- [x] 1.2: Adicionar `moveToTop(ids: string[], ownerId: string): Promise<{data: null; error: Error | null}>` em `lib/supabase/prospecting-queues.ts`
  - Busca todos os items do `owner_id` ordenados por `position`
  - Reposiciona: ids selecionados recebem positions 0..n-1 (mantendo ordem relativa); demais items recebem positions n..m-1 em sequência
  - Executa updates com Promise.all (batch de updates individuais — Supabase JS não tem `UPDATE ... CASE` nativo simples)
- [x] 1.3: Exportar as novas funções no objeto `prospectingQueuesService`

### Task 2 — React Query: hooks para batch operations (AC4, AC5)
- [x] 2.1: Adicionar `useRemoveBatchItems()` em `lib/query/hooks/useProspectingQueueQuery.ts`
  - Chama `prospectingQueuesService.removeItems`
  - `onSuccess`: invalida query `prospecting-queue`
- [x] 2.2: Adicionar `useMoveToTop()` em `lib/query/hooks/useProspectingQueueQuery.ts`
  - Chama `prospectingQueuesService.moveToTop`
  - `onSuccess`: invalida query `prospecting-queue`

### Task 3 — QueueItem: adicionar checkbox (AC1, AC7)
- [x] 3.1: Adicionar props `selected?: boolean`, `onToggle?: (id: string) => void`, `isSessionActive?: boolean` em `QueueItemProps`
- [x] 3.2: Renderizar checkbox à esquerda do avatar quando `!isSessionActive && onToggle`
  - Usar `<input type="checkbox">` nativo com `aria-label="Selecionar {contactName}"` e classes Tailwind
  - Não usar shadcn Checkbox para evitar overhead de dependência (o nativo é suficiente com estilo Tailwind)
- [x] 3.3: Checkbox marcado reflete `selected` prop; click chama `onToggle(item.id)`

### Task 4 — CallQueue: estado de seleção + header + BatchActionsBar (AC2, AC3, AC6, AC7)
- [x] 4.1: Adicionar state `selectedIds: Set<string>` em `CallQueue` (estado local, não Zustand)
- [x] 4.2: Adicionar prop `isSessionActive?: boolean` em `CallQueueProps`
- [x] 4.3: Adicionar prop `onBatchRemove?: (ids: string[]) => Promise<void>` e `onBatchMoveToTop?: (ids: string[]) => Promise<void>` em `CallQueueProps`
- [x] 4.4: Adicionar controle "Selecionar todos" no header — checkbox ou link de texto
  - Quando todos selecionados: "Desmarcar todos"; quando nenhum/parcial: "Selecionar todos"
  - Não renderizar quando `isSessionActive`
- [x] 4.5: Renderizar `BatchActionsBar` (componente inline ou sub-componente) quando `selectedIds.size >= 1 && !isSessionActive`
  - Exibe: "{n} selecionado{s}" | botão "Mover para o topo" | botão "Remover selecionados"
  - "Remover selecionados" exibe confirmação inline (mesmo padrão de `confirmClear` existente)
- [x] 4.6: Após `onBatchRemove` ou `onBatchMoveToTop` completar com sucesso, chamar `setSelectedIds(new Set())`
- [x] 4.7: Passar `selected`, `onToggle` e `isSessionActive` para cada `QueueItem`

### Task 5 — Integração em ProspectingPage (AC4, AC5, AC7)
- [x] 5.1: Instanciar `useRemoveBatchItems` e `useMoveToTop` em `features/prospecting/ProspectingPage.tsx` (ou onde `CallQueue` é usado)
- [x] 5.2: Passar `onBatchRemove`, `onBatchMoveToTop` e `isSessionActive={sessionActive}` para `CallQueue`
- [x] 5.3: Nos callbacks: chamar toast de sucesso/erro (reutilizar padrão de `removeFromQueue`)

### Task 6 — Testes (AC1–AC7)
- [x] 6.1: Testes unitários para `prospectingQueuesService.removeItems` — mock Supabase, verifica `.in('id', ids)`
- [x] 6.2: Testes unitários para `prospectingQueuesService.moveToTop` — verifica reposicionamento correto (selecionados no topo, demais deslocados)
- [x] 6.3: Testes de componente para `QueueItem` — checkbox renderiza quando `onToggle` presente; não renderiza quando `isSessionActive`
- [x] 6.4: Testes de componente para `CallQueue` — "Selecionar todos" funciona; `BatchActionsBar` aparece com >=1 selecionado; seleção limpa após ação
- [x] 6.5: Verificar acessibilidade: checkbox tem `aria-label`, é focusável com Tab, acionável com Space/Enter

## Dev Notes

### Contexto da Fila

A fila de prospecção vive na tabela `prospecting_queues` com campos relevantes:
- `id` (UUID), `contact_id`, `owner_id`, `organization_id`, `status`, `position` (INT, 0-indexed)
- RLS garante que cada usuário vê apenas seus próprios items

O campo `position` é a chave para ordenação. O padrão existente para calcular próxima posição (de `addBatchToQueue`, linhas 349–358 de `lib/supabase/prospecting-queues.ts`):
```typescript
const { data: maxPos } = await sb
  .from('prospecting_queues')
  .select('position')
  .eq('owner_id', ownerId)
  .order('position', { ascending: false })
  .limit(1)
  .maybeSingle();
let nextPosition = maxPos ? (maxPos as { position: number }).position + 1 : 0;
```

Para `moveToTop`: buscar todos os items ordenados por position, reordernar in-memory colocando selecionados primeiro (mantendo ordem relativa interna), então atribuir positions 0, 1, 2... e fazer updates.

### Arquitetura de Camadas

```
lib/supabase/prospecting-queues.ts    ← raw Supabase (adicionar removeItems, moveToTop)
lib/query/hooks/useProspectingQueueQuery.ts  ← React Query (adicionar useRemoveBatchItems, useMoveToTop)
features/prospecting/hooks/useProspectingQueue.ts  ← feature hook (instanciar e expor callbacks batch)
features/prospecting/components/CallQueue.tsx  ← estado de seleção + BatchActionsBar
features/prospecting/components/QueueItem.tsx  ← checkbox
features/prospecting/ProspectingPage.tsx      ← wiring final
```

**Padrao de consumo dos hooks batch (SF-2):** Os hooks `useRemoveBatchItems` e `useMoveToTop` seguem o mesmo padrao dos hooks existentes no codebase. Eles sao instanciados dentro de `useProspectingQueue` (feature hook) — nao diretamente no componente `CallQueue`. O feature hook encapsula a logica de mutacao + toast + refetch e expoe callbacks prontos (`removeBatchItems`, `moveToTop`) no objeto de retorno. O componente `CallQueue` recebe esses callbacks como props (`onBatchRemove`, `onBatchMoveToTop`) repassados pela `ProspectingPage`.

Confirmado pelo padrao observado em `useProspectingQueue.ts` (linha 46: `removeMutation = useRemoveFromQueue()`, linha 220-229: `removeFromQueue` encapsula mutate + toast + refetch). Aplicar identicamente para os novos callbacks batch.

### Source Tree (arquivos relevantes)

- `lib/supabase/prospecting-queues.ts` — service layer (linhas 97+: objeto `prospectingQueuesService`; linha 340–382: exemplo de `addBatchToQueue` com padrão de posição)
- `lib/query/hooks/useProspectingQueueQuery.ts` — hooks React Query para fila
- `features/prospecting/hooks/useProspectingQueue.ts` — feature hook; expõe `removeFromQueue` (linha 220–229), `clearQueue` (linha 231–240). Padrão: `mutateAsync` → `toast` → `refetch`
- `features/prospecting/components/CallQueue.tsx` — container da fila; estado `confirmClear` (linha 20) é o padrão de confirmação inline a reutilizar; props atuais: `items`, `onRemove`, `onClearAll`, `isClearing`, `removingId`
- `features/prospecting/components/QueueItem.tsx` — item individual; props atuais: `item`, `onRemove`, `isRemoving` (linha 22–26)
- `features/prospecting/ProspectingPage.tsx` — página principal

### Estado de Sessão

`sessionActive` vive em `useProspectingQueue` (linha 35). Já é passado para o hook consumer. Adicionar `isSessionActive` como prop em `CallQueue` e `QueueItem` para que a feature de batch fique invisível durante sessão ativa.

### UI Framework

Tailwind CSS + shadcn/ui. Para o checkbox, usar `<input type="checkbox" className="...">` nativo (padrão mais simples). Para botões de ação, reutilizar `<Button variant="unstyled" size="unstyled">` já presente no `CallQueue`.

### Testing

- Framework: Jest + React Testing Library
- **Testes de service layer** (`removeItems`, `moveToTop`): colocar em `lib/supabase/__tests__/prospecting-queues.test.ts` — esse diretorio ja existe com arquivos analogos (`prospecting-contacts.test.ts`, `prospecting-sessions.test.ts`). Padrao de mock: importar o service diretamente e mockar o client com `vi.mock('@/lib/supabase/client')` (ver `lib/supabase/__tests__/prospecting-contacts.test.ts` como referencia).
- **Testes de componente** (`QueueItem`, `CallQueue`, toggle/selectAll/BatchActionsBar): colocar em `features/prospecting/__tests__/` (ex: `components.test.tsx`)
- Para testes de componente: usar `render` + `fireEvent` / `userEvent`
- Cobertura esperada: removeItems (branches: ids vazio, ids validos, erro), moveToTop (reordenamento correto), toggle/selectAll em CallQueue

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend
- **Secondary Type(s):** API (service layer mutations)
- **Complexity:** Medium (múltiplos arquivos, lógica de reordenamento, acessibilidade)

**Specialized Agent Assignment:**

Primary Agents:
- @dev (pre-commit reviews)
- @ux-expert (a11y validation — checkboxes, keyboard nav)

Supporting Agents:
- @qa (validação de cobertura de testes)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): Rodar antes de marcar story como completa — `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): Rodar antes de criar PR — `coderabbit --prompt-only --base main`

**Self-Healing Configuration:**
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutos
- Severity Filter: CRITICAL only

Predicted Behavior:
- CRITICAL issues: auto_fix (até 2 iterações)
- HIGH issues: document_only (registrar em Dev Notes como tech debt)

**CodeRabbit Focus Areas:**

Primary Focus:
- Acessibilidade: `aria-checked`, `aria-label`, foco via teclado em checkboxes (WCAG 2.1 AA)
- Gestão de estado: selectedIds como Set (imutabilidade correta em React — `new Set(prev)` não `prev.add()`)

Secondary Focus:
- Não quebrar props existentes de `CallQueue` e `QueueItem` (backward compat)
- Tratamento de erro em batch ops (toast de erro se mutation falhar)

## File List

- `lib/supabase/prospecting-queues.ts` — pré-existente (removeItems, moveToTop já implementados)
- `lib/query/hooks/useProspectingQueueQuery.ts` — pré-existente (useRemoveBatchItems, useMoveToTop já implementados)
- `features/prospecting/hooks/useProspectingQueue.ts` — pré-existente (callbacks batch já expostos)
- `features/prospecting/components/CallQueue.tsx` — modificar (selectedIds state, select all, BatchActionsBar, isSessionActive prop)
- `features/prospecting/components/QueueItem.tsx` — modificar (selected, onToggle, isSessionActive props + checkbox)
- `features/prospecting/ProspectingPage.tsx` — modificar (wiring: onBatchRemove, onBatchMoveToTop, isSessionActive)
- `features/prospecting/__tests__/useProspectingQueue.test.ts` — modificar (adicionar mocks para novos hooks)
- `features/prospecting/__tests__/components.test.tsx` — modificar (19 novos testes: checkbox, BatchActionsBar, a11y)
- `lib/supabase/__tests__/prospecting-queues.batch.test.ts` — novo (7 testes: removeItems, moveToTop)

## Change Log

| Data       | Versao | Descricao                          | Autor       |
|------------|--------|------------------------------------|-------------|
| 2026-03-11 | 1.0    | Story criada — Draft               | @sm (River) |
| 2026-03-11 | 1.1    | Validado GO (10/10) — Status Draft > Ready. 0 critical, 2 should-fix (SF-1: clarificar local testes service; SF-2: clarificar padrao de consumo hooks batch). Ambos nao-bloqueantes. | @po (Pax) |
| 2026-03-11 | 1.2    | SF-1 aplicado: testes de service layer clarificados para `lib/supabase/__tests__/prospecting-queues.test.ts` (diretorio confirmado no filesystem). SF-2 aplicado: padrao de consumo dos hooks batch documentado em "Arquitetura de Camadas" — hooks instanciados em `useProspectingQueue`, nao no componente (padrao confirmado no hook existente linha 46+220). Status mantido Ready. | @sm (River) |
| 2026-03-11 | 2.0    | Implementação completa Tasks 1-6. Tasks 1-2 pré-existentes no codebase. Tasks 3-5: checkbox em QueueItem, selectedIds + BatchActionsBar em CallQueue, wiring em ProspectingPage. Task 6: 26 testes novos (7 service + 19 componente). 924/924 testes passando, 0 lint errors, 0 type errors. Status: Ready for Review. | @dev (Dex) |

---

*Story gerada por @sm (River) — Epic CP-4*
