# Story CP-3.4: Persistencia de Sessao + Agendamento Inteligente

## Metadata
- **Story ID:** CP-3.4
- **Epic:** CP-3 (Prospeccao com IA + Melhorias da Central)
- **Status:** InProgress
- **Priority:** P2
- **Estimated Points:** 8 (M)
- **Wave:** 2
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** corretor usando a Central de Prospeccao do ZmobCRM,
**I want** que minhas sessoes de ligacoes sejam salvas automaticamente e que o sistema sugira o melhor horario para retorno baseado no heatmap,
**so that** tenha historico de performance por sessao e agende follow-ups no horario com maior taxa de conexao.

## Descricao

Dois problemas complementares:

1. **Sessoes efemeras**: Hoje o `SessionSummary` mostra stats (total, connected, no_answer, etc.) ao encerrar, mas tudo se perde ao recarregar a pagina. Nao ha historico de sessoes.
2. **Agendamento manual**: Ao clicar "Agendar retorno" no `QuickActionsPanel`, o corretor escolhe data/hora manualmente sem orientacao. O heatmap de conexoes ja existe com dados de melhor horario mas nao e usado no agendamento.

## Acceptance Criteria

### Persistencia de sessao
- [ ] AC1: Given o corretor inicia uma sessao de prospeccao, when `startSession()` e chamado, then um registro e criado na tabela `prospecting_sessions` com `started_at` e `owner_id`
- [ ] AC2: Given o corretor encerra a sessao, when `endSession()` e chamado, then o registro e atualizado com `ended_at` e `stats` JSONB (total, connected, no_answer, voicemail, busy, skipped, duration_seconds)
- [ ] AC3: Given o corretor recarrega a pagina durante sessao ativa, when a pagina carrega, then detecta sessao ativa (sem ended_at) e oferece retomar
- [ ] AC4: Given a aba Metricas, when renderizada, then exibe componente `SessionHistory` com lista das ultimas 20 sessoes
- [ ] AC5: Given uma sessao no historico, when clicada, then expande mostrando detalhes (data, duracao, total calls, connection rate, breakdown por outcome)

### Agendamento inteligente
- [ ] AC6: Given o QuickActionsPanel com acao "Agendar retorno", when clicado, then o datetime picker abre com horario sugerido baseado no heatmap
- [ ] AC7: Given dados do heatmap para quarta-feira 14-16h com 45% de conexao, when o corretor agenda retorno para quarta, then sugere 14:00 como default
- [ ] AC8: Given a sugestao de horario, when exibida, then mostra label "Sugerido: {dia} as {hora} (taxa de conexao: {X}%)"
- [ ] AC9: Given a sugestao, when o corretor prefere outro horario, then pode alterar livremente no datetime picker

## Scope

### IN
- Migration: tabela `prospecting_sessions` com RLS e realtime
- Service `prospecting-sessions.ts` com CRUD
- Atualizar `useProspectingQueue`: `startSession()` cria registro, `endSession()` atualiza
- Componente `SessionHistory` na aba Metricas
- Agendamento inteligente no `QuickActionsPanel` usando dados do heatmap
- Testes unitarios

### OUT
- Dashboard de analytics de sessoes (graficos, tendencias)
- Notificacao de sessao abandonada
- Comparativo entre sessoes
- IA analisando sessoes (sera possivel com analyzeProspectingPatterns de CP-3.3)

## Tasks

### Task 1 — Migration (AC1, AC2)
- [x] Task 1.1: Criar migration `{timestamp}_create_prospecting_sessions.sql`
  ```sql
  CREATE TABLE prospecting_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Indexes
  CREATE INDEX idx_prospecting_sessions_owner ON prospecting_sessions(owner_id, started_at DESC);
  CREATE INDEX idx_prospecting_sessions_org ON prospecting_sessions(organization_id, started_at DESC);

  -- RLS
  ALTER TABLE prospecting_sessions ENABLE ROW LEVEL SECURITY;

  -- Owner ve proprias sessoes
  CREATE POLICY "Users can view own sessions"
    ON prospecting_sessions FOR SELECT
    USING (owner_id = auth.uid());

  -- Admin/diretor ve todas da org
  CREATE POLICY "Admins can view org sessions"
    ON prospecting_sessions FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'director')
      )
    );

  -- Owner pode inserir/atualizar proprias
  CREATE POLICY "Users can insert own sessions"
    ON prospecting_sessions FOR INSERT
    WITH CHECK (owner_id = auth.uid());

  CREATE POLICY "Users can update own sessions"
    ON prospecting_sessions FOR UPDATE
    USING (owner_id = auth.uid());

  -- Realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE prospecting_sessions;
  ```
