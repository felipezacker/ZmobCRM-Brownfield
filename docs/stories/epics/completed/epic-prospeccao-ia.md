# Epic: Prospeccao com IA + Melhorias da Central — ZmobCRM

## Metadata
- **Epic ID:** CP-3
- **Status:** Done (6/6 stories Done)
- **Owner:** @pm
- **Created:** 2026-03-06
- **Updated:** 2026-03-10
- **Priority:** P1
- **Source:** Conselho @analyst+@dev+@pm+@po — auditoria Central de Prospeccao + AI Integration Gaps + analise profunda UX/infra (2026-03-09)
- **Depends on:** Epic CP-2 (Prospeccao Inteligente) — todas as 4 stories Done

---

## Objetivo

Conectar a Central de Prospeccao ao agente de IA do ZmobCRM e evoluir a Central com melhorias de UX, inteligencia e infraestrutura identificadas na auditoria de 2026-03-09.

**Eixo 1 (IA):** O agente hoje ja tem 36 tools e 6 de prospeccao, mas falta recomendacao inteligente (quem ligar, quando, o que dizer) e sugestao de scripts por contexto.

**Eixo 2 (UX/Produtividade):** Lead score existe mas nao aparece na UI. Sessoes nao sao persistidas. Note templates tem componente na CallModal mas usa dados hardcoded em vez da tabela DB `prospecting_note_templates`. Auto-retry so funciona para `no_answer`.

**Eixo 3 (Infraestrutura):** Metricas truncadas em 5000 registros. Magic numbers hardcoded. Sem cleanup de items exauridos. Sem error boundaries.

---

## Escopo

### IN
- **IA — Recomendacoes inteligentes**: tools `suggestContactsForProspecting`, `analyzeProspectingPatterns`, `suggestScript`
- **UX — Lead score visivel**: badge de score na fila, PowerDialer e filtros; ordenacao por score
- **UX — Auto-retry configuravel**: voicemail e busy como outcomes de retry (configuravel)
- **UX — Note templates dinâmicos**: conectar `NoteTemplates` (ja na CallModal com dados hardcoded) à tabela DB `prospecting_note_templates` via `customTemplates` prop
- **UX — Persistencia de sessao**: salvar stats da sessao no DB; historico de sessoes
- **UX — Agendamento inteligente**: sugerir horario de retorno baseado no heatmap
- **Infra — Metricas server-side**: RPC agregada no Supabase (eliminar limite de 5000)
- **Infra — Constantes centralizadas**: magic numbers em `prospecting-config.ts`
- **Infra — Cleanup de exauridos**: job periodico para arquivar items exhausted >30 dias
- **Infra — Error boundaries**: fallback graceful por secao (queue, metrics, dialer)

### OUT
- Cadencia multi-canal automatizada (WhatsApp/Email/SMS em sequencia) — epic separado futuro
- VoIP/WebRTC — mantido fora de escopo
- Integracao com provedores externos (Twilio, RD Station)
- Gamificacao (badges, streaks, competicoes)
- Auto-dial sem acao do usuario
- Drag-and-drop de reordenacao (complexidade de UX alta para ganho marginal)
- Bulk import de CSV (funcionalidade de Contacts, nao de Prospeccao)
- Funil end-to-end Lead→Deal→Won (requer tracking cross-module, epic separado)

---

## Contexto Existente (Atualizado 2026-03-09)

