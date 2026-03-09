# Epic: Resolucao de Debitos Tecnicos -- ZmobCRM

## Metadata
- **Epic ID:** TDR
- **Status:** Draft
- **Owner:** @pm
- **Created:** 2026-03-03
- **Estimated Effort:** 550-750 horas
- **Estimated Cost:** R$ 82.500 - R$ 112.500
- **Timeline:** 10 semanas (5 sprints de 2 semanas)
- **Source:** Brownfield Discovery (10 fases, 5 especialistas, QA Gate APPROVED)

---

## Objetivo

Eliminar os 79 debitos tecnicos ativos identificados pela auditoria Brownfield Discovery do ZmobCRM, priorizando vulnerabilidades de seguranca cross-tenant que representam risco legal (LGPD) estimado em R$ 150.000 - R$ 500.000, seguido por melhorias de robustez, fundacao arquitetural, padronizacao visual e limpeza final. O ROI consolidado estimado e de 5.8:1 -- cada R$ 1 investido retorna R$ 5.80 em riscos evitados e ganhos de produtividade.

---

## Escopo

### IN
- 79 debitos tecnicos ativos nas areas de Sistema (20), Database (35), Frontend/UX (24) e Cross-Cutting (6)
- 7 vulnerabilidades CRITICAS (cross-tenant, API keys, webhooks quebrados, CRMContext monolito, Button duplicado)
- Testes de regressao, integracao e performance conforme definido na secao 7 do assessment
- Migrations de banco com rollback scripts
- Decomposicao de componentes e contextos monoliticos
- Padronizacao de design tokens e testes visuais

### OUT
- Internacionalizacao (i18n) -- TD-UX-004 e TD-CC-003 adiados (P5, sem demanda de mercado)
- 6 Gaps identificados pelo QA que requerem auditoria futura (GAP-01 a GAP-06)
- Novas features ou funcionalidades -- este epic e exclusivamente de debt resolution
- Mudancas em infra/CI/CD

---

## Criterios de Sucesso

### Sprint 1: Security Critical
- [ ] Zero RPCs SECURITY DEFINER sem validacao de org
- [ ] Webhook outbound funcional: deal move gera evento + delivery
- [ ] AI API keys criptografadas em repouso
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
- [ ] Zero ocorrencias de `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*`
- [ ] FocusContextPanel decomposto (7 sub-componentes)
- [ ] DealDetailModal decomposto
- [ ] useBoardsController decomposto (max 200 linhas/hook)
- [ ] Webhook secrets criptografados em repouso

### Sprint 5: Cleanup + Consolidation
- [ ] ~40 RLS policies migradas de subquery para `get_user_organization_id()`
- [ ] Colunas deprecated documentadas com COMMENT ON COLUMN
- [ ] system_notifications deprecada ou unificada
- [ ] Paginas protegidas com SSR habilitado (FCP mensuravel)

---

## Sprint Breakdown

| Sprint | Foco | Semanas | Horas | Stories |
|--------|------|---------|-------|---------|
| 1 | Security Critical + Quick Wins | 1-2 | 49-73 | TDR-1.1 a TDR-1.5 |
| 2 | Error Handling + Performance | 3-4 | 73-110 | TDR-2.1 a TDR-2.5 |
| 3 | Architecture Foundation | 5-6 | 80-123 | TDR-3.1 a TDR-3.4 |
| 4 | UX + Design System | 7-8 | 66-93 | TDR-4.1 a TDR-4.4 |
| 5 | Cleanup + Consolidation | 9-10 | 98-142 | TDR-5.1 a TDR-5.5 |
| **Total** | | **10** | **366-541** | **23 stories** |
| Adiados | i18n, itens P4/P5 | -- | ~100-209 | Backlog |

---

## Stories

### Sprint 1: Security Critical + Quick Wins (49-73h)

| Story ID | Titulo | Horas | Prioridade | Debitos |
|----------|--------|-------|------------|---------|
| [TDR-1.1](../active/TDR-1.1-fix-webhook-function.story.md) | Fix notify_deal_stage_changed() -- Restaurar webhooks outbound | 6-8 | P1 | TD-DB-001, TD-DB-008, TD-DB-NEW-001 |
| [TDR-1.2](../active/TDR-1.2-fix-security-definer-rpcs.story.md) | Fix SECURITY DEFINER RPCs + RLS -- Eliminar vulnerabilidades cross-tenant | 9-13 | P1 | TD-DB-003, TD-DB-NEW-003, TD-DB-009, TD-DB-004 |
| [TDR-1.3](../active/TDR-1.3-secure-admin-client-ai.story.md) | Secure Admin Client + Criptografar API Keys | 24-36 | P1 | TD-SYS-001, TD-SYS-002, TD-CC-006 |
| [TDR-1.4](../active/TDR-1.4-remove-debug-logging.story.md) | Remover debug logging com endpoint externo | 2-4 | P1 | TD-SYS-003 |
| [TDR-1.5](../active/TDR-1.5-unify-button-component.story.md) | Unificar Button component duplicado | 3-4 | P1 | TD-UX-001 |

