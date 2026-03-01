# Technical Debt Assessment - FINAL

**Projeto:** ZmobCRM-Brownfield (CRMIA)
**Data:** 2026-02-23
**Versao:** 1.0
**Fase:** Brownfield Discovery - Phase 8
**Agente:** @architect (Aria)
**Status:** FINAL - Aprovado pelo QA Gate (Phase 7)

**Fontes consolidadas:**
- Phase 4: `docs/prd/technical-debt-DRAFT.md` (@architect)
- Phase 5: `docs/reviews/db-specialist-review.md` (@data-engineer)
- Phase 6: `docs/reviews/ux-specialist-review.md` (Brad Frost, Design System Architect)
- Phase 7: `docs/reviews/qa-review.md` (@qa - REDO)

---

## Sumario Executivo

| Metrica | Valor |
|---|---|
| **Total de debitos identificados** | **69** |
| Criticos (P0) | 14 |
| Altos (P1) | 18 |
| Medios (P2) | 24 |
| Baixos (P3) | 8 |
| Nao mexer | 5 (DB-016, DB-020 + 3 subcontados) |
| **Esforco total estimado** | **707-1.129 horas** |
| Prazo estimado (1 dev) | ~18-28 sprints de 2 semanas |
| Riscos cruzados identificados | 8 |
| Gaps para investigacao futura | 8 |
| Testes requeridos | 27 |

**Resumo de risco:** O ZmobCRM possui **21 tabelas com RLS `USING(true)`**, permitindo acesso irrestrito entre usuarios em um sistema multi-tenant de CRM imobiliario. Combinado com um admin client (service role) usado nas AI tools que bypassa RLS completamente, e funcoes SECURITY DEFINER sem validacao de autorizacao, o sistema esta exposto a vazamento de dados cross-tenant, violacao de LGPD e manipulacao de deals. No frontend, a taxa de adocao de design tokens e **0.47%**, com 557 botoes ad-hoc, 2.762 cores hardcoded e 184 ocorrencias de tokens CSS inexistentes.

---

## Inventario Completo de Debitos

### Sistema (validado por @architect)

| ID | Debito | Severidade | Horas | Prioridade | Sprint |
|---|---|---|---|---|---|
| TD-001 | `strict: false` no tsconfig.json -- apenas `strictNullChecks` habilitado | CRITICO | 40-80 | P0 | 3 |
| TD-002 | `@faker-js/faker` em dependencies (3MB+ no bundle de producao) | CRITICO | 1 | P0 | 1 |
| TD-003 | Admin client (service role) bypassa RLS em todas as AI tools | CRITICO | 24-40 | P0 | 2 |
| TD-004 | Cobertura de testes ~7% (~29 arquivos de teste para ~404 de codigo) | CRITICO | 120-200 | P0 | Continuo |
| TD-005 | Duplicacao de estado: Context API + Zustand simultaneamente | ALTO | 40-60 | P1 | 3-4 |
| TD-006 | Paginas protegidas todas client components (`'use client'` no layout) | ALTO | 24-40 | P1 | 4 |
| TD-007 | Nenhum Server Action utilizado (tudo via Route Handlers) | ALTO | 16-32 | P1 | 4 |
| TD-008 | `lib/ai/tools.ts` com 1.648 linhas de SQL inline | ALTO | 32-48 | P1 | 3 |
| TD-009 | Cockpit v2 coexiste com v1 (DealCockpitClient: 2.525 linhas) | **CRITICO** (elevado por Brad) | 40-60 | P0 | 3-4 |
| TD-010 | API keys de AI em texto plano em `organization_settings` | ALTO | 16-24 | P1 | 2 |
| TD-011 | Provider nesting profundo (7+ providers no layout) | MEDIO | 8-16 | P2 | 4 |
| TD-012 | Endpoint `/api/chat` e re-export de `/api/ai/chat` | MEDIO | 1-2 | P2 | Backlog |
| TD-013 | `as any` extensivo em tools.ts, contextos, route handlers | MEDIO | 16-24 | P2 | 3+ |
| TD-014 | Labs com mocks acessiveis em routes protegidas | MEDIO | 2-4 | P2 | Backlog |
| TD-015 | Import de React no final do arquivo em `lib/stores/index.ts:371` | MEDIO | 1 | P2 | Backlog |
| TD-016 | Tipo `pg` como dependencia possivelmente orfao | MEDIO | 1-2 | P2 | Backlog |
| TD-017 | Sem rate limiting na API publica `/api/public/v1/` | MEDIO | 8-16 | P2 | Backlog |
| TD-018 | Ausencia de monitoring/Sentry (DSN no .env.example mas sem integracao) | MEDIO | 8-16 | P2 | Backlog |
| TD-019 | Zod v4 (risco de breaking changes vs v3) | MEDIO | 4-8 | P2 | Backlog |
| TD-020 | eslint-config-next 16.0.8 enquanto Next.js e 15.5.12 | MEDIO | 1-2 | P2 | Backlog |
| TD-021 | `tsconfig 2.tsbuildinfo` duplicado na raiz | BAIXO | 0.5 | P3 | Backlog |
| TD-022 | `.DS_Store` commitado em `context/` | BAIXO | 0.5 | P3 | Backlog |
| TD-023 | Tailwind config JS duplicado com CSS @theme (Tailwind v4) | **MEDIO** (elevado por Brad) | 2-4 | P2 | 1 |

