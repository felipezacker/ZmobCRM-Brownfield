# QA Fix Request — TD-2.1

## Metadata
- **Story:** TD-2.1 (UX Resilience)
- **Gate Verdict:** CONCERNS
- **Requested by:** @qa (Quinn)
- **Date:** 2026-03-07
- **Priority:** MEDIUM
- **Blocking:** NO (merge allowed, fix before next wave)

---

## Issue: Modais usam overlay inline em vez de MODAL_OVERLAY_CLASS

### Descricao

24 de 26 modais padronizados tem o overlay class copiado inline em vez de importar `MODAL_OVERLAY_CLASS` de `@/components/ui/modalStyles`. Apenas `ConfirmModal.tsx` e `BoardCreationWizard.tsx` usam o import correto.

Se `modalStyles.ts` for atualizado no futuro, 24 modais ficam desatualizados.

### Diferencas sutis encontradas

```tsx
// Inline nos modais (copiado pelo agent)
"fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[var(--z-modal)] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"

// MODAL_OVERLAY_CLASS (fonte da verdade)
"fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[var(--z-modal)] flex items-stretch sm:items-center justify-center bg-background/60 backdrop-blur-sm p-2 sm:p-4"
```

Diferencas:
1. `items-center` vs `items-stretch sm:items-center` — responsividade em telas pequenas
2. `p-4` vs `p-2 sm:p-4` — padding responsivo

### Arquivos para corrigir (24 modais)

1. `components/ConsentModal.tsx`
2. `components/OnboardingModal.tsx`
3. `components/AIAssistant.tsx`
4. `components/ai/UIChat.tsx`
5. `components/ui/ActionSheet.tsx`
6. `components/ui/LossReasonModal.tsx`
7. `components/ui/Sheet.tsx`
8. `components/pwa/InstallBanner.tsx`
9. `features/activities/components/ActivityFormModal.tsx`
10. `features/boards/components/Modals/CreateDealModal.tsx`
11. `features/boards/components/Modals/DealDetailModal.tsx`
12. `features/boards/components/Modals/DeleteBoardModal.tsx`
13. `features/contacts/components/BulkActionsToolbar.tsx`
14. `features/contacts/components/ContactDetailModal.tsx`
15. `features/contacts/components/ContactFormModal.tsx`
16. `features/contacts/components/ContactMergeModal.tsx`
17. `features/contacts/components/SelectBoardModal.tsx`
18. `features/dashboard/components/PipelineAlertsModal.tsx`
19. `features/deals/cockpit/TemplatePickerModal.tsx`
20. `features/inbox/components/CallModal.tsx`
21. `features/inbox/components/InboxFocusView.tsx`
22. `features/inbox/components/ScheduleModal.tsx`
23. `features/inbox/components/ScriptEditorModal.tsx`
24. `features/prospecting/components/NoteTemplatesManager.tsx`
25. `features/prospecting/components/SaveQueueModal.tsx`
26. `features/settings/UsersPage.tsx`
27. `features/settings/components/LifecycleSettingsModal.tsx`
28. `features/deals/cockpit/DealCockpitFocusClient.tsx`
29. `app/(protected)/labs/deal-cockpit-mock/DealCockpitRealClient.tsx`

### Fix esperado

Para cada arquivo:

1. Adicionar import:
```tsx
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles'
```

2. Substituir a string inline do overlay por:
```tsx
className={`${MODAL_OVERLAY_CLASS} animate-in fade-in duration-200`}
// ou sem animacao, conforme o modal:
className={MODAL_OVERLAY_CLASS}
```

3. Remover classes extras que ja estejam em `MODAL_OVERLAY_CLASS` (evitar duplicacao)

### Validacao

- `npm run typecheck` passando
- `npm run lint` passando
- Grep por `bg-background/60` em `components/` e `features/` retorna 0 em arquivos de modal (exceto `modalStyles.ts`)
- Todos os modais visualmente identicos ao estado atual

### Notas

- NAO alterar `modalStyles.ts` — o valor atual e o correto
- Alguns modais tem `onClick` no overlay div para fechar ao clicar fora — preservar esse behavior
- Componentes que NAO sao modais (ex: pages, popovers) podem manter seus proprios bg-background/60
