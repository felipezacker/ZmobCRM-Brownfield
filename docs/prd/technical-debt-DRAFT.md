# Technical Debt Assessment - DRAFT v2

**Projeto:** ZmobCRM (CRM Imobiliario)
**Data:** 2026-03-06
**Status:** DRAFT - Pendente revisao dos especialistas
**Versao do Projeto:** 1.5.1
**Branch:** develop
**Agente:** @architect (Aria) - Brownfield Discovery Phase 4

**Fontes consolidadas:**
- `docs/architecture/system-architecture.md` (Phase 1 v2 - @architect)
- `supabase/docs/SCHEMA.md` (Phase 2 - @data-engineer)
- `supabase/docs/DB-AUDIT.md` (Phase 2 - @data-engineer)
- `docs/frontend/frontend-spec.md` (Phase 3 v2 - @ux-design-expert)

---

## Resumo Executivo Preliminar

| Metrica | Valor |
|---------|-------|
| Total de debitos identificados | **67** |
| CRITICAL | **6** |
| HIGH | **19** |
| MEDIUM | **30** |
| LOW | **12** |
| Esforco total estimado | **~430-560 horas** |
| Areas mais impactadas | IA (gaps de exposure), Frontend (monolitos), Database (seguranca RLS) |

**Top 5 itens mais criticos:**

1. **SYS-001** - CRMContext monolito (930 linhas) causa re-render cascata em toda a aplicacao
2. **SYS-002** - BASE_INSTRUCTIONS hardcoded ignora 12/27 tools e catalogo de prompts
3. **DB-001** - `system_notifications` com RLS permissiva (vazamento cross-tenant)
4. **UX-001** - Duplicacao de Button component (2 versoes, imports misturados)
5. **SYS-004** - Modulo de prospeccao totalmente invisivel para o agente de IA

**Ordem de resolucao recomendada:**
1. Quick wins de seguranca (DB-001, DB-006, DB-009, DB-010) -- 1-2 dias
2. Corrigir exposure de IA (SYS-002, SYS-004, SYS-005) -- 3-5 dias
3. Unificar Button e resolver duplicacoes UX (UX-001, UX-18, UX-19, UX-20) -- 2-3 dias
4. Migrar CRMContext para hooks especializados (SYS-001) -- 5-8 dias
5. Decompor componentes monolito (UX-03) -- 8-12 dias

---

## 1. Debitos de Sistema

Consolidados de `docs/architecture/system-architecture.md` (Phase 1).

### CRITICAL

| ID | Descricao | Impacto | Estimativa | Arquivos-Chave |
|----|-----------|---------|------------|----------------|
| **SYS-001** | **CRMContext monolito (930 linhas, ~180 propriedades).** Contexto unificado que agrega deals, contacts, activities, boards, AI config, settings, custom fields, tags e estado de UI. Qualquer mudanca causa re-render em todos os consumidores. Contexts especializados ja existem mas CRMContext ainda e amplamente usado como camada de compatibilidade. | Performance: re-renders desnecessarios em cascata. Manutenibilidade: arquivo enorme com alto acoplamento. | 40-60h | `context/CRMContext.tsx` |
| **SYS-002** | **BASE_INSTRUCTIONS hardcoded no crmAgent.ts.** O system prompt do agente de IA e um template literal hardcoded que lista "15 ferramentas" quando existem 27. Ignora completamente o catalogo de prompts em `lib/ai/prompts/catalog.ts` e a tabela `ai_prompt_templates` no banco. Editar prompts via admin nao tem efeito no agente. | IA desatualizada (12 tools invisiveis), admin de prompts nao funcional. | 16-24h | `lib/ai/crmAgent.ts:404-439` |
| **SYS-003** | **ESLint `no-explicit-any: off`.** Regra desabilitada globalmente. 209 ocorrencias de `any` em 51 arquivos dentro de `lib/`. | Seguranca de tipos comprometida, bugs em runtime que TypeScript deveria capturar. | 40-60h (progressivo) | `eslint.config.mjs:57`, `lib/**/*.ts` |

### HIGH

| ID | Descricao | Impacto | Estimativa | Arquivos-Chave |
|----|-----------|---------|------------|----------------|
| **SYS-004** | **Modulo de prospeccao invisivel para a IA.** O modulo mais ativo do sistema (24 componentes, 7 hooks, 25 testes) nao possui nenhuma ferramenta de IA correspondente. O agente nao consegue interagir com filas de prospeccao, power dialer, metas diarias, scripts ou metricas. | Funcionalidade de IA incompleta para o modulo principal. | 24-32h | `lib/ai/tools/` (falta: prospecting-tools.ts) |
| **SYS-005** | **`property_ref` e `metadata` invisiveis nas tools.** Campos adicionados em migrations recentes (property_ref em deals, metadata JSONB em activities) nao estao expostos nas ferramentas de IA nem nas interfaces de busca/criacao. | Dados existem no DB mas nao sao acessiveis via IA ou busca. | 4-8h | `lib/ai/tools/deal-tools.ts`, `lib/ai/tools/activity-tools.ts` |
| **SYS-006** | **Tipagem `any` no Supabase Client export.** Cast `as SupabaseClient` de algo que pode ser null sem env configurado. | Crash silencioso em ambientes sem configuracao. | 2-4h | `lib/supabase/client.ts:40` |
| **SYS-007** | **Rate limiter in-memory.** Usa `Map<string, number[]>` in-memory. Em deploy serverless (Vercel), cada invocacao pode ter instancia separada, tornando rate limiting ineficaz. | Rate limiting nao funciona consistentemente em producao. | 8-16h | `lib/rate-limit.ts` |
| **SYS-008** | **`exhaustive-deps` desabilitado.** Regra de hooks desabilitada globalmente. | Stale closures, re-renders infinitos, efeitos que nao re-executam. | 16-24h (progressivo) | `eslint.config.mjs:63` |