### Database (validado por @data-engineer)

| ID | Debito | Severidade | Horas | Prioridade | Sprint |
|---|---|---|---|---|---|
| DB-001 | RLS permissiva em `audit_logs` -- `FOR ALL USING (true)` | CRITICO | 4 | P0 | 1 |
| DB-002 | RLS permissiva em `security_alerts` | CRITICO | 4 | P0 | 1 |
| DB-003 | RLS permissiva em `user_consents` -- violacao LGPD direta | CRITICO | 4 | P0 | 1 |
| DB-004 | RLS permissiva em `ai_conversations` | CRITICO | 3 | P0 | 1 |
| DB-005 | RLS permissiva em `ai_decisions`/`ai_audio_notes` (2 tabelas) | CRITICO | 5 | P0 | 1 |
| DB-006 | RLS permissiva em `leads` -- ativos de alto valor em CRM imobiliario | CRITICO | 4 | P0 | 1 |
| DB-007 | Funcoes SECURITY DEFINER sem auth (`mark_deal_won/lost`, `reopen_deal`) | **CRITICO** (elevado por @data-engineer) | 4 | P0 | 1 |
| DB-008 | Falta indice composto `profiles(organization_id, role)` -- PRE-REQUISITO | ALTO | 1 | **P0** (pre-req) | 1 |
| DB-009 | Falta indices `owner_id` e `organization_id` em multiplas tabelas | ALTO | 3 | P1 | 1 |
| DB-010 | RLS permissiva em ~12 tabelas restantes (boards, activities, deal_notes, etc.) | ALTO | 20 | P1 | 2 |
| DB-011 | API keys em texto plano no banco (user_settings, organization_settings) | **ALTO** (elevado por @data-engineer) | 16 | P1 | 2 |
| DB-012 | Campos TEXT sem CHECK constraints (probability, value, price, email) | MEDIO | 6 | P2 | 3+ |
| DB-013 | Sem archiving para audit_logs/webhook_events | MEDIO | 12 | P2 | 3+ |
| DB-014 | Colunas duplicadas em profiles (`avatar` vs `avatar_url`, `name` vs `first_name`+`last_name`) | MEDIO | 6 | P2 | 3+ |
| DB-015 | `contacts.stage` sem FK para `lifecycle_stages` | MEDIO | 4 | P2 | 3+ |
| DB-016 | Migration monolitica (~2.250 linhas) | **BAIXO** (reduzido) | 0 | P3 | NAO MEXER |
| DB-017 | Trigger `notify_deal_stage_changed` nao filtrado por coluna | MEDIO | 1 | P2 | 3+ |
| DB-018 | Storage policies permissivas em `deal-files` | **ALTO** (elevado) | 6 | P1 | 2 |
| DB-019 | `deals.status` ambiguo com `is_won`/`is_lost` -- usado na IA, NAO pode remover | MEDIO | 4 | P2 | 3+ |
| DB-020 | Seed data misturado com DDL | **BAIXO** (reduzido) | 0 | P3 | NAO MEXER |
| DB-021 | `get_dashboard_stats()` versao original sem filtro de org -- vazamento cross-tenant | **CRITICO** (novo) | 2 | P0 | 1 |
| DB-022 | `get_contact_stage_counts()` SECURITY DEFINER sem filtro de org | **ALTO** (novo) | 2 | P1 | 2 |
| DB-023 | `log_audit_event()` SECURITY DEFINER sem validacao de org -- falsificacao de logs | **ALTO** (novo) | 3 | P1 | 2 |
| DB-024 | `handle_new_user()` aceita role via metadata -- escalacao de privilegios | **MEDIO** (novo, elevado para Sprint 1 por QA) | 2 | **P0** | 1 |
| DB-025 | Falta indice composto com org em `deal_notes`/`deal_files` | MEDIO (novo) | 1 | P2 | 3+ |
| DB-026 | `check_deal_duplicate` SECURITY DEFINER desnecessario | BAIXO (novo) | 1 | P3 | Backlog |
| DB-027 | `organizations` RLS permite qualquer autenticado criar org (`WITH CHECK (true)`) | MEDIO (novo) | 2 | P2 | 3+ |

### Frontend/Design System (validado por Brad Frost)

