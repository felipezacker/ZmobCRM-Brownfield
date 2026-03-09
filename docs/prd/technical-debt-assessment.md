# Technical Debt Assessment - FINAL

**Projeto:** ZmobCRM (CRM Imobiliario)
**Data:** 2026-03-06
**Versao:** 2.0 (Final)
**Versao do Projeto:** 1.5.1
**Branch:** develop
**Status:** Aprovado pelo QA Gate (Phase 7 v2)
**Agente:** @architect (Aria) - Brownfield Discovery Phase 8

**Fontes consolidadas:**
- `docs/architecture/system-architecture.md` (Phase 1 v2 - @architect)
- `supabase/docs/SCHEMA.md` (Phase 2 - @data-engineer)
- `supabase/docs/DB-AUDIT.md` (Phase 2 - @data-engineer)
- `docs/frontend/frontend-spec.md` (Phase 3 v2 - @ux-design-expert)
- `docs/prd/technical-debt-DRAFT.md` (Phase 4 v2 - @architect)
- `docs/reviews/db-specialist-review.md` (Phase 5 v2 - @data-engineer)
- `docs/reviews/ux-specialist-review.md` (Phase 6 v2 - @ux-design-expert)
- `docs/reviews/qa-review.md` (Phase 7 v2 - @qa)

---

## Resumo Executivo

| Metrica | Valor |
|---------|-------|
| Total de debitos ativos | **73** |
| CRITICAL | **4** |
| HIGH | **16** |
| MEDIUM | **26** |
| LOW | **27** |
| Esforco total estimado | **~420-590 horas** |
| Debitos do DRAFT removidos (ja corrigidos) | 5 (DB-001, DB-002, DB-005, DB-008, DB-010) |
| Debitos novos adicionados pelos especialistas | 11 (DB-022~DB-025, UX-026~UX-032) |
| Ajustes de severidade aplicados | 22 (6 DB + 8 UX rebaixamentos, 2 DB + 2 UX elevacoes, 4 novos DB + 7 novos UX classificados) |
| Areas mais impactadas | IA (gaps de exposure), Frontend (monolitos + design system), Database (SECURITY DEFINER) |

**Top 5 itens mais criticos:**

| # | ID | Debito | Justificativa |
|---|------|--------|---------------|
| 1 | DB-006 | `merge_contacts()` SECURITY DEFINER sem validacao cross-tenant | Seguranca: funcao bypassa RLS, permite manipulacao de contatos entre organizacoes. UNICO debito genuinamente CRITICAL no banco |
| 2 | SYS-002 | BASE_INSTRUCTIONS hardcoded ignora 12/27 tools e catalogo de prompts | Funcionalidade: IA conhece apenas 15/27 tools, admin de prompts inoperante |
| 3 | SYS-001 | CRMContext monolito (930 linhas, ~180 propriedades) | Performance: re-render cascata em toda a aplicacao a cada mudanca de estado |
| 4 | SYS-003 | ESLint `no-explicit-any: off` (209 ocorrencias em 51 arquivos) | Seguranca de tipos: bugs em runtime que TypeScript deveria capturar |
| 5 | SYS-004 | Modulo de prospeccao invisivel para IA | Funcionalidade: modulo mais ativo do sistema (24 componentes) sem integracao IA |

**Recomendacao principal:** Corrigir DB-006 (`merge_contacts()`) imediatamente como migration de emergencia. E o unico debito com risco de exploracaoo cross-tenant ativo em producao. Esforco: 3 horas. Em paralelo, iniciar a Onda 1 (seguranca + dead code cleanup).

---

## Metodologia

### Processo Multi-Fase

O assessment foi conduzido atraves do workflow Brownfield Discovery em 8 fases:

| Fase | Agente | Entrega | Escopo |
|------|--------|---------|--------|
| 1 | @architect (Aria) | `system-architecture.md` v2 | Arquitetura de sistema, stack, debitos de sistema |
| 2 | @data-engineer (Dara) | `SCHEMA.md` + `DB-AUDIT.md` | Schema de banco, auditoria de seguranca/performance/integridade |
| 3 | @ux-design-expert (Uma) | `frontend-spec.md` v2 | Componentes, design system, acessibilidade, padroes UX |
| 4 | @architect (Aria) | `technical-debt-DRAFT.md` v2 | Consolidacao de 67 debitos, priorizacao preliminar, grafo de dependencias |
| 5 | @data-engineer (Dara) | `db-specialist-review.md` v2 | Validacao contra 54 migrations, remocao de 5 falsos positivos, 4 debitos novos |
| 6 | @ux-design-expert (Uma) | `ux-specialist-review.md` v2 | Validacao quantitativa contra codebase, 7 debitos novos, inversao Button documentada |
| 7 | @qa (Quinn) | `qa-review.md` v2 | QA gate: verificacao cruzada, analise OWASP, riscos cruzados, metricas. Gate: APPROVED |
| 8 | @architect (Aria) | **Este documento** | Consolidacao final com todos os ajustes |

### Criterios de Classificacao

**Severidade:**
- **CRITICAL**: Risco de seguranca ativo em producao OU impacto em cascata que bloqueia multiplas areas
- **HIGH**: Impacto significativo em funcionalidade, performance ou manutenibilidade
- **MEDIUM**: Impacto moderado, resolucao desejavel mas nao urgente
- **LOW**: Impacto minimo ou cosmético, resolucao quando conveniente

**Prioridade (P1-P5):**
- **P1**: Acao imediata (quick wins ou seguranca critica)
- **P2**: Proximo sprint/onda
- **P3**: Planejamento necessario (dependencias tecnicas ou decisoes de negocio)
- **P4**: Backlog
- **P5**: Adiado com justificativa (condicao para reativacao documentada)

---

## Inventario Completo de Debitos

### 1. Sistema (validado por @architect)

24 debitos. Nenhum ajuste de severidade pelos especialistas (escopo exclusivo do architect).

#### CRITICAL (3)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| SYS-001 | CRMContext monolito (930 linhas, ~180 propriedades). Contexto unificado que agrega deals, contacts, activities, boards, AI config, settings, custom fields, tags e estado de UI. Qualquer mudanca causa re-render em todos os consumidores. | Performance: re-renders cascata. Manutenibilidade: arquivo monolito com alto acoplamento. | 40-60 | P2 | Requer cobertura minima de testes antes (RC-03) |
| SYS-002 | BASE_INSTRUCTIONS hardcoded no crmAgent.ts. System prompt do agente IA lista "15 ferramentas" quando existem 27. Ignora catalogo `lib/ai/prompts/catalog.ts` e tabela `ai_prompt_templates`. Admin de prompts nao funcional. | IA desatualizada (12 tools invisiveis), admin de prompts inoperante. | 16-24 | P1 | Bloqueia SYS-014, SYS-011, SYS-013, SYS-012 |
| SYS-003 | ESLint `no-explicit-any: off` globalmente. 209 ocorrencias de `any` em 51 arquivos dentro de `lib/`. | Seguranca de tipos comprometida, bugs em runtime. | 40-60 (progressivo) | P3 | Nenhuma |