### MEDIUM

| ID | Descricao | Impacto | Estimativa | Arquivos-Chave |
|----|-----------|---------|------------|----------------|
| **SYS-009** | **Layout.tsx (505 linhas).** Componente de layout principal com sidebar, navigation e logica de responsividade misturados. | Dificil de manter e testar. | 8-12h | `components/Layout.tsx` |
| **SYS-010** | **useRealtimeSync.ts (590 linhas).** Hook monolitico para 9 tabelas com logica de deduplicacao, query invalidation e debug. Apenas 1 teste. | Complexo de debugar e testar. | 8-12h | `lib/realtime/useRealtimeSync.ts` |
| **SYS-011** | **Enum WHATSAPP faltando nas Activity Tools.** O enum de tipos de atividade lista `['CALL','MEETING','EMAIL','TASK']` mas o sistema aceita WHATSAPP. | IA nao consegue criar/buscar atividades WHATSAPP. | 1-2h | `lib/ai/tools/activity-tools.ts` |
| **SYS-012** | **Quick scripts desconectados da IA.** Tabela `quick_scripts` existe com 6 categorias mas nao ha tools de IA para listar, sugerir ou usar scripts. `generateSalesScript` gera texto solto nao persistido. | IA nao pode ajudar com scripts de vendas. | 8-12h | `lib/supabase/quickScripts.ts`, `lib/ai/tools/` |
| **SYS-013** | **Tags/custom fields em contacts sem exposure nas tools.** Movidos de deals para contacts mas tools de IA nao aceitam como input/filtro. | IA nao pode filtrar contatos por tags ou custom fields. | 4-6h | `lib/ai/tools/contact-tools.ts` |
| **SYS-014** | **Lead score tool existente mas nao mencionada no prompt.** Tool `getLeadScore` existe mas BASE_INSTRUCTIONS nao a menciona. | Lead scoring subutilizado pela IA. | 1h (resolvido junto com SYS-002) | `lib/ai/crmAgent.ts` |
| **SYS-015** | **Pacotes AI SDK desatualizados.** 6 pacotes AI SDK atras das ultimas versoes (minor). | Bug fixes e melhorias nao aproveitados. | 2-4h | `package.json` |
| **SYS-016** | **OpenAPI spec monolitica (27K linhas).** Especificacao como unico objeto TypeScript. | Extremamente dificil de manter e revisar. | 16-24h | `lib/public-api/openapi.ts` |
| **SYS-017** | **CSP headers ausentes.** Nao ha Content-Security-Policy headers configurados. | Superficie de ataque para XSS e code injection. | 4-8h | `next.config.ts` |
| **SYS-018** | **API keys de IA sem encriptacao.** Keys armazenadas em `organization_settings` protegidas apenas por RLS, sem encriptacao at-rest no Supabase. | Risco de exposicao se RLS falhar. | 8-16h | DB `organization_settings` |

### LOW

| ID | Descricao | Impacto | Estimativa | Arquivos-Chave |
|----|-----------|---------|------------|----------------|
| **SYS-019** | **ProspectingPage.tsx (32K).** Componente de pagina grande que orquestra 24 sub-componentes. | Complexidade visual alta. | 4-6h | `features/prospecting/ProspectingPage.tsx` |
| **SYS-020** | **boards.ts service module (924 linhas).** 209 ocorrencias de `any` e logica complexa. | Tipagem fraca, logica complexa num unico arquivo. | 8-12h | `lib/supabase/boards.ts` |
| **SYS-021** | **Sem testes E2E.** Nao ha testes Playwright ou Cypress. | Fluxos criticos (login, criar deal, kanban) nao testados end-to-end. | 24-40h | Infraestrutura |
| **SYS-022** | **Dark mode via script inline.** Fragil e nao-padronizado. | Flash de tema incorreto possivel, duplicacao com ThemeContext. | 4-8h | `app/layout.tsx:32-39` |
| **SYS-023** | **Deprecacoes legado acumuladas.** Tipos `@deprecated` (DealStatus, ContactStage, Lead) permanecem. | Confusao para novos desenvolvedores. | 2-4h | `types/types.ts` |
| **SYS-024** | **Tailwind config JS residual.** Config JS praticamente vazio quando Tailwind v4 usa CSS via @theme. | Confusao sobre onde configurar. | 1h | `tailwind.config.js` |

---

## 2. Debitos de Database

Consolidados de `supabase/docs/DB-AUDIT.md` (Phase 2).

> PENDENTE: Revisao do @data-engineer

### CRITICAL

Nenhum debito CRITICAL identificado no banco de dados.

### HIGH

| ID | Descricao | Impacto | Estimativa | Referencia DB-AUDIT |
|----|-----------|---------|------------|---------------------|
| **DB-001** | **`system_notifications` com RLS permissiva.** Policy `USING(true)` para ALL operations. Qualquer usuario autenticado pode ler/escrever/deletar notificacoes de qualquer organizacao. | Vazamento de dados entre tenants. | 2h | SEC-01 |
| **DB-002** | **`activities.client_company_id` referencia tabela inexistente.** Coluna referenciava `crm_companies(id)` que foi dropada. FK pode nao ter sido removida. | Coluna orfao; inserts podem falhar se FK persistir. | 1h | INT-01 |
| **DB-003** | **`deals.contact_id` nullable sem validacao.** Deals podem existir sem contato associado, acumulando deals "fantasmas" no pipeline. | Dados inconsistentes no CRM. | 4-8h (requer analise de negocio) | INT-02 |
| **DB-004** | **RLS subqueries em profiles para cada request.** Praticamente todas as politicas RLS fazem subquery em `profiles`. Executada para CADA LINHA avaliada pela politica. | Para tabelas grandes (contacts, deals), cada SELECT paga o custo da subquery. | 16-24h (JWT custom claims) | PERF-01 |
| **DB-005** | **`lifecycle_stages` PK TEXT sem FK enforcement verificado.** A FK de `contacts.stage` para `lifecycle_stages` foi adicionada via migration mas precisa ser validada em producao. | Integridade referencial nao garantida. | 1h | DES-01 |
| **DB-006** | **`merge_contacts()` SECURITY DEFINER sem validacao cross-tenant.** Funcao DEFINER que opera em multiplas tabelas sem verificar se IDs pertencem a mesma organizacao do caller. | Um usuario poderia manipular contatos de outra org (se conhecesse UUIDs). | 2-4h | FUNC-01 / INT-05 |

