# Story CP-1.2: Script Guiado Interativo Durante Chamada

## Metadata
- **Story ID:** CP-1.2
- **Epic:** CP (Central de Prospeccao)
- **Status:** Done
- **Owner:** (unassigned)
- **Executor:** @dev
- **Quality Gate:** @architect
- **Quality Gate Tools:** [code_review, ux_validation, pattern_validation]
- **Estimated Hours:** 12-16
- **Priority:** P2

## Descricao

Evoluir o sistema de scripts (ScriptEditorModal) para exibir um guia interativo DURANTE a chamada no fluxo de prospeccao. Quando o corretor esta no modo power dialer (CP-1.1) e abre o CallModal, um painel lateral exibe o script selecionado com variaveis substituidas pelos dados reais do contato. O script e dividido em secoes navegaveis (intro, qualificacao, objecoes, fechamento) com quick-actions para marcar objecoes ouvidas e copiar trechos.

## Acceptance Criteria

- [x] AC1: Antes de iniciar a sessao de prospeccao, o corretor seleciona um script da lista de scripts existentes
- [x] AC2: Durante a chamada (CallModal aberto), um painel lateral exibe o script selecionado
- [x] AC3: Variaveis do script ({nome}, {empresa}, {valor}, {produto}) sao substituidas pelos dados reais do contato atual
- [x] AC4: O script e dividido em secoes navegaveis: intro, qualificacao, objecoes, fechamento (ou secoes customizaveis)
- [x] AC5: O corretor pode navegar entre secoes (anterior/proximo) sem perder o estado da chamada
- [x] AC6: Quick-action "Copiar trecho" — copia o texto da secao atual para clipboard
- [x] AC7: Quick-action "Marcar objecao" — registra qual objecao foi ouvida (salva junto com o log da ligacao)
- [x] AC8: O script guiado so aparece no fluxo de prospeccao, nao no CallModal avulso de outras paginas
- [x] AC9: Se nenhum script selecionado, o painel mostra sugestao para criar/selecionar um
- [x] AC10: Responsivo — em mobile, o script aparece como aba/drawer, nao painel lateral
- [x] AC11: Dark mode

## Escopo

### IN
- Componente `ProspectingScriptGuide` — painel lateral com script guiado
- Seletor de script pre-sessao
- Substituicao de variaveis com dados do contato
- Secoes navegaveis do script
- Quick-actions (copiar, marcar objecao)
- Integracao com PowerDialer/CallModal
- Responsivo (painel lateral desktop, drawer mobile)

### OUT
- Criacao/edicao de scripts (ja existe no ScriptEditorModal)
- IA para sugerir respostas em tempo real
- Gravacao de audio
- Analytics por secao do script

## Dependencias
- **Blocked by:** CP-1.1 (pagina + power dialer)
- **Blocks:** Nenhuma

## Tasks / Subtasks

### Seletor de Script Pre-Sessao (AC: 1, 9)
- [x] 1. Criar `features/prospecting/components/ScriptSelector.tsx`:
  - Lista scripts existentes do usuario (query `quick_scripts` table)
  - Preview do script ao hover/tap
  - Botao "Selecionar" que armazena o script escolhido no estado da sessao
  - Fallback: "Nenhum script disponivel — Criar novo" (link para ScriptEditorModal)
- [x] 2. Integrar ScriptSelector no fluxo pre-sessao do ProspectingPage (antes do "Iniciar Sessao")

### Script Guiado Durante Chamada (AC: 2, 3, 4, 5)
- [x] 3. Criar `features/prospecting/components/ProspectingScriptGuide.tsx`:
  - Recebe: script template, variaveis do contato atual
  - Parser de secoes: dividir template por marcadores (ex: `## Intro`, `## Qualificacao`, `## Objecoes`, `## Fechamento`)
  - Se nao tem marcadores, exibir como secao unica
  - Substituicao de variaveis: `{nome}` → contato.name, `{empresa}` → contato.company, etc.
  - Navegacao entre secoes: tabs ou stepper
  - Highlight da secao atual
- [x] 4. Criar `features/prospecting/utils/scriptParser.ts`:
  - `parseScriptSections(template: string): ScriptSection[]`
  - `substituteVariables(template: string, contact: Contact): string`
- [x] 5. Integrar o painel ao lado do CallModal no fluxo de prospeccao:
  - Desktop: layout side-by-side (CallModal 50% + ScriptGuide 50%)
  - Mobile: ScriptGuide como drawer que abre por cima

### Quick Actions (AC: 6, 7)
- [x] 6. Botao "Copiar trecho" em cada secao — usa `navigator.clipboard.writeText()`
- [x] 7. Botao "Marcar objecao" — lista objecoes comuns da categoria do script, toggle on/off
- [x] 8. Salvar objecoes marcadas junto com o `CallLogData` no `onSave` do CallModal
  - Extender `CallLogData` ou salvar como campo extra nas notes

