# Story CP-5.3: Metricas de Impacto Prospeccao→Pipeline

## Metadata
- **Story ID:** CP-5.3
- **Epic:** CP-5 (Prospeccao — Rastreabilidade & Vinculacao)
- **Status:** Done
- **Priority:** P3
- **Estimated Points:** 5 (M)
- **Wave:** 2
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [code_review, pattern_validation]

## Story

**As a** gestor do ZmobCRM,
**I want** ver metricas que mostrem quantas ligacoes de prospeccao resultaram em deals e qual o valor gerado no pipeline,
**so that** eu consiga medir o ROI da equipe de prospeccao e tomar decisoes baseadas em dados sobre investimento em prospeccao.

## Descricao

Apos CP-5.1 vincular automaticamente ligacoes a deals, agora temos os dados necessarios para medir o impacto da prospeccao no pipeline. Porem, nao existe nenhuma visualizacao dessas metricas — os dados estao no banco mas nao sao agregados ou exibidos.

**Gap atual:**

1. **Sem metricas de conversao prospeccao→deal:** Nao ha como saber quantas ligacoes de prospeccao (source='prospecting') resultaram em deals (tem `deal_id`).
2. **Sem valor de pipeline atribuido a prospeccao:** Nao ha como calcular o valor total dos deals que tiveram ligacoes de prospeccao vinculadas.
3. **Sem tendencia temporal:** Nao ha como ver se a conversao esta melhorando ou piorando ao longo do tempo.

**Dados disponiveis (apos CP-5.1):**

- `activities` com `metadata->>'source' = 'prospecting'` — ligacoes de prospeccao
- `activities.deal_id IS NOT NULL` — ligacoes vinculadas a deals
- `deals.value` — valor do deal vinculado
- `deals.is_won` / `deals.is_lost` — status do deal

**Onde exibir:**

Adicionar uma nova secao "Impacto no Pipeline" no dashboard de prospeccao (`features/prospecting/ProspectingPage.tsx`), abaixo dos componentes de metricas existentes (MetricsCards, MetricsChart, ConversionFunnel, CorretorRanking, CallDetailsTable).

## Acceptance Criteria

- [x] AC1: O dashboard de prospeccao exibe uma secao "Impacto no Pipeline" com 4 KPI cards: (a) Ligacoes com Deal (count de activities com source=prospecting E deal_id), (b) Taxa de Vinculacao (% de ligacoes de prospeccao que tem deal_id), (c) Valor de Pipeline (soma de deal.value dos deals vinculados a ligacoes de prospeccao), (d) Deals Ganhos (count de deals vinculados a ligacoes de prospeccao onde is_won=true)
- [x] AC2: Os KPIs respeitam o filtro de periodo ja existente no dashboard (today, 7d, 30d, custom) — mesma `PeriodRange` do `useProspectingMetrics`
- [x] AC3: As metricas respeitam RBAC — corretor ve apenas seus dados, diretor/admin ve todos (via RLS existente)
- [x] AC4: Um mini-chart (sparkline ou barra) mostra a tendencia de "Ligacoes com Deal" nos ultimos 7 ou 30 dias (conforme periodo selecionado)
- [x] AC5: Loading skeleton exibido enquanto dados estao carregando
- [x] AC6: Secao lida graciosamente com zero dados (mensagem "Sem dados de impacto no periodo selecionado")

## Scope

### IN
- Novo hook `useProspectingImpact` para agregar metricas de impacto
- Query que cruza activities (source=prospecting) com deals (value, is_won)
- Novo componente `ProspectingImpactSection` com 4 KPI cards e mini-chart
- Integracao com filtro de periodo existente
- Skeleton e empty state
- Testes unitarios para hook e componente

### OUT
- RPC no banco de dados (query client-side via Supabase, similar ao fallback de `useProspectingMetrics`)
- Metricas de corretor individual (use CorretorRanking existente — backlog futuro se necessario)
- Export de dados / relatorios PDF
- Alteracoes no schema do banco (tudo via campos existentes)
- Metricas historicas (antes de CP-5.1 vincular deals) — so conta dados de CP-5.1 em diante
- Dashboard separado (integrar no dashboard de prospeccao existente)

## Dependencies

