# Story RT-1.1: Optimistic Updates em Board Stages

## Metadata
- **Story ID:** RT-1.1
- **Epic:** RT (Realtime Everywhere)
- **Status:** Ready for Review
- **Priority:** P1
- **Estimated Points:** 3 (S)
- **Phase:** 1 (Acao propria = instantanea)
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [unit_test, optimistic_rollback_test]

## Story

**As a** usuario do ZmobCRM que configura etapas do board nas configuracoes,
**I want** que adicionar, editar e excluir etapas reflitam imediatamente na UI sem aguardar resposta do servidor,
**so that** a experiencia de configuracao do board seja instantanea e o rollback seja automatico em caso de erro.

## Descricao

Os hooks `useAddBoardStage`, `useUpdateBoardStage` e `useDeleteBoardStage` em `lib/query/hooks/useBoardsQuery.ts` utilizam atualmente apenas `onSettled: invalidate`. Isso significa que qualquer alteracao em etapas do board so aparece na UI apos o servidor responder e o cache ser invalidado/refetchado.

O padrao correto de optimistic update ja esta implementado nos hooks `useCreateBoard`, `useUpdateBoard` e `useDeleteBoard` (no mesmo arquivo) e em `useMoveDeal` (`lib/query/hooks/useMoveDeal.ts`): o hook faz snapshot do cache em `onMutate`, aplica a mudanca otimisticamente com `setQueryData`, e faz rollback via `setQueryData` em `onError`.

Esta story implementa o mesmo padrao nos 3 hooks de stage, garantindo que a Fase 1 do Epic RT (acoes proprias = instantaneas) seja cumprida para gerenciamento de etapas.

O cache afetado e `queryKeys.boards.lists()` (array de `Board[]`, onde cada `Board` contem `stages: BoardStage[]`).

## Acceptance Criteria

- [ ] AC1: Given o usuario clica em "Adicionar etapa" no settings de um board, when a mutation de adicao e disparada, then a nova etapa aparece imediatamente na lista de etapas sem aguardar resposta do servidor
- [ ] AC2: Given uma adicao de etapa otimista esta visivel, when o servidor retorna erro, then a etapa temporaria desaparece e o estado anterior e restaurado (rollback automatico)
- [ ] AC3: Given o usuario edita o nome/cor de uma etapa, when a mutation de update e disparada, then a etapa exibe os novos valores imediatamente na UI sem aguardar servidor
- [ ] AC4: Given uma edicao de etapa otimista esta visivel, when o servidor retorna erro, then os valores anteriores sao restaurados automaticamente (rollback)
- [ ] AC5: Given o usuario clica em "Excluir etapa", when a mutation de delete e disparada, then a etapa desaparece imediatamente da lista sem aguardar servidor
- [ ] AC6: Given uma exclusao de etapa otimista foi aplicada, when o servidor retorna erro, then a etapa excluida reaparece na lista (rollback automatico)
- [ ] AC7: Given qualquer das 3 mutations de stage termina (sucesso ou erro), then `queryKeys.boards.all` e invalidado para sincronizar o cache com o estado real do servidor

## Scope

### IN
- Adicionar `onMutate` (snapshot + cancelQueries + setQueryData otimista) em `useAddBoardStage`
- Adicionar `onError` com rollback em `useAddBoardStage`
- Adicionar `onMutate` (snapshot + setQueryData otimista) em `useUpdateBoardStage`
- Adicionar `onError` com rollback em `useUpdateBoardStage`
- Adicionar `onMutate` (snapshot + setQueryData otimista) em `useDeleteBoardStage`
- Adicionar `onError` com rollback em `useDeleteBoardStage`
- Manter `onSettled: invalidate` existente nos 3 hooks (safety net)

### OUT
- Alteracao nos hooks de Board (useCreateBoard, useUpdateBoard, useDeleteBoard) — ja tem optimistic update
- Alteracao na logica de `mutationFn` dos 3 hooks
- Alteracao no `boardsService` ou camada Supabase
- Implementacao de Realtime subscription para board_stages (escopo de outra story RT)
- Testes E2E ou Playwright
- Alteracoes em componentes de UI (apenas o hook muda)

