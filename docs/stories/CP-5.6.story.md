# Story CP-5.6: Dashboard Real-Time para Gestores

## Metadata
- **Story ID:** CP-5.6
- **Epic:** CP-5 (Prospeccao — Rastreabilidade & Visao Gerencial)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 5 (M)
- **Wave:** 3
- **Assigned Agent:** @dev
- **Dependencies:** Nenhuma bloqueante — `prospecting_sessions` ja existe (CP-3.4), Supabase Realtime ja habilitado

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, performance_check]

## Story

**As a** diretor/admin do ZmobCRM,
**I want** um painel em tempo real que mostre quais corretores estao em sessao de prospeccao agora, com indicadores de atividade e alertas de inatividade,
**so that** eu consiga supervisionar a operacao diaria sem precisar entrar no contexto de cada corretor individualmente.

## Descricao

**Problema:**

O diretor nao tem visibilidade em tempo real da operacao de prospeccao. Nao sabe quem esta ligando agora, quantas sessoes estao ativas simultaneamente, ou se algum corretor parou de ligar ha muito tempo. Para entender o que esta acontecendo, precisa perguntar diretamente a cada corretor ou verificar metricas apos o fato.

**Dados disponiveis:**

A tabela `prospecting_sessions` (CP-3.4) ja registra sessoes com `started_at`, `ended_at` (null = ativa), e `stats` JSONB. A tabela `activities` registra cada ligacao com `date`, `owner_id`, e `metadata` (outcome, duration). Ambas tem RLS que permite admin/director ver dados da organizacao. `prospecting_sessions` ja esta publicada no Supabase Realtime.

**Solucao:**

Painel "Operacao Ao Vivo" na aba Metricas (visivel apenas para admin/diretor) com:

1. **Contador de sessoes ativas** — badge com total de sessoes em andamento
2. **Lista de corretores em sessao** — nome, duracao da sessao, ultimo outcome logado, tempo desde ultima ligacao, stats parciais (ligacoes feitas / atendidas)
3. **Alerta de inatividade** — badge vermelho em corretores com sessao ativa mas sem ligacao ha mais de 15 minutos

## Acceptance Criteria

- [x] AC1: O painel "Operacao Ao Vivo" e visivel APENAS para admin/diretor na aba Metricas do dashboard de prospeccao
- [x] AC2: O painel exibe um contador com o total de sessoes ativas no momento (ex: "3 sessoes ativas")
- [x] AC3: Para cada sessao ativa, lista: nome do corretor, duracao da sessao (formatada HH:MM:SS atualizando a cada segundo), ultimo outcome logado (badge colorido), e tempo desde a ultima ligacao
- [x] AC4: Corretores com sessao ativa mas sem ligacao registrada ha mais de 15 minutos exibem um badge vermelho "Inativo" ao lado do nome
- [x] AC5: Os dados atualizam em tempo real via Supabase Realtime — novas sessoes aparecem, sessoes encerradas desaparecem, e novas ligacoes atualizam o "ultimo outcome" sem necessidade de refresh manual
- [x] AC6: Quando nenhuma sessao esta ativa, o painel exibe mensagem "Nenhum corretor em sessao no momento" com icone ilustrativo
- [x] AC7: O painel NAO aparece para corretores (role = 'corretor') — apenas admin e diretor
- [x] AC8: Os stats parciais de cada sessao (ligacoes feitas, atendidas) sao exibidos ao lado do nome do corretor

## Scope

### IN
- Adicionar `'prospecting_sessions'` ao tipo `RealtimeTable` e ao mapeamento de query keys em `realtimeConfig.ts`
- Criar funcao `getOrgActiveSessions(organizationId)` em `prospecting-sessions.ts` para buscar todas as sessoes ativas da organizacao (RLS admin/director ja permite)
- Criar hook `useLiveOperations` que combina Realtime de `prospecting_sessions` + `activities` para manter estado atualizado
- Criar componente `LiveOperationsPanel` com lista de sessoes, contador, timer real-time, e alertas de inatividade
- Renderizar `LiveOperationsPanel` condicionalmente (admin/diretor only) na aba Metricas do ProspectingPage
- Adicionar query key `liveOperations` para cache management
- Testes unitarios

