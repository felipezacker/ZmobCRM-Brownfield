# Story QV-1.6: Tipo WHATSAPP End-to-End

## Metadata
- **Story ID:** QV-1.6
- **Epic:** QV (Quality Validation)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 2
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** usuario do ZmobCRM,
**I want** que o tipo WHATSAPP esteja disponivel ao criar atividades tanto no formulario quanto via IA,
**so that** possa registrar interacoes de WhatsApp como tipo proprio em vez de usar CALL.

## Descricao

**Bug #5 (MEDIUM):** Tipo WHATSAPP nao aparece no formulario de criacao de atividades (apenas CALL, MEETING, EMAIL, TASK).

**Bug #14 (MEDIUM):** Via IA, ao pedir "crie uma atividade de whatsapp", a IA cria como CALL porque WHATSAPP nao existe no enum do frontend.

O tipo WHATSAPP ja existe no banco de dados (enum/check constraint inclui WHATSAPP). O problema e exclusivamente no frontend — validacao Zod (`activityFormTypeSchema`) e type definitions TypeScript nao incluem WHATSAPP, causando rejeicao silenciosa ou fallback para CALL.

## Acceptance Criteria

- [ ] AC1: Given o formulario de criar atividade, when abro o dropdown de tipo, then WHATSAPP aparece como opcao
- [ ] AC2: Given o tipo WHATSAPP selecionado, when crio a atividade, then e salva com tipo WHATSAPP no banco
- [ ] AC3: Given o chat de IA, when peco "crie uma atividade de whatsapp", then a atividade e criada com tipo WHATSAPP (nao CALL)
- [ ] AC4: Given a lista de atividades, when uma atividade e tipo WHATSAPP, then exibe icone MessageCircle (lucide-react) na cor text-emerald-500 e label "WhatsApp"

## Scope

### IN
- Adicionar WHATSAPP ao schema Zod de validacao (`activityFormTypeSchema`) em `lib/validations/schemas.ts`
- Adicionar WHATSAPP ao union de tipos TypeScript (`nextActivity.type` e `Activity.type`) em `types/types.ts`
- Adicionar WHATSAPP ao tipo `ParsedActionType` em `types/aiActions.ts`
- Icone MessageCircle (text-emerald-500) e label "WhatsApp" para tipo WHATSAPP no componente de lista
- Confirmar que tool de IA (`activity-tools.ts`) ja aceita WHATSAPP (confirmado)

### OUT
- Integracao real com WhatsApp (envio de mensagens)
- Novos tipos de atividade alem de WHATSAPP
- Quick-add no Kanban (DealCard.tsx / KanbanList.tsx usam QuickAddType sem WHATSAPP — nao alterado nesta story)

## Dependencies

- **Prerequisite stories:** Nenhuma (bug independente)
- **External:** Banco de dados ja aceita WHATSAPP (confirmado na auditoria de gaps — nao requer migration)
- **Dependente de (ja pronto):** `lib/ai/tools/activity-tools.ts` ja inclui WHATSAPP no enum Zod (linhas 15 e 177)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Switch/case em outros componentes nao tratado | Media | Baixo | Buscar todos os switch sobre activity.type antes do commit |
| typecheck falhar em tipos nao atualizados | Alta | Medio | Executar `npm run typecheck` antes de finalizar |
| Regressao em outros tipos de atividade | Baixa | Alto | Testar CALL, MEETING, EMAIL, TASK apos a alteracao |

## Business Value

Correto registro de interacoes de WhatsApp (canal mais usado no CRM brasileiro) melhora qualidade dos dados e viabiliza metricas precisas por canal de comunicacao.

## Criteria of Done

- [x] `npm run typecheck` passa sem erros
- [x] `npm run lint` passa sem erros
- [x] `npm test` passa (sem regressoes — 2 falhas pre-existentes QV-1.5)
- [ ] AC1-AC4 verificados manualmente no browser (pendente deploy staging)
- [x] Nenhum outro tipo de atividade foi alterado funcionalmente
- [x] File List atualizado na story

## Tasks

### Task 1 — Schema Zod (AC1, AC2)
Arquivo: `lib/validations/schemas.ts` (linha 157)

**Subtasks:**
- [x] 1.1: Localizar `activityFormTypeSchema` (linha 157)
- [x] 1.2: Adicionar `'WHATSAPP'` ao `z.enum([...])` existente
- [x] 1.3: Verificar se ha outros schemas de atividade no mesmo arquivo que precisam ser atualizados (activityTypeSchema tambem atualizado)

