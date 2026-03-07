# Story TD-1.2: Quick Wins -- Button Unificacao + A11y + AI SDK + Limpeza

## Metadata
- **Story ID:** TD-1.2
- **Epic:** TD (Technical Debt Resolution)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 5
- **Wave:** 1
- **Assigned Agent:** @dev

## Descricao

Consolidar os quick wins da Onda 1 que nao sao de seguranca DB: unificacao do Button component (130 arquivos afetados), correcoes de acessibilidade, atualizacao de pacotes AI SDK, e limpezas de baixo risco.

O Button e o quick win de maior impacto visual -- existem 2 versoes coexistindo (130 imports da copia em `@/app/components/ui/Button` e 2 do original `@/components/ui/button`). A copia e efetivamente o Button real do sistema. O fix e adicionar variants `unstyled` ao original shadcn e migrar os 130 imports.

## Acceptance Criteria

### UX-001 + UX-021: Button unificado
- [x] AC1: Given o codebase, when buscar por `@/app/components/ui/Button`, then retorna 0 resultados (todos migrados para `@/components/ui/button`)
- [x] AC2: Given o Button original (`@/components/ui/button`), when inspecionado, then inclui variant `unstyled` que permite customizacao total
- [x] AC3: Given o arquivo `@/app/components/ui/Button.tsx` (a copia), when verificado, then nao existe mais no repositorio
- [x] AC4: Given `FormField.tsx` (UX-021), when inspecionado, then `SubmitButton` nao conflita com CVA `buttonVariants`

### UX-030: PageLoader acessibilidade
- [x] AC5: Given o componente PageLoader, when renderizado, then possui `role="status"`, `aria-live="polite"` e `aria-label` descritivo
- [x] AC6: Given um screen reader, when PageLoader esta visivel, then anuncia o estado de carregamento

### SYS-011: WHATSAPP enum
- [x] AC7: Given as Activity Tools de IA, when listados os tipos validos, then WHATSAPP esta incluido no enum
- [x] AC8: Given o agente de IA, when solicitado para criar uma atividade de WhatsApp, then cria com tipo WHATSAPP corretamente

### SYS-015: AI SDK update
- [x] AC9: Given o `package.json`, when verificados os pacotes `ai`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/react`, then todos estao na versao minor mais recente
- [x] AC10: Given as funcionalidades de IA do sistema, when testadas apos o update, then funcionam sem regressao

### Limpezas menores
- [x] AC11: Given `tailwind.config.js` (SYS-024), when verificado, then nao existe mais (Tailwind v4 usa CSS via @theme)
- [x] AC12: Given o PageLoader (UX-012), when inspecionado, then nao contem cores hardcoded `text-gray-*`
- [x] AC13: Given o ErrorBoundary (UX-015), when inspecionado, then usa classes CSS em vez de inline styles
- [x] AC14: Given `system_notifications` RLS (DB-024), when inspecionada, then possui INSERT policy explicita documentada (server-side only)

## Scope

### IN
- Unificacao do Button (migrar 130 imports, adicionar variant unstyled, deletar copia)
- Resolver SubmitButton buttonVariants conflitante (UX-021)
- PageLoader acessibilidade: role, aria-live, aria-label (UX-030)
- PageLoader cores: migrar de hardcoded para tokens (UX-012)
- ErrorBoundary: migrar inline styles para classes (UX-015)
- Activity Tools: adicionar WHATSAPP ao enum (SYS-011)
- AI SDK: bump minor dos 6 pacotes (SYS-015)
- Remover tailwind.config.js residual (SYS-024)
- Explicitar INSERT policy em system_notifications (DB-024)

### OUT
- Decomposicao de componentes gigantes (Onda 3)
- Migracao de cores Tailwind para tokens (Onda 5)
- Qualquer mudanca no BASE_INSTRUCTIONS da IA (Onda 2)

## Technical Notes

### UX-001 Button Fix
1. Adicionar variant `unstyled` ao `@/components/ui/button` (original shadcn)
2. Find-and-replace: `@/app/components/ui/Button` -> `@/components/ui/button` em 130 arquivos
3. Ajustar imports named se necessario (PascalCase vs lowercase)
4. Deletar `@/app/components/ui/Button.tsx`
5. Verificar: `npm run typecheck && npm run lint`

### SYS-011 WHATSAPP
- Arquivo: `lib/ai/tools/activity-tools.ts`
- Adicionar `'WHATSAPP'` ao enum de tipos de atividade
- Verificar se o type do Zod schema tambem inclui

### SYS-015 AI SDK
- Pacotes: `ai`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/react`
- Comando: `npm update ai @ai-sdk/google @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/react`
- Risco: BAIXO (minor bump, sem breaking changes)

## Dependencies
- Nenhuma dependencia obrigatoria
- Pode ser executada em paralelo com TD-1.1

## Debitos Enderecados
| ID | Debito | Severidade |
|----|--------|-----------|
| UX-001 | Button duplicado (130 imports da copia) | HIGH |
| UX-021 | SubmitButton buttonVariants conflitante | LOW |
| UX-030 | PageLoader sem acessibilidade | MEDIUM |
| UX-012 | PageLoader cores hardcoded | LOW |
| UX-015 | ErrorBoundary inline styles | LOW |
| SYS-011 | WHATSAPP faltando no enum | MEDIUM |
| SYS-015 | Pacotes AI SDK desatualizados | MEDIUM |
| SYS-024 | tailwind.config.js residual | LOW |
| DB-024 | system_notifications INSERT policy | MEDIUM |

## Definition of Done
- [x] Zero imports de `@/app/components/ui/Button` no codebase
- [x] PageLoader com atributos de acessibilidade
- [x] AI SDK atualizado (6 pacotes)
- [x] WHATSAPP no enum de atividades
- [x] `npm run typecheck` passando
- [x] `npm run lint` passando
- [x] `npm test` passando sem regressoes
- [x] Code reviewed

## File List
| File | Action | Description |
|------|--------|-------------|
| `components/ui/button.tsx` | Modified | Added `unstyled` variant + size |
| `app/components/ui/Button.tsx` | Deleted | Removed duplicate Button copy |
| `components/ui/FormField.tsx` | Modified | Renamed local `buttonVariants` → `submitButtonVariants` |
| `components/PageLoader.tsx` | Modified | Added a11y attrs, replaced hardcoded colors with tokens |
| `app/components/ui/ErrorBoundary.tsx` | Modified | Replaced inline styles with Tailwind classes, migrated Button import |
| `lib/ai/tools/activity-tools.ts` | Modified | Added WHATSAPP to activity type enums |
| `package.json` | Modified | Updated AI SDK packages to latest minor |
| `tailwind.config.js` | Deleted | Removed residual (Tailwind v4 uses CSS @theme) |
| 138 component files | Modified | Migrated Button import path |

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2026-03-06 | @pm | Story created |
| 2026-03-07 | @dev | YOLO execution: all 14 ACs implemented |
| 2026-03-07 | @dev | ESLint fix: excluded apps/ from root config |
| 2026-03-07 | @qa | Code review PASS — 14/14 ACs verified, no concerns |