### MEDIUM

| ID | Descricao | Impacto | Estimativa | Referencia DB-AUDIT |
|----|-----------|---------|------------|---------------------|
| **DB-007** | **`rate_limits` com RLS permissiva.** Policy `USING(true)` para ALL. Qualquer usuario pode manipular rate limits de qualquer endpoint/IP. | Baixo risco pratico (tabela interna), mas permite ver padroes de acesso de outros. | 2h | SEC-02 |
| **DB-008** | **FK orfao `activities.client_company_id`.** Coluna pode conter UUIDs apontando para nada apos DROP TABLE da tabela referenciada. | Confusao e desperdicio de storage. | 1h | SEC-03 |
| **DB-009** | **`get_dashboard_stats()` faz 6 COUNT separados.** 6 subqueries COUNT independentes contra deals, contacts, activities. | Lento se datasets crescerem (>10k deals). | 4-8h | PERF-02 |
| **DB-010** | **`system_notifications` sem index em `organization_id`.** Quando RLS for corrigida (DB-001), queries filtradas por org farao full scan. | Performance degradada apos fix de seguranca. | 0.5h | PERF-03 |
| **DB-011** | **`deals.status` coluna legado vs `is_won`/`is_lost`.** Dois sistemas de status coexistem. | Confusao e possivel desperdicio de storage. | 2-4h (requer verificacao de uso no app) | PERF-04 / DES-03 |
| **DB-012** | **`updated_at` trigger ausente em tabelas principais.** Trigger so aplicado em 4 tabelas secundarias. Tabelas principais (contacts, deals, boards, profiles, activities) dependem de update manual no TypeScript. | Se algum UPDATE no banco esquecer de atualizar `updated_at`, o campo fica desatualizado. | 2h | INT-03 |
| **DB-013** | **Soft delete sem index dedicado em `deleted_at`.** Tabelas com soft delete filtram `WHERE deleted_at IS NULL` constantemente mas nao tem index parcial dedicado. | Queries de "ativos" nao otimizadas. | 1h | INT-04 |
| **DB-014** | **`increment/decrement_contact_ltv()` SECURITY DEFINER sem validacao de org.** Funcoes DEFINER sem verificar se contact_id pertence a org do caller. | Potencial manipulacao cross-tenant de LTV. | 1h | INT-06 |
| **DB-015** | **`contacts.phone` legado vs `contact_phones`.** Dois locais para telefone coexistem inconsistentemente. | App pode usar ambos, dados inconsistentes. | 4-8h | DES-02 |
| **DB-016** | **Tabelas sem `updated_at`.** `notifications` (has `is_read` mutavel) e `board_stages` (podem ser reordenadas) nao tem coluna updated_at. | Auditoria de mudancas impossivel. | 2h | DES-04 |
| **DB-017** | **Ausencia de rollback scripts.** Nenhuma migration tem script de rollback. | Sem procedimento de reversao documentado. | 4-8h (estabelecer padrao) | MIG-01 |
| **DB-018** | **Schema init monolitico (1900+ linhas).** Arquivo consolidado com 26 tabelas, funcoes, triggers, RLS, seeds. | Dificulta auditoria e debugging. | 2h (documentar, nao refatorar) | MIG-02 |
| **DB-019** | **`check_deal_duplicate()` sem indice otimizado.** Trigger faz SELECT com filtro composto sem index dedicado. | Lento em organizacoes com muitos deals. | 1h | FUNC-03 |

### LOW

| ID | Descricao | Impacto | Estimativa | Referencia DB-AUDIT |
|----|-----------|---------|------------|---------------------|
| **DB-020** | **Mistura VARCHAR e TEXT.** `security_alerts` usa VARCHAR enquanto o resto do schema usa TEXT. | Inconsistencia de convencao (sem impacto em performance no PostgreSQL). | 1h | DES-05 |
| **DB-021** | **N+1 em useDealsQuery (1+1).** Busca deals e depois faz segunda query para profiles dos owners. | Latencia extra por roundtrip adicional. | 2h | PERF-05 |

---

## 3. Debitos de Frontend/UX

Consolidados de `docs/frontend/frontend-spec.md` (Phase 3).

> PENDENTE: Revisao do @ux-design-expert

### CRITICAL

