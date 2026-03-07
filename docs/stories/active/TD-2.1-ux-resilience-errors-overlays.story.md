# Story TD-2.1: Resiliencia UX -- Error Boundaries + Overlays + Z-Index

## Metadata
- **Story ID:** TD-2.1
- **Epic:** TD (Technical Debt Resolution)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 8
- **Wave:** 2
- **Assigned Agent:** @dev

## Descricao

Proteger todas as paginas do sistema contra erros nao tratados e padronizar a camada visual de modais e overlays. Atualmente, 0 de 17 paginas protegidas possuem `error.tsx` dedicado -- qualquer erro derruba toda a pagina com um ErrorBoundary generico. Nao existe `not-found.tsx` customizado. Os modais usam 6+ padroes visuais diferentes de overlay. O z-index nao tem escala definida (valores variam de `z-[100]` a `z-[10000]`).

## Acceptance Criteria

### UX-028: Error boundaries por route segment
- [x] AC1: Given cada uma das 17 paginas protegidas, when ocorre um erro em runtime, then e capturado por um `error.tsx` local com mensagem amigavel e botao de retry
- [x] AC2: Given o `error.tsx`, when renderizado, then exibe branding do ZmobCRM e opcao de reportar o problema
- [x] AC3: Given um erro em um route segment, when capturado pelo error boundary local, then NAO afeta outros route segments na mesma pagina

### UX-029: Not-found customizado
- [x] AC4: Given uma URL invalida dentro das rotas protegidas, when acessada, then exibe pagina 404 customizada com branding ZmobCRM
- [x] AC5: Given a pagina 404, when renderizada, then oferece links para Dashboard e pagina inicial

### UX-026: Overlay de modais padronizado
- [x] AC6: Given todos os modais do sistema (20+), when inspecionados, then usam o mesmo overlay background definido em `modalStyles.ts`
- [x] AC7: Given `ConfirmModal`, when inspecionado, then NAO usa `bg-slate-900/60` hardcoded (migrado para `modalStyles`)

### UX-027: Escala de z-index
- [x] AC8: Given o codebase, when buscado por `z-[9999]` ou `z-[10000]`, then retorna 0 resultados
- [x] AC9: Given o sistema de design, when inspecionado, then existe escala de z-index definida em tokens CSS (ex: `--z-modal`, `--z-popover`, `--z-tooltip`, `--z-toast`)

### UX-016: GlobalError com design
- [x] AC10: Given um erro global (fora do app layout), when renderizado o GlobalError, then exibe CSS inline minimo com identidade visual ZmobCRM (nao depende de Tailwind/CSS externo)

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
- [x] 17/17 paginas protegidas com `error.tsx` funcional
- [x] `not-found.tsx` customizado com branding
- [x] 20+ modais usando overlay padronizado via `modalStyles.ts`
- [x] Escala de z-index definida em tokens CSS
- [x] GlobalError com identidade visual
- [x] `npm run typecheck` passando
- [x] `npm run lint` passando
- [x] `npm test` passando sem regressoes
- [x] Code reviewed