#### HIGH (5)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| SYS-004 | Modulo de prospeccao totalmente invisivel para IA. 24 componentes, 7 hooks, 25 testes, sem nenhuma tool de IA correspondente. | IA nao interage com filas, power dialer, metas, scripts, metricas. | 24-32 | P1 | DB-006 deve ser corrigido ANTES (RC-01) |
| SYS-005 | `property_ref` (deals) e `metadata` JSONB (activities) invisiveis nas tools de IA. Campos existem no DB mas nao sao acessiveis. | Dados inacessiveis via IA ou busca. | 4-8 | P1 | Pode ser feito junto com SYS-004 |
| SYS-006 | Tipagem `any` no Supabase Client export. Cast `as SupabaseClient` de valor potencialmente null. | Crash silencioso em ambientes sem configuracao. | 2-4 | P2 | Nenhuma |
| SYS-007 | Rate limiter in-memory (`Map<string, number[]>`). Em deploy serverless (Vercel), cada invocacao pode ter instancia separada. | Rate limiting nao funciona consistentemente em producao. | 8-16 | P2 | Nenhuma (independente de DB-004) |
| SYS-008 | `exhaustive-deps` desabilitado globalmente. | Stale closures, re-renders infinitos, efeitos nao re-executados. | 16-24 (progressivo) | P2 | SYS-010 (corrigir deps antes de decompor) |

#### MEDIUM (10)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| SYS-009 | Layout.tsx (505 linhas). Sidebar, navigation e logica de responsividade misturados. | Dificil de manter e testar. | 8-12 | P3 | Nenhuma |
| SYS-010 | useRealtimeSync.ts (590 linhas). Hook monolitico para 9 tabelas. Apenas 1 teste. | Complexo de debugar e testar. | 8-12 | P3 | SYS-008 (exhaustive-deps primeiro) |
| SYS-011 | Enum WHATSAPP faltando em Activity Tools. Enum lista `['CALL','MEETING','EMAIL','TASK']` mas sistema aceita WHATSAPP. | IA nao cria/busca atividades WHATSAPP. | 1-2 | P1 (quick win) | Pode ser feito em paralelo com SYS-002 |
| SYS-012 | Quick scripts desconectados da IA. Tabela `quick_scripts` com 6 categorias sem tools de IA. `generateSalesScript` nao persiste. | IA nao ajuda com scripts de vendas. | 8-12 | P2 | SYS-002 (BASE_INSTRUCTIONS primeiro) |
| SYS-013 | Tags/custom fields em contacts sem exposure nas tools de IA. | IA nao filtra contatos por tags ou custom fields. | 4-6 | P2 | SYS-002 (BASE_INSTRUCTIONS primeiro) |
| SYS-014 | Lead score tool existente mas nao mencionada no prompt. | Lead scoring subutilizado pela IA. | 0 (resolvido junto com SYS-002) | P1 | SYS-002 |
| SYS-015 | Pacotes AI SDK desatualizados (6 pacotes minor atras). | Bug fixes e melhorias nao aproveitados. | 2-4 | P1 (quick win) | Nenhuma |
| SYS-016 | OpenAPI spec monolitica (27K linhas). | Dificil de manter e revisar. | 16-24 | P4 | Nenhuma |
| SYS-017 | CSP headers ausentes. Sem Content-Security-Policy configurado. | Superficie de ataque para XSS e code injection. | 4-8 | P2 | Nenhuma |
| SYS-018 | API keys de IA sem encriptacao at-rest. Keys em `organization_settings` protegidas apenas por RLS. | Risco de exposicao se RLS falhar. | 8-16 | P3 | Nenhuma |

#### LOW (6)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| SYS-019 | ProspectingPage.tsx (32K). Pagina grande que orquestra 24 sub-componentes. | Complexidade visual alta. | 4-6 | P4 | Nenhuma |
| SYS-020 | boards.ts service module (924 linhas, 209 ocorrencias `any`). | Tipagem fraca, logica complexa. | 8-12 | P4 | Nenhuma |
| SYS-021 | Sem testes E2E. Nenhum Playwright ou Cypress. | Fluxos criticos nao testados end-to-end. | 24-40 | P4 | Nenhuma |
| SYS-022 | Dark mode via script inline. Fragil e nao-padronizado. | Flash de tema incorreto possivel. | 4-8 | P4 | Nenhuma |
| SYS-023 | Deprecacoes legado acumuladas. Tipos `@deprecated` permanecem. | Confusao para novos desenvolvedores. | 2-4 | P4 | Nenhuma |
| SYS-024 | Tailwind config JS residual. Config JS vazio, Tailwind v4 usa CSS via @theme. | Confusao sobre onde configurar. | 1 | P4 | Nenhuma |

---

### 2. Database (validado por @data-engineer)

20 debitos ativos (21 originais - 5 removidos + 4 adicionados). Estimativa total ajustada: ~64 horas.

**Debitos removidos (ja corrigidos em migrations):**
- ~~DB-001~~ (`system_notifications` RLS permissiva) -- corrigido em `20260223100000_rls_remaining_tables.sql`
- ~~DB-002~~ (`activities.client_company_id` orfao) -- corrigido em `20260220100000_remove_companies_and_roles.sql`
- ~~DB-005~~ (`lifecycle_stages` FK) -- corrigido em `20260224000006_db015_fk_contacts_stage.sql`
- ~~DB-008~~ (duplicata de DB-002) -- corrigido na mesma migration
- ~~DB-010~~ (`system_notifications` sem index org) -- corrigido em `20260223100000_rls_remaining_tables.sql`

#### CRITICAL (1)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| DB-006 | `merge_contacts()` SECURITY DEFINER sem validacao cross-tenant. Funcao obtem `v_org_id` do loser mas NAO verifica se caller pertence a essa org nem se winner pertence a mesma org. Bypassa RLS completamente. | Qualquer usuario com UUIDs validos pode mesclar contatos de outra organizacao. | 3 | **P0 (emergencia)** | Nenhuma -- corrigir imediatamente |

#### HIGH (5)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| DB-003 | `deals.contact_id` nullable sem validacao. Deals existem sem contato, acumulando "fantasmas" no pipeline. | Dados inconsistentes. [AUTO-DECISION] Manter nullable (cenarios validos: lead anonimo, deal de parceiro, importacao em massa). | 6 | P3 | Requer decisao de negocio |
| DB-004 | RLS subqueries em profiles para cada request. `(SELECT organization_id FROM profiles WHERE id = auth.uid())` em dezenas de policies. | Custo O(n * subquery) em cada SELECT filtrado por RLS. | 20 | P3 (arquitetural) | Auth hook setup, reescrita de 50+ policies |
| DB-014 | `increment/decrement_contact_ltv()` SECURITY DEFINER sem validacao de org. Elevado de MEDIUM. | Manipulacao cross-tenant de LTV. | 1 | P1 (quick win) | Nenhuma (converter para INVOKER) |
| DB-022 | `get_dashboard_stats()` SECURITY DEFINER sem necessidade. Recebe `p_organization_id` como parametro sem validar ownership. NOVO. | Qualquer usuario pode obter metricas de outra org. | 1 | P1 (quick win) | Nenhuma (converter para INVOKER) |
| DB-025 | `merge_contacts()` usa `EXECUTE format(... || ...)` com concatenacao de set clauses. Anti-padrao de SQL dinamico. NOVO. | Embora `%I/%L` sejam seguros contra injection classico, padrao e fragil. | 2 | P1 | Resolver junto com DB-006 |