### Agente de IA — Estado Atual
| Item | Path | Estado |
|------|------|--------|
| CRM Agent | `lib/ai/crmAgent.ts` | ✅ `resolveBaseInstructions()` integrado com catalog, fallback hardcoded |
| Tools factory | `lib/ai/tools.ts` | ✅ 6 modulos registrados: pipeline, deal, contact, activity, note, **prospecting** |
| Prospecting tools | `lib/ai/tools/prospecting-tools.ts` (321 linhas) | ✅ 6 tools: listQueues, getMetrics, getGoals, listScripts, createScript, generateAndSave |
| Prompt catalog | `lib/ai/prompts/catalog.ts` (152 linhas) | ✅ 36 tools documentados, prospeccao incluida |
| Activity tools | `lib/ai/tools/activity-tools.ts` | ✅ WHATSAPP no enum, metadata JSONB exposto |
| Deal tools | `lib/ai/tools/deal-tools.ts` | ✅ property_ref exposto em search/create/update |
| Contact tools | `lib/ai/tools/contact-tools.ts` | ✅ tags/custom_fields expostos, getLeadScore funcional |

### Central de Prospeccao — Estado Atual
| Feature | Components | Estado |
|---------|-----------|--------|
| Queue Management | CallQueue, QueueItem, AddToQueueSearch | ✅ Completo (batch, dedup, 100 limit) |
| Power Dialer | PowerDialer, CallModal, QuickActionsPanel | ✅ Completo (shortcuts L/P/E/S, outcomes, scripts) |
| Auto-Retry | useProspectingQueue | ⚠️ Parcial (so no_answer, max 3 retries) |
| Filtered Contacts | ProspectingFilters, FilteredContactsList | ✅ Completo (RPC server-side, paginado) |
| Daily Goals | DailyGoalCard, GoalConfigModal | ✅ Completo (meta, progresso, celebracao) |
| Saved Queues | SavedQueuesList, SaveQueueModal | ✅ Completo (contact_ids snapshot, shared) |
| Metrics | MetricsCards, MetricsChart, ConversionFunnel | ⚠️ Funcional mas limitado a 5000 registros |
| Connection Heatmap | ConnectionHeatmap | ⚠️ MIN_CALLS=50 hardcoded, gaps visuais |
| Corretor Ranking | CorretorRanking | ✅ Completo (admin/director only) |
| Quick Scripts | ScriptGuide (PowerDialer) | ✅ Completo (6 categorias, variable substitution) |
| Note Templates | NoteTemplates, NoteTemplatesManager | ⚠️ Componente **ja integrado na CallModal** (linha 379) mas usa templates hardcoded (`TEMPLATES_BY_OUTCOME`); prop `customTemplates` existe mas **nao conectado a tabela DB** `prospecting_note_templates` |
| Lead Score | lead-scoring.ts (268 linhas) | ⚠️ Calculo funcional (7 fatores) mas **nao visivel na UI** |
| Session History | SessionSummary | ⚠️ Stats exibidas mas **nao persistidas** |
| Contact History | ContactHistory | ✅ Completo (timeline expandivel no PowerDialer) |
| AutoInsights | AutoInsights | ✅ Completo (IA gera insights sobre metricas) |
| PDF Export | generateMetricsPDF | ✅ Completo |

### Schema DB (5 tabelas de prospeccao)
| Tabela | RLS | Realtime | Estado |
|--------|-----|----------|--------|
| `prospecting_queues` | ✅ | ✅ | Completa (retry_at, retry_count, exhausted) |
| `prospecting_daily_goals` | ✅ | ✅ | Completa (upsert por owner) |
| `prospecting_saved_queues` | ✅ | ✅ | Completa (filters JSONB, is_shared) |
| `prospecting_note_templates` | ✅ | — | Completa (por outcome, admin-only CRUD) |
| `quick_scripts` | ✅ | — | Completa (multi-tenant, 6 categorias) |

---

## Stories

### ~~CP-3.1: Fix Estrutural do Agente + Tools de Prospeccao~~ ✅ DONE

**Status:** Done (implementado em sessoes anteriores)

