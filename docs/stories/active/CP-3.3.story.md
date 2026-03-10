# Story CP-3.3: IA Recomenda Contatos + Analise de Padroes

## Metadata
- **Story ID:** CP-3.3
- **Epic:** CP-3 (Prospeccao com IA + Melhorias da Central)
- **Status:** InProgress
- **Priority:** P1
- **Estimated Points:** 13 (L)
- **Wave:** 2
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** corretor usando o chat de IA do ZmobCRM,
**I want** que a IA analise meus padroes de prospeccao e recomende quem ligar e quando,
**so that** possa perguntar "quem devo ligar agora?" e receber sugestoes acionaveis com motivo.

## Descricao

O agente de IA ja tem 36+1 tools (com suggestScript de CP-3.2), mas falta a capacidade de **recomendar contatos** e **analisar padroes**. Esta story adiciona 4 novas tools que transformam o agente em um assistente proativo de prospeccao:

1. **listSavedQueues**: IA precisa ver filas salvas para sugerir "carregar fila X com N leads quentes"
2. **addContactsToQueue**: IA precisa adicionar contatos recomendados a fila (com aprovacao)
3. **suggestContactsForProspecting**: Cruza lead score + dias sem contato + heatmap + outcomes para gerar lista rankeada
4. **analyzeProspectingPatterns**: Gera insights sobre padroes (melhor horario, dia mais produtivo, taxa por stage, contatos negligenciados)

## Acceptance Criteria

### listSavedQueues tool
- [ ] AC1: Given o agente de IA, when solicitado "mostre minhas filas salvas", then retorna lista com nome, filtros, contact count e is_shared
- [ ] AC2: Given o agente de IA com filas salvas de outro usuario (is_shared=true), when solicitado, then inclui filas compartilhadas no resultado

### addContactsToQueue tool
- [ ] AC3: Given o agente de IA e uma lista de contactIds, when solicitado "adicione esses contatos a minha fila", then adiciona em batch e retorna contagem (added/skipped)
- [ ] AC4: Given a tool addContactsToQueue, when executada, then requer aprovacao do usuario antes de executar (needsApproval: true)
- [ ] AC5: Given contactIds ja na fila, when adicionados via IA, then sao ignorados (skipped) sem erro

### suggestContactsForProspecting tool
- [ ] AC6: Given o agente de IA, when solicitado "quem devo ligar agora?", then retorna lista de 10 contatos rankeados com score composto e motivo
- [ ] AC7: Given contatos retornados, when analisados, then cada sugestao inclui: nome, score, temperatura, dias sem contato, melhor acao sugerida e motivo da recomendacao
- [ ] AC8: Given filtros opcionais (stage, temperature), when passados, then a lista e filtrada adequadamente

### analyzeProspectingPatterns tool
- [ ] AC9: Given o agente de IA, when solicitado "analise meus padroes de prospeccao dos ultimos 30 dias", then retorna insights estruturados
- [ ] AC10: Given o periodo de 30d, when analisado, then inclui: melhor horario, dia mais produtivo, taxa de conexao por stage, contatos negligenciados (>7 dias sem contato)

### Integracao e documentacao
- [ ] AC11: Given o BASE_INSTRUCTIONS, when inspecionado, then documenta 41 tools (36 atuais + suggestScript + 4 desta story)
- [ ] AC12: Given o prompt catalog, when inspecionado, then inclui template `agent_prospecting_recommendations`

## Scope

### IN
- Tool `listSavedQueues` (consome `prospectingSavedQueuesService.list()`)
- Tool `addContactsToQueue` com needsApproval (consome `prospectingQueuesService.addBatchToQueue()`)
- Tool `suggestContactsForProspecting` com logica de ranking
- Tool `analyzeProspectingPatterns` com insights por periodo
- Prompt template `agent_prospecting_recommendations` no catalog
- Atualizar BASE_INSTRUCTIONS para 41 tools
- Testes unitarios

