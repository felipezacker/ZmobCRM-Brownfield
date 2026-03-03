# Technical Debt Assessment - DRAFT

**Projeto:** ZmobCRM
**Data:** 2026-03-03
**Status:** DRAFT - Pendente revisao dos especialistas
**Versao do Projeto:** 1.4.3
**Fontes:** system-architecture.md (Phase 1), SCHEMA.md (Phase 2), DB-AUDIT.md (Phase 2), frontend-spec.md (Phase 3)

---

## Executive Summary

- Total de debitos identificados: **71**
- Criticos: **9** | Altos: **20** | Medios: **27** | Baixos: **15**
- Esforco total estimado: **~490-610 horas** (preliminar)
- Areas mais impactadas: Estado/Contexto (cross-cutting), Seguranca (DB + AI), Performance (frontend + DB)

**Top 5 riscos imediatos:**
1. Admin client de IA bypassa RLS sem filtro de tenant (TD-SYS-001)
2. Funcao `notify_deal_stage_changed()` referencia tabelas inexistentes -- webhooks quebrados (TD-DB-001)
3. CRMContext monolito causa re-renders em cascata em toda a aplicacao (TD-CC-001)
4. `merge_contacts()` SECURITY DEFINER permite cross-tenant manipulation (TD-DB-003)
5. API keys de IA armazenadas em texto plano no banco (TD-SYS-002)

---

## 1. Debitos de Sistema

Fonte: `docs/architecture/system-architecture.md` (Phase 1 - @architect)

### 1.1 CRITICO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-SYS-001 | **Admin client (service role) bypassa RLS para AI tools.** `createStaticAdminClient()` usa service role key sem filtro adicional de tenant. Qualquer bug nas AI tools pode vazar dados entre organizacoes. | CRITICAL | Vazamento cross-tenant de dados via IA | 16-24 | TD-001 (sys-arch) |
| TD-SYS-002 | **AI API keys armazenadas como texto plano no banco.** Chaves de OpenAI, Google, Anthropic em `organization_settings` sem criptografia. Se o banco for comprometido, todas as keys ficam expostas. | CRITICAL | Exposicao de credenciais em caso de breach | 8-12 | TD-002 (sys-arch) |
| TD-SYS-003 | **Debug logging com endpoint externo em producao.** `CRMContext.tsx` contem ~150 linhas de fetch para `http://127.0.0.1:7242/ingest/...` com UUID hardcoded. Protegido por `NODE_ENV` mas e codigo morto em producao. | CRITICAL | Codigo morto, UUID de endpoint exposto no bundle client | 2-4 | TD-003 (sys-arch) |

### 1.2 ALTO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-SYS-004 | **Cobertura de testes baixa (11.6%).** 51 arquivos de teste para 438 fontes. Zero testes em: maioria de features/, todos os contexts/, API routes, AI agent, middleware de auth. | HIGH | Regressoes nao detectadas em areas criticas | 80-120 | TD-004 (sys-arch) |
| TD-SYS-005 | **Todas as paginas protegidas sao client components.** O layout `(protected)/layout.tsx` usa `<Providers>` que e `'use client'`, forcando toda a sub-arvore a ser client-rendered. Perde SSR, streaming e Suspense nativas. | HIGH | Performance de first load, SEO, bundle size | 24-40 | TD-007 (sys-arch) |
| TD-SYS-006 | **Nenhum error.tsx em route segments.** O App Router suporta error boundaries por segmento, mas o projeto so tem `global-error.tsx`. Erros em features propagam ate o topo. | HIGH | UX degradada em erros, dificuldade de debug | 8-12 | TD-009 (sys-arch) |
| TD-SYS-007 | **Nenhum not-found.tsx.** Pagina 404 default do Next.js em vez de UI customizada. | HIGH | UX quebrada em rotas invalidas | 4-6 | TD-010 (sys-arch) |
| TD-SYS-008 | **ESLint rules criticas desabilitadas.** `no-explicit-any: off`, `no-unused-vars: off`, `exhaustive-deps: off`. Permite bugs silenciosos de stale closures e tipos inseguros. | HIGH | Bugs silenciosos em runtime, qualidade de codigo | 16-24 | TD-011 (sys-arch) |

