# Story CP-4.3: Meta de Sessao Integrada

## Metadata
- **Story ID:** CP-4.3
- **Epic:** CP-4 (Prospeccao — Filas & Sessao UX)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 3 (S)
- **Wave:** 2 (Experiencia Enriquecida)
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, pattern_validation]

## Story

**As a** corretor usando a Central de Prospeccao,
**I want** ver minha meta diaria e o progresso atual no briefing pre-sessao e durante a sessao no PowerDialer,
**so that** saiba continuamente o quanto falta para atingir minha meta sem precisar sair do fluxo de ligacoes.

## Descricao

O hook `useProspectingGoals` (CP-2.3) ja calcula `progress.current` e `progress.target` em tempo real a partir das atividades do dia. A story CP-4.3 conecta esse dado ja existente a dois novos pontos de visibilidade:

1. **Briefing pre-sessao (CP-4.1):** Exibir a meta do dia e o progresso atual na tela de briefing, para que o corretor saiba "ja fiz X de Y ligacoes hoje" antes de confirmar o inicio.
2. **PowerDialer:** Adicionar um mini-indicador de meta (ex: "12/20 ligacoes hoje") ao lado da barra de progresso da sessao, visivel durante toda a sessao.
3. **Notificacao celebrativa:** Quando `progress.isComplete` transicionar de `false` para `true` durante a sessao ativa (meta atingida), exibir um toast celebrativo discreto.
4. **Graceful degradation:** Se `goal` for `null` (meta nao configurada), o indicador simplesmente nao aparece — sem empty state ou erro.

Nao ha mudancas de schema, migration, ou backend. Toda a logica e consumo de dados ja existentes.

## Acceptance Criteria

- [x] AC1: Briefing pre-sessao (CP-4.1) mostra meta do dia e progresso atual (ex: "Meta: 12/20 ligacoes — 60%") quando meta configurada
- [x] AC2: PowerDialer mostra mini-indicador de meta junto a barra de progresso da sessao (ex: "12/20 ligacoes hoje")
- [x] AC3: Ao atingir a meta durante a sessao (`progress.isComplete` = true), exibir notificacao celebrativa discreta (toast ou overlay momentaneo)
- [x] AC4: Se meta nao configurada (`goal === null`), indicador nao aparece nem no briefing nem no PowerDialer (graceful degradation)

## Scope

### IN
- Exibir meta e progresso no componente de briefing (a ser criado por CP-4.1)
- Mini-indicador de meta no `PowerDialer.tsx` ao lado/abaixo da barra de progresso
- Toast celebrativo quando `progress.isComplete` transiciona para `true` durante sessao ativa
- Graceful degradation quando `goal === null`
- Testes unitarios cobrindo os 4 ACs

### OUT
- Criacao do componente de briefing (e responsabilidade de CP-4.1)
- Animacoes complexas ou overlay de conquista (toast discreto e suficiente)
- Configuracao de meta no fluxo de inicio de sessao
- Mudancas no hook `useProspectingGoals` (consumo only)
- Mudancas de schema/banco de dados

## Dependencies

- **CP-4.1 (Briefing Pre-Sessao):** HARD — O componente de briefing deve existir para que CP-4.3 possa exibir a meta nele. CP-4.3 adiciona a secao de meta dentro do briefing criado por CP-4.1.
- **CP-2.3 (DailyGoal):** Done — `useProspectingGoals` ja disponivel e calcula `progress.current`, `progress.target`, `progress.isComplete`, `goal`.

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Progress nao atualiza em tempo real durante sessao | Baixa | Medio | `useProspectingGoals` usa `metricsHook.activities` que ja atualiza via React Query; confirmar que atividades criadas no PowerDialer invalidam o cache |
| Toast celebrativo disparado multiplas vezes | Media | Baixo | Usar `useRef` para rastrear se meta ja foi celebrada na sessao atual; celebrar apenas na primeira transicao `false → true` |
| Briefing ainda nao existe (CP-4.1 nao implementada) | Alta | Alto | CP-4.3 deve ser executada APOS CP-4.1. Bloqueada enquanto CP-4.1 nao estiver Done. |