#### MEDIUM (7)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| DB-007 | `rate_limits` com RLS permissiva `USING(true)`. UNICA tabela remanescente com RLS permissiva. | Qualquer usuario pode ver padroes de acesso de outros. | 2 | P2 | Nenhuma |
| DB-009 | `get_dashboard_stats()` faz 6 COUNT separados. 4 de 6 escaneiam `deals` com filtros diferentes. | Lento se datasets crescerem (>10K deals). | 6 | P3 | DB-022 (converter para INVOKER primeiro) |
| DB-012 | `updated_at` trigger ausente em tabelas principais. Trigger existe em 4 tabelas secundarias. 16+ locais no TypeScript setam manualmente. | Se UPDATE no banco esquecer `updated_at`, campo fica desatualizado. Trigger sobrescreve valor do app (sem conflito). | 2 | P2 | Nenhuma |
| DB-015 | `contacts.phone` legado vs `contact_phones`. Sync manual em TypeScript (`contacts.ts:837`). | Dados inconsistentes entre phone e contact_phones. Recomendacao: sync via trigger. | 4 | P3 | DB-012 (triggers de updated_at primeiro) |
| DB-017 | Ausencia de rollback scripts. Nenhuma das 54 migrations tem rollback. | Sem procedimento de reversao documentado. | 6 | P3 | Nenhuma |
| DB-019 | `check_deal_duplicate()` sem indice otimizado. Filtra `contact_id + stage_id + deleted_at IS NULL + is_won/is_lost`. | Lento em orgs com muitos deals. | 1 | P1 (quick win) | Nenhuma |
| DB-024 | Politicas RLS de `system_notifications` nao incluem INSERT explicito. Omissao intencional (server-side only), mas nao explicita. NOVO. | RLS enabled sem policy = INSERT negado por padrao (correto, mas nao explicito). | 0.5 | P2 | Nenhuma |

#### LOW (7)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| DB-011 | `deals.status` coluna legado vs `is_won`/`is_lost`. Rebaixado de MEDIUM (coluna nao usada em nenhum `.ts`). | Dead column, sem impacto funcional. | 2 | P4 | Nenhuma |
| DB-013 | Soft delete sem index dedicado em `deleted_at`. Rebaixado de MEDIUM (`idx_deals_open` ja cobre principal uso). | Beneficio marginal no volume atual. | 1 | P4 | Nenhuma |
| DB-016 | `notifications` e `board_stages` sem `updated_at`. Rebaixado de MEDIUM (impacto real baixo). | Auditoria impossivel nessas tabelas. | 2 | P4 | Nenhuma |
| DB-018 | Schema init monolitico (1900+ linhas). Rebaixado de MEDIUM (artefato historico, SCHEMA.md ja documenta). | 0 horas -- nao agir. | 0 | P4 | N/A |
| DB-020 | Mistura VARCHAR e TEXT. Apenas `security_alerts` usa VARCHAR. | Inconsistencia de convencao (sem impacto no PostgreSQL). | 1 | P4 | Nenhuma |
| DB-021 | N+1 em useDealsQuery (1+1). Roundtrip extra para profiles dos owners. | Latencia extra por roundtrip. | 2 | P3 | Nenhuma |
| DB-023 | `rate_limits` sem `organization_id` para isolamento multi-tenant. NOVO. | Rate limits globais, nao por tenant. Impacto pratico baixo (single-tenant de fato). | 2 | P4 | Nenhuma |

---

### 3. Frontend/UX (validado por @ux-design-expert)

32 debitos ativos (25 originais + 7 adicionados, 0 removidos). Estimativa total ajustada: ~180-280 horas (excluindo UX-005 i18n).

**Correcao importante (UX-001):** A situacao do Button e INVERSA ao descrito no DRAFT v2. 130 arquivos importam `@/app/components/ui/Button` (a copia) e apenas 2 importam `@/components/ui/button` (o original shadcn). Na pratica, a copia e o Button real do sistema. O fix e adicionar variants `unstyled` ao original e migrar 130+ imports.

#### CRITICAL (3)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| UX-001 | Duplicacao de Button component. 2 versoes coexistem. 130 arquivos usam a copia (`@/app/components/ui/Button`), 2 usam o original (`@/components/ui/button`). Diferenca: variants `unstyled`. | Inconsistencia visual, confusao nos imports, manutencao duplicada. | 3-4 | P1 (quick win) | Nenhuma. Desbloqueia UX-003, UX-021, UX-026. |
| UX-002 | CRMContext monolito (34KB, 930 linhas). Referencia direta ao SYS-001. | Performance: re-renders em cascata visivel como lentidao. | Ver SYS-001 | -- | Ref. SYS-001 |
| UX-003 | 4 componentes gigantes: FocusContextPanel (1886 linhas), DealDetailModal (1694 linhas), BoardCreationWizard (1628 linhas), CockpitDataPanel (964 linhas). 322KB de TSX nos 4 arquivos. | Manutenibilidade, bundle size, code splitting impossivel, tempo de compilacao. | 40-60 | P2 | UX-001 (Button unificado primeiro) |

#### HIGH (7)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| UX-004 | Skeletons quase inexistentes. 4 de 17 paginas protegidas tem loading.tsx com skeleton. 13 usam PageLoader (spinner generico). | Percepcao de velocidade ruim. | 12-20 | P2 | Nenhuma |
| UX-006 | Controller hooks gigantes. useBoardsController (1081 linhas), useContactsController (883 linhas), useInboxController (872 linhas). | Re-renders desnecessarios, baixa testabilidade. | 24-32 | P3 | SYS-001 (CRMContext migrado primeiro) |
| UX-009 | Chart colors com hex hardcoded (`#64748b`, `#0f172a`, `#f8fafc`, `rgba(...)`). Charts sao elementos centrais no dashboard. | Cores nao adaptaveis a temas. Inconsistencia visual perceptivel. | 3-4 | P2 | Nenhuma |
| UX-011 | Cores Tailwind pre-v4 misturadas. Elevado de MEDIUM. Escala massiva: 2000+ ocorrencias de `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*` em todo o codebase. | Duas fontes de verdade para cores. Problema estrutural do design system. | 12-16 | P3 | UX-024 (testes visuais primeiro, RC-04) |
| UX-026 | Overlay background inconsistente em modais. `modalStyles.ts` usado em apenas 3 de 20+ modais. ConfirmModal usa `bg-slate-900/60` vs padrao `bg-background/60`. NOVO. | Inconsistencia visual em modais. | 4-6 | P2 | UX-001 (Button unificado primeiro) |
| UX-028 | Ausencia de error.tsx por route segment. 0 de 17 paginas protegidas tem `error.tsx` dedicado. NOVO. | Erro em qualquer feature derruba toda a pagina com ErrorBoundary generico. | 8-12 | P2 | Nenhuma |
| UX-029 | Ausencia de not-found.tsx customizado. Nao existe `not-found.tsx` nas rotas protegidas. NOVO. | 404 generica do Next.js sem branding. | 3-4 | P2 | Nenhuma |