| ID | Debito | Severidade | Horas | Prioridade | Sprint |
|---|---|---|---|---|---|
| FE-001 | Componentes duplicados V1/V2 -- 4 pares, 1.356 linhas, V2 com 0 importacoes | **CRITICO** (elevado por Brad) | 16-24 | P0 | 1 |
| FE-002 | CRMContext monolitico -- 922 linhas, ~180 props, 98 importacoes | **CRITICO** (elevado por Brad) | 60-80 | P0 | 3-4 |
| FE-003 | Dois sistemas de notificacao (Toast: 51 refs, NotifStore: 10 refs) | **ALTO** (elevado) | 10-14 | P1 | 1 |
| FE-004 | Tokens shadcn orfaos -- 184 ocorrencias de 16 tokens inexistentes em 69 arquivos | **ALTO** (elevado) | 6-10 | P1 | 1 |
| FE-005 | Debug logging excessivo (fetch para 127.0.0.1:7242) | MEDIO | 3-4 | P2 | 1 |
| FE-006 | AI Panel nao responsivo (w-96 fixa, sem alternativa mobile) | **ALTO** (elevado) | 16-24 | P1 | 3 |
| FE-007 | Ausencia de Error Boundaries -- 0 (zero) no codebase | **ALTO** (elevado) | 10-16 | P1 | 1 |
| FE-008 | Design system ausente -- taxa de adocao de tokens: 0.47% | **ALTO** (elevado de BAIXO) | 24-40 | P1 | 3-4 |
| FE-009 | Hydration flash mobile (`useState(1024)`) | **MEDIO** (elevado) | 4-6 | P2 | Backlog |
| FE-010 | PWA incompleto (instalacao basica, sem cache/sync/push) | BAIXO | 16-24 | P3 | Backlog |
| FE-011 | Componente Button morto -- 0 importacoes, 557 `<button>` raw ad-hoc | **ALTO** (novo, Brad) | 24-40 | P1 | 2 |
| FE-012 | Card/Badge com tokens inexistentes (`bg-card`, `text-muted-foreground`) | **ALTO** (novo, Brad) | 4-8 | P1 | 1 |
| FE-013 | 14 variacoes de border-radius sem padrao | MEDIO (novo, Brad) | 8-16 | P2 | 3 |
| FE-014 | DealCockpitClient monolitico -- 2.525 linhas, intestavel | **CRITICO** (novo, Brad) | 40-60 | P0 | 3-4 |
| FE-015 | Font weight inconsistente -- 7 variacoes, semibold vs bold 50/50 | BAIXO (novo, Brad) | 8-12 | P3 | Backlog |
| FE-016 | Ausencia de Skeleton Loading -- apenas spinner generico | MEDIO (novo, Brad) | 12-16 | P2 | 3 |
| FE-017 | Kanban DnD sem acessibilidade (sem teclado, sem ARIA) | MEDIO (novo, Brad) | 16-24 | P2 | Backlog |
| FE-018 | Ausencia de `next/image` -- `<img>` sem otimizacao | MEDIO (novo, Brad) | 4-8 | P2 | Backlog |
| FE-019 | Empty states inconsistentes -- apenas 3 features com tratamento | BAIXO (novo, Brad) | 8-12 | P3 | Backlog |

---

## Riscos Cruzados (do QA Review)

| ID | Risco | Areas | Severidade | Mitigacao |
|---|---|---|---|---|
| RC-01 | Admin client (TD-003) + RLS permissiva (DB-001..006) = exposicao total. Admin client CONTINUARA bypassando RLS mesmo apos correcao. | DB, Sistema, IA | CRITICO | TD-003 deve ser corrigido em paralelo ou logo apos Sprint 1 de DB. NAO adiar. |
| RC-02 | CRMContext (FE-002) + Client Components (TD-006) = cascata de re-renders sem SSR. 98 componentes re-renderizam a cada mudanca. | Frontend, Sistema | CRITICO | Atacar ambos na mesma sprint (3-4). |
| RC-03 | Funcoes SECURITY DEFINER (DB-007) + AI tools SQL inline (TD-008) = manipulacao via IA. Prompt injection -> tool call -> DEFINER -> bypass RLS. | DB, Sistema, IA | CRITICO | DB-007 (Sprint 1) + TD-008 (Sprint 3) -- DEFINER e prioridade. |
| RC-04 | Tokens orfaos (FE-004) + Error Boundaries ausentes (FE-007) = falha silenciosa de UI. 184 ocorrencias de tokens inexistentes + 0 ErrorBoundary = crash total. | Frontend | ALTO | Definir 16 tokens shadcn (2-4h) + ErrorBoundary global na Sprint 1. |
| RC-05 | API keys texto plano (TD-010 + DB-011) + Storage permissivo (DB-018) = cadeia de exfiltracao. Atacante le keys -> usa servicos IA -> acessa arquivos. | DB, Sistema | ALTO | DB-011 e DB-018 juntos na Sprint 2. |
| RC-06 | Role injection (DB-024) + RLS baseada em role = escalacao total de privilegios. Signup com role 'admin' invalida TODA seguranca RBAC. | DB, Sistema | ALTO | DB-024 ELEVADO para Sprint 1 (condicao do QA). |
| RC-07 | Tokens inexistentes (FE-004/FE-012) + RLS permissiva (DB-001..006) = dados errados exibidos com estilo errado. Usuario ve dados que nao deveria, sem hierarquia visual. | DB, Frontend | ALTO | Correcao de RLS + definicao dos 16 tokens no mesmo ciclo (Sprint 1). |
| RC-08 | Button morto (FE-011) + 557 buttons ad-hoc + ~7% testes = regressao visual silenciosa. Qualquer mudanca no tema pode quebrar dezenas de botoes sem deteccao. | Frontend, Sistema | MEDIO | Phase 4 de Brad (ESLint + CI token coverage) como prevencao permanente. |

---

## Matriz de Priorizacao Final

Todos os 69 debitos ordenados por prioridade, incorporando ajustes dos tres especialistas e condicoes do QA.

### P0 - CRITICO (Fazer Imediatamente) -- 14 debitos

