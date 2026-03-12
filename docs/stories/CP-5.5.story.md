# Story CP-5.5: Filtro Ontem + Resumo Individual do Corretor

## Metadata
- **Story ID:** CP-5.5
- **Epic:** CP-5 (Prospeccao — Rastreabilidade & Visao Gerencial)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 3 (S)
- **Wave:** 2
- **Assigned Agent:** @dev
- **Dependencies:** Nenhuma — pode ser implementada independentemente de CP-5.4

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, pattern_validation]

## Story

**As a** diretor/admin do ZmobCRM,
**I want** um filtro rapido "Ontem" no dashboard de prospeccao e um card de resumo consolidado quando filtro por corretor,
**so that** eu consiga revisar a performance do dia anterior em 1 clique (em vez de 4 com Custom) e ter uma visao sintetica do corretor selecionado.

## Descricao

**Problema A — Filtro "Ontem":**
Para ver dados de ontem, o diretor precisa: clicar Custom → abrir date picker → selecionar data → confirmar. 4 cliques para o caso de uso mais comum de revisao diaria.

**Problema B — Resumo do Corretor:**
Ao filtrar por corretor via pills, os MetricsCards mostram os numeros individuais, mas nao ha um resumo consolidado ("Joao: 25 ligacoes, 32% conexao, 2 deals, R$ 45k pipeline"). O gestor precisa mentalmente correlacionar multiplos cards.

**Solucao:**

A) Adicionar 'yesterday' ao array de periodos: `['today', 'yesterday', '7d', '30d']` — 1 clique para ver dados de ontem.

B) Quando `metricsFilterOwnerId` esta ativo, renderizar `BrokerSummaryCard` acima dos MetricsCards com nome do corretor, total de ligacoes, taxa de conexao, deals criados e valor de pipeline.

## Acceptance Criteria

- [ ] AC1: O filtro de periodo exibe o botao "Ontem" entre "Hoje" e "7 dias", com label "Ontem"
- [ ] AC2: Ao clicar "Ontem", o dashboard filtra para o dia anterior (data de ontem, timezone local)
- [ ] AC3: O botao "Ontem" tem estilo ativo/inativo consistente com os demais botoes de periodo
- [ ] AC4: Quando um corretor esta selecionado via pills de filtro (`metricsFilterOwnerId` ativo), exibe o `BrokerSummaryCard` acima dos MetricsCards
- [ ] AC5: O `BrokerSummaryCard` mostra: nome do corretor, total de ligacoes, taxa de conexao (%), deals criados no periodo, e valor de pipeline (R$)
- [ ] AC6: O `BrokerSummaryCard` utiliza dados ja disponiveis nos hooks (`useProspectingMetrics` + `useProspectingImpact`) — nao faz queries adicionais
- [ ] AC7: Quando nenhum corretor esta selecionado, o `BrokerSummaryCard` NAO e exibido
- [ ] AC8: O `BrokerSummaryCard` respeita o periodo selecionado (incluindo "Ontem")

## Scope

### IN
- Adicionar 'yesterday' ao tipo `MetricsPeriod` e ao array de botoes de periodo
- Implementar logica de data "ontem" em `getDateRange()`
- Criar componente `BrokerSummaryCard` com metricas consolidadas
- Renderizar card condicional quando corretor selecionado
- Testes unitarios

### OUT
- Mudancas no CallDetailsTable ou CallModal
- Novas queries ao banco (dados ja disponiveis via hooks existentes)
- Comparacao entre corretores (feature futura)
- Exportacao do resumo do corretor

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| "Ontem" em timezone diferente pode pegar dia errado | Baixa | Medio | Usar `startOfDay(subDays(new Date(), 1))` com date-fns (ja usado no projeto) |
| BrokerSummaryCard pode duplicar informacao dos MetricsCards | Media | Baixo | Card mostra visao sintetica diferente (combina metricas + impact em 1 linha) |

## Business Value

- **Revisao diaria rapida:** gestores que revisam performance do dia anterior diariamente economizam 3 cliques por sessao
- **Visao sintetica por corretor:** em vez de correlacionar 6+ cards mentalmente, ve tudo consolidado em 1 card
- **Acompanhamento individual facilitado:** diretor seleciona corretor + "Ontem" = resumo completo em 2 cliques

## Criteria of Done

- [x] Botao "Ontem" aparece entre "Hoje" e "7 dias" no filtro de periodo
- [x] Clicar "Ontem" filtra corretamente para o dia anterior
- [x] `BrokerSummaryCard` aparece quando corretor esta selecionado
- [x] `BrokerSummaryCard` nao aparece quando nenhum corretor esta selecionado
- [x] Card mostra: nome, ligacoes, taxa de conexao, deals, pipeline
- [x] Dados do card vem dos hooks existentes (sem query extra)
- [x] Testes unitarios cobrem: filtro ontem, card visivel/invisivel, dados corretos
- [x] Lint e typecheck passando (`npm run lint && npm run typecheck`)
- [x] Nenhuma regressao no dashboard de prospeccao