**Entregue:**
- [x] `resolveBaseInstructions()` integrado com `getResolvedPrompt('agent_crm_base_instructions')`
- [x] BASE_INSTRUCTIONS_FALLBACK documenta todas as 36 tools
- [x] `prospecting-tools.ts` com 6 tools (listQueues, getMetrics, getGoals, listScripts, createScript, generateAndSave)
- [x] Modulo registrado em `tools.ts`
- [x] WHATSAPP no enum de createTask e logActivity
- [x] property_ref em createDeal/updateDeal/searchDeals
- [x] metadata JSONB em logActivity/createTask
- [x] tags/custom_fields em createContact/updateContact/searchContacts
- [x] Prompts de prospeccao no catalog (36 tools listados)
- [x] Testes em `prospecting-tools.test.ts`

**Descoped de CP-3.1 (movido para stories posteriores):**
- `listSavedQueues` — planejada originalmente, movida para CP-3.3 (necessaria para integracao IA + filas salvas)
- `addContactsToQueue` — planejada originalmente, movida para CP-3.3 (IA precisa poder adicionar contatos recomendados a fila)

---

### ~~CP-3.2: suggestScript + Integracao de Lead Score na UI~~ ✅ DONE

**Status:** Done

**Entregue:**
- [x] `listQuickScripts` tool
- [x] `createQuickScript` tool com needsApproval
- [x] `generateAndSaveScript` tool
- [x] Lead score no prompt (getLeadScore tool + documentado no BASE_INSTRUCTIONS)
- [x] `suggestScript` tool
- [x] Lead score badge no QueueItem
- [x] Lead score no PowerDialer header
- [x] Lead score coluna no FilteredContactsList
- [x] Ordenacao por score na CallQueue
- [x] Auto-retry configuravel (voicemail/busy)
- [x] Note templates dinamicos (conectar `customTemplates` prop ao DB)
- [x] Testes

---

### ~~CP-3.3: IA Recomenda Contatos + Analise de Padroes~~ ✅ DONE

**Status:** Done

**Entregue:**
- [x] `listSavedQueues` tool
- [x] `addContactsToQueue` tool [APPROVAL]
- [x] `suggestContactsForProspecting` tool
- [x] `analyzeProspectingPatterns` tool
- [x] Prompt template `agent_prospecting_recommendations`
- [x] Integracao IA + filas salvas
- [x] Atualizar BASE_INSTRUCTIONS (41 tools)
- [x] Testes

---

### ~~CP-3.4: Persistencia de Sessao + Agendamento Inteligente~~ ✅ DONE

**Status:** Done

**Entregue:**
- [x] Migration `prospecting_sessions`
- [x] RLS policies
- [x] Service `prospecting-sessions.ts`
- [x] Hook atualizacao `useProspectingQueue`
- [x] Componente `SessionHistory`
- [x] Agendamento inteligente no QuickActionsPanel
- [x] Testes

---

### ~~CP-3.5: Infraestrutura — Metricas Server-Side + Constantes + Cleanup~~ ✅ DONE

**Status:** Done

**Entregue:**
- **Cleanup de exauridos:**
  - Criar RPC `cleanup_exhausted_queue_items(p_days_old)`:
    - Deleta items com `status='exhausted'` e `updated_at < now() - interval '{days} days'`
    - Retorna count de items removidos
  - Chamar no `activateReadyRetries` (ja roda no load da pagina)
- **Error boundaries:**
  - Criar `ProspectingErrorBoundary` wrapper
  - Envolver secoes independentes: Queue, Metrics, PowerDialer, Heatmap
  - Fallback: mensagem amigavel + botao "Tentar novamente"
- [x] RPC `get_prospecting_metrics_aggregated`
- [x] Atualizar `useProspectingMetrics` para usar RPC
- [x] `prospecting-config.ts` com constantes
- [x] Substituir magic numbers
- [x] RPC `cleanup_exhausted_queue_items`
- [x] `ProspectingErrorBoundary`
- [x] Heatmap threshold reduzido + tooltip
- [x] Testes

---

### ~~CP-3.6: Deteccao de Contatos Negligenciados + Comparativo de Performance~~ ✅ DONE

**Status:** Done

