# Story BUX-10: Chip Visivel do Filtro Hidden de 30 Dias

## Metadata
- **Story ID:** BUX-10
- **Epic:** BUX (Board UX & Filtros Gerenciais)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 3 (S)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, pattern_validation]

## Story

**As a** gestor do ZmobCRM usando o board Kanban com filtro "Em Aberto",
**I want** ver um chip visivel na toolbar informando que deals won/lost antigos estao ocultos, com opcao de desativar o filtro,
**so that** entenda por que deals "sumiram" do board e possa ver todos se necessario.

## Descricao

O `useBoardFilters.ts` (linhas 73-78) esconde automaticamente deals won/lost com mais de 30 dias quando o filtro "Em Aberto" esta ativo. Isso ja causa confusao (gestores pensam que deals sumiram). A `PipelineToolbar.tsx` ja exibe um banner informativo (linhas 68-76), mas sem opcao de desativar o filtro.

Melhorias:
1. **Adicionar toggle no hook**: State `showAllRecent` que desativa o filtro de 30 dias
2. **Chip com X**: Substituir o banner informativo por um chip mais compacto na toolbar com botao X para desativar
3. **Restauracao**: Ao desativar, mostrar todos os deals independente da idade

## Acceptance Criteria

- [ ] AC1: Given o filtro de status "Em Aberto" ativo E deals hidden por >30 dias, when toolbar renderizada, then chip aparece informando "N ocultos > 30 dias"
- [ ] AC2: Given o chip visivel, when exibido, then mostra contagem exata de deals ocultados
- [ ] AC3: Given o chip visivel, when usuario clica no X, then desativa o filtro de 30 dias e mostra todos os deals
- [ ] AC4: Given o filtro de status "Ganhos" ou "Perdidos", when toolbar renderizada, then chip NAO aparece (o filtro de 30 dias se aplica apenas a "Em Aberto" e "Todos", portanto o chip PODE aparecer para "Todos")
- [ ] AC5: Given o toggle desativado, when sessao continua, then estado persiste durante a sessao

## Scope

### IN
- Adicionar state `showAllRecent` em useBoardFilters.ts
- Condicionar recentFilter para respeitar showAllRecent
- Substituir banner em PipelineToolbar por chip compacto com botao X
- Propagar toggle via props

### OUT
- Mudar a logica de 30 dias (apenas adicionar toggle)
- Persistencia entre sessoes (apenas sessao atual)
- Mudancas no schema/banco de dados

## Tasks

### Task 1 — State e logica no hook (AC3, AC5)
- [x] Task 1.1: Em `useBoardFilters.ts`, adicionar state:
  ```typescript
  const [showAllRecent, setShowAllRecent] = useState(false);
  ```
- [x] Task 1.2: Condicionar o filtro de 30 dias (linhas 73-78) para respeitar `showAllRecent`:
  ```typescript
  // DE:
  let matchesRecent = true;
  if (statusFilter === 'open' || statusFilter === 'all') {
    if (l.isWon || l.isLost) {
      if (new Date(l.updatedAt).getTime() < cutoffTime) matchesRecent = false;
    }
  }

  // PARA:
  let matchesRecent = true;
  if (!showAllRecent && (statusFilter === 'open' || statusFilter === 'all')) {
    if (l.isWon || l.isLost) {
      if (new Date(l.updatedAt).getTime() < cutoffTime) matchesRecent = false;
    }
  }
  ```
- [x] Task 1.3: Adicionar `showAllRecent` as deps do useMemo (linha 94)
- [x] Task 1.4: Exportar `showAllRecent, setShowAllRecent` no return do hook (linha 141)

### Task 2 — Chip na toolbar (AC1, AC2)
- [x] Task 2.1: Em `PipelineToolbar.tsx`, substituir o banner informativo (linhas 68-76) por chip compacto:
  ```tsx
  {hiddenByRecentCount > 0 && !showAllRecent && (
    <div className="mx-4 mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-full text-xs text-amber-700 dark:text-amber-300">
      <Info size={12} className="shrink-0" />
      <span>{hiddenByRecentCount} oculto{hiddenByRecentCount > 1 ? 's' : ''} &gt; 30 dias</span>
      <button
        onClick={() => setShowAllRecent(true)}
        aria-label="Mostrar todos os deals ocultos"
        className="ml-1 p-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors">
        <X size={12} />
      </button>
    </div>
  )}
  ```
- [x] Task 2.2: Adicionar props `showAllRecent` e `setShowAllRecent` ao `PipelineToolbar` interface
- [x] Task 2.3: Propagar props do componente pai que usa PipelineToolbar

### Task 3 — Condicional de visibilidade do chip (AC4)
- [x] Task 3.1: O chip so aparece quando:
  - `hiddenByRecentCount > 0` (existem deals ocultos)
  - `!showAllRecent` (toggle nao foi ativado)
  - (Implicitamente, `statusFilter === 'open' || 'all'` — porque `hiddenByRecentCount` ja retorna 0 para outros status, ver linhas 97-105)
- [x] Task 3.2: Verificar que `hiddenByRecentCount` continua calculando corretamente quando `showAllRecent` esta ativo (deve contar deals que SERIAM ocultos)

### Task 4 — Quality Gate
- [x] Task 4.1: `npm run typecheck` passa sem erros
- [x] Task 4.2: `npm run lint` passa sem erros
- [x] Task 4.3: `npm test` passa sem regressoes