| # | ID | Debito | Area | Horas | Sprint |
|---|---|---|---|---|---|
| 1 | DB-008 | Indice `profiles(organization_id, role)` -- PRE-REQUISITO | DB | 1 | 1 |
| 2 | DB-024 | `handle_new_user()` role injection -- invalida RBAC | DB | 2 | 1 |
| 3 | DB-001 | RLS permissiva `audit_logs` | DB | 4 | 1 |
| 4 | DB-002 | RLS permissiva `security_alerts` | DB | 4 | 1 |
| 5 | DB-003 | RLS permissiva `user_consents` (LGPD) | DB | 4 | 1 |
| 6 | DB-004 | RLS permissiva `ai_conversations` | DB | 3 | 1 |
| 7 | DB-005 | RLS permissiva `ai_decisions`/`ai_audio_notes` | DB | 5 | 1 |
| 8 | DB-006 | RLS permissiva `leads` | DB | 4 | 1 |
| 9 | DB-007 | Funcoes SECURITY DEFINER sem auth | DB | 4 | 1 |
| 10 | DB-021 | `get_dashboard_stats()` sem filtro org | DB | 2 | 1 |
| 11 | TD-002 | faker.js em dependencies | Sistema | 1 | 1 |
| 12 | TD-003 | Admin client bypassa RLS | Sistema | 24-40 | 2 |
| 13 | TD-004 | Cobertura de testes ~7% | Sistema | 120-200 | Continuo |
| 14 | TD-001 | `strict: false` no tsconfig | Sistema | 40-80 | 3 |

**Nota:** FE-001 (V1/V2 duplicados), FE-002 (CRMContext), FE-014 (Cockpit monolitico) e TD-009 (Cockpit v1/v2) foram elevados a CRITICO pelos especialistas, mas estao alocados nas Sprints 1-4 conforme capacidade e dependencias.

### P1 - ALTO (Proximas 2-4 Sprints) -- 18 debitos

| # | ID | Debito | Area | Horas | Sprint |
|---|---|---|---|---|---|
| 1 | DB-009 | Indices `owner_id`/`organization_id` | DB | 3 | 1 |
| 2 | DB-010 | RLS ~12 tabelas restantes | DB | 20 | 2 |
| 3 | DB-011 | API keys texto plano -> vault Supabase | DB | 16 | 2 |
| 4 | DB-018 | Storage policies permissivas `deal-files` | DB | 6 | 2 |
| 5 | DB-022 | `get_contact_stage_counts()` sem filtro org | DB | 2 | 2 |
| 6 | DB-023 | `log_audit_event()` sem validacao org | DB | 3 | 2 |
| 7 | TD-005 | Duplicacao Context + Zustand | Sistema | 40-60 | 3-4 |
| 8 | TD-006 | Client components no layout protegido | Sistema | 24-40 | 4 |
| 9 | TD-007 | Nenhum Server Action | Sistema | 16-32 | 4 |
| 10 | TD-008 | tools.ts 1.648 linhas SQL inline | Sistema | 32-48 | 3 |
| 11 | TD-010 | API keys AI texto plano (app level) | Sistema | 16-24 | 2 |
| 12 | FE-001 | Componentes V1/V2 duplicados (deletar V2) | Frontend | 16-24 | 1 |
| 13 | FE-003 | Dois sistemas de notificacao | Frontend | 10-14 | 1 |
| 14 | FE-004 | Tokens shadcn orfaos (16 tokens, 184 refs) | Frontend | 6-10 | 1 |
| 15 | FE-006 | AI Panel nao responsivo | Frontend | 16-24 | 3 |
| 16 | FE-007 | Zero Error Boundaries | Frontend | 10-16 | 1 |
| 17 | FE-008 | Design system ausente (0.47% adocao) | Frontend | 24-40 | 3-4 |
| 18 | FE-011 | Button morto + 557 ad-hoc | Frontend | 24-40 | 2 |

### P2 - MEDIO (Backlog Priorizado) -- 24 debitos

| # | ID | Debito | Area | Horas |
|---|---|---|---|---|
| 1 | DB-012 | CHECK constraints em campos numericos | DB | 6 |
| 2 | DB-013 | Archiving audit_logs/webhook_events | DB | 12 |
| 3 | DB-014 | Colunas duplicadas profiles | DB | 6 |
| 4 | DB-015 | contacts.stage sem FK lifecycle_stages | DB | 4 |
| 5 | DB-017 | Trigger notify nao filtrado | DB | 1 |
| 6 | DB-019 | deals.status ambiguo | DB | 4 |
| 7 | DB-025 | Indices compostos deal_notes/deal_files | DB | 1 |
| 8 | DB-027 | organizations permite INSERT irrestrito | DB | 2 |
| 9 | TD-011 | Provider nesting profundo | Sistema | 8-16 |
| 10 | TD-012 | /api/chat re-export | Sistema | 1-2 |
| 11 | TD-013 | `as any` extensivos | Sistema | 16-24 |
| 12 | TD-014 | Labs com mocks em producao | Sistema | 2-4 |
| 13 | TD-015 | Import React no final do arquivo | Sistema | 1 |
| 14 | TD-016 | `pg` dependencia orfao | Sistema | 1-2 |
| 15 | TD-017 | Sem rate limiting API publica | Sistema | 8-16 |
| 16 | TD-018 | Sem monitoring/Sentry | Sistema | 8-16 |
| 17 | TD-019 | Zod v4 risco | Sistema | 4-8 |
| 18 | TD-020 | eslint-config-next divergente | Sistema | 1-2 |
| 19 | TD-023 | Tailwind config JS duplicado com @theme | Sistema | 2-4 |
| 20 | FE-005 | Debug logging excessivo | Frontend | 3-4 |
| 21 | FE-009 | Hydration flash mobile | Frontend | 4-6 |
| 22 | FE-013 | 14 variacoes de border-radius | Frontend | 8-16 |
| 23 | FE-016 | Ausencia de Skeleton loading | Frontend | 12-16 |
| 24 | FE-017 | Kanban DnD sem acessibilidade | Frontend | 16-24 |

