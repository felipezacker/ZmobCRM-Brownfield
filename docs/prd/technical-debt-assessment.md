# Technical Debt Assessment - FINAL

**Projeto:** ZmobCRM
**Data:** 2026-03-03
**Versao:** 1.0 (Final)
**Versao do Projeto:** 1.4.3
**Status:** APPROVED by QA Gate

**Fontes consolidadas:**
- `docs/architecture/system-architecture.md` (Phase 1 - @architect)
- `supabase/docs/SCHEMA.md` + `supabase/docs/DB-AUDIT.md` (Phase 2 - @data-engineer)
- `docs/frontend/frontend-spec.md` (Phase 3 - @ux-design-expert)
- `docs/prd/technical-debt-DRAFT.md` (Phase 4 - @architect)
- `docs/reviews/db-specialist-review.md` (Phase 5 - @data-engineer)
- `docs/reviews/ux-specialist-review.md` (Phase 6 - @ux-design-expert)
- `docs/reviews/qa-review.md` (Phase 7 - @qa)

---

## Executive Summary

- Total de debitos catalogados: **81** (original DRAFT: 71, apos revisoes: +10 novos, -2 reclassificados como nao-debitos = 79 ativos + 2 informacionais)
- **Criticos: 7** | **Altos: 22** | **Medios: 33** | **Baixos: 17** | **Informacionais: 2**
- Esforco total estimado: **~550-750 horas**
- Areas: Sistema (20), Database (35 incluindo 5 novos), Frontend/UX (24 incluindo 5 novos), Cross-Cutting (6)
- Gaps identificados pelo QA: 6 (requerem auditoria futura)
- Riscos cruzados mapeados: 7 (com mitigacoes)

**Top 5 riscos imediatos (FINAL, pos-revisao):**
1. `notify_deal_stage_changed()` referencia tabelas e campos inexistentes -- webhooks outbound completamente quebrados (TD-DB-001 + TD-DB-NEW-001)
2. `merge_contacts()` SECURITY DEFINER permite cross-tenant manipulation (TD-DB-003)
3. Admin client (service role) bypassa RLS para AI tools -- vazamento cross-tenant (TD-SYS-001)
4. CRMContext monolito causa re-renders em cascata em toda a aplicacao (TD-CC-001)
5. AI API keys armazenadas em texto plano no banco (TD-SYS-002)

**Mudancas significativas vs DRAFT:**
- TD-DB-002 (deals FK sem ON DELETE) rebaixado de CRITICAL para MEDIUM (soft delete mitiga)
- TD-UX-002 (componentes gigantes) rebaixado de CRITICAL para HIGH (impacto indireto no usuario)
- TD-DB-009 (LTV RPCs sem org check) elevado de MEDIUM para HIGH (cross-tenant financeiro)
- TD-UX-010 (cores Tailwind diretas) elevado de MEDIUM para HIGH (2.475 ocorrencias em 137 arquivos)
- TD-SYS-012 (loading states) elevado de MEDIUM para HIGH (14+ paginas sem loading)
- i18n (TD-UX-004 / TD-CC-003) rebaixado de HIGH para MEDIUM (sem demanda de mercado atual)
- 10 debitos novos descobertos pelos especialistas (5 DB + 5 UX)
- Esforco DB revisado de ~74-116h para ~57-81h (reclassificacao e priorizacao)
- Esforco UX revisado de ~200-330h para ~290-410h (5 novos debitos + escopo real maior)

---

## 1. Inventario Completo de Debitos

### 1.1 Sistema (validado por @architect)

#### 1.1.1 CRITICO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-SYS-001 | **Admin client (service role) bypassa RLS para AI tools.** `createStaticAdminClient()` usa service role key sem filtro adicional de tenant. Qualquer bug nas AI tools pode vazar dados entre organizacoes. | CRITICAL | 16-24 | P1 | Correlato com TD-CC-006 e TD-SYS-002. QA BS-03: AI tools com service role podem executar queries nao auditadas. |
| TD-SYS-002 | **AI API keys armazenadas como texto plano no banco.** Chaves de OpenAI, Google, Anthropic em `organization_settings` sem criptografia. | CRITICAL | 8-12 | P1 | Correlato com TD-CC-006. |
| TD-SYS-003 | **Debug logging com endpoint externo em producao.** `CRMContext.tsx` contem ~150 linhas de fetch para `http://127.0.0.1:7242/ingest/...` com UUID hardcoded. | CRITICAL | 2-4 | P1 | Bloqueado por TD-CC-001 (debug logging esta DENTRO do CRMContext). Pode ser extraido independentemente como primeiro passo. |

#### 1.1.2 ALTO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-SYS-004 | **Cobertura de testes baixa (11.6%).** 51 arquivos de teste para 438 fontes. Zero testes em: features/, contexts/, API routes, AI agent, middleware de auth. | HIGH | 80-120 | P2 | QA RC-01: cobertura insuficiente para decomposicao segura do CRMContext. |
| TD-SYS-005 | **Todas as paginas protegidas sao client components.** Layout `(protected)/layout.tsx` usa `<Providers>` que e `'use client'`. | HIGH | 24-40 | P3 | Depende de TD-CC-001 (CRMContext split) e TD-SYS-014 (provider nesting). |
| TD-SYS-006 | **Nenhum error.tsx em route segments.** Erros em features propagam ate o topo. | HIGH | 8-12 | P2 | UX review confirmou impacto direto: erro derruba pagina inteira. |
| TD-SYS-007 | **Nenhum not-found.tsx.** Pagina 404 default do Next.js. | HIGH | 3-4 | P2 | UX review: horas ajustadas de 4-6 para 3-4. |
| TD-SYS-008 | **ESLint rules criticas desabilitadas.** `no-explicit-any: off`, `no-unused-vars: off`, `exhaustive-deps: off`. | HIGH | 16-24 | P2 | |
| TD-SYS-012 | **Loading states apenas em 4 paginas.** 14+ paginas protegidas sem `loading.tsx` = tela branca. | **HIGH** (elevado de MEDIUM) | 8-12 | P2 | UX review elevou: impacto direto na percepcao de qualidade pelo usuario. |

#### 1.1.3 MEDIO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-SYS-009 | Endpoint /api/chat e re-export vazio. | MEDIUM | 1 | P3 | |
| TD-SYS-010 | Labs com mocks acessiveis em producao sem feature flag. | MEDIUM | 4-8 | P3 | |
| TD-SYS-011 | `useRealtimeSync.ts` monolitico (27KB). | MEDIUM | 12-16 | P3 | |
| TD-SYS-013 | Supabase client pode retornar null sem mensagem. | MEDIUM | 2-4 | P3 | |
| TD-SYS-014 | Provider nesting profundo (10 niveis). | MEDIUM | 8-16 | P3 | Bloqueio para TD-SYS-005 (SSR). |
| TD-SYS-015 | Installer endpoint complexo (13 routes). | MEDIUM | 4-8 | P4 | |
| TD-SYS-016 | `pg` em dependencies de producao desnecessario. | MEDIUM | 2-4 | P4 | |

#### 1.1.4 BAIXO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-SYS-017 | Tailwind config JS com Tailwind v4. | LOW | 2-4 | P4 | |
| TD-SYS-018 | .DS_Store commitados. | LOW | 1 | P4 | |
| TD-SYS-019 | ErrorBoundary em localizacao nao-padrao. | LOW | 2 | P4 | Depende de TD-UX-001 (Button unificacao). |
| TD-SYS-020 | Hardcoded avatar URLs (`pravatar.cc`). | LOW | 2 | P4 | Risco: servico externo indisponivel = avatares quebrados. |