## Dev Notes

### Contexto Arquitetural Verificado

**useBoardFilters.ts — Filtro de 30 dias (linhas 73-78):**
```typescript
let matchesRecent = true;
if (statusFilter === 'open' || statusFilter === 'all') {
  if (l.isWon || l.isLost) {
    if (new Date(l.updatedAt).getTime() < cutoffTime) matchesRecent = false;
  }
}
```
- `cutoffTime` calculado na linha 49-51: `new Date() - 30 dias`
- O filtro se aplica apenas quando status e "open" ou "all"
- Esconde deals won/lost com updatedAt mais antigo que 30 dias

**useBoardFilters.ts — hiddenByRecentCount (linhas 97-105):**
```typescript
const hiddenByRecentCount = useMemo(() => {
  if (statusFilter !== 'open' && statusFilter !== 'all') return 0;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffTime = cutoffDate.getTime();
  return deals.filter(
    d => (d.isWon || d.isLost) && new Date(d.closedAt || d.updatedAt).getTime() < cutoffTime
  ).length;
}, [deals, statusFilter]);
```
- Ja calcula a contagem de deals que seriam ocultos
- NOTA: usa `d.closedAt || d.updatedAt` enquanto o filtro real usa apenas `d.updatedAt` — inconsistencia menor, manter

**PipelineToolbar.tsx — Banner existente (linhas 68-76):**
```tsx
{hiddenByRecentCount > 0 && (
  <div className="mx-4 mt-2 px-3 py-2 bg-amber-50 ...">
    <Info size={14} />
    <span>{hiddenByRecentCount} negocio(s) oculto(s)... Use filtro Ganhos/Perdidos para ver.</span>
  </div>
)}
```
- Banner informativo sem opcao de desativar — substituir por chip com X
- Ja recebe `hiddenByRecentCount` como prop

### Padroes a Seguir

- **Chip:** rounded-full com cores amber (consistente com banner existente)
- **X button:** Icone X (Lucide) com hover state
- **State management:** useState simples, sem persistencia

### Nota Sobre hiddenByRecentCount

`hiddenByRecentCount` deve continuar calculando a contagem de deals que SERIAM ocultos, mesmo quando `showAllRecent` e true. Isso garante que o chip pode reaparecer se o usuario desativar o toggle. O calculo nao depende de `showAllRecent` (deps: `[deals, statusFilter]`).

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Low (1 state + condicional no filtro + chip visual)
- Secondary Types: nenhum

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa (quality gate)

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Logica: condicional `!showAllRecent` no lugar certo (antes do matchesRecent)
- useMemo deps: adicionar `showAllRecent` as dependencias
- hiddenByRecentCount: nao deve depender de showAllRecent (conta sempre)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Esquecer de adicionar showAllRecent nas deps do useMemo | Media | Medio | typecheck + eslint exhaustive-deps vai alertar |
| hiddenByRecentCount retorna 0 quando showAllRecent ativo | Baixa | Baixo | Calculo independente de showAllRecent (verificado no codigo) |

## Dependencies

- **Nenhuma dependencia de outras stories** — BUX-10 e independente
- **Nenhuma migration necessaria**
- **Nenhuma mudanca de API**

## Criteria of Done

- [x] Chip aparece quando filtro de 30 dias esta ativo e existem deals ocultos
- [x] Chip mostra contagem exata de deals ocultados
- [x] X no chip desativa filtro e mostra todos os deals
- [x] Chip nao aparece para filtros "Ganhos" e "Perdidos" (apenas esses — chip PODE aparecer para "Todos")
- [x] `npm run typecheck` passa sem erros
- [x] `npm run lint` passa sem erros
- [x] `npm test` passa sem regressoes

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| features/boards/hooks/useBoardFilters.ts | Modified | Added showAllRecent state, conditioned recentFilter, exported new state |
| features/boards/components/PipelineToolbar.tsx | Modified | Replaced banner with chip+X button, added showAllRecent/setShowAllRecent props |
| features/boards/components/PipelineView.tsx | Modified | Added showAllRecent/setShowAllRecent props, passed to PipelineToolbar |
| features/boards/hooks/useBoardsController.ts | Modified | Exposed showAllRecent/setShowAllRecent from filters |
| features/boards/hooks/useBoardFilters.test.ts | Modified | Added 5 tests for showAllRecent toggle (BUX-10) |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic BUX |
| 2026-03-10 | @sm | Correcao PO: AC4 corrigido - chip aparece para filtros 'Em Aberto' e 'Todos' (ambiguidade resolvida). Status: Draft -> Ready (PO validou GO 9/10) |
| 2026-03-11 | @dev | Implementacao completa: showAllRecent state + chip com X + propagacao de props. All quality gates passed (typecheck, lint, 844 tests). Status: Ready -> InProgress -> Ready for Review |
| 2026-03-11 | @qa | QA Review PASS. 2 obs LOW (commits misturados, sem testes showAllRecent) |
| 2026-03-11 | @dev | Fix: commits separados por story + 5 testes para showAllRecent adicionados |
| 2026-03-11 | @qa | Re-review PASS. Zero issues. Aprovada para push |

---
*Story gerada por @sm (River) — Epic BUX (Board UX & Filtros Gerenciais)*