### P3 - BAIXO (Quando Oportuno) -- 8 debitos

| # | ID | Debito | Area | Horas |
|---|---|---|---|---|
| 1 | TD-021 | tsconfig buildinfo duplicado | Sistema | 0.5 |
| 2 | TD-022 | .DS_Store commitado | Sistema | 0.5 |
| 3 | DB-026 | check_deal_duplicate DEFINER desnecessario | DB | 1 |
| 4 | FE-010 | PWA incompleto | Frontend | 16-24 |
| 5 | FE-012 | Card/Badge tokens inexistentes | Frontend | 4-8 |
| 6 | FE-015 | Font weight inconsistente (7 variacoes) | Frontend | 8-12 |
| 7 | FE-018 | Ausencia de next/image | Frontend | 4-8 |
| 8 | FE-019 | Empty states inconsistentes | Frontend | 8-12 |

### NAO MEXER

| ID | Debito | Justificativa |
|---|---|---|
| DB-016 | Migration monolitica (~2.250 linhas) | Ja aplicada. Refatorar nao agrega valor. Novas migrations seguem boas praticas. |
| DB-020 | Seed data misturado com DDL | Ja aplicado. Para novos seeds, usar migrations separadas. |

---

## Plano de Resolucao por Sprints

### Sprint 1 -- Seguranca Critica + Foundation FE (Semana 1-2)

**Objetivo:** Eliminar vetores criticos de seguranca. Estabelecer foundation do design system.

#### Database (~33h)

| Ordem | ID(s) | Acao | Horas | Dependencia |
|---|---|---|---|---|
| 1 | DB-008 | Criar indice `profiles(organization_id, role)` + funcao helper `is_admin_or_director()` | 1h | Nenhuma |
| 2 | DB-009 | Criar indices `owner_id` e `organization_id` em deals, contacts, activities, leads, audit_logs, ai_* | 3h | Nenhuma |
| 3 | DB-024 | Corrigir `handle_new_user()` -- forcar role 'corretor' sempre (condicao QA) | 2h | Nenhuma |
| 4 | DB-001, DB-002, DB-003 | RLS restritiva para audit_logs (admin read-only), security_alerts (admin), user_consents (user own + admin read) | 6h | DB-008 |
| 5 | DB-004, DB-005 | RLS user-based para ai_conversations, ai_decisions, ai_audio_notes | 6h | DB-008 |
| 6 | DB-006 | RLS owner-based para leads (padrao deals/contacts) | 4h | DB-008, DB-009 |
| 7 | DB-007 | Migrar `mark_deal_won/lost`, `reopen_deal` para SECURITY INVOKER | 4h | Nenhuma |
| 8 | DB-021 | DROP da versao antiga de `get_dashboard_stats()` sem parametro | 2h | Nenhuma |

**Nota de implementacao (recomendacao @data-engineer):**
- Agrupar migrations por dominio (seguranca, IA, leads) -- NAO uma migration unica.
- Usar funcao helper `is_admin_or_director(p_org_id)` (STABLE, SECURITY DEFINER) para evitar subqueries repetidas por row.
- Padrao RLS hierarquico: admin = CRUD na org, diretor = READ org + CRUD proprios, corretor = CRUD proprios.

#### Sistema (~2h)

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | TD-002 | Mover `@faker-js/faker` para devDependencies | 1h |
| 2 | TD-023 | Remover duplicacao tailwind.config.js vs globals.css @theme | 2-4h |

#### Frontend (~28-44h) -- Phase 1 de Brad (Foundation)

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | FE-004 | Definir 16 tokens semanticos shadcn em globals.css (desbloqueia 6 componentes) | 2-4h |
| 2 | FE-012 | Migrar Card, Badge, Tabs, Alert, Popover para tokens validos | 4-8h |
| 3 | FE-001 | Deletar codigo morto V2/Focus (-1.356 linhas) | 2-4h |
| 4 | FE-007 | Adicionar ErrorBoundary global + por feature (6 pages) | 10-16h |
| 5 | FE-003 | Criar adapter Toast -> NotificationStore | 4-8h |
| 6 | FE-005 | Remover debug logging | 3-4h |

**Total Sprint 1: ~63-79h**

### Sprint 2 -- Seguranca Alta + Admin Client (Semana 3-4)

**Objetivo:** Completar seguranca de DB. Corrigir admin client. Iniciar Button unificado.

#### Database (~48h)

| Ordem | ID(s) | Acao | Horas |
|---|---|---|---|
| 1 | DB-010 | RLS para boards, board_stages, activities, deal_notes, deal_files, products, deal_items, tags, custom_field_definitions, system_notifications, lifecycle_stages (~12 tabelas) | 20h |
| 2 | DB-018 | Storage policies restritivas para deal-files (via deal ownership) | 6h |
| 3 | DB-011 | Migrar API keys para vault do Supabase (3 etapas: criar secrets, criar RPC, migrar codigo) | 16h |
| 4 | DB-022 | Corrigir `get_contact_stage_counts()` com filtro de org | 2h |
| 5 | DB-023 | Corrigir `log_audit_event()` com validacao de org via auth.uid() | 3h |

