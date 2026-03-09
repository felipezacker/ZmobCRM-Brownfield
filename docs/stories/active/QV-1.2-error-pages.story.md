# Story QV-1.2: Error Pages Customizadas

## Metadata
- **Story ID:** QV-1.2
- **Epic:** QV (Quality Validation)
- **Status:** Ready
- **Priority:** P0
- **Estimated Points:** 3
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** usuario do ZmobCRM,
**I want** que paginas de erro (404, 500) tenham branding ZmobCRM e opcoes de navegacao,
**so that** nao veja paginas brancas genericas do Next.js e possa voltar facilmente ao CRM.

## Descricao

**Bug #20 (HIGH):** Todas as rotas invalidas mostram a pagina 404 default do Next.js — texto branco em fundo branco "404 This page could not be found." sem branding, sem navegacao.

Afeta rotas raiz invalidas como `/qualquercoisa`. Sub-rotas protegidas (ex: `/dashboard/xyz`) ja tem 404 customizada via `app/(protected)/not-found.tsx`, mas rotas fora do route group `(protected)` nao tem fallback na raiz do app.

**Causa raiz:** O Next.js App Router so usa o `not-found.tsx` dentro de um route group para rotas que pertencem a esse grupo. Rotas invalidas na raiz do app (ex: `/qualquercoisa`) caem no `not-found.tsx` da raiz, que nao existe — resultando na pagina generica do Next.js.

## Acceptance Criteria

- [ ] AC1: Given uma rota invalida na raiz (ex: `/qualquercoisa`), when acessada, then exibe pagina 404 customizada com logo ZmobCRM e botao para voltar ao dashboard
- [ ] AC2: Given uma sub-rota invalida dentro de rota protegida (ex: `/dashboard/xyz`), when acessada, then exibe a mesma pagina 404 customizada (ja coberta por `app/(protected)/not-found.tsx` — validar que continua funcionando)
- [ ] AC3: Given um erro de runtime em qualquer pagina, when ocorre, then exibe error page customizada com opcao de voltar e tentar novamente
- [ ] AC4: Given a pagina 404/error, when renderizada, then respeita dark mode
- [ ] AC5: Given a pagina 404/error no mobile, when renderizada, then e responsiva em 375px

## Scope

