# Story CC-1: Data Layer — Hook Agregador + Cálculos Imobiliários

## Metadata
- **Story ID:** CC-1
- **Epic:** CC (Central de Comando — Dashboard Executivo Unificado)
- **Status:** Ready for Review
- **Priority:** P1
- **Estimated Points:** 8 (M)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, unit_test, pattern_validation]

## Story

**As a** diretor/admin do ZmobCRM,
**I want** ter um hook agregador que consolide métricas de múltiplas fontes e calcule KPIs imobiliários específicos (comissão, split por tipo de negócio, semáforos de pulse, alertas e temperatura de leads),
**so that** a Central de Comando possa renderizar todos os 7 blocos executivos com dados calculados e prontos para exibição, sem lógica de negócio espalhada nos componentes de UI.

## Descrição

Atualmente o ZmobCRM possui dois hooks de métricas maduros — `useDashboardMetrics` (funil, receita, contatos, ciclo de vendas) e `useProspectingMetrics` (ligações, conexão, agendamentos) — mas nenhum os agrega em uma visão unificada para o nível de diretor.

A Central de Comando precisa de uma camada de dados própria que:
1. Consuma os hooks existentes sem duplicar lógica
2. Calcule KPIs imobiliários que não existem em nenhum hook atual (comissão, split VENDA/LOCAÇÃO, temperatura agregada de contatos)
3. Implemente regras de semáforo automáticas (Pulse) baseadas em thresholds de KPIs
4. Gere alertas operacionais inteligentes (propostas paradas, leads HOT sem atividade, corretores abaixo da meta, churn)
5. Enriqueça o leaderboard de corretores com contagem de ligações (join com activities)

Esta story entrega exclusivamente a camada de dados. UI, roteamento e PDF ficam fora do escopo.

## Acceptance Criteria

- [ ] AC1: Hook `useCommandCenterMetrics(period, boardId)` retorna todos os dados necessários para os 7 blocos da Central de Comando
- [ ] AC2: Consome `useDashboardMetrics` internamente — não duplica lógica de funil, receita, win rate ou ciclo de vendas
- [ ] AC3: Consome `useProspectingMetrics` para resumo de prospecção (ligações, taxa de conexão, agendamentos, propostas enviadas)
- [ ] AC4: Calcula **Comissão Gerada**: `sum(wonDeals.value * ((deal.commissionRate ?? 5) / 100))` — `commissionRate` é percentual 0-100 (tipo `number | null`), fallback 5% quando null/undefined
- [ ] AC5: Calcula **split por deal_type**: contagem e valor total separados para VENDA vs LOCAÇÃO
- [ ] AC6: Calcula **Pulse semaphores**: regras automáticas baseadas nos KPIs — receita +10% = verde, -5% a +5% = amarelo, <-5% = vermelho (mesma lógica para win rate e volume)
- [ ] AC7: Calcula **Alertas operacionais**: (a) propostas paradas +7 dias sem mudança de stage nos últimos N stages do funil — heurística por posição UUID, não por label; (b) leads HOT sem atividade há 3+ dias; (c) corretores abaixo de 50% da meta; (d) churn acima de threshold configurável
- [ ] AC8: Calcula **temperatura agregada**: contagem de HOT/WARM/COLD do total de contatos ativos — `useDashboardMetrics` não expõe temperatura, requer query direta em `contacts` com filtro `temperature` (tipo `ContactTemperature = 'HOT' | 'WARM' | 'COLD'`)
- [ ] AC9: Retorna leaderboard enriquecido com contagem de ligações por corretor (join activities `type=CALL`)
- [ ] AC10: Retorna resumo de prospecção: total ligações, taxa de conexão, agendamentos, propostas enviadas
- [ ] AC11: Testes unitários cobrem os cálculos de comissão, pulse rules, e lógica de alertas

## Scope