**Entregue:**
- [x] Componente `NeglectedContactsAlert`
- [x] Componente `PerformanceComparison`
- [x] Persistencia de objecoes no metadata
- [x] Widget "Top 5 objecoes"
- [x] Testes
- [x] QA gate PASS (11/11 ACs, 807 testes)

---

## Dependencias

| Story | Depende de | Tipo | Status |
|-------|-----------|------|--------|
| ~~CP-3.1~~ | ~~CP-2 (completo)~~ | ~~Done~~ | ✅ Done |
| ~~CP-3.2~~ | CP-3.1 ✅ | Agente corrigido + tools de prospeccao | ✅ Done |
| ~~CP-3.3~~ | CP-3.1 ✅ | Tools base + metricas expostas | ✅ Done |
| ~~CP-3.4~~ | — | Independente (nova tabela) | ✅ Done |
| ~~CP-3.5~~ | — | Independente (infra) | ✅ Done |
| ~~CP-3.6~~ | CP-3.5 ✅ | Constantes centralizadas disponveis | ✅ Done |

**Sequencia recomendada:**
```
CP-3.1 ✅ (done)
    ↓
Wave 1: CP-3.2 + CP-3.5 (em paralelo)
    ↓
Wave 2: CP-3.3 + CP-3.4 + CP-3.6 (em paralelo — CP-3.6 tem dependencia soft de CP-3.5)
```

**Sizing:**
| Story | T-Shirt | Justificativa |
|-------|---------|---------------|
| ~~CP-3.1~~ | — | Done |
| CP-3.2 | L | 4 temas (tool IA + lead score UI + auto-retry + note templates DB) |
| CP-3.3 | L | 4 tools novas + prompt template + integracao filas salvas |
| CP-3.4 | M | 1 migration + service + hook update + 2 componentes |
| CP-3.5 | L | RPC complexa + refactor hooks + constantes + error boundaries |
| CP-3.6 | M | 3 componentes independentes + persistencia de objecoes |

---

## Compatibilidade

- [x] APIs existentes permanecem inalteradas
- [x] Schema DB: 2 migrations novas (prospecting_sessions + RPCs de metricas/cleanup)
- [x] UI: mudancas visuais aditivas (badges de score, widgets novos) — sem breaking changes
- [x] RLS: tools e RPCs reutilizam pattern existente (org_id + is_admin_or_director)
- [x] Tools existentes nao sao modificadas (apenas estendidas)
- [x] Backwards-compatible: saved queues sem contact_ids continuam funcionando

---

## Riscos e Mitigacao

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| RPC de metricas agregadas com performance ruim em orgs grandes | Alto | Indexar activities por (organization_id, type, date); EXPLAIN ANALYZE antes de deploy |
| suggestContactsForProspecting com logica complexa no client | Medio | Mover logica de ranking para RPC se performance for problema |
| Recomendacoes de IA imprecisas com poucos dados | Medio | Exigir minimo de 50 chamadas para recomendar, mensagem "dados insuficientes" |
| Lead score simplista (7 fatores) gera sugestoes erradas | Baixo | Documentar limitacao, permitir override manual |
| Migration de prospecting_sessions em ambiente com sessoes ativas | Baixo | Deploy em horario de baixo uso; tabela nova (sem ALTER em existentes) |
| Error boundaries podem esconder bugs reais | Baixo | Logar erros capturados; mostrar "reportar problema" no fallback |

**Rollback por story:**
- CP-3.2: Reverter tools + remover badges de score (UI-only)
- CP-3.3: Remover tools (sem impacto no resto)
- CP-3.4: Drop tabela prospecting_sessions (dados nao criticos)
- CP-3.5: Reverter para client-side aggregation (RPC e aditiva)
- CP-3.6: Remover widgets (componentes independentes)

---

## Definition of Done