- **CP-5.1 (Done):** Activities de prospeccao agora tem `deal_id` quando contato tem deal — sem isso, todas as metricas seriam zero
- **`useProspectingMetrics` existente:** Referencia para pattern de hook, filtro de periodo, e integracao com realtime
- Campo `metadata` JSONB com `source: 'prospecting'` (implementado em CP-1.1, usado em CP-5.1)
- Campo `deal_id` em activities (existente desde a criacao do schema)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Query de join activities↔deals pode ser lenta com muitos registros | Media | Medio | Limitar query ao periodo selecionado (WHERE date >= start AND date <= end). Indice em activities.date ja existe |
| Poucos dados de vinculacao (CP-5.1 recente, dados historicos sem deal_id) | Alta | Baixo | Aceitar — metricas vao crescer com o uso. Mensagem explicativa quando dados sao poucos |
| Valor de pipeline pode ser enganoso se deal tem muitas ligacoes | Baixa | Baixo | Contar cada deal UMA vez (DISTINCT deal_id), nao somar valor por ligacao |
| Metricas podem divergir do dashboard de deals | Media | Medio | Usar mesma logica de `is_won`/`is_lost` do `useDealsQuery`. Referenciar deals.value diretamente |

## Business Value

- **Gestores** podem medir ROI da prospeccao: quantas ligacoes geram negocios?
- **Decisao baseada em dados:** investir mais em prospeccao se conversao e alta, ajustar script se e baixa
- **Transparencia:** time de prospeccao demonstra seu impacto no faturamento
- **Tendencia temporal:** permite identificar periodos de alta/baixa conversao

## Criteria of Done

- [x] Secao "Impacto no Pipeline" visivel no dashboard de prospeccao
- [x] 4 KPI cards exibindo dados corretos (ligacoes com deal, taxa, valor pipeline, deals ganhos)
- [x] Filtro de periodo funcionando (consistente com filtro existente)
- [x] RBAC respeitado (mesmas regras do `useProspectingMetrics`)
- [x] Skeleton e empty state funcionando
- [x] Mini-chart de tendencia renderizando
- [x] Testes cobrem: hook com dados, sem dados, filtro de periodo, dedup de deals
- [x] Lint e typecheck passando (`npm run lint && npm run typecheck`)
- [x] Nenhuma regressao no dashboard de prospeccao existente

## Tasks

- [x] Task 1: Criar hook useProspectingImpact (AC: 1, 2, 3)
  - [x] Subtask 1.1: Criar `features/prospecting/hooks/useProspectingImpact.ts`
  - [x] Subtask 1.2: Definir interface `ProspectingImpact`:
    ```typescript
    interface ProspectingImpact {
      callsWithDeal: number        // activities com source=prospecting E deal_id != null
      totalProspectingCalls: number // activities com source=prospecting
      linkageRate: number           // callsWithDeal / totalProspectingCalls * 100
      pipelineValue: number         // SUM DISTINCT deals.value onde deal tem activity de prospeccao
      dealsWon: number              // COUNT DISTINCT deals onde is_won=true e tem activity de prospeccao
      dealsWonValue: number         // SUM DISTINCT deals.value dos deals ganhos
      byDay: { date: string; linked: number; unlinked: number }[]  // para mini-chart
    }
    ```
  - [x] Subtask 1.3: Query principal — `supabase.from('activities').select('id, deal_id, date, metadata').eq('type', 'CALL').gte('date', periodStart).lte('date', periodEnd)` e filtrar client-side onde `metadata.source === 'prospecting'`
  - [x] Subtask 1.4: Para ligacoes com deal_id, buscar deals: `supabase.from('deals').select('id, value, is_won, is_lost').in('id', distinctDealIds)`
  - [x] Subtask 1.5: Agregar client-side: count ligacoes com deal, DISTINCT deals para valor, is_won para deals ganhos
  - [x] Subtask 1.6: Gerar `byDay` agrupando ligacoes por data (linked vs unlinked) para o mini-chart
  - [x] Subtask 1.7: Aceitar `period: MetricsPeriod`, `customRange?: PeriodRange`, e `ownerId?: string` como parametros (mesma assinatura de `useProspectingMetrics` — linha 260-261). Usar `getDateRange(period, customRange)` para calcular datas. `ownerId` filtra por corretor (admin view).
  - [x] Subtask 1.8: Usar `useRealtimeSync('activities')` para invalidar cache automaticamente (mesmo pattern de `useProspectingMetrics` — linha 269)