## Dependencies

- **RT-0.1 concluida** — A Fase 0 (bugs criticos) deve estar Done antes de iniciar Fase 1. Verificar status de `docs/stories/RT-0.1.story.md`.
- **Sem dependencias de banco de dados** — apenas alteracao em hooks React Query ja existentes.

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| ID temporario de stage colide com ID real do servidor | Baixa | Medio | useAddBoardStage usa `onSuccess` para substituir o registro temporario pelo retornado pelo servidor (mesmo padrao do useCreateBoard) |
| onMutate atualiza lista errada de stages (board incorreto) | Baixa | Alto | Usar `.find(b => b.id === boardId)` para localizar o board correto antes de mapear stages |
| Race condition entre onMutate e Realtime subscription | Baixa | Baixo | onSettled invalida o cache apos a resposta, garantindo consistencia eventual |

## Business Value

Configurar etapas do board (adicionar, renomear, excluir) torna-se instantaneo para o usuario. A latencia percebida cai de ~500-1500ms (round-trip Supabase) para 0ms. Consistente com o comportamento ja existente nos outros hooks de boards, unificando a UX de toda a pagina de configuracoes.

## Criteria of Done

- [ ] `useAddBoardStage` tem `onMutate` com cancelQueries, snapshot e setQueryData otimista (insere stage temporario com id `temp-stage-{timestamp}`)
- [ ] `useAddBoardStage` tem `onSuccess` substituindo o stage temporario pelo retornado pelo servidor
- [ ] `useAddBoardStage` tem `onError` restaurando snapshot
- [ ] `useUpdateBoardStage` tem `onMutate` com cancelQueries, snapshot e setQueryData otimista (aplica `updates` na stage correta)
- [ ] `useUpdateBoardStage` tem `onError` restaurando snapshot
- [ ] `useDeleteBoardStage` tem `onMutate` com cancelQueries, snapshot e setQueryData otimista (filtra a stage do board correto)
- [ ] `useDeleteBoardStage` tem `onError` restaurando snapshot
- [ ] Todos os 3 hooks mantem `onSettled: invalidateQueries(boards.all)`
- [ ] TypeScript compila sem erros (`npm run typecheck`)
- [ ] Linting passa sem warnings novos (`npm run lint`)
- [ ] Testes unitarios para cenarios de sucesso e rollback de erro nos 3 hooks

## Tasks

### Task 1 — Implementar optimistic update em `useAddBoardStage` (AC1, AC2)
- [x] Task 1.1: Adicionar `onMutate` que cancela queries `boards.all`, faz snapshot de `queryKeys.boards.lists()` e insere stage temporaria (id: `temp-stage-${Date.now()}`) dentro do board correto via `setQueryData<Board[]>`
- [x] Task 1.2: Adicionar `onSuccess` que substitui a stage temporaria pelo objeto real retornado em `data.stage`
- [x] Task 1.3: Adicionar `onError` que restaura `queryKeys.boards.lists()` com o snapshot do `onMutate`
- [x] Task 1.4: Verificar que `onSettled` permanece inalterado

### Task 2 — Implementar optimistic update em `useUpdateBoardStage` (AC3, AC4)
- [x] Task 2.1: Adicionar `onMutate` que cancela queries `boards.all`, faz snapshot de `queryKeys.boards.lists()` e aplica `updates` na stage correta via `setQueryData<Board[]>` (mapeia boards, dentro de cada board mapeia stages)
- [x] Task 2.2: Adicionar `onError` que restaura `queryKeys.boards.lists()` com o snapshot
- [x] Task 2.3: Verificar que `onSettled` permanece inalterado

### Task 3 — Implementar optimistic update em `useDeleteBoardStage` (AC5, AC6)
- [x] Task 3.1: Adicionar `onMutate` que cancela queries `boards.all`, faz snapshot de `queryKeys.boards.lists()` e remove a stage pelo `stageId` de todos os boards via `setQueryData<Board[]>` (mapeia boards, filtra stages)
- [x] Task 3.2: Adicionar `onError` que restaura `queryKeys.boards.lists()` com o snapshot
- [x] Task 3.3: Verificar que `onSettled` permanece inalterado