### IN
- Hook principal `useCommandCenterMetrics(period, boardId)` em `features/command-center/hooks/`
- Utilitário `pulse-rules.ts` — regras de semáforo (verde/amarelo/vermelho) para cada KPI
- Utilitário `alert-rules.ts` — detecção de propostas paradas, leads HOT inativos, corretores abaixo da meta, churn
- Arquivo de testes unitários `__tests__/useCommandCenterMetrics.test.ts`
- Tipos TypeScript internos ao módulo (interfaces de retorno do hook)

### OUT
- Qualquer componente de UI (blocos, cards, gráficos) — pertencem a CC-2 e histórias seguintes
- Roteamento de página (`/command-center`) — pertencem a histórias de UI
- Export PDF — pertencem a histórias de export
- Lógica de autenticação ou permissões RBAC adicionais — já tratadas nos hooks consumidos
- Mutations ou operações de escrita
- WebSockets / real-time subscriptions

## Dependencies

| Dependência | Tipo | Detalhe |
|-------------|------|---------|
| `useDashboardMetrics` | Hook existente | `features/dashboard/hooks/useDashboardMetrics.ts` — deve estar estável |
| `useProspectingMetrics` | Hook existente | `features/prospecting/hooks/useProspectingMetrics.ts` — deve estar estável |
| TanStack Query | Biblioteca | Para queries diretas de activities (leaderboard de ligações) |
| Supabase client | Infra | Para query de activities com `type=CALL` |
| Vitest + React Testing Library | Dev | Framework de testes do projeto |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| `commissionRate` null em maioria dos deals | Alta | Médio | Fallback 5% (valor 5 / 100) documentado no AC4 — não é erro |
| Stage positions dinâmicas (UUIDs) dificultam detecção de "últimos N stages" | Alta | Alto | Usar ordem de `position` do board ao invés de label; documentar a heurística no código |
| `useProspectingMetrics` pode exigir `profiles` como parâmetro obrigatório | Média | Alto | Validar a interface real do hook antes de consumir; adaptar chamada conforme necessário |
| Performance de query de activities (join para leaderboard de ligações) | Baixa | Médio | Limitar janela temporal com filtro de período; índice `activities.type` existente |
| Thresholds de alerta sem configuração de meta por corretor | Média | Médio | Usar 50% de meta como heurística; documentar como configurável em iterações futuras |

## Business Value

O diretor hoje não tem visão executiva unificada — precisa abrir 3 telas diferentes para ver funil, prospecção e equipe. Esta story entrega a infraestrutura de dados que permite a Central de Comando consolidar tudo em um único dashboard. O impacto direto é redução de tempo de análise gerencial e aumento de capacidade de gestão da equipe sem depender de relatórios manuais.

## Criteria of Done

- [ ] `useCommandCenterMetrics` criado e exportado de `features/command-center/hooks/`
- [ ] `pulse-rules.ts` criado com cobertura para receita, win rate e volume
- [ ] `alert-rules.ts` criado com cobertura para propostas paradas, leads HOT, corretores e churn
- [ ] Testes unitários passando (`npm test`) — cobertura de comissão, pulse e alertas
- [ ] `npm run typecheck` sem erros
- [ ] `npm run lint` sem erros
- [ ] Nenhum hook existente (`useDashboardMetrics`, `useProspectingMetrics`) foi modificado
- [ ] Nenhum componente de UI foi criado nesta story

## Tasks

### Task 1 — Estrutura do módulo command-center (AC1)
- [x] Task 1.1: Criar diretório `features/command-center/` com subpastas: `hooks/`, `utils/`, `__tests__/`
- [x] Task 1.2: Criar `features/command-center/hooks/index.ts` exportando o hook principal
- [x] Task 1.3: Definir interfaces TypeScript de retorno do hook (`CommandCenterMetrics`, `PulseStatus`, `Alert`, `DealTypeSplit`, `LeaderboardEntry`, `ProspectingSummary`)