- [x] Task 2: Criar componente ProspectingImpactSection (AC: 1, 4, 5, 6)
  - [x] Subtask 2.1: Criar `features/prospecting/components/ProspectingImpactSection.tsx`
  - [x] Subtask 2.2: 4 KPI cards no padrao de `MetricsCards`:
    - Card 1: "Ligacoes → Deal" (callsWithDeal / totalProspectingCalls) com icone Link
    - Card 2: "Taxa de Vinculacao" (linkageRate%) com icone TrendingUp
    - Card 3: "Pipeline Gerado" (pipelineValue formatado R$) com icone DollarSign
    - Card 4: "Deals Ganhos" (dealsWon, subtitle: dealsWonValue formatado R$) com icone Trophy
  - [x] Subtask 2.3: Mini-chart de tendencia usando Recharts (ja presente no projeto — usado por MetricsChart). Bar chart pequeno (height=120) com barras stacked (linked=emerald, unlinked=gray)
  - [x] Subtask 2.4: Skeleton loading state seguindo padrao de `MetricsCards`
  - [x] Subtask 2.5: Empty state quando `totalProspectingCalls === 0`: mensagem "Sem dados de impacto no periodo selecionado"

- [x] Task 3: Integrar no dashboard de prospeccao (AC: 2)
  - [x] Subtask 3.1: Em `features/prospecting/ProspectingPage.tsx`, importar `ProspectingImpactSection` (NÃO em `app/(protected)/prospecting/page.tsx` — esse e apenas wrapper com dynamic import)
  - [x] Subtask 3.2: Renderizar abaixo de `CallDetailsTable` (linha ~685), dentro do bloco de metricas (tab "metricas")
  - [x] Subtask 3.3: Passar `metricsPeriod`, `customRange`, `metricsFilterOwnerId` (mesmos params ja usados por `metricsHook` na linha 123)
  - [x] Subtask 3.4: Envolver em `<ProspectingErrorBoundary section="Impacto">` (pattern existente — linhas 639, 654, 667)

- [x] Task 4: Testes (AC: 1, 2, 4, 6)
  - [x] Subtask 4.1: Teste do `useProspectingImpact` — com activities com deal_id, sem deal_id, mistas
  - [x] Subtask 4.2: Teste de deduplicacao de deals — mesmo deal_id em 3 ligacoes conta valor do deal 1x
  - [x] Subtask 4.3: Teste do `ProspectingImpactSection` — renderiza 4 cards, skeleton, empty state
  - [x] Subtask 4.4: Teste de filtro de periodo — dados fora do range nao sao contados

## Dev Notes

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| useProspectingImpact | `features/prospecting/hooks/useProspectingImpact.ts` | Novo hook |
| ProspectingImpactSection | `features/prospecting/components/ProspectingImpactSection.tsx` | Novo componente |
| ProspectingPage | `features/prospecting/ProspectingPage.tsx` | Integrar nova secao (apos CallDetailsTable) |
| prospectingImpact.test | `features/prospecting/__tests__/prospectingImpact.test.tsx` | Novo — 10 testes |
| directorAssignment.test | `features/prospecting/__tests__/directorAssignment.test.tsx` | Adicionado mock do useProspectingImpact |

### Pattern de referencia — useProspectingMetrics

O `useProspectingMetrics.ts` (linhas 259-385) usa o seguinte pattern:
1. RPC call (caminho primario) com fallback para query direta
2. `useRealtimeSync('activities')` para cache invalidation
3. Client-side aggregation via funcao `aggregateMetrics()`
4. `PeriodRange` como parametro para filtro de datas

Para CP-5.3, usar o **mesmo pattern** mas sem RPC (query direta e suficiente — volume de dados menor, so activities com source=prospecting).

### Query de activities de prospeccao — proposta

```typescript
const { data: activities } = await supabase
  .from('activities')
  .select('id, deal_id, date, metadata')
  .eq('type', 'CALL')
  .gte('date', period.start)
  .lte('date', period.end)
  .is('deleted_at', null)

// Filtrar client-side (metadata e JSONB, filtrar por source)
const prospectingCalls = (activities || []).filter(
  a => (a.metadata as Record<string, unknown>)?.source === 'prospecting'
)
```

**Nota:** Filtrar `metadata->>'source'` via Supabase e possivel com `.eq('metadata->>source', 'prospecting')` mas o operador `metadata->>` pode nao funcionar corretamente com RLS em todos os cenarios. Filtrar client-side e mais seguro e o volume e pequeno (limitado ao periodo).

### Query de deals vinculados — proposta

```typescript
const dealIds = [...new Set(prospectingCalls.filter(a => a.deal_id).map(a => a.deal_id!))]

const { data: linkedDeals } = dealIds.length > 0
  ? await supabase.from('deals').select('id, value, is_won').in('id', dealIds)
  : { data: [] }
```