#### Sistema (~40-64h)

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | TD-003 | Refatorar admin client -- AI tools usam Supabase client com RLS, nao service role | 24-40h |
| 2 | TD-010 | Criptografia API keys em nivel de aplicacao (complementar a DB-011) | 16-24h |

#### Frontend (~24-40h) -- Inicio Phase 2 de Brad

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | FE-011 | Criar Button unificado + iniciar migracao dos 557 `<button>` raw | 24-40h |

**Total Sprint 2: ~112-152h**

### Sprint 3 -- Design System + Performance + Refatoracao (Semana 5-6)

**Objetivo:** Decompor monolitos. Iniciar migracao CRMContext. TypeScript strict.

#### Sistema (~72-128h)

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | TD-008 | Refatorar tools.ts (1.648 linhas) em modulos isolados | 32-48h |
| 2 | TD-001 | Habilitar strict mode incremental no tsconfig | 40-80h |

#### Frontend (~68-104h) -- Phase 2 de Brad (continuacao)

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | FE-014/TD-009 | Decomposicao DealCockpitClient (2.525 linhas -> 6-8 sub-componentes) + deletar FocusClient | 40-60h |
| 2 | FE-002 | Iniciar migracao CRMContext (features menores: decisions, profile, reports) | 16-24h |
| 3 | FE-016 | Criar Skeleton loading + implementar nas 4 telas principais | 12-16h |

**Total Sprint 3: ~140-232h**

### Sprint 4 -- Qualidade + Polish (Semana 7-8)

#### Sistema (~56-132h)

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | TD-005 | Consolidar estado Context -> Zustand (complementar a FE-002) | 40-60h |
| 2 | TD-006 | Migrar layout protegido para permitir SSR/streaming | 24-40h |
| 3 | TD-007 | Introduzir Server Actions nos formularios principais | 16-32h |

#### Frontend (~32-48h) -- Phase 2 de Brad (conclusao)

| Ordem | ID | Acao | Horas |
|---|---|---|---|
| 1 | FE-002 | Completar migracao CRMContext (features maiores: boards, contacts, deals) | 32-48h |

**Total Sprint 4: ~88-180h**

### Backlog (Sprint 5+)

#### Database (~37h)

| ID(s) | Acao | Horas |
|---|---|---|
| DB-012 | CHECK constraints em campos numericos e status | 6h |
| DB-013 | pg_cron + archiving (particao por data para audit_logs) | 12h |
| DB-014 | Consolidar colunas duplicadas profiles | 6h |
| DB-015 | FK contacts.stage -> lifecycle_stages.id | 4h |
| DB-017 | Otimizar trigger notify_deal_stage_changed (`AFTER UPDATE OF stage_id`) | 1h |
| DB-019 | Documentar/migrar deals.status (5 refs ativas no codigo IA) | 4h |
| DB-025 | Indices compostos com org para deal_notes/deal_files | 1h |
| DB-027 | Restringir INSERT em organizations | 2h |
| DB-026 | Converter check_deal_duplicate para INVOKER | 1h |

#### Sistema (~58-110h)

| ID(s) | Acao | Horas |
|---|---|---|
| TD-011 | Reduzir provider nesting | 8-16h |
| TD-012 | Remover /api/chat re-export | 1-2h |
| TD-013 | Eliminar `as any` (depende de TD-001 strict mode) | 16-24h |
| TD-014 | Remover labs/mocks de producao | 2-4h |
| TD-015..TD-016 | Limpar imports e dependencias orfaos | 2-4h |
| TD-017 | Rate limiting na API publica | 8-16h |
| TD-018 | Integrar Sentry/monitoring | 8-16h |
| TD-019..TD-020 | Atualizar Zod/eslint-config-next | 5-10h |
| TD-021..TD-022 | Limpar artefatos (.tsbuildinfo, .DS_Store) | 1h |

#### Frontend -- Phase 3+4 de Brad (~164-268h)

| ID(s) | Acao | Horas |
|---|---|---|
| FE-008 | Migrar 2.234 refs slate-* para tokens semanticos | 40-60h |
| FE-008 | Migrar 528 refs cores utility para success/error/warning | 24-32h |
| FE-008 | Eliminar 117 hex hardcoded em .tsx | 8-16h |
| FE-006 | AI Panel responsivo (FullscreenSheet mobile, Sheet tablet) | 16-24h |
| FE-009 | Corrigir hydration flash mobile | 4-6h |
| FE-013 | Padronizar border-radius (14 -> 4 variacoes) | 8-16h |
| FE-015 | Padronizar font-weight (7 -> 3) | 8-12h |
| FE-017 | Kanban DnD acessibilidade (teclado + ARIA) | 16-24h |
| FE-018 | Migrar `<img>` para `next/image` | 4-8h |
| FE-019 | Empty states consistentes | 8-12h |
| FE-010 | PWA completo (cache, sync, push) | 16-24h |
| -- | ESLint: proibir `<button>` raw e cores diretas | 8-16h |
| -- | Stylelint: proibir hex hardcoded | 2-4h |
| -- | Storybook para primitivos | 24-40h |
| -- | CI check: token coverage report | 4-8h |

---

## Dependencias entre Debitos

### Cadeia 1: Seguranca de Banco (Bloqueante)