## Business Value

O corretor precisa saber onde esta em relacao a sua meta sem quebrar o fluxo de ligacoes. Hoje ele precisaria sair da sessao para verificar o DailyGoalCard na aba Metricas. Com CP-4.3, essa informacao aparece passivamente no PowerDialer, reduzindo interrupcoes e aumentando a probabilidade de completar a meta diaria.

## Criteria of Done

- [x] Meta e progresso visiveis no briefing pre-sessao quando configurada
- [x] Mini-indicador de meta visivel no PowerDialer junto a barra de progresso
- [x] Toast celebrativo exibido uma unica vez ao atingir a meta durante a sessao
- [x] Indicador ausente quando meta nao configurada (sem erro, sem empty state)
- [x] `npm run typecheck` passa
- [x] `npm run lint` passa
- [x] `npm test` passa com novos testes cobrindo os 4 ACs

## Tasks

### Task 1 — Mini-indicador de meta no PowerDialer (AC2, AC4)
- [x] Task 1.1: Adicionar prop `goalProgress?: GoalProgress` em `PowerDialerProps` (`features/prospecting/components/PowerDialer.tsx` linha ~17)
  - Tipo: `import type { GoalProgress } from '@/features/prospecting/hooks/useProspectingGoals'`
- [x] Task 1.2: Renderizar mini-indicador abaixo da barra de progresso da sessao
  - Condicao: apenas se `goalProgress && goalProgress.target > 0`
  - Texto: `"{current}/{target} ligacoes hoje"`
  - Cor: seguir `goalProgress.color` (`red` → texto vermelho, `yellow` → amarelo, `green` → verde)
  - Posicionamento: dentro do `div.max-w-lg.mx-auto.space-y-1` existente (linha ~182), apos a barra de progresso
- [x] Task 1.3: Passar `goalProgress` do `ProspectingPage.tsx` para `PowerDialer` (ja tem `goalsHook = useProspectingGoals(...)` na linha 145)

### Task 2 — Toast celebrativo ao atingir meta (AC3, AC4)
- [x] Task 2.1: Em `PowerDialer.tsx`, adicionar `useRef<boolean>(false)` para rastrear se meta ja foi celebrada (`goalCelebratedRef`)
- [x] Task 2.2: Adicionar `useEffect` que monitora `goalProgress?.isComplete`
  - Quando `isComplete` transicionar de `false` para `true` e `goalCelebratedRef.current === false`: disparar toast celebrativo e setar `goalCelebratedRef.current = true`
  - Toast: usar padrao do projeto — `const { addToast } = useOptionalToast()` de `@/context/ToastContext`, chamar `addToast('Meta atingida! Voce completou {target} ligacoes hoje.', 'success')`
  - Mensagem sugerida: "Meta atingida! Voce completou {target} ligacoes hoje."
- [x] Task 2.3: Resetar `goalCelebratedRef` ao montar o componente (nova sessao = nova celebracao possivel)

### Task 3 — Meta no briefing pre-sessao (AC1, AC4)
- [x] Task 3.1: No componente de briefing criado por CP-4.1, adicionar secao de meta do dia
  - Condicao: apenas se `goalProgress && goalProgress.target > 0`
  - Exibir: "Meta do dia: {current}/{target} ligacoes ({percentage}%)"
  - Indicador visual de cor (barra ou badge seguindo `goalProgress.color`)
- [x] Task 3.2: Passar `goalProgress` do `ProspectingPage.tsx` para o componente de briefing (ja disponivel via `goalsHook.progress`)