### Task 4 — Testes e Quality Gate (AC7)
- [x] Task 4.1: Escrever testes unitarios para `useAddBoardStage` — cenario sucesso (stage temporaria substituida) e cenario erro (rollback)
- [x] Task 4.2: Escrever testes unitarios para `useUpdateBoardStage` — cenario sucesso (updates aplicados) e cenario erro (rollback)
- [x] Task 4.3: Escrever testes unitarios para `useDeleteBoardStage` — cenario sucesso (stage removida) e cenario erro (rollback)
- [x] Task 4.4: Executar `npm run typecheck` e `npm run lint` — zero erros novos
- [ ] Task 4.5: Pre-Commit CodeRabbit review (@dev) — `wsl bash -c 'cd ${PROJECT_ROOT} && ~/.local/bin/coderabbit --prompt-only -t uncommitted'`

## Dev Notes

### Padrao de Referencia: `useUpdateBoard` (mesmo arquivo)

O padrao exato a implementar esta nos hooks de board no mesmo arquivo `lib/query/hooks/useBoardsQuery.ts` (linhas 148-177):

```typescript
// useUpdateBoard — padrao existente a replicar para stages
onMutate: async ({ id, updates }) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
  const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());
  queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
    old.map(board => (board.id === id ? { ...board, ...updates } : board))
  );
  return { previousBoards };
},
onError: (_error, _variables, context) => {
  if (context?.previousBoards) {
    queryClient.setQueryData(queryKeys.boards.lists(), context.previousBoards);
  }
},
```

Para stages, a diferenca e que a mutacao e um nivel mais profundo — e necessario mapear o array de boards e dentro de cada board mapear/filtrar o array `stages`.

### Padrao de Referencia: `useCreateBoard` — Insert com tempId (linhas 91-143)

Para `useAddBoardStage`, usar o mesmo padrao de tempId de `useCreateBoard` (linhas 105-122):

