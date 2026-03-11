# Story CP-4.6: Quick Fixes (Batch Progress + Badge + Filtros localStorage)

## Metadata

- **Epic:** CP-4 — Prospeccao: Filas & Sessao UX
- **Story ID:** CP-4.6
- **Status:** Ready for Review
- **Priority:** P1
- **Points:** 3 (S)
- **Wave:** Onda 1 — Core Session Flow
- **Created:** 2026-03-11

## Executor Assignment

- **Executor:** @dev
- **Quality Gate:** @qa
- **Quality Gate Tools:** [code_review, pattern_validation]

---

## Story

**As a** corretor na Central de Prospeccao,
**I want** feedback visual ao adicionar contatos em batch, badge de exaustao preciso e filtros que persistam entre navegacoes,
**so that** eu tenha maior confianca no estado da fila e nao perca configuracoes de filtro ao navegar pela aplicacao.

---

## Descricao

Tres correcoes rapidas agrupadas por baixa complexidade e sem dependencia entre si — todas podem ser implementadas no mesmo PR.

**Fix 1 — Indicador de progresso em batch:**
Hoje, `handleAddBatchToQueue` em `useProspectingPageState.ts` usa `addBatchMutation.mutateAsync` mas o estado `isPending` da mutation nao e exibido na UI durante o processo. O usuario adiciona 45+ contatos via `FilteredContactsList` e nao ve nenhum feedback ate o toast de sucesso aparecer. Necessario expor `addBatchMutation.isPending` + quantidade de contatos sendo adicionados para a UI em `ProspectingPage.tsx`.

**Fix 2 — Badge de exaustao real:**
Em `CallQueue.tsx:144`, a span do badge exibe o texto hardcoded `"3x"`. A interface `ProspectingQueueItem` (em `types/types.ts:339`) ja possui o campo `retryCount: number`. A correcao e trivial: substituir a string literal por `{item.retryCount}x`.

**Fix 3 — Persistencia de filtros em localStorage:**
O state `filters` em `useProspectingPageState.ts:138` e inicializado sempre com `INITIAL_FILTERS` ao montar o componente. Ao navegar para outra pagina e voltar, todos os filtros sao perdidos. A solucao segue o mesmo padrao ja adotado para `retryInterval` e `retryOutcomes` em `useProspectingQueue.ts:56-80`: inicializar com `localStorage.getItem` e persistir via `useEffect` ou lazy setter.

---

## Acceptance Criteria

- [ ] AC1: Ao iniciar `handleAddBatchToQueue`, a UI exibe um indicador de loading com a contagem de contatos sendo adicionados (ex: "Adicionando 45 contatos...")
- [ ] AC2: O badge de exaustao na secao "Esgotados" do `CallQueue` exibe o valor real de `item.retryCount` seguido de "x" (ex: "3x", "4x", "5x") em vez do texto hardcoded "3x"
- [ ] AC3: Filtros de prospeccao (stages, temperatures, classifications, tags, source, ownerId, inactiveDays, onlyWithPhone) persistem em localStorage e sao restaurados ao recarregar a pagina
- [ ] AC4: Clicar em "Limpar" nos filtros (`onFiltersChange(INITIAL_FILTERS)` em `ProspectingFilters.tsx:211`) tambem remove a entrada do localStorage
- [ ] AC5: O fluxo existente de `handleLoadSavedQueue` que chama `setFilters(restored)` continua funcionando sem regressao — o localStorage e sobrescrito com os filtros da fila salva

---

## Scope

### IN
- Loading state visual durante `handleAddBatchToQueue` com contagem de contatos
- Correcao do badge "3x" hardcoded para `item.retryCount` + "x" em `CallQueue.tsx:144`
- Persistencia de `filters` (tipo `ProspectingFiltersState`) em localStorage com chave `prospecting_filters`
- Restauracao automatica dos filtros ao montar `useProspectingPageState`
- Limpeza do localStorage quando `INITIAL_FILTERS` e aplicado

### OUT
- Indicador de progresso percentual (ex: barra de porcentagem de 0% a 100%) — nao ha evento de progresso na mutation
- Persistencia de `showFilters` (painel aberto/fechado) — apenas o valor dos filtros
- Persistencia de outros estados da pagina (tab ativa, metricsPeriod, etc.)
- Qualquer mudanca no backend / service layer
- Qualquer mudanca no schema do banco de dados

---

## Dependencies

Nenhuma. CP-4.6 e independente das demais stories do Epic CP-4.

