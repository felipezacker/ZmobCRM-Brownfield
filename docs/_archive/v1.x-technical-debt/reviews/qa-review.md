# QA Review - Technical Debt Assessment (REDO)

**Revisor:** @qa
**Data:** 2026-02-23
**Fase:** Brownfield Discovery - Phase 7 (REDO)
**Motivo do REDO:** Phase 6 refeita por Brad Frost (Design System Architect) com analise metric-driven significativamente mais profunda. Revisao anterior usada como baseline e expandida.

**Documentos Revisados:**
- `docs/prd/technical-debt-DRAFT.md` (Phase 4 - @architect)
- `docs/reviews/db-specialist-review.md` (Phase 5 - @data-engineer)
- `docs/reviews/ux-specialist-review.md` (Phase 6 REDO - Brad Frost, Design System Architect)

---

## Gate Status: APPROVED

O assessment esta suficientemente completo e detalhado para prosseguir para a Phase 8 (consolidacao final pelo @architect). A revisao do Brad Frost elevou substancialmente a qualidade da analise de frontend -- passando de 10 debitos estimados para 19 com metricas reais do codebase (contagem automatizada, nao opiniao). Os gaps e riscos cruzados documentados abaixo DEVEM ser incorporados no documento final, mas nao bloqueiam a aprovacao.

**Condicoes para aprovacao:**
1. Os riscos cruzados RC-01 a RC-08 devem constar no documento final.
2. DB-024 (role injection) deve ser elevado para Sprint 1.
3. TD-003 (admin client) deve ser planejado em paralelo com Sprint 2 de DB.
4. Os GAPs 1-8 devem ser listados como "areas para investigacao futura".

---

## 1. Gaps Identificados

### GAP-1: Ausencia de Analise de Autenticacao e Sessao (ALTO)

Nenhum dos tres documentos analisa o fluxo de autenticacao do Supabase Auth, gerenciamento de sessoes, refresh tokens, ou protecao contra session hijacking. Para um CRM multi-tenant, isso e uma lacuna significativa. Perguntas nao respondidas:
- Como e feita a invalidacao de sessao quando um usuario e removido da organizacao?
- Ha protecao contra uso simultaneo de sessao em multiplos dispositivos?
- O middleware de autenticacao do Next.js valida corretamente o JWT em cada request?

### GAP-2: Ausencia de Analise de API Publica (ALTO)

O DRAFT menciona TD-017 (sem rate limiting na API publica) como MEDIO, mas nao ha analise aprofundada dos endpoints em `app/api/public/v1/`. Nao foi avaliado:
- Validacao de input nos endpoints publicos (SQL injection via parametros?)
- Autenticacao/autorizacao dos endpoints publicos (API key? Bearer token?)
- Superficie de ataque exposta (quais dados sao acessiveis via API publica?)

### GAP-3: Ausencia de Analise de Dependencias de Terceiros (MEDIO)

Nenhum documento analisa vulnerabilidades conhecidas (CVEs) nas dependencias do `package.json`. Com Zod v4 (relativamente novo, TD-019) e outras dependencias, uma auditoria de `npm audit` nao foi mencionada.

### GAP-4: Ausencia de Analise de CORS e CSP (MEDIO)

Nao ha mencao a configuracao de CORS (Cross-Origin Resource Sharing) ou Content Security Policy. Para um CRM que integra com AI providers externos e webhooks, isso e relevante.

### GAP-5: Ausencia de Analise de Backup e Recovery (MEDIO)

Nenhum documento menciona estrategia de backup do banco de dados, disaster recovery, ou RPO/RTO. Para um CRM com dados de negocios criticos, isso deveria ser mapeado.

### GAP-6: Ausencia de Testes de RLS Existentes (BAIXO)

O @data-engineer menciona que as politicas RLS de deals/contacts "ja existem e sao boas", mas nao ha evidencia de testes automatizados que validem essas politicas. Se nao ha testes, como sabemos que sao realmente seguras?