**Total Sistema: 20 debitos** (3 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW)

---

### 1.2 Database (validado por @data-engineer)

Todas as severidades refletem os ajustes do @data-engineer, validados pelo @qa.

#### 1.2.1 CRITICO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-DB-001 | **`notify_deal_stage_changed()` referencia tabelas inexistentes (`integration_webhook_events` / `integration_webhook_deliveries`).** Correto: `webhook_events_out` / `webhook_deliveries`. Webhooks outbound completamente quebrados. | CRITICAL | 6-8 | P1 | Resolver junto com TD-DB-008 (causa raiz) e TD-DB-NEW-001 (campos incompativeis). Restaurar funcao original do schema_init com filtros de org_id. |
| TD-DB-003 | **`merge_contacts()` SECURITY DEFINER sem validacao de org.** Cross-tenant data manipulation. | CRITICAL | 4-6 | P1 | Incluir FOR UPDATE para serializar acessos concorrentes. Resolver junto com TD-DB-NEW-003. |

#### 1.2.2 ALTO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-DB-004 | `ai_suggestion_interactions` RLS permissiva (`USING(true)`). Qualquer usuario ve interacoes de todos. | HIGH | 2-3 | P2 | |
| TD-DB-006 | N+1 deals -> contacts no kanban. FK sem eager loading. | HIGH | 4-6 | P2 | Schema suporta `select=*,contacts(*)` mas frontend nao usa. Fix primariamente frontend. |
| TD-DB-008 | Naming inconsistente webhook tables vs funcoes. | HIGH | 0 | P1 | Causa raiz de TD-DB-001. Horas = 0 (contabilizado em TD-DB-001). Resolvido automaticamente. |
| TD-DB-009 | **`increment/decrement_contact_ltv()` SECURITY DEFINER sem validacao de org.** Cross-tenant LTV manipulation. Impacto financeiro direto. | **HIGH** (elevado de MEDIUM) | 3-4 | P1 | Mesma classe de vulnerabilidade que TD-DB-003. |
| TD-DB-NEW-001 | **`notify_deal_stage_changed()` tem schema de colunas INCOMPATIVEL.** Funcao reescrita tenta inserir colunas que nao existem nas tabelas reais e ignora colunas obrigatorias (`deal_id`, `from_stage_id`, `to_stage_id`). | CRITICAL (agravamento de TD-DB-001) | 0 | P1 | Horas contabilizadas em TD-DB-001. Impacto: correcao NAO e apenas trocar nomes de tabelas -- requer rewrite dos INSERTs. |

**Nota:** TD-DB-NEW-001 e classificado aqui como ALTO por ser agravamento ja contabilizado em TD-DB-001 (CRITICAL). A severidade real combinada e CRITICAL.

#### 1.2.3 MEDIO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-DB-002 | **deals.board_id / deals.stage_id FK sem ON DELETE action.** | **MEDIUM** (rebaixado de CRITICAL) | 2-3 | P3 | @data-engineer: soft delete torna hard delete excepcional. ON DELETE SET NULL recomendado. |
| TD-DB-005 | Duplicidade `system_notifications` vs `notifications`. | **MEDIUM** (rebaixado de HIGH) | 10-14 | P3 | Schemas diferentes, propositos parcialmente distintos. Nao e bloqueio operacional. |
| TD-DB-007 | Migrations nao idempotentes. | **MEDIUM** (rebaixado de HIGH) | 0 | P4 | @data-engineer: aplicar padrao apenas em novas migrations. Supabase marca como aplicada. |
| TD-DB-010 | RLS de `contact_phones` e `contact_preferences` usa subquery direta. | MEDIUM | 6-10 | P3 | Escopo SUBESTIMADO -- ver TD-DB-NEW-002 para escopo real. |
| TD-DB-011 | `notifications` sem DELETE policy. | **LOW** (rebaixado de MEDIUM) | 1 | P4 | Possivelmente intencional (audit trail). |
| TD-DB-012 | Index ausente `deals(contact_id, board_id)`. | MEDIUM | 1 | P2 | CREATE INDEX CONCURRENTLY recomendado. |
| TD-DB-013 | Index ausente `activities(organization_id, date DESC)`. | MEDIUM | 1 | P2 | |
| TD-DB-014 | Index ausente `deals(organization_id, is_won, is_lost)`. | MEDIUM | 1 | P2 | |
| TD-DB-015 | N+1 deals -> board_stages. | MEDIUM | 2-3 | P3 | Mesma solucao que TD-DB-006 (eager loading via PostgREST). |
| TD-DB-016 | `deals.contact_id` FK sem ON DELETE action. | MEDIUM | 2 | P3 | Mitigado por soft delete pattern. Resolver junto com TD-DB-002. |
| TD-DB-017 | `activities.organization_id` nullable. | MEDIUM | 3-4 | P3 | Migration fez backfill mas coluna continua nullable. |
| TD-DB-018 | `contacts.organization_id` nullable. | MEDIUM | 3-4 | P3 | Sem NOT NULL no schema_init. |
| TD-DB-019 | `deals.status` e `deals.stage_id` coexistem. | MEDIUM | 4-6 | P3 | Status DEPRECATED. Requer auditoria de consumers. |
| TD-DB-020 | `profiles.name` e `profiles.first_name` coexistem. | MEDIUM | 4-6 | P3 | Trigger escreve apenas `first_name` mas queries antigas leem `name`. |
| TD-DB-024 | `boards.organization_id` nullable. | **MEDIUM** (elevado de LOW) | 2-3 | P3 | RLS pode ter comportamento inesperado em JOINs. Backfill necessario. |
| TD-DB-030 | Webhook secrets em texto claro. | **MEDIUM** (elevado de LOW) | 6-8 | P3 | Secrets dao acesso a sistemas externos se DB comprometido. Requer pgcrypto ou Supabase Vault. |
| TD-DB-NEW-002 | **Subquery direta em RLS afeta ~13 tabelas (~40 policies)**, nao apenas 2 como no DRAFT. Tabelas: contact_phones, contact_preferences, notifications, lead_score_history, deal_notes, deal_files, ai_feature_flags, ai_prompt_templates, integration_inbound_sources, integration_outbound_endpoints, webhook_events_in/out, webhook_deliveries. | MEDIUM | 8-12 | P3 | Funciona hoje mas qualquer mudanca em profiles RLS pode quebrar ~40 policies simultaneamente. |
| TD-DB-NEW-003 | **`merge_contacts()` usa EXECUTE com SQL dinamico em SECURITY DEFINER.** Allowlist + format escaping protegem, mas merece rewrite sem EXECUTE. | MEDIUM | 0 | P1 | Horas incluidas em TD-DB-003. Resolver junto. |

#### 1.2.4 BAIXO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-DB-011 | `notifications` sem DELETE policy. | LOW | 1 | P4 | Rebaixado de MEDIUM. |
| TD-DB-021 | VARCHAR vs TEXT inconsistente em `security_alerts`. | **LOW** (rebaixado de MEDIUM) | 1 | P4 | Puramente cosmetico. |
| TD-DB-022 | `notifications` sem schema qualifier. | **LOW** (rebaixado de MEDIUM) | 0.5 | P4 | Cosmetico. |
| TD-DB-023 | `rate_limits` RLS permissiva. | LOW | 1 | P4 | Dados nao sensiveis. |
| TD-DB-025 | `products.price` sem CHECK (>= 0). | LOW | 0.5 | P4 | |
| TD-DB-026 | `profiles.avatar` e `profiles.avatar_url` coexistem. | LOW | 2 | P4 | Colunas deprecated. |
| TD-DB-029 | Index ausente `contacts(org_id, name)`. | LOW | 1 | P4 | GIN trigram ja existe para busca fuzzy. |

