# Epic: Resolucao de Debitos Tecnicos -- ZmobCRM

**ID:** EPIC-TD
**Status:** Draft
**Data:** 2026-02-23
**Responsavel:** @pm (Morgan)
**Origem:** Brownfield Discovery Phase 10

---

## Objetivo

Resolver os 69 debitos tecnicos identificados na auditoria Brownfield Discovery do ZmobCRM, eliminando vetores criticos de vazamento de dados cross-tenant, violacao de LGPD, manipulacao de deals via IA, e degradacao progressiva da velocidade de desenvolvimento. Estabelecer fundacao de design system e qualidade de codigo para sustentabilidade a longo prazo.

## Escopo

### Incluido
- 14 debitos P0 (CRITICO) -- seguranca de banco, RLS, funcoes DEFINER, role injection
- 18 debitos P1 (ALTO) -- seguranca complementar, admin client, design system foundation, componentes
- 24 debitos P2 (MEDIO) -- qualidade de codigo, constraints, archiving, acessibilidade
- 8 debitos P3 (BAIXO) -- cleanup, PWA, empty states
- 5 itens marcados como NAO MEXER (DB-016, DB-020 + 3 subcontados)

### Excluido
- 8 gaps de investigacao futura (GAP-1 a GAP-8) -- serao epics separados
- Novas features -- apenas resolucao de debitos existentes

## Criterios de Sucesso

| Metrica | Baseline Atual | Meta 3 Meses | Meta 6 Meses | Meta 12 Meses |
|---|---|---|---|---|
| Tabelas com RLS `USING(true)` | 21 | **0** | 0 | 0 |
| Funcoes DEFINER sem auth | 6+ | **0** | 0 | 0 |
| Cobertura de testes | 7% | 30% | 50% | 70% |
| Token coverage (design system) | 0,47% | 30% | 70% | >95% |
| Botoes `<button>` ad-hoc | 557 | <300 | <50 | 0 |
| Cores hardcoded | 3.407 | <2.000 | <500 | <50 |
| Tokens shadcn inexistentes | 184 | 0 | 0 | 0 |
| Codigo morto V1/V2 | 1.356 linhas | 0 | 0 | 0 |
| Componentes primitivos funcionais | 47% (8/17) | 100% | 100% | 100% |
| Error Boundaries | 0 | 1 global + 6 features | Componentes criticos | Cobertura completa |

## Timeline

| Sprint | Foco | Semanas | Horas Estimadas |
|---|---|---|---|
| Sprint 1 | Seguranca Critica + Foundation FE | 1-2 | 63-79h |
| Sprint 2 | Seguranca Alta + Admin Client + Button | 3-4 | 112-152h |
| Sprint 3 | Design System + Performance + Refatoracao | 5-6 | 140-232h |
| Sprint 4 | Qualidade + Polish | 7-8 | 88-180h |
| Backlog | Cleanup + Prevencao | 9+ | 259-415h |

## Budget

| Fase | Horas | Custo (R$150/h) |
|---|---|---|
| Sprint 1 (Emergencia) | 62-90h | R$ 9.300 - R$ 13.500 |
| Sprint 2 (Fundacao) | 112-152h | R$ 16.800 - R$ 22.800 |
| Sprint 3 (Otimizacao) | 140-232h | R$ 21.000 - R$ 34.800 |
| Sprint 4 (Qualidade) | 88-180h | R$ 13.200 - R$ 27.000 |
| **TOTAL (Sprints 1-4)** | **403-643h** | **R$ 60.450 - R$ 96.450** |
| Backlog (Sprint 5+) | 259-415h | R$ 38.850 - R$ 62.250 |
| **TOTAL GERAL** | **707-1.129h** | **R$ 106.050 - R$ 169.350** |

**ROI:** +151% (conservador) a +1.064% (otimista) -- investimento se paga em menos de 5 meses.

## Stories

| ID | Titulo | Sprint | Horas |
|---|---|---|---|
| 1.1 | Seguranca Critica: RLS em 21 Tabelas | 1 | ~33h |
| 1.2 | Seguranca Critica: Funcoes Cross-Tenant e Role Injection | 1 | ~10h |
| 1.3 | Seguranca Foundation: API Keys, Storage, Admin Client | 2 | ~88-128h |
| 1.4 | Design System Foundation: Tokens e Componentes Base | 1-2 | ~52-86h |
| 1.5 | Arquitetura Frontend: Decomposicao de Monolitos | 3-4 | ~148-232h |
| 1.6 | Qualidade de Codigo: Strict Mode, Testes, Error Boundaries | 3-4 | ~170-296h |
| 1.7 | Cleanup Backlog: Codigo Morto, Constraints, Archiving | Backlog | ~259-415h |

## Riscos Cruzados

| ID | Risco | Severidade |
|---|---|---|
| RC-01 | Admin client + RLS permissiva = exposicao total | CRITICO |
| RC-02 | CRMContext + Client Components = cascata de re-renders | CRITICO |
| RC-03 | SECURITY DEFINER + AI tools SQL inline = manipulacao via IA | CRITICO |
| RC-04 | Tokens orfaos + Error Boundaries ausentes = falha silenciosa | ALTO |
| RC-05 | API keys texto plano + Storage permissivo = cadeia de exfiltracao | ALTO |
| RC-06 | Role injection + RLS baseada em role = escalacao total | ALTO |

## Dependencias entre Stories

```
Story 1.1 (RLS) ──bloqueia──> Story 1.3 (DB-010 restantes)
Story 1.2 (Funcoes) ──complementa──> Story 1.3 (Admin client)
Story 1.4 (Tokens) ──desbloqueia──> Story 1.5 (Decomposicao FE)
Story 1.6 (Strict mode) ──desbloqueia──> Backlog (as any, testes)
```

---

## Change Log

| Data | Agente | Acao |
|---|---|---|
| 2026-02-23 | @pm (Morgan) | Epic criado a partir do Technical Debt Assessment FINAL |