### OUT
- UI de recomendacoes (apenas via chat de IA)
- Novas tabelas DB (usar servicos existentes)
- Modificacoes em componentes do frontend
- Cadencia multi-canal automatizada

## Tasks

### Task 1 — listSavedQueues tool (AC1, AC2)
- [x] Task 1.1: Criar tool `listSavedQueues` em `lib/ai/tools/prospecting-tools.ts`
  - Input: nenhum obrigatorio (usa userId do contexto auth)
  - Logica: query `prospecting_saved_queues` WHERE owner_id = userId OR is_shared = true
  - Output: lista com `name, filters_json, contact_count, is_shared, created_at`
  - needsApproval: false

### Task 2 — addContactsToQueue tool (AC3, AC4, AC5)
- [x] Task 2.1: Criar tool `addContactsToQueue` em `lib/ai/tools/prospecting-tools.ts`
  - Input: `contactIds: z.array(z.string()).min(1).max(100)`, `targetOwnerId: z.string().optional()`
  - Logica: verificar duplicatas → inserir novos em `prospecting_queues` com status pending → respeitar limite de 100
  - Output: `{ added: number, skipped: number, reason?: string }`
  - needsApproval: true (acao que modifica fila do corretor)
- [x] Task 2.2: Testes para duplicatas e limite de 100

### Task 3 — suggestContactsForProspecting tool (AC6, AC7, AC8)
- [x] Task 3.1: Criar tool `suggestContactsForProspecting` em `lib/ai/tools/prospecting-tools.ts`
  - Input: `count: z.number().min(1).max(20).default(10)`, `stage: z.string().optional()`, `temperature: z.enum(['HOT','WARM','COLD']).optional()`
  - Logica de ranking (score composto):
    1. Buscar contatos ativos da org com phone preenchido
    2. Para cada: lead_score (peso 40%), dias_sem_contato (peso 30%, mais dias = mais prioridade), best_hour_match (peso 20%, baseado em heatmap), previous_outcomes (peso 10%, evitar contatos com 3+ no_answer consecutivos)
    3. Ordenar por score composto DESC
    4. Retornar top N com breakdown
  - Output por contato: `name, phone, leadScore, temperature, daysSinceLastContact, suggestedAction, reason`
  - needsApproval: false (apenas sugestao)
- [x] Task 3.2: Testes para ranking e filtros

### Task 4 — analyzeProspectingPatterns tool (AC9, AC10)
- [x] Task 4.1: Criar tool `analyzeProspectingPatterns` em `lib/ai/tools/prospecting-tools.ts`
  - Input: `period: z.enum(['7d','30d','90d']).default('30d')`
  - Logica: query activities WHERE type='CALL' no periodo → agregar por hora/dia/stage/contato
  - Output:
    ```
    bestHour: { hour: number, connectionRate: number }
    bestDay: { dayOfWeek: string, totalCalls: number, connectionRate: number }
    byStage: [{ stage, calls, connectionRate }]
    neglectedContacts: [{ name, daysSince, temperature, leadScore }] (top 10, >7 dias)
    summary: string (narrativa natural dos insights)
    ```
  - needsApproval: false
- [x] Task 4.2: Testes para aggregacao e periodo

### Task 5 — Prompt template e documentacao (AC11, AC12)
- [x] Task 5.1: Criar template `agent_prospecting_recommendations` em `catalog.ts`
  - Template com instrucoes de como usar as 4 novas tools em conjunto
  - Incluir exemplos: "quem devo ligar agora?", "analise meus padroes", "carregue minha fila de leads quentes"
- [x] Task 5.2: Atualizar BASE_INSTRUCTIONS_FALLBACK em `crmAgent.ts` (41 tools)
- [x] Task 5.3: Atualizar contagem no catalogo

### Task 6 — Quality Gate
- [x] Task 6.1: `npm run typecheck` passa sem erros
- [x] Task 6.2: `npm run lint` passa sem erros
- [x] Task 6.3: `npm test` passa sem regressoes (74 files, 785 tests)