#### MEDIUM (12)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| UX-005 | Nenhum sistema i18n. 400+ strings hardcoded em PT-BR. Rebaixado de HIGH (sem demanda imediata). | Bloqueante para expansao internacional. | 40-80 | P5 (adiado) | Condicao: primeiro cliente internacional |
| UX-007 | Mistura de import paths (`@/lib/utils` e `@/lib/utils/cn`). Rebaixado de HIGH (DX only). | Problema de DX, impacto zero para usuario. | 2-4 | P2 | Nenhuma |
| UX-008 | Scrollbar styling com hex hardcoded. Rebaixado de HIGH (elemento periferico). | Inconsistencia com design system, impacto visual limitado. | 2-3 | P2 | Resolver junto com UX-017 |
| UX-013 | ConfirmModal nao usa modalStyles. Usa `bg-slate-900/60` como overlay. | Possivel deriva visual de modais. | 2-3 | P2 | UX-026 (padronizar overlays primeiro) |
| UX-014 | Optimistic updates parciais. Apenas deal moves e prospecting queue. Contacts/activities fazem full refetch. | UX mais lenta em operacoes CRUD. | 8-16 | P3 | Nenhuma |
| UX-016 | GlobalError sem design system. HTML puro sem estilo. Renderiza FORA do app layout (requer inline CSS). | Experiencia visual quebrada em erros globais. | 2-4 | P2 | Nenhuma |
| UX-017 | Duplicacao de scrollbar styling. `@utility scrollbar-custom` e global scrollbar coexistem com mesmos valores. | Redundancia, manutencao duplicada. | 1 | P2 | Resolver junto com UX-008 |
| UX-024 | Sem testes E2E/visual. Elevado de LOW. Critico para as migracoes planejadas (UX-011 com 2000+ ocorrencias). | Regressoes UX passarao despercebidas durante refatoracoes. | Ver SYS-021 | P3 | Ref. SYS-021 |
| UX-027 | z-index sem escala definida. `z-[9999]` dominante, `z-[10000]` em TemplatePickerModal, `z-[100]` em BoardStrategyHeader. NOVO. | Risco de sobreposicao incorreta entre modais empilhados. | 3-4 | P2 | Nenhuma |
| UX-030 | PageLoader sem acessibilidade. Sem `role="status"`, `aria-live`, `aria-label`. Usado em 18 paginas. NOVO. | Screen readers nao anunciam carregamento. | 1 | P1 (quick win) | Nenhuma |
| UX-032 | Feedback visual inconsistente em acoes destrutivas. Nem todos os fluxos usam ConfirmModal. NOVO. | Inconsistencia na experiencia de acoes criticas. | 3-4 | P3 | UX-013 |

#### LOW (10)

| ID | Debito | Impacto | Horas | Prioridade | Dependencias |
|----|--------|---------|-------|------------|--------------|
| UX-010 | Font serif nao utilizada (`--font-serif: 'Cinzel'`). Rebaixado de MEDIUM. | Poluicao de namespace CSS. Impacto zero. | 0.5 | P1 (quick win) | Nenhuma |
| UX-012 | PageLoader cores hardcoded (`text-gray-500`). Rebaixado de MEDIUM. Caso particular do UX-011. | Correcao trivial. | 0.5 | P2 | Resolvido junto com UX-011 |
| UX-015 | ErrorBoundary usa inline styles. Rebaixado de MEDIUM (so visivel em erro). | Inconsistencia de padrao, impacto visual zero. | 0.5 | P2 | Nenhuma |
| UX-018 | ActivityFormModal V2 e dead code. Rebaixado de MEDIUM (basta deletar). | V2 nao importado por nenhum arquivo. | 0.5 | P1 (quick win) | Nenhuma |
| UX-019 | CreateDealModal V2 e dead code. Rebaixado de MEDIUM (basta deletar). | V2 nao importado por nenhum arquivo. | 0.5 | P1 (quick win) | Nenhuma |
| UX-020 | DealCockpit V2 e dead code. Rebaixado de MEDIUM (cockpit-v2 inacessivel). | Rota V2 sem link de navegacao. | 0.5 | P1 (quick win) | Nenhuma |
| UX-021 | SubmitButton buttonVariants conflitantes em FormField.tsx. | Naming conflita com CVA `buttonVariants`. | 1 | P1 | Resolver junto com UX-001 |
| UX-022 | Prefetch incompleto. Apenas dashboard e contacts implementados. | Impacto percebido marginal. | 4-8 | P4 | Nenhuma |
| UX-023 | Ambient glow hardcoded. Efeito decorativo com cores fixas. | Impacto minimo. | 1 | P4 | Nenhuma |
| UX-025 | AIAssistant.tsx deprecado. Importacao comentada, substituido por UIChat. | Dead code. | 0.5 | P1 (quick win) | Nenhuma |
| UX-031 | Empty states inconsistentes. `EmptyState.tsx` existe mas muitas features usam `<p>` inline. NOVO. | Adocao parcial do componente padrao. | 4-6 | P4 | Nenhuma |

---

## Matriz de Priorizacao Final

Priorizacao unificada pos-revisao, ordenada por: severidade, depois por ratio impacto/esforco.

### CRITICAL (4 debitos)

| # | ID | Debito | Area | Horas | Prioridade |
|---|------|--------|------|-------|------------|
| 1 | DB-006 | `merge_contacts()` DEFINER sem org check | Database | 3 | **P0** -- Emergencia |
| 2 | SYS-002 | BASE_INSTRUCTIONS hardcoded (12 tools invisiveis) | Sistema/IA | 16-24 | **P1** |
| 3 | SYS-001 | CRMContext monolito 930 linhas | Sistema/Frontend | 40-60 | **P2** |
| 4 | SYS-003 | ESLint no-explicit-any: off (209 `any`) | Sistema | 40-60 | **P3** (progressivo) |

*Nota: UX-001 (Button duplicado) era CRITICAL no DRAFT mas, apos analise, seu impacto e de manutenibilidade, nao de seguranca ou performance critica. Permanece CRITICAL pela magnitude (130+ arquivos afetados) e por bloquear UX-003.*

### HIGH (16 debitos)

