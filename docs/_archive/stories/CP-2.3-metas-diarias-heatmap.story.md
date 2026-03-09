# Story CP-2.3: Metas Diárias + Heatmap de Melhor Horário

## Metadata
- **Story ID:** CP-2.3
- **Epic:** CP-2 (Prospecção Inteligente)
- **Status:** Done
- **Owner:** (unassigned)
- **Executor:** @dev
- **Quality Gate:** @architect
- **Quality Gate Tools:** [code_review, performance_check, rls_validation]
- **Estimated Hours:** 10-14
- **Priority:** P1

## Descrição

Corretor configura sua meta diária de ligações e taxa de conexão desejada. O dashboard de métricas exibe uma barra de progresso circular em tempo real que atualiza após cada chamada. Um heatmap mostra a taxa de conexão por dia da semana × hora do dia, baseado no histórico real de chamadas, para que o corretor saiba qual o melhor horário para ligar. Diretor pode definir metas para os corretores da sua equipe.

## Story

As a corretor, I want configurar metas diárias com progresso visual e ver um heatmap de melhor horário para ligar, so that eu saiba se estou performando bem e ligue no horário certo.

## Acceptance Criteria

- [x] AC1: Card "Meta do Dia" no dashboard de métricas com barra de progresso circular mostrando ligações feitas / meta
- [x] AC2: Meta padrão configurável pelo corretor (default: 30 ligações/dia)
- [x] AC3: Progresso atualiza em tempo real após cada chamada registrada na sessão
- [x] AC4: Indicador visual de % da meta atingida: vermelho (<50%), amarelo (50-99%), verde (100%+)
- [x] AC5: Animação de celebração ao atingir 100% da meta (confetti sutil ou badge "Meta atingida!")
- [x] AC6: Heatmap 7×6 (dias da semana × faixas de 2h: 8-10, 10-12, ..., 18-20) com cores por connection rate
- [x] AC7: Heatmap baseado nos últimos 30 dias de dados (configurável: 30/60/90 dias)
- [x] AC8: Heatmap exige mínimo de 50 chamadas no período para ser exibido — caso contrário, mensagem "Dados insuficientes, continue prospectando!"
- [x] AC9: Tooltip no heatmap mostrando: "Segunda 10h-12h: 45% conexão (18/40 chamadas)"
- [x] AC10: Diretor pode definir/editar metas dos corretores da equipe via modal de configuração
- [x] AC11: Tabela `prospecting_daily_goals` com RLS por organization_id
- [x] AC12: Dark mode + responsivo (heatmap scrollável horizontal no mobile)
- [x] AC13: Sem regressão nas funcionalidades do CP-1

## Escopo

### IN
- Migration: criar tabela `prospecting_daily_goals` (id, owner_id, organization_id, calls_target, connection_rate_target, created_at, updated_at)
- RLS policies para `prospecting_daily_goals`
- Componente `DailyGoalCard` — card com progresso circular
- Componente `ConnectionHeatmap` — grid dia×hora com cores
- Hook `useProspectingGoals` — CRUD de metas + cálculo de progresso
- Integração no dashboard de métricas (nova seção acima dos KPI cards)
- Modal de configuração de meta (corretor para si, diretor para equipe)
- Testes unitários

### OUT
- Meta semanal/mensal (apenas diária nesta story)
- Histórico de metas atingidas ao longo do tempo
- Notificação push ao atingir meta
- Gamificação avançada (streaks, badges permanentes)

## CodeRabbit Integration

- **Story Type Analysis:**
  - Primary Type: Frontend (componentes React — DailyGoalCard, ConnectionHeatmap)
  - Secondary: Database (migration tabela prospecting_daily_goals)
  - Complexity: Medium

- **Specialized Agents:**
  - Primary Agent: @dev (sempre obrigatório)
  - Supporting: @db-sage (migration e RLS para prospecting_daily_goals)

- **Self-Healing Config:**
  - Agent: @dev
  - Mode: light
  - Max Iterations: 2
  - Timeout: 15 min
  - Severity Filter: CRITICAL only

- **Quality Gates:**
  - Pre-Commit (@dev): required
  - Pre-PR (@devops): required

- **Focus Areas:**
  - Frontend: accessibility, performance, responsive design (heatmap scrollável no mobile), dark mode compliance
  - Database: RLS coverage, schema compliance

## Dependências
- **Blocked by:** Nenhuma (CP-1.4 completo)
- **Blocks:** Nenhuma

## Tasks / Subtasks

### Migration DB (AC: 11)
- [x] 1. Criar migration para tabela `prospecting_daily_goals`
  - Schema: `id UUID PK, owner_id UUID FK, organization_id UUID FK, calls_target INT DEFAULT 30, connection_rate_target DECIMAL DEFAULT 0.25, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ`