### GAP-7: Webhooks e Integracao Externa (MEDIO)

O DRAFT menciona `webhook_events_*` mas nao analisa a seguranca dos webhooks recebidos -- validacao de assinatura, replay attacks, idempotencia. As storage policies de `deal-files` (DB-018) foram cobertas, mas o fluxo completo de upload/download nao.

### GAP-8: Impacto de Performance do Design System na Experiencia Real (MEDIO) [NOVO]

Brad Frost identificou 2.762 cores hardcoded e 184 ocorrencias de tokens inexistentes. O impacto REAL em performance de renderizacao nao foi medido:
- Quantos re-paints sao causados por fallbacks de tokens inexistentes?
- Qual o impacto no CLS (Cumulative Layout Shift) dos tokens quebrados em Button/Card/Badge?
- O flash de hydration (FE-009) combinado com tokens inexistentes causa que experiencia visual exata no primeiro load?

---

## 2. Riscos Cruzados

Riscos que abrangem multiplas areas (DB + Frontend + Sistema) e que nenhum especialista individualmente cobriu de forma completa. Expandidos com achados do Brad Frost.

### RC-01: Admin client (TD-003) + RLS permissiva (DB-001..006) = exposicao total [CRITICO]

**Areas:** DB, Sistema, IA

O `staticAdminClient` bypassa RLS por design. Enquanto RLS e `USING(true)`, o impacto e "apenas" redundante. Mas quando RLS for corrigida, se o admin client continuar sendo usado nas AI tools, ele CONTINUARA bypassando as novas politicas. A correcao de TD-003 DEVE ser feita em paralelo ou logo apos DB-001..006, nao depois.

### RC-02: CRMContext (FE-002) + Client Components (TD-006) = cascata de re-renders sem SSR [CRITICO]

**Areas:** Frontend, Sistema

O CRMContext monolitico (922 linhas, **98 importacoes** conforme Brad) combinado com `'use client'` no layout protegido significa que TODA a arvore de componentes e client-rendered E sofre re-renders em cascata. Brad confirmou que cada mudanca no CRMContext causa re-render em 98 componentes. Resolver um sem o outro mitiga parcialmente -- ambos devem ser atacados na mesma sprint.

### RC-03: Funcoes SECURITY DEFINER (DB-007) + AI tools SQL inline (TD-008) = manipulacao via IA [CRITICO]

**Areas:** DB, Sistema, IA

As AI tools em `tools.ts` (1.648 linhas) executam SQL inline com admin client. Se uma tool chama `mark_deal_won()` (que e DEFINER sem auth), um prompt de IA malicioso poderia potencialmente manipular deals de qualquer usuario. O vetor e: prompt injection -> tool call -> DEFINER function -> bypass RLS.

### RC-04: Tokens orfaos (FE-004) + Error Boundaries ausentes (FE-007) = falha silenciosa de UI [ALTO]

**Areas:** Frontend

Brad quantificou: **184 ocorrencias** de tokens inexistentes em **69 arquivos** + **0 (zero)** ErrorBoundary. Se um componente falha ao renderizar por token CSS ausente, a app inteira crasha. Com os dados de Brad, sabemos que Button, Card, Badge, Tabs, Popover e Alert estao TODOS afetados. Sao primitivos usados em TODA a aplicacao.

### RC-05: API keys em texto plano (TD-010 + DB-011) + Storage policies permissivas (DB-018) = cadeia de exfiltracao [ALTO]

**Areas:** DB, Sistema

Um atacante que explora RLS permissiva pode: (1) ler API keys de outros usuarios em `user_settings`, (2) usar essas keys para acessar servicos de IA, (3) acessar arquivos de deals via storage policies permissivas. E uma cadeia completa de exfiltracao.

### RC-06: handle_new_user role injection (DB-024) + RLS baseada em role = escalacao de privilegios [ALTO]

**Areas:** DB, Sistema

