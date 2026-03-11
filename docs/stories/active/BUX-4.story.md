# Story BUX-4: Menu de Acoes Visivel (3 Dots)

## Metadata
- **Story ID:** BUX-4
- **Epic:** BUX (Board UX & Filtros Gerenciais)
- **Status:** InReview
- **Priority:** P2
- **Estimated Points:** 5 (S)
- **Wave:** 2
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, a11y_check]

## Story

**As a** corretor/gestor do ZmobCRM usando o board Kanban,
**I want** um botao "..." visivel no card que abre o menu de acoes (Win/Lose/Move/Delete/Agendar),
**so that** possa acessar acoes rapidas de forma intuitiva sem depender do clique no icone de atividade que tem proposito ambiguo.

## Descricao

Adicionar um botao "..." (3 dots / MoreHorizontal) no canto superior direito do card como ponto de acesso alternativo ao menu de acoes. O menu e o MESMO do ActivityStatusIcon — reutilizar o componente existente, nao duplicar.

1. **Botao 3 dots**: Icone `MoreHorizontal` (Lucide) no canto superior direito do card, visivel em hover (desktop) e sempre visivel (touch).
2. **Reutilizacao do menu**: Abrir o MESMO menu do ActivityStatusIcon (Win, Lose, Move, Delete, Agendar).
3. **Nao duplicar**: Quando 3 dots esta aberto, ActivityStatusIcon nao abre simultaneamente (e vice-versa).

## Acceptance Criteria

- [ ] AC1: Given um card no board, when usuario hover no desktop, then icone "..." aparece no canto superior direito
- [ ] AC2: Given um card em dispositivo touch, when renderizado, then icone "..." esta sempre visivel (sempre visivel em viewports mobile, < md breakpoint)
- [ ] AC3: Given o usuario clica em "...", when menu abre, then mostra as mesmas opcoes do ActivityStatusIcon (Win, Lose, Move, Delete, Agendar)
- [ ] AC4: Given o menu aberto via "...", when renderizado, then reutiliza o mesmo componente de menu (nao duplica)
- [ ] AC5: Given o menu aberto via "...", when usuario pressiona Tab, then navega pelos itens; Enter executa; Escape fecha

## Scope

### IN
- Adicionar botao MoreHorizontal no DealCard
- Reutilizar menu do ActivityStatusIcon
- Garantir exclusividade (so um menu aberto por vez)
- Acessibilidade via teclado

### OUT
- Novos itens no menu (mesmo escopo do ActivityStatusIcon)
- Mudancas no layout geral do card
- Mudancas no schema/banco de dados

## Tasks

### Task 1 — Botao 3 dots no card (AC1, AC2)
- [x] Task 1.1: Em `DealCard.tsx`, adicionar import de `MoreHorizontal` do lucide-react
- [x] Task 1.2: Adicionar botao no canto superior direito do card (dentro do container `relative` existente, proximo aos badges):
  ```tsx
  <button
    onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : deal.id); }}
    aria-label="Menu de acoes"
    aria-haspopup="menu"
    className="absolute top-2 right-2 p-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity
               text-muted-foreground hover:text-foreground hover:bg-muted focus-visible-ring z-20"
  >
    <MoreHorizontal size={14} />
  </button>
  ```
  - Nota: abordagem mobile-first — sempre visivel em viewports mobile (< md breakpoint); em desktop (>= md) oculto por padrao, exibido no hover do grupo
  - Posicionar para nao conflitar com os badges (won/lost/rotting) que usam `-top-2 -right-2`
- [x] Task 1.3: Ajustar posicao: badges usam `absolute -top-2 -right-2`, botao 3 dots deve usar `top-1 right-1` para nao sobrepor

### Task 2 — Reutilizar menu do ActivityStatusIcon (AC3, AC4)
- [x] Task 2.1: O menu ja e gerenciado via `isMenuOpen` / `setOpenMenuId` — o mesmo state controla ambos os trigger points (ActivityStatusIcon e 3 dots)
- [x] Task 2.2: Quando o menu esta aberto (seja via ActivityStatusIcon ou 3 dots), o portal ja renderiza na posicao correta. Garantir que o `triggerRef` aponta para o botao que foi clicado:
  - Opcao A (mais simples): Manter o menu via ActivityStatusIcon como unico renderizador do portal. O botao 3 dots apenas alterna `isMenuOpen` — o menu se posiciona no ActivityStatusIcon como ja faz.
  - Opcao B (melhor UX): Passar ref do trigger ativo para posicionar o menu proximo ao botao clicado.
  - **Recomendacao:** Opcao A para manter simplicidade. O menu aparece proximo ao ActivityStatusIcon independentemente de qual botao disparou.
  - **Implementado:** Opcao A