### 1.3 MEDIO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-SYS-009 | **Endpoint /api/chat e re-export vazio.** Rota duplicada sem proposito alem de alias. | MEDIUM | Confusao de API surface | 1 | TD-012 (sys-arch) |
| TD-SYS-010 | **Labs com mocks acessiveis em producao.** `app/(protected)/labs/` contem mock cockpits acessiveis em qualquer deploy. Sem feature flag. | MEDIUM | Dados falsos acessiveis por usuarios reais | 4-8 | TD-013 (sys-arch) |
| TD-SYS-011 | **useRealtimeSync.ts monolitico (27KB).** Hook com deduplicacao global, tratamento especial para Kanban e multiplas variantes. | MEDIUM | Manutenibilidade, testabilidade | 12-16 | TD-014 (sys-arch) |
| TD-SYS-012 | **Loading states apenas em 4 paginas.** So boards, contacts, inbox e deals/cockpit tem `loading.tsx`. Demais paginas mostram tela branca. | MEDIUM | UX degradada durante carregamento | 8-12 | TD-015 (sys-arch) |
| TD-SYS-013 | **Supabase client pode retornar null.** `lib/supabase/client.ts` faz cast para `SupabaseClient` mas retorna null se env vars nao configuradas. Crash em runtime sem mensagem. | MEDIUM | Crash silencioso em ambientes mal configurados | 2-4 | TD-017 (sys-arch) |
| TD-SYS-014 | **Provider nesting profundo (10 niveis).** `composeProviders` empilha 10 providers, adicionando overhead e complexidade de debug. | MEDIUM | Performance, dificuldade de debugging | 8-16 | TD-018 (sys-arch) |
| TD-SYS-015 | **Installer endpoint complexo (13 routes).** Sistema de instalacao com 13 API routes que so roda uma vez por instancia. | MEDIUM | Complexidade desnecessaria em producao | 4-8 | TD-019 (sys-arch) |
| TD-SYS-016 | **pg em dependencies de producao.** Driver PostgreSQL direto em producao, mas Supabase JS ja abstrai o acesso. Usado apenas pelo installer e possivelmente AI tools. | MEDIUM | Bundle desnecessario, surface de ataque | 2-4 | TD-020 (sys-arch) |

### 1.4 BAIXO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-SYS-017 | **Tailwind config JS com Tailwind v4.** `tailwind.config.js` mantido, mas v4 usa CSS `@theme`. Potencial conflito. | LOW | Configuracao duplicada | 2-4 | TD-021 (sys-arch) |
| TD-SYS-018 | **.DS_Store commitados.** Artefatos macOS em `context/` e `app/`. | LOW | Lixo no repositorio | 1 | TD-022 (sys-arch) |
| TD-SYS-019 | **ErrorBoundary em localizacao nao-padrao.** Em `app/components/ui/` em vez de `components/ui/`. | LOW | Import paths inconsistentes | 2 | TD-023 (sys-arch) |
| TD-SYS-020 | **Hardcoded avatar URLs.** `'https://i.pravatar.cc/150?u=me'` como fallback em varios locais. | LOW | Dependencia de servico externo, UX inconsistente | 2 | TD-025 (sys-arch) |

**Total Sistema: 20 debitos** (3 CRITICAL, 5 HIGH, 8 MEDIUM, 4 LOW)

> PENDENTE: Revisao do @architect (assessment final)

---

## 2. Debitos de Database

Fonte: `supabase/docs/DB-AUDIT.md` e `supabase/docs/SCHEMA.md` (Phase 2 - @data-engineer)

### 2.1 CRITICO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-DB-001 | **`notify_deal_stage_changed()` referencia tabelas inexistentes.** Migration `20260225000000` reescreveu a funcao usando `integration_webhook_events` e `integration_webhook_deliveries` (nomes errados). Correto: `webhook_events_out`, `webhook_deliveries`. Webhooks outbound completamente quebrados. | CRITICAL | Feature de webhook outbound nao funcional | 4-6 | SEC-03 / MIG-01 (db-audit) |
| TD-DB-002 | **deals.board_id FK sem ON DELETE CASCADE ou SET NULL.** Se um board for hard-deleted, deals ficam orfaos. Mesmo risco em deals.stage_id. | CRITICAL | Orfaos e erros de integridade referencial | 4-6 | INT-01 / INT-02 (db-audit) |
| TD-DB-003 | **`merge_contacts()` como SECURITY DEFINER sem validacao de org.** Qualquer usuario autenticado pode fazer merge de contatos de outra organizacao. Cross-tenant data manipulation. | CRITICAL | Manipulacao cross-tenant de dados | 4-8 | SEC-04 (db-audit) |