## Dev Notes

### Contexto Arquitetural

**Tool Pattern (padrao existente em prospecting-tools.ts):**
```typescript
toolName: tool({
  description: 'Descricao em portugues',
  inputSchema: z.object({...}),
  needsApproval: !bypassApproval, // ou true para acoes destrutivas
  execute: async ({params}) => {
    const supabase = await createClient();
    // Query e transformacao
    return { data, error };
  }
})
```

**Services existentes:**
- `prospectingSavedQueuesService.list()` — retorna filas salvas (owner + shared)
- `prospectingQueuesService.addBatchToQueue()` — batch insert com dedup
- Padrao: services em `lib/services/` ou inline nas tools

**Lead Score (`lib/supabase/lead-scoring.ts`):**
- Campo `lead_score` na tabela `contacts` (0-100)
- `calculateLeadScore()` com 7 fatores
- Usado pelo suggestContactsForProspecting como fator de ranking

**Heatmap dados (`ConnectionHeatmap.tsx`):**
- Grid 7 dias × 6 slots (08-10, 10-12, ..., 18-20)
- Dados vem de activities WHERE type='CALL' com metadata
- suggestContactsForProspecting pode reutilizar logica similar para best_hour_match

**Tabela prospecting_saved_queues:**
- Colunas: id, name, owner_id, organization_id, filters_json (JSONB), contact_ids_json (JSONB), is_shared, created_at
- RLS: owner ve proprias + shared da org

**Tabela prospecting_queues:**
- Colunas: id, contact_id, owner_id, organization_id, status, position, retry_at, retry_count, created_at, updated_at
- Limite: 100 items por owner (validado no frontend)
- RLS: owner ve proprias, admin/diretor ve todas da org

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/ai/tools/prospecting-tools.ts` | Modified | 4 novas tools |
| `lib/ai/crmAgent.ts` | Modified | BASE_INSTRUCTIONS 41 tools |
| `lib/ai/prompts/catalog.ts` | Modified | Template agent_prospecting_recommendations + contagem |
| `lib/ai/__tests__/prospecting-tools.test.ts` | Modified | Testes para 4 novas tools |

### Notas de Implementacao

- **suggestContactsForProspecting**: A logica de ranking pode ser complexa. Implementar em 2 fases: (1) query contatos com dados necessarios, (2) calcular score composto no client. Se performance for problema (>500 contatos), mover para RPC em story futura.
- **analyzeProspectingPatterns**: Query de activities pode ser pesada em periodos longos. Usar LIMIT e agregar no server se possivel, ou documentar limitacao de 5000 registros.
- **addContactsToQueue**: Reutilizar validacao de limite (100) e dedup existente em `useProspectingQueue`.

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Backend (AI Tools)
- Complexity: High (4 tools novas + prompt template)
- Secondary Types: AI/Tools

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
- needsApproval correto (true para addContactsToQueue, false para leitura)
- Query performance: evitar full table scan em contatos
- Ranking: scores compostos devem ser deterministicos e testáveis
- BASE_INSTRUCTIONS: contagem exata de 41 tools

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| suggestContacts lento com muitos contatos | Media | Medio | Limitar query a 500 contatos ativos, mover para RPC se necessario |
| analyzePatterns limitado por 5000 registros | Media | Medio | Documentar limitacao, CP-3.5 resolve com RPC server-side |
| addContactsToQueue excede limite de 100 | Baixa | Baixo | Validar no tool: rejeitar se fila + novos > 100 |
| Ranking impreciso com poucos dados | Media | Baixo | Exigir minimo de chamadas, mensagem "dados insuficientes" |

## Dependencies

- **CP-3.1:** Done (tools base)
- **CP-3.2:** Recomendado. Se CP-3.2 estiver feita: total sera 37+4 = **41 tools**. Se CP-3.2 NAO estiver feita: total sera 36+4 = **40 tools** (suggestScript sera contabilizado quando CP-3.2 for concluida). O @dev deve verificar o estado atual do BASE_INSTRUCTIONS antes de atualizar a contagem.
- **Nenhuma migration necessaria**

## Criteria of Done

- [ ] `listSavedQueues` tool funcional
- [ ] `addContactsToQueue` tool com needsApproval
- [ ] `suggestContactsForProspecting` retorna lista rankeada com motivo
- [ ] `analyzeProspectingPatterns` gera insights acionaveis
- [ ] Prompt `agent_prospecting_recommendations` no catalog
- [ ] IA sugere carregar filas salvas quando pertinente
- [ ] BASE_INSTRUCTIONS atualizado (41 tools)
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] `npm test` passa
- [ ] Testes cobrindo 4 novas tools

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/ai/tools/prospecting-tools.ts` | Modified | +4 tools: listSavedQueues, addContactsToQueue, suggestContactsForProspecting, analyzeProspectingPatterns |
| `lib/ai/crmAgent.ts` | Modified | BASE_INSTRUCTIONS_FALLBACK atualizado para 41 tools |
| `lib/ai/prompts/catalog.ts` | Modified | Contagem 41 tools + template agent_prospecting_recommendations |
| `lib/ai/__tests__/prospecting-tools.test.ts` | Modified | +14 testes para 4 novas tools |
| `lib/ai/__tests__/base-instructions-catalog.test.ts` | Modified | Contagem 41 tools + teste agent_prospecting_recommendations |
| `docs/stories/active/CP-3.3.story.md` | Modified | Checkboxes e File List atualizados |