Se um usuario consegue se registrar com role 'admin' via metadata injection (DB-024), ele automaticamente tem acesso admin em TODAS as politicas RLS baseadas em role. Isso invalida toda a seguranca RBAC.

### RC-07: Tokens inexistentes (FE-004/FE-012) + RLS permissiva (DB-001..006) = UI mostrando dados errados com estilo errado [ALTO] [NOVO]

**Areas:** DB, Frontend

Este e um risco composto inedito. Com RLS `USING(true)`, um corretor ve dados de outros usuarios. Com tokens shadcn inexistentes, os componentes Card e Badge que exibem esses dados renderizam com cores de fallback (provavelmente transparente ou preto). O resultado: o usuario ve dados que NAO deveria ver, exibidos de forma visualmente incorreta -- sem destaque de severidade, sem cor de status, sem hierarquia visual. Isso dificulta ate mesmo a percepcao de que algo esta errado.

**Mitigacao:** A correcao de RLS (DB P0) e a definicao dos 16 tokens shadcn (FE Phase 1, 2-4h conforme Brad) devem ser feitas no mesmo ciclo.

### RC-08: Button morto (FE-011) + 557 buttons ad-hoc + ausencia de testes (~7%) = regressao visual silenciosa [MEDIO] [NOVO]

**Areas:** Frontend, Sistema

Com 557 botoes `<button>` artesanais (cada um com classes Tailwind inline), QUALQUER mudanca no tema (globals.css, tailwind.config.js) pode causar regressao visual em dezenas de botoes sem que ninguem perceba -- porque nao ha testes visuais, nao ha componente centralizado, e a cobertura de testes e 7%.

**Mitigacao:** A Phase 4 de Brad (ESLint proibindo `<button>` raw + CI token coverage report) e essencial para prevenir este risco de forma permanente.

---

## 3. Validacao de Dependencias e Ordem de Resolucao

### 3.1 Plano do @data-engineer -- Validacao

A ordem proposta pelo @data-engineer esta **correta e bem fundamentada**:

1. **DB-008 (indice profiles) como primeiro item:** CORRETO. Pre-requisito confirmado.
2. **DB-001..006 antes de DB-010:** CORRETO. Tabelas de seguranca/compliance primeiro, depois negocio.
3. **DB-007 (DEFINER -> INVOKER) pode ser paralelo a RLS:** CORRETO.
4. **DB-024 (role injection) NAO esta na Sprint 1:** **ELEVACAO NECESSARIA.** Deve ser Sprint 1 -- invalida toda seguranca RBAC se nao corrigido antes.

### 3.2 Plano do Brad Frost (Phased Rollout) -- Validacao

A estrategia em 4 fases esta **excelente e bem sequenciada**:

1. **Phase 1 (Foundation):** CORRETO. Tokens semanticos primeiro, desbloqueia 6 componentes. Deletar codigo morto V2. ErrorBoundary. Custo baixo (36-64h), impacto alto.
2. **Phase 2 (High Impact):** CORRETO. Button unificado + CRMContext incremental + decomposicao do Cockpit.
3. **Phase 3 (Long Tail):** CORRETO. Cobertura total de tokens, migracao completa CRMContext.
4. **Phase 4 (Enforcement):** CORRETO. ESLint rules + Storybook. Prevencao de regressao.

**Ajuste recomendado:** Phase 1 de FE deve ser executada em paralelo com Sprint 1 de DB. Especificamente, a definicao dos 16 tokens shadcn (2-4h) e a adicao de ErrorBoundary devem coincidir com a correcao de RLS, conforme RC-07.

### 3.3 Cadeias de Bloqueio Consolidadas