### Task 3 — Acessibilidade (AC5)
- [x] Task 3.1: Botao com `aria-label="Menu de acoes"`, `aria-haspopup="menu"`, `aria-expanded={isMenuOpen}`
- [x] Task 3.2: Garantir que Tab navega para o botao, Enter/Space abre menu, Escape fecha

### Task 4 — Quality Gate
- [x] Task 4.1: `npm run typecheck` passa sem erros
- [x] Task 4.2: `npm run lint` passa sem erros
- [x] Task 4.3: `npm test` passa sem regressoes (844 testes OK)
- [x] Task 4.4: Verificar acessibilidade: keyboard navigation funciona

## Dev Notes

### Contexto Arquitetural Verificado

**DealCard.tsx (306 linhas):**
- Container principal e `relative` (via classes em getCardClasses) — ideal para posicionar botao absolute
- Badges existentes (saving/won/lost/rotting) usam `absolute -top-2 -right-2 z-10`
- `isMenuOpen` e `setOpenMenuId` ja sao props do componente (linhas 22-23) — reutilizar
- Componente memoizado (React.memo linha 306) — botao 3 dots usa props existentes, nao quebra memoizacao
- Classe `group` ja esta no card (linha 122) — `group-hover:opacity-100` funciona automaticamente

**ActivityStatusIcon.tsx (228 linhas):**
- Menu via Portal (createPortal para document.body) — unico menu por vez
- Posicionamento baseado em `triggerRef` (useLayoutEffect linhas 101-109)
- Secoes: Resultado (Win/Lose), Agendar (Call/Meeting), Acoes Rapidas (Move/Delete)

**Estado do menu:**
- Gerenciado em KanbanBoard via `openActivityMenuId` / `setOpenActivityMenuId`
- Apenas 1 menu aberto por vez (design existente) — 3 dots compartilha o mesmo state
- Click outside handler em useBoardView.ts (linhas 69-73) fecha o menu

### Padroes a Seguir

- **Icone:** `MoreHorizontal` (Lucide) — padrao de "more options" em UIs
- **Visibilidade:** `opacity-0 group-hover:opacity-100` para desktop, override para touch
- **z-index:** Usar `z-20` (acima dos badges que usam `z-10`)

### Soft Dependencies

- **BUX-1** deve ser concluida primeiro (card layout atualizado com novas rows)
- O botao 3 dots nao conflita com as mudancas de BUX-1 (diferentes areas do card)

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Low (1 botao + reutilizacao de menu existente)
- Secondary Types: nenhum

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa (quality gate)

**Quality Gate Tasks:**
- [x] Pre-Commit review (@dev) — REQUIRED

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Acessibilidade: aria-labels, keyboard navigation
- Performance: nao quebrar React.memo do DealCard
- z-index: nao conflitar com badges existentes

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Botao 3 dots sobrepoe badges | Media | Baixo | Usar posicao diferente (top-1 right-1 vs -top-2 -right-2) |
| Dois menus abrem simultaneamente | Baixa | Medio | Compartilhar mesmo state isMenuOpen/setOpenMenuId |
| Touch detection inconsistente | Baixa | Baixo | Usar media query ou pointer:coarse |

## Dependencies

- **Soft dependency: BUX-1** (card layout atualizado) — idealmente executar apos BUX-1
- **Nenhuma migration necessaria**
- **Nenhuma mudanca de API**

## Criteria of Done

- [ ] Botao "..." aparece em hover (desktop) e sempre visivel (touch)
- [ ] Menu abre com mesmas opcoes do ActivityStatusIcon
- [ ] Apenas um menu aberto por vez
- [ ] Acessivel via teclado (Tab, Enter, Escape)
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] `npm test` passa sem regressoes

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| features/boards/components/Kanban/DealCard.tsx | Modificado | Adicionado botao MoreHorizontal (3 dots) com import de Button e MoreHorizontal |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic BUX |
| 2026-03-10 | @sm | Correcao PO: substituido touch:opacity-100 por abordagem mobile-first (classe inexistente no Tailwind) |
| 2026-03-10 | @dev | Implementacao completa: botao 3 dots (Option A), reutiliza menu existente. typecheck/lint/test OK (844 testes). Status Ready → InReview. |

---
*Story gerada por @sm (River) — Epic BUX (Board UX & Filtros Gerenciais)*