### 2.2 ALTO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-DB-004 | **`ai_suggestion_interactions` RLS permissiva (`USING(true)`).** Qualquer usuario autenticado pode ver/modificar interacoes de IA de todos os usuarios. | HIGH | Cross-user data access | 2-4 | SEC-01 (db-audit) |
| TD-DB-005 | **Duplicidade `system_notifications` vs `notifications`.** Duas tabelas de notificacoes com sobreposicao funcional: `system_notifications` (legado) e `notifications` (Epic 3). | HIGH | Confusao de dominio, dados fragmentados | 8-12 | DES-06 (db-audit) |
| TD-DB-006 | **N+1 deals -> contacts no kanban.** Kanban carrega deals e faz N queries para resolver nomes de contatos. FK sem eager loading. | HIGH | Performance do kanban degrada com volume | 4-8 | PERF-06 (db-audit) |
| TD-DB-007 | **Migrations nao idempotentes.** Varias migrations usam `ALTER TABLE ADD COLUMN` sem `IF NOT EXISTS` e `CREATE INDEX` sem `IF NOT EXISTS`. Re-run falha. | HIGH | Impossibilidade de re-rodar migrations, dificuldade de recovery | 8-12 | MIG-02 (db-audit) |
| TD-DB-008 | **Naming inconsistente em webhook tables (bug correlato SEC-03).** Tabelas usam `webhook_events_out`/`webhook_deliveries` mas funcoes referenciam `integration_webhook_events`/`integration_webhook_deliveries`. | HIGH | Confusao + causa raiz do bug SEC-03 | 2-4 | DES-07 (db-audit) |

### 2.3 MEDIO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-DB-009 | **`increment/decrement_contact_ltv()` SECURITY DEFINER sem validacao de org.** Qualquer usuario pode manipular LTV de contatos de outra org. | MEDIUM | Cross-tenant manipulation de campo LTV | 2-4 | SEC-05 (db-audit) |
| TD-DB-010 | **RLS de `contact_phones` e `contact_preferences` usa subquery direta em vez de `get_user_organization_id()`.** Pode causar recursao RLS (42P17). | MEDIUM | Potencial erro de recursao RLS | 4-6 | SEC-06 (db-audit) |
| TD-DB-011 | **`notifications` sem DELETE policy.** Notificacoes acumulam indefinidamente sem possibilidade de cleanup pelo usuario. | MEDIUM | Acumulo de dados, sem cleanup path | 1-2 | SEC-07 (db-audit) |
| TD-DB-012 | **Index ausente deals(contact_id, board_id).** Queries de kanban que filtram por contato dentro de um board fazem scan completo. | MEDIUM | Performance em queries de kanban | 1-2 | PERF-01 (db-audit) |
| TD-DB-013 | **Index ausente activities(organization_id, date DESC).** Queries de timeline/agenda com filtro de org e ordenacao por data. | MEDIUM | Performance da timeline | 1-2 | PERF-02 (db-audit) |
| TD-DB-014 | **Index ausente deals(organization_id, is_won, is_lost).** Dashboard stats faz full scan nos flags booleanos. | MEDIUM | Performance do dashboard | 1-2 | PERF-03 (db-audit) |
| TD-DB-015 | **N+1 deals -> board_stages.** Cada deal precisa do label do stage para exibicao. | MEDIUM | Performance adicional no kanban | 2-4 | PERF-07 (db-audit) |
| TD-DB-016 | **deals.contact_id FK sem ON DELETE action.** Hard delete de contato deixa deals orfaos. | MEDIUM | Orfaos em cenarios edge | 2 | INT-03 (db-audit) |
| TD-DB-017 | **activities.organization_id nullable.** Dependeu de backfill. Novos registros podem ter NULL. | MEDIUM | Atividades sem org, bypass de RLS | 2-4 | INT-04 (db-audit) |
| TD-DB-018 | **contacts.organization_id nullable.** Deveria ser NOT NULL como deals. | MEDIUM | Contatos sem org, bypass de RLS | 2-4 | INT-05 (db-audit) |
| TD-DB-019 | **`deals.status` e `deals.stage_id` coexistem.** `status` e DEPRECATED mas nao tem constraint ligando ao `stage_id`. Valores divergentes possiveis. | MEDIUM | Inconsistencia de dados | 4-8 | INT-12 (db-audit) |
| TD-DB-020 | **`profiles.name` e `profiles.first_name` coexistem.** `name` e DEPRECATED mas queries podem ler ambos. | MEDIUM | Dados legacy inconsistentes | 4-8 | INT-13 (db-audit) |
| TD-DB-021 | **VARCHAR vs TEXT inconsistente em `security_alerts`.** Unica tabela que usa VARCHAR(50/20/255); todas as demais usam TEXT. | MEDIUM | Inconsistencia de schema | 1-2 | DES-08 (db-audit) |
| TD-DB-022 | **`notifications` sem schema qualifier na migration.** Funciona mas inconsistente com padrao do projeto. | MEDIUM | Padrao inconsistente | 1 | MIG-03 (db-audit) |