## Tasks

- [x] Task 1: Adicionar filtro "Ontem" (AC: 1, 2, 3)
  - [x] Subtask 1.1: Em `useProspectingMetrics.ts`, adicionar `'yesterday'` ao tipo `MetricsPeriod`: `export type MetricsPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'custom'`
  - [x] Subtask 1.2: Em `getDateRange()`, adicionar case `'yesterday'`: `const yesterday = subDays(new Date(), 1); return { start: format(yesterday, 'yyyy-MM-dd'), end: format(yesterday, 'yyyy-MM-dd') }`
  - [x] Subtask 1.3: Em `ProspectingPage.tsx`, adicionar botao "Ontem" entre "Hoje" e "7 dias" na secao de filtros de periodo (linhas ~521-577)
  - [x] Subtask 1.4: Garantir que o botao segue o mesmo padrao visual dos demais (active/inactive classes)

- [x] Task 2: Criar BrokerSummaryCard (AC: 4, 5, 6, 7, 8)
  - [x] Subtask 2.1: Criar `features/prospecting/components/BrokerSummaryCard.tsx`
  - [x] Subtask 2.2: Props: `brokerName: string`, `metrics: ProspectingMetrics`, `impact: ProspectingImpact | null`
  - [x] Subtask 2.3: Layout: card horizontal com 5 metricas em linha — Nome (bold), Ligacoes (total), Conexao (%), Deals (count), Pipeline (R$ formatado)
  - [x] Subtask 2.4: Usar `formatCurrency` existente para valor de pipeline
  - [x] Subtask 2.5: Estilo: fundo sutil (`bg-muted/50`), borda, icone de usuario, responsivo (wrap em mobile)

- [x] Task 3: Integrar BrokerSummaryCard no ProspectingPage (AC: 4, 7, 8)
  - [x] Subtask 3.1: Em `ProspectingPage.tsx`, renderizar `BrokerSummaryCard` condicionalmente: `{metricsFilterOwnerId && metricsHook.metrics && (...)}`
  - [x] Subtask 3.2: Posicionar ACIMA dos MetricsCards (antes da linha ~645)
  - [x] Subtask 3.3: Obter nome do corretor de `profiles` usando `metricsFilterOwnerId`
  - [x] Subtask 3.4: Passar `metrics={metricsHook.metrics}` e `impact={impactData}` (de `useProspectingImpact`)

- [x] Task 4: Testes (AC: 1-8)
  - [x] Subtask 4.1: Teste `getDateRange('yesterday')` retorna data de ontem corretamente
  - [x] Subtask 4.2: Teste ProspectingPage: botao "Ontem" renderiza e esta clicavel
  - [x] Subtask 4.3: Teste BrokerSummaryCard: renderiza com dados corretos
  - [x] Subtask 4.4: Teste BrokerSummaryCard: NAO renderiza quando `metricsFilterOwnerId` e null
  - [x] Subtask 4.5: Teste BrokerSummaryCard: formata currency e percentual corretamente

## Dev Notes

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| useProspectingMetrics | `features/prospecting/hooks/useProspectingMetrics.ts` | Adicionar 'yesterday' ao MetricsPeriod e getDateRange() |
| ProspectingPage | `features/prospecting/ProspectingPage.tsx` | Botao "Ontem", renderizar BrokerSummaryCard condicional |
| BrokerSummaryCard | `features/prospecting/components/BrokerSummaryCard.tsx` | **Novo** — card de resumo consolidado |

### Filtro de periodo atual (ProspectingPage, linhas ~521-577)

Botoes de periodo renderizados inline com classes condicionais:
```tsx
{(['today', '7d', '30d'] as const).map(period => (
  <button
    key={period}
    onClick={() => setMetricsPeriod(period)}
    className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      metricsPeriod === period ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
    )}
  >
    {period === 'today' ? 'Hoje' : period === '7d' ? '7 dias' : '30 dias'}
  </button>
))}
```

Adicionar 'yesterday' ao array e mapear label "Ontem".

### getDateRange atual (useProspectingMetrics.ts, linhas 58-75)

```typescript
function getDateRange(period: MetricsPeriod, customRange?: PeriodRange): PeriodRange {
  const today = format(new Date(), 'yyyy-MM-dd')
  switch (period) {
    case 'today': return { start: today, end: today }
    case '7d': return { start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: today }
    case '30d': return { start: format(subDays(new Date(), 29), 'yyyy-MM-dd'), end: today }
    case 'custom': return customRange || { start: today, end: today }
  }
}
```

Adicionar: `case 'yesterday': const y = format(subDays(new Date(), 1), 'yyyy-MM-dd'); return { start: y, end: y }`