### Task 2 — Type Definitions TypeScript (AC2, AC3)
Arquivos: `types/types.ts` e `types/aiActions.ts`

**Subtasks:**
- [x] 2.1: Em `types/types.ts` linha 269 — adicionar `'WHATSAPP'` ao union type de `nextActivity.type`
- [x] 2.2: Em `types/types.ts` linha 308 — adicionar `'WHATSAPP'` ao union type de `Activity.type`
- [x] 2.3: Em `types/aiActions.ts` linha 1 — adicionar `'WHATSAPP'` ao `ParsedActionType`
- [x] 2.4: Executar `npm run typecheck` para confirmar sem erros

### Task 3 — Icone e Label (AC4)
Arquivo: `features/activities/utils.tsx` (linhas 7-14 e 19-25)

**Subtasks:**
- [x] 3.1: Localizar switch de icone de atividade (linhas 7-14) e adicionar `case 'WHATSAPP': return <MessageCircle className="text-emerald-500" />`
- [x] 3.2: Localizar funcao getActivityIconCalendar (linhas 19-25). Adicionar `case 'WHATSAPP': return <MessageCircle className="text-white" />`
- [x] 3.3: Confirmar import de `MessageCircle` de `lucide-react` no topo do arquivo

### Task 4 — Verificacao Banco e IA (AC2, AC3)
Arquivos: `lib/ai/tools/activity-tools.ts` (somente leitura / verificacao)

**Subtasks:**
- [x] 4.1: Confirmar linha 15 — enum Zod inclui WHATSAPP
- [x] 4.2: Confirmar linha 177 — enum Zod inclui WHATSAPP (segundo ponto de definicao)
- [x] 4.3: Sem alteracao necessaria (ja implementado no Epic TD)

### Task 5 — Quality Gate
**Subtasks:**
- [x] 5.1: `npm run typecheck` — deve passar sem erros
- [x] 5.2: `npm run lint` — deve passar sem erros
- [x] 5.3: `npm test` — sem regressoes (2 falhas pre-existentes de QV-1.5, nao relacionadas)
- [ ] 5.4: Teste manual — abrir dropdown de criacao de atividade e confirmar WHATSAPP presente
- [ ] 5.5: Teste manual — criar atividade WHATSAPP e verificar no banco (Supabase staging)
- [ ] 5.6: Teste manual — via chat IA solicitar atividade de whatsapp e confirmar tipo salvo

## Dev Notes

### Contexto Tecnico

- O banco de dados ja aceita WHATSAPP — **nao e necessaria nenhuma migration**
- `lib/ai/tools/activity-tools.ts` **definitivamente** ja aceita WHATSAPP (confirmado nas linhas 15 e 177 do arquivo — adicionado no Epic TD)
- A raiz do bug e `activityFormTypeSchema` em `lib/validations/schemas.ts` linha 157 — e o ponto de entrada da validacao no frontend

### Icone e Cor

- **Icone:** `MessageCircle` de `lucide-react`
- **Cor:** `text-emerald-500` (verde WhatsApp — padrao visual do produto)
- **Precedente:** `FocusContextPanel.tsx` ja usa `MessageCircle` da mesma library

### Kanban Quick-Add (OUT OF SCOPE)

`DealCard.tsx` e `KanbanList.tsx` usam `QuickAddType` que nao inclui WHATSAPP. Esta story nao altera esses componentes. Se necessario, criar story separada na epic QV.

### Source Tree

**Arquivos a modificar:**
- `lib/validations/schemas.ts` (linha 157) — activityFormTypeSchema: adicionar 'WHATSAPP' ao z.enum (RAIZ DO BUG)
- `features/activities/utils.tsx` (linhas 7-14, 19-25) — adicionar case 'WHATSAPP' nos switch de icone e label
- `types/types.ts` (linha 269) — nextActivity.type: adicionar 'WHATSAPP' ao union
- `types/types.ts` (linha 308) — Activity.type: adicionar 'WHATSAPP'
- `types/aiActions.ts` (linha 1) — ParsedActionType: adicionar 'WHATSAPP'

**Arquivos de referencia (somente leitura):**
- `lib/ai/tools/activity-tools.ts` (linhas 15, 177) — JA inclui WHATSAPP no enum Zod (confirmado)