### 2.4 BAIXO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-DB-023 | **`rate_limits` RLS permissiva (`USING(true)`).** Information disclosure (sem dados sensiveis). | LOW | Information disclosure menor | 1-2 | SEC-02 (db-audit) |
| TD-DB-024 | **boards.organization_id nullable.** Deveria ser NOT NULL. | LOW | Boards sem org em cenarios edge | 1-2 | INT-06 (db-audit) |
| TD-DB-025 | **products.price sem CHECK (>= 0).** deal_items tem, products nao. | LOW | Preco negativo possivel | 1 | INT-07 (db-audit) |
| TD-DB-026 | **profiles.avatar e avatar_url coexistem.** Colunas deprecated sem plano de remocao. | LOW | Confusao sobre qual coluna usar | 2-4 | INT-14 (db-audit) |
| TD-DB-027 | **contacts.tags como TEXT[] em vez de FK para tabela `tags`.** Padrao EAV aceitavel para CRM. | LOW | Normalizacao subotima | 4-8 | DES-01 (db-audit) |
| TD-DB-028 | **`quick_scripts` naming inconsistente.** Poderia ser `script_templates`. | LOW | Cosmetico | 1 | DES-05 (db-audit) |
| TD-DB-029 | **Index ausente contacts(org_id, name).** GIN trigram existe mas nao composta com org_id. | LOW | Performance menor em busca de contatos | 1-2 | PERF-04 (db-audit) |
| TD-DB-030 | **Webhook secrets em texto claro.** `integration_inbound_sources.secret` e `integration_outbound_endpoints.secret` sem criptografia. RLS admin-only mitiga. | LOW | Credenciais expostas se DB comprometido (mitigado por RLS) | 4-8 | SEC-10 / SEC-11 (db-audit) |

**Total Database: 30 debitos** (3 CRITICAL, 5 HIGH, 14 MEDIUM, 8 LOW)

> PENDENTE: Revisao do @data-engineer

---

## 3. Debitos de Frontend/UX

Fonte: `docs/frontend/frontend-spec.md` (Phase 3 - @ux-design-expert)

### 3.1 CRITICO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-UX-001 | **Duplicacao de Button component.** 2 versoes: `components/ui/button.tsx` e `app/components/ui/Button.tsx`. A segunda adiciona variants `unstyled`. Imports misturados no codebase. | CRITICAL | Inconsistencia visual, confusao de imports | 4-8 | DEBT-001 (frontend-spec) |
| TD-UX-002 | **Componentes gigantes.** `FocusContextPanel.tsx` (109KB), `DealDetailModal.tsx` (87KB), `BoardCreationWizard.tsx` (75KB), `WebhooksSection.tsx` (55KB), `ContactsImportExportModal.tsx` (51KB), `CockpitDataPanel.tsx` (48KB). | CRITICAL | Manutenibilidade, performance, bundle size | 40-60 | DEBT-004 (frontend-spec) |

### 3.2 ALTO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-UX-003 | **Skeletons quase inexistentes.** Apenas charts tem skeleton loading. Todas as paginas usam spinner generico (`PageLoader`). | HIGH | Percepcao de velocidade ruim, UX de carregamento | 16-24 | DEBT-002 (frontend-spec) |
| TD-UX-004 | **Nenhum sistema de i18n.** 400+ strings hardcoded em portugues em todos os componentes. Zero infraestrutura para internacionalizacao. | HIGH | Impossivel traduzir sem refatoracao massiva | 40-60 | DEBT-005 (frontend-spec) |
| TD-UX-005 | **Controller hooks gigantes.** `useBoardsController.ts` (37KB), `useContactsController.ts` (30KB), `useInboxController.ts` (28KB), `useActivitiesController.ts` (19KB). Centralizam toda logica de features. | HIGH | Manutenibilidade, testabilidade, re-renders | 24-32 | DEBT-006 (frontend-spec) |
| TD-UX-006 | **Mistura de import paths.** Alguns imports usam `@/lib/utils` e outros `@/lib/utils/cn`. Sem barrel file consistente. | HIGH | Confusao para devs, imports duplicados | 4-8 | DEBT-007 (frontend-spec) |
| TD-UX-007 | **Scrollbar styling com hex hardcoded.** Cores `#cbd5e1`, `#94a3b8`, etc. em vez de tokens semanticos. | HIGH | Inconsistencia com design system, dark mode incorreto | 2-4 | DEBT-008 (frontend-spec) |
| TD-UX-008 | **Chart colors com hex hardcoded.** Tokens de chart usam `#64748b`, `#0f172a`, `rgba(...)` em vez de OKLCH. | HIGH | Charts nao adaptam corretamente ao dark mode | 2-4 | DEBT-009 (frontend-spec) |