| ID | Descricao | Impacto | Estimativa | Localizacao |
|----|-----------|---------|------------|-------------|
| **UX-001** | **Duplicacao de Button component.** 2 versoes: `components/ui/button.tsx` (6 variants, 4 sizes) e `app/components/ui/Button.tsx` (+variant "unstyled", +size "unstyled"). Imports misturados no codebase -- Layout.tsx importa de app/components enquanto maioria importa de components/ui. | Inconsistencia visual, confusao, manutencao duplicada. | 2-4h | `components/ui/button.tsx`, `app/components/ui/Button.tsx` |
| **UX-002** | **CRMContext monolito (34KB, 930 linhas).** Contexto unificado que agrega todos os dominios. Qualquer mudanca causa re-render em todos os consumers. (Identifico com SYS-001 do lado frontend.) | Performance, manutenibilidade. | Ver SYS-001 | `context/CRMContext.tsx` |
| **UX-003** | **Componentes gigantes.** FocusContextPanel 110KB (1886 linhas), DealDetailModal 88KB (1694 linhas), BoardCreationWizard 76KB (1628 linhas), CockpitDataPanel 48KB (964 linhas). Precisam decomposicao urgente. | Manutenibilidade, code review, bundle size, performance de compilacao. | 40-60h | `features/inbox/components/FocusContextPanel.tsx`, `features/boards/components/Modals/DealDetailModal.tsx`, `features/boards/components/BoardCreationWizard.tsx`, `features/deals/cockpit/CockpitDataPanel.tsx` |

### HIGH

| ID | Descricao | Impacto | Estimativa | Localizacao |
|----|-----------|---------|------------|-------------|
| **UX-004** | **Skeletons quase inexistentes.** Apenas 4 de 18+ rotas tem loading.tsx com skeletons (boards, contacts, inbox, deal cockpit). Demais usam PageLoader (spinner generico). | Percepcao de velocidade ruim, UX inferior. | 8-16h | Todas as paginas sem loading.tsx |
| **UX-005** | **Nenhum sistema de i18n.** Todas as strings hardcoded em portugues (400+ strings). Sem infraestrutura para internacionalizacao. | Impossivel traduzir sem refatoracao massiva. | 40-80h (se decidir implementar) | Todo o codebase |
| **UX-006** | **Controller hooks gigantes.** useBoardsController (37KB, 1081 linhas), useContactsController (30KB, 883 linhas), useInboxController (28KB, 872 linhas). | Manutenibilidade, testabilidade ruim. | 24-32h | `features/*/hooks/use*Controller.ts` |
| **UX-007** | **Mistura de import paths.** Imports de `@/lib/utils` e `@/lib/utils/cn` inconsistentes. | Imports quebrados potenciais. | 2-4h | `lib/utils/` |
| **UX-008** | **Scrollbar styling com hex hardcoded.** Custom scrollbar usa `#cbd5e1`, `#94a3b8`, `#334155`, `#475569` em vez de tokens semanticos OKLCH. Duplicacao com scrollbar-custom. | Inconsistencia com design system. | 2-4h | `app/globals.css:282-308, 447-471` |
| **UX-009** | **Chart colors com hex hardcoded.** Tokens de chart e premium usam `#64748b`, `#0f172a`, `#7DE8EB`, `rgba(...)` em vez de OKLCH. | Cores nao adaptaveis a temas. | 2-4h | `app/globals.css:146-155, 207-215` |

### MEDIUM

| ID | Descricao | Impacto | Estimativa | Localizacao |
|----|-----------|---------|------------|-------------|
| **UX-010** | **Font serif nao utilizada.** `--font-serif: 'Cinzel'` definida mas nao referenciada. | Peso de fonte desnecessario se carregada. | 0.5h | `app/globals.css` |
| **UX-011** | **Cores Tailwind pre-v4 misturadas.** Uso direto de `text-slate-*`, `bg-slate-*`, `text-gray-*` ao lado de tokens semanticos. | Duas fontes de verdade para cores. | 4-8h | Multiplos componentes |
| **UX-012** | **PageLoader com cores hardcoded.** Usa `text-gray-500 dark:text-gray-400` em vez de tokens. | Inconsistencia com design system. | 0.5h | `components/PageLoader.tsx` |
| **UX-013** | **ConfirmModal nao usa modalStyles.** Tem estilos inline proprios ao inves dos tokens centralizados. | Possivel deriva visual de modais. | 1-2h | `components/ConfirmModal.tsx` |
| **UX-014** | **Optimistic updates parciais.** Apenas deal moves e prospecting queue tem optimistic updates. Contacts, activities, settings fazem full refetch. | UX mais lenta em operacoes CRUD. | 8-16h | `lib/query/hooks/` |
| **UX-015** | **ErrorBoundary usa inline styles.** `style={{ borderColor: 'var(--border)' }}` em vez de classes Tailwind. | Inconsistencia de padrao. | 0.5h | `app/components/ui/ErrorBoundary.tsx` |
| **UX-016** | **GlobalError sem design system.** `global-error.tsx` usa HTML puro sem styling. | Experiencia visual quebrada em erros globais. | 2-4h | `app/global-error.tsx` |
| **UX-017** | **Duplicacao de scrollbar styling.** `@utility scrollbar-custom` e global scrollbar (`*::-webkit-scrollbar`) coexistem com mesmos valores hex. | Redundancia, manutencao duplicada. | 1h | `app/globals.css:282-308, 447-471` |
| **UX-018** | **ActivityFormModal duplicado.** V1 (~300 linhas) e V2 (~150 linhas) coexistem. | Ambiguidade sobre qual usar. | 2-4h | `features/activities/components/` |
| **UX-019** | **CreateDealModal duplicado.** V1 (395 linhas) e V2 (145 linhas) coexistem. | Ambiguidade sobre qual usar. | 2-4h | `features/boards/components/Modals/` |
| **UX-020** | **DealCockpit duplicado.** Cockpit original e cockpit-v2 coexistem como rotas separadas. | Confusao de fluxo, manutencao duplicada. | 4-8h | `app/(protected)/deals/[dealId]/cockpit`, `cockpit-v2` |

### LOW