#### 1.2.5 INFORMACIONAL (nao requerem acao)

| ID | Debito | Status | Notas |
|----|--------|--------|-------|
| TD-DB-027 | `contacts.tags` como TEXT[] em vez de FK para tabela `tags`. | NAO E DEBITO | Design intencional para CRM. Normalizar adicionaria complexidade sem beneficio. |
| TD-DB-028 | `quick_scripts` naming inconsistente. | NAO E DEBITO | Cosmetico. Custo de migracao >> beneficio. NAO renomear. |

**Total Database: 35 debitos catalogados** (2 CRITICAL, 5 HIGH, 18 MEDIUM, 7 LOW, 2 informacionais, 1 movido para LOW -- TD-DB-011 listado em MEDIO como LOW)

**Nota de contagem:** TD-DB-008, TD-DB-NEW-001 e TD-DB-NEW-003 tem horas = 0 porque sao resolvidos junto com seus debitos pais. TD-DB-007 tem horas = 0 porque a decisao e apenas aplicar padrao em novas migrations.

---

### 1.3 Frontend/UX (validado por @ux-design-expert)

Todas as severidades refletem os ajustes do @ux-design-expert, validados pelo @qa.

#### 1.3.1 CRITICO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-UX-001 | **Duplicacao de Button component.** 111 arquivos importam `app/components/ui/Button.tsx`, apenas 2 importam `components/ui/button.tsx`. Merge simples: adicionar variant `unstyled` ao principal. | CRITICAL | 3-4 | P1 | Desbloqueia TD-UX-016 e TD-SYS-019. Plano: add unstyled, grep/replace 111 imports, deletar copia. |

#### 1.3.2 ALTO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-UX-002 | **Componentes gigantes.** FocusContextPanel 109KB, DealDetailModal 87KB, BoardCreationWizard 75KB, WebhooksSection 55KB, ContactsImportExportModal 51KB, CockpitDataPanel 48KB. | **HIGH** (rebaixado de CRITICAL) | 40-60 | P3 | Impacto indireto no usuario (manutenibilidade, bundle). FocusContextPanel decomponivel em 7 sub-componentes. |
| TD-UX-003 | **Skeletons quase inexistentes.** Apenas 4 loading.tsx com spinner generico. Nenhum skeleton content-aware. | HIGH | 20-28 | P2 | Abordagem hibrida: building blocks reutilizaveis + composicao por feature. |
| TD-UX-005 | **Controller hooks gigantes.** useBoardsController 37KB, useContactsController 30KB, useInboxController 28KB, useActivitiesController 19KB. | HIGH | 24-32 | P3 | Decompor por responsabilidade (queries/mutations/UI) + por sub-feature. Max 200 linhas/hook. |
| TD-UX-008 | **Chart colors hex hardcoded.** `#64748b`, `#0f172a`, `#f8fafc` em globals.css. Charts sao elementos centrais do dashboard. | HIGH | 3-4 | P2 | |
| TD-UX-010 | **Cores Tailwind pre-v4 misturadas.** **2.475 ocorrencias** de `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*` em **137 arquivos .tsx**. | **HIGH** (elevado de MEDIUM) | 12-16 | P3 | Mapeamento de migracao definido pelo UX specialist. Requer TD-UX-019 (testes visuais) como pre-requisito. |
| TD-UX-020 | **Overlay background inconsistente em modais.** 6 padroes diferentes de overlay em 27 arquivos (31 ocorrencias). `MODAL_OVERLAY_CLASS` de `modalStyles.ts` nao e adotado. | HIGH (novo) | 4-6 | P2 | Padrao correto: `bg-background/60`. Apenas `Modal.tsx` generico consome. |

#### 1.3.3 MEDIO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-UX-004 | Nenhum sistema de i18n. 400+ strings hardcoded em portugues. | **MEDIUM** (rebaixado de HIGH) | 40-60 | P5 | Sem demanda de mercado atual. Reavaliar em 6 meses. Biblioteca recomendada: `next-intl`. |
| TD-UX-006 | Mistura de import paths. | **MEDIUM** (rebaixado de HIGH) | 4-6 | P3 | Impacto zero para usuario final. DX only. |
| TD-UX-007 | Scrollbar hex hardcoded. | **MEDIUM** (rebaixado de HIGH) | 2-3 | P3 | Scrollbars sao detalhe periferico. Dark mode ja tem valores separados. |
| TD-UX-011 | PageLoader com cores hardcoded. | MEDIUM | 0.5 | P3 | Correcao trivial. |
| TD-UX-012 | ConfirmModal nao usa `modalStyles.ts`. | MEDIUM | 2-3 | P3 | Usa `bg-slate-900/60` hardcoded vs `bg-background/60`. |
| TD-UX-013 | Optimistic updates limitados. Apenas deal moves. | MEDIUM | 12-16 | P3 | Bloqueado parcialmente por TD-CC-001. |
| TD-UX-014 | ErrorBoundary usa inline styles. | MEDIUM | 1 | P4 | |
| TD-UX-015 | GlobalError sem design system. HTML puro. | MEDIUM | 2-3 | P3 | Nota: global-error renderiza fora do app layout. Solucao requer inline CSS com variaveis. |
| TD-UX-019 | Nenhum teste e2e/visual. | **MEDIUM** (elevado de LOW) | 16-24 | P3 | Critico como PRE-REQUISITO para migracao de tokens (TD-UX-010). |
| TD-UX-021 | **z-index arbitrario sem escala.** `z-[9999]` em 24 arquivos, `z-[10000]` em TemplatePickerModal para "ganhar". Sem escala definida. | MEDIUM (novo) | 3-4 | P4 | |
| TD-UX-022 | **Ausencia de PageLayout component reutilizavel.** Cada pagina implementa seu proprio wrapper com padroes variados. | MEDIUM (novo) | 8-12 | P3 | |
| TD-UX-023 | **Feedback visual inconsistente em acoes destrutivas.** Modais de confirmacao para exclusao usam padroes visuais diferentes. | MEDIUM (novo) | 3-4 | P3 | |

#### 1.3.4 BAIXO

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| TD-UX-009 | Font serif (`Cinzel`) definida mas nao utilizada. | **LOW** (rebaixado de MEDIUM) | 0.5 | P4 | Se nao importada via next/font, impacto zero. |
| TD-UX-016 | SubmitButton duplicado em FormField.tsx. | LOW | 2-3 | P4 | Depende de TD-UX-001. |
| TD-UX-017 | Prefetch incompleto. | LOW | 4-6 | P4 | Otimizacao incremental. |
| TD-UX-018 | Ambient background glow hardcoded. | LOW | 1 | P4 | Efeito decorativo. |
| TD-UX-024 | **Ausencia de empty states padronizados por feature.** EmptyState.tsx existe mas adocao e parcial. | LOW (novo) | 4-6 | P4 | |

**Total Frontend/UX: 24 debitos** (1 CRITICAL, 6 HIGH, 12 MEDIUM, 5 LOW)

---

### 1.4 Cross-Cutting (multi-area)

#### 1.4.1 CRITICO

| ID | Debito | Severidade | Horas | Prioridade | Fontes | Notas |
|----|--------|-----------|-------|------------|--------|-------|
| TD-CC-001 | **CRMContext monolito (33KB/930 linhas).** Agrega 5 sub-contextos, logica de negocio, debug logging, views denormalizadas. Re-render cascata. | CRITICAL | 24-40 | P1 | sys-arch + frontend-spec | Bloqueia: TD-CC-002, TD-CC-004, TD-SYS-003, TD-UX-013. QA: requer cobertura de testes ANTES de decomposicao. |