### Task 4 — Testes (AC1, AC2, AC3, AC4)
- [x] Task 4.1: Teste AC2 + AC4 — PowerDialer com `goalProgress` definido mostra indicador; sem `goalProgress` (ou `target=0`) nao mostra
- [x] Task 4.2: Teste AC3 — Toast e disparado exatamente uma vez quando `isComplete` transiciona para `true`; nao disparado novamente em re-renders
- [x] Task 4.3: Teste AC1 + AC4 — Componente de briefing mostra secao de meta quando `goalProgress` presente; nao mostra quando ausente
- [x] Task 4.4: `npm run typecheck` e `npm run lint` passando

### Task 5 — Quality Gate
- [x] Task 5.1: `npm run typecheck` passa
- [x] Task 5.2: `npm run lint` passa
- [x] Task 5.3: `npm test` passa

## Dev Notes

### Contexto Tecnico

**`useProspectingGoals` (ja existe — nao modificar):**
- Caminho: `features/prospecting/hooks/useProspectingGoals.ts`
- Exporta: `GoalProgress` interface (`target`, `current`, `percentage`, `color`, `isComplete`)
- Ja instanciado em `ProspectingPage.tsx:145` como `goalsHook`
- `goalsHook.progress` e o objeto `GoalProgress` pronto para consumo
- `goalsHook.goal` e `null` quando nao configurada — usar para graceful degradation

**`PowerDialer.tsx` — ponto de integracao principal:**
- Caminho: `features/prospecting/components/PowerDialer.tsx`
- `PowerDialerProps` esta na linha ~17-30
- Barra de progresso da sessao esta em `div.max-w-lg.mx-auto.space-y-1` linha ~182
- `statsChips` sao os chips de resultado (connected, noAnswer, etc.) — o indicador de meta vai ANTES ou APOS eles, separado
- PowerDialer ja recebe `sessionStats?: SessionStats` como prop — seguir o mesmo padrao opcional

**`ProspectingPage.tsx` — ponto de passagem:**
- Ja chama `goalsHook = useProspectingGoals(metricsHook.activities, metricsFilterOwnerId)` (linha 145)
- PowerDialer e renderizado quando `sessionActive && currentContact` — passar `goalProgress={goalsHook.progress}`
- Briefing (CP-4.1) tambem sera renderizado nessa pagina — passar `goalProgress={goalsHook.progress}` da mesma forma

**Padrao de toast no projeto:**
- Importar: `import { useToast } from '@/context/ToastContext'`
- Usar dentro do componente: `const { addToast } = useToast()`
- Chamar: `addToast('Meta atingida! Voce completou {target} ligacoes hoje.', 'success')`
- Tipos disponiveis: `'success' | 'error' | 'info' | 'warning'`
- NAO usar `sonner` — o projeto nao usa essa biblioteca
- Para testes que nao tem ToastProvider, usar `useOptionalToast` de `@/context/ToastContext` (retorna no-op se nao ha provider)