### Task 2 — pulse-rules.ts: Semáforos de KPI (AC6)
- [x] Task 2.1: Criar `features/command-center/utils/pulse-rules.ts`
- [x] Task 2.2: Implementar `getPulseStatus(current, previous, thresholds): 'green' | 'yellow' | 'red'`
  - green: variação > +10%
  - yellow: variação entre -5% e +10%
  - red: variação < -5%
- [x] Task 2.3: Implementar `getPulseStatusForRevenue`, `getPulseStatusForWinRate`, `getPulseStatusForVolume` usando a função base com os mesmos thresholds padrão
- [x] Task 2.4: Exportar `PulseThresholds` interface para permitir customização futura

### Task 3 — alert-rules.ts: Detecção de Alertas Operacionais (AC7)
- [x] Task 3.1: Criar `features/command-center/utils/alert-rules.ts`
- [x] Task 3.2: Implementar `detectStagnantDeals(deals, stagePositions, daysThreshold = 7)`:
  - Filtrar deals nos últimos N stages do funil por posição (UUID-agnostic)
  - Retornar deals sem mudança de stage nos últimos `daysThreshold` dias
  - Heurística: "últimos N stages" = stages com position >= (maxPosition - N)
- [x] Task 3.3: Implementar `detectHotLeadsWithoutActivity(contacts, activities, daysThreshold = 3)`:
  - Contacts com temperatura HOT sem nenhuma activity nos últimos 3 dias
- [x] Task 3.4: Implementar `detectUnderperformingBrokers(leaderboard, goalThreshold = 0.5)`:
  - Corretores com performance < 50% da meta (se meta disponível) ou < 50% do maior performer
- [x] Task 3.5: Implementar `detectHighChurn(metrics, churnThreshold = 0.1)`:
  - Churn acima de 10% como threshold padrão
- [x] Task 3.6: Exportar interface `Alert { type, severity, message, affectedCount, data }`

### Task 4 — useCommandCenterMetrics: Hook principal (AC1–AC10)
- [x] Task 4.1: Criar `features/command-center/hooks/useCommandCenterMetrics.ts`
- [x] Task 4.2: Consumir `useDashboardMetrics(period, boardId)` — não reimplementar lógica de funil (AC2)
- [x] Task 4.3: Consumir `useProspectingMetrics` com params corretos (period, profiles) — verificar interface real do hook antes de implementar (AC3)
- [x] Task 4.4: Implementar cálculo de comissão gerada (AC4):
  ```typescript
  const generatedCommission = useMemo(() =>
    dashboardData.wonDeals?.reduce((sum, deal) =>
      sum + (deal.value * ((deal.commissionRate ?? 5) / 100)), 0) ?? 0,
    [dashboardData.wonDeals]
  )
  ```
- [x] Task 4.5: Implementar split por deal_type — VENDA vs LOCAÇÃO em contagem e valor (AC5)
- [x] Task 4.6: Calcular pulse semaphores usando `pulse-rules.ts` com dados de `changes` do `useDashboardMetrics` (AC6)
- [x] Task 4.7: Calcular temperatura agregada HOT/WARM/COLD dos contatos ativos (AC8)
- [x] Task 4.8: Query de activities `type=CALL` para enriquecer leaderboard com ligações por corretor (AC9):
  ```typescript
  const { data: callActivities } = useQuery({
    queryKey: ['command-center', 'calls', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('owner_id, created_at')
        .eq('type', 'CALL')
      if (error) throw error
      return data
    },
    staleTime: 30 * 1000,
  })
  ```
- [x] Task 4.9: Calcular alertas operacionais usando `alert-rules.ts` (AC7)
- [x] Task 4.10: Montar e retornar objeto `CommandCenterMetrics` consolidado (AC1, AC10)
- [x] Task 4.11: Garantir `isLoading` consolidado (true se qualquer fonte ainda carregando)