### OUT
- Configuracao do threshold de inatividade pelo usuario (hardcoded 15 min, configurabilidade futura)
- Notificacao push/toast quando corretor fica inativo (painel apenas visual)
- Historico de sessoes passadas no painel real-time (ja existe em SessionHistory)
- Chat ou mensagem direta para o corretor a partir do painel
- Mudancas no schema do banco de dados (tudo via tabelas existentes)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Realtime subscription adicional pode impactar performance | Baixa | Medio | `prospecting_sessions` tem poucos rows ativos (max ~10-20), subscription e leve. Usar channel unico para ambas tabelas |
| Timer de duracao (atualizar a cada segundo) pode causar re-renders excessivos | Media | Baixo | Usar `useRef` + `requestAnimationFrame` ou `setInterval` isolado em componente filho (`SessionTimer`) para evitar re-render do painel inteiro |
| `getActiveSessions` filtra por `owner_id` — precisa de funcao nova para org-wide | Baixa | Baixo | Criar `getOrgActiveSessions` — RLS admin policy ja existe na migration |
| Ultima ligacao do corretor requer cross-reference com `activities` | Media | Baixo | Buscar ultima activity do owner_id no periodo (query simples com indice existente em `activities.owner_id`) |

## Business Value

- **Supervisao em tempo real:** diretor ve quem esta trabalhando sem interromper
- **Deteccao de inatividade:** identifica rapidamente corretores que pararam de ligar (sessao aberta, sem acao)
- **Visao operacional:** sabe quantas sessoes estao rodando simultaneamente, util para gestao de capacidade
- **Transparencia:** corretores sabem que estao sendo observados, incentivo indireto para produtividade

## Criteria of Done

- [x] Painel "Operacao Ao Vivo" visivel apenas para admin/diretor
- [x] Contador de sessoes ativas exibido corretamente
- [x] Lista de sessoes mostra: nome, duracao, ultimo outcome, tempo desde ultima ligacao
- [x] Badge "Inativo" aparece apos 15 minutos sem ligacao com sessao ativa
- [x] Dados atualizam via Realtime (sem refresh manual)
- [x] Empty state quando nenhuma sessao ativa
- [x] `prospecting_sessions` adicionada ao `RealtimeTable` type e query key mapping
- [x] Testes cobrem: painel visivel/invisivel por role, sessoes ativas/vazias, alerta inatividade, timer
- [x] Lint e typecheck passando (`npm run lint && npm run typecheck`)
- [x] Nenhuma regressao no dashboard de prospeccao

## Tasks

- [x] Task 0: Registrar `prospecting_sessions` no sistema de Realtime (pre-requisito para AC5)
  - [x] Subtask 0.1: Em `lib/realtime/realtimeConfig.ts`, adicionar `'prospecting_sessions'` ao tipo `RealtimeTable`
  - [x] Subtask 0.2: Adicionar query key `liveOperations` em `lib/query/queryKeys.ts`: `liveOperations: createQueryKeys('liveOperations')`
  - [x] Subtask 0.3: Em `getTableQueryKeys`, mapear `prospecting_sessions` para `[queryKeys.liveOperations.all]`

- [x] Task 1: Criar funcao `getOrgActiveSessions` (AC: 2, 3, 8)
  - [x] Subtask 1.1: Em `lib/supabase/prospecting-sessions.ts`, criar `getOrgActiveSessions(organizationId: string): Promise<ProspectingSession[]>` — query `prospecting_sessions` WHERE `organization_id = $1 AND ended_at IS NULL` ORDER BY `started_at ASC`
  - [x] Subtask 1.2: A query deve retornar `id, owner_id, organization_id, started_at, stats` — nao precisa de `ended_at` (sempre null para ativas)
  - [x] Subtask 1.3: Reutilizar `transformSession` existente para mapear snake_case → camelCase