```
DB-008 (indice profiles) --BLOQUEIA--> Todas as novas politicas RLS
DB-024 (role injection)  --INVALIDA--> Todas as politicas RLS baseadas em role
TD-005 (Context+Zustand) --BLOQUEIA--> FE-002 (CRMContext) -- sao o MESMO problema
TD-001 (strict mode)     --BLOQUEIA--> TD-013 (any casts)
FE-004 (tokens shadcn)   --DEVE PRECEDER--> qualquer novo componente shadcn
FE-011 (Button unificado)--DEVE PRECEDER--> migracao dos 557 <button> raw
FE-014 (Cockpit decomp)  --BLOQUEIA--> teste unitario do cockpit
```

### 3.4 Dependencia NAO mapeada originalmente

**TD-003 (admin client) deve ser planejado em paralelo com Sprint 2 de DB.** O @data-engineer nao o inclui por ser debito de Sistema. Mas conforme RC-01, corrigir RLS sem corrigir o admin client nas AI tools cria falsa sensacao de seguranca.

---

## 4. Testes Requeridos

### 4.1 Seguranca de Banco (DB-001..010, DB-021..027)

| # | Teste | Prioridade |
|---|---|---|
| T-01 | **Testes de RLS por role:** Para CADA tabela com nova politica, testar com `admin`, `diretor` e `corretor` -- SELECT, INSERT, UPDATE, DELETE | P0 |
| T-02 | **Isolamento cross-tenant:** 2 organizacoes, verificar que org A NAO ve dados de org B em NENHUMA tabela | P0 |
| T-03 | **Performance pos-indice:** `EXPLAIN ANALYZE` nas 5 queries mais frequentes ANTES e DEPOIS dos indices | P0 |
| T-04 | **Funcoes SECURITY INVOKER:** Verificar que `mark_deal_won/lost`, `reopen_deal` respeitam RLS apos migracao | P0 |
| T-05 | **Role injection:** Signup com `raw_user_meta_data: {role: 'admin'}`, verificar role = 'corretor' | P0 |
| T-06 | **get_dashboard_stats() sem parametro:** Deve retornar erro "function does not exist" | P0 |
| T-07 | **Storage policies:** Verificar que usuario de org A nao acessa deal-files de org B | P1 |
| T-08 | **log_audit_event:** Verificar que usuario nao consegue injetar log para outra organizacao | P1 |

### 4.2 Design System e Frontend (FE-001..019)

| # | Teste | Prioridade |
|---|---|---|
| T-09 | **Regressao visual dos tokens shadcn:** Apos definir os 16 tokens, verificar renderizacao de TODOS os variantes de Button (6), Badge (5), Card em light e dark mode | P0 |
| T-10 | **Token coverage report:** Contar ocorrencias de cores hardcoded (baseline: 2.762 slate + 528 utility + 117 hex = 3.407). Deve diminuir a cada sprint | P1 |
| T-11 | **Error Boundaries:** Forcar erro de runtime em cada feature page -- verificar fallback (nao tela branca) | P1 |
| T-12 | **Responsividade AI Panel:** Testar em viewports 375px, 768px, 1440px | P2 |
| T-13 | **Hydration flash:** Verificar ausencia de layout shift em mobile no primeiro load | P2 |
| T-14 | **Notificacao unificada:** Todas as acoes de feedback usam mesmo sistema, mesma duracao/posicao | P2 |
| T-15 | **Skeleton loading:** Verificar que telas principais mostram skeleton em vez de spinner | P2 |
| T-16 | **Kanban acessibilidade:** Navegacao por teclado, anuncios ARIA para movimentacao de cards | P2 |
| T-17 | **Codigo morto removido:** Verificar que V2/Focus nao existem mais no codebase apos delecao | P1 |

### 4.3 Sistema (TD-001..023)

| # | Teste | Prioridade |
|---|---|---|
| T-18 | **Build com strict mode:** `tsc --strict --noEmit` completa sem erros | P1 |
| T-19 | **Bundle size:** Verificar que faker.js removido do bundle (comparar antes/depois) | P0 |
| T-20 | **Admin client refatorado:** AI tools usam Supabase client com RLS, nao service role, para queries de dados de usuario | P0 |
| T-21 | **Regressao E2E:** Fluxo criar lead -> converter deal -> mover kanban -> marcar ganho. Em 3 roles | P1 |
| T-22 | **CRMContext re-renders:** Apos migracao parcial, verificar que mudanca em hook X nao causa re-render em componentes que usam hook Y | P1 |

