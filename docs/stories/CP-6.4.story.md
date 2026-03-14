# Story CP-6.4: Comparativo Periodo vs Periodo nas Metricas

## Metadata
- **Story ID:** CP-6.4
- **Epic:** CP-6 (Prospeccao — Protecao de Leads & Contexto de Ligacao)
- **Status:** Ready for Review
- **Priority:** P2
- **Estimated Points:** 5 (M)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, component_test, data_validation]

## Story

**As a** diretor/admin do ZmobCRM,
**I want** selecionar um periodo de comparacao ao lado do seletor de periodo existente nas metricas de prospeccao e ver o delta percentual em cada MetricsCard,
**so that** eu consiga identificar rapidamente se a performance do time esta melhorando ou piorando em relacao ao periodo anterior, sem precisar anotar numeros e comparar manualmente.

## Descricao

Os 6 MetricsCards do dashboard de prospeccao exibem numeros absolutos do periodo selecionado (Ligacoes Discadas, Atendidas, Sem Resposta, Correio de Voz, Tempo Medio, Contatos Prospectados). Nao ha como comparar esses numeros com um periodo anterior sem anotar os valores e trocar de periodo manualmente.

**Problema identificado:**

Diretores precisam responder perguntas como "Ligamos mais essa semana do que na semana passada?" ou "A taxa de atendimento melhorou em relacao aos ultimos 30 dias?". Hoje isso exige duas navegacoes manuais e uma conta mental.

**Solucao proposta:**

Adicionar um seletor "Comparar com" ao lado do seletor de periodo existente na aba de metricas. Quando ativado, cada MetricsCard exibe um indicador de delta percentual (ex: "↑ 12%", "↓ 8%", "Novo") calculado a partir de uma segunda chamada ao mesmo RPC `get_prospecting_metrics_aggregated` com o intervalo de datas deslocado.

**Calculo do periodo de comparacao:**

| Periodo atual | Periodo de comparacao |
|---------------|-----------------------|
| today | yesterday |
| yesterday | day before yesterday |
| 7d | days 8-14 (mesmo duration, deslocado) |
| 30d | days 31-60 (mesmo duration, deslocado) |
| custom {start, end} | shift back by (end - start) days |

**Comportamento do delta:**

- `((current - previous) / previous) * 100`, arredondado para 1 decimal
- Quando `previous === 0` e `current > 0`: exibir "Novo" (badge azul)
- Quando ambos `=== 0`: nao exibir delta
- Verde = melhora, Vermelho = piora. Para o card "Tempo Medio", a direcao de melhora depende do contexto (AC9).
- Loading do comparativo usa skeleton apenas nos indicadores de delta; metricas principais carregam independentemente.

## Acceptance Criteria

- [ ] AC1: Um seletor "Comparar com" aparece ao lado do seletor de periodo existente na aba de metricas
- [ ] AC2: As opcoes de comparacao sao: "Periodo anterior" (mesmo duration, deslocado para tras) e "Sem comparacao" (padrao — off)
- [ ] AC3: Quando comparacao esta ativa, cada MetricsCard exibe um indicador de delta: "↑ 12%" (verde para melhora) ou "↓ 8%" (vermelho para piora)
- [ ] AC4: O delta e calculado como: `((current - previous) / previous) * 100`, arredondado para 1 decimal
- [ ] AC5: Quando o valor do periodo anterior e 0 e o atual e maior que 0, exibir "Novo" em vez de percentual (badge azul)
- [ ] AC6: Quando ambos os valores (atual e anterior) sao 0, nenhum delta e exibido
- [ ] AC7: Os dados do periodo de comparacao sao buscados via o mesmo RPC `get_prospecting_metrics_aggregated` com o intervalo de datas deslocado (nenhum novo RPC necessario)
- [ ] AC8: Durante o carregamento dos dados de comparacao, os indicadores de delta exibem skeleton; as metricas principais carregam e exibem normalmente (loading independente)
- [ ] AC9: Para o card "Tempo Medio", a direcao positiva e: chamadas mais longas quando a taxa de conexao tambem melhorou; caso contrario, tempo menor e positivo (menor duracao sem melhora de conexao = eficiencia)
- [ ] AC10: O estado de comparacao persiste durante a sessao (navegacao entre abas do dashboard) mas e resetado ao recarregar a pagina (sem localStorage)
- [ ] AC11: O comparativo funciona corretamente com todas as opcoes de periodo: today, yesterday, 7d, 30d e custom