- [x] Task 2: Criar hook `useLiveOperations` (AC: 2, 3, 4, 5, 8)
  - [x] Subtask 2.1: Criar `features/prospecting/hooks/useLiveOperations.ts`
  - [x] Subtask 2.2: Definir interface `LiveSession`:
    ```typescript
    interface LiveSession {
      sessionId: string
      ownerId: string
      ownerName: string
      startedAt: string
      partialStats: { totalCalls: number; connected: number } // computado de activities durante sessao
      lastActivity: { date: string; outcome: string } | null
      isInactive: boolean // true se lastActivity > 15 min atras com sessao ativa
    }
    ```
  - [x] Subtask 2.3: Usar `useQuery` com `queryKey: queryKeys.liveOperations.all` para fetch de `getOrgActiveSessions(organizationId)`
  - [x] Subtask 2.4: Para cada sessao ativa, buscar a ultima activity do `owner_id` no dia atual: `supabase.from('activities').select('date, metadata').eq('owner_id', ownerId).eq('type', 'CALL').gte('date', todayStart).order('date', { ascending: false }).limit(1)`
  - [x] Subtask 2.5: Calcular `isInactive`: `sessao.ended_at === null && (agora - lastActivity.date > 15 min || lastActivity === null && agora - sessao.started_at > 15 min)`
  - [x] Subtask 2.6: Usar `useRealtimeSync(['prospecting_sessions', 'activities'])` para invalidar cache automaticamente quando sessoes iniciam/encerram ou ligacoes sao registradas
  - [x] Subtask 2.7: Aceitar `organizationId: string`, `profiles: OrgProfile[]` como parametros. `profiles` usado para resolver `ownerName` a partir de `ownerId`
  - [x] Subtask 2.8: Retornar `{ sessions: LiveSession[], activeCount: number, isLoading: boolean }`

- [x] Task 3: Criar componente `LiveOperationsPanel` (AC: 1, 2, 3, 4, 6, 7, 8)
  - [x] Subtask 3.1: Criar `features/prospecting/components/LiveOperationsPanel.tsx`
  - [x] Subtask 3.2: Props: `sessions: LiveSession[]`, `activeCount: number`, `isLoading: boolean`
  - [x] Subtask 3.3: Header: titulo "Operacao Ao Vivo" com icone `Radio` (lucide) + badge com `activeCount` (ex: "3 ativas")
  - [x] Subtask 3.4: Lista de sessoes: cada item mostra avatar placeholder + nome do corretor (bold), `SessionTimer` com duracao real-time, badge de ultimo outcome (importar `getOutcomeBadge` de `features/prospecting/constants.ts`), stats parciais "X ligacoes, Y atendidas" (de `session.partialStats`), e tempo desde ultima ligacao
  - [x] Subtask 3.5: Badge "Inativo" (vermelho, pulsante com `animate-pulse`) ao lado do nome quando `session.isInactive === true`
  - [x] Subtask 3.6: Empty state: icone `RadioTower` + "Nenhum corretor em sessao no momento" em texto muted
  - [x] Subtask 3.7: Skeleton loading (3 rows de placeholder animado)

- [x] Task 4: Criar componente `SessionTimer` (AC: 3)
  - [x] Subtask 4.1: Criar componente inline ou separado `SessionTimer` que recebe `startedAt: string` e renderiza duracao formatada HH:MM:SS
  - [x] Subtask 4.2: Usar `useEffect` com `setInterval(1000)` para atualizar a cada segundo — state local isolado para evitar re-render do pai
  - [x] Subtask 4.3: Formatar com `Math.floor` para horas, minutos, segundos (sem libs extras)