#### 1.4.2 ALTO

| ID | Debito | Severidade | Horas | Prioridade | Fontes | Notas |
|----|--------|-----------|-------|------------|--------|-------|
| TD-CC-002 | Duplicacao de estado: Context API + Zustand. | HIGH | 16-24 | P3 | sys-arch + frontend-spec | Bloqueado por TD-CC-001. |
| TD-CC-003 | Nenhum sistema de i18n (impacto fullstack). | **MEDIUM** (rebaixado de HIGH) | 40-60 | P5 | sys-arch + frontend-spec | Sem demanda atual. Mesma decisao que TD-UX-004. |
| TD-CC-004 | BoardCreationWizard.tsx monolito (75KB) com dependencia de contextos. | HIGH | 16-24 | P3 | sys-arch + frontend-spec | Bloqueado por TD-CC-001. Decomponivel por steps. |
| TD-CC-005 | N+1 kanban: DB schema + frontend implementation. | HIGH | 8-16 | P2 | db-audit + sys-arch | Schema suporta eager loading. Fix primariamente frontend. |
| TD-CC-006 | API keys em texto plano (DB + Application layer). | HIGH | 12-20 | P1 | sys-arch + db-audit | Requer migration + refatoracao de servicos. |

**Total Cross-Cutting: 6 debitos** (1 CRITICAL, 4 HIGH, 1 MEDIUM)

**Nota:** TD-CC-003 foi rebaixado para MEDIUM por ambos os especialistas. Mapeado como P5 (adiado com justificativa).

---

### 1.5 Gaps Identificados pelo QA (auditoria futura)

Estes gaps NAO sao debitos resolvidos. Sao areas nao cobertas pelo assessment que requerem analise futura.

| ID | Gap | Area | Severidade do Gap | Acao Recomendada |
|----|-----|------|-------------------|------------------|
| GAP-01 | **API Routes nao auditadas.** 69 API routes incluindo 13 de installer e API publica v1. Nenhum debito sobre seguranca, validacao de input, error handling. | Sistema / Seguranca | MEDIUM | Auditar rate limiting, input validation, error handling na API publica v1. |
| GAP-02 | **AI Agent nao auditado.** `lib/ai/crmAgent.ts` (24KB) com 25+ tools, service role, `AI_TOOL_APPROVAL_BYPASS`. TD-SYS-001 cobre admin client mas nao tools individuais. | Sistema / Seguranca | MEDIUM | Auditar quais AI tools bypassam approval e executam write operations (delete, merge, update). |
| GAP-03 | **Middleware de auth sem auditoria.** Ausencia de CSP headers, CORS config, rate limiting no middleware level. | Sistema / Seguranca | LOW | Avaliar se merece debito dedicado no proximo ciclo. |
| GAP-04 | **Server Actions sem cobertura.** `app/actions/` contem actions para contacts, deals, notifications. Sem auditoria de seguranca. | Sistema / Seguranca | LOW | Server Actions herdam auth do middleware. Verificar validacao de input. |
| GAP-05 | **Dependency audit ausente.** ~50+ dependencias em producao. Nenhuma analise de vulnerabilidades (npm audit). | Sistema / Seguranca | LOW | Executar `npm audit` e incluir como apendice. |
| GAP-06 | **Supabase Edge Functions nao analisadas.** Diretorio `supabase/functions/` existe mas nao foi mencionado em nenhum documento. | DB / Sistema | LOW | Verificar conteudo. Se vazio, documentar. |

---

## 2. Contagem Final Consolidada

| Area | CRITICAL | HIGH | MEDIUM | LOW | Informacional | Total |
|------|----------|------|--------|-----|---------------|-------|
| Sistema | 3 | 6 | 7 | 4 | 0 | 20 |
| Database | 2 | 5 | 18 | 7 | 2 | 34 |
| Frontend/UX | 1 | 6 | 12 | 5 | 0 | 24 |
| Cross-Cutting | 1 | 4 | 1 | 0 | 0 | 6 |
| **Total** | **7** | **21** | **38** | **16** | **2** | **84** |

**Nota de contagem:** 84 total catalogado. Destes, 2 sao informacionais (nao requerem acao), e 3 debitos (TD-DB-008, TD-DB-NEW-001, TD-DB-NEW-003) tem horas = 0 porque sao resolvidos junto com seus pais. Total de debitos que requerem trabalho ativo: 79.

**Comparativo DRAFT -> FINAL:**

| Metrica | DRAFT | FINAL | Delta |
|---------|-------|-------|-------|
| Total catalogado | 71 | 84 | +13 |
| Debitos ativos | 71 | 79 | +8 |
| CRITICAL | 9 | 7 | -2 (reclassificacoes) |
| HIGH | 20 | 21 | +1 |
| MEDIUM | 27 | 38 | +11 |
| LOW | 15 | 16 | +1 |
| Horas estimadas | 490-610 | 550-750 | +60-140 |

---

## 3. Matriz de Priorizacao Final

**Legenda:**
- P1 = Fazer agora (CRITICAL ou HIGH seguranca)
- P2 = Proximo sprint (HIGH restantes + quick wins)
- P3 = Backlog (MEDIUM + decomposicoes grandes)
- P4 = Opcional (LOW + cosmeticos)
- P5 = Adiado com justificativa

### P1 -- Seguranca + Funcionalidade Quebrada (fazer AGORA)

| ID | Debito | Severidade | Horas | Area | Dependencias |
|----|--------|-----------|-------|------|-------------|
| TD-DB-001 | notify_deal_stage_changed() tabelas + campos | CRITICAL | 6-8 | DB | +TD-DB-008 +TD-DB-NEW-001 |
| TD-DB-003 | merge_contacts() DEFINER sem org check | CRITICAL | 4-6 | DB | +TD-DB-NEW-003 |
| TD-DB-009 | increment/decrement_contact_ltv() sem org check | HIGH | 3-4 | DB | Nenhuma |
| TD-SYS-003 | Debug logging com endpoint externo | CRITICAL | 2-4 | Sistema | Dentro do CRMContext mas extraivel |
| TD-SYS-001 | Admin client bypassa RLS para AI tools | CRITICAL | 16-24 | Sistema | Correlato TD-CC-006, TD-SYS-002 |
| TD-SYS-002 | AI API keys em texto plano | CRITICAL | 8-12 | Sistema | Correlato TD-CC-006 |
| TD-CC-001 | CRMContext monolito | CRITICAL | 24-40 | Cross-Cut | Requer testes pre-decomposicao |
| TD-CC-006 | API keys texto plano (DB+App) | HIGH | 12-20 | Cross-Cut | Migration + refatoracao |
| TD-UX-001 | Button unificacao | CRITICAL | 3-4 | UX | Desbloqueia TD-UX-016, TD-SYS-019 |

**Total P1: ~79-122h**

### P2 -- Qualidade + Performance (proximo sprint)

