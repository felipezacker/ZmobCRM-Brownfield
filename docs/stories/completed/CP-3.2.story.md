# Story CP-3.2: suggestScript + Lead Score UI + Auto-Retry Configuravel + Note Templates Dinamicos

## Metadata
- **Story ID:** CP-3.2
- **Epic:** CP-3 (Prospeccao com IA + Melhorias da Central)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 13 (L)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** corretor usando a Central de Prospeccao do ZmobCRM,
**I want** que a IA sugira scripts por contexto, que o lead score seja visivel na fila e filtros, que o auto-retry aceite mais outcomes, e que note templates venham do banco,
**so that** tenha orientacao inteligente durante ligacoes, priorize leads por score, configure retries como quiser, e use templates customizados pela gestao.

## Descricao

4 temas complementares que elevam a produtividade do corretor na Central de Prospeccao:

1. **suggestScript tool**: IA analisa contexto do contato (historico, outcome, stage) e sugere o script mais adequado das 6 categorias existentes em `quick_scripts`.
2. **Lead score visivel na UI**: O calculo ja existe (`lead-scoring.ts`, 7 fatores, 0-100) mas nao aparece em nenhum componente da Central. Adicionar badges em QueueItem, PowerDialer e FilteredContactsList, com ordenacao por score.
3. **Auto-retry configuravel**: Hoje so `no_answer` dispara retry. Expandir para `voicemail` e `busy` como opcoes configuraveis.
4. **Note templates dinamicos**: Componente `NoteTemplates` ja esta integrado na CallModal mas usa dados hardcoded (`TEMPLATES_BY_OUTCOME`). Conectar a prop `customTemplates` ao service que le da tabela `prospecting_note_templates`.

## Acceptance Criteria

### suggestScript tool
- [ ] AC1: Given o agente de IA e um contactId, when solicitado "sugira um script para o contato X", then retorna o script mais adequado com motivo da sugestao
- [ ] AC2: Given o agente de IA com contactId + outcome "no_answer", when solicitado sugestao, then sugere script da categoria `rescue` ou `followup` adequado ao contexto
- [ ] AC3: Given o agente de IA com contactId + stage "negotiation", when solicitado sugestao, then sugere script da categoria `closing` ou `objection`

### Lead score na UI
- [ ] AC4: Given um contato na fila de prospeccao (QueueItem), when renderizado, then exibe badge com score (0-100) e cor (vermelho <30, amarelo 30-60, verde >60)
- [ ] AC5: Given o PowerDialer com contato ativo, when renderizado, then exibe score no header do contato junto ao nome e temperatura
- [ ] AC6: Given o FilteredContactsList, when renderizado, then exibe coluna "Score" com valor numerico e badge colorido
- [ ] AC7: Given a CallQueue com contatos, when usuario clica "Ordenar por Score", then reordena visualmente por lead_score DESC

### Auto-retry configuravel
- [ ] AC8: Given o GoalConfigModal, when aberto por admin/diretor ou corretor, then exibe checkboxes para selecionar quais outcomes fazem retry (no_answer, voicemail, busy)
- [ ] AC9: Given um outcome `voicemail` com retry habilitado, when chamada concluida, then contato e reagendado para retry (mesma logica de no_answer)
- [ ] AC10: Given um outcome `busy` com retry desabilitado, when chamada concluida, then contato e marcado como completado sem retry

### Note templates dinamicos
- [ ] AC11: Given templates customizados na tabela `prospecting_note_templates` para outcome "connected", when CallModal abre com esse outcome, then exibe templates do banco em vez dos hardcoded
- [ ] AC12: Given nenhum template customizado para outcome "busy", when CallModal abre, then exibe templates hardcoded de `TEMPLATES_BY_OUTCOME` como fallback
- [ ] AC13: Given usuario admin/diretor, when na CallModal, then ve link "Gerenciar templates" que abre o NoteTemplatesManager existente

## Scope