| # | ID | Debito | Area | Horas | Prioridade |
|---|------|--------|------|-------|------------|
| 1 | DB-014 | LTV RPCs DEFINER sem org check | Database | 1 | **P1** (quick win) |
| 2 | DB-022 | get_dashboard_stats DEFINER sem necessidade | Database | 1 | **P1** (quick win) |
| 3 | DB-025 | merge_contacts EXECUTE dinamico | Database | 2 | **P1** (junto DB-006) |
| 4 | UX-001 | Button duplicado (130 imports da copia) | Frontend | 3-4 | **P1** (quick win) |
| 5 | SYS-004 | Prospeccao invisivel para IA | Sistema/IA | 24-32 | **P1** |
| 6 | SYS-005 | property_ref + metadata invisiveis | Sistema/IA | 4-8 | **P1** |
| 7 | DB-003 | deals.contact_id nullable | Database | 6 | **P3** |
| 8 | DB-004 | RLS subqueries em profiles | Database | 20 | **P3** |
| 9 | SYS-007 | Rate limiter in-memory | Sistema | 8-16 | **P2** |
| 10 | SYS-008 | exhaustive-deps off | Sistema | 16-24 | **P2** |
| 11 | SYS-006 | Tipagem any Supabase client | Sistema | 2-4 | **P2** |
| 12 | UX-004 | Skeletons em 4/17 paginas | Frontend | 12-20 | **P2** |
| 13 | UX-006 | Controller hooks gigantes | Frontend | 24-32 | **P3** |
| 14 | UX-009 | Chart colors hex hardcoded | Frontend | 3-4 | **P2** |
| 15 | UX-011 | Cores Tailwind pre-v4 (2000+ ocorrencias) | Frontend | 12-16 | **P3** |
| 16 | UX-026 | Overlay inconsistente (3/20+ modais) | Frontend | 4-6 | **P2** |
| 17 | UX-028 | Ausencia de error.tsx (0/17 paginas) | Frontend | 8-12 | **P2** |
| 18 | UX-029 | Ausencia de not-found.tsx | Frontend | 3-4 | **P2** |

### MEDIUM (26 debitos)

| # | ID | Area | Horas | Prioridade |
|---|------|------|-------|------------|
| 1 | DB-007 | Database | 2 | P2 |
| 2 | DB-009 | Database | 6 | P3 |
| 3 | DB-012 | Database | 2 | P2 |
| 4 | DB-015 | Database | 4 | P3 |
| 5 | DB-017 | Database | 6 | P3 |
| 6 | DB-019 | Database | 1 | P1 |
| 7 | DB-024 | Database | 0.5 | P2 |
| 8 | SYS-009 | Sistema | 8-12 | P3 |
| 9 | SYS-010 | Sistema | 8-12 | P3 |
| 10 | SYS-011 | Sistema/IA | 1-2 | P1 |
| 11 | SYS-012 | Sistema/IA | 8-12 | P2 |
| 12 | SYS-013 | Sistema/IA | 4-6 | P2 |
| 13 | SYS-014 | Sistema/IA | 0 | P1 |
| 14 | SYS-015 | Sistema | 2-4 | P1 |
| 15 | SYS-016 | Sistema | 16-24 | P4 |
| 16 | SYS-017 | Sistema | 4-8 | P2 |
| 17 | SYS-018 | Sistema | 8-16 | P3 |
| 18 | UX-005 | Frontend | 40-80 | P5 |
| 19 | UX-007 | Frontend | 2-4 | P2 |
| 20 | UX-008 | Frontend | 2-3 | P2 |
| 21 | UX-013 | Frontend | 2-3 | P2 |
| 22 | UX-014 | Frontend | 8-16 | P3 |
| 23 | UX-016 | Frontend | 2-4 | P2 |
| 24 | UX-017 | Frontend | 1 | P2 |
| 25 | UX-024 | Frontend | Ver SYS-021 | P3 |
| 26 | UX-027 | Frontend | 3-4 | P2 |
| 27 | UX-030 | Frontend | 1 | P1 |
| 28 | UX-032 | Frontend | 3-4 | P3 |

### LOW (27 debitos)

| # | ID | Area | Horas | Prioridade |
|---|------|------|-------|------------|
| 1-7 | DB-011, DB-013, DB-016, DB-018, DB-020, DB-021, DB-023 | Database | 10 | P3-P4 |
| 8-13 | SYS-019, SYS-020, SYS-021, SYS-022, SYS-023, SYS-024 | Sistema | 43-70 | P4 |
| 14-24 | UX-010, UX-012, UX-015, UX-018, UX-019, UX-020, UX-021, UX-022, UX-023, UX-025, UX-031 | Frontend | 14-22 | P1-P4 |

---

## Grafo de Dependencias

### Grafo Atualizado (pos-revisao dos especialistas)

```
SEGURANCA CRITICA (resolver imediatamente)
  DB-006 (merge_contacts org validation)         [CRITICAL, 3h]
    +-- DB-025 (reescrever EXECUTE dinamico)      [HIGH, 2h]    -- resolver JUNTO
    +-- DB-014 (LTV RPCs -> INVOKER)              [HIGH, 1h]    -- paralelo
    +-- DB-022 (dashboard stats -> INVOKER)        [HIGH, 1h]    -- paralelo
  => BLOQUEIA: SYS-004 (nao implementar tools de prospeccao antes de DB-006)

IA (Correcao de Exposure)
  SYS-002 (BASE_INSTRUCTIONS + catalogo) ------------- BLOQUEIA -----------+
    +-- SYS-014 (lead score no prompt - resolvido junto)                    |
    +-- SYS-011 (WHATSAPP enum - paralelo)                                 |
    +-- SYS-013 (tags/custom fields - depende de tools atualizadas)        |
    +-- SYS-012 (quick scripts - depende de tools atualizadas)             |
  SYS-004 (prospecting tools) .............. depende de DB-006 corrigido   |
    +-- SYS-005 (property_ref + metadata - junto)                          |

FRONTEND (Componentes e Estado)
  UX-001 (Button unificado) ------------ DESBLOQUEIA -----+
    +-- UX-021 (SubmitButton - junto)                      |
    +-- UX-003 (decomposicao de gigantes)                  |
    +-- UX-026 (overlay de modais)                         |
  SYS-001/UX-002 (CRMContext split) ------- BLOQUEIA -----+
    +-- UX-006 (controller hooks gigantes)                 |
    REQUISITO: cobertura minima de testes (RC-03)          |
  UX-024/SYS-021 (testes visuais/E2E) ---- BLOQUEIA -----+
    +-- UX-011 (migracao de 2000+ cores)                   |

DESIGN SYSTEM (Consistencia Visual)
  UX-008 (scrollbar OKLCH) + UX-017 (scrollbar duplicada) -- resolver JUNTO
  UX-009 (chart colors OKLCH)
  UX-027 (escala de z-index)
  UX-026 (overlay de modais) --> UX-013 (ConfirmModal tokens)

DATABASE (Integridade)
  DB-012 (updated_at triggers) --> DB-015 (phone sync trigger)
  DB-022 (dashboard stats INVOKER) --> DB-009 (otimizar counts)
  DB-007 (rate_limits RLS) + DB-024 (system_notifications INSERT)

PERFORMANCE (At Scale)
  DB-004 (JWT custom claims) -- projeto separado, 2-3 semanas dedicadas
    +-- Auth hook em Edge Function
    +-- Reescrita de 50+ policies
    +-- Fallback: manter get_user_organization_id()

DEAD CODE (Quick wins sem dependencia)
  UX-018, UX-019, UX-020 (V2 dead code - deletar)
  UX-025 (AIAssistant deprecado - deletar)
  UX-010 (font serif nao utilizada - remover)
```

### Cadeias de Bloqueio Criticas (atualizadas)

1. **DB-006 (CRITICAL, 3h) --> SYS-004 (HIGH, 24-32h)**: Seguranca de banco ANTES de expandir tools de IA. Se tools de contato/merge forem criadas, o agente pode ser vetor de exploracao cross-tenant (RC-01).

2. **UX-024/SYS-021 (testes visuais) --> UX-011 (2000+ cores)**: Testes ANTES de refatoracao massiva de design system. Sem testes visuais, regressoes no dark mode passarao despercebidas (RC-04).