### Task 5 — Testes unitários (AC11)
- [x] Task 5.1: Criar `features/command-center/__tests__/useCommandCenterMetrics.test.ts`
- [x] Task 5.2: Testes para cálculo de comissão (AC4):
  - Deal com `commissionRate` explícito (ex: 6 = 6%)
  - Deal sem `commissionRate` (null → fallback 5%)
  - Lista vazia de deals ganhos
- [x] Task 5.3: Testes para pulse-rules (AC6):
  - Variação +15% → green
  - Variação +2% → yellow
  - Variação -10% → red
  - Variação exatamente em boundary (+10%, -5%)
- [x] Task 5.4: Testes para alert-rules (AC7):
  - `detectStagnantDeals` com deal parado 8 dias → alerta; 5 dias → sem alerta
  - `detectHotLeadsWithoutActivity` com lead HOT sem activity em 4 dias → alerta
  - `detectUnderperformingBrokers` com corretor a 40% → alerta; 60% → sem alerta
- [x] Task 5.5: Mock de `useDashboardMetrics` e `useProspectingMetrics` via `vi.mock`

### Task 6 — Quality Gate
- [x] Task 6.1: `npm run typecheck` sem erros
- [x] Task 6.2: `npm run lint` sem erros
- [x] Task 6.3: `npm test` passa sem regressões

## Dev Notes

### Hooks Existentes — Interfaces de Consumo

**`useDashboardMetrics(period, boardId?)`**
Path: `features/dashboard/hooks/useDashboardMetrics.ts`
[Source: Epic CC]

```typescript
// Retorno relevante para CC-1:
{
  isLoading: boolean
  deals: Deal[]
  wonDeals: Deal[]          // Usado para cálculo de comissão (AC4) e split (AC5)
  wonRevenue: number
  winRate: number
  pipelineValue: number
  funnelData: FunnelStage[]
  activeContacts: number
  inactiveContacts: number
  churnedContacts: number
  avgLTV: number
  riskyCount: number
  stagnantDealsCount: number
  stagnantDealsValue: number
  avgSalesCycle: number
  lostDeals: Deal[]
  // Variações para pulse semaphores:
  changes: {
    pipeline: number    // variação % em relação ao período anterior
    deals: number
    winRate: number
    revenue: number
  }
  activeSnapshotDeals: Deal[]  // Deals ativos para detecção de propostas paradas
}
```

Parâmetros:
- `period`: `PeriodFilter` — `'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year'`
- `boardId`: string opcional (filtra por pipeline)
- Usa `useMemo` internamente — não recriar memoização no hook consumidor

**`useProspectingMetrics(period, customRange?, profiles, filterOwnerId?, comparisonEnabled?)`**
Path: `features/prospecting/hooks/useProspectingMetrics.ts`
[Source: Epic CC]

```typescript
// Retorno relevante para CC-1:
{
  metrics: {
    totalCalls: number
    connectedCalls: number
    connectionRate: number    // Usado em AC10
    avgDuration: number
    uniqueContacts: number
    byBroker: BrokerMetric[]  // Usado em AC9 (enriquecer leaderboard)
  }
  isLoading: boolean
  isFetching: boolean
  error: unknown
  isAdminOrDirector: boolean
}

// BrokerMetric:
interface BrokerMetric {
  ownerId: string
  ownerName: string
  totalCalls: number
  connectedCalls: number
  connectionRate: number
  avgDuration: number
  uniqueContacts: number
}
```

IMPORTANTE: `profiles` pode ser obrigatório — verificar a assinatura real do hook antes de implementar. Se necessário, usar `undefined` ou array vazio para modo "todos os corretores". [Source: Epic CC]

### Cálculos Imobiliários

**Comissão Gerada (AC4):**
```typescript
const generatedCommission = wonDeals.reduce(
  (sum, deal) => sum + (deal.value * ((deal.commissionRate ?? 5) / 100)),
  0
)
// commissionRate: number | null (0-100, percentual). Fallback: 5 (5%) quando null/undefined
// Campo no tipo Deal: commissionRate?: number | null (linha 299 de types.ts)
```
[Source: Epic CC]