- [x] Task 5: Integrar `LiveOperationsPanel` no ProspectingPage (AC: 1, 7)
  - [x] Subtask 5.1: Em `ProspectingPage.tsx`, importar `LiveOperationsPanel` e `useLiveOperations`
  - [x] Subtask 5.2: Instanciar `useLiveOperations(organizationId, profiles)` — `organizationId` vem de `profile?.organization_id`
  - [x] Subtask 5.3: Renderizar `LiveOperationsPanel` ACIMA dos MetricsCards (primeiro item da aba Metricas), envolvido em `{isAdminOrDirector && (...)}` e `<ProspectingErrorBoundary section="Operacao Ao Vivo">`
  - [x] Subtask 5.4: Garantir que o hook so e ativado quando `isAdminOrDirector` (usar `enabled: isAdminOrDirector` no useQuery do hook, ou renderizacao condicional do componente que instancia o hook)

- [x] Task 6: Testes (AC: 1-8)
  - [x] Subtask 6.1: Teste `getOrgActiveSessions` — retorna sessoes ativas da org, retorna vazio quando nenhuma ativa
  - [x] Subtask 6.2: Teste `useLiveOperations` — calcula `isInactive` corretamente (>15min = true, <15min = false, sem activity = true se sessao > 15min)
  - [x] Subtask 6.3: Teste `LiveOperationsPanel` — renderiza lista de sessoes com nomes, stats, badges
  - [x] Subtask 6.4: Teste `LiveOperationsPanel` — exibe badge "Inativo" para sessoes inativas
  - [x] Subtask 6.5: Teste `LiveOperationsPanel` — exibe empty state quando `sessions.length === 0`
  - [x] Subtask 6.6: Teste `LiveOperationsPanel` — NAO renderiza quando `isAdminOrDirector === false` (teste de integracao no ProspectingPage)
  - [x] Subtask 6.7: Teste `SessionTimer` — renderiza formato HH:MM:SS corretamente

## Dev Notes

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| realtimeConfig | `lib/realtime/realtimeConfig.ts` | Adicionar `'prospecting_sessions'` ao `RealtimeTable` type + query key mapping |
| queryKeys | `lib/query/queryKeys.ts` | Adicionar `liveOperations: createQueryKeys('liveOperations')` |
| prospecting-sessions | `lib/supabase/prospecting-sessions.ts` | Adicionar `getOrgActiveSessions(organizationId)` |
| useLiveOperations | `features/prospecting/hooks/useLiveOperations.ts` | **Novo** — hook com Realtime + inactivity detection |
| LiveOperationsPanel | `features/prospecting/components/LiveOperationsPanel.tsx` | **Novo** — painel real-time com lista, contador, alertas |
| ProspectingPage | `features/prospecting/ProspectingPage.tsx` | Importar + renderizar LiveOperationsPanel (admin only) |

### Tabela `prospecting_sessions` (migration `20260310110000`)

```sql
CREATE TABLE prospecting_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,           -- NULL = sessao ativa
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indices: `idx_prospecting_sessions_owner(owner_id, started_at DESC)`, `idx_prospecting_sessions_org(organization_id, started_at DESC)`.

RLS: owner ve proprias sessoes; admin/director ve todas da org. JA publicada no Realtime (`ALTER PUBLICATION supabase_realtime ADD TABLE prospecting_sessions`).

### Interface `ProspectingSessionStats` existente

```typescript
interface ProspectingSessionStats {
  total: number
  completed: number
  skipped: number
  connected: number
  noAnswer: number
  voicemail: number
  busy: number
  duration_seconds: number
}
```

Stats sao preenchidos ao encerrar a sessao (`endProspectingSession`). Durante sessao ativa, `stats` e `{}` — stats parciais devem vir de activities do dia (query no hook).

### `getActiveSessions` atual vs `getOrgActiveSessions` nova

```typescript
// EXISTENTE — filtra por owner_id (usado pelo corretor para detectar sessao propria)
export async function getActiveSessions(ownerId: string): Promise<ProspectingSession[]> {
  // ... .eq('owner_id', ownerId).is('ended_at', null)
}

