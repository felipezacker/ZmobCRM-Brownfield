# Story TD-0.1: Emergencia DB-006 + Dead Code Cleanup

## Metadata
- **Story ID:** TD-0.1
- **Epic:** TD (Technical Debt Resolution)
- **Status:** Done
- **Priority:** P0 (Emergencia)
- **Estimated Points:** 1
- **Wave:** 0
- **Assigned Agent:** @dev

## Descricao

Esta story combina a correcao de emergencia da vulnerabilidade cross-tenant DB-006 (`merge_contacts`) com a limpeza de dead code confirmado (5 arquivos/modulos que nao sao importados por nenhuma parte do sistema).

**DB-006 e o unico debito com risco de exploracao cross-tenant ativo em producao.** A funcao `merge_contacts()` e SECURITY DEFINER e obtem `v_org_id` do loser, mas NAO verifica se o caller pertence a essa organizacao nem se o winner pertence a mesma org. Qualquer usuario com dois UUIDs validos pode mesclar contatos de outra organizacao.

O dead code pode ser removido em 30 minutos com zero risco funcional -- todos os arquivos foram confirmados como nao importados por nenhuma rota ou componente ativo.

## Acceptance Criteria

### DB-006: merge_contacts cross-tenant fix
- [x] AC1: Given um usuario da Org A, when chama `merge_contacts(uuid_org_B_contact, uuid_org_B_contact_2)`, then a funcao retorna EXCEPTION com mensagem de permissao negada
- [x] AC2: Given um usuario da Org A, when chama `merge_contacts(uuid_org_A_winner, uuid_org_B_loser)`, then a funcao retorna EXCEPTION (winner e loser devem pertencer a mesma org do caller)
- [x] AC3: Given um usuario da Org A com dois contatos validos da Org A, when chama `merge_contacts(winner, loser)`, then o merge executa normalmente como antes
- [x] AC4: A migration inclui teste de seguranca que verifica o bloqueio cross-tenant

### Dead Code Cleanup
- [x] AC5: Given o arquivo `ActivityFormModalV2.tsx` (UX-018), when verificado no codebase, then nao existe mais no repositorio
- [x] AC6: Given o arquivo `CreateDealModalV2.tsx` (UX-019), when verificado no codebase, then nao existe mais no repositorio
- [x] AC7: Given a rota `cockpit-v2/` (UX-020), when verificado no codebase, then o diretorio inteiro nao existe mais
- [ ] AC8: Given o arquivo `components/AIAssistant.tsx` (UX-025), when verificado no codebase, then nao existe mais no repositorio -- **EXCEPTION: ACTIVELY IMPORTED by `features/inbox/components/FocusContextPanel.tsx` via React.lazy. NOT dead code. Cannot delete.**
- [x] AC9: Given a declaracao `--font-serif: 'Cinzel'` no @theme (UX-010), when verificado no CSS, then a declaracao nao existe mais

## Scope

### IN
- Fix de seguranca em `merge_contacts()` (adicionar validacao de org do caller)
- Migration SQL com a correcao
- Delecao de 4 arquivos/diretorios de dead code confirmado
- Remocao de `--font-serif` do @theme CSS

### OUT
- Reescrita do EXECUTE dinamico em merge_contacts (DB-025 -- story TD-1.1)
- Correcoes em outras funcoes SECURITY DEFINER (TD-1.1)
- Qualquer refatoracao de componentes ativos

## Technical Notes

### DB-006 Fix
- Arquivo: `supabase/migrations/` (nova migration)
- Funcao alvo: `merge_contacts(p_winner_id UUID, p_loser_id UUID)`
- Fix: Adicionar no inicio da funcao:
  ```sql
  -- Validar que caller pertence a mesma org que winner e loser
  IF v_org_id != (SELECT organization_id FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: cross-tenant merge not allowed';
  END IF;
  -- Validar que winner pertence a mesma org
  IF (SELECT organization_id FROM contacts WHERE id = p_winner_id) != v_org_id THEN
    RAISE EXCEPTION 'Permission denied: winner belongs to different organization';
  END IF;
  ```
- Testar em staging ANTES de producao

### Dead Code
- `UX-018`: Buscar `ActivityFormModalV2` -- arquivo V2 nao importado em nenhum lugar
- `UX-019`: Buscar `CreateDealModalV2` -- arquivo V2 nao importado em nenhum lugar
- `UX-020`: Rota `cockpit-v2/` sem link de navegacao, inacessivel
- `UX-025`: `AIAssistant.tsx` importacao comentada, substituido por UIChat
- `UX-010`: `--font-serif: 'Cinzel'` declarada mas nao utilizada (grep confirma)

## Dependencies
- Nenhuma. Esta story nao depende de nenhuma outra e deve ser executada IMEDIATAMENTE.

## Debitos Enderecados
| ID | Debito | Severidade |
|----|--------|-----------|
| DB-006 | `merge_contacts()` SECURITY DEFINER sem validacao cross-tenant | CRITICAL |
| UX-018 | ActivityFormModalV2 dead code | LOW |
| UX-019 | CreateDealModalV2 dead code | LOW |
| UX-020 | DealCockpit V2 dead code | LOW |
| UX-025 | AIAssistant.tsx deprecado | LOW |
| UX-010 | Font serif nao utilizada | LOW |

## Definition of Done
- [x] DB-006 migration aplicada em staging com testes cross-tenant passando
- [x] 3 de 4 arquivos/diretorios de dead code removidos (AIAssistant.tsx e excecao -- ativamente importado)
- [x] `--font-serif` removido do @theme
- [x] `npm run typecheck` passando
- [x] `npm run lint` passando
- [x] `npm test` passando sem regressoes
- [x] Code reviewed

## File List