### 4.4 Testes de Design System Especificos (baseados nos achados de Brad) [NOVO]

| # | Teste | Prioridade |
|---|---|---|
| T-23 | **Fonte de verdade unica:** Apos remover duplicacao tailwind.config.js vs globals.css @theme, verificar que build nao quebra e estilos sao identicos | P1 |
| T-24 | **Button unificado:** Apos criar `<Button>` funcional, verificar todas 24 combinacoes (6 variants x 4 sizes) em light/dark | P1 |
| T-25 | **Border radius consistencia:** Apos padronizacao (14 -> 4 variacoes), verificar Cards, Modais, Botoes, Inputs | P2 |
| T-26 | **ESLint enforcement:** Verificar que `<button>` raw e cores hardcoded geram erro de lint apos regras configuradas | P2 |
| T-27 | **Storybook primitivos:** Todos os atomos funcionais tem story com docs, props e exemplos interativos | P3 |

---

## 5. Metricas de Qualidade Recomendadas

### 5.1 Baseline a Capturar ANTES da Resolucao

| Metrica | Como Medir | Valor Atual Conhecido |
|---|---|---|
| Cobertura de testes | `npm test -- --coverage` | ~7% |
| Bundle size (producao) | `next build` output | Registrar |
| Contagem de `as any` | Grep no codebase | Registrar |
| Tabelas com RLS `USING(true)` | Query no schema | 21 |
| Funcoes SECURITY DEFINER sem auth | Auditoria manual | 6+ (DB-007, DB-021..024, DB-026) |
| Token coverage (design system) | Contar `var(--color-*)` vs hardcoded | **0.47%** (Brad) |
| Botoes `<button>` ad-hoc | Grep no codebase | **557** (Brad) |
| Cores hardcoded total | Grep no codebase | **3.407** (Brad: 2.762 + 528 + 117) |
| Tokens shadcn inexistentes | Grep no codebase | **184 ocorrencias em 69 arquivos** (Brad) |
| Componentes primitivos funcionais | Auditoria manual | **47%** (8/17) (Brad) |
| Linhas de codigo morto (V2/Focus) | Grep no codebase | **1.356 linhas** (Brad) |

### 5.2 Metas Pos-Resolucao

| Metrica | Meta P0 (3 meses) | Meta P1 (6 meses) | Meta P2 (12 meses) |
|---|---|---|---|
| Cobertura de testes | >= 30% | >= 50% | >= 70% |
| Tabelas RLS permissiva | 0 | 0 | 0 |
| Funcoes DEFINER sem auth | 0 | 0 | 0 |
| Token coverage | >= 30% | >= 70% | >= 95% |
| Botoes ad-hoc | < 300 | < 50 | 0 |
| Cores hardcoded | < 2.000 | < 500 | < 50 |
| Tokens inexistentes | 0 | 0 | 0 |
| Primitivos funcionais | 100% | 100% | 100% |
| Codigo morto V1/V2 | 0 linhas | 0 linhas | 0 linhas |
| Error Boundaries | 1 global + 6 features | Todos componentes criticos | Cobertura completa |
| Lighthouse Performance (mobile) | >= 60 | >= 75 | >= 85 |

---

## 6. Totais Consolidados

### 6.1 Por Area

| Area | Total Debitos | Criticos | Altos | Medios | Baixos | Horas Est. |
|---|---|---|---|---|---|---|
| Sistema (@architect) | 23 | 4 | 6 | 10 | 3 | ~300-550h |
| Database (@data-engineer) | 27 | 7 | 5 | 8 | 2 (+5 nao mexer) | ~111h |
| Frontend (Brad Frost) | 19 | 3 | 7 | 6 | 3 | ~296-468h |
| **TOTAL** | **69** | **14** | **18** | **24** | **8** (+5) | **~707-1.129h** |