### 3.3 MEDIO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-UX-009 | **Font serif (`Cinzel`) definida mas nao utilizada.** `--font-serif` declarada em @theme mas nunca referenciada. | MEDIUM | Peso desnecessario se carregada (pode nao estar) | 1 | DEBT-010 (frontend-spec) |
| TD-UX-010 | **Cores Tailwind pre-v4 misturadas com tokens.** Uso de `text-slate-*`, `bg-slate-*`, `text-gray-*` ao lado de tokens semanticos customizados. | MEDIUM | Duas fontes de verdade para cores | 8-12 | DEBT-011 (frontend-spec) |
| TD-UX-011 | **PageLoader com cores hardcoded.** `text-gray-500 dark:text-gray-400` em vez de `text-muted-foreground`. | MEDIUM | Inconsistencia visual | 1 | DEBT-012 (frontend-spec) |
| TD-UX-012 | **ConfirmModal nao usa `modalStyles.ts` centralizado.** Estilos inline proprios, potencial deriva visual. | MEDIUM | Inconsistencia de modais | 2-4 | DEBT-013 (frontend-spec) |
| TD-UX-013 | **Optimistic updates limitados.** Apenas deal moves tem optimistic updates. Contacts, activities, etc. fazem full refetch. | MEDIUM | UX mais lenta em operacoes CRUD | 12-16 | DEBT-014 (frontend-spec) |
| TD-UX-014 | **ErrorBoundary usa inline styles.** `style={{ borderColor: 'var(--border)' }}` em vez de classes Tailwind. | MEDIUM | Inconsistencia de padrao | 1 | DEBT-015 (frontend-spec) |
| TD-UX-015 | **GlobalError sem design system.** `app/global-error.tsx` usa HTML puro sem styling do design system. | MEDIUM | Experiencia visual quebrada em erros globais | 2-4 | DEBT-016 (frontend-spec) |

### 3.4 BAIXO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Ref. Origem |
|----|-----------|------------|---------|-------------|-------------|
| TD-UX-016 | **SubmitButton duplicado em FormField.tsx.** Exporta `buttonVariants` que conflitam com `button.tsx`. | LOW | Confusao de naming, variants inconsistentes | 2-4 | DEBT-017 (frontend-spec) |
| TD-UX-017 | **Prefetch incompleto.** `prefetchRouteData()` so implementa dashboard e contacts. Outras rotas retornam null. | LOW | Prefetch parcial, beneficio limitado | 4-8 | DEBT-018 (frontend-spec) |
| TD-UX-018 | **Ambient background glow hardcoded.** Efeito decorativo usa `bg-primary-500/10` e `bg-purple-500/10` hardcoded. | LOW | Nao adaptavel por tema | 1-2 | DEBT-019 (frontend-spec) |
| TD-UX-019 | **Nenhum teste e2e/visual.** Sem Playwright, Storybook ou testes visuais. Apenas testes unitarios. | LOW | Regressoes visuais nao detectadas | 16-24 | DEBT-020 (frontend-spec) |

**Total Frontend/UX: 19 debitos** (2 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW)

> PENDENTE: Revisao do @ux-design-expert

---

## 4. Debitos Cross-Cutting

Debitos que aparecem em multiplos documentos fonte ou afetam mais de uma camada do sistema.

### 4.1 CRITICO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Fontes |
|----|-----------|------------|---------|-------------|--------|
| TD-CC-001 | **CRMContext monolito (33KB/930 linhas).** Agrega 5 sub-contextos, contem logica de negocio (optimistic updates, wallet health, stagnant deals), debug logging externo, e projeta views denormalizadas. Qualquer mudanca causa re-render em cascata em toda a aplicacao. Impacta performance, manutenibilidade e testabilidade simultaneamente. | CRITICAL | Re-renders cascata, manutenibilidade, acoplamento total | 24-40 | TD-005 (sys-arch), DEBT-003 (frontend-spec) |