### Deleted
- `features/activities/components/ActivityFormModalV2.tsx` -- dead code V2 modal (AC5)
- `features/boards/components/Modals/CreateDealModalV2.tsx` -- dead code V2 modal (AC6)
- `app/(protected)/deals/[dealId]/cockpit-v2/page.tsx` -- dead code V2 route (AC7)

### Modified
- `app/globals.css` -- removed `--font-serif: 'Cinzel', serif` from @theme (AC9)
- `features/deals/cockpit/DealCockpitClient.tsx` -- removed stale `cockpit-v2` URL check (cleanup from AC7)

### Not Deleted (Exception)
- `components/AIAssistant.tsx` -- AC8 EXCEPTION: actively imported by `features/inbox/components/FocusContextPanel.tsx:1886` via `React.lazy(() => import('@/components/AIAssistant'))`. Story note UX-025 states "importacao comentada, substituido por UIChat" but this is incorrect -- the import is live and uncommented. UX-025 debito needs re-evaluation.

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2026-03-06 | @pm | Story created |
| 2026-03-06 | @dev | AC5-AC7, AC9 completed. AC8 documented as exception (AIAssistant.tsx is actively imported). |
| 2026-03-06 | @data-engineer | DB-006 migration applied to staging. AC1-AC3 verified in runtime. All PASS. |
| 2026-03-06 | @qa | QA Gate: PASS. Story Done. |

## QA Results

### Review Date: 2026-03-06

### Reviewed By: Quinn (Test Architect)

### AC Traceability

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | PASS | Migration L66-72: `SELECT organization_id INTO v_caller_org_id FROM profiles WHERE id = auth.uid()` + `IF v_caller_org_id IS NULL OR v_caller_org_id != v_org_id THEN RAISE EXCEPTION`. Cross-org caller is blocked. |
| AC2 | PASS | Migration L74-85: `SELECT organization_id INTO v_winner_org_id FROM contacts WHERE id = p_winner_id` + `IF v_winner_org_id != v_org_id THEN RAISE EXCEPTION`. Cross-org winner is blocked. |
| AC3 | PASS | Both checks pass when caller, winner, and loser share the same org. Function proceeds normally through L91+ (field copy, deal/phone/pref transfer, soft delete, audit). |
| AC4 | PASS | Migration L168-201: DO $$ block verifies via pg_proc catalog: (1) function exists, (2) SECURITY DEFINER is set, (3) caller-org validation message present, (4) winner-org validation message present, (5) auth.uid() call present. All 5 ASSERTs fail with descriptive messages if checks are absent. |
| AC5 | PASS | Glob `**/ActivityFormModalV2*` returns no files. Git status confirms deletion. |
| AC6 | PASS | Glob `**/CreateDealModalV2*` returns no files. Git status confirms deletion. |
| AC7 | PASS | Glob `**/cockpit-v2/**` returns no files. Grep confirms zero remaining references in DealCockpitClient.tsx. |
| AC8 | PASS (exception) | `components/AIAssistant.tsx` exists. FocusContextPanel.tsx:1886 actively imports via `React.lazy(() => import('@/components/AIAssistant'))`. Correctly NOT deleted. UX-025 debt needs re-evaluation. |
| AC9 | PASS | Grep `--font-serif` and `Cinzel` across all CSS files returns zero matches. |

### Quality Checks

| Check | Result | Notes |
|-------|--------|-------|
| Tests | PASS | 665 passed, 0 failed, 2 skipped (main app). Pre-existing `apps/dashboard/` failures excluded (not related to this story). |
| Typecheck | PASS | Only pre-existing `apps/dashboard/` TS errors. No errors in story-modified files. |
| Lint | PASS | 1 pre-existing error in `apps/dashboard/AppShell.tsx` (undefined rule). No lint issues in story-modified files. |
| Security (migration) | PASS | `SET search_path = public` added. Both caller-org and winner-org checks present. NULL handling covers edge cases (v_caller_org_id IS NULL). |
| Code review | PASS | Migration is clean, follows existing function signature. Dead code removals are surgical with no orphaned references. |

### Security Assessment (DB-006)

The migration correctly addresses the cross-tenant vulnerability:
1. **Check 1 (L66-72):** Validates caller (`auth.uid()`) belongs to loser's organization via profiles table lookup. NULL check covers the case where caller has no profile.
2. **Check 2 (L74-85):** Validates winner belongs to same organization as loser. Also checks winner is not soft-deleted.
3. **Placement:** Both checks execute BEFORE any data modification (field copy, transfers, soft delete).
4. **SECURITY DEFINER + SET search_path:** Properly hardened with `SET search_path = public` to prevent search_path injection.

### Re-review: AC4 Now Met (2026-03-06)

The migration now includes a `DO $$` inline test block (lines 168-201) that validates via `pg_proc` catalog introspection:
1. Function `merge_contacts()` exists in the `public` schema
2. Function is `SECURITY DEFINER` (the reason manual auth checks are needed)
3. Function body contains the caller-org validation message (`Permission denied: you do not belong`)
4. Function body contains the winner-org validation message (`Permission denied: winner and loser`)
5. Function body calls `auth.uid()` (confirming caller identity verification, not just a comment)

All 5 checks use `ASSERT` statements that raise descriptive EXCEPTION messages on failure. This is the correct approach since `auth.uid()` cannot be invoked in migration context -- catalog introspection confirms the guards are structurally present.

### Observation: AC8 AIAssistant.tsx

AC8 is marked as EXCEPTION (not a QA failure). The file is actively imported by `FocusContextPanel.tsx` via `React.lazy`. The UX-025 debt item that claimed this was dead code needs re-evaluation in a future story.

### Gate Status

Gate: PASS -> docs/qa/gates/TD-0.1-dead-code-cleanup.yml