---

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| JSON.parse falha se localStorage corrompido | Baixa | Baixo | Envolver em try/catch, fallback para INITIAL_FILTERS |
| `addBatchMutation.isPending` nao acessivel fora do hook | Baixa | Baixo | Expor via retorno de `useProspectingPageState` ou usar state local em `ProspectingPage.tsx` |
| Badge com retryCount=0 aparece como "0x" | Baixa | Baixo | Secao "Esgotados" so renderiza items com `status === 'exhausted'`, que por definicao tem retryCount >= 1 |

---

## Business Value

Tres pontos de friccao resolvidos com custo minimo (3-5h total):
- O corretor tem feedback claro ao adicionar grandes lotes — elimina duvida de "esta processando ou travou?"
- Badge de exaustao correto e informacao operacional critica — saber se um contato foi tentado 3x vs 5x muda a decisao de resetar ou descartar
- Filtros persistentes eliminam re-configuracao repetitiva — o corretor de prospeccao configura filtros uma vez e encontra-os ao voltar no proximo dia

---

## Criteria of Done

- [x] `CallQueue.tsx`: badge exibe `{item.retryCount}x` (sem hardcoded "3x")
- [x] `useProspectingPageState.ts` ou `ProspectingPage.tsx`: loading state com contagem exibido durante `handleAddBatchToQueue`
- [x] `useProspectingPageState.ts`: `filters` inicializa de localStorage e persiste mudancas
- [x] Limpar filtros em `ProspectingFilters.tsx` remove entrada do localStorage
- [x] `handleLoadSavedQueue` sobrescreve localStorage com filtros da fila salva (sem regressao)
- [x] `npm run lint` passa sem novos erros
- [x] `npm run typecheck` passa sem novos erros
- [x] `npm test` passa — testes existentes de `prospectingFilters.test.tsx` e `components.test.tsx` continuam verdes
- [x] Dark mode funcional nos elementos modificados

---

## Tasks

- [x] Task 1 — Fix 2: Badge de exaustao real (AC: 2) — Mais simples, comecar por aqui
  - [x] Subtask 1.1: Abrir `features/prospecting/components/CallQueue.tsx`, linha 144
  - [x] Subtask 1.2: Substituir `<span>3x</span>` por `<span>{item.retryCount}x</span>`
  - [x] Subtask 1.3: Verificar que nenhum outro badge hardcoded existe no arquivo
  - [x] Subtask 1.4: Rodar `npm run typecheck` para confirmar que `item.retryCount` e `number` e valido no contexto

- [x] Task 2 — Fix 3: Persistencia de filtros em localStorage (AC: 3, 4, 5)
  - [x] Subtask 2.1: Definir constante `FILTERS_STORAGE_KEY = 'prospecting_filters'` em `useProspectingPageState.ts`
  - [x] Subtask 2.2: Alterar inicializacao de `filters` para lazy init: `useState<ProspectingFiltersState>(() => { try { const stored = localStorage.getItem(FILTERS_STORAGE_KEY); return stored ? JSON.parse(stored) : INITIAL_FILTERS } catch { return INITIAL_FILTERS } })`
  - [x] Subtask 2.3: Adicionar `useEffect` que persiste `filters` no localStorage sempre que mudar: `useEffect(() => { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters)) }, [filters])`
  - [x] Subtask 2.4: Verificar que `handleLoadSavedQueue` ja chama `setFilters(restored)` — o `useEffect` do passo 2.3 vai persistir automaticamente (sem acao adicional necessaria)
  - [x] Subtask 2.5: Verificar que `onFiltersChange(INITIAL_FILTERS)` em `ProspectingFilters.tsx:211` vai acionar o `useEffect` com `INITIAL_FILTERS`, efetivamente sobrescrevendo o localStorage com os valores iniciais (sem acao adicional necessaria para AC4)
  - [x] Subtask 2.6: Teste manual: configurar filtros, navegar para outra pagina, voltar — filtros devem estar intactos

- [x] Task 3 — Fix 1: Indicador de progresso em batch (AC: 1)
  - [x] Subtask 3.1: Verificar que `addBatchMutation` e retornado por `useAddBatchToProspectingQueue()` em `useProspectingPageState.ts:155` — confirmar presenca de `.isPending`
  - [x] Subtask 3.2: Adicionar state `batchAddCount` (`useState<number>(0)`) em `useProspectingPageState.ts` para rastrear quantos contatos estao sendo adicionados
  - [x] Subtask 3.3: Em `handleAddBatchToQueue`, definir `batchAddCount` antes de chamar `mutateAsync` e resetar para `0` no finally
  - [x] Subtask 3.4: Expor `isBatchAdding: addBatchMutation.isPending` e `batchAddCount` no objeto de retorno do hook
  - [x] Subtask 3.5: Em `ProspectingPage.tsx`, consumir `isBatchAdding` e `batchAddCount` do `pageState`
  - [x] Subtask 3.6: Renderizar indicador de loading condicional proximo ao componente `AddToQueueSearch` ou no header da secao da fila — ex: `{isBatchAdding && <span role="status" aria-live="polite" className="text-xs text-muted-foreground animate-pulse">Adicionando {batchAddCount} contatos...</span>}` (incluir `role="status"` e `aria-live="polite"` — SF-2)
  - [x] Subtask 3.7: Garantir que o indicador usa `animate-pulse` do Tailwind (padrao do projeto) e nao um spinner customizado
  - [x] Subtask 3.8: Adicionar `role="status"` e `aria-live="polite"` no elemento do indicador de progresso para acessibilidade — ex: `<span role="status" aria-live="polite" className="text-xs text-muted-foreground animate-pulse">Adicionando {batchAddCount} contatos...</span>`