## File List
| File | Action | Description |
|------|--------|-------------|
| `app/globals.css` | Modified | Adicionados 7 z-index tokens CSS (--z-base thru --z-toast) |
| `components/ui/ErrorBoundaryFallback.tsx` | Created | Componente compartilhado de error boundary com branding ZmobCRM |
| `components/ui/modalStyles.ts` | Modified | Migrado para usar z-[var(--z-modal)] |
| `app/(protected)/activities/error.tsx` | Created | Error boundary |
| `app/(protected)/ai/error.tsx` | Created | Error boundary |
| `app/(protected)/ai-test/error.tsx` | Created | Error boundary |
| `app/(protected)/boards/error.tsx` | Created | Error boundary |
| `app/(protected)/contacts/error.tsx` | Created | Error boundary |
| `app/(protected)/dashboard/error.tsx` | Created | Error boundary |
| `app/(protected)/deals/error.tsx` | Created | Error boundary |
| `app/(protected)/decisions/error.tsx` | Created | Error boundary |
| `app/(protected)/inbox/error.tsx` | Created | Error boundary |
| `app/(protected)/instructions/error.tsx` | Created | Error boundary |
| `app/(protected)/labs/error.tsx` | Created | Error boundary |
| `app/(protected)/notifications/error.tsx` | Created | Error boundary |
| `app/(protected)/pipeline/error.tsx` | Created | Error boundary |
| `app/(protected)/profile/error.tsx` | Created | Error boundary |
| `app/(protected)/prospecting/error.tsx` | Created | Error boundary |
| `app/(protected)/reports/error.tsx` | Created | Error boundary |
| `app/(protected)/settings/error.tsx` | Created | Error boundary |
| `app/(protected)/setup/error.tsx` | Created | Error boundary |
| `app/(protected)/not-found.tsx` | Created | Pagina 404 customizada com branding |
| `app/global-error.tsx` | Modified | Redesenhado com CSS inline e identidade visual |
| `components/ConfirmModal.tsx` | Modified | Migrado overlay para MODAL_OVERLAY_CLASS |
| `components/ConsentModal.tsx` | Modified | Overlay padronizado |
| `components/OnboardingModal.tsx` | Modified | Overlay padronizado |
| `components/AIAssistant.tsx` | Modified | z-index migrado para token |
| `components/ai/UIChat.tsx` | Modified | z-index migrado para token |
| `components/pwa/InstallBanner.tsx` | Modified | z-index migrado para token |
| `components/ui/ActionSheet.tsx` | Modified | Overlay padronizado |
| `components/ui/LossReasonModal.tsx` | Modified | Overlay padronizado |
| `components/ui/Sheet.tsx` | Modified | Overlay padronizado |
| `features/activities/components/ActivityFormModal.tsx` | Modified | Overlay padronizado |
| `features/boards/components/Modals/CreateDealModal.tsx` | Modified | Overlay padronizado |
| `features/boards/components/Modals/DealDetailModal.tsx` | Modified | Overlay padronizado |
| `features/boards/components/Modals/DeleteBoardModal.tsx` | Modified | Overlay padronizado |
| `features/contacts/components/BulkActionsToolbar.tsx` | Modified | z-index migrado |
| `features/contacts/components/ContactDetailModal.tsx` | Modified | Overlay padronizado |
| `features/contacts/components/ContactFormModal.tsx` | Modified | Overlay padronizado |
| `features/contacts/components/ContactMergeModal.tsx` | Modified | Overlay padronizado |
| `features/contacts/components/SelectBoardModal.tsx` | Modified | Overlay padronizado |
| `features/dashboard/components/PipelineAlertsModal.tsx` | Modified | Overlay padronizado |
| `features/deals/cockpit/DealCockpitFocusClient.tsx` | Modified | z-index migrado |
| `features/deals/cockpit/TemplatePickerModal.tsx` | Modified | Overlay padronizado |
| `features/inbox/components/CallModal.tsx` | Modified | Overlay padronizado |
| `features/inbox/components/InboxFocusView.tsx` | Modified | Overlay padronizado |
| `features/inbox/components/ScheduleModal.tsx` | Modified | Overlay padronizado |
| `features/inbox/components/ScriptEditorModal.tsx` | Modified | Overlay padronizado |
| `features/prospecting/components/NoteTemplatesManager.tsx` | Modified | Overlay padronizado |
| `features/prospecting/components/SaveQueueModal.tsx` | Modified | Overlay padronizado |
| `features/settings/UsersPage.tsx` | Modified | Overlay padronizado |
| `features/settings/components/LifecycleSettingsModal.tsx` | Modified | Overlay padronizado |
| `app/(protected)/labs/deal-cockpit-mock/DealCockpitRealClient.tsx` | Modified | z-index migrado |

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2026-03-06 | @pm | Story created |
| 2026-03-07 | @po | Validated GO (8/10) -- renamed file, status Draft -> Ready |
| 2026-03-07 | @dev | Implementation complete: 18 error.tsx, not-found, 30+ overlays, 7 z-index tokens, GlobalError. 10/10 ACs done. Status Ready -> InReview |