| ID | Debito | Severidade | Horas | Area | Dependencias |
|----|--------|-----------|-------|------|-------------|
| TD-DB-004 | ai_suggestion_interactions RLS | HIGH | 2-3 | DB | Nenhuma |
| TD-DB-012+013+014 | 3 indexes compostos | MEDIUM | 3 | DB | Nenhuma |
| TD-DB-006 | N+1 deals -> contacts | HIGH | 4-6 | DB | Coord. frontend |
| TD-CC-005 | N+1 kanban (DB + frontend) | HIGH | 8-16 | Cross-Cut | Inclui TD-DB-006 |
| TD-SYS-006 | error.tsx por segmento | HIGH | 8-12 | Sistema | Nenhuma |
| TD-SYS-007 | not-found.tsx | HIGH | 3-4 | Sistema | Nenhuma |
| TD-SYS-012 | loading.tsx faltando (14+ paginas) | HIGH | 8-12 | Sistema | Nenhuma |
| TD-UX-003 | Skeletons content-aware | HIGH | 20-28 | UX | Nenhuma |
| TD-UX-008 | Chart colors hardcoded | HIGH | 3-4 | UX | Nenhuma |
| TD-UX-020 | Overlay background inconsistente | HIGH | 4-6 | UX | Nenhuma |
| TD-SYS-008 | ESLint rules desabilitadas | HIGH | 16-24 | Sistema | Nenhuma |

**Total P2: ~80-118h**

### P3 -- Backlog Prioritizado

| ID | Debito | Severidade | Horas | Area |
|----|--------|-----------|-------|------|
| TD-CC-002 | Duplicacao Context + Zustand | HIGH | 16-24 | Cross-Cut |
| TD-CC-004 | BoardCreationWizard monolito | HIGH | 16-24 | Cross-Cut |
| TD-UX-002 | Componentes gigantes | HIGH | 40-60 | UX |
| TD-UX-005 | Controller hooks gigantes | HIGH | 24-32 | UX |
| TD-UX-010 | Cores Tailwind diretas (2.475 ocorrencias) | HIGH | 12-16 | UX |
| TD-UX-019 | Testes e2e/visuais | MEDIUM | 16-24 | UX |
| TD-SYS-004 | Cobertura testes 11.6% | HIGH | 80-120 | Sistema |
| TD-SYS-005 | Paginas client-only (SSR) | HIGH | 24-40 | Sistema |
| TD-DB-017+018+024 | NOT NULL em org_id (3 tabelas) | MEDIUM | 8-11 | DB |
| TD-DB-002+016 | ON DELETE SET NULL em FKs | MEDIUM | 4-5 | DB |
| TD-DB-NEW-002 | ~40 policies subquery -> function | MEDIUM | 8-12 | DB |
| TD-DB-030 | Webhook secrets criptografia | MEDIUM | 6-8 | DB |
| TD-DB-005 | Unificar system_notifications | MEDIUM | 10-14 | DB |
| TD-DB-019+020+026 | Colunas deprecated | MEDIUM | 10-14 | DB |
| + 15 debitos MEDIUM de Sistema, UX, DB | MEDIUM | ~40-60 | Varios |

**Total P3: ~315-464h**

### P4 -- Opcional

Todos os debitos LOW (16 itens) + debitos MEDIUM de baixo impacto.
**Total P4: ~40-60h**

### P5 -- Adiado com justificativa

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| TD-UX-004 | i18n frontend | 40-60 | Sem demanda de mercado. Reavaliar em 6 meses. |
| TD-CC-003 | i18n fullstack | (contabilizado acima) | Idem. |

---

## 4. Plano de Resolucao

### Sprint 1: Security Critical + Quick Wins (Semana 1-2)

**Objetivo:** Eliminar todas as vulnerabilidades cross-tenant e funcionalidade quebrada.

| ID | Debito | Horas | Risco | Testes Requeridos |
|----|--------|-------|-------|-------------------|
| TD-DB-001 +008 +NEW-001 | Fix `notify_deal_stage_changed()` (nomes + campos + org filter) | 6-8 | Medio: campos podem nao corresponder. Usar funcao original do schema_init. | Deal move em staging, verificar INSERT em webhook_events_out |
| TD-DB-003 +NEW-003 | Fix `merge_contacts()` (org validation + FOR UPDATE + cleanup EXECUTE) | 4-6 | Medio: race condition. Adicionar FOR UPDATE. | Cross-org merge attempt deve ser DENIED |
| TD-DB-009 | Fix `increment/decrement_contact_ltv()` (org validation) | 3-4 | Baixo. | Cross-org LTV manipulation must fail |
| TD-DB-004 | Restringir RLS de `ai_suggestion_interactions` | 2-3 | Baixo. | User can only see own interactions |
| TD-SYS-003 | Remover debug logging | 2-4 | Baixo. Extrair de CRMContext. | Verify no fetch to 127.0.0.1 in bundle |
| TD-SYS-001 | Admin client: adicionar filtro de tenant | 16-24 | Alto: pode quebrar AI tools. Testar TODOS os tools. | Multi-tenant isolation test |
| TD-SYS-002 +CC-006 | Criptografar API keys (DB migration + app refactor) | 12-20 | Medio: requer migration coordenada. | Keys nao aparecem em responses/logs/bundle |
| TD-UX-001 | Unificar Button component | 3-4 | Medio: 111 arquivos. Grep/replace mecanico. | Lint + typecheck + amostragem visual |

**Total Sprint 1: ~49-73h**

### Sprint 2: Error Handling + Performance (Semana 2-4)

**Objetivo:** Melhorar UX percebida e robustez de erros.

| ID | Debito | Horas | Risco | Testes Requeridos |
|----|--------|-------|-------|-------------------|
| TD-SYS-006 | Adicionar error.tsx por route segment | 8-12 | Baixo. | Simular erro em cada feature, verificar error boundary |
| TD-SYS-007 | Adicionar not-found.tsx | 3-4 | Nenhum. | Acessar rota invalida |
| TD-SYS-012 | Adicionar loading.tsx em 14+ paginas | 8-12 | Baixo. | Verificar skeleton durante loading |
| TD-UX-003 | Criar skeletons content-aware | 20-28 | Baixo. | Comparacao visual pre/pos |
| TD-UX-020 | Padronizar overlay de modais | 4-6 | Baixo. | Verificar 27 arquivos |
| TD-UX-008 | Migrar chart colors para tokens | 3-4 | Baixo. | Charts em light + dark mode |
| TD-DB-012+013+014 | 3 indexes compostos | 3 | Nenhum. CREATE INDEX CONCURRENTLY. | Query performance comparison |
| TD-CC-005 +DB-006 | Fix N+1 kanban (eager loading) | 8-16 | Baixo: mudanca frontend + query. | Kanban com 50+ deals, verificar query count |
| TD-SYS-008 | Reabilitar ESLint rules criticas | 16-24 | Alto: pode revelar centenas de erros. Abordar incrementalmente. | Lint deve passar |

**Total Sprint 2: ~73-110h**

### Sprint 3: Architecture Foundation (Semana 4-6)

**Objetivo:** Decomposicao estrutural. PRE-REQUISITO: cobertura de testes minima para CRMContext.

| ID | Debito | Horas | Risco | Testes Requeridos |
|----|--------|-------|-------|-------------------|
| TD-SYS-004 (parcial) | Testes de regressao para CRMContext (pre-requisito de CC-001) | 16-24 | Medio. | Snapshot dos fluxos criticos |
| TD-CC-001 | Decompor CRMContext em sub-contextos | 24-40 | **ALTO**: mudanca mais arriscada do assessment. Re-renders, estado quebrado. | Todos os fluxos CRUD, wallet health, stagnant deals |
| TD-CC-002 | Unificar estado (Context + Zustand) | 16-24 | Medio: depende de CC-001. | Estado sincronizado entre camadas |
| TD-CC-004 | Decompor BoardCreationWizard | 16-24 | Medio: depende de CC-001. | Fluxo completo de criacao de board |
| TD-DB-017+018+024 | NOT NULL em org_id (3 tabelas com backfill) | 8-11 | Medio: backfill pode encontrar orfaos. SELECT COUNT antes de ALTER. | Queries como user regular, admin, corretor |