- [x] 2. Criar RLS policies (SELECT/INSERT/UPDATE: owner_id = auth.uid() OR is_admin_or_director)
- [x] 3. Criar index em `(owner_id, organization_id)`

### Meta do Dia (AC: 1, 2, 3, 4, 5)
- [x] 4. Criar `features/prospecting/components/DailyGoalCard.tsx` — card com progresso circular (SVG circle)
- [x] 5. Criar `features/prospecting/hooks/useProspectingGoals.ts` — CRUD de metas + cálculo de progresso
- [x] 6. Progresso = total de ligações hoje / calls_target (usar dados do useProspectingMetrics com range 'today')
- [x] 7. Cores: vermelho (<50%), amarelo (50-99%), verde (100%+)
- [x] 8. Celebração ao atingir 100%: badge animado "Meta atingida!" (css animation, sem lib externa)
- [x] 9. Modal de configuração de meta (input numérico + save)

### Heatmap (AC: 6, 7, 8, 9)
- [x] 10. Criar `features/prospecting/components/ConnectionHeatmap.tsx` — grid 7×6
- [x] 11. Calcular connection rate por (dia_semana, faixa_horaria) a partir de activities
- [x] 12. Escala de cores: branco (0-10%), amarelo claro (10-20%), amarelo (20-30%), laranja (30-40%), verde (40%+)
- [x] 13. Tooltip com detalhes: dia, hora, % conexão, total de chamadas
- [x] 14. Guard de mínimo 50 chamadas — estado "dados insuficientes"
- [x] 15. Seletor de período (30/60/90 dias)
- [x] 16. Integrar no dashboard abaixo do gráfico de tempo

### Diretor: Metas da Equipe (AC: 10)
- [x] 17. Modal "Metas da Equipe" para diretor/admin — lista de corretores com metas editáveis
- [x] 18. Mutation para atualizar meta de outro corretor (check RBAC)

### Testes (AC: 12, 13)
- [x] 19. Testes do DailyGoalCard (render, progresso, cores, celebração) — 7 testes
- [x] 20. Testes do ConnectionHeatmap (render, tooltip, dados insuficientes) — 7 testes
- [x] 21. Testes do useProspectingGoals (CRUD, cálculo) — 9 testes
- [x] 22. Testes de regressão — 246/246 passando (1 suite pré-existente falhando: directorAssignment)
- [x] 23. Lint + typecheck passing

## Dev Notes

### Source Tree Relevante

```
features/prospecting/
├── ProspectingPage.tsx                    # Main page (599 lines)
├── components/
│   ├── MetricsCards.tsx                  # Adicionar DailyGoalCard aqui
│   ├── MetricsChart.tsx                  # Adicionar ConnectionHeatmap abaixo do gráfico
│   ├── DailyGoalCard.tsx                 # NOVO — card com progresso circular
│   └── ConnectionHeatmap.tsx             # NOVO — grid 7×6
├── hooks/
│   ├── useProspectingMetrics.ts          # Adicionar dados heatmap
│   └── useProspectingGoals.ts            # NOVO — CRUD de metas
└── utils/
    └── formatDuration.ts

lib/supabase/
└── prospecting-queues.ts

lib/query/hooks/
└── useProspectingQueueQuery.ts
```

### Padrões CP-1 a seguir
- TanStack Query para todas as queries (invalidateQueries após cada chamada para atualizar progresso)
- Supabase service layer em `lib/supabase/` (sem chamadas diretas no componente)
- Hooks em 2 camadas: feature hook (`useProspectingGoals`) + query hook
- Import pattern: absolutos com `@/`
- UI: Tailwind, Lucide icons, dark mode via classes `dark:`
- Celebração: CSS animation nativa (sem libs externas como confetti-js)
- Progresso circular: SVG circle nativo (sem Recharts para este componente)

### Testing

- Framework: Vitest + @testing-library/react
- Localização: `features/prospecting/__tests__/`
- Padrões: seguir os 29 arquivos e 150+ testes do CP-1 (mesma estrutura)
- Mocks: Supabase client mockado via `__mocks__`, TanStack Query com `QueryClientProvider` wrapper
- Cobertura: DailyGoalCard (render, progresso, cores, celebração) + ConnectionHeatmap (render, tooltip, dados insuficientes) + useProspectingGoals (CRUD, cálculo)

## Riscos
| Risco | Mitigação |
|-------|-----------|
| Heatmap com poucos dados é enganoso | Mínimo de 50 chamadas, mensagem clara |
| Cálculo de progresso em real-time | Usar invalidateQueries após cada chamada |
| Performance do cálculo de heatmap | Client-side é OK para <5K atividades |