- [ ] Task 1.2: Testar migration em staging (`supabase db push`) — pendente deploy

### Task 2 — Service (AC1, AC2)
- [x] Task 2.1: Criar `lib/supabase/prospecting-sessions.ts`
  - `startSession(ownerId, orgId)` → INSERT, retorna sessionId
  - `endSession(sessionId, stats)` → UPDATE ended_at + stats
  - `getActiveSessions(ownerId)` → SELECT WHERE ended_at IS NULL
  - `listSessions(ownerId, orgId, limit=20)` → SELECT ORDER BY started_at DESC
  - `getSessionById(sessionId)` → SELECT single

### Task 3 — Hook update (AC1, AC2, AC3)
- [x] Task 3.1: Atualizar `useProspectingPageState.ts`
  - `handleStartSession()`: chama `startProspectingSession()`, guarda dbSessionId
  - `handleEndSession()`: calcula stats + duration_seconds, chama `endProspectingSession()`
- [x] Task 3.2: Ao carregar pagina, verificar sessoes ativas (ended_at IS NULL)
  - Banner com opcoes [Retomar / Encerrar / Ignorar]

### Task 4 — SessionHistory componente (AC4, AC5)
- [x] Task 4.1: Criar `features/prospecting/components/SessionHistory.tsx`
  - Lista das ultimas 20 sessoes com: data, duracao formatada, total calls, connection rate
  - Cada item expandivel (accordion) com breakdown: connected, no_answer, voicemail, busy, skipped
  - Empty state: "Nenhuma sessao registrada ainda"
- [x] Task 4.2: Integrar na aba Metricas da `ProspectingPage.tsx`
  - Posicionado abaixo do heatmap, acima do CorretorRanking

### Task 5 — Agendamento inteligente (AC6, AC7, AC8, AC9)
- [x] Task 5.1: Criar funcao `suggestBestTime(activities)` em `features/prospecting/utils/`
  - Input: CallActivity[] (reutiliza dados do metricsHook)
  - Output: `{ suggestedDate, suggestedDay, suggestedHour, connectionRate }`
  - Logica: encontrar celula com maior connectionRate (excluindo finais de semana)
- [x] Task 5.2: Modificar `QuickActionsPanel.tsx` na acao "Agendar retorno"
  - Datetime picker pre-preenchido com horario sugerido
  - Label: "Sugerido: {dia} as {hora} (taxa de conexao: {X}%)"
  - Se dados insuficientes: nao sugere, mantém default (proximo dia util 10h)
- [x] Task 5.3: Obter dados do heatmap no contexto do QuickActionsPanel
  - Computado em ProspectingPage via useMemo(suggestBestTime, metricsHook.activities)
  - Threaded: ProspectingPage → PowerDialer → QuickActionsPanel

### Task 6 — Quality Gate
- [x] Task 6.1: `npm run typecheck` passa
- [x] Task 6.2: `npm run lint` passa
- [x] Task 6.3: `npm test` passa (757 tests, 72 suites, vitest)

## Dev Notes

### Contexto Arquitetural

**SessionSummary.tsx (~100 linhas):**
- Exibe stats apos encerrar sessao: total, connected, no_answer, voicemail, busy, skipped, elapsed time, connection rate
- Stats vem de state local (`SessionStats` type em useProspectingPageState.ts)
- Nao persiste nada — tudo perdido ao recarregar

**SessionStats type:**
```typescript
{
  total: number;
  completed: number;
  skipped: number;
  connected: number;
  noAnswer: number;
  voicemail: number;
  busy: number;
}
```

**ConnectionHeatmap.tsx (~100 linhas):**
- Grid: 7 dias × 6 slots (08-10, 10-12, 12-14, 14-16, 16-18, 18-20)
- Dados: aggregacao client-side de activities WHERE type='CALL'
- MIN_CALLS = 50 (minimo para mostrar celula)
- Cores: >=40% verde, >=30% laranja, >=20% amber, >=10% light amber, <10% cinza