**Total Sprint 3: ~80-123h**

### Sprint 4: UX + Design System (Semana 6-8)

**Objetivo:** Consolidacao visual e design tokens.

| ID | Debito | Horas | Risco | Testes Requeridos |
|----|--------|-------|-------|-------------------|
| TD-UX-019 | Setup testes visuais (Storybook + screenshot) | 16-24 | Baixo. | Framework funcional |
| TD-UX-010 | Migrar 2.475 cores Tailwind para tokens | 12-16 | Medio: dark mode pode quebrar. Requer TD-UX-019 como baseline. | Screenshot comparison light + dark |
| TD-UX-002 (parcial) | Decompor FocusContextPanel (7 sub-componentes) | 12-16 | Baixo: tabs sao independentes. | Funcionalidade de cada tab |
| TD-UX-002 (parcial) | Decompor DealDetailModal | 8-12 | Baixo. | |
| TD-UX-005 (parcial) | Decompor useBoardsController | 8-12 | Medio: queries/mutations separation. | Board CRUD operations |
| TD-DB-002+016 | ON DELETE SET NULL em FKs | 4-5 | Baixo: nao-destrutivo. | |
| TD-DB-030 | Criptografar webhook secrets | 6-8 | Medio: requer pgcrypto. | Webhook roundtrip test |

**Total Sprint 4: ~66-93h**

### Sprint 5: Cleanup + Consolidation (Semana 8-10)

**Objetivo:** Debt cleanup e padronizacao.

| ID | Debito | Horas | Risco | Testes Requeridos |
|----|--------|-------|-------|-------------------|
| TD-DB-NEW-002 | Migrar ~40 policies de subquery para function | 8-12 | Baixo: semanticamente equivalente. Testar CADA tabela. | Query manual como cada role |
| TD-DB-005 | Unificar system_notifications (se houver consumer) | 6-10 | Alto se houver consumers nao descobertos. | Frontend grep first |
| TD-DB-019+020+026 | Planejar remocao colunas deprecated | 4-6 | Alto: lock de tabela durante DROP. Horario de baixo trafego. | Consumer audit first |
| TD-UX-002 (parcial) | Decompor BoardCreationWizard, WebhooksSection, restantes | 20-24 | Medio. | |
| TD-UX-005 (parcial) | Decompor controllers restantes | 16-20 | Medio. | |
| TD-SYS-005 | Migrar paginas para SSR (depende de CC-001 completo) | 24-40 | Alto: mudanca arquitetural. | FCP comparison |
| Itens P4 | LOW debitos variados | ~20-30 | Baixo. | |

**Total Sprint 5: ~98-142h**

---

## 5. Dependencias entre Debitos

### 5.1 Cadeias de Bloqueio (FINAL -- inclui 3 dependencias adicionais do QA)

```
TD-CC-001 (CRMContext split) [PRE-REQ: testes de regressao - ver TD-SYS-004]
  |-- bloqueia --> TD-CC-002 (Duplicacao Context + Zustand)
  |-- bloqueia --> TD-CC-004 (BoardCreationWizard decomposicao)
  |-- bloqueia --> TD-UX-002 parcial (BoardCreationWizard depende; FocusContextPanel e DealDetailModal NAO dependem)
  |-- bloqueia --> TD-SYS-003 (Debug logging esta DENTRO do CRMContext)
  |-- bloqueia --> TD-UX-013 (Optimistic updates centralizados no CRMContext)
  |-- bloqueia --> TD-SYS-005 (SSR requer providers desacoplados) [tambem depende de TD-SYS-014]

TD-SYS-004 (cobertura de testes) -- DEVE PRECEDER --> TD-CC-001 (CRMContext split)
  [QA DEP-02: decomposicao sem testes e a mudanca de maior risco do assessment]

TD-UX-019 (testes visuais) -- DEVE PRECEDER --> TD-UX-010 (migracao de cores)
  [QA DEP-01: migracao de 2.475 ocorrencias sem testes visuais e arriscada]

TD-DB-NEW-002 (subquery -> function) -- DEPENDE DE --> estabilidade de profiles RLS
  [QA DEP-03: qualquer mudanca em profiles quebraria ~40 policies]

TD-DB-001 (notify_deal_stage_changed fix)
  |-- correlato --> TD-DB-008 (Naming inconsistente e causa raiz)
  |-- correlato --> TD-DB-NEW-001 (Schema de colunas incompativel)
  |-- resolve --> Webhooks outbound (feature inteira)

TD-DB-002 (FKs ON DELETE SET NULL)
  |-- agrupar com --> TD-DB-016 (deals.contact_id FK)

TD-DB-003 (merge_contacts org check)
  |-- agrupar com --> TD-DB-NEW-003 (SQL dinamico cleanup)

TD-SYS-001 (Admin client RLS)
  |-- correlato --> TD-CC-006 (API keys texto plano)
  |-- correlato --> TD-SYS-002 (API keys texto plano)

TD-UX-001 (Button unificacao)
  |-- desbloqueia --> TD-UX-016 (SubmitButton duplicado)
  |-- desbloqueia --> TD-SYS-019 (ErrorBoundary localizacao)
  |-- desbloqueia --> TD-UX-002 parcial (FocusContextPanel importa Button duplicado)

TD-SYS-005 (SSR paginas protegidas)
  |-- depende de --> TD-CC-001 (CRMContext precisa ser decomposto para SSR)
  |-- depende de --> TD-SYS-014 (Provider nesting)
```

### 5.2 Clusters de Resolucao Conjunta (FINAL)

**Cluster 1: Seguranca DB (13-18h)**
- TD-DB-001 + TD-DB-008 + TD-DB-NEW-001 (webhook fix completo)
- TD-DB-003 + TD-DB-NEW-003 (merge_contacts org check + FOR UPDATE + EXECUTE cleanup)
- TD-DB-009 (LTV RPCs org check)

**Cluster 2: Seguranca App + Keys (36-56h)**
- TD-SYS-001 (admin client tenant filter)
- TD-SYS-002 + TD-CC-006 (API keys criptografia DB+App)
- TD-SYS-003 (debug logging removal)

**Cluster 3: CRMContext Refactor (56-88h, incluindo testes pre-requisito)**
- TD-SYS-004 parcial (testes de regressao CRMContext)
- TD-CC-001 (split CRMContext)
- TD-CC-002 (unificar estado)
- TD-CC-004 (BoardCreationWizard decomposicao)
- TD-UX-013 (expandir optimistic updates)

**Cluster 4: Error/Loading/Empty States (23-32h)**
- TD-SYS-006 (error.tsx por segmento)
- TD-SYS-007 (not-found.tsx)
- TD-SYS-012 (loading.tsx 14+ paginas)
- TD-UX-003 (skeletons content-aware)
- TD-UX-015 (GlobalError design)

**Cluster 5: Design System Tokens (34-49h)**
- TD-UX-019 (setup testes visuais -- PRE-REQUISITO)
- TD-UX-010 (cores Tailwind -> tokens semanticos)
- TD-UX-007 (scrollbar tokens)
- TD-UX-008 (chart tokens)
- TD-UX-011 (PageLoader tokens)
- TD-UX-018 (background glow)
- TD-UX-020 (overlay modais)

**Cluster 6: Integridade DB (14-21h)**
- TD-DB-017 + TD-DB-018 + TD-DB-024 (NOT NULL em org_id + backfill)
- TD-DB-002 + TD-DB-016 (ON DELETE SET NULL em FKs)