```
DB-008 (indice profiles org/role) ──PRE-REQUISITO──> Todas as novas politicas RLS
  ├── DB-001..DB-006 (RLS P0)
  ├── DB-010 (RLS restantes)
  └── DB-007 (DEFINER -> INVOKER)

DB-024 (role injection) ──INVALIDA──> Todas as politicas RLS baseadas em role
  ** DEVE ser corrigido antes ou junto com DB-001..006 **

DB-009 (indices owner_id/org_id) ──PERFORMANCE──> DB-006, DB-010
```

### Cadeia 2: Admin Client + AI Tools

```
TD-003 (admin client bypassa RLS)
  └── TD-008 (refatorar tools.ts) ── para isolar queries
  └── DB-007 (DEFINER -> INVOKER) ── alternativa ao admin client
  ** RC-01: corrigir RLS SEM corrigir TD-003 = falsa sensacao de seguranca **
```

### Cadeia 3: Estado e Performance

```
TD-005 (duplicacao Context + Zustand)
  ├── FE-002 (CRMContext monolitico) ── MESMO PROBLEMA, resolver juntos
  ├── FE-003 (dois sistemas notificacao) ── CONSEQUENCIA da duplicacao
  └── TD-006 (client components) ── RELACIONADO (server state vs client state)
```

### Cadeia 4: Design System

```
FE-004 (definir 16 tokens shadcn) ──DESBLOQUEIA──> Button, Card, Badge, Tabs, Alert, Popover
  └── FE-011 (Button unificado) ──PRECEDE──> migracao 557 <button> raw
  └── FE-012 (Card/Badge corrigidos)
  └── TD-023 (Tailwind config unico) ── 1 fonte de verdade

FE-001 (deletar V2/Focus) ──PRECEDE──> FE-014 (decomposicao DealCockpit)
```

### Cadeia 5: TypeScript Strict

```
TD-001 (strict: false)
  └── TD-013 (any casts) ── BLOQUEADO por strict mode
  └── TD-004 (testes) ── testes ajudam na migracao strict
```

### Cadeia 6: Observabilidade

```
TD-018 (sem monitoring/Sentry)
  └── FE-007 (sem Error Boundaries) ── COMPLEMENTAR
  └── FE-005 (debug logging) ── SUBSTITUIR por telemetria real
```

---

## Criterios de Sucesso

### Baseline (capturar ANTES de qualquer intervencao)

| Metrica | Como Medir | Valor Atual |
|---|---|---|
| Cobertura de testes | `npm test -- --coverage` | ~7% |
| Bundle size (producao) | `next build` output | Registrar |
| Contagem de `as any` | Grep no codebase | Registrar |
| Tabelas com RLS `USING(true)` | Query no schema | 21 |
| Funcoes SECURITY DEFINER sem auth | Auditoria | 6+ |
| Token coverage (design system) | `var(--color-*)` vs hardcoded | **0.47%** |
| Botoes `<button>` ad-hoc | Grep `<button` | **557** |
| Cores hardcoded total | slate + utility + hex | **3.407** |
| Tokens shadcn inexistentes | Grep tokens referenciados | **184 em 69 arquivos** |
| Componentes primitivos funcionais | Auditoria | **47% (8/17)** |
| Codigo morto V1/V2 | Grep | **1.356 linhas** |

### Metas Pos-Resolucao

| Metrica | Meta 3 meses (P0) | Meta 6 meses (P1) | Meta 12 meses (P2) |
|---|---|---|---|
| Cobertura de testes | >= 30% | >= 50% | >= 70% |
| Tabelas RLS permissiva | 0 | 0 | 0 |
| Funcoes DEFINER sem auth | 0 | 0 | 0 |
| Token coverage | >= 30% | >= 70% | >= 95% |
| Botoes ad-hoc | < 300 | < 50 | 0 |
| Cores hardcoded | < 2.000 | < 500 | < 50 |
| Tokens inexistentes | 0 | 0 | 0 |
| Primitivos funcionais | 100% | 100% | 100% |
| Codigo morto V1/V2 | 0 | 0 | 0 |
| Error Boundaries | 1 global + 6 features | Componentes criticos | Cobertura completa |
| Lighthouse Performance (mobile) | >= 60 | >= 75 | >= 85 |

---

## Testes Requeridos

### Seguranca de Banco (T-01 a T-08) -- Sprint 1-2

| # | Teste | Prioridade |
|---|---|---|
| T-01 | **Testes de RLS por role:** Para CADA tabela com nova politica, testar com `admin`, `diretor` e `corretor` -- SELECT, INSERT, UPDATE, DELETE | P0 |
| T-02 | **Isolamento cross-tenant:** 2 organizacoes, verificar que org A NAO ve dados de org B em NENHUMA tabela | P0 |
| T-03 | **Performance pos-indice:** `EXPLAIN ANALYZE` nas 5 queries mais frequentes ANTES e DEPOIS dos indices | P0 |
| T-04 | **Funcoes SECURITY INVOKER:** Verificar que `mark_deal_won/lost`, `reopen_deal` respeitam RLS apos migracao | P0 |
| T-05 | **Role injection:** Signup com `raw_user_meta_data: {role: 'admin'}`, verificar que role = 'corretor' | P0 |
| T-06 | **get_dashboard_stats() sem parametro:** Deve retornar erro "function does not exist" | P0 |
| T-07 | **Storage policies:** Verificar que usuario de org A nao acessa deal-files de org B | P1 |
| T-08 | **log_audit_event:** Verificar que usuario nao consegue injetar log para outra organizacao | P1 |