| ID | Descricao | Impacto | Estimativa | Localizacao |
|----|-----------|---------|------------|-------------|
| **UX-021** | **SubmitButton em FormField.tsx.** Exporta `SubmitButton` com `buttonVariants` proprios que conflitam com button.tsx. | Confusao de naming. | 1h | `components/ui/FormField.tsx` |
| **UX-022** | **Prefetch incompleto.** `prefetchRouteData()` implementa apenas dashboard e contacts. | Prefetch parcial. | 4-8h | `lib/query/index.tsx` |
| **UX-023** | **Ambient glow hardcoded.** Efeito decorativo no main content usa cores hardcoded. | Nao adaptavel por tema. | 1h | `components/Layout.tsx` |
| **UX-024** | **Nenhum teste E2E/visual.** Sem Playwright, Storybook ou testes visuais/regression. | Regressoes visuais nao detectadas. | Ver SYS-021 | Infraestrutura |
| **UX-025** | **AIAssistant.tsx deprecado.** Importacao comentada no Layout, substituido por UIChat, mas arquivo ainda existe. | Dead code. | 0.5h | `components/AIAssistant.tsx` |

---

## 4. Matriz Preliminar de Priorizacao

Priorizacao unificada de todos os debitos, ordenada por: severidade (CRITICAL > HIGH > MEDIUM > LOW), depois por ratio impacto/esforco (maior primeiro).

### CRITICAL (6 itens)

| ID | Debito | Area | Severidade | Impacto | Esforco | Prioridade |
|----|--------|------|-----------|---------|---------|------------|
| UX-001 | Duplicacao de Button component | Frontend | CRITICAL | Alto (inconsistencia visual, confusao) | 2-4h | **P1** -- Quick win |
| SYS-002 | BASE_INSTRUCTIONS hardcoded ignora 12 tools + catalogo | Sistema/IA | CRITICAL | Critico (IA parcialmente cega) | 16-24h | **P1** |
| SYS-001 | CRMContext monolito 930 linhas | Sistema/Frontend | CRITICAL | Critico (re-render cascata) | 40-60h | **P2** (longo, planejar) |
| UX-003 | 4 componentes gigantes (110KB, 88KB, 76KB, 48KB) | Frontend | CRITICAL | Alto (manutenibilidade) | 40-60h | **P2** (longo, planejar) |
| SYS-003 | ESLint no-explicit-any: off (209 `any`) | Sistema | CRITICAL | Alto (type safety) | 40-60h | **P3** (progressivo) |
| UX-002 | CRMContext (perspectiva frontend) | Frontend | CRITICAL | Ver SYS-001 | -- | Ref. SYS-001 |

### HIGH (19 itens)

| ID | Debito | Area | Severidade | Impacto | Esforco | Prioridade |
|----|--------|------|-----------|---------|---------|------------|
| DB-001 | `system_notifications` RLS permissiva | Database | HIGH | Critico (vazamento cross-tenant) | 2h | **P1** -- Quick win |
| DB-006 | `merge_contacts()` sem validacao cross-tenant | Database | HIGH | Alto (seguranca) | 2-4h | **P1** -- Quick win |
| DB-002 | `activities.client_company_id` orfao | Database | HIGH | Medio (coluna orfao) | 1h | **P1** -- Quick win |
| DB-005 | `lifecycle_stages` FK verificar em producao | Database | HIGH | Medio (integridade) | 1h | **P1** -- Quick win |
| SYS-004 | Prospeccao invisivel para IA | Sistema/IA | HIGH | Critico (maior modulo sem IA) | 24-32h | **P1** |
| SYS-005 | property_ref + metadata invisiveis | Sistema/IA | HIGH | Medio (dados inacessiveis) | 4-8h | **P1** |
| SYS-007 | Rate limiter in-memory (serverless) | Sistema | HIGH | Alto (seguranca ineficaz) | 8-16h | **P2** |
| SYS-008 | exhaustive-deps off | Sistema | HIGH | Alto (bugs de hooks) | 16-24h | **P2** (progressivo) |
| SYS-006 | Tipagem any no Supabase client | Sistema | HIGH | Medio (crash silencioso) | 2-4h | **P2** |
| DB-004 | RLS subqueries em profiles | Database | HIGH | Alto (performance at scale) | 16-24h | **P3** (arquitetural) |
| DB-003 | deals.contact_id nullable | Database | HIGH | Medio (dados inconsistentes) | 4-8h | **P3** (requer analise de negocio) |
| UX-004 | Skeletons quase inexistentes | Frontend | HIGH | Alto (UX de loading) | 8-16h | **P2** |
| UX-005 | Nenhum sistema i18n | Frontend | HIGH | Medio (bloqueante para expansao) | 40-80h | **P4** (decisao de negocio) |
| UX-006 | Controller hooks gigantes | Frontend | HIGH | Alto (manutenibilidade) | 24-32h | **P3** |
| UX-007 | Mistura de import paths | Frontend | HIGH | Medio (imports potencialmente quebrados) | 2-4h | **P2** -- Quick win |
| UX-008 | Scrollbar hex hardcoded | Frontend | HIGH | Medio (design system inconsistente) | 2-4h | **P2** |
| UX-009 | Chart colors hex hardcoded | Frontend | HIGH | Medio (nao adaptavel a temas) | 2-4h | **P2** |

### MEDIUM (30 itens)