**Cluster 7: Componentes Gigantes (68-104h)**
- TD-UX-001 (Button unificacao -- habilita demais)
- TD-UX-002 (6 componentes gigantes: FocusContextPanel, DealDetailModal, BoardCreationWizard, WebhooksSection, ContactsImportExportModal, CockpitDataPanel)
- TD-UX-005 (4 controller hooks gigantes)

**Cluster 8: DB Debt Cleanup (18-26h)**
- TD-DB-NEW-002 (~40 policies subquery -> function)
- TD-DB-030 (webhook secrets criptografia)
- TD-DB-005 (unificar notifications)

---

## 6. Riscos e Mitigacoes

Fonte: QA Review (7 riscos cruzados) + riscos de implementacao do DB specialist.

| ID | Risco | Areas | Prob. | Impacto | Mitigacao |
|----|-------|-------|-------|---------|-----------|
| RC-01 | **Regressao ao decompor CRMContext.** Decomposicao pode quebrar qualquer feature que usa `useCRM()`. Cobertura 11.6% insuficiente. | Frontend, todas as features | Alta | Alto | Criar test suite de regressao ANTES da decomposicao, cobrindo todos os 930 linhas de comportamento. |
| RC-02 | **Fix de RLS pode bloquear acesso legitimo.** Fixes de RLS afetam acesso a dados. Erro na policy pode bloquear usuarios. | DB, Frontend, CRUD | Media | Alto | Testar CADA policy pos-fix com queries manuais como usuario regular, admin e corretor. Staging obrigatorio. |
| RC-03 | **Migracao de tokens pode quebrar dark mode.** 2.475 ocorrencias, mapeamento nao e 1:1 em todos os casos. | Frontend, design system | Media | Medio | Implementar testes visuais (TD-UX-019) ANTES da migracao. Screenshot comparison light + dark. |
| RC-04 | **Fix de webhook com campos incompativeis.** TD-DB-001 + TD-DB-NEW-001 requerem rewrite de INSERTs. | DB, webhooks, integracoes | Media | Alto | Usar funcao original do schema_init como base (conforme @data-engineer). Testar com deal move real em staging. |
| RC-05 | **Backfill de org_id encontra orfaos irrecuperaveis.** TD-DB-017/018/024 requerem backfill antes de SET NOT NULL. | DB, integridade, RLS | Baixa | Medio | SELECT COUNT antes de ALTER. Resolver orfaos manualmente ou DELETE se dados de teste. |
| RC-06 | **Unificacao de Button quebra 111 arquivos.** Replace mecanico mas em escala. | Frontend, todos os componentes | Media | Baixo | Replace e mecanico (`@/app/components/ui/Button` -> `@/components/ui/button`). Lint + typecheck apos replace. |
| RC-07 | **Seguranca DB + App desalinhadas.** TD-SYS-001 e TD-DB-003/009 sao mesma classe (cross-tenant) em camadas diferentes. Corrigir uma sem outra deixa vulnerabilidade. | DB, App, AI | Media | Alto | Resolver AMBAS em conjunto no Sprint 1 de seguranca. |
| RC-08 | **Fix de notify_deal_stage_changed() com campos errados.** | DB, webhooks | Media | Alto | Testar em staging com deal move real e verificar INSERT em webhook_events_out. |
| RC-09 | **Lock de tabela durante ALTER CONSTRAINT em deals.** | DB | Baixa | Medio | Horario de baixo trafego. Deals tem poucos milhares de rows. |
| RC-10 | **Subquery -> function migration quebra policies.** | DB, acesso | Baixa | Alto | Testar CADA tabela pos-migration com query manual como usuario regular. |

---

## 7. Testes Requeridos

### 7.1 Testes de Regressao (por cluster)

**Cluster 1: Seguranca DB**

| Teste | Debitos Cobertos | Prioridade |
|-------|-----------------|-----------|
| Webhook outbound: criar deal, mover de stage, verificar INSERT em `webhook_events_out` e `webhook_deliveries` com campos corretos | TD-DB-001, TD-DB-008, TD-DB-NEW-001 | P1 |
| merge_contacts: tentar merge cross-org como usuario regular, verificar DENY | TD-DB-003, TD-DB-NEW-003 | P1 |
| merge_contacts: merge concorrente do mesmo loser, verificar serializacao (FOR UPDATE) | TD-DB-003 | P1 |
| increment/decrement_contact_ltv: manipular LTV de contato de outra org | TD-DB-009 | P1 |
| ai_suggestion_interactions: usuario so ve suas proprias interacoes | TD-DB-004 | P2 |

**Cluster 3: CRMContext Refactor**

| Teste | Debitos Cobertos | Prioridade |
|-------|-----------------|-----------|
| Snapshot test ANTES da decomposicao: addDeal, moveDeal, deleteDeal, wallet health, stagnant deals | TD-CC-001 | P1 (pre-requisito) |
| Optimistic update de deal move: UI atualiza e reverte em erro | TD-CC-001, TD-UX-013 | P2 |
| Estado sincronizado entre Context e Zustand apos decomposicao | TD-CC-002 | P2 |
| BoardCreationWizard fluxo completo apos decomposicao | TD-CC-004 | P2 |

**Cluster 5: Design System Tokens**

| Teste | Debitos Cobertos | Prioridade |
|-------|-----------------|-----------|
| Screenshot comparison de todas as paginas em light e dark mode ANTES e APOS migracao | TD-UX-010, TD-UX-007, TD-UX-008 | P1 (pre-requisito) |
| Scrollbars, charts, modais e overlays corretos em ambos os modos | TD-UX-007, TD-UX-008, TD-UX-020 | P2 |

### 7.2 Testes de Integracao

| Teste | Areas Cruzadas | Prioridade |
|-------|---------------|-----------|
| Kanban end-to-end: 50+ deals, contacts batch, deal move, webhook, realtime | TD-CC-005, TD-DB-006, TD-DB-015, TD-DB-001 | P1 |
| Multi-tenant isolation: Org A tenta acessar Org B via RPC, API, AI tools | TD-DB-003, TD-DB-009, TD-SYS-001 | P1 |
| Auth flow completo: login -> middleware -> RLS -> query -> realtime | Middleware, RLS, Frontend | P2 |
| Migration rollback: aplicar fix, reverter, re-aplicar em staging | TD-DB-001, strategy | P2 |

### 7.3 Baselines de Performance

| Metrica | Quando Capturar | Debitos |
|---------|----------------|---------|
| Kanban load time (50, 100, 200 deals) | ANTES e APOS fix N+1 | TD-CC-005, TD-DB-006, TD-DB-012 |
| First Contentful Paint em paginas protegidas | ANTES e APOS loading.tsx | TD-SYS-012, TD-SYS-005 |
| Bundle size total e por chunk | ANTES e APOS decomposicao componentes | TD-UX-002, TD-CC-001 |
| Re-render count em CRUD | ANTES e APOS CRMContext split | TD-CC-001, TD-CC-002 |
| Query count em dashboard | ANTES e APOS indexes | TD-DB-012, TD-DB-013, TD-DB-014 |

### 7.4 Validacao de Seguranca