// NOVA — filtra por organization_id (para admin/director ver todas)
export async function getOrgActiveSessions(organizationId: string): Promise<ProspectingSession[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('prospecting_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .is('ended_at', null)
    .order('started_at', { ascending: true })
  if (error) throw error
  return (data || []).map(transformSession)
}
```

RLS policy "Admins can view org sessions" ja garante que so admin/director recebe dados.

### Realtime — `RealtimeTable` precisa de extensao

Tipo atual em `lib/realtime/realtimeConfig.ts`:
```typescript
export type RealtimeTable =
  | 'deals' | 'contacts' | 'activities' | 'boards' | 'board_stages'
  | 'prospecting_queues' | 'prospecting_saved_queues' | 'prospecting_daily_goals'
  | 'organization_settings';
```

Adicionar `| 'prospecting_sessions'` e mapear em `getTableQueryKeys`.

### Calculo de inatividade

```typescript
const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutos

function checkInactivity(session: ProspectingSession, lastActivity: { date: string } | null): boolean {
  const now = Date.now()
  if (lastActivity) {
    return now - new Date(lastActivity.date).getTime() > INACTIVITY_THRESHOLD_MS
  }
  // Sem activity registrada — verificar se sessao iniciou ha mais de 15 min
  return now - new Date(session.startedAt).getTime() > INACTIVITY_THRESHOLD_MS
}
```

### Stats parciais durante sessao ativa

`stats` no DB e `{}` durante sessao ativa (so preenchido ao encerrar). Para mostrar stats parciais (ligacoes feitas, atendidas), o hook deve contar activities do `owner_id` com `type='CALL'` e `date >= session.startedAt`:

```typescript
const sessionActivities = activities.filter(
  a => a.owner_id === session.ownerId && new Date(a.date) >= new Date(session.startedAt)
)
const partialStats = {
  totalCalls: sessionActivities.length,
  connected: sessionActivities.filter(a => a.metadata?.outcome === 'connected').length,
}
```

### Ponto de integracao — ProspectingPage (aba Metricas)

Renderizar o `LiveOperationsPanel` como primeiro item da aba metricas, antes dos MetricsCards:

```tsx
{activeTab === 'metrics' && (
  <div className="space-y-4 mt-4">
    {/* CP-5.6: Live operations (admin/director only) */}
    {isAdminOrDirector && (
      <ProspectingErrorBoundary section="Operacao Ao Vivo">
        <LiveOperationsPanel
          sessions={liveOps.sessions}
          activeCount={liveOps.activeCount}
          isLoading={liveOps.isLoading}
        />
      </ProspectingErrorBoundary>
    )}

    {/* MetricsCards existentes... */}
```

### Acesso a `organizationId`

`profile?.organization_id` disponivel via `useAuth()` no ProspectingPage (linha 52). Tipo `Profile` (AuthContext.tsx:50) confirma `organization_id: OrganizationId`. Verificado pela validacao @po.

### Testing

- **Local dos testes:** `features/prospecting/__tests__/` e `lib/supabase/__tests__/`
- **Framework:** Jest + React Testing Library
- **Padrao:** Seguir `dealLinking.test.tsx` como referencia
- **Mock necessario:** `ProspectingSession[]` com variacao de `started_at` e activities com timestamps variados para testar inatividade
- **Timer:** Mockar `setInterval` com `jest.useFakeTimers()` para `SessionTimer`
- **Cobertura esperada:** ~12-15 testes

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (hook + componentes + realtime subscription)
- **Secondary Type(s):** Nenhum (sem backend/DB changes, apenas nova query client-side)
- **Complexity:** Medium — 1 hook novo, 2 componentes novos, 2 configs modificadas, Realtime subscription

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
- Performance: `setInterval(1000)` no `SessionTimer` deve ser isolado para nao causar re-render do painel inteiro
- Realtime: subscription unica para `prospecting_sessions` + `activities` — nao criar channels duplicados
- Memory leak: cleanup de `setInterval` e Realtime channels no unmount

Secondary Focus:
- Acessibilidade: badges com aria-labels, lista com role="list", items com role="listitem"
- Responsividade: painel deve stackar verticalmente em mobile

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-12 | 1.0 | Story criada | @sm (River) |
| 2026-03-12 | 1.1 | Validacao GO (10/10) — SF-1: `LiveSession` interface corrigida (partialStats em vez de stats vazio). SF-2: OUTCOME_LABELS confirmado em constants.ts, condicional removida. organization_id verificado. Status Draft → Ready. | @po (Pax) |
| 2026-03-12 | 2.0 | Implementacao completa: Tasks 0-6 [x]. 3 novos arquivos, 3 modificados, 12 testes. Lint/typecheck OK. Status Ready → Ready for Review. | @dev (Dex) |
| 2026-03-12 | 2.1 | QA fix: adicionados testes faltantes — getOrgActiveSessions (3 testes), inactivity logic (5 testes), role-based visibility (2 testes). Total: 22 testes. | @dev (Dex) |
| 2026-03-12 | 2.2 | QA fix HIGH: activities Realtime agora invalida liveOperations cache — `queryKeys.liveOperations.all` adicionado ao mapping de activities em realtimeConfig.ts. AC5 100% atendido. | @dev (Dex) |
| 2026-03-13 | 3.0 | Auditoria de status: QA PASS confirmado (8/8 ACs, 22 testes), ACs e CoD marcados [x]. Status Ready for Review → Done. | @po (Pax) |

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Lint: limpo (0 erros nos arquivos da CP-5.6)
- Typecheck: limpo (erros pre-existentes em `useImportToQueue.ts` — nao relacionados)
- Testes: 22/22 passaram (`liveOperations.test.tsx`) — inclui service, inactivity logic, role visibility
- Regressao: 36/37 suites passaram (1 falha pre-existente em `directorAssignment.test.tsx` por `read-excel-file`)

### Completion Notes List
- `SessionTimer` implementado inline no `LiveOperationsPanel` para simplicidade (state local isolado)
- `useLiveOperations` aceita `enabled` param, passado como `isAdminOrDirector` no ProspectingPage
- Activities query busca todas CALL activities de todos os owners ativos no dia, com filtro por `session.startedAt` no `useMemo`
- Fallback polling a cada 30s além do Realtime para resiliência

### File List
| Arquivo | Status | Path |
|---------|--------|------|
| realtimeConfig.ts | Modificado | `lib/realtime/realtimeConfig.ts` |
| queryKeys.ts | Modificado | `lib/query/queryKeys.ts` |
| prospecting-sessions.ts | Modificado | `lib/supabase/prospecting-sessions.ts` |
| useLiveOperations.ts | **Novo** | `features/prospecting/hooks/useLiveOperations.ts` |
| LiveOperationsPanel.tsx | **Novo** | `features/prospecting/components/LiveOperationsPanel.tsx` |
| ProspectingPage.tsx | Modificado | `features/prospecting/ProspectingPage.tsx` |
| liveOperations.test.tsx | **Novo** | `features/prospecting/__tests__/liveOperations.test.tsx` |

## QA Results

### Gate Decision: PASS

**Reviewer:** @qa (Quinn) | **Date:** 2026-03-12 | **Model:** Claude Opus 4.6

**Verdict:** Todos os 8 ACs atendidos. Código segue padrões do projeto, performance adequada, sem vulnerabilidades de segurança, acessibilidade implementada.

**AC Compliance:** 8/8 PASS

**Test Results:**
- 22/22 testes passando (`liveOperations.test.tsx`)
- 0 regressões (469 testes existentes passando, 1 falha pré-existente não-relacionada)
- Lint: limpo
- Typecheck: limpo (erros pré-existentes em `useImportToQueue.ts`)

**Re-Review (v2.1):** C1 resolvido — testes adicionados para getOrgActiveSessions (3), inactivity logic (5), role visibility (2). C2 aceito como known behavior.

**Re-Review (v2.2):** Issue HIGH resolvida — `queryKeys.liveOperations.all` adicionado ao mapping de `activities` em `realtimeConfig.ts`. Activity Realtime events agora invalidam cache do liveOperations. AC5 100% atendido. 58/58 testes passando (incluindo realtime + cache-integrity suites).

**Aprovado para merge.**

---

*Story gerada por @sm (River) — Epic CP-5*