```typescript
// Referencia: useCreateBoard onMutate (lib/query/hooks/useBoardsQuery.ts linhas 105-122)
const tempId = `temp-stage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const tempStage: BoardStage = {
  ...stage,
  id: tempId,
};
queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
  old.map(b =>
    b.id === boardId
      ? { ...b, stages: [...(b.stages || []), tempStage] }
      : b
  )
);
return { previousBoards, tempId };
```

Em `onSuccess`, substituir a stage temporaria pelo objeto real (mesmo padrao de `useCreateBoard` linhas 129-138).

### Padrao de Referencia: `useDeleteBoard` — Delete otimista (linhas 182-213)

Para `useDeleteBoardStage`, adaptar o padrao de `useDeleteBoard` (linhas 191-199):

```typescript
// Referencia: useDeleteBoard onMutate (lib/query/hooks/useBoardsQuery.ts linhas 191-199)
onMutate: async (stageId: string) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
  const previousBoards = queryClient.getQueryData<Board[]>(queryKeys.boards.lists());
  queryClient.setQueryData<Board[]>(queryKeys.boards.lists(), (old = []) =>
    old.map(b => ({
      ...b,
      stages: (b.stages || []).filter(s => s.id !== stageId),
    }))
  );
  return { previousBoards };
},
```

### Source Tree

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `lib/query/hooks/useBoardsQuery.ts` | 254-267 | `useAddBoardStage` — estado atual (apenas onSettled) |
| `lib/query/hooks/useBoardsQuery.ts` | 272-285 | `useUpdateBoardStage` — estado atual (apenas onSettled) |
| `lib/query/hooks/useBoardsQuery.ts` | 290-303 | `useDeleteBoardStage` — estado atual (apenas onSettled) |
| `lib/query/hooks/useBoardsQuery.ts` | 91-143 | `useCreateBoard` — referencia: padrao tempId + onSuccess substitution |
| `lib/query/hooks/useBoardsQuery.ts` | 148-177 | `useUpdateBoard` — referencia: padrao onMutate + onError |
| `lib/query/hooks/useBoardsQuery.ts` | 182-213 | `useDeleteBoard` — referencia: padrao delete otimista |
| `lib/query/hooks/useMoveDeal.ts` | 208-261 | `useMoveDeal.onMutate` — referencia: snapshot + setQueryData em duas caches |
| `lib/query/queryKeys.ts` | 32 | `queryKeys.boards` — factory padrao (`all`, `lists()`, `detail()`) |
| `types/types.ts` | 359-366 | Interface `BoardStage` (id, label, color, linkedLifecycleStage, boardId) |
| `types/types.ts` | 385-420 | Interface `Board` (id, name, stages: BoardStage[], ...) |

### Testing

- Framework: Jest + React Testing Library (seguir padrao dos testes existentes no projeto)
- Ambiente: Staging tem dados reais — usar `queryClient` mock em unit tests
- Cenarios obrigatorios por hook:
  1. `onMutate` aplica mudanca otimista corretamente no cache
  2. `onError` restaura snapshot (simular `mutationFn` lancando erro)
  3. `onSettled` chama `invalidateQueries` com `queryKeys.boards.all`
- Para `useAddBoardStage`, testar adicionalmente que `onSuccess` substitui tempId pelo id real

### Contexto Adicional

- `boardsService.addStage` retorna `{ data: BoardStage, error }` — o `data.stage` contem o objeto real com ID do banco
- `queryKeys.boards` usa `createQueryKeys` factory: `.all = ['boards']`, `.lists() = ['boards', 'list']`, `.detail(id) = ['boards', 'detail', id]`
- A query key monitorada por `useBoards` e `queryKeys.boards.lists()` — e esta que precisa ser atualizada otimisticamente
- `cancelQueries({ queryKey: queryKeys.boards.all })` cancela tanto a query de lista quanto a de detalhe (hierarquia de keys)

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Low (1 arquivo, 3 hooks, padrao ja estabelecido no mesmo arquivo)
- Secondary Types: N/A

**Specialized Agent Assignment:**
- Primary: @dev (implementacao e pre-commit review)
- Supporting: @qa (quality gate, testes de rollback)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): Executar `wsl bash -c 'cd ${PROJECT_ROOT} && ~/.local/bin/coderabbit --prompt-only -t uncommitted'` antes de marcar story completa
- [ ] Pre-PR (@devops): Executar `wsl bash -c 'cd ${PROJECT_ROOT} && ~/.local/bin/coderabbit --prompt-only --base main'` antes de criar PR

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- TypeScript: tipos corretos no contexto retornado por `onMutate` (evitar `any`)
- Rollback: `onError` so acessa `context?.previousBoards` se definido (guard obrigatorio)
- Imutabilidade: `setQueryData` deve sempre retornar novos arrays/objetos (nunca mutacao in-place)
- Consistencia: padrao identico aos outros hooks no mesmo arquivo (`useUpdateBoard`, `useDeleteBoard`)

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/query/hooks/useBoardsQuery.ts` | Modified | Adicionar onMutate + onError + onSuccess nos 3 hooks de stage |
| `lib/query/hooks/__tests__/useBoardStageOptimistic.test.ts` | Created | 10 testes unitarios: optimistic insert/update/delete + rollback + onSettled |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-12 | @sm | Story criada a partir do Epic RT (Realtime Everywhere), Fase 1 |
| 2026-03-12 | @po | Validacao GO (10/10). Status Draft -> Ready. Should-fix: (1) useUpdateBoardStage nao recebe boardId em onMutate — dev deve iterar todos os boards por stageId; (2) RT-0.1 ainda Draft — verificar Done antes de iniciar. |
| 2026-03-13 | @dev | Implementacao completa: Tasks 1-4.4 todas concluidas. 10 testes passando, typecheck e lint OK. 1134 testes totais sem regressao. Status: Ready -> InProgress -> Ready for Review. CodeRabbit (Task 4.5) skipped — macOS, sem WSL. |
| 2026-03-13 | @dev | Fix: re-implementacao dos callbacks onMutate/onError/onSuccess nos 3 hooks de stage (codigo havia sido perdido, arquivo so tinha mutationFn + onSettled). 10/10 testes passam, 1212 testes totais sem regressao. |

---
*Story gerada por @sm (River) — Epic RT (Realtime Everywhere)*