3. **Cobertura de testes --> SYS-001/UX-002 (CRMContext split)**: Ao menos testes de regressao dos fluxos criticos ANTES de decompor o contexto monolito (RC-03).

4. **UX-001 (Button, 3-4h) --> UX-003 (gigantes, 40-60h)**: Unificar Button ANTES de decompor componentes que o importam. Os 4 gigantes importam `@/app/components/ui/Button`.

5. **SYS-002 (prompt, 16-24h) --> SYS-012 + SYS-013**: Fix de BASE_INSTRUCTIONS e pre-requisito para gaps de exposure da IA. Criar tools sem menciona-las no prompt nao resolve.

6. **DB-022 (INVOKER, 1h) --> DB-009 (counts, 6h)**: Converter `get_dashboard_stats` para INVOKER antes de otimizar queries internas.

7. **DB-012 (updated_at triggers, 2h) --> DB-015 (phone sync, 4h)**: Triggers de timestamp antes de trigger de sync.

### Dependencias Removidas (vs DRAFT v2)

- ~~DB-001 --> DB-010~~: Ambos ja corrigidos.
- ~~SYS-021/UX-024 --> SYS-003~~: Testes E2E nao dependem de tipagem interna.
- ~~DB-004 --> SYS-007~~: Rate limiter e JWT claims sao independentes tecnicamente.

---

## Plano de Resolucao

### Onda 0: Dead Code Cleanup (30 minutos)

| Debito | Acao | Horas |
|--------|------|-------|
| UX-018 | Deletar `ActivityFormModalV2.tsx` | 0.1 |
| UX-019 | Deletar `CreateDealModalV2.tsx` | 0.1 |
| UX-020 | Deletar rota `cockpit-v2/` inteira | 0.1 |
| UX-025 | Deletar `components/AIAssistant.tsx` | 0.1 |
| UX-010 | Remover `--font-serif: 'Cinzel'` do @theme (se nao carregada) | 0.1 |
| **Total** | | **~0.5h** |

**Resultado:** 5 debitos resolvidos, zero risco.

### Onda 1: Seguranca Critica + Quick Wins (Semana 1-2, ~25-35h)

| Debito | Acao | Horas | Pre-req |
|--------|------|-------|---------|
| DB-006 | Adicionar validacao de org em `merge_contacts()` | 3 | Nenhum (EMERGENCIA) |
| DB-025 | Reescrever EXECUTE dinamico no merge_contacts | 2 | Junto DB-006 |
| DB-014 | Converter LTV RPCs para SECURITY INVOKER | 1 | Nenhum |
| DB-022 | Converter get_dashboard_stats para INVOKER | 1 | Nenhum |
| DB-019 | Criar index otimizado para check_deal_duplicate | 1 | Nenhum |
| UX-001 | Unificar Button (adicionar unstyled ao original, migrar 130 imports) | 3-4 | Nenhum |
| UX-021 | Resolver SubmitButton conflitante (junto UX-001) | 0 | UX-001 |
| UX-030 | Adicionar aria attrs ao PageLoader | 0.5 | Nenhum |
| SYS-011 | Adicionar WHATSAPP ao enum de Activity Tools | 1-2 | Nenhum |
| SYS-015 | Atualizar pacotes AI SDK (minor bump) | 2-4 | Nenhum |
| DB-012 | Aplicar updated_at triggers em tabelas principais | 2 | Nenhum |
| UX-012 | Corrigir PageLoader cores (junto UX-011 prep) | 0.5 | Nenhum |
| UX-015 | Corrigir ErrorBoundary inline styles | 0.5 | Nenhum |
| SYS-024 | Remover tailwind.config.js residual | 0.5 | Nenhum |

**Resultado:** Seguranca DB corrigida (todas as funcoes DEFINER mitigadas), Button unificado, dead code limpo, quick wins de IA e a11y.

### Onda 2: Correcao de IA + Resiliencia UX (Semana 3-5, ~60-80h)

| Debito | Acao | Horas | Pre-req |
|--------|------|-------|---------|
| SYS-002 | Migrar BASE_INSTRUCTIONS para usar catalogo + integrar com `ai_prompt_templates` | 16-24 | Nenhum |
| SYS-014 | Mencionado no prompt (resolvido com SYS-002) | 0 | SYS-002 |
| SYS-004 | Criar prospecting-tools.ts (filas, metas, scripts, metricas) | 24-32 | DB-006 corrigido |
| SYS-005 | Expor property_ref e metadata nas tools | 4-8 | Junto SYS-004 |
| SYS-012 | Criar quick-scripts tools de IA | 8-12 | SYS-002 |
| SYS-013 | Expor tags/custom fields nas contact tools | 4-6 | SYS-002 |
| UX-028 | Criar error.tsx por route segment (17 paginas) | 8-12 | Nenhum |
| UX-029 | Criar not-found.tsx customizado | 3-4 | Nenhum |
| UX-026 | Padronizar overlay de modais (migrar 20+ modais) | 4-6 | UX-001 |
| UX-027 | Definir escala de z-index em tokens CSS | 3-4 | Nenhum |

**Resultado:** IA com visibilidade completa do sistema (27/27 tools). Resiliencia UX com error boundaries e 404 customizado.

### Onda 3: Frontend Quality + Design System (Semana 6-9, ~70-90h)

| Debito | Acao | Horas | Pre-req |
|--------|------|-------|---------|
| UX-003 | Decompor 4 componentes gigantes | 40-60 | UX-001 |
| UX-004 | Implementar skeletons content-aware por rota (13 paginas) | 12-20 | Nenhum |
| UX-009 | Migrar chart colors para OKLCH | 3-4 | Nenhum |
| UX-008 + UX-017 | Migrar scrollbar para OKLCH + remover duplicata | 2-3 | Nenhum |
| UX-013 | Migrar ConfirmModal para modalStyles | 2-3 | UX-026 |
| UX-016 | GlobalError com inline CSS (fora do app layout) | 2-4 | Nenhum |
| UX-007 | Padronizar import paths de utils | 2-4 | Nenhum |
| DB-007 | Corrigir RLS permissiva de rate_limits | 2 | Nenhum |
| DB-024 | Adicionar INSERT policy explicita em system_notifications | 0.5 | Nenhum |
| DB-015 | Criar sync trigger contacts.phone <-> contact_phones | 4 | DB-012 |
| DB-009 | Otimizar get_dashboard_stats (CTEs ou materialized) | 6 | DB-022 |

**Resultado:** Componentes manutiveis, UX de loading melhorada, design system consistente, integridade DB.

### Onda 4: Refatoracao Estrutural (Semana 10-14, ~100-140h)