### IN
- Criar tool `suggestScript` em `prospecting-tools.ts`
- Badge de lead score no `QueueItem` com cores
- Score no header do contato no `PowerDialer`
- Coluna de score no `FilteredContactsList`
- Botao "Ordenar por Score" na `CallQueue`
- Checkboxes de outcomes de retry no `GoalConfigModal`
- Atualizar `useProspectingQueue.markCompleted()` para verificar lista configurada
- Conectar `NoteTemplates.customTemplates` ao service de note templates
- Link "Gerenciar templates" para admin/diretor
- Testes unitarios

### OUT
- Novas tabelas DB (tabelas ja existem: `quick_scripts`, `prospecting_note_templates`)
- Migrations (exceto se auto-retry config usar coluna DB)
- Reordenacao fisica de `position` na fila (ordenacao visual apenas)
- Redesign do PowerDialer ou CallQueue

## Tasks

### Task 1 — suggestScript tool (AC2, AC3)
- [x] Task 1.1: Criar tool `suggestScript` em `lib/ai/tools/prospecting-tools.ts`
  - Input: `contactId: z.string()`, `outcome: z.enum(['connected','no_answer','voicemail','busy']).optional()`, `stage: z.string().optional()`
  - Logica: buscar historico de atividades do contato + outcome + stage → mapear para categoria de script mais adequada → buscar scripts dessa categoria via `quick_scripts` → retornar o melhor match com motivo
  - Mapping de contexto para categoria: negotiation/closing → `closing`; objecao → `objection`; no_answer/voicemail → `rescue`; primeiro contato → `intro`; follow-up → `followup`
  - needsApproval: false (apenas sugere, nao executa acao)
- [x] Task 1.2: Atualizar BASE_INSTRUCTIONS_FALLBACK em `crmAgent.ts` para documentar `suggestScript` (total: 36 → **37** tools; CP-3.3 levara de 37 → 41)
- [x] Task 1.3: Atualizar catalogo em `catalog.ts` para listar 37 tools
- [x] Task 1.4: Testes para `suggestScript` em `lib/ai/__tests__/prospecting-tools.test.ts`

### Task 2 — Lead score na UI (AC4, AC5, AC6, AC7)
- [x] Task 2.1: Criar componente `LeadScoreBadge` em `features/prospecting/components/LeadScoreBadge.tsx`
  - Props: `score: number | null`
  - Cores: <30 vermelho (destructive), 30-60 amarelo (warning), >60 verde (success)
  - Exibir numero + icone pequeno
- [x] Task 2.2: Modificar `QueueItem.tsx` — adicionar `LeadScoreBadge` ao lado do nome/temperatura
  - Requer: join de `lead_score` no query de queue items (verificar se `getQueue()` ja inclui)
- [x] Task 2.3: Modificar `PowerDialer.tsx` — adicionar `LeadScoreBadge` no header do contato ativo
- [x] Task 2.4: Modificar `FilteredContactsList.tsx` — adicionar coluna "Score" com `LeadScoreBadge`
  - Verificar se RPC `get_prospecting_filtered_contacts` retorna `lead_score`
- [x] Task 2.5: Modificar `CallQueue.tsx` — adicionar botao "Ordenar por Score" que reordena a lista visual por `leadScore DESC`
  - Reordenacao visual apenas (nao altera `position` no DB)
  - Estado local: `sortBy: 'position' | 'score'`

### Task 3 — Auto-retry configuravel (AC8, AC9, AC10)
- [x] Task 3.1: Adicionar estado de retry outcomes em localStorage
  - Key: `prospecting_retry_outcomes`
  - Default: `['no_answer']` (comportamento atual)
  - Opcoes: `no_answer`, `voicemail`, `busy`
- [x] Task 3.2: Modificar `GoalConfigModal.tsx` — adicionar secao "Outcomes de Retry Automatico"
  - 3 checkboxes: Sem resposta (no_answer), Caixa postal (voicemail), Ocupado (busy)
  - Salvar em localStorage ao fechar modal