### Componentes Recharts disponiveis

O projeto ja usa Recharts (importado em `MetricsChart.tsx`):
- `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`
- Tema dark mode via `useDarkMode()` hook

### Formatacao de valores monetarios

Usar `Intl.NumberFormat` padrao do projeto:
```typescript
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
```

### ProspectingPage — ponto de integracao

**ATENCAO:** `app/(protected)/prospecting/page.tsx` e apenas um wrapper com dynamic import. O componente real e `features/prospecting/ProspectingPage.tsx`.

`ProspectingPage.tsx` renderiza no tab "metricas" (linhas 639-685):
1. `MetricsCards` (linha 640)
2. `ConversionFunnel` + `MetricsChart` (linhas 643-650)
3. `ConnectionHeatmap` (linha 655)
4. `AutoInsights` (linha 661)
5. `TopObjections` (linha 664)
6. `SessionHistory` (linha 668)
7. `CorretorRanking` — admin/diretor only (linha 675)
8. `CallDetailsTable` (linha 681)

Adicionar `ProspectingImpactSection` apos item 8 (CallDetailsTable).

**Hook instanciacao (linha 123):**
```typescript
const metricsHook = useProspectingMetrics(metricsPeriod, customRange, profiles, metricsFilterOwnerId || undefined)
```

O novo hook `useProspectingImpact` deve aceitar os mesmos params (`metricsPeriod`, `customRange`, `metricsFilterOwnerId`) para consistencia com o filtro de periodo e owner.

### Testing

- **Localizacao de testes:** `features/prospecting/__tests__/`
- **Framework:** Jest + React Testing Library
- **Padrao:** Mock de supabase client, render do componente, assert de output
- **Referencia:** Testes de CP-5.1 em `features/prospecting/__tests__/dealLinking.test.tsx`

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (hook + componentes + visualizacao)
- **Secondary Type(s):** Nenhuma (sem alteracoes de backend/schema)
- **Complexity:** Medium — 1 hook novo, 1 componente novo, integracao em page existente

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
- Performance: query de activities filtrada por periodo (nao carregar tudo). Dedup de deals via Set
- Consistencia: valores monetarios formatados no padrao pt-BR. Mesmas cores do design system

Secondary Focus:
- Acessibilidade: KPI cards acessiveis com aria-labels. Chart com texto alternativo
- Error handling: query failures devem mostrar estado vazio, nao crash

## QA Results

**Reviewer:** @qa (Quinn)
**Date:** 2026-03-12
**Verdict:** PASS

### Review Summary

| Check | Status |
|-------|--------|
| AC1: 4 KPI cards | PASS |
| AC2: Filtro de periodo | PASS |
| AC3: RBAC via RLS | PASS |
| AC4: Mini-chart tendencia | PASS |
| AC5: Loading skeleton | PASS |
| AC6: Empty state | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Testes (10/10) | PASS |
| Regressoes | Nenhuma |
| Performance | OK |
| Seguranca | OK |

### Issues Encontradas e Resolvidas

| Severidade | Issue | Resolucao |
|-----------|-------|-----------|
| MEDIUM | Cor `#94a3b8` hardcoded no bar "Sem Deal" — deveria usar constante centralizada | Corrigido: importou `DEFAULT_STAGE_COLOR` de `@/lib/constants/chart-colors` |
| MEDIUM | Query key `distinctDealIds.slice(0, 5)` podia causar colisao de cache com >5 deals | Corrigido: substituido por `distinctDealIds.sort().join(',')` para key deterministica |

### Gate Decision

**PASS** — Todos os ACs verificados, 9/9 Criteria of Done atendidos, 2 issues MEDIUM corrigidos e re-verificados. Typecheck limpo, 10/10 testes passando, nenhuma regressao.

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-12 | 1.0 | Story criada | @sm (River) |
| 2026-03-12 | 1.1 | Validacao GO (10/10). SF-1 corrigido: integration point era `page.tsx` (wrapper), corrigido para `ProspectingPage.tsx`. SF-2: hook params alinhados com `useProspectingMetrics` signature. Status Draft -> Ready. | @po (Pax) |
| 2026-03-12 | 1.2 | QA PASS — 6/6 ACs verificados, 2 issues MEDIUM corrigidos e re-verificados. 10/10 testes. | @qa (Quinn) |
| 2026-03-12 | 1.3 | Conclusao validada. ACs marcados, status Ready for Review -> Done. | @po (Pax) |

---

*Story gerada por @sm (River) — Epic CP-5*