## Scope

### IN
- Seletor "Comparar com" na UI da aba de metricas (ao lado do seletor de periodo)
- Calculo do intervalo de datas do periodo de comparacao para todos os periodos suportados
- Segunda chamada ao RPC `get_prospecting_metrics_aggregated` com datas deslocadas (fetch paralelo, opcional)
- Componente `DeltaIndicator` reutilizavel (indicadores ↑/↓/Novo com cores)
- Exibicao do delta em cada um dos 6 MetricsCards
- Estado de loading independente para comparativo (skeleton nos deltas apenas)
- Testes unitarios: calculo de delta, logica de periodo de comparacao, DeltaIndicator, integracao com MetricsCards

### OUT
- Novos RPCs ou funcoes de banco de dados
- Graficos de comparacao ou charts de tendencia
- Analise historica de multiplos periodos
- Exportacao dos dados de comparacao
- Persistencia do estado de comparacao em localStorage ou banco
- Comparacao por corretor individual (apenas nivel agregado)

## Dependencies

- CP-5.4 (Done) — MetricsCards.tsx deve ter prop interface estavel para receber dados adicionais
- `get_prospecting_metrics_aggregated` RPC ja aceita `p_start_date` e `p_end_date` — nenhuma migracao necessaria
- `useProspectingMetrics.ts` e `getDateRange()` ja existem e serao estendidos
- `useProspectingPageState.ts` ja gerencia `metricsPeriod` e `customRange` — estado de comparacao sera adicionado aqui

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Dupla chamada RPC pode aumentar latencia percebida nas metricas | Media | Baixo | Fetch paralelo com `Promise.all`; comparativo e opcional (off por padrao); skeleton independente nao bloqueia metricas principais |
| Edge cases no calculo do periodo deslocado (ex: "today" na segunda-feira — yesterday = domingo) | Media | Baixo | Calcular sempre deslocando o intervalo por sua duracao exata em dias — sem logica de dia-da-semana |
| Card "Tempo Medio" tem direcao de melhora ambigua | Media | Medio | AC9 define regra explicita: checar conexao rate simultaneamente. Documentar logica no DeltaIndicator via prop `invertDirection` |
| Interface de MetricsCards pode precisar de atualizacao de props (breaking) | Baixa | Baixo | MetricsCards ja recebe `metrics` object — adicionar `comparisonMetrics?: ProspectingMetrics | null` como prop opcional |

## Business Value

- **Decisoes baseadas em tendencia:** Diretores passam de "quantas ligacoes hoje" para "estamos melhores que ontem/semana passada"
- **Identificacao rapida de desvios:** Queda de 30% na taxa de atendimento fica visivel sem necessidade de anotar e comparar
- **Acompanhamento de metas:** Gestores podem comparar ritmo atual vs periodo equivalente anterior sem exportar dados
- **Contexto imediato:** O numero 48 ligacoes so tem significado quando voce sabe que na semana passada foram 62

## Criteria of Done

- [ ] Seletor "Comparar com" renderiza ao lado do seletor de periodo na aba de metricas
- [ ] Opcao "Periodo anterior" dispara segunda chamada RPC com datas deslocadas
- [ ] Todos os 6 MetricsCards exibem delta quando comparacao esta ativa
- [ ] DeltaIndicator exibe ↑ (verde), ↓ (vermelho), "Novo" (azul), ou nada — conforme AC3-AC6
- [ ] Card "Tempo Medio" aplica logica de direcao conforme AC9
- [ ] Loading do comparativo usa skeleton independente (metricas principais nunca bloqueadas)
- [ ] Estado de comparacao persiste na sessao, reseta no reload
- [ ] Funciona corretamente com todos os 5 periodos (today, yesterday, 7d, 30d, custom)
- [ ] Testes unitarios cobrem: calculo delta, calculo de periodo de comparacao, DeltaIndicator (4 cenarios), integracao com MetricsCards
- [ ] Lint e typecheck passando (`npm run lint && npm run typecheck`)
- [ ] Nenhuma regressao no dashboard de prospeccao (MetricsCards, drill-down modal, CallDetailsTable)

## Tasks