- [x] Task 3.3: Modificar `useProspectingQueue.markCompleted()` — verificar `retryOutcomes` do localStorage
  - Atual: `if (outcome === 'no_answer') { scheduleRetry() }`
  - Novo: `if (retryOutcomes.includes(outcome)) { scheduleRetry() }`
- [x] Task 3.4: Testes para nova logica de retry

### Task 4 — Note templates dinamicos (AC11, AC12, AC13)
- [x] Task 4.1: Criar service ou usar existente para `noteTemplatesService.getByOutcome(outcome, orgId)`
  - Query: `prospecting_note_templates` WHERE outcome = X AND organization_id = Y
  - Retorna: lista de templates ou null se nenhum customizado
- [x] Task 4.2: Modificar `NoteTemplates.tsx` — carregar templates do DB via service
  - Se customTemplates do DB existem → usar esses
  - Se nao → fallback para `TEMPLATES_BY_OUTCOME[outcome]`
- [x] Task 4.3: No contexto da CallModal, passar `customTemplates` do DB para `NoteTemplates`
  - Usar `useQuery` para buscar templates ao abrir modal
- [x] Task 4.4: Adicionar link "Gerenciar templates" visivel apenas para admin/diretor
  - Navegar para `NoteTemplatesManager` existente (ou abrir modal)
- [x] Task 4.5: Testes

### Task 5 — Quality Gate
- [x] Task 5.1: `npm run typecheck` passa sem erros
- [x] Task 5.2: `npm run lint` passa sem erros
- [x] Task 5.3: `npm test` passa sem regressoes

## Dev Notes

### Contexto Arquitetural

**Tool Pattern (padrao existente em prospecting-tools.ts:321 linhas):**
```typescript
toolName: tool({
  description: 'Descricao em portugues',
  inputSchema: z.object({...}),
  needsApproval: !bypassApproval,
  execute: async ({params}) => {
    console.log('[AI] toolName EXECUTED!');
    // Query via supabase client
    return { data, error: formatSupabaseFailure(err) };
  }
})
```

**Lead Score Engine (`lib/supabase/lead-scoring.ts`, 268 linhas):**
- 7 fatores: recentInteraction (20pts), ltv (15pts), stageAge (±10pts), completedActivities (8-15pts), preferences (10pts), activeDeals (20-25pts), temperature (±10pts)
- Score: 0-100, clamped
- `calculateLeadScore()` retorna breakdown + total
- Exposto via tool `getLeadScore` em `contact-tools.ts`
- Campo `lead_score` na tabela `contacts`

**QueueItem.tsx (~80 linhas):**
- Props: `item: ProspectingQueueItem`, `onRemove?`, `isRemoving?`
- Exibe: avatar, nome, temperatura, phone, stage badge, status badge, retry count
- Lead score deve ser adicionado junto ao nome/temperatura

**useProspectingQueue.ts (237 linhas):**
- `markCompleted(outcome)`: atualiza status, incrementa daily goals, agenda retry se `no_answer`
- `scheduleRetryMutation`: mutation para agendar retry
- `retryInterval`: localStorage `prospecting_retry_interval` (default 3 dias)
- Alterar: verificar `retryOutcomes` array em vez de hardcoded `no_answer`

**NoteTemplates.tsx (~63 linhas):**
- Ja integrado em CallModal (linha ~379)
- `TEMPLATES_BY_OUTCOME`: connected (7), no_answer (3), voicemail (2), busy (1)
- Prop `customTemplates?: string[]` existe mas nao conectada ao DB
- Tabela `prospecting_note_templates`: outcome, template_text, organization_id, RLS ativo