**Split por deal_type (AC5):**
```typescript
const dealTypeSplit = {
  VENDA: {
    count: wonDeals.filter(d => d.deal_type === 'VENDA').length,
    value: wonDeals.filter(d => d.deal_type === 'VENDA').reduce((s, d) => s + d.value, 0)
  },
  LOCACAO: {
    count: wonDeals.filter(d => d.deal_type === 'LOCACAO').length,
    value: wonDeals.filter(d => d.deal_type === 'LOCACAO').reduce((s, d) => s + d.value, 0)
  }
}
```
[Source: Epic CC]

**Temperatura Agregada (AC8):**
Contar HOT/WARM/COLD dos contatos ativos. `useDashboardMetrics` **não** expõe temperatura — requer query direta em `contacts` com filtro no campo `temperature` (tipo `ContactTemperature = 'HOT' | 'WARM' | 'COLD'`, campo `temperature` na tabela `contacts`). Usar TanStack Query similar ao pattern de `callActivities` na Task 4.8.

### Pulse Semaphores — Regras (AC6)

As regras se aplicam a qualquer variação percentual em relação ao período anterior:
```typescript
// green:  variação > +10%
// yellow: variação entre -5% e +10% (inclusive os extremos)
// red:    variação < -5%

function getPulseStatus(changePercent: number): 'green' | 'yellow' | 'red' {
  if (changePercent > 10) return 'green'
  if (changePercent < -5) return 'red'
  return 'yellow'
}
```
O hook `useDashboardMetrics` já retorna `changes.revenue`, `changes.winRate`, `changes.pipeline`, `changes.deals` como variações percentuais.
[Source: Epic CC]

### Alertas Operacionais — Heurística de Stage (AC7a)

Stages são dinâmicos (UUIDs) — nunca usar label para detectar "últimos stages do funil". Usar `position` numérica da stage. Heurística: considerar como "fundo do funil" stages com `position >= maxPosition - 2` (configurable).

```typescript
// Exemplo de detecção:
const maxPosition = Math.max(...boardStages.map(s => s.position))
const lateStages = boardStages.filter(s => s.position >= maxPosition - 2)
const lateStageIds = lateStages.map(s => s.id)
const stagnantDeals = activeDeals.filter(deal =>
  lateStageIds.includes(deal.stage_id) &&
  daysSince(deal.stage_updated_at) >= 7
)
```
[Source: Epic CC]

### Padrão de Query (TanStack React Query)

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

const { data, isLoading } = useQuery({
  queryKey: ['command-center', 'calls', period],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('owner_id, created_at')
      .eq('type', 'CALL')
    if (error) throw error
    return data
  },
  enabled: !!user,
  staleTime: 30 * 1000,
})
```
[Source: Padrão do projeto observado em hooks existentes]

### Design Tokens (referência para tipagem futura)

```typescript
// lib/design-tokens.ts
CHART_PALETTE: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6']
OUTCOME_COLORS: { connected: '#10b981', no_answer: '#ef4444', voicemail: '#f59e0b', busy: '#6b7280' }
// Pulse colors sugeridos: green=#10b981, yellow=#f59e0b, red=#ef4444
```
[Source: Epic CC]

### Source Tree — Arquivos desta Story

```
features/
  command-center/
    hooks/
      useCommandCenterMetrics.ts    (CRIAR — hook principal)
      index.ts                      (CRIAR — barrel export)
    utils/
      pulse-rules.ts                (CRIAR — semáforos)
      alert-rules.ts                (CRIAR — alertas operacionais)
    __tests__/
      useCommandCenterMetrics.test.ts  (CRIAR — testes unitários)