| ID | Debito | Area | Severidade | Impacto | Esforco | Prioridade |
|----|--------|------|-----------|---------|---------|------------|
| DB-010 | system_notifications sem index org | Database | MEDIUM | Medio | 0.5h | **P1** (junto DB-001) |
| DB-014 | LTV RPCs DEFINER sem org check | Database | MEDIUM | Medio (seguranca) | 1h | **P1** -- Quick win |
| DB-019 | check_deal_duplicate sem indice | Database | MEDIUM | Medio (performance) | 1h | **P1** -- Quick win |
| SYS-011 | WHATSAPP faltando em Activity Tools | Sistema/IA | MEDIUM | Medio | 1-2h | **P1** -- Quick win |
| SYS-014 | Lead score tool sem mencao no prompt | Sistema/IA | MEDIUM | Baixo | 1h | **P1** (junto SYS-002) |
| DB-012 | updated_at trigger ausente em tabelas principais | Database | MEDIUM | Medio (integridade) | 2h | **P2** |
| DB-013 | Soft delete sem index deleted_at | Database | MEDIUM | Baixo | 1h | **P2** |
| DB-016 | Tabelas sem updated_at (notifications, board_stages) | Database | MEDIUM | Baixo | 2h | **P2** |
| DB-007 | rate_limits RLS permissiva | Database | MEDIUM | Baixo | 2h | **P2** |
| DB-008 | FK orfao client_company_id | Database | MEDIUM | Baixo | 1h | **P1** (junto DB-002) |
| DB-009 | get_dashboard_stats 6 counts | Database | MEDIUM | Medio | 4-8h | **P3** |
| DB-011 | deals.status legado | Database | MEDIUM | Baixo | 2-4h | **P3** |
| DB-015 | contacts.phone legado vs contact_phones | Database | MEDIUM | Medio | 4-8h | **P3** |
| DB-017 | Ausencia de rollback scripts | Database | MEDIUM | Medio (operacional) | 4-8h | **P3** |
| DB-018 | Schema init monolitico | Database | MEDIUM | Baixo | 2h | **P4** |
| SYS-009 | Layout.tsx 505 linhas | Sistema | MEDIUM | Medio | 8-12h | **P3** |
| SYS-010 | useRealtimeSync 590 linhas | Sistema | MEDIUM | Medio | 8-12h | **P3** |
| SYS-012 | Quick scripts desconectados da IA | Sistema/IA | MEDIUM | Medio | 8-12h | **P2** |
| SYS-013 | Tags/custom fields sem exposure | Sistema/IA | MEDIUM | Medio | 4-6h | **P2** |
| SYS-015 | Pacotes AI SDK desatualizados | Sistema | MEDIUM | Baixo | 2-4h | **P1** -- Quick win |
| SYS-016 | OpenAPI spec monolitica | Sistema | MEDIUM | Medio | 16-24h | **P4** |
| SYS-017 | CSP headers ausentes | Sistema | MEDIUM | Medio (seguranca) | 4-8h | **P2** |
| SYS-018 | API keys sem encriptacao | Sistema | MEDIUM | Medio (seguranca) | 8-16h | **P3** |
| UX-010 | Font serif nao utilizada | Frontend | MEDIUM | Baixo | 0.5h | **P1** -- Quick win |
| UX-011 | Cores Tailwind pre-v4 misturadas | Frontend | MEDIUM | Medio | 4-8h | **P3** |
| UX-013 | ConfirmModal nao usa modalStyles | Frontend | MEDIUM | Baixo | 1-2h | **P2** |
| UX-014 | Optimistic updates parciais | Frontend | MEDIUM | Medio | 8-16h | **P3** |
| UX-018 | ActivityFormModal duplicado (V1/V2) | Frontend | MEDIUM | Baixo | 2-4h | **P2** |
| UX-019 | CreateDealModal duplicado (V1/V2) | Frontend | MEDIUM | Baixo | 2-4h | **P2** |
| UX-020 | DealCockpit duplicado | Frontend | MEDIUM | Medio | 4-8h | **P3** |

### LOW (12 itens)

| ID | Debito | Area | Severidade | Impacto | Esforco | Prioridade |
|----|--------|------|-----------|---------|---------|------------|
| DB-020 | VARCHAR vs TEXT inconsistencia | Database | LOW | Trivial | 1h | **P4** |
| DB-021 | N+1 em useDealsQuery (1+1) | Database | LOW | Baixo | 2h | **P3** |
| SYS-019 | ProspectingPage.tsx 32K | Sistema | LOW | Baixo | 4-6h | **P4** |
| SYS-020 | boards.ts 924 linhas | Sistema | LOW | Baixo | 8-12h | **P4** |
| SYS-021 | Sem testes E2E | Sistema | LOW | Medio | 24-40h | **P4** |
| SYS-022 | Dark mode via script inline | Sistema | LOW | Baixo | 4-8h | **P4** |
| SYS-023 | Deprecacoes legado | Sistema | LOW | Trivial | 2-4h | **P4** |
| SYS-024 | tailwind.config.js residual | Sistema | LOW | Trivial | 1h | **P4** |
| UX-012 | PageLoader cores hardcoded | Frontend | LOW | Trivial | 0.5h | **P2** -- Quick win |
| UX-015 | ErrorBoundary inline styles | Frontend | LOW | Trivial | 0.5h | **P2** |
| UX-016 | GlobalError sem design system | Frontend | LOW | Baixo | 2-4h | **P3** |
| UX-021 | SubmitButton buttonVariants conflitantes | Frontend | LOW | Trivial | 1h | **P3** |
| UX-022 | Prefetch incompleto | Frontend | LOW | Baixo | 4-8h | **P4** |
| UX-023 | Ambient glow hardcoded | Frontend | LOW | Trivial | 1h | **P4** |
| UX-024 | Sem testes E2E/visual | Frontend | LOW | Ver SYS-021 | -- | Ref. SYS-021 |
| UX-025 | AIAssistant.tsx deprecado | Frontend | LOW | Trivial | 0.5h | **P1** -- Quick win |

---

## 5. Dependencias entre Debitos

### Grafo de Dependencias