### Dados para BrokerSummaryCard

Tudo ja disponivel sem query extra:
- **Nome do corretor:** `profiles.get(metricsFilterOwnerId)?.full_name`
- **Total de ligacoes:** `metricsHook.metrics.totalCalls`
- **Taxa de conexao:** `metricsHook.metrics.connectionRate`
- **Deals criados:** `impactData.callsWithDeal` (de useProspectingImpact)
- **Pipeline:** `impactData.pipelineValue` (de useProspectingImpact)

### Tipo ProspectingImpact (referencia)

```typescript
interface ProspectingImpact {
  callsWithDeal: number
  totalProspectingCalls: number
  linkageRate: number
  pipelineValue: number
  dealsWon: number
  dealsWonValue: number
  byDay: { date: string; linked: number; unlinked: number }[]
}
```

### formatCurrency

Verificar se existe funcao `formatCurrency` no projeto. Se nao, usar:
```typescript
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
```

### Testing

- **Local dos testes:** `features/prospecting/__tests__/`
- **Framework:** Jest + React Testing Library
- **Padrao:** Seguir `dealLinking.test.tsx` como referencia
- **Cobertura esperada:** ~8-10 testes

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (componente novo + modificacao de hook/page)
- **Secondary Type(s):** Nenhum
- **Complexity:** Low — 1 componente novo, 2 modificados, logica simples

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main`

**Self-Healing Configuration:**
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutos
- Severity Filter: CRITICAL, HIGH

**CodeRabbit Focus Areas:**

Primary Focus:
- Timezone: `subDays(new Date(), 1)` deve usar data local, nao UTC
- Type safety: MetricsPeriod union type atualizado em todos os consumers

Secondary Focus:
- Responsividade: BrokerSummaryCard deve wrap em mobile
- Acessibilidade: botao "Ontem" com aria-pressed quando ativo

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-12 | 1.0 | Story criada | @sm (River) |
| 2026-03-12 | 1.1 | Validacao GO (10/10) — SF-1 (MetricsPeriod consumers) e SF-2 (formatCurrency) documentados como notas, nao bloqueantes. Status Draft → Ready. | @po (Pax) |
| 2026-03-12 | 1.2 | Implementacao completa — 4 tasks, 10 testes novos, 432 total passando, lint/typecheck OK. Status Ready → Ready for Review. | @dev (Dex) |
| 2026-03-12 | 1.3 | QA PASS (7/7 checks). 1027 testes passando, 0 regressoes. Status Ready for Review → Done. | @qa (Quinn) |

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
Nenhum debug necessario — implementacao direta.

### Completion Notes List
- Task 1: `'yesterday'` adicionado ao MetricsPeriod union type e getDateRange() com logica de data nativa (sem date-fns, consistente com pattern existente)
- Task 2: BrokerSummaryCard criado com layout horizontal responsivo (flex-wrap), 5 metricas inline, formatCurrency local (mesmo padrao de ProspectingImpactSection)
- Task 3: Card integrado condicionalmente — so aparece quando metricsFilterOwnerId ativo e metrics carregado
- Task 4: 10 testes cobrindo getDateRange('yesterday'), rendering, null impact, formatacao currency/percentual
- Regressao: 432 testes passando, 0 falhas

### File List
| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/hooks/useProspectingMetrics.ts` | Modificado | Adicionado 'yesterday' ao MetricsPeriod e getDateRange() |
| `features/prospecting/ProspectingPage.tsx` | Modificado | Botao "Ontem" no filtro de periodo + BrokerSummaryCard condicional |
| `features/prospecting/components/BrokerSummaryCard.tsx` | **Novo** | Card de resumo consolidado do corretor |
| `features/prospecting/__tests__/brokerSummaryCard.test.tsx` | **Novo** | 10 testes para getDateRange('yesterday') + BrokerSummaryCard |

## QA Results

**Reviewer:** @qa (Quinn)
**Date:** 2026-03-12
**Verdict:** PASS

### 7 Quality Checks

| # | Check | Result |
|---|-------|--------|
| 1 | Code review | PASS |
| 2 | Unit tests | PASS — 10 tests, all passing |
| 3 | Acceptance criteria | PASS — all 8 ACs verified |
| 4 | No regressions | PASS — 1027 tests passing, 0 failures |
| 5 | Performance | PASS — no additional queries |
| 6 | Security | PASS — no new inputs or data exposure |
| 7 | Documentation | PASS — story updated with File List and Dev Notes |

### Observations

- Diff includes CP-5.4 changes (MetricsDrilldownModal, onCardClick). Not blocking, but ideally separate commits per story.
- formatCurrency defined locally in BrokerSummaryCard (same pattern as ProspectingImpactSection). Acceptable.

---

*Story gerada por @sm (River) — Epic CP-5*