### 4.2 ALTO

| ID | Descricao | Severidade | Impacto | Esforco (h) | Fontes |
|----|-----------|------------|---------|-------------|--------|
| TD-CC-002 | **Duplicacao de estado: Context API + Zustand.** Sobreposicao de estado entre Context e Zustand (ex: `isGlobalAIOpen` em ambos). CRMContext depende de 5 sub-contextos que dependem de React Query. Complexidade excessiva na arvore de estado. | HIGH | Bugs por estado duplicado, dificuldade de raciocinar sobre estado | 16-24 | TD-006 (sys-arch), Sec. 9 (frontend-spec) |
| TD-CC-003 | **Nenhum sistema de i18n (impacto fullstack).** Frontend: 400+ strings hardcoded. Backend: mensagens de erro e labels em portugues. Bloqueio total para mercados internacionais. | HIGH | Impossibilidade de internacionalizacao | 40-60 | TD-016 (sys-arch), DEBT-005 (frontend-spec) |
| TD-CC-004 | **BoardCreationWizard.tsx monolito (75KB) com dependencia de contextos.** Maior arquivo do projeto, depende diretamente de CRMContext e multiplos contextos de dominio. Decomposicao bloqueada ate CRMContext ser resolvido. | HIGH | Interligado com TD-CC-001 | 16-24 | TD-008 (sys-arch), DEBT-004 (frontend-spec) |
| TD-CC-005 | **N+1 kanban: DB schema + frontend implementation.** O schema permite `select=*,contacts(*)` para evitar N+1, mas a implementacao frontend nao usa eager loading. Correcao requer mudanca em ambas camadas. | HIGH | Performance do kanban degrada linearmente com volume de deals | 8-16 | PERF-06 (db-audit), Kanban flow (sys-arch) |
| TD-CC-006 | **API keys em texto plano (DB + Application layer).** Afeta tanto o schema do banco (`organization_settings.ai_*_key`, `user_settings.ai_*_key`) quanto a camada de aplicacao que le/escreve sem criptografia. Correcao requer migration + refatoracao de servicos. | HIGH | Exposicao de credenciais em caso de comprometimento | 12-20 | TD-002 (sys-arch), SEC-08/SEC-09 (db-audit) |

**Total Cross-Cutting: 6 debitos** (1 CRITICAL, 5 HIGH)

---

## 5. Matriz Preliminar de Priorizacao

Priorizacao baseada em: severidade primeiro, depois ratio impacto/esforco.

**Legenda Prioridade:**
- P1 = Fazer agora (CRITICAL ou HIGH com alto impacto de seguranca)
- P2 = Proximo sprint (HIGH restantes)
- P3 = Backlog (MEDIUM)
- P4 = Opcional (LOW)