```

Arquivos consumidos (não modificar):
```
features/dashboard/hooks/useDashboardMetrics.ts
features/prospecting/hooks/useProspectingMetrics.ts
```
[Source: Epic CC]

### Testing

**Framework:** Vitest + React Testing Library
**Padrão de mocks:**
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'user-1', role: 'admin' } })
}))

vi.mock('@/features/dashboard/hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: () => ({
    isLoading: false,
    wonDeals: [
      { id: 'deal-1', value: 100000, commissionRate: 6, dealType: 'VENDA' },
      { id: 'deal-2', value: 50000, commissionRate: null, dealType: 'LOCACAO' }
    ],
    changes: { revenue: 12, winRate: -3, pipeline: 8, deals: 5 }
  })
}))
```
[Source: Padrão observado em features/contacts/__tests__ e Epic CC]

**Localização dos testes:** `features/command-center/__tests__/useCommandCenterMetrics.test.ts`
**Comando:** `npm test` (Vitest)

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Architecture (novo módulo de agregação de dados, padrões de composição de hooks)
- Secondary Type(s): Frontend (React hooks, memoização, TanStack Query)
- Complexity: Medium (múltiplos hooks consumidos, cálculos de negócio, testes unitários — sem schema ou endpoints novos)

**Specialized Agent Assignment:**

Primary Agents:
- @dev (implementação e pre-commit reviews)
- @architect (validação do padrão de composição de hooks e separação de responsabilidades)

Supporting Agents:
- @qa (quality gate — unit tests coverage e pattern validation)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted` antes de marcar story completa
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main` antes de criar PR

**Self-Healing Configuration:**

Expected Self-Healing:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutes
- Severity Filter: CRITICAL only

Predicted Behavior:
- CRITICAL issues: auto_fix (até 2 iterações)
- HIGH issues: document_as_debt (registrado em Dev Notes)
- MEDIUM issues: ignore
- LOW issues: ignore

**CodeRabbit Focus Areas:**

Primary Focus:
- Composição de hooks: `useDashboardMetrics` e `useProspectingMetrics` consumidos sem reimplementar lógica (AC2, AC3)
- Memoização: `useMemo` em cálculos derivados (comissão, split, temperatura) para evitar recomputação desnecessária
- Testes: cobertura de comissão com e sem `commissionRate`, pulse rules nos três estados, alertas com e sem triggers

Secondary Focus:
- Imports absolutos (`@/features/...`) — nenhum import relativo
- TypeScript strict: sem `any`, interfaces explícitas para todos os retornos
- Heurística de stage UUID-agnostic documentada em comentário no código

## File List

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `features/command-center/hooks/useCommandCenterMetrics.ts` | Criado | Hook principal que agrega `useDashboardMetrics` + `useProspectingMetrics` e calcula KPIs imobiliários |
| `features/command-center/hooks/index.ts` | Criado | Barrel export do módulo de hooks |
| `features/command-center/utils/pulse-rules.ts` | Criado | Regras de semáforo (green/yellow/red) para KPIs de receita, win rate e volume |
| `features/command-center/utils/alert-rules.ts` | Criado | Funções de detecção de alertas operacionais (propostas paradas, HOT inativos, corretores, churn) |
| `features/command-center/__tests__/useCommandCenterMetrics.test.ts` | Criado | Testes unitários para comissão, pulse rules e alert rules (33 tests passing) |

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-03-15 | 1.0 | Story criada a partir do Epic CC (Central de Comando — Dashboard Executivo Unificado) | @sm (River) |
| 2026-03-15 | 1.1 | PO review fixes: `commission_rate` → `commissionRate` (camelCase, 0-100), AC8 clarificado (query direta, não via useDashboardMetrics), mocks corrigidos para camelCase | @sm (River) |
| 2026-03-15 | 1.2 | PO re-validação: 10/10 GO — Status Draft → Ready | @po (Pax) |
| 2026-03-15 | 2.0 | Implementation complete — 5 files created, 33 tests passing, typecheck/lint clean, no regressions | @dev (Dex) |