- [x] Task 1: Calcular intervalo de datas do periodo de comparacao (AC: 7, 11)
  - [x] Subtask 1.1: Em `useProspectingMetrics.ts`, criar funcao `getComparisonDateRange(period: MetricsPeriod, currentRange: PeriodRange): PeriodRange` que desloca o intervalo atual para tras pela sua duracao exata
  - [x] Subtask 1.2: Para `today`: comparar com yesterday (start=yesterday, end=yesterday)
  - [x] Subtask 1.3: Para `yesterday`: comparar com day before yesterday (start=D-2, end=D-2)
  - [x] Subtask 1.4: Para `7d`: comparar com days 8-14 (shift currentRange.start e end por -7 dias)
  - [x] Subtask 1.5: Para `30d`: comparar com days 31-60 (shift por -30 dias)
  - [x] Subtask 1.6: Para `custom {start, end}`: calcular `durationDays = end - start + 1`, deslocar start e end por `-durationDays`
  - [x] Subtask 1.7: Testes unitarios: verificar calculo para todos os 5 periodos, incluindo custom de 1 dia, 7 dias e 15 dias

- [x] Task 2: Adicionar estado de comparacao em useProspectingPageState (AC: 2, 10)
  - [x] Subtask 2.1: Em `useProspectingPageState.ts`, adicionar `comparisonMode: 'none' | 'previous'` ao estado (default: `'none'`)
  - [x] Subtask 2.2: Adicionar handler `setComparisonMode` e exportar junto com os demais handlers
  - [x] Subtask 2.3: Estado usa `useState` (sem localStorage) — persiste na sessao, reseta ao recarregar (AC10)

- [x] Task 3: Buscar dados do periodo de comparacao via RPC (AC: 7, 8)
  - [x] Subtask 3.1: Em `useProspectingMetrics.ts`, adicionar parametro opcional `comparisonEnabled: boolean` ao hook
  - [x] Subtask 3.2: Quando `comparisonEnabled === true`, calcular `comparisonRange` via `getComparisonDateRange()` e disparar segunda query `useQuery` com chave de cache distinta (ex: `queryKeys.prospecting.metricsComparison(...)`)
  - [x] Subtask 3.3: Fetch paralelo — a query de comparacao e completamente independente da query principal; nao bloqueia exibicao das metricas principais
  - [x] Subtask 3.4: Hook retorna `comparisonMetrics: ProspectingMetrics | null` e `isComparisonLoading: boolean` adicionalmente
  - [x] Subtask 3.5: Quando `comparisonEnabled === false`, `comparisonMetrics` e sempre `null` (sem fetch)

- [x] Task 4: Criar componente DeltaIndicator (AC: 3, 4, 5, 6)
  - [x] Subtask 4.1: Criar `features/prospecting/components/DeltaIndicator.tsx` com props: `current: number`, `previous: number`, `invertDirection?: boolean`, `isLoading?: boolean`
  - [x] Subtask 4.2: Implementar logica: ambos 0 → `return null`; previous 0 e current > 0 → exibir `<span className="text-xs text-blue-500">Novo</span>`
  - [x] Subtask 4.3: Calcular `delta = ((current - previous) / previous) * 100`; `isPositive = invertDirection ? delta < 0 : delta > 0`
  - [x] Subtask 4.4: Renderizar `<span className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>{delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%</span>`
  - [x] Subtask 4.5: Quando `isLoading === true`, renderizar skeleton (ex: `<div className="h-3 w-10 bg-muted animate-pulse rounded" />`)
  - [x] Subtask 4.6: Testes: ambos zero (null), previous zero + current > 0 (Novo), melhora (verde), piora (vermelho), invertDirection, loading skeleton

- [x] Task 5: Adicionar seletor "Comparar com" na UI da aba de metricas (AC: 1, 2)
  - [x] Subtask 5.1: Em `features/prospecting/ProspectingPage.tsx`, localizar o seletor de periodo na aba de metricas e adicionar seletor "Comparar com" ao lado
  - [x] Subtask 5.2: Renderizar como um `<Select>` (ou toggle) com duas opcoes: "Sem comparacao" (value: 'none') e "Periodo anterior" (value: 'previous')
  - [x] Subtask 5.3: Conectar ao `comparisonMode` state de `useProspectingPageState`
  - [x] Subtask 5.4: Somente renderizar o seletor quando `activeTab === 'metricas'`