| ID | Debito | Area | Severidade | Impacto | Esforco (h) | Prioridade |
|----|--------|------|------------|---------|-------------|------------|
| TD-DB-001 | notify_deal_stage_changed() tabelas inexistentes | DB | CRITICAL | Webhooks quebrados | 4-6 | **P1** |
| TD-DB-003 | merge_contacts() DEFINER sem org check | DB | CRITICAL | Cross-tenant merge | 4-8 | **P1** |
| TD-SYS-003 | Debug logging com endpoint externo | Sistema | CRITICAL | Codigo morto, endpoint exposto | 2-4 | **P1** |
| TD-SYS-001 | Admin client bypassa RLS para AI tools | Sistema | CRITICAL | Vazamento cross-tenant | 16-24 | **P1** |
| TD-SYS-002 | AI API keys em texto plano | Sistema | CRITICAL | Exposicao de credenciais | 8-12 | **P1** |
| TD-DB-002 | deals FKs sem ON DELETE | DB | CRITICAL | Orfaos e integridade | 4-6 | **P1** |
| TD-CC-001 | CRMContext monolito | Cross-Cut | CRITICAL | Re-renders cascata | 24-40 | **P1** |
| TD-UX-001 | Duplicacao de Button component | UX | CRITICAL | Inconsistencia visual | 4-8 | **P1** |
| TD-UX-002 | Componentes gigantes (6 arquivos) | UX | CRITICAL | Bundle, manutenibilidade | 40-60 | **P1** |
| TD-DB-004 | ai_suggestion_interactions RLS permissiva | DB | HIGH | Cross-user data access | 2-4 | **P2** |
| TD-CC-005 | N+1 kanban (DB + frontend) | Cross-Cut | HIGH | Performance kanban | 8-16 | **P2** |
| TD-SYS-008 | ESLint rules desabilitadas | Sistema | HIGH | Bugs silenciosos | 16-24 | **P2** |
| TD-SYS-006 | Nenhum error.tsx | Sistema | HIGH | UX degradada em erros | 8-12 | **P2** |
| TD-SYS-007 | Nenhum not-found.tsx | Sistema | HIGH | UX quebrada em 404 | 4-6 | **P2** |
| TD-DB-005 | system_notifications vs notifications | DB | HIGH | Dados fragmentados | 8-12 | **P2** |
| TD-DB-007 | Migrations nao idempotentes | DB | HIGH | Re-run impossivel | 8-12 | **P2** |
| TD-CC-002 | Duplicacao Context + Zustand | Cross-Cut | HIGH | Estado duplicado | 16-24 | **P2** |
| TD-UX-003 | Skeletons inexistentes | UX | HIGH | Percepcao velocidade | 16-24 | **P2** |
| TD-UX-005 | Controller hooks gigantes | UX | HIGH | Manutenibilidade | 24-32 | **P2** |
| TD-UX-006 | Import paths inconsistentes | UX | HIGH | Confusao devs | 4-8 | **P2** |
| TD-UX-007 | Scrollbar hex hardcoded | UX | HIGH | Design system quebrado | 2-4 | **P2** |
| TD-UX-008 | Chart colors hardcoded | UX | HIGH | Dark mode charts | 2-4 | **P2** |
| TD-SYS-004 | Cobertura testes 11.6% | Sistema | HIGH | Regressoes | 80-120 | **P2** |
| TD-SYS-005 | Paginas protegidas client-only | Sistema | HIGH | Performance first load | 24-40 | **P2** |
| TD-CC-003 | Sem i18n (fullstack) | Cross-Cut | HIGH | Internacionalizacao | 40-60 | **P2** |
| TD-CC-004 | BoardCreationWizard monolito | Cross-Cut | HIGH | Dependencia CC-001 | 16-24 | **P2** |
| TD-CC-006 | API keys texto plano (DB+App) | Cross-Cut | HIGH | Seguranca | 12-20 | **P2** |
| TD-DB-008 | Naming webhook tables | DB | HIGH | Confusao | 2-4 | **P2** |

*Nota: MEDIUM e LOW omitidos da matriz por brevidade. Total de 27 MEDIUM e 15 LOW listados nas secoes acima.*

---

## 6. Dependencias entre Debitos

### 6.1 Cadeias de Bloqueio

```
TD-CC-001 (CRMContext split)
  |-- bloqueia --> TD-CC-002 (Duplicacao Context + Zustand)
  |-- bloqueia --> TD-CC-004 (BoardCreationWizard decomposicao)
  |-- bloqueia --> TD-UX-002 (Componentes gigantes dependem de CRMContext)
  |-- bloqueia --> TD-SYS-003 (Debug logging esta DENTRO do CRMContext)
  |-- bloqueia --> TD-UX-013 (Optimistic updates centralizados no CRMContext)

TD-DB-001 (notify_deal_stage_changed fix)
  |-- correlato --> TD-DB-008 (Naming inconsistente e causa raiz)
  |-- resolve --> Webhooks outbound (feature inteira)

TD-DB-002 (FKs sem ON DELETE)
  |-- deve ser feito ANTES de --> TD-DB-016 (deals.contact_id FK)
  |-- deve ser feito ANTES de --> TD-DB-024 (boards.organization_id)

TD-SYS-001 (Admin client RLS)
  |-- correlato --> TD-CC-006 (API keys texto plano)
  |-- correlato --> TD-SYS-002 (API keys texto plano)

TD-UX-001 (Button unificacao)
  |-- deve ser feito ANTES de --> TD-UX-016 (SubmitButton duplicado)
  |-- deve ser feito ANTES de --> TD-SYS-019 (ErrorBoundary localizacao)

TD-SYS-005 (SSR paginas protegidas)
  |-- depende de --> TD-CC-001 (CRMContext precisa ser decomposto para SSR)
  |-- depende de --> TD-SYS-014 (Provider nesting)
```

### 6.2 Clusters de Resolucao Conjunta

**Cluster 1: Seguranca DB (8-18h)**
- TD-DB-001 + TD-DB-008 (webhook fix + naming)
- TD-DB-003 (merge_contacts org check)
- TD-DB-004 (ai_suggestion_interactions RLS)
- TD-DB-009 (LTV RPCs org check)

