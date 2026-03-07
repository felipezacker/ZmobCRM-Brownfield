# Story TD-2.2: IA -- BASE_INSTRUCTIONS + Prospecting Tools + Exposure Gaps

## Metadata
- **Story ID:** TD-2.2
- **Epic:** TD (Technical Debt Resolution)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 13
- **Wave:** 2
- **Assigned Agent:** @dev

## Descricao

O agente de IA do ZmobCRM conhece apenas 15 das 27 ferramentas disponiveis, e o modulo mais ativo do sistema (prospeccao -- 24 componentes, 7 hooks, 25 testes) e completamente invisivel para a IA. Alem disso, o BASE_INSTRUCTIONS em `crmAgent.ts` e hardcoded e ignora o catalogo de prompts (`ai_prompt_templates`), tornando a funcionalidade de admin de prompts inoperante.

Esta story corrige o alinhamento completo da IA com o sistema real: migrar BASE_INSTRUCTIONS para usar o catalogo, criar tools de prospeccao, expor campos invisiveis (property_ref, metadata), criar tools para quick_scripts, e expor tags/custom_fields nas contact tools.

**IMPORTANTE:** DB-006 deve estar corrigido ANTES desta story (RC-01). Se tools de merge forem criadas sem a correcao de seguranca, o agente de IA pode ser vetor de exploracao cross-tenant.

## Acceptance Criteria

### SYS-002 + SYS-014: BASE_INSTRUCTIONS e catalogo de prompts
- [x] AC1: Given o agente de IA, when ativado, then o system prompt e resolvido via `getResolvedPrompt('agent_crm_base_instructions')` em vez de string hardcoded
- [x] AC2: Given o admin de prompts (tabela `ai_prompt_templates`), when um template e editado, then o agente reflete a mudanca no proximo request
- [x] AC3: Given o system prompt do agente, when inspecionado, then menciona todas as 27 tools disponiveis (nao apenas 15)
- [x] AC4: Given a tool `getLeadScore` (SYS-014), when o agente recebe pergunta sobre score de lead, then utiliza a tool proativamente

### SYS-004 + SYS-005: Prospecting tools
- [x] AC5: Given o agente de IA, when solicitado "mostre minhas filas de prospeccao", then retorna lista de filas ativas da organizacao
- [x] AC6: Given o agente de IA, when solicitado "quais sao minhas metas de hoje", then retorna metas e progresso do power dialer
- [x] AC7: Given o agente de IA, when solicitado "gere um script de introducao para o lead X", then utiliza quick_scripts como base
- [x] AC8: Given o agente de IA, when solicitado "quais sao minhas metricas de prospeccao", then retorna metricas de conversao, ligacoes e cadencias
- [x] AC9: Given a tool de deal (SYS-005), when consultada, then inclui campo `property_ref` no resultado
- [x] AC10: Given a tool de activity (SYS-005), when consultada, then inclui campo `metadata` JSONB no resultado (outcomes de ligacao)

### SYS-012: Quick scripts tools
- [x] AC11: Given o agente de IA, when solicitado "liste meus scripts de followup", then retorna scripts da tabela `quick_scripts` filtrados por categoria `followup`
- [x] AC12: Given o agente de IA, when solicitado "gere um script de vendas e salve", then o script e persistido na tabela `quick_scripts` (nao mais gerado como texto solto)

### SYS-013: Tags e custom fields nas contact tools
- [x] AC13: Given o agente de IA, when solicitado "encontre contatos com tag VIP", then filtra por tag na busca
- [x] AC14: Given o agente de IA, when solicitado "encontre contatos com campo custom 'origem' = 'indicacao'", then filtra por custom field

## Scope

### IN
- Migrar BASE_INSTRUCTIONS de hardcoded para catalogo `ai_prompt_templates` (SYS-002)
- Incluir todas as 27 tools no prompt (SYS-002)
- Mencionar lead score no prompt (SYS-014 -- resolvido com SYS-002)
- Criar `lib/ai/tools/prospecting-tools.ts` com tools para filas, metas, scripts, metricas (SYS-004)
- Expor `property_ref` nas deal tools (SYS-005)
- Expor `metadata` JSONB nas activity tools (SYS-005)
- Criar tools para quick_scripts (listar, sugerir, persistir) (SYS-012)
- Expor tags/custom_fields como filtros nas contact tools (SYS-013)

### OUT
- Criacao de novas tabelas no banco (usar tabelas existentes)
- Mudancas no frontend de prospeccao
- Testes E2E da IA (Onda 5)

## Technical Notes

### SYS-002 Fix
- Arquivo: `lib/ai/crmAgent.ts` (linhas ~404-439 BASE_INSTRUCTIONS)
- Integrar com: `lib/ai/prompts/catalog.ts` e tabela `ai_prompt_templates`
- Usar `getResolvedPrompt()` para resolver o prompt dinamicamente
- Fallback: manter string hardcoded como default se catalogo falhar