- [x] Task 6: Passar comparisonMetrics para MetricsCards e exibir DeltaIndicator (AC: 3, 8, 9)
  - [x] Subtask 6.1: Em `MetricsCards.tsx`, adicionar prop opcional `comparisonMetrics?: ProspectingMetrics | null` e `isComparisonLoading?: boolean`
  - [x] Subtask 6.2: Em cada um dos 6 KpiCards, renderizar `<DeltaIndicator>` abaixo do valor principal, passando os campos correspondentes de `metrics` e `comparisonMetrics`
  - [x] Subtask 6.3: Mapear campos: totalCalls → `metrics.totalCalls` vs `comparisonMetrics.totalCalls`; connectedCalls → `metrics.connectedCalls` vs `comparisonMetrics.connectedCalls`; no_answer → `metrics.byOutcome['no_answer']` vs comparison; voicemail → idem; avgDuration → `metrics.avgDuration` vs comparison; uniqueContacts → `metrics.uniqueContacts` vs comparison
  - [x] Subtask 6.4: Para o card "Tempo Medio": passar `invertDirection` como `true` somente se `connectionRate` do periodo atual for menor que o anterior (chamadas mais curtas sao positivas apenas se taxa de conexao nao melhorou)
  - [x] Subtask 6.5: Quando `comparisonMetrics === null`, DeltaIndicator nao e renderizado (sem espaco vazio nos cards)
  - [x] Subtask 6.6: Passar `isLoading={isComparisonLoading}` para cada DeltaIndicator (skeleton independente)

- [x] Task 7: Integrar comparativo no ProspectingPage (AC: 10, 11)
  - [x] Subtask 7.1: Passar `comparisonEnabled={comparisonMode === 'previous'}` para `useProspectingMetrics`
  - [x] Subtask 7.2: Passar `comparisonMetrics` e `isComparisonLoading` retornados pelo hook para `MetricsCards`
  - [x] Subtask 7.3: Validar que trocar o periodo principal reseta e re-busca o comparativo corretamente (query key inclui datas)

- [x] Task 8: Testes de integracao (AC: 1-11)
  - [x] Subtask 8.1: Criar `features/prospecting/__tests__/metricsComparison.test.tsx`
  - [x] Subtask 8.2: Teste: `getComparisonDateRange` para todos os 5 periodos
  - [x] Subtask 8.3: Teste: DeltaIndicator — 6 cenarios: ambos zero, previous zero, melhora, piora, invertDirection, loading
  - [x] Subtask 8.4: Teste: MetricsCards com `comparisonMetrics` — todos os 6 cards exibem DeltaIndicator; sem comparisonMetrics, nenhum delta renderizado
  - [x] Subtask 8.5: Teste: seletor "Comparar com" alterna estado `comparisonMode` entre 'none' e 'previous'
  - [x] Subtask 8.6: Teste: quando comparativo ativo, `useProspectingMetrics` dispara segunda query com datas deslocadas; quando inativo, apenas uma query

## Dev Notes

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| MetricsCards | `features/prospecting/components/MetricsCards.tsx` | Adicionar prop `comparisonMetrics`, renderizar DeltaIndicator em cada KpiCard |
| DeltaIndicator | `features/prospecting/components/DeltaIndicator.tsx` | **Novo** — indicador de delta reutilizavel |
| useProspectingMetrics | `features/prospecting/hooks/useProspectingMetrics.ts` | Adicionar `getComparisonDateRange()`, segunda query opcional, retornar `comparisonMetrics` e `isComparisonLoading` |
| useProspectingPageState | `features/prospecting/hooks/useProspectingPageState.ts` | Adicionar `comparisonMode` state e `setComparisonMode` handler |
| ProspectingPage | `features/prospecting/ProspectingPage.tsx` | Seletor "Comparar com", conectar estado, passar dados ao MetricsCards |
| metricsComparison.test | `features/prospecting/__tests__/metricsComparison.test.tsx` | **Novo** — testes do comparativo |

### Implementacao de referencia do DeltaIndicator

