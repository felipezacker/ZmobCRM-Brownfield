# Story TD-2.1: Resiliencia UX -- Error Boundaries + Overlays + Z-Index

## Metadata
- **Story ID:** TD-2.1
- **Epic:** TD (Technical Debt Resolution)
- **Status:** Ready
- **Priority:** P2
- **Estimated Points:** 8
- **Wave:** 2
- **Assigned Agent:** @dev

## Descricao

Proteger todas as paginas do sistema contra erros nao tratados e padronizar a camada visual de modais e overlays. Atualmente, 0 de 17 paginas protegidas possuem `error.tsx` dedicado -- qualquer erro derruba toda a pagina com um ErrorBoundary generico. Nao existe `not-found.tsx` customizado. Os modais usam 6+ padroes visuais diferentes de overlay. O z-index nao tem escala definida (valores variam de `z-[100]` a `z-[10000]`).

## Acceptance Criteria

### UX-028: Error boundaries por route segment
- [ ] AC1: Given cada uma das 17 paginas protegidas, when ocorre um erro em runtime, then e capturado por um `error.tsx` local com mensagem amigavel e botao de retry
- [ ] AC2: Given o `error.tsx`, when renderizado, then exibe branding do ZmobCRM e opcao de reportar o problema
- [ ] AC3: Given um erro em um route segment, when capturado pelo error boundary local, then NAO afeta outros route segments na mesma pagina

### UX-029: Not-found customizado
- [ ] AC4: Given uma URL invalida dentro das rotas protegidas, when acessada, then exibe pagina 404 customizada com branding ZmobCRM
- [ ] AC5: Given a pagina 404, when renderizada, then oferece links para Dashboard e pagina inicial

### UX-026: Overlay de modais padronizado
- [ ] AC6: Given todos os modais do sistema (20+), when inspecionados, then usam o mesmo overlay background definido em `modalStyles.ts`
- [ ] AC7: Given `ConfirmModal`, when inspecionado, then NAO usa `bg-slate-900/60` hardcoded (migrado para `modalStyles`)

### UX-027: Escala de z-index
- [ ] AC8: Given o codebase, when buscado por `z-[9999]` ou `z-[10000]`, then retorna 0 resultados
- [ ] AC9: Given o sistema de design, when inspecionado, then existe escala de z-index definida em tokens CSS (ex: `--z-modal`, `--z-popover`, `--z-tooltip`, `--z-toast`)

### UX-016: GlobalError com design
- [ ] AC10: Given um erro global (fora do app layout), when renderizado o GlobalError, then exibe CSS inline minimo com identidade visual ZmobCRM (nao depende de Tailwind/CSS externo)

## Scope

### IN
- Criar `error.tsx` para cada route segment protegido (17 paginas)
- Criar `not-found.tsx` customizado com branding
- Padronizar overlay de todos os modais (20+) via `modalStyles.ts`
- Definir escala de z-index como tokens CSS
- Melhorar GlobalError com CSS inline minimo

### OUT
- Skeletons/loading states (Onda 3, TD-3.1)
- Decomposicao de componentes de modal (Onda 3)
- Implementacao de testes E2E para error boundaries (Onda 5)

## Technical Notes

### Error Boundaries (UX-028)
- Diretorio: `app/(protected)/` -- cada subdiretorio precisa de `error.tsx`
- Paginas protegidas: dashboard, boards, contacts, activities, inbox, pipeline, settings, prospecting, etc.
- Template padrao com `'use client'`, `useEffect` para logging, botao de reset

### Not-Found (UX-029)
- Arquivo: `app/(protected)/not-found.tsx`
- Incluir link para dashboard e navegacao principal

### Overlays (UX-026)
- Arquivo central: `modalStyles.ts` (ja existe, usado em 3/20+ modais)
- Migrar restantes: grep por `bg-slate-900`, `bg-black/`, `bg-background/` em componentes de modal
- Padrao alvo: usar export de `modalStyles.ts` em todos

### Z-Index (UX-027)
- Definir tokens: `--z-base: 0`, `--z-dropdown: 100`, `--z-sticky: 200`, `--z-modal: 300`, `--z-popover: 400`, `--z-tooltip: 500`, `--z-toast: 600`
- Migrar `z-[9999]` e `z-[10000]` para tokens semanticos

## Dependencies
- UX-001 (Button unificado, TD-1.2) desejavel antes de UX-026 (overlays usam Button)
- Pode iniciar em paralelo se Button ja estiver concluido

## Debitos Enderecados
| ID | Debito | Severidade |
|----|--------|-----------|
| UX-028 | Ausencia de error.tsx por route segment | HIGH |
| UX-029 | Ausencia de not-found.tsx customizado | HIGH |
| UX-026 | Overlay background inconsistente em modais | HIGH |
| UX-027 | z-index sem escala definida | MEDIUM |
| UX-016 | GlobalError sem design system | MEDIUM |

## Definition of Done
- [ ] 17/17 paginas protegidas com `error.tsx` funcional
- [ ] `not-found.tsx` customizado com branding
- [ ] 20+ modais usando overlay padronizado via `modalStyles.ts`
- [ ] Escala de z-index definida em tokens CSS
- [ ] GlobalError com identidade visual
- [ ] `npm run typecheck` passando
- [ ] `npm run lint` passando
- [ ] `npm test` passando sem regressoes
- [ ] Code reviewed

## File List
_A ser preenchido durante implementacao_

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2026-03-06 | @pm | Story created |
| 2026-03-07 | @po | Validated GO (8/10) — renamed file, status Draft → Ready |