**GoalConfigModal.tsx (~80 linhas):**
- Modal simples com input numerico (1-200) e grid de time goals
- Adicionar secao de checkboxes abaixo do input de meta

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/ai/tools/prospecting-tools.ts` | Modified | Adicionar tool suggestScript |
| `lib/ai/crmAgent.ts` | Modified | Atualizar BASE_INSTRUCTIONS_FALLBACK (37 tools) |
| `lib/ai/prompts/catalog.ts` | Modified | Atualizar contagem de tools |
| `features/prospecting/components/LeadScoreBadge.tsx` | Created | Componente de badge de score |
| `features/prospecting/components/QueueItem.tsx` | Modified | Adicionar LeadScoreBadge |
| `features/prospecting/components/PowerDialer.tsx` | Modified | Adicionar score no header |
| `features/prospecting/components/FilteredContactsList.tsx` | Modified | Adicionar coluna Score |
| `features/prospecting/components/CallQueue.tsx` | Modified | Botao ordenar por score |
| `features/prospecting/components/GoalConfigModal.tsx` | Modified | Checkboxes de retry outcomes |
| `features/prospecting/hooks/useProspectingQueue.ts` | Modified | Retry configuravel |
| `features/prospecting/components/NoteTemplates.tsx` | Modified | Templates do DB + fallback |
| `lib/ai/__tests__/prospecting-tools.test.ts` | Modified | Testes suggestScript |

### Decisoes de @dev

- **Storage de retry outcomes:** localStorage (padrao existente com `retryInterval`). Se @dev avaliar que coluna DB e mais adequada (ex: config por org), documentar decisao e criar migration.
- **Query de lead_score na fila:** Verificar se `getQueue()` ja faz join com `contacts.lead_score`. Se nao, adicionar join ou query separada.
- **RPC de filtered contacts:** Verificar se `get_prospecting_filtered_contacts` retorna `lead_score`. Se nao, adicionar ao SELECT da RPC.

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend + Backend (AI Tools)
- Complexity: High (4 temas, ~12 arquivos)
- Secondary Types: AI/Tools

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa (quality gate)

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
- Tool pattern: Zod schema + execute() + needsApproval
- Lead score badge: cor correta por faixa (vermelho/amarelo/verde)
- Retry logic: nao quebrar comportamento existente de no_answer
- Note templates: fallback correto quando DB nao tem templates

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Query de lead_score nao disponivel no join da fila | Media | Medio | Verificar query existente, adicionar join se necessario |
| Ordenacao por score conflita com position fisica | Baixa | Baixo | Ordenacao visual apenas, manter position no DB |
| localStorage de retry outcomes perdido em limpar cache | Baixa | Baixo | Defaults seguros (apenas no_answer), manter fallback |
| NoteTemplates service falha | Baixa | Baixo | Fallback para TEMPLATES_BY_OUTCOME hardcoded |

## Dependencies

- **CP-3.1:** Done (tools base + prompts)
- **Nenhuma migration necessaria** (tabelas existem: quick_scripts, prospecting_note_templates)
- Excecao: se retry config usar coluna DB em vez de localStorage

## Criteria of Done

- [ ] `suggestScript` tool funcional e testada
- [ ] Lead score visivel em QueueItem, PowerDialer e FilteredContactsList
- [ ] Ordenacao por score na CallQueue
- [ ] Auto-retry configuravel (voicemail/busy alem de no_answer)
- [ ] Note templates dinamicos (customTemplates prop conectado ao DB)
- [ ] BASE_INSTRUCTIONS_FALLBACK atualizado (37 tools)
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] `npm test` passa sem regressoes
- [ ] Testes cobrindo suggestScript, retry configuravel, note templates

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/ai/tools/prospecting-tools.ts` | Modified | Adicionado tool suggestScript |
| `lib/ai/crmAgent.ts` | Modified | BASE_INSTRUCTIONS_FALLBACK 36→37 tools, adicionado suggestScript |
| `lib/ai/prompts/catalog.ts` | Modified | Catalogo atualizado para 37 tools |
| `lib/ai/__tests__/prospecting-tools.test.ts` | Modified | 4 testes para suggestScript |
| `lib/ai/__tests__/base-instructions-catalog.test.ts` | Modified | Atualizado para 37 tools |
| `features/prospecting/components/LeadScoreBadge.tsx` | Created | Componente de badge de lead score (vermelho/amarelo/verde) |
| `features/prospecting/components/QueueItem.tsx` | Modified | Adicionado LeadScoreBadge |
| `features/prospecting/components/PowerDialer.tsx` | Modified | Adicionado LeadScoreBadge + props admin/manageTemplates |
| `features/prospecting/components/FilteredContactsList.tsx` | Modified | Adicionado LeadScoreBadge |
| `features/prospecting/components/CallQueue.tsx` | Modified | Botao ordenar por score |
| `features/prospecting/components/GoalConfigModal.tsx` | Modified | Secao checkboxes de retry outcomes |
| `features/prospecting/components/NoteTemplates.tsx` | Modified | Auto-fetch templates do DB + fallback + link gerenciar |
| `features/prospecting/hooks/useProspectingQueue.ts` | Modified | Retry outcomes configuravel via localStorage |
| `features/prospecting/ProspectingPage.tsx` | Modified | Props retry/templates no PowerDialer e GoalConfigModal, NoteTemplatesManager |
| `features/inbox/components/CallModal.tsx` | Modified | Props isAdminOrDirector + onManageTemplates |
| `lib/supabase/prospecting-queues.ts` | Modified | lead_score no join de contacts |
| `lib/supabase/prospecting-filtered-contacts.ts` | Modified | leadScore no tipo e mapeamento |
| `types/types.ts` | Modified | leadScore em ProspectingQueueItem |
| `features/prospecting/__tests__/directorAssignment.test.tsx` | Modified | Mock NoteTemplatesManager + retryOutcomes |