```tsx
// features/prospecting/components/DeltaIndicator.tsx
interface DeltaIndicatorProps {
  current: number
  previous: number
  invertDirection?: boolean
  isLoading?: boolean
}

function DeltaIndicator({ current, previous, invertDirection, isLoading }: DeltaIndicatorProps) {
  if (isLoading) {
    return <div className="h-3 w-10 bg-muted animate-pulse rounded" />
  }
  if (previous === 0 && current === 0) return null
  if (previous === 0) return <span className="text-xs text-blue-500">Novo</span>
  const delta = ((current - previous) / previous) * 100
  // SF-3: delta === 0 (current === previous) — sem variacao, nao exibir indicador
  if (delta === 0) return <span className="text-xs text-muted-foreground">= 0%</span>
  const isPositive = invertDirection ? delta < 0 : delta > 0
  return (
    <span
      className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}
      aria-label={`${delta > 0 ? 'Aumento' : 'Reducao'} de ${Math.abs(delta).toFixed(1)} por cento em relacao ao periodo anterior`}
    >
      {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
    </span>
  )
}
```

### Calculo do periodo de comparacao

```typescript
// A adicionar em useProspectingMetrics.ts
export function getComparisonDateRange(period: MetricsPeriod, currentRange: PeriodRange): PeriodRange {
  const startDate = new Date(currentRange.start)
  const endDate = new Date(currentRange.end)
  // durationDays: ex. para '7d' start=D-6,end=D → 7 dias
  const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const compEnd = new Date(startDate)
  compEnd.setDate(compEnd.getDate() - 1)

  const compStart = new Date(compEnd)
  compStart.setDate(compStart.getDate() - (durationDays - 1))

  return {
    start: compStart.toISOString().split('T')[0],
    end: compEnd.toISOString().split('T')[0],
  }
}
```

### Mapeamento de campos MetricsCards → DeltaIndicator

| Card | current | previous |
|------|---------|----------|
| Ligacoes Discadas | `metrics.totalCalls` | `comparisonMetrics.totalCalls` |
| Atendidas | `metrics.connectedCalls` | `comparisonMetrics.connectedCalls` |
| Sem Resposta | `byOutcome['no_answer']` | `compByOutcome['no_answer']` |
| Correio de Voz | `byOutcome['voicemail']` | `compByOutcome['voicemail']` |
| Tempo Medio | `metrics.avgDuration` | `comparisonMetrics.avgDuration` |
| Contatos Prospectados | `metrics.uniqueContacts` | `comparisonMetrics.uniqueContacts` |

Para "Sem Resposta" e "Correio de Voz", o `byOutcome` retorna array de `{ outcome: string; count: number }` — usar `.find(o => o.outcome === 'no_answer')?.count ?? 0`.

Para "Sem Resposta" e "Correio de Voz", `invertDirection = true` (menor e melhor).

**Nota sobre invertDirection — "Sem Resposta" e "Correio de Voz":**
Nesses dois cards, uma reducao no numero de ocorrencias representa melhora de desempenho (menos ligacoes sem atendimento = equipe mais eficiente). Por isso, `invertDirection = true` deve ser passado explicitamente ao `DeltaIndicator`: um delta negativo (queda) sera exibido em verde, e um delta positivo (aumento) sera exibido em vermelho. O @dev DEVE garantir que ambos os cards recebam essa prop — a ausencia de `invertDirection` nos demais cards e intencional (padrao: false).

### Logica de invertDirection para Tempo Medio

```typescript
// Tempo Medio: positivo (verde) se chamadas mais longas E conexao melhorou
// ou se chamadas mais curtas E conexao nao melhorou (eficiencia)
const connectionImproved = (metrics?.connectionRate ?? 0) > (comparisonMetrics?.connectionRate ?? 0)
const avgDurationInvertDirection = !connectionImproved // tempo menor = bom se conexao nao melhorou
```

### Testing

- **Local dos testes:** `features/prospecting/__tests__/metricsComparison.test.tsx`
- **Framework:** Jest + React Testing Library
- **Padrao:** Seguir `dealLinking.test.tsx` e `metricsDrilldown.test.tsx` como referencia
- **Mock necessario:** `ProspectingMetrics` com valores de current e previous distintos para cada cenario
- **Cobertura esperada:** ~15-20 testes

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (componentes + hooks de dados)
- **Secondary Type(s):** Nenhum (sem backend/DB changes — RPC ja suporta parametros de data)
- **Complexity:** Medium — 1 componente novo, 3 arquivos modificados, segunda query paralela

**Specialized Agent Assignment:**

Primary Agents:
- @dev (pre-commit reviews e implementacao)
- @ux-expert (consistencia visual dos indicadores de delta nos cards)