## Definition of Done
- [x] Todos os AC verificados
- [x] Testes passando (246/246, 1 suite pré-existente falhando: directorAssignment)
- [x] Lint + typecheck clean (zero erros novos)
- [x] Dark mode OK (classes dark: em todos os componentes novos)
- [x] Responsivo OK (heatmap overflow-x-auto no mobile)
- [x] RLS validado (SELECT/INSERT/UPDATE owner OR admin/director, DELETE admin/director only)
- [x] Sem regressão CP-1 (17/18 suites passando, 1 pré-existente)

## File List
| Arquivo | Acao |
|---------|------|
| `supabase/migrations/20260306100000_create_prospecting_daily_goals.sql` | Criado |
| `types/types.ts` | Modificado (ProspectingDailyGoal interface) |
| `lib/supabase/prospecting-goals.ts` | Criado |
| `lib/supabase/index.ts` | Modificado (export prospectingGoalsService) |
| `lib/query/queryKeys.ts` | Modificado (dailyGoals query key) |
| `lib/query/hooks/useDailyGoalsQuery.ts` | Criado |
| `features/prospecting/hooks/useProspectingGoals.ts` | Criado |
| `features/prospecting/components/DailyGoalCard.tsx` | Criado |
| `features/prospecting/components/ConnectionHeatmap.tsx` | Criado |
| `features/prospecting/components/GoalConfigModal.tsx` | Criado |
| `features/prospecting/ProspectingPage.tsx` | Modificado (integrar DailyGoalCard + ConnectionHeatmap + GoalConfigModal) |
| `features/prospecting/__tests__/dailyGoalCard.test.tsx` | Criado (7 testes) |
| `features/prospecting/__tests__/connectionHeatmap.test.tsx` | Criado (7 testes) |
| `features/prospecting/__tests__/useProspectingGoals.test.ts` | Criado (9 testes) |
| `features/prospecting/__tests__/goalConfigModal.test.tsx` | Criado (9 testes) |

## QA Results

### QA Gate — 2026-03-06 (@qa)

**Verdict: PASS with CONCERNS**

| Check | Result |
|-------|--------|
| Code review | ✅ Patterns consistent, clean separation |
| Unit tests | ✅ 23 new tests, 634/634 total passing |
| Acceptance criteria | ✅ AC1-AC13 all met |
| No regressions | ✅ Zero regressions |
| Performance | ✅ useMemo, staleTime 5min |
| Security | ✅ RLS 4 policies, org validation |
| Documentation | ✅ File List + Change Log complete |

**Concerns (non-blocking):**
1. (LOW) AC6 wording says "7x12" — implementation is 7x6 (correct per 2h slot description)
2. (LOW) GoalConfigModal uses custom overlay instead of Radix Dialog (no focus-trap)
3. (MEDIUM) GoalConfigModal has no dedicated test suite — team-member bug (ba8f827) would have been caught
4. (LOW) Dev Notes say "Jest" but project uses Vitest

**Recommendation:** Approved for push. Concern #3 can be addressed as follow-up in CP-2.4 or backlog.

### Re-Review — 2026-03-06 (@qa)

**Verdict: PASS**

| Concern Original | Fix Aplicado | Verificacao | Status |
|-----------------|--------------|-------------|--------|
| AC6 "7x12" doc | Dev Notes corrigido para "7x6" | Grep confirmado | RESOLVED |
| GoalConfigModal sem focus-trap | Migrado para `<Modal>` (FocusTrap, aria, Escape) | Code review OK | RESOLVED |
| GoalConfigModal sem testes | 9 testes criados (inclui caso bug ba8f827) | 9/9 passing | RESOLVED |
| Dev Notes "Jest" | Corrigido para "Vitest" | Grep confirmado | RESOLVED |

**All concerns resolved. 665/665 tests passing. Approved for push.**

## Change Log
| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-04 | @pm | Story criada |
| 2026-03-04 | @sm | Correções pós-validação PO (NO-GO → resubmissão) |
| 2026-03-04 | @po | Validacao GO (10/10) — Status Draft → Ready |
| 2026-03-06 | @dev | Implementacao completa — 23/23 tasks, 23 testes novos, 246/246 passando, migration criada |
| 2026-03-06 | @qa | QA Gate: PASS with CONCERNS — AC 13/13, 634/634 tests, 3 LOW + 1 MEDIUM concerns (non-blocking) |
| 2026-03-06 | @dev | QA concerns fixed: Modal migrado para componente reutilizavel com FocusTrap, testes GoalConfigModal (9), doc fixes (Vitest, 7x6) |
| 2026-03-06 | @qa | Re-Review: PASS — All 4 concerns resolved, 665/665 tests passing |
| 2026-03-06 | @po | Story closed: ACs 13/13 marcados, DoD 7/7, QA Gate PASS, Status → Done |
