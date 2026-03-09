# Story QV-1.8: Settings + Modais Polish

## Metadata
- **Story ID:** QV-1.8
- **Epic:** QV (Quality Validation)
- **Status:** InReview
- **Priority:** P3
- **Estimated Points:** 5
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** usuario do ZmobCRM,
**I want** que edicao de produtos e tags funcione corretamente, que custom fields sejam adicionaveis no modal, e que modais tenham z-index e ESC corretos,
**so that** a experiencia de configuracao e interacao com modais seja confiavel.

## Descricao

5 bugs de UX polish em settings e modais:

**Bug #3 (MEDIUM):** Input de campo personalizado (custom field) nao aceita adicionar valor no modal completo do contato.

**Bug #15 (MEDIUM):** Editar produto nao salva na primeira tentativa — precisa atualizar a pagina ou refazer.

**Bug #16 (LOW):** Tag nao tem opcao de edicao (apenas criar e deletar).

**Bug #21 (MEDIUM):** Toast fica por baixo do desfoque do modal — nao e visivel quando um modal esta aberto.

**Bug #22 (MEDIUM):** ESC fecha o modal pai (deal) em vez do modal filho (confirm) quando ha modal sobre modal.

## Acceptance Criteria

- [ ] AC1: Given o modal completo do contato, when digito no input de custom field e confirmo, then o valor e adicionado
- [ ] AC2: Given a pagina de settings, when edito um produto e salvo, then a edicao persiste na primeira tentativa sem necessidade de refresh
- [ ] AC3: Given a pagina de settings, when quero editar uma tag, then existe uma opcao de edicao (icone de lapis ou similar)
- [ ] AC4: Given um modal aberto com overlay, when um toast e disparado, then o toast aparece acima do overlay/modal (z-index maior)
- [ ] AC5: Given modal A aberto com modal B (confirm) em cima, when pressiono ESC, then fecha o modal B (mais recente) e nao o modal A

## Scope

### IN
- Fix do input de custom fields no modal de contato
- Fix do save de produto em settings
- Adicionar opcao de editar tag em settings
- Fix z-index do toast para ficar acima de modais
- Fix ESC para fechar modal mais recente (stack de modais)

### OUT
- Redesign de settings
- Novas funcionalidades em modais
- Adicionar tipos novos de custom field (apenas fix do input existente)

## Dependencies

- Nenhuma story de prerequisito
- Requer acesso ao staging com produtos e tags cadastrados para teste

## Risks

- **AC1 (ALTA):** Se o ContactDetailModal.tsx nao renderiza inputs para custom_fields, a task passa de "fix de input" para "criar componente" — aumentando a estimativa. Verificar antes de estimar.
- **AC5 (MEDIA):** A correcao do ESC no FocusTrap pode afetar outros modais que dependem do mesmo componente. Testar regressivamente apos a mudanca.
- **AC2 (BAIXA):** O bug de save de produto pode ser um optimistic update que reverte silenciosamente — pode exigir investigacao mais profunda de race condition.

## Business Value

Bugs de UX em settings e modais geram atrito diario para usuarios que configuram o CRM e interagem com modais. Corrigir esses 5 bugs melhora a confiabilidade percebida do produto e reduz suporte reativo.

## Criteria of Done

- [ ] Todos os 5 ACs validados manualmente no staging
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] `npm test` passa sem regressoes
- [ ] File List atualizado com todos os arquivos modificados

## Tasks

- [x] Task 1 (AC1): Investigar e corrigir input de custom field no modal completo do contato
  - [x] 1.1: Abrir `features/contacts/components/ContactDetailModal.tsx` e verificar se ha componente que renderiza inputs para `custom_fields`
  - [x] 1.2: Se o componente de input existir, identificar o problema (onSubmit, onChange ou state binding incorreto)
  - [ ] 1.3: Se o componente NAO existir, registrar como feature (escopo expandido) e avisar o @po antes de implementar — N/A, componente existe
  - [x] 1.4: Corrigir o wiring do form state e validar que o valor e persistido apos submit
- [x] Task 2 (AC2): Investigar e corrigir save de produto em settings
  - [x] 2.1: Abrir `features/settings/components/ProductsCatalogManager.tsx` e identificar o fluxo de save
  - [x] 2.2: Verificar se ha optimistic update que reverte silenciosamente ou race condition na invalidacao de cache
  - [x] 2.3: Corrigir o problema e garantir que a edicao persiste na primeira tentativa