- [x] Task 4 — Validacao final (todos os ACs)
  - [x] Subtask 4.1: Testar fluxo completo: adicionar 10+ contatos em batch — indicador aparece e desaparece apos conclusao
  - [x] Subtask 4.2: Verificar secao "Esgotados" com contatos reais no staging — badges exibem valores corretos
  - [x] Subtask 4.3: Testar persistencia: aplicar filtros, recarregar pagina, confirmar restauracao
  - [x] Subtask 4.4: Testar limpeza: aplicar filtros, clicar "Limpar", recarregar — deve voltar para INITIAL_FILTERS
  - [x] Subtask 4.5: Testar SavedQueue: carregar fila salva com filtros, recarregar pagina — filtros da fila salva persistem
  - [x] Subtask 4.6: `npm run lint && npm run typecheck && npm test`

---

## Dev Notes

### Source Tree — Arquivos Impactados

| Arquivo | Linha(s) | Acao |
|---------|---------|------|
| `features/prospecting/components/CallQueue.tsx` | L144 | Substituir `"3x"` por `{item.retryCount}x` |
| `features/prospecting/hooks/useProspectingPageState.ts` | L138, L155 | Lazy init de `filters` + `useEffect` de persistencia + expor `isBatchAdding`/`batchAddCount` |
| `features/prospecting/ProspectingPage.tsx` | Proximo a `AddToQueueSearch` | Consumir `isBatchAdding` e `batchAddCount`, renderizar indicador |

**Arquivos apenas lidos (contexto):**
- `features/prospecting/components/ProspectingFilters.tsx` — `INITIAL_FILTERS` (L36-44), `onFiltersChange(INITIAL_FILTERS)` (L211) — ja funciona corretamente, sem mudanca necessaria
- `types/types.ts` — `ProspectingQueueItem.retryCount: number` (L339) — campo ja existe

### Tipos Relevantes

```typescript
// types/types.ts:329-345
export interface ProspectingQueueItem {
  id: string;
  // ...
  retryCount: number;       // L339 — usar este no badge
  // ...
}

// features/prospecting/components/ProspectingFilters.tsx:25-45
export interface ProspectingFiltersState {
  stages: string[];
  temperatures: string[];
  classifications: string[];
  tags: string[];
  source: string;
  ownerId: string;
  inactiveDays: number | null;
  onlyWithPhone: boolean;
}

export const INITIAL_FILTERS: ProspectingFiltersState = {
  stages: [], temperatures: [], classifications: [], tags: [],
  source: '', ownerId: '', inactiveDays: null, onlyWithPhone: false,
}
```

### Padrao de localStorage ja em uso no projeto

`useProspectingQueue.ts:56-80` usa o mesmo padrao de lazy init + setter que persiste:

```typescript
// Padrao de referencia para o Fix 3 (nao copiar, adaptar)
const [retryInterval, setRetryIntervalState] = useState<number>(() => {
  if (typeof window === 'undefined') return DEFAULT
  const stored = localStorage.getItem(KEY)
  return stored ? parseInt(stored, 10) : DEFAULT
})
// ... setter que persiste
```

Para `filters` (objeto), usar `JSON.parse` / `JSON.stringify` com try/catch, como `retryOutcomes` faz (L68-75 do mesmo arquivo).

> **Nota SF-1 — Semantica de "Limpar filtros":** Limpar filtros significa restaurar `INITIAL_FILTERS` e **sobrescrever** o localStorage com esses valores defaults (`localStorage.setItem(KEY, JSON.stringify(INITIAL_FILTERS))`), **nao** remover a entrada (`localStorage.removeItem`). O `useEffect` do Subtask 2.3 garante isso automaticamente — quando `onFiltersChange(INITIAL_FILTERS)` e chamado, o estado muda para `INITIAL_FILTERS` e o efeito persiste esse valor. Nao e necessario chamar `removeItem` em nenhum ponto.