| Teste | Debitos | Prioridade |
|-------|---------|-----------|
| Cross-tenant access via TODOS os RPCs SECURITY DEFINER | TD-DB-003, TD-DB-009, TD-SYS-001 | P1 |
| Admin client (service role) NAO exposto client-side (sem NEXT_PUBLIC_ prefix) | TD-SYS-001 | P1 |
| AI tools destrutivas requerem approval sem BYPASS | TD-SYS-001, GAP-02 | P1 |
| API keys NAO aparecem em responses, logs, bundle JS | TD-SYS-002, TD-CC-006 | P1 |
| Debug endpoint inacessivel em producao | TD-SYS-003 | P2 |
| npm audit: vulnerabilidades conhecidas | GAP-05 | P2 |

---

## 8. Criterios de Sucesso

### Sprint 1: Security Critical
- [ ] Zero RPCs SECURITY DEFINER sem validacao de org
- [ ] Webhook outbound funcional: deal move gera evento + delivery
- [ ] AI API keys criptografadas em repouso (nao aparecem em texto plano no DB)
- [ ] Admin client filtra por tenant em TODAS as queries
- [ ] Debug logging removido do bundle de producao
- [ ] Button component unificado: 0 imports de `app/components/ui/Button.tsx`

### Sprint 2: Error Handling + Performance
- [ ] Todas as paginas protegidas tem error.tsx, not-found.tsx e loading.tsx
- [ ] Skeletons content-aware em dashboard, boards, contacts, inbox
- [ ] Kanban: query count N+1 -> 1 batch query para contacts
- [ ] 3 indexes compostos criados (verificar via EXPLAIN)
- [ ] Overlay de modais padronizado em TODOS os 27 arquivos
- [ ] ESLint rules criticas reabilitadas (minimo: exhaustive-deps)

### Sprint 3: Architecture Foundation
- [ ] CRMContext decomposto em sub-contextos independentes
- [ ] Zero re-renders cascata em operacoes CRUD isoladas
- [ ] Context + Zustand unificados (zero duplicacao de estado)
- [ ] BoardCreationWizard decomposto (nenhum arquivo > 200 linhas)
- [ ] org_id NOT NULL em activities, contacts, boards (zero NULLs)

### Sprint 4: UX + Design System
- [ ] Framework de testes visuais funcional (Storybook + screenshot)
- [ ] Zero ocorrencias de `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*` (2.475 -> 0)
- [ ] FocusContextPanel decomposto (7 sub-componentes, nenhum > 300 linhas)
- [ ] DealDetailModal decomposto
- [ ] useBoardsController decomposto (max 200 linhas/hook)
- [ ] Webhook secrets criptografados em repouso

### Sprint 5: Cleanup
- [ ] ~40 RLS policies migradas de subquery para `get_user_organization_id()`
- [ ] Colunas deprecated documentadas com COMMENT ON COLUMN
- [ ] system_notifications deprecada ou unificada
- [ ] Paginas protegidas com SSR habilitado (FCP mensuravel)

---

## 9. Specialist Reviews Summary

| Especialista | Debitos Revisados | Ajustes Sev. | Novos Debitos | Horas Estimadas | Decisao |
|-------------|-------------------|-------------|---------------|-----------------|---------|
| @data-engineer (DB Sage) | 30 | 9 (3 rebaixados, 4 elevados, 2 reclassificados) | 5 (TD-DB-NEW-001 a NEW-005) | ~57-81h (DB) | Todos os ajustes aceitos |
| @ux-design-expert (Uma) | 19 UX + 6 cross-cutting + 6 sistema | 9 (5 rebaixados, 4 elevados) | 5 (TD-UX-020 a UX-024) | ~290-410h (UX) | Todos os ajustes aceitos |
| @qa (Quinn) | Assessment completo (6 docs, ~3000 linhas) | 0 (validou todos os 18 dos especialistas) | 6 gaps + 7 riscos + 3 dependencias | -- | Gate: APPROVED |

### Respostas as 12 Perguntas do Architect

**Respostas do @data-engineer (integradas neste documento):**
1. `notify_deal_stage_changed()`: campos NAO correspondem 1:1. Usar funcao original do schema_init.
2. FK ON DELETE: **SET NULL** para board_id, stage_id, contact_id. Deals sao entidades de alto valor.
3. Unificacao notifications: `notifications` (Epic 3) e a canonica. `system_notifications` deprecated.
4. Race condition em merge_contacts: risco REAL mas MITIGADO. Adicionar FOR UPDATE.
5. Migrations idempotentes: apenas para NOVAS migrations. Nao retroativo.
6. Remocao deals.status: estrategia em 3 fases (audit -> deprecation enforcement -> DROP).

**Respostas do @ux-design-expert (integradas neste documento):**
1. FocusContextPanel: decomponivel em 7 sub-componentes (tabs sao independentes).
2. Button unstyled: adicionar `unstyled: ""` ao principal. NAO e anti-pattern.
3. i18n: `next-intl` recomendado. NAO implementar agora.
4. Skeletons: hibrido -- building blocks reutilizaveis + composicao por feature.
5. Cores Tailwind diretas: 2.475 ocorrencias em 137 arquivos. Mapeamento fornecido.
6. Controller hooks: separar por responsabilidade + sub-feature. Max 200 linhas/hook.

---

## 10. Estrategia de Migration (Recomendacoes do @data-engineer)

**Principios gerais:**
1. Cada fix = 1 migration file. NAO consolidar fixes de tipos diferentes.
2. Todas as migrations dentro de `BEGIN;...COMMIT;` para atomicidade.
3. Testar em staging PRIMEIRO (`supabase db push`).
4. Produzir migration + rollback script para cada fix.
5. Indexes: usar `CREATE INDEX CONCURRENTLY` (nao bloqueia reads/writes). CONCURRENTLY nao roda dentro de transacao -- separar em migration propria.

**Para functions (TD-DB-001, TD-DB-003, TD-DB-009):** `CREATE OR REPLACE FUNCTION` (atomico, sem downtime).
**Para FK changes (TD-DB-002):** DROP + ADD constraint (lock implicito ACCESS EXCLUSIVE por milissegundos).
**Para NOT NULL (TD-DB-017/018/024):** Backfill ANTES do ALTER. SELECT COUNT para verificar NULLs restantes.
**Para novas migrations:** Sempre usar `IF NOT EXISTS` em CREATE TABLE, INDEX, ALTER TABLE ADD COLUMN.

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @architect (Aria) | DRAFT inicial criado. Consolidacao das 4 fontes de Phase 1-3. 71 debitos catalogados. |
| 2026-03-03 | @data-engineer (DB Sage) | DB specialist review. 30 debitos validados, 1 reclassificado (TD-DB-002 CRITICAL -> MEDIUM), 5 debitos adicionados (TD-DB-NEW-001 a NEW-005), 9 ajustes de severidade. 6 perguntas respondidas. |
| 2026-03-03 | @ux-design-expert (Uma) | UX specialist review. 19 debitos UX + 6 cross-cutting validados. 9 ajustes de severidade. 5 debitos adicionados (TD-UX-020 a UX-024). 6 perguntas respondidas. |
| 2026-03-03 | @qa (Quinn) | QA review. Gate: APPROVED. 6 gaps, 7 riscos cruzados, 3 dependencias nao documentadas, 18 ajustes validados, testes requeridos definidos. |
| 2026-03-03 | @architect (Aria) | Assessment FINAL consolidado. Todos os ajustes de especialistas aplicados. 10 novos debitos incorporados. 3 dependencias do QA adicionadas. Plano de resolucao em 5 sprints. Criterios de sucesso definidos. |

---

> **Este documento e o artefato final da Phase 8 do Brownfield Discovery.**
> Proximo passo: Phase 9 (@analyst) -- TECHNICAL-DEBT-REPORT.md (executive summary) e Phase 10 (@pm) -- Epic + stories prontos para desenvolvimento.