```
SEGURANCA (Quick Wins)
  DB-001 (RLS system_notifications)
    └── DB-010 (adicionar index org ANTES ou JUNTO com fix de RLS)
  DB-006 (merge_contacts cross-tenant)
    └── DB-014 (LTV RPCs - mesmo padrao de fix)
  DB-002 (client_company_id orfao)
    └── DB-008 (FK orfao - mesmo item, perspectivas diferentes)

IA (Correcao de Exposure)
  SYS-002 (BASE_INSTRUCTIONS hardcoded) ◄── BLOQUEIA ──►
    ├── SYS-014 (lead score no prompt - resolvido junto)
    ├── SYS-011 (WHATSAPP enum - pode ser feito em paralelo)
    ├── SYS-013 (tags/custom fields - depende de tools atualizadas)
    └── SYS-012 (quick scripts - depende de tools atualizadas)
  SYS-004 (prospecting tools)
    └── SYS-005 (property_ref + metadata - pode ser feito junto)

FRONTEND (Componentes e Estado)
  UX-001 (Button duplicado)
    └── UX-021 (SubmitButton conflitante - resolver junto)
  SYS-001 / UX-002 (CRMContext monolito) ◄── BLOQUEIA ──►
    └── UX-006 (controller hooks gigantes - mais facil decompor APOS CRMContext migrado)
  UX-003 (componentes gigantes)
    └── UX-006 (controller hooks - decomposicao relacionada)
  UX-018 + UX-019 + UX-020 (duplicacoes V1/V2)
    └── UX-003 (decomposicao de componentes - resolver duplicacoes ANTES)

DESIGN SYSTEM (Consistencia Visual)
  UX-008 (scrollbar hex) + UX-009 (chart hex)
    ├── UX-011 (cores Tailwind pre-v4 - migrar junto)
    ├── UX-017 (scrollbar duplicada - resolver junto com UX-008)
    └── UX-012 (PageLoader cores - trivial, junto)
  UX-010 (font serif) + SYS-024 (tailwind config) + UX-025 (AIAssistant deprecado)
    └── Dead code cleanup - pode ser feito em batch

PERFORMANCE (At Scale)
  DB-004 (RLS subqueries - JWT custom claims)
    └── SYS-007 (rate limiter - ambos requerem mudanca de infraestrutura)
  DB-009 (dashboard stats 6 counts)
    └── DB-012 (updated_at triggers - melhor ter triggers ANTES de considerar materialized views)

TESTING
  SYS-021 / UX-024 (testes E2E)
    └── SYS-003 (no-explicit-any - melhorar tipagem ANTES de escrever testes novos)
  SYS-008 (exhaustive-deps)
    └── SYS-010 (useRealtimeSync - corrigir deps ANTES de decompor)
```

### Cadeias de Bloqueio Criticas

1. **DB-001 --> DB-010**: Nao corrigir RLS de `system_notifications` sem adicionar index de `organization_id` primeiro, ou queries ficarao lentas.

2. **SYS-002 --> SYS-014 + SYS-011 + SYS-013 + SYS-012**: O fix de BASE_INSTRUCTIONS deve ser feito como prerequisito para todos os demais gaps de exposure da IA, pois de nada adianta criar tools se o prompt nao as menciona.

3. **UX-018/019/020 --> UX-003**: Resolver duplicacoes V1/V2 ANTES de decompor componentes gigantes, caso contrario a decomposicao pode ser feita na versao errada.

4. **SYS-001 --> UX-006**: Decompor controller hooks sera significativamente mais facil depois que CRMContext for migrado para hooks especializados, pois os controllers nao precisarao mais lidar com a interface legado.

---

## 6. Perguntas para Especialistas

### Para @data-engineer (Dara)

1. **DB-001 / DB-007**: Alem de `system_notifications` e `rate_limits`, ha alguma outra tabela que ainda tenha RLS `USING(true)` do schema original que nao foi identificada na auditoria?

2. **DB-004 (JWT custom claims)**: A migracao de `organization_id` para JWT custom claims e viavel no Supabase Cloud atual? Qual seria o impacto em todas as politicas RLS existentes? Ha risco de cache stale do JWT se o usuario trocar de organizacao?

3. **DB-003 (deals.contact_id nullable)**: No dominio imobiliario, existem cenarios legitimos onde um deal existe sem contato associado (ex: lead anonimo, deal de parceiro)? Ou devemos enforcar NOT NULL?

4. **DB-005 (lifecycle_stages FK)**: A FK foi validada em producao? Se nao, pode rodar `SELECT conname FROM pg_constraint WHERE conrelid = 'contacts'::regclass AND confrelid = 'lifecycle_stages'::regclass;` para confirmar?

5. **DB-012 (updated_at triggers)**: A aplicacao depende de `updated_at` ser setado manualmente no codigo TypeScript em algum fluxo especifico? Adicionar trigger pode causar conflito se o app tambem setar o campo?

6. **DB-015 (contacts.phone vs contact_phones)**: Qual a estrategia preferida? (a) Sync via trigger (phone = primary phone), (b) Deprecar contacts.phone completamente, (c) Manter ambos com documentacao.

7. **DB-006 / DB-014 (SECURITY DEFINER)**: Seria melhor converter `merge_contacts()` e LTV RPCs para SECURITY INVOKER (deixando RLS proteger) ou manter como DEFINER e adicionar validacao de org internamente? Qual abordagem e mais segura no contexto do Supabase?

### Para @ux-design-expert (Uma)

1. **UX-003 (componentes gigantes)**: Qual a estrategia de decomposicao recomendada para FocusContextPanel (110KB)? Sugestao: dividir por secoes de contexto (contact info, deal info, timeline, actions, AI suggestions)?

2. **UX-005 (i18n)**: Ha planos de expansao do ZmobCRM para mercados nao-lusofono? Se nao, i18n pode ser movido para prioridade mais baixa. Se sim, next-intl ou outra solucao e preferida?