### Sprint 2: Error Handling + Performance (73-110h)

| Story ID | Titulo | Horas | Prioridade | Debitos |
|----------|--------|-------|------------|---------|
| [TDR-2.1](../active/TDR-2.1-error-loading-states.story.md) | Adicionar error.tsx, not-found.tsx e loading.tsx | 19-28 | P2 | TD-SYS-006, TD-SYS-007, TD-SYS-012 |
| [TDR-2.2](../active/TDR-2.2-skeleton-components.story.md) | Criar skeletons content-aware | 20-28 | P2 | TD-UX-003 |
| [TDR-2.3](../active/TDR-2.3-fix-n1-kanban-indexes.story.md) | Fix N+1 kanban + Criar indexes compostos | 11-19 | P2 | TD-CC-005, TD-DB-006, TD-DB-012, TD-DB-013, TD-DB-014 |
| [TDR-2.4](../active/TDR-2.4-standardize-modals-charts.story.md) | Padronizar overlays de modais e chart colors | 7-10 | P2 | TD-UX-020, TD-UX-008 |
| [TDR-2.5](../active/TDR-2.5-reenable-eslint-rules.story.md) | Reabilitar ESLint rules criticas | 16-24 | P2 | TD-SYS-008 |

### Sprint 3: Architecture Foundation (80-123h)

| Story ID | Titulo | Horas | Prioridade | Debitos |
|----------|--------|-------|------------|---------|
| [TDR-3.1](../active/TDR-3.1-regression-tests-crmcontext.story.md) | Criar testes de regressao para CRMContext | 16-24 | P1 | TD-SYS-004 (parcial) |
| [TDR-3.2](../active/TDR-3.2-decompose-crmcontext.story.md) | Decompor CRMContext em sub-contextos | 24-40 | P1 | TD-CC-001 |
| [TDR-3.3](../active/TDR-3.3-unify-state-management.story.md) | Unificar estado Context + Zustand + Decompor BoardCreationWizard | 24-40 | P3 | TD-CC-002, TD-CC-004 |
| [TDR-3.4](../active/TDR-3.4-db-integrity-not-null.story.md) | Garantir NOT NULL em org_id (3 tabelas) | 8-11 | P3 | TD-DB-017, TD-DB-018, TD-DB-024 |

### Sprint 4: UX + Design System (66-93h)

| Story ID | Titulo | Horas | Prioridade | Debitos |
|----------|--------|-------|------------|---------|
| [TDR-4.1](../active/TDR-4.1-visual-testing-framework.story.md) | Setup framework de testes visuais | 16-24 | P3 | TD-UX-019 |
| [TDR-4.2](../active/TDR-4.2-migrate-tailwind-tokens.story.md) | Migrar cores Tailwind para design tokens | 12-16 | P3 | TD-UX-010 |
| [TDR-4.3](../active/TDR-4.3-decompose-components-hooks.story.md) | Decompor componentes e hooks gigantes (parcial) | 20-28 | P3 | TD-UX-002 (parcial), TD-UX-005 (parcial) |
| [TDR-4.4](../active/TDR-4.4-fk-actions-webhook-secrets.story.md) | FK ON DELETE actions + Criptografar webhook secrets | 10-13 | P3 | TD-DB-002, TD-DB-016, TD-DB-030 |

### Sprint 5: Cleanup + Consolidation (98-142h)

| Story ID | Titulo | Horas | Prioridade | Debitos |
|----------|--------|-------|------------|---------|
| [TDR-5.1](../active/TDR-5.1-migrate-rls-policies.story.md) | Migrar ~40 RLS policies de subquery para function | 8-12 | P3 | TD-DB-NEW-002 |
| [TDR-5.2](../active/TDR-5.2-unify-notifications-deprecated-cols.story.md) | Unificar notifications + Planejar remocao colunas deprecated | 10-16 | P3 | TD-DB-005, TD-DB-019, TD-DB-020, TD-DB-026 |
| [TDR-5.3](../active/TDR-5.3-decompose-remaining-components.story.md) | Decompor componentes e hooks restantes | 20-24 | P3 | TD-UX-002 (restante), TD-UX-005 (restante) |
| [TDR-5.4](../active/TDR-5.4-migrate-ssr.story.md) | Migrar paginas protegidas para SSR | 24-40 | P3 | TD-SYS-005, TD-SYS-014 |
| [TDR-5.5](../active/TDR-5.5-low-priority-cleanup.story.md) | Limpeza de debitos de baixa prioridade | 20-30 | P4 | TD-SYS-009 a TD-SYS-020, TD-DB-011 a TD-DB-029, TD-UX-004 a TD-UX-024 (restantes) |