### Design System e Frontend (T-09 a T-17) -- Sprint 1-3

| # | Teste | Prioridade |
|---|---|---|
| T-09 | **Regressao visual tokens shadcn:** Apos definir os 16 tokens, verificar renderizacao de TODOS os variantes de Button (6), Badge (5), Card em light e dark mode | P0 |
| T-10 | **Token coverage report:** Contar ocorrencias de cores hardcoded (baseline: 3.407). Deve diminuir a cada sprint | P1 |
| T-11 | **Error Boundaries:** Forcar erro de runtime em cada feature page -- verificar fallback (nao tela branca) | P1 |
| T-12 | **Responsividade AI Panel:** Testar em viewports 375px, 768px, 1440px | P2 |
| T-13 | **Hydration flash:** Verificar ausencia de layout shift em mobile no primeiro load | P2 |
| T-14 | **Notificacao unificada:** Todas as acoes de feedback usam mesmo sistema, mesma duracao/posicao | P2 |
| T-15 | **Skeleton loading:** Telas principais mostram skeleton em vez de spinner | P2 |
| T-16 | **Kanban acessibilidade:** Navegacao por teclado, anuncios ARIA para movimentacao de cards | P2 |
| T-17 | **Codigo morto removido:** Verificar que V2/Focus nao existem mais no codebase | P1 |

### Sistema (T-18 a T-22) -- Sprint 2-3

| # | Teste | Prioridade |
|---|---|---|
| T-18 | **Build com strict mode:** `tsc --strict --noEmit` completa sem erros | P1 |
| T-19 | **Bundle size:** Verificar que faker.js removido do bundle (comparar antes/depois) | P0 |
| T-20 | **Admin client refatorado:** AI tools usam Supabase client com RLS, nao service role | P0 |
| T-21 | **Regressao E2E:** Fluxo criar lead -> converter deal -> mover kanban -> marcar ganho, em 3 roles | P1 |
| T-22 | **CRMContext re-renders:** Apos migracao parcial, verificar que mudanca em hook X nao causa re-render em componentes de hook Y | P1 |

### Design System Especificos -- Brad Frost (T-23 a T-27) -- Sprint 1+

| # | Teste | Prioridade |
|---|---|---|
| T-23 | **Fonte de verdade unica:** Apos remover duplicacao tailwind.config.js vs @theme, verificar que build nao quebra e estilos sao identicos | P1 |
| T-24 | **Button unificado:** Verificar todas 24 combinacoes (6 variants x 4 sizes) em light/dark | P1 |
| T-25 | **Border radius consistencia:** Apos padronizacao (14 -> 4), verificar Cards, Modais, Botoes, Inputs | P2 |
| T-26 | **ESLint enforcement:** `<button>` raw e cores hardcoded geram erro de lint | P2 |
| T-27 | **Storybook primitivos:** Todos os atomos funcionais tem story com docs, props e exemplos | P3 |

---

## Gaps para Investigacao Futura

Identificados pelo QA Review -- nao bloqueiam a resolucao dos debitos atuais, mas devem ser investigados.

| ID | Gap | Severidade | Descricao |
|---|---|---|---|
| GAP-1 | Autenticacao e sessao | ALTO | Fluxo Supabase Auth, refresh tokens, session hijacking, invalidacao ao remover usuario da org |
| GAP-2 | API publica | ALTO | Endpoints `/api/public/v1/` -- validacao de input, autenticacao, superficie de ataque |
| GAP-3 | Dependencias de terceiros | MEDIO | `npm audit` para CVEs, especialmente Zod v4 |
| GAP-4 | CORS e CSP | MEDIO | Configuracao para integracao com AI providers e webhooks |
| GAP-5 | Backup e Recovery | MEDIO | Estrategia de backup, disaster recovery, RPO/RTO |
| GAP-6 | Testes de RLS existentes | BAIXO | Validar que politicas RLS atuais de deals/contacts sao realmente seguras |
| GAP-7 | Webhooks e integracao | MEDIO | Validacao de assinatura, replay attacks, idempotencia |
| GAP-8 | Impacto de performance do design system | MEDIO | Re-paints por fallbacks, CLS dos tokens quebrados, experiencia real no primeiro load |

---

## Resumo por Area

| Area | Total | Criticos | Altos | Medios | Baixos | Horas Est. |
|---|---|---|---|---|---|---|
| Sistema (@architect) | 23 | 4 | 6 | 10 | 3 | ~300-550h |
| Database (@data-engineer) | 27 | 7 | 5 | 8 | 2 (+5 nao mexer) | ~111h |
| Frontend (Brad Frost) | 19 | 3 | 7 | 6 | 3 | ~296-468h |
| **TOTAL** | **69** | **14** | **18** | **24** | **8** (+5) | **~707-1.129h** |

---

*Documento FINAL gerado por @architect (Aria) - Brownfield Discovery Phase 8*
*Consolidando inputs de: @data-engineer (Dara), Brad Frost (Design System Architect), @qa*
*Synkra AIOS v2.2.0*
*Status: FINAL - Aprovado para Phase 9 (@analyst - Executive Report) e Phase 10 (@pm - Epics/Stories)*