### SYS-004 Prospecting Tools
- Novo arquivo: `lib/ai/tools/prospecting-tools.ts`
- Tabelas relevantes: `prospecting_queues`, `prospecting_queue_contacts`, `contact_metrics`, `quick_scripts`
- Hooks existentes no frontend: 7 hooks em `features/prospecting/hooks/`
- Tools sugeridas: `listProspectingQueues`, `getQueueContacts`, `getProspectingMetrics`, `getProspectingGoals`, `listQuickScripts`, `createQuickScript`

### SYS-005 Campos invisiveis
- `property_ref`: campo TEXT em deals (migration `20260303120000`)
- `metadata`: campo JSONB em activities (migration `20260303130000`, outcomes de ligacao)
- Ambos precisam ser expostos nos Zod schemas das tools existentes

### SYS-012 Quick Scripts
- Tabela: `quick_scripts` com 6 categorias: followup, objection, closing, intro, rescue, other
- Atualmente `generateSalesScript` gera texto solto -- deve persistir como `quick_script`

### SYS-013 Tags/Custom Fields
- Tags: movidas de deals para contacts (migration `20260227220048`)
- Atualizar schemas Zod de search/filter tools para aceitar `tags` e `custom_fields`

## Dependencies
- **TD-0.1 (DB-006):** OBRIGATORIA. Nao criar tools de prospeccao antes da correcao cross-tenant (RC-01)
- **TD-1.1 (RPCs INVOKER):** Recomendada. Dashboard stats e LTV corrigidos antes de expor via IA
- SYS-011 (WHATSAPP enum) de TD-1.2 -- pode ser feito antes ou em paralelo

## Debitos Enderecados
| ID | Debito | Severidade |
|----|--------|-----------|
| SYS-002 | BASE_INSTRUCTIONS hardcoded (12 tools invisiveis) | CRITICAL |
| SYS-014 | Lead score tool nao mencionada no prompt | MEDIUM |
| SYS-004 | Modulo de prospeccao invisivel para IA | HIGH |
| SYS-005 | property_ref + metadata invisiveis | HIGH |
| SYS-012 | Quick scripts desconectados da IA | MEDIUM |
| SYS-013 | Tags/custom fields sem exposure | MEDIUM |

## Definition of Done
- [x] BASE_INSTRUCTIONS resolvido via catalogo (nao hardcoded)
- [x] Agente reconhece e usa 27/27 tools
- [x] Tools de prospeccao funcional (filas, metas, metricas, scripts)
- [x] property_ref e metadata expostos nas tools
- [x] Quick scripts com CRUD via IA
- [x] Tags/custom_fields como filtro em contact tools
- [x] `npm run typecheck` passando
- [x] `npm run lint` passando
- [x] `npm test` passando (incluindo novos testes para tools)
- [x] Code reviewed

## File List
| File | Action | Description |
|------|--------|-------------|
| `lib/ai/crmAgent.ts` | Modified | BASE_INSTRUCTIONS migrado para resolveBaseInstructions() via catalogo com fallback |
| `lib/ai/prompts/catalog.ts` | Modified | Template agent_crm_base_instructions atualizado com 27 tools |
| `lib/ai/tools.ts` | Modified | Wired prospecting tools na factory |
| `lib/ai/tools/index.ts` | Modified | Export de prospecting-tools |
| `lib/ai/tools/prospecting-tools.ts` | Created | 6 tools: listProspectingQueues, getProspectingMetrics, getProspectingGoals, listQuickScripts, createQuickScript, generateAndSaveScript |
| `lib/ai/tools/deal-tools.ts` | Modified | Exposto property_ref em searchDeals e getDealDetails |
| `lib/ai/tools/activity-tools.ts` | Modified | Exposto metadata JSONB em listActivities |
| `lib/ai/tools/contact-tools.ts` | Modified | Adicionados filtros tag, customFieldKey, customFieldValue em searchContacts; tags e customFields no response |
| `lib/ai/__tests__/base-instructions-catalog.test.ts` | Created | 5 testes verificando catalogo lista 27 tools |
| `lib/ai/__tests__/exposure-gaps.test.ts` | Created | 7 testes para property_ref, metadata, tags/custom_fields |
| `lib/ai/__tests__/prospecting-tools.test.ts` | Created | 14 testes para as 6 prospecting tools |

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2026-03-06 | @pm | Story created |
| 2026-03-07 | @po | Validated GO (9/10) -- all deps met, status Draft -> Ready |
| 2026-03-07 | @dev | Implementation complete: BASE_INSTRUCTIONS via catalogo, 6 prospecting tools, property_ref/metadata/tags exposed, 26 novos testes (686 total). 14/14 ACs done. Status Ready -> InReview |