**Padrao de testes:**
- Testes ficam em `features/prospecting/__tests__/`
- Padrão: Vitest + Testing Library (`describe`, `it`, `expect`, `vi.mock`)
- Mock de `useProspectingGoals`: seguir padrao de `directorAssignment.test.tsx:147`
- Arquivo sugerido: `features/prospecting/__tests__/powerDialerGoal.test.tsx`
- Testes de componente com hook mockado (nao testar hook em si, ja testado em `useProspectingGoals.test.ts`)

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/PowerDialer.tsx` | Modified | Adicionar prop `goalProgress`, mini-indicador e toast celebrativo |
| `features/prospecting/ProspectingPage.tsx` | Modified | Passar `goalProgress` para PowerDialer e para componente de briefing |
| `features/prospecting/components/[BriefingComponent].tsx` | Modified | Adicionar secao de meta (componente criado por CP-4.1) |
| `features/prospecting/__tests__/powerDialerGoal.test.tsx` | Created | Testes AC2, AC3, AC4 no PowerDialer |
| `features/prospecting/__tests__/[briefingGoal].test.tsx` | Created | Testes AC1, AC4 no briefing |

### Testing

**Framework:** Vitest + Testing Library
**Localizacao de testes:** `features/prospecting/__tests__/`

**Cenarios obrigatorios:**

| Teste | AC | Descricao |
|-------|-----|-----------|
| PowerDialer com `goalProgress` definido | AC2 | Exibe "{current}/{target} ligacoes hoje" |
| PowerDialer sem `goalProgress` | AC4 | Indicador ausente |
| PowerDialer com `goalProgress.target = 0` | AC4 | Indicador ausente |
| Toast disparado uma vez ao atingir meta | AC3 | `isComplete: true` dispara toast |
| Toast nao re-dispara em re-render | AC3 | Segundo render com `isComplete: true` nao dispara novamente |
| Briefing com `goalProgress` definido | AC1 | Exibe "Meta do dia: X/Y ligacoes" |
| Briefing sem `goalProgress` | AC4 | Secao de meta ausente |

**Mock padrao para `useProspectingGoals`:**
```typescript
vi.mock('../hooks/useProspectingGoals', () => ({
  useProspectingGoals: () => ({
    goal: { calls_target: 20 },
    progress: { target: 20, current: 12, percentage: 60, color: 'yellow', isComplete: false },
    isLoading: false,
    // ...outros campos se necessario
  }),
}))
```

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Low (consumo de hook existente, sem novas queries, sem schema)
- Secondary Types: —

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev) — REQUIRED: `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops) — antes de criar PR

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Prop opcional `goalProgress` nao quebra renders existentes do PowerDialer
- `useEffect` de celebracao nao causa loop infinito (dependencias corretas)
- Graceful degradation: `goal === null` ou `target === 0` → sem render do indicador
- Toast celebrativo disparado apenas uma vez por montagem do componente

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/PowerDialer.tsx` | Modified | Prop `goalProgress`, mini-indicador, toast celebrativo |
| `features/prospecting/ProspectingPage.tsx` | Modified | Passar goalProgress para PowerDialer e SessionBriefing |
| `features/prospecting/components/SessionBriefing.tsx` | Modified | Secao de meta do dia no briefing pre-sessao |
| `features/prospecting/__tests__/powerDialerGoal.test.tsx` | Created | 9 testes: AC2, AC3, AC4 no PowerDialer |
| `features/prospecting/__tests__/sessionBriefing.test.tsx` | Modified | 4 testes adicionados: AC1, AC4 no briefing |

## QA Results

| Check | Resultado |
|-------|-----------|
| Code review | PASS — patterns corretos, sem violations |
| Unit tests | PASS — 13 novos testes, 924/924 total |
| Acceptance criteria | PASS — AC1-AC4 todos atendidos |
| No regressions | PASS — 85 arquivos de teste, zero falhas |
| Performance | PASS — consumo puro de hook existente |
| Security | PASS — sem inputs, sem API calls, sem XSS |
| Typecheck & Lint | PASS — zero erros |

**Verdict: PASS**

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-11 | @sm | Story criada a partir do Epic CP-4 |
| 2026-03-11 | @po | Validacao GO (10/10). Status Draft -> Ready. 1 should-fix: toast pattern menciona sonner mas projeto usa useToast/addToast. 1 nice-to-have: ProspectingPage.tsx falta na File List. |
| 2026-03-11 | @sm | SF-1 aplicado: referencias a sonner removidas. Dev Notes e Task 2.2 atualizados para padrao correto do projeto — useToast() de @/context/ToastContext com addToast(message, type). useOptionalToast documentado para cenarios de teste sem provider. |
| 2026-03-11 | @dev | Implementacao completa. PowerDialer: prop goalProgress + mini-indicador + toast celebrativo (useOptionalToast). SessionBriefing: secao meta do dia. ProspectingPage: passagem de goalProgress. 13 novos testes (9 powerDialerGoal + 4 sessionBriefing). typecheck/lint/test OK. Status Ready -> Ready for Review. |
| 2026-03-11 | @qa | QA Gate PASS. 7/7 checks OK. 924 testes passando, zero regressoes. Status Ready for Review -> Done. |

---
*Story gerada por @sm (River) — Epic CP-4*