### CP-3.1 ✅
- [x] BASE_INSTRUCTIONS integrado com `getResolvedPrompt` (nao mais hardcoded)
- [x] Todas as 36 tools listadas no prompt do agente
- [x] 6 tools de prospeccao funcionando (queues, metrics, goals, listScripts, createScript, generateAndSave)
- [x] WHATSAPP no enum de activities
- [x] property_ref, metadata, tags/custom_fields expostos nas tools
- [x] Prompts de prospeccao no catalog
- [x] Testes cobrindo tools novas

### CP-3.2 ✅
- [x] `suggestScript` tool funcional
- [x] Lead score visivel em QueueItem, PowerDialer e FilteredContactsList
- [x] Ordenacao por score na CallQueue
- [x] Auto-retry configuravel (voicemail/busy alem de no_answer)
- [x] Note templates dinamicos (prop `customTemplates` conectado ao DB)
- [x] Testes

### CP-3.3 ✅
- [x] `listSavedQueues` tool funcional
- [x] `addContactsToQueue` tool com needsApproval
- [x] `suggestContactsForProspecting` retorna lista rankeada com motivo
- [x] `analyzeProspectingPatterns` gera insights acionaveis
- [x] Prompt `agent_prospecting_recommendations` no catalog
- [x] IA sugere carregar filas salvas quando pertinente
- [x] BASE_INSTRUCTIONS atualizado (41 tools)
- [x] Testes

### CP-3.4 ✅
- [x] Tabela `prospecting_sessions` com RLS e realtime
- [x] Sessoes persistidas automaticamente (start/end)
- [x] Historico de sessoes visivel na aba Metricas
- [x] Agendamento inteligente sugere horario baseado no heatmap
- [x] Testes

### CP-3.5 ✅
- [x] RPC `get_prospecting_metrics_aggregated` funcional
- [x] Metricas sem limite de 5000 registros
- [x] `prospecting-config.ts` com todas as constantes
- [x] Magic numbers substituidos em todos os componentes/hooks
- [x] Cleanup automatico de items exhausted >30 dias
- [x] Error boundaries em queue, metrics, dialer, heatmap
- [x] Heatmap com threshold reduzido + tooltip "dados insuficientes"
- [x] Testes

### CP-3.6 ✅
- [x] Alerta de contatos negligenciados com acao direta
- [x] Comparativo "Voce vs. Media do time" para corretores
- [x] Objecoes persistidas no metadata da activity
- [x] Widget "Top 5 objecoes" na aba Metricas
- [x] Testes
- [x] QA gate aprovado

### Transversais
- [x] Sem regressao nas tools e funcionalidades existentes
- [x] Todas as novas tabelas com RLS 100%
- [ ] Migrations testadas em staging antes de producao

---

## Handoff para Story Manager

> **Status:** Epic completo. Todas as 6 stories criadas, implementadas e aprovadas pelo QA.

---

## Validacao @po

**Revisor:** @po (Pax) | **Data:** 2026-03-09 | **Veredito:** GO (9/10)

**Primeira revisao (7.5/10 — GO condicional):**
6 issues identificados (P1-P6). Todos corrigidos pelo @pm na mesma sessao.

**Segunda revisao (9/10 — GO):**
3 pontos menores identificados (N1-N3), todos baixa severidade:
- N1: Contagem de tools corrigida (40→41)
- N2: Auto-retry storage documentado como decisao de @dev
- N3: Query `getQueue()` precisa incluir `lead_score` no join (detalhe de implementacao)

**Status: Aprovado para story detailing pelo @sm.**

---

## Progress Log

| Data | Evento |
|------|--------|
| 2026-03-06 | Epic criado pelo @pm |
| 2026-03-09 | Auditoria completa, escopo expandido (CP-3.4 a CP-3.6), validado @po (9/10 GO) |
| 2026-03-09 | CP-3.1 marcado Done (implementado em sessoes anteriores) |
| 2026-03-10 | CP-3.2, CP-3.3, CP-3.4, CP-3.5 marcados Done |
| 2026-03-10 | CP-3.6 implementado, QA PASS — marcado Done |
| 2026-03-10 | **Epic CP-3 completo** — 6/6 stories Done |