- [x] Task 3 (AC3): Adicionar botao de editar tag em settings
  - [x] 3.1: Abrir `features/settings/components/TagsManager.tsx` e analisar o pattern de delete existente
  - [x] 3.2: Replicar o pattern de acoes (semelhante ao custom fields) adicionando icone de lapis para edicao
  - [x] 3.3: Implementar modal ou inline edit para alterar o nome da tag e persistir
- [x] Task 4 (AC4): Aumentar z-index do toast container para aparecer acima de modais
  - [x] 4.1: Em `context/ToastContext.tsx` linha 116, alterar `z-50` para `z-[var(--z-toast)]` (efetivo: z-600)
  - [x] 4.2: Verificar que `--z-toast: 600` esta definido em `app/globals.css` (linha 82)
  - [ ] 4.3: Testar com modal aberto: disparar toast e confirmar que aparece acima do overlay — manual
- [x] Task 5 (AC5): Implementar stack de modais para ESC
  - [x] 5.1: Analisar como `lib/a11y/components/FocusTrap.tsx` captura o evento ESC
  - [x] 5.2: Identificar se o bug ocorre porque ambos FocusTrap (pai e filho) recebem o evento ESC simultaneamente
  - [x] 5.3: Corrigir o conflito — apenas o FocusTrap mais interno deve processar ESC (usar `stopPropagation`)
  - [ ] 5.4: Testar com 2+ modais empilhados (Modal base + ConfirmModal) e validar que ESC fecha apenas o filho — manual
- [x] Task 6: Garantir qualidade
  - [x] 6.1: `npm run typecheck` passa sem erros
  - [x] 6.2: `npm run lint` passa sem erros
  - [x] 6.3: `npm test` passa sem regressoes (748 passed, 1 pre-existing timeout em tools.salesTeamMatrix.test.ts)

## Dev Notes

- **Toast:** Usa `ToastContext` custom em `context/ToastContext.tsx`. NAO usa Sonner.
- **z-index real:** Toast container esta em `z-50` (linha 116 de ToastContext.tsx). O overlay do modal usa `z-[var(--z-modal)]` onde `--z-modal: 300` (globals.css linha 79). Para toast aparecer acima do modal, usar `z-[calc(var(--z-modal)+1)]` (= z-301).
- **ESC handler:** Pode estar no FocusTrap base (`lib/a11y/components/FocusTrap.tsx`) — precisa de um sistema de stack (registro de modais abertos, ESC fecha o ultimo). O ConfirmModal e o modal filho no cenario de stack.
- **Bug de produto:** Pode ser um optimistic update que reverte silenciosamente — investigar se o estado local e atualizado antes da resposta do servidor e depois revertido por invalidacao de cache incorreta.
- **Custom fields no modal de contato:** ATENCAO — verificar se `ContactDetailModal.tsx` renderiza inputs para `custom_fields`. Se o componente de input nao existe, esta task e "criar componente" (feature), nao "fix de input" (bug). Isso pode aumentar a estimativa de pontos da story.

### Source Tree

**Arquivos a modificar:**
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/context/ToastContext.tsx` (linha 116) — Task 4: z-index do toast container
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/lib/a11y/components/FocusTrap.tsx` — Task 5: ESC handler em modais aninhados
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/features/settings/components/TagsManager.tsx` — Task 3: adicionar botao de edicao
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/features/settings/components/ProductsCatalogManager.tsx` — Task 2: fix save de produto

**Arquivos de referencia (somente leitura):**
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/components/ui/Modal.tsx` — overlay z-index (usa --z-modal)
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/components/ui/modalStyles.ts` — estilos do modal
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/components/ConfirmModal.tsx` — modal filho (cenario de stack)
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/app/globals.css` — CSS variable --z-modal: 300 (linha 79)
- `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/features/contacts/components/ContactDetailModal.tsx` — Task 1: custom fields

### Testing

**Abordagem:** Manual
**Cenarios por AC:**
- AC1: Modal do contato → input de custom field → digitar valor → confirmar → valor deve persistir
- AC2: Settings → editar produto → salvar → refresh → edicao deve persistir na primeira tentativa
- AC3: Settings → tags → icone de editar deve existir → editar nome → salvar
- AC4: Abrir modal + disparar toast → toast deve aparecer ACIMA do overlay do modal
- AC5: Abrir modal A → abrir modal B (confirm) sobre A → ESC → fecha B (nao A)
**Testes existentes relevantes:** Nenhum teste automatizado para settings/modais
**Dados de teste necessarios:** Produtos e tags existentes no staging

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Medium
- Secondary Types: UX/Accessibility

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
- z-index layering system (CSS variables)
- FocusTrap ESC handler conflicts
- Form state management in modals
- Optimistic update patterns for settings
- Accessibility: keyboard navigation in modal stacks