### Localizacao do badge hardcoded

```typescript
// CallQueue.tsx:142-145 — trecho exato a alterar
<div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
  <span className="text-xs font-bold text-red-500 dark:text-red-400">3x</span>  // <- alterar
</div>
```

### Localizacao de `handleAddBatchToQueue`

`useProspectingPageState.ts:248-271` — o `addBatchMutation` ja e instanciado na L155. O `isPending` esta disponivel como `addBatchMutation.isPending` (React Query padrao).

> **Nota SF-2 — Acessibilidade do indicador de progresso:** O elemento que exibe "Adicionando N contatos..." deve incluir `role="status"` e `aria-live="polite"`. Isso permite que leitores de tela anunciem o estado de loading sem interromper o foco do usuario. Nao usar `aria-live="assertive"` (muito intrusivo para uma operacao em background).

### Testing

**Arquivos de teste existentes:**
- `features/prospecting/__tests__/prospectingFilters.test.tsx` — testes do componente ProspectingFilters
- `features/prospecting/__tests__/components.test.tsx` — testes gerais de componentes

**Estrategia de teste:**
- Nenhum novo arquivo de teste e necessario para esta story — as mudancas sao de UI state e prop rendering
- Os testes existentes devem continuar passando sem modificacao
- Se `components.test.tsx` testa `CallQueue` e mocka `ProspectingQueueItem`, verificar que o mock ja inclui `retryCount` — se nao, atualizar o mock para incluir `retryCount: 3` (ou qualquer numero)
- Testes manuais no staging conforme Subtask 4.x sao suficientes para este escopo

**Comandos:**
```bash
npm run lint
npm run typecheck
npm test -- --testPathPattern="prospectingFilters|components"
```

---

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend
- **Secondary Type(s):** N/A
- **Complexity:** Low — 3 arquivos modificados, escopo bem delimitado, sem novos componentes, sem nova API

**Specialized Agent Assignment:**

Primary Agents:
- @dev (pre-commit reviews — obrigatorio)
- @ux-expert (consistencia visual do indicador de loading)

Supporting Agents:
- @qa (validacao de regressao nos testes existentes)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): Rodar antes de marcar story completa
- [ ] Pre-PR (@devops): Rodar antes de criar pull request

**Self-Healing Configuration:**

Expected Self-Healing:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutos
- Severity Filter: CRITICAL only

Predicted Behavior:
- CRITICAL issues: auto_fix (ate 2 iteracoes)
- HIGH issues: document_only (anotado em Dev Notes)
- MEDIUM/LOW: ignorar

**CodeRabbit Focus Areas:**

Primary Focus:
- Acessibilidade: indicador de loading deve ter `aria-live` ou `role="status"` para leitores de tela
- Consistencia visual: `animate-pulse` do Tailwind (padrao do projeto — nao usar spinner customizado)

Secondary Focus:
- localStorage: garantir `try/catch` para evitar crash em browsers com storage bloqueado (modo privado)
- Type safety: `item.retryCount` deve ser `number` (nao `string`) no badge

---

## File List

> Preenchido pelo @dev durante implementacao.

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/CallQueue.tsx` | Modificado | Badge L144: "3x" -> `{item.retryCount}x` |
| `features/prospecting/hooks/useProspectingPageState.ts` | Modificado | Lazy init filters + useEffect localStorage + isBatchAdding/batchAddCount |
| `features/prospecting/ProspectingPage.tsx` | Modificado | Consumir isBatchAdding/batchAddCount, renderizar indicador |

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-11 | 1.0.0 | Story criada | @sm (River) |
| 2026-03-11 | 1.0.1 | Validacao GO (10/10). Status Draft -> Ready. 0 critical, 2 should-fix (SF-1: AC4 localStorage semantics aceito; SF-2: aria-live recomendado ao @dev). Todos file paths verificados contra source. | @po (Pax) |
| 2026-03-11 | 1.0.2 | Aplicados should-fix do @po. SF-1: nota em Dev Notes clarificando semantica de "limpar filtros" (sobrescrever com INITIAL_FILTERS, nao removeItem). SF-2: nota em Dev Notes + Subtask 3.8 + exemplo no Subtask 3.6 com role="status" e aria-live="polite". Status mantido: Ready. | @sm (River) |
| 2026-03-11 | 2.0.0 | Implementacao completa: Fix 1 (batch loading indicator), Fix 2 (badge retryCount), Fix 3 (localStorage filters). lint/typecheck/856 tests passando. Status: Ready for Review. | @dev (Dex) |

---

*Story gerada por @sm (River) — Epic CP-4*