### 6.2 Por Prioridade

| Prioridade | Debitos | Horas Est. | Prazo Recomendado |
|---|---|---|---|
| P0 (Critico - Imediato) | 14 | ~280-440h | Sprints 1-2 |
| P1 (Alto - Proximas 2-4 sprints) | 18 | ~250-400h | Sprints 3-6 |
| P2 (Medio - Backlog) | 24 | ~150-250h | Sprints 7-12 |
| P3 (Baixo - Quando oportuno) | 8 | ~30-50h | Sprints 13+ |
| Nao mexer (DB-016, DB-020) | 5 | 0h | Nunca |

### 6.3 Comparativo com Review Anterior

| Metrica | Review Anterior | Review Atual (REDO) | Delta |
|---|---|---|---|
| Total de debitos | 66 | 69 | +3 (FE-016, FE-017, FE-018, FE-019 novos de Brad; recontagem) |
| Criticos | 12 | 14 | +2 (FE-001 e FE-002 elevados por Brad, FE-014/TD-009 confirmado) |
| Horas totais estimadas | 626-993h | 707-1.129h | +81-136h (analise mais profunda de FE por Brad) |
| Riscos cruzados | 6 | 8 | +2 (RC-07 tokens+RLS, RC-08 button+testes) |
| Gaps | 7 | 8 | +1 (GAP-8 performance do design system) |

---

## 7. Parecer Final

O Technical Debt Assessment do ZmobCRM esta **robusto e pronto para consolidacao**.

**Evolucao significativa com Brad Frost:**

A revisao do Brad Frost transformou a analise de frontend. O review anterior (Phase 6 original) identificava 10 debitos com estimativas genericas. Brad trouxe:
- **19 debitos** com evidencia quantitativa (contagem automatizada no codebase real)
- **5 numeros-chave** que resumem o estado do design system: 0.47% adocao de tokens, 557 buttons ad-hoc, 2.762 cores hardcoded, 2.525 linhas do cockpit, 184 tokens inexistentes
- **Elevacao fundamentada** de FE-001, FE-002, FE-008 e TD-009 para severidades maiores com dados concretos
- **Estrategia de rollout em 4 fases** com ROI estimado e custo de inacao

**Pontos fortes do assessment completo:**
- Tres documentos complementares com profundidade tecnica real
- @data-engineer: SQL de exemplo para politicas, plano de sprints, 7 debitos adicionais criticos
- Brad Frost: Metricas reais do codebase, diagnostico Atomic Design, phased rollout com enforcement
- Mapeamento de dependencias entre debitos
- Respostas detalhadas dos especialistas as perguntas do architect

**Preocupacoes que DEVEM ser incorporadas no documento final:**
1. Os **8 riscos cruzados** (RC-01 a RC-08) -- especialmente RC-03 (IA + DEFINER) e RC-07 (tokens + RLS)
2. Os **8 gaps** -- GAP-1 (autenticacao) e GAP-2 (API publica) como "areas para investigacao futura"
3. **DB-024 (role injection) elevado para Sprint 1** -- invalida toda seguranca RBAC
4. **TD-003 (admin client) em paralelo com Sprint 2 de DB** -- conforme RC-01
5. **FE Phase 1 de Brad em paralelo com DB Sprint 1** -- conforme RC-07
6. **27 testes requeridos** (T-01 a T-27) como parte do plano de resolucao
7. **Metricas baseline** de Brad devem ser capturadas ANTES de qualquer intervencao

---

**DECISAO: APPROVED**

O assessment esta aprovado para prosseguir para a Phase 8 (consolidacao final pelo @architect), com as condicoes listadas acima.

---

*Documento gerado por @qa - Brownfield Discovery Phase 7 (REDO)*
*Baseline: qa-review.md original de 2026-02-23*
*Synkra AIOS v2.2.0*