**Cluster 2: CRMContext Refactor (40-64h)**
- TD-CC-001 (split CRMContext)
- TD-SYS-003 (remover debug logging)
- TD-CC-002 (unificar estado)
- TD-UX-013 (expandir optimistic updates)

**Cluster 3: Design System Tokens (8-16h)**
- TD-UX-007 (scrollbar tokens)
- TD-UX-008 (chart tokens)
- TD-UX-010 (cores pre-v4)
- TD-UX-011 (PageLoader tokens)
- TD-UX-018 (background glow)

**Cluster 4: Integridade DB (12-24h)**
- TD-DB-002 (FKs ON DELETE)
- TD-DB-016, TD-DB-017, TD-DB-018, TD-DB-024 (NULLable org_ids)
- TD-DB-019, TD-DB-020, TD-DB-026 (colunas deprecated)

**Cluster 5: Error Handling UX (12-18h)**
- TD-SYS-006 (error.tsx)
- TD-SYS-007 (not-found.tsx)
- TD-SYS-012 (loading.tsx)
- TD-UX-015 (GlobalError design)

---

## 7. Perguntas para Especialistas

### Para @data-engineer:

1. **SEC-03/MIG-01: Alem de corrigir os nomes de tabela em `notify_deal_stage_changed()`, a funcao precisa de mapeamento de campos?** Os campos de `webhook_events_out` e `webhook_deliveries` correspondem 1:1 aos que a funcao tenta inserir, ou ha colunas renomeadas tambem?

2. **INT-01/INT-02: Para deals.board_id e deals.stage_id, a preferencia e ON DELETE SET NULL ou ON DELETE CASCADE?** SET NULL mantem o deal mas perde a referencia; CASCADE deleta o deal junto. Considerando que boards usam soft delete, qual e o comportamento desejado quando um board e hard-deleted via service_role?

3. **DES-06: Para unificar `system_notifications` e `notifications`, qual tabela deve ser a canonica?** `notifications` (Epic 3) parece mais completa. Ha consumers de `system_notifications` que precisam ser migrados?

4. **SEC-04: Na funcao `merge_contacts()`, alem de validar org, existe risco de race condition se dois usuarios tentarem merge simultaneo dos mesmos contatos?** O lock de transacao atual e suficiente?

5. **MIG-02: Para tornar migrations idempotentes retroativamente, a preferencia e criar uma migration corretiva que adiciona `IF NOT EXISTS` nas existentes, ou apenas aplicar o padrao para novas migrations?**

6. **INT-12: Existe plano para remover a coluna `deals.status` (DEPRECATED)?** Se sim, qual migration strategy: DROP direto ou rename com deprecation period?

### Para @ux-design-expert:

1. **DEBT-004: Para decompor FocusContextPanel (109KB), qual e a divisao funcional recomendada?** O painel tem tabs/secoes claras que mapeiam para sub-componentes, ou a logica esta entrelaçada?

2. **DEBT-001: Na unificacao do Button, a variant `unstyled` de `app/components/ui/Button.tsx` deve ser adicionada ao `components/ui/button.tsx` principal, ou e um anti-pattern que deve ser resolvido de outra forma (ex: `Slot` do Radix)?**

3. **DEBT-005: Para i18n, qual biblioteca seria mais adequada dado o stack atual (Next.js 15 App Router)?** `next-intl`, `react-i18next`, ou outra? Considerando que o sistema usa Server Components em potencial futuro.

4. **DEBT-002: Para skeletons, a recomendacao e criar skeletons por feature (ContactsSkeleton, DealsSkeleton) ou um sistema generico parametrizavel?** Dado que cada pagina tem layout distinto.

5. **DEBT-011: Quantos componentes aproximadamente usam cores Tailwind diretas (text-slate-*, bg-gray-*) em vez de tokens semanticos?** Isso ajuda a estimar o esforco de migracao.

6. **DEBT-006: Na decomposicao dos controller hooks, a estrategia recomendada e separar por responsabilidade (queries, mutations, UI logic) ou por sub-feature (ex: useBoardDragDrop, useBoardFilters, useBoardCreate)?**

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @architect (Aria) | DRAFT inicial criado. Consolidacao das 4 fontes de Phase 1-3. 71 debitos catalogados. |

---

> **Proximos passos:**
> - Phase 5: Revisao do @data-engineer (db-specialist-review.md)
> - Phase 6: Revisao do @ux-design-expert (ux-specialist-review.md)
> - Phase 7: QA Gate do @qa (qa-review.md)
> - Phase 8: Assessment final do @architect (technical-debt-assessment.md)