| Debito | Acao | Horas | Pre-req |
|--------|------|-------|---------|
| SYS-001/UX-002 | Migrar CRMContext para hooks especializados (DealContext, ContactContext, etc.) | 40-60 | Cobertura de testes minima |
| UX-006 | Decompor controller hooks (boards, contacts, inbox) | 24-32 | SYS-001 |
| SYS-003 | Habilitar no-explicit-any progressivamente (warn, fix por modulo) | 40-60 | Nenhuma |
| SYS-008 | Habilitar exhaustive-deps progressivamente | 16-24 | Nenhuma |
| SYS-007 | Migrar rate limiter para Upstash Redis ou solucao distribuida | 8-16 | Nenhuma |
| DB-004 | JWT custom claims para RLS (auth hook + migrar 50+ policies) | 20 | Auth hook setup, testes extensivos |
| DB-003 | Implementar dashboard de deals sem contato + limpeza periodica | 6 | Decisao de negocio |
| SYS-017 | Configurar CSP headers em next.config.ts | 4-8 | Nenhuma |

**Resultado:** Type safety melhorada, performance at scale, estado desacoplado, rate limiting eficaz.

### Onda 5: Maturidade (Backlog, conforme capacidade)

| Debito | Acao | Horas | Condicao |
|--------|------|-------|----------|
| SYS-021/UX-024 | Setup testes E2E (Playwright) + testes visuais | 24-40 | Capacidade |
| UX-011 | Migrar 2000+ cores Tailwind diretas para tokens | 12-16 | UX-024 (testes visuais) |
| UX-014 | Optimistic updates em contacts/activities | 8-16 | Capacidade |
| SYS-018 | Encriptacao at-rest para API keys (pgcrypto) | 8-16 | Capacidade |
| SYS-016 | Modularizar OpenAPI spec | 16-24 | Capacidade |
| SYS-009 | Decompor Layout.tsx | 8-12 | Capacidade |
| SYS-010 | Decompor useRealtimeSync | 8-12 | SYS-008 |
| DB-017 | Estabelecer padrao de rollback em migrations | 6 | A partir de agora |
| UX-022 | Completar prefetch de rotas | 4-8 | Capacidade |
| UX-031 | Padronizar empty states | 4-6 | Capacidade |
| UX-032 | Padronizar acoes destrutivas | 3-4 | UX-013 |
| UX-005 | Implementar i18n (next-intl) | 40-80 | Primeiro cliente internacional |
| Demais LOW | Itens restantes (DB-011, DB-013, DB-016, DB-018, DB-020, DB-021, DB-023, SYS-019, SYS-020, SYS-022, SYS-023, UX-023) | ~40-60 | Conforme capacidade |

**Resultado:** Sistema robusto para crescimento.

---

## Riscos e Mitigacoes

### Riscos Cruzados (validados pelo QA Gate)

| ID | Risco | Areas | Sev. | Mitigacao |
|----|-------|-------|------|-----------|
| RC-01 | DB-006 (merge_contacts DEFINER) + AI Agent como vetor de exploracao. Se tools de merge forem criadas (SYS-004), usuario pode pedir ao agente para mesclar contatos cross-tenant sem construir SQL. | Database, IA, Seguranca | CRITICAL | Corrigir DB-006 ANTES de SYS-004. Fase 1 DB precede Onda 2 IA. |
| RC-02 | Fix de RLS (DB-004 JWT claims) pode quebrar acesso. Reescrita de 50+ policies e operacao de alto risco. | Database, Frontend, CRUD | HIGH | 2 fases: auth hook primeiro, migrar policies por tabela com testes. Manter `get_user_organization_id()` como fallback. |
| RC-03 | Decomposicao de CRMContext (SYS-001) sem testes. Contexto consumido por toda a aplicacao com cobertura de ~11.6%. | Frontend, todas as features | HIGH | Criar test suite de regressao para fluxos criticos ANTES da decomposicao. |
| RC-04 | Migracao de 2000+ cores Tailwind (UX-011) sem testes visuais. | Frontend, dark mode | HIGH | UX-024 (testes visuais) deve preceder UX-011. |
| RC-05 | Unificacao de Button (UX-001) afeta 130+ arquivos. | Frontend | MEDIUM | Mecanico: lint + typecheck + smoke test visual apos replace. |
| RC-06 | Ondas com interdependencias temporais. DB-006 Onda 1 deve preceder SYS-004 Onda 2. | Todas | MEDIUM | Enforcement: nao iniciar Onda 2 IA ate DB-006 estar em producao. |
| RC-07 | SYS-018 (API keys texto plano) + DB-022 (dashboard stats DEFINER). Se RLS falhar, keys expostas. | Database, Seguranca | MEDIUM | Resolver ambos na mesma onda de seguranca. |

### Mitigacoes Especificas do DB Specialist

| Risco | Mitigacao |
|-------|-----------|
| DB-006 explorado antes do fix | URGENTE: migration de 10 linhas. Aplicar imediatamente. |
| JWT custom claims falham | Feature flag para trocar entre JWT claim e subquery. Manter `get_user_organization_id()`. |
| Trigger updated_at causa regressao | NAO causa. Trigger sobrescreve valor do app (diferenca de ms). |
| `deals.status` dropada quebra algo | Grep por `status` em deals retorna 0 matches. Seguro dropar. |

---

## Areas Nao Avaliadas

As seguintes areas nao foram incluidas no escopo deste assessment e devem ser avaliadas em fases futuras:

| Gap | Descricao | Severidade | Recomendacao |
|-----|-----------|-----------|-------------|
| GAP-01 | **68 API routes sem auditoria de seguranca.** Incluindo API publica v1. Validacao de input, error handling e autorizacao nao verificados. | MEDIUM | Auditoria dedicada de API routes como debito formal futuro. |
| GAP-02 | **27+ AI tools usando `createStaticAdminClient()` (service role).** Tools destrutivas (delete deals, merge contacts) bypassam RLS. Sem auditoria de seguranca das tools existentes. | MEDIUM | Auditoria de seguranca das AI tools. Avaliar se cada tool precisa de service role ou pode usar client autenticado. |
| GAP-03 | **CORS e rate limiting no middleware level.** CSP coberto por SYS-017, mas CORS e rate limiting no middleware nao auditados. | LOW | Verificar next.config.ts e middleware.ts. |
| GAP-04 | **Server Actions (`app/actions/`) nao auditadas.** | LOW | Incluir na proxima auditoria de seguranca. |
| GAP-05 | **`npm audit` nao executado.** Dependencias nao verificadas para vulnerabilidades conhecidas. | LOW | Rodar `npm audit` e resolver criticas. |
| GAP-06 | **Supabase Edge Functions nao analisadas.** | LOW | Incluir na proxima fase de assessment. |
| GAP-07 | **Intersecao AI Tools + SECURITY DEFINER.** Agente IA como vetor adicional para exploracao de funcoes DEFINER (ver RC-01). | MEDIUM | Documentar e mitigar via DB-006 + auditoria de AI tools. |

---

## Criterios de Sucesso

### Metricas de Acompanhamento