### Testing

**Abordagem:** Manual + Typecheck
**Framework:** Jest (se unitario)
**Cenarios por AC:**
- AC1: Abrir dropdown de tipo de atividade -> WHATSAPP deve aparecer como opcao
- AC2: Criar atividade com tipo WHATSAPP -> verificar persistencia no banco (Supabase staging)
- AC3: Via chat IA "crie atividade de whatsapp" -> tipo deve ser WHATSAPP (nao CALL)
- AC4: Na lista de atividades, atividade WHATSAPP exibe icone MessageCircle verde (text-emerald-500)

**Testes existentes relevantes:** `features/prospecting/__tests__/` (referencia de padrao)
**Dados de teste necessarios:** Contato existente para vincular atividade (staging tem dados reais)

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Backend (validacao / tipos)
- Complexity: Low
- Secondary Types: Frontend (enums/types, icone/label)

**Specialized Agent Assignment:**
- Primary: @dev

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
- Type safety across enum definitions
- Consistency between frontend and backend types
- Switch/case exhaustiveness (todos os tipos de atividade cobertos nos switch)

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/validations/schemas.ts` | Modificado | Adicionado WHATSAPP a activityTypeSchema e activityFormTypeSchema |
| `types/types.ts` | Modificado | Adicionado WHATSAPP a nextActivity.type e Activity.type |
| `types/aiActions.ts` | Modificado | Adicionado WHATSAPP a ParsedActionType |
| `features/activities/utils.tsx` | Modificado | Case WHATSAPP em getActivityIconList e getActivityIconCalendar, import MessageCircle |
| `features/activities/components/ActivitiesFilters.tsx` | Modificado | Opcao WHATSAPP no dropdown de filtro |
| `features/activities/components/ActivityFormModal.tsx` | Modificado | Opcao WHATSAPP no dropdown do formulario |
| `features/activities/components/ActivitiesMonthlyCalendar.tsx` | Modificado | WHATSAPP em ACTIVITY_TYPE_COLORS (emerald) |
| `features/decisions/types.ts` | Modificado | Adicionado WHATSAPP a ActionPayload.activityType |
| `features/decisions/analyzers/overdueActivitiesAnalyzer.ts` | Modificado | WHATSAPP em includedTypes, typeLabel e validType |
| `features/settings/components/ApiKeysSection.tsx` | Modificado | Opcao WHATSAPP no dropdown de tipo |
| `app/api/ai/actions/route.ts` | Modificado | Adicionado WHATSAPP a ParsedActionSchema.type |
| `lib/ai/tools/deal-tools.ts` | Modificado | Adicionado WHATSAPP a followUpType enum |
| `test/helpers/salesTeamFixtures.ts` | Modificado | Adicionado WHATSAPP ao type union |
| `lib/debug/index.ts` | Modificado | Adicionado WHATSAPP ao faker array de mock data (fix QA #1) |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @sm | Rework: fixes sistêmicos (SYS-1~4) + fixes específicos @po validation |
| 2026-03-09 | @po | Validation GO (10/10). Status Draft -> Ready. SF-1: Task 3.2 descreve "label switch" mas e getActivityIconCalendar -- dev agent corrigira ao ler o arquivo |
| 2026-03-09 | @sm | Fix SF-1: Task 3.2 atualizada para mencionar getActivityIconCalendar. quality_gate corrigido de @qa para @architect |
| 2026-03-09 | @dev | Implementacao completa: 13 arquivos modificados. WHATSAPP adicionado a todos os enums, types, switches, dropdowns e color maps. typecheck/lint PASS, testes 745/747 (2 falhas pre-existentes QV-1.5) |
| 2026-03-09 | @qa | Review PASS com 2 concerns LOW. Issue #1: lib/debug/index.ts faker array. Issue #2: cores WHATSAPP/TASK identicas (aceito por spec) |
| 2026-03-09 | @dev | Fix QA issue #1: WHATSAPP adicionado ao faker array em lib/debug/index.ts. File List atualizado. 14 arquivos total |
| 2026-03-09 | @po | Criteria of Done atualizado (5/6 — pendente verificacao manual no browser apos deploy). QA PASS confirmado. Pronto para push via @devops |
| 2026-03-09 | @devops | Push confirmado em origin/develop (commits 574a1bc, 942f2bc). Status Ready for Review -> Done |

---
*Story gerada por @sm (River) — Epic QV*