Supporting Agents:
- Nenhum (sem mudancas de DB ou deploy)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main`

**Self-Healing Configuration:**
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 20 minutos
- Severity Filter: CRITICAL, HIGH

**CodeRabbit Focus Areas:**

Primary Focus:
- Performance: fetch paralelo (nao sequential) para query de comparacao; `isComparisonLoading` deve ser independente de `isLoading` das metricas principais
- Type safety: `comparisonMetrics` como prop opcional com default `null`; sem `any` no calculo de delta
- Edge cases: divisao por zero em `getComparisonDateRange` e `DeltaIndicator`; periodo custom de 0 dias

Secondary Focus:
- Acessibilidade: DeltaIndicator deve ter `aria-label` descritivo (ex: "Aumento de 12% em relacao ao periodo anterior")
- UX consistency: skeleton de delta deve ter tamanho proximo ao texto que substitui

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/DeltaIndicator.tsx` | Criado | Componente reutilizavel de indicador de delta percentual |
| `features/prospecting/components/MetricsCards.tsx` | Modificado | Props `comparisonMetrics` e `isComparisonLoading`; DeltaIndicator em cada KpiCard |
| `features/prospecting/hooks/useProspectingMetrics.ts` | Modificado | `getComparisonDateRange()`, segunda query opcional, retorna `comparisonMetrics` e `isComparisonLoading` |
| `features/prospecting/hooks/useProspectingPageState.ts` | Modificado | Estado `comparisonMode` e handler `setComparisonMode` |
| `features/prospecting/ProspectingPage.tsx` | Modificado | Seletor "Comparar com", integracao do estado e dados de comparacao |
| `features/prospecting/__tests__/metricsComparison.test.tsx` | Criado | Testes do comparativo: calculo de datas, DeltaIndicator, MetricsCards, integracao |

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-14 | 1.0 | Story criada | @sm (River) |
| 2026-03-14 | 1.1 | Validacao GO (10/10) -- Status Draft->Ready. 3 should-fix: (1) invertDirection sem AC explicito para Sem Resposta/Correio de Voz, (2) aria-label ausente no snippet de referencia, (3) edge case delta===0 nao coberto. Nenhum critical. | @po (Pax) |
| 2026-03-14 | 1.2 | SF-1 a SF-3 corrigidos: invertDirection documentado explicitamente, aria-label adicionado ao DeltaIndicator, edge case delta===0 tratado | @sm (River) |
| 2026-03-14 | 2.0 | Implementacao completa — 8 tasks, 24 testes, QA PASS (0 critical, 0 high). Correcao C2: select nativo substituido por Button toggle pill | @dev (Dex) |

---

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Lint: 0 errors, 0 warnings
- TypeScript: 0 errors
- Tests: 24 passed (metricsComparison.test.tsx), 73 passed (regression: metricsDrilldown + components)

### Completion Notes List
- `getComparisonDateRange` exported from hook for reuse and testing
- Comparison query uses independent `useQuery` with distinct cache key — fully parallel with main metrics
- DeltaIndicator rendered inline next to value (flex row) instead of below — better visual density
- `invertDirection` applied to "Sem Resposta", "Correio de Voz" (fewer = better) and conditionally to "Tempo Medio" (AC9 logic)
- `comparisonMode` state lives in `useProspectingPageState` via `useState` — no localStorage, resets on reload (AC10)

### File List
| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/DeltaIndicator.tsx` | Criado | Componente reutilizavel de indicador de delta percentual |
| `features/prospecting/components/MetricsCards.tsx` | Modificado | Props `comparisonMetrics` e `isComparisonLoading`; DeltaIndicator em cada KpiCard |
| `features/prospecting/hooks/useProspectingMetrics.ts` | Modificado | `getComparisonDateRange()`, segunda query opcional, retorna `comparisonMetrics` e `isComparisonLoading` |
| `features/prospecting/hooks/useProspectingPageState.ts` | Modificado | Estado `comparisonMode` e handler `setComparisonMode` |
| `features/prospecting/ProspectingPage.tsx` | Modificado | Seletor "Comparar com", integracao do estado e dados de comparacao |
| `features/prospecting/__tests__/metricsComparison.test.tsx` | Criado | 24 testes: calculo de datas, DeltaIndicator, MetricsCards com comparison |

---

*Story gerada por @sm (River) — Epic CP-6*