| Metrica | Valor Atual | Meta Pos-Onda 1 | Meta Pos-Onda 4 | Como Medir |
|---------|-------------|-----------------|-----------------|-----------|
| Debitos CRITICAL | 4 | 1 (SYS-001 planejado) | 0 | Contagem no assessment |
| Debitos HIGH | 16 | 10 | < 5 | Contagem no assessment |
| Funcoes SECURITY DEFINER sem org check | 4 | 0 | 0 | `grep SECURITY DEFINER` + auditoria |
| Tabelas com RLS `USING(true)` | 1 (rate_limits) | 0 | 0 | Query pg_policies |
| Ocorrencias de `any` | 209 em 51 arquivos | 209 (nao muda Onda 1) | < 50 | ESLint com `no-explicit-any: warn` |
| Imports de `@/app/components/ui/Button` | 130 | 0 | 0 | Grep no codebase |
| Cobertura de testes | ~11.6% | ~15% | > 30% (areas criticas) | Jest --coverage |
| Paginas sem loading.tsx | 13 de 17 | 13 (nao muda Onda 1) | 0 | Busca em app/(protected) |
| Paginas sem error.tsx | 17 de 17 | 17 (nao muda Onda 1) | < 5 | Busca em app/(protected) |
| Tools de IA ativas | 15 de 27 | 15 (Onda 1 nao muda prompt) | 27 | Contagem em crmAgent.ts |

### KPIs de Seguranca

| KPI | Valor Atual | Meta | Prazo |
|-----|-------------|------|-------|
| Funcoes RPC com risco cross-tenant | 4 | 0 | Onda 1 |
| CSP headers configurados | Nao | Sim | Onda 4 |
| API keys encriptadas at-rest | Nao | Sim | Onda 5 |
| `npm audit` sem vulnerabilidades criticas | Desconhecido | 0 criticas | Onda 1 |

### Testes Requeridos por Onda

**Onda 1 (Seguranca):**
- Chamar `merge_contacts(uuid_org_A, uuid_org_B)` como usuario de Org A -- DEVE retornar EXCEPTION
- Chamar `get_dashboard_stats(uuid_outra_org)` como usuario regular -- DEVE retornar dados apenas da org do caller
- Chamar `increment_contact_ltv(uuid_outra_org_contact, 1000)` -- UPDATE DEVE ser bloqueado por RLS
- Todos os imports de Button resolvem para componente unico -- zero erros de import, typecheck passa

**Onda 2 (IA):**
- Agente reconhece e usa todas as 27 tools
- Agente interage com filas de prospeccao
- Agente cria/busca atividades WHATSAPP
- Agente filtra contatos por tags/custom fields

**Onda 3 (Frontend):**
- FocusContextPanel decomposto renderiza identico ao original (screenshots before/after)
- Skeletons aparecem em todas as 17 paginas protegidas
- Dark mode mantido apos migracao de cores

**Onda 4 (Estrutural):**
- RLS com JWT claims funciona em todas as tabelas
- Re-render count reduzido mensuravelmente apos CRMContext split
- Dashboard load time < 200ms para <10K registros

---

## Distribuicao Consolidada

### Por Area

| Area | CRITICAL | HIGH | MEDIUM | LOW | Total | Horas (min) | Horas (max) |
|------|----------|------|--------|-----|-------|-------------|-------------|
| Sistema (SYS-*) | 3 | 5 | 10 | 6 | **24** | 175 | 272 |
| Database (DB-*) | 1 | 5 | 7 | 7 | **20** | 50 | 64 |
| Frontend/UX (UX-*) | 3 (-1 ref) | 7 (+1 ref) | 12 (-1 ref) | 10 (+1 ref) | **32** (-2 ref = 29 unicos) | 165 | 265 |
| **Total** | **4** | **16** | **26** | **27** | **73** | **~390** | **~601** |

*Nota: UX-002 referencia SYS-001, UX-024 referencia SYS-021. Contados uma vez no total de 73.*

### Por Severidade

| Severidade | Qtd | % |
|-----------|-----|---|
| CRITICAL | 4 | 5% |
| HIGH | 16 | 22% |
| MEDIUM | 26 | 36% |
| LOW | 27 | 37% |

### Por Prioridade

| Prioridade | Qtd | Horas Estimadas |
|-----------|-----|-----------------|
| P0 (emergencia) | 1 | 3 |
| P1 (quick wins) | ~18 | 25-40 |
| P2 (proximo sprint) | ~20 | 80-120 |
| P3 (planejamento) | ~15 | 140-200 |
| P4 (backlog) | ~15 | 80-130 |
| P5 (adiado) | 1 | 40-80 |

### Esforco Total

| Cenario | Horas | Semanas (1 dev) | Semanas (2 devs) |
|---------|-------|-----------------|-------------------|
| Minimo (sem P4/P5) | ~250 | ~6 | ~3 |
| Medio (sem P5) | ~420 | ~10 | ~5 |
| Completo | ~590 | ~15 | ~7.5 |

---

## Anexos

### Documentos de Referencia

| Documento | Path | Fase |
|-----------|------|------|
| System Architecture v2 | `docs/architecture/system-architecture.md` | Phase 1 |
| Schema Documentation | `supabase/docs/SCHEMA.md` | Phase 2 |
| Database Audit | `supabase/docs/DB-AUDIT.md` | Phase 2 |
| Frontend Spec v2 | `docs/frontend/frontend-spec.md` | Phase 3 |
| Technical Debt DRAFT v2 | `docs/prd/technical-debt-DRAFT.md` | Phase 4 |
| DB Specialist Review v2 | `docs/reviews/db-specialist-review.md` | Phase 5 |
| UX Specialist Review v2 | `docs/reviews/ux-specialist-review.md` | Phase 6 |
| QA Review v2 | `docs/reviews/qa-review.md` | Phase 7 |

### Decisoes Autonomas Registradas

| Decisao | Contexto | Escolha | Razao |
|---------|----------|---------|-------|
| Enforcar NOT NULL em deals.contact_id? | DB-003, cenarios de negocio | NAO | Existem cenarios validos: lead anonimo, deal de parceiro, importacao em massa |
| i18n como prioridade? | UX-005, mercado-alvo | P5 (adiado) | Produto focado no CRM imobiliario brasileiro, sem demanda internacional |
| Manter V1 ou V2 dos componentes duplicados? | UX-018/019/020 | V1 (deletar V2) | V2 sao dead code confirmado, nao importados por nenhuma rota |
| SECURITY DEFINER vs INVOKER para merge_contacts? | DB-006 | Manter DEFINER + validacao de org | Funcao precisa bypassar RLS para operar atomicamente em multiplas tabelas |
| SECURITY DEFINER vs INVOKER para LTV RPCs? | DB-014 | Converter para INVOKER | UPDATE simples em tabela com RLS. INVOKER + RLS e suficiente |
| Button: qual e o "real"? | UX-001 | A copia (`@/app/components/ui/Button`) com 130 imports | Adicionar variantes unstyled ao original e migrar imports |

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @architect (Aria) | Assessment v1.0 (baseado em DRAFT v1 e reviews v1) |
| 2026-03-06 | @architect (Aria) | Assessment v2.0 (FINAL). Incorpora DRAFT v2, DB specialist review v2 (5 removidos, 4 novos, 6 rebaixados, 2 elevados), UX specialist review v2 (7 novos, 8 rebaixados, 2 elevados), QA review v2 (APPROVED, 8 condicoes atendidas). Recalculo completo de totais, severidades, horas e plano de resolucao. |

---

*Documento consolidado por @architect (Aria) - Brownfield Discovery Phase 8*
*Aprovado pelo QA Gate (Phase 7 v2) - @qa (Quinn)*
*Ultima atualizacao: 2026-03-06*