### Adaptacao do Fluxo (AC: 8, 10, 11)
- [x] 9. Condicional: ScriptGuide so renderiza quando `source === 'prospecting'` (nao aparece no CallModal de outras paginas)
- [x] 10. Layout responsivo: media queries para mobile drawer vs desktop side panel
- [x] 11. Dark mode: classes `dark:` em todos os componentes

### Testes
- [x] 12. Testar selecao de script pre-sessao
- [x] 13. Testar substituicao de variaveis com dados reais do contato
- [x] 14. Testar navegacao entre secoes do script
- [x] 15. Testar quick-actions (copiar, marcar objecao)
- [x] 16. Testar que ScriptGuide NAO aparece no CallModal fora do fluxo de prospeccao

## Notas Tecnicas

### ScriptEditorModal existente
- Path: `features/inbox/components/ScriptEditorModal.tsx`
- Interface: `ScriptFormData { id, title, category, template, icon }`
- Categorias: followup, objection, closing, intro, rescue, other
- Variaveis suportadas: `{nome}`, `{empresa}`, `{valor}`, `{produto}`
- Funcao `applyVariables(template, variables)` ja existe — **reutilizar logica**

### Schema DB
- Tabela `quick_scripts`: id, title, category, template, icon, user_id, organization_id
- A query de scripts ja existe no InboxFocusView — reutilizar hook

### Layout
- CallModal usa `fixed inset-0` com z-index 9999
- Para o layout side-by-side, o ProspectingScriptGuide deve ficar DENTRO do mesmo container modal
- Em mobile, usar um drawer/sheet pattern (similar ao MoreMenuSheet)

---

## File List

| File | Status | Notes |
|------|--------|-------|
| features/prospecting/components/ScriptSelector.tsx | Deleted | Substituido por dropdown inline no PowerDialer |
| features/prospecting/components/ProspectingScriptGuide.tsx | New | Painel de script guiado com secoes, copiar, objecoes |
| features/prospecting/utils/scriptParser.ts | New | parseScriptSections + substituteVariables + cleanUnresolvedVariables + buildContactVariables |
| features/prospecting/components/PowerDialer.tsx | Modified | Integrar ScriptGuide, keyboard shortcuts, session stats, Escape handler |
| features/prospecting/ProspectingPage.tsx | Modified | Adicionar ScriptSelector pre-sessao + estado selectedScript |
| features/prospecting/__tests__/scriptParser.test.ts | New | 14 testes para parser, variaveis e cleanUnresolved |
| features/prospecting/__tests__/scriptGuide.test.tsx | Modified | 9 testes para ScriptGuide e objecoes (ScriptSelector tests removidos) |
| features/prospecting/__tests__/powerDialer.test.tsx | New | 21 testes para shortcuts, dropdown, stats chips, preview, purple dot |
| docs/qa/QA_FIX_REQUEST_CP-1.2-UX.md | New | QA fix request UX com 4 issues resolvidas |

## Definition of Done

- [x] All acceptance criteria met
- [x] Script guiado funcional durante chamada com variaveis substituidas
- [x] Quick-actions funcionais (copiar, marcar objecao)
- [x] Responsivo (desktop side panel, mobile drawer)
- [x] Dark mode testado
- [x] No regressions no CallModal existente
- [x] Code reviewed — QA gate PASS (score 10/10, 0 issues abertas)

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @sm (River) | Story criada a partir do Epic CP |
| 2026-03-03 | @dev (Dex) | Implementacao: ScriptSelector, ProspectingScriptGuide, scriptParser, integracao PowerDialer/ProspectingPage. 24 novos testes. Lint + typecheck + testes passando. |
| 2026-03-03 | @qa (Quinn) | Review PASS 9/10. 3 issues LOW: variaveis nao-resolvidas, objecoes hardcoded, clipboard silencioso. Fix request gerado. |
| 2026-03-03 | @dev (Dex) | QA fixes aplicados: cleanUnresolvedVariables, objecoes por categoria, toast no clipboard. +5 testes (50 total). Commit b01e3c7. |
| 2026-03-03 | @qa (Quinn) | Re-review PASS 10/10. Zero issues. 50/50 testes, typecheck + lint limpos. |
| 2026-03-03 | @po (Pax) | ACs 1-11 marcados, DoD completo, status Done. Story pronta para push. |
| 2026-03-03 | @dev (Dex) | UX improvements: keyboard shortcuts (L/P/E/S), inline script dropdown, session stats chips, script preview. Commits a9af69d, 8c03fe6. |
| 2026-03-03 | @qa (Quinn) | Review UX: CONCERNS — 4 issues (1 MEDIUM, 3 LOW). QA_FIX_REQUEST_CP-1.2-UX.md gerado. |
| 2026-03-03 | @dev (Dex) | QA UX fixes: 21 testes PowerDialer, ScriptSelector removido (dead code), Escape fecha dropdown, CSS limpo. Commit 5643fb1. |
| 2026-03-03 | @qa (Quinn) | Re-review UX: PASS 95/100. 138 testes, 4/4 issues resolvidas. Gate file criado. |