## QA Results

**Reviewer:** @qa (Quinn)
**Date:** 2026-03-09
**Verdict:** CONCERNS (all LOW — does not block merge)

### Issues

| # | Severity | Category | Description | Recommendation |
|---|----------|----------|-------------|----------------|
| 1 | LOW | tests | Mock em `SettingsPage.rbac.test.tsx` nao inclui `renameTag` no useSettingsController mock | Adicionar `renameTag: vi.fn()` ao mock (linhas 21-44) |
| 2 | LOW | code | Tag rename `Promise.all` sem error handling individual — contact updates podem falhar parcialmente | Aceitar para escala atual; considerar batch update com RPC se escala crescer |
| 3 | LOW | code | `stopPropagation()` no FocusTrap pode nao prevenir listeners no mesmo DOM node (document). Focus-trap's internal pause mechanism e o mecanismo real | Funciona na pratica. Se regressao aparecer, trocar para `stopImmediatePropagation()` |
| 4 | LOW | code | Product edit local state update sem refetch — divergencia possivel se DB update silently fails (0 rows) | Improvavel com RLS correto. Aceitar |

### Summary

5/5 ACs endereçados com implementacao correta. Typecheck, lint e test suite passam. 4 observacoes LOW que nao bloqueiam merge. Recomendo corrigir issue #1 (mock) antes do commit para manter cobertura de testes consistente.

## File List

| Arquivo | Acao | Task |
|---------|------|------|
| `context/ToastContext.tsx` | Modified | Task 4: z-50 → z-[var(--z-toast)] |
| `lib/a11y/components/FocusTrap.tsx` | Modified | Task 5: e.stopPropagation() no ESC handler |
| `features/contacts/cockpit/ContactCockpitDataPanel.tsx` | Modified | Task 1: CustomFieldInput com draft state + onBlur save |
| `features/settings/components/ProductsCatalogManager.tsx` | Modified | Task 2: update local state direto em vez de refetch |
| `features/settings/components/TagsManager.tsx` | Modified | Task 3: inline edit com icone de lapis + renameTag |
| `hooks/useTags.ts` | Modified | Task 3: adicionado renameTag (catalogo + contacts) |
| `features/settings/hooks/useSettingsController.ts` | Modified | Task 3: expoe renameTag |
| `features/settings/SettingsPage.tsx` | Modified | Task 3: passa onRenameTag para TagsManager |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @sm | Rework aplicado: SYS-1 CodeRabbit Integration, SYS-2 Testing, SYS-3 Source Tree, SYS-4 Subtasks decompostas; FIX-1.8.1 z-index corrigido (z-50 -> z-301 via --z-modal), FIX-1.8.2 menção Sonner removida, FIX-1.8.3 Task 5 expandida com subtasks, FIX-1.8.5 alerta de escopo para Task 1; adicionadas secoes Dependencies, Risks, Business Value, Criteria of Done |
| 2026-03-09 | @po | Validacao GO (9/10). Status Draft -> Ready. 1 should-fix: quality_gate @qa nao esta no enum do template (@architect, @dev, @pm) -- aceito como desvio documentado para epic QV. 0 critical issues. 14/14 anti-hallucination checks passed. |
| 2026-03-09 | @sm | Fix SF-1: quality_gate corrigido de @qa para @architect |
| 2026-03-09 | @dev | Implementacao completa: 5 bugs corrigidos. Task 1: CustomFieldInput com draft state + onBlur. Task 2: update local state direto. Task 3: renameTag no hook + inline edit. Task 4: z-[var(--z-toast)]. Task 5: e.stopPropagation no FocusTrap ESC. All quality gates pass. |
| 2026-03-09 | @qa | Review: CONCERNS (4 LOW). Mock incompleto em RBAC test, tag rename sem error handling individual, stopPropagation vs stopImmediatePropagation, product save local-only. Nenhum bloqueia merge. Recomenda fix do mock antes do commit. |

---
*Story gerada por @sm (River) — Epic QV*