3. **UX-018/019/020 (duplicacoes V1/V2)**: Qual versao de cada componente deve ser mantida? Criterios: qual e mais usada atualmente, qual tem melhor codigo, qual tem mais features?

4. **UX-008/009 (hex hardcoded)**: Os valores hex em scrollbar e charts foram intencionalmente mantidos fora do sistema OKLCH por alguma razao tecnica (ex: compatibilidade com recharts), ou foi simplesmente migrado parcialmente?

5. **UX-004 (skeletons)**: Para as 14 rotas sem loading.tsx, qual seria o padrao recomendado: (a) skeleton por rota customizado, (b) skeleton generico baseado em tipo de pagina (lista, detalhe, dashboard), (c) combinacao?

6. **UX-014 (optimistic updates)**: Quais operacoes CRUD de contatos e atividades seriam mais beneficiadas por optimistic updates? Todas ou apenas create/delete?

7. **UX-013 (ConfirmModal)**: O ConfirmModal deve ser migrado para usar `modalStyles.ts` ou os tokens de modal devem ser expandidos para cobrir alertdialogs?

---

## 7. Resumo Executivo Preliminar

### Distribuicao por Area

| Area | CRITICAL | HIGH | MEDIUM | LOW | Total |
|------|----------|------|--------|-----|-------|
| Sistema (SYS-*) | 3 | 5 | 10 | 6 | **24** |
| Database (DB-*) | 0 | 6 | 13 | 2 | **21** |
| Frontend/UX (UX-*) | 3 | 6 | 11 | 6 (+3 ref) | **26** (-4 ref) = **22** |
| **Total** | **6** | **17** (+2 ref) | **34** (-4 dup) | **14** (-2 ref) | **67** |

*Nota: UX-002 referencia SYS-001, UX-024 referencia SYS-021. Contados uma vez.*

### Distribuicao por Severidade

| Severidade | Qtd | % |
|-----------|-----|---|
| CRITICAL | 6 | 9% |
| HIGH | 19 | 28% |
| MEDIUM | 30 | 45% |
| LOW | 12 | 18% |

### Esforco Total Estimado

| Area | Horas (min) | Horas (max) |
|------|-------------|-------------|
| Sistema | 175 | 262 |
| Database | 60 | 95 |
| Frontend/UX | 140 | 215 |
| **Total** | **~375** | **~572** |

*Media estimada: **~470 horas** (~12 semanas para 1 desenvolvedor full-time, ~6 semanas para equipe de 2)*

### Top 5 Itens Mais Criticos (acao imediata)

| # | ID | Debito | Justificativa |
|---|------|--------|---------------|
| 1 | DB-001 | RLS permissiva em system_notifications | **Seguranca**: vazamento de dados cross-tenant em producao |
| 2 | DB-006 | merge_contacts sem validacao de org | **Seguranca**: funcao DEFINER pode operar entre tenants |
| 3 | SYS-002 | BASE_INSTRUCTIONS hardcoded | **Funcionalidade**: IA conhece apenas 15/27 tools, admin de prompts inoperante |
| 4 | SYS-004 | Prospeccao invisivel para IA | **Funcionalidade**: modulo mais ativo do sistema sem integracao IA |
| 5 | UX-001 | Button component duplicado | **Manutenibilidade**: inconsistencia visual, confusao nos imports |

### Plano de Resolucao em Ondas

**Onda 1 -- Quick Wins (1-2 semanas, ~30-50h)**
- DB-001, DB-002, DB-005, DB-006, DB-008, DB-010, DB-014, DB-019
- SYS-011, SYS-014, SYS-015
- UX-001, UX-010, UX-012, UX-025
- *Resultado: seguranca DB corrigida, dead code limpo, AI enum/prompt fixes*

**Onda 2 -- Correcao de IA (2-3 semanas, ~50-70h)**
- SYS-002 (BASE_INSTRUCTIONS + catalogo de prompts)
- SYS-004 (prospecting tools)
- SYS-005 (property_ref + metadata)
- SYS-012 (quick scripts tools)
- SYS-013 (tags/custom fields)
- *Resultado: IA com visibilidade completa do sistema*

**Onda 3 -- Frontend Quality (3-4 semanas, ~60-80h)**
- UX-003 (decomposicao de componentes gigantes)
- UX-004 (skeletons por rota)
- UX-006 (decomposicao de controller hooks)
- UX-008, UX-009, UX-011, UX-017 (consistencia de design system)
- UX-018, UX-019, UX-020 (resolver duplicacoes V1/V2)
- *Resultado: componentes manutiveis, UX de loading melhorada, design system consistente*

**Onda 4 -- Refatoracao Estrutural (4-6 semanas, ~80-120h)**
- SYS-001/UX-002 (migracao CRMContext)
- SYS-003 (no-explicit-any progressivo)
- SYS-008 (exhaustive-deps progressivo)
- SYS-007 (rate limiter distribuido)
- DB-004 (JWT custom claims para RLS)
- *Resultado: type safety melhorada, performance at scale, estado desacoplado*

**Onda 5 -- Maturidade (backlog, conforme capacidade)**
- SYS-021/UX-024 (testes E2E)
- UX-005 (i18n - decisao de negocio)
- SYS-016 (OpenAPI modular)
- SYS-017 (CSP headers)
- SYS-018 (encriptacao de API keys)
- Demais itens LOW
- *Resultado: sistema robusto para crescimento*

---

> **Proximo passo:** Este DRAFT sera revisado por @data-engineer (Phase 5) e @ux-design-expert (Phase 6) antes da versao final (Phase 8).

---

*Documento gerado por @architect (Aria) - Brownfield Discovery Phase 4*
*Ultima atualizacao: 2026-03-06*