**QuickActionsPanel.tsx (~100 linhas):**
- Acoes por outcome: connected → create_deal/schedule_return/move_stage; outros → schedule_return
- schedule_return: abre datetime picker (sem sugestao de horario)

**Padrao de migration (existente):**
- Nome: `{YYYYMMDDHHMMSS}_description.sql`
- RLS: owner + admin/director pattern
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE`
- UUID PKs com `gen_random_uuid()`

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/{ts}_create_prospecting_sessions.sql` | Created | Tabela + RLS + realtime |
| `lib/services/prospecting-sessions.ts` | Created | CRUD service |
| `features/prospecting/hooks/useProspectingQueue.ts` | Modified | startSession/endSession com DB |
| `features/prospecting/components/SessionHistory.tsx` | Created | Historico de sessoes |
| `features/prospecting/components/QuickActionsPanel.tsx` | Modified | Agendamento inteligente |
| `features/prospecting/utils/suggestBestTime.ts` | Created | Logica de sugestao de horario |
| `features/prospecting/ProspectingPage.tsx` | Modified | Integrar SessionHistory |

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Full-Stack (DB + Frontend)
- Complexity: Medium (1 migration + 2 componentes + hook update)
- Secondary Types: Database

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED
- [ ] Pre-PR review (@devops) — if PR created

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Migration: RLS policies corretas, indexes, realtime
- Service: error handling para sessions ativas sem ended_at
- Heatmap: MIN_CALLS respeitado na sugestao (nao sugerir com dados insuficientes)
- SessionHistory: performance com muitas sessoes (LIMIT 20)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Sessao ativa sem ended_at (crash/reload) | Media | Baixo | Detectar ao carregar, oferecer retomar/encerrar |
| Heatmap sem dados suficientes para sugestao | Media | Baixo | Nao sugerir, manter picker vazio com mensagem |
| Migration em ambiente com sessoes ativas | Baixa | Baixo | Tabela nova (sem ALTER em existentes), deploy em baixo uso |

## Dependencies

- **CP-3.1:** Done (base)
- **Independente de outras stories** (nova tabela, sem conflitos)
- **1 migration necessaria** (prospecting_sessions)

## Criteria of Done

- [ ] Tabela `prospecting_sessions` com RLS e realtime
- [ ] Sessoes persistidas automaticamente (start/end)
- [ ] Historico de sessoes visivel na aba Metricas
- [ ] Agendamento inteligente sugere horario baseado no heatmap
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] `npm test` passa
- [ ] Testes cobrindo service, hook e sugestao de horario

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/20260310110000_create_prospecting_sessions.sql` | Created | Tabela + RLS + indexes + realtime |
| `lib/supabase/prospecting-sessions.ts` | Created | CRUD service (start, end, getActive, list) |
| `features/prospecting/hooks/useProspectingPageState.ts` | Modified | Session persistence (DB), active session detection, resume/dismiss |
| `features/prospecting/ProspectingPage.tsx` | Modified | Pass userId/orgId, resume banner, SessionHistory integration, suggestedReturnTime |
| `features/prospecting/components/SessionHistory.tsx` | Created | Historico de sessoes (accordion, empty state) |
| `features/prospecting/utils/suggestBestTime.ts` | Created | Logica de sugestao de horario baseado no heatmap |
| `features/prospecting/components/QuickActionsPanel.tsx` | Modified | Prop suggestedReturnTime, label de sugestao, datetime pre-fill |
| `features/prospecting/components/PowerDialer.tsx` | Modified | Thread suggestedReturnTime prop |
| `features/prospecting/__tests__/suggestBestTime.test.ts` | Created | 6 testes para suggestBestTime |
| `lib/supabase/__tests__/prospecting-sessions.test.ts` | Created | 7 testes para service CRUD |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic CP-3 |
| 2026-03-10 | @po | Validacao GO (10/10). 0 issues. Migration SQL completo, RLS correto, ACs claros. Status Draft → Ready. |
| 2026-03-10 | @dev | Implementacao completa: migration, service, hooks, SessionHistory, suggestBestTime, QAP integration. 13 testes novos. Pendente: Task 1.2 (deploy staging). Status Ready → InProgress. |

---
*Story gerada por @sm (River) — Epic CP-3*