### IN
- Criacao de `app/not-found.tsx` na raiz (resolve bug #20 para rotas raiz invalidas)
- Verificacao/criacao de `app/error.tsx` se necessario para cobrir AC3 (ver Dev Notes)
- Reutilizacao obrigatoria de `components/ui/ErrorBoundaryFallback.tsx`
- Branding ZmobCRM via componente existente (logo, cores)
- Botao "Voltar ao Dashboard"
- Suporte a dark mode via Tailwind classes (dark:)
- Responsividade mobile (breakpoints sm:)

### OUT
- Paginas de erro para API routes (retornam JSON)
- Paginas de manutencao
- Modificacao de arquivos existentes de error.tsx nas sub-rotas protegidas
- Recriar componentes ja existentes (ErrorBoundaryFallback, global-error.tsx)

## Tasks

- [ ] Task 1 (AC1): Criar `app/not-found.tsx` na raiz reutilizando `ErrorBoundaryFallback` — resolve bug #20 para rotas raiz invalidas
  - [ ] Subtask 1.1: Verificar assinatura de props de `ErrorBoundaryFallback` — ATENCAO: o componente requer props `error` e `reset` que `not-found.tsx` NAO recebe do Next.js. Seguir o padrao do `(protected)/not-found.tsx` que usa JSX inline em vez de `ErrorBoundaryFallback`
  - [ ] Subtask 1.2: Implementar `app/not-found.tsx` seguindo padrao de `(protected)/not-found.tsx` (JSX inline com branding, nao ErrorBoundaryFallback)
  - [ ] Subtask 1.3: Validar: navegar para `/qualquercoisa` exibe 404 customizada com branding

- [ ] Task 2 (AC2): Validar que `app/(protected)/not-found.tsx` continua cobrindo sub-rotas invalidas
  - [ ] Subtask 2.1: Navegar para `/dashboard/xyz` e confirmar que 404 customizada aparece (sem modificar o arquivo)

- [ ] Task 3 (AC3): Verificar cobertura de error boundary para runtime errors
  - [ ] Subtask 3.1: Confirmar se `app/global-error.tsx` ja cobre AC3 para o root layout (provavelmente sim)
  - [ ] Subtask 3.2: SE `global-error.tsx` nao cobrir casos de runtime em sub-layouts, criar `app/error.tsx` reutilizando `ErrorBoundaryFallback`
  - [ ] Subtask 3.3: SE `app/error.tsx` for criado, validar que botao "retry" chama `reset()` do Next.js

- [ ] Task 4 (AC4, AC5): Verificar dark mode e responsividade
  - [ ] Subtask 4.1: SE `app/not-found.tsx` reutiliza `ErrorBoundaryFallback`, dark mode e responsividade ja estao cobertos nativamente — apenas verificar visualmente
  - [ ] Subtask 4.2: Confirmar dark mode toggle funciona na pagina 404 (375px width)

- [ ] Task 5: Validar quality gates
  - [ ] Subtask 5.1: `npm run typecheck` — sem erros
  - [ ] Subtask 5.2: `npm run lint` — sem erros
  - [ ] Subtask 5.3: `npm test` — todos os testes passam

## Dependencies

- **Story:** Nenhuma (standalone bugfix)
- **Componentes existentes obrigatorios (REUTILIZAR, nao recriar):**
  - `components/ui/ErrorBoundaryFallback.tsx`
  - `app/(protected)/not-found.tsx` (referencia de padrao)
  - `app/global-error.tsx` (referencia de cobertura)
- **Framework:** Next.js App Router (not-found.tsx, error.tsx, global-error.tsx conventions)

## Risks

| Risco | Probabilidade | Mitigacao |
|-------|--------------|-----------|
| `global-error.tsx` ja cobre AC3, tornando Task 3 um no-op | Alta | @dev deve verificar antes de criar `app/error.tsx` — nao criar arquivo desnecessario |
| Dark mode e responsividade ja cobertos por `ErrorBoundaryFallback` | Alta | Tasks 4 viram verificacao, nao implementacao |
| Conflito entre `app/not-found.tsx` e `app/(protected)/not-found.tsx` | Baixa | Next.js resolve pelo route group — nao ha conflito por design |

## Criteria of Done

- [ ] `app/not-found.tsx` existe na raiz e reutiliza `ErrorBoundaryFallback`
- [ ] Navegar para `/qualquercoisa` exibe 404 customizada com branding ZmobCRM
- [ ] Navegar para `/dashboard/xyz` continua exibindo 404 customizada (regressao)
- [ ] Runtime errors exibem error page customizada com opcao retry e voltar
- [ ] Dark mode funciona na pagina 404
- [ ] Layout responsivo confirmado em 375px
- [ ] `npm run typecheck`, `npm run lint`, `npm test` todos passam

## Dev Notes

### Estado Atual do Codebase (CRITICO — ler antes de implementar)

**Arquivos EXISTENTES (nao recriar, REUTILIZAR):**
- `app/(protected)/not-found.tsx` — 404 customizada dentro do route group `(protected)`. Ja funciona para sub-rotas protegidas invalidas. Use como referencia de padrao.
- `app/global-error.tsx` — error boundary global com Sentry + branding ZmobCRM. Captura erros no root layout.
- `components/ui/ErrorBoundaryFallback.tsx` — componente reutilizavel com branding, botao retry, botao report. JA SUPORTA dark mode (dark: Tailwind classes) e responsividade (sm: breakpoints).
- 18 arquivos `error.tsx` em cada rota protegida — todos usam `ErrorBoundaryFallback`.

**O que FALTA (o escopo desta story):**
- `app/not-found.tsx` na RAIZ — rotas invalidas fora de `(protected)` caem no 404 do Next.js padrao.

**Causa raiz do bug #20:**
O Next.js App Router so usa o `not-found.tsx` dentro de um route group para rotas que pertencem a esse grupo. Rotas invalidas na raiz do app (ex: `/qualquercoisa`) caem no `not-found.tsx` da raiz, que nao existe — resultando na pagina generica do Next.js.

**Sobre Task 2 e Task 3:**
- Task 2 e apenas validacao — `(protected)/not-found.tsx` ja existe e funciona.
- Task 3: `global-error.tsx` ja existe. Verifique se ele cobre AC3 antes de criar `app/error.tsx`. `global-error.tsx` captura erros no root layout; `app/error.tsx` capturaria erros em segmentos de rota abaixo do root. Na maioria dos casos praticos, as 18 `error.tsx` das sub-rotas ja cobrem; avalie se `app/error.tsx` adiciona valor antes de criar.

### Testing

**Abordagem:** Manual
**Cenarios por AC:**
- AC1: Navegar para `/qualquercoisa` → deve exibir 404 com branding ZmobCRM (atualmente mostra pagina branca Next.js)
- AC2: Navegar para `/dashboard/xyz` → deve exibir mesma 404 customizada (validacao de regressao)
- AC3: Provocar erro de runtime → error page customizada com retry
- AC4: Verificar dark mode toggle na pagina 404
- AC5: Verificar em 375px width → layout responsivo

**Testes existentes relevantes:** Nenhum teste automatizado para error pages (validacao manual)
**Dados de teste necessarios:** Nenhum

### Source Tree

**Arquivo a criar:**
- `app/not-found.tsx` — raiz do app, resolve bug #20 para rotas raiz invalidas

**Arquivo a criar condicionalmente (avaliar em Task 3):**
- `app/error.tsx` — somente SE `global-error.tsx` nao cobrir AC3 de forma satisfatoria

**Arquivos de referencia (somente leitura, nao modificar):**
- `app/(protected)/not-found.tsx` — padrao a seguir para o novo `app/not-found.tsx`
- `app/global-error.tsx` — error boundary global existente (verificar cobertura de AC3)
- `components/ui/ErrorBoundaryFallback.tsx` — componente reutilizavel (branding, retry, report)

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Low
- Secondary Types: N/A

**Specialized Agent Assignment:**
- Primary: @dev

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED
- [ ] Pre-PR review (@devops) — if PR created

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Component reuse (ErrorBoundaryFallback) — verificar que nenhuma UI foi recriada do zero
- Dark mode support via Tailwind classes (dark:)
- Responsive design breakpoints (sm:)
- Next.js App Router conventions (not-found.tsx, error.tsx, global-error.tsx)

## File List

_(a ser preenchido pelo @dev durante implementacao)_

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @sm | Rework: fixes sistêmicos (SYS-1~4) + fixes específicos @po validation |
| 2026-03-09 | @po | Validacao GO 10/10 — Draft -> Ready. 1 should-fix (SF-1: ErrorBoundaryFallback props mismatch com not-found.tsx — @dev seguir padrao do (protected)/not-found.tsx) |
| 2026-03-09 | @sm | Fix SF-1: subtask 1.1/1.2 reescrita para seguir padrao (protected)/not-found.tsx. quality_gate corrigido de @qa para @architect |

---
*Story gerada por @sm (River) — Epic QV*