---

## Dependencias

### Cadeias de Bloqueio Criticas

```
TDR-3.1 (Testes regressao) --> TDR-3.2 (CRMContext split)
TDR-3.2 (CRMContext split) --> TDR-3.3 (Unificar estado + BoardCreationWizard)
TDR-3.2 (CRMContext split) --> TDR-5.4 (SSR migration)
TDR-4.1 (Testes visuais)   --> TDR-4.2 (Migracao tokens)
TDR-1.5 (Button unificacao) --> TDR-4.3 + TDR-5.3 (Decomposicao parcial)
```

### Dependencias Inter-Sprint

| Story | Depende de | Motivo |
|-------|------------|--------|
| TDR-3.2 | TDR-3.1 | Decomposicao sem testes e o maior risco do assessment (QA DEP-02) |
| TDR-3.3 | TDR-3.2 | Context + Zustand unification depende do split do CRMContext |
| TDR-4.2 | TDR-4.1 | Migracao de 2.475 cores sem testes visuais e arriscada (QA DEP-01) |
| TDR-5.4 | TDR-3.2 | SSR requer CRMContext decomposto + providers desacoplados |

### Stories Independentes (sem bloqueios)

TDR-1.1, TDR-1.2, TDR-1.4, TDR-2.1, TDR-2.2, TDR-2.3, TDR-2.4, TDR-2.5, TDR-3.4, TDR-4.4, TDR-5.1, TDR-5.2

---

## Riscos

Fonte: QA Review (10 riscos catalogados no assessment).

| ID | Risco | Probabilidade | Impacto | Mitigacao |
|----|-------|---------------|---------|-----------|
| RC-01 | Regressao ao decompor CRMContext (930 linhas, cobertura 11.6%) | Alta | Alto | TDR-3.1 cria testes de regressao ANTES da decomposicao |
| RC-02 | Fix de RLS pode bloquear acesso legitimo | Media | Alto | Testar cada policy pos-fix com queries manuais por role em staging |
| RC-03 | Migracao de tokens pode quebrar dark mode (2.475 ocorrencias) | Media | Medio | TDR-4.1 implementa testes visuais ANTES da migracao |
| RC-04 | Fix de webhook com campos incompativeis | Media | Alto | Usar funcao original do schema_init como base |
| RC-07 | Seguranca DB + App desalinhadas (corrigir uma sem outra deixa vulnerabilidade) | Media | Alto | Sprint 1 resolve AMBAS as camadas em conjunto |
| RC-09 | Lock de tabela durante ALTER CONSTRAINT em deals | Baixa | Medio | Horario de baixo trafego |
| RC-10 | Subquery -> function migration quebra policies | Baixa | Alto | Testar CADA tabela pos-migration |

---

## Documentos de Referencia

- [Technical Debt Assessment FINAL](../../prd/technical-debt-assessment.md) -- 84 debitos, plano de 5 sprints
- [Technical Debt Report (Executive)](../../reports/TECHNICAL-DEBT-REPORT.md) -- Custos, ROI, impacto no negocio
- [System Architecture](../../architecture/system-architecture.md) -- Arquitetura do sistema
- [Database Audit](../../../supabase/docs/DB-AUDIT.md) -- Auditoria de banco de dados
- [Frontend Spec](../../frontend/frontend-spec.md) -- Especificacao de frontend
- [DB Specialist Review](../../reviews/db-specialist-review.md) -- Revisao do especialista DB
- [UX Specialist Review](../../reviews/ux-specialist-review.md) -- Revisao do especialista UX
- [QA Review](../../reviews/qa-review.md) -- Revisao do gate de qualidade

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @pm (Morgan) | Epic criado. 23 stories em 5 sprints. Phase 10 Brownfield Discovery. |

---

*Epic criado como parte da Phase 10 do Brownfield Discovery.*
*Fonte: Technical Debt Assessment FINAL (APPROVED by QA Gate).*
