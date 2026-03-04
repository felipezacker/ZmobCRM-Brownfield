# QA Fix Request — CP-1.2 UX Improvements

## Metadata
- **Story:** CP-1.2
- **Reviewer:** @qa (Quinn)
- **Date:** 2026-03-03
- **Commits Reviewed:** `a9af69d`, `8c03fe6`
- **Verdict:** CONCERNS
- **Assigned To:** @dev (Dex)

---

## Issues

### Issue 1 — MEDIUM: Sem testes para melhorias UX do PowerDialer

**Arquivos afetados:** `features/prospecting/__tests__/` (novos testes necessários)

**Descrição:** Os commits `a9af69d` e `8c03fe6` adicionaram keyboard shortcuts, dropdown inline de script, session stats chips e script preview ao PowerDialer. Nenhuma dessas features tem cobertura de teste.

**Testes esperados:**
- [ ] Keyboard shortcuts: `L` abre CallModal, `P` chama onSkip, `E` chama onEnd, `S` abre/fecha dropdown
- [ ] Shortcuts desabilitados quando CallModal ou dropdown está aberto
- [ ] Shortcuts ignorados em inputs/textareas
- [ ] Dropdown de script: abrir, selecionar, deselecionar, fechar com outside click
- [ ] Session stats chips: renderiza apenas chips com count > 0
- [ ] Script preview: mostra primeiras 2 linhas com variáveis substituídas
- [ ] Purple dot no botão "Ligar" quando script selecionado

---

### Issue 2 — LOW: ScriptSelector.tsx é dead code

**Arquivo:** `features/prospecting/components/ScriptSelector.tsx`

**Descrição:** O novo dropdown inline no PowerDialer substituiu o ScriptSelector standalone. O componente não é importado em nenhum componente do app — apenas no arquivo de teste `scriptGuide.test.tsx`.

**Ação:** Remover `ScriptSelector.tsx` e os testes correspondentes em `scriptGuide.test.tsx` (describe `ScriptSelector`).

---

### Issue 3 — LOW: Dropdown não fecha com Escape

**Arquivo:** `features/prospecting/components/PowerDialer.tsx` (linhas 53-62)

**Descrição:** O dropdown de script só fecha por outside click ou pressionando `S` novamente. O padrão UX esperado é que `Escape` feche dropdowns abertos.

**Fix sugerido:** Adicionar handler de `Escape` no useEffect do dropdown ou no handler de keyboard shortcuts.

---

### Issue 4 — LOW: Classe `relative` desnecessária em botões

**Arquivo:** `features/prospecting/components/PowerDialer.tsx` (linhas 283-301)

**Descrição:** Botões "Pular" e "Encerrar" têm `className="...relative"` mas não possuem filhos com `absolute`. Apenas "Ligar" precisa de `relative` (para o purple dot indicator).

**Fix:** Remover `relative` do className dos botões "Pular" e "Encerrar".

---

## Checklist de Entrega

- [x] Issue 1: Testes adicionados e passando (21 testes em powerDialer.test.tsx)
- [x] Issue 2: Dead code removido (ScriptSelector.tsx + testes)
- [x] Issue 3: Escape fecha dropdown
- [x] Issue 4: Classes CSS limpas
- [x] Todos os testes passam (`vitest run` — 138 testes, 9 arquivos)
- [x] TypeScript limpo (`tsc --noEmit`)