## QA Results

**Reviewer:** @qa (Quinn)
**Date:** 2026-03-10
**Verdict:** PASS

### Quality Gates

| Gate | Resultado |
|------|-----------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 warnings) |
| `npm test` | PASS (770 tests, 74 files) |

### AC Validation

| AC | Veredicto | Evidencia |
|----|-----------|-----------|
| AC1 | PASS | `prospecting-tools.ts:344-358` retorna suggestedCategory, reason, script |
| AC2 | PASS | `prospecting-tools.ts:306-308` + teste unitario |
| AC3 | PASS | `prospecting-tools.ts:300-305` + teste unitario |
| AC4 | PASS | `QueueItem.tsx:45` LeadScoreBadge com cores corretas |
| AC5 | PASS | `PowerDialer.tsx:241` LeadScoreBadge size="md" no header |
| AC6 | PASS | `FilteredContactsList.tsx:254` LeadScoreBadge na lista |
| AC7 | PASS | `CallQueue.tsx:21-28` toggle sortBy position/score |
| AC8 | PASS | `GoalConfigModal.tsx:109-128` 3 checkboxes retry outcomes |
| AC9 | PASS | `useProspectingQueue.ts:178` retryOutcomes.includes(outcome) |
| AC10 | PASS | `useProspectingQueue.ts:189` else → updateStatus('completed') |
| AC11 | PASS | `NoteTemplates.tsx:49-59` auto-fetch DB templates |
| AC12 | PASS | `NoteTemplates.tsx:64-66` fallback para TEMPLATES_BY_OUTCOME |
| AC13 | PASS | `NoteTemplates.tsx:86-97` link "Gerenciar templates" admin/diretor |

### Issues

| Severidade | Arquivo | Descricao |
|------------|---------|-----------|
| LOW | `NoteTemplates.tsx:51` | Promise sem .catch() — risco minimo, service usa pattern {data, error}. Tech debt. |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic CP-3 |
| 2026-03-10 | @po | Validacao GO (9/10). Fix I1: AC1 desmarcado. Fix I2: contagem de tools explicitada (36→37). Status Draft → Ready. |
| 2026-03-10 | @dev | Implementacao completa: suggestScript tool, LeadScoreBadge UI, auto-retry configuravel, note templates dinamicos. 72 test files, 757 tests passing. Status Ready → Ready for Review. |
| 2026-03-10 | @qa | QA Review PASS. 13/13 ACs validados. 770 tests, 0 regressoes. 1 issue LOW (tech debt). Status Ready for Review → Done. |

---
*Story gerada por @sm (River) — Epic CP-3*