## QA Results

**Reviewer:** @qa (Quinn)
**Date:** 2026-03-10
**Verdict:** PASS

### Quality Gates

| Check | Status |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` (74 files, 790 tests) | PASS |

### AC Traceability (12/12 PASS)

| AC | Status | Notas |
|----|--------|-------|
| AC1 | PASS | listSavedQueues retorna nome, filtros, contactCount, is_shared |
| AC2 | PASS | Inclui filas compartilhadas via `.or()` |
| AC3 | PASS | addContactsToQueue batch com added/skipped |
| AC4 | PASS | needsApproval: !bypassApproval |
| AC5 | PASS | Duplicatas filtradas, retorna skipped count |
| AC6 | PASS | suggestContactsForProspecting retorna top N rankeados |
| AC7 | PASS | Cada sugestao inclui nome, score, temp, dias, acao, motivo |
| AC8 | PASS | Filtros stage/temperature funcionais |
| AC9 | PASS | analyzeProspectingPatterns retorna insights estruturados |
| AC10 | PASS | bestHour, bestDay, byStage, neglectedContacts (fix iteracao 2) |
| AC11 | PASS | BASE_INSTRUCTIONS + catalog documentam 41 tools |
| AC12 | PASS | Template agent_prospecting_recommendations presente |

### Iterations

| # | Resultado | Issues |
|---|-----------|--------|
| 1 | CONCERNS | Faltava `byStage` em analyzeProspectingPatterns (AC10) |
| 2 | PASS | @dev adicionou byStage com query unificada + teste. Zero regressoes. |

### Observacoes

- Score composto bem estruturado (40% lead, 30% dias, 20% hora, 10% outcomes)
- Filtro de 3+ no_answer consecutivos evita spam
- Fix do byStage trouxe otimizacao: 1 query a menos (contacts unificado)
- 41 tools confirmados via grep (`tool({` count across 6 files)

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic CP-3 |
| 2026-03-10 | @po | Validacao GO (9/10). Fix I3: dependencia CP-3.2 clarificada com contagem condicional (40 ou 41 tools). Status Draft → Ready. |
| 2026-03-10 | @dev | Implementacao completa: 4 tools, testes, prompt template, BASE_INSTRUCTIONS 41 tools. 785 testes passando. |
| 2026-03-10 | @qa | Review iteracao 1: CONCERNS (faltava byStage AC10). Iteracao 2: PASS (12/12 ACs). |

---
*Story gerada por @sm (River) — Epic CP-3*
