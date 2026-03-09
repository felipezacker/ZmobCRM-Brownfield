# Story QV-1.3: Chat IA Mobile Responsivo

## Metadata
- **Story ID:** QV-1.3
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

**As a** usuario do ZmobCRM no celular,
**I want** que o chat de IA caiba na tela e o input de mensagem seja acessivel,
**so that** possa usar o agente de IA no mobile sem problemas.

## Descricao

**Bug #23 (HIGH):** Chat IA ultrapassa a altura da tela verticalmente no mobile (375px).

**Bug #24 (HIGH):** Input de mensagem fica inacessivel porque o menu inferior (BottomNav) cobre o campo de input do chat.

O problema ocorre no modo **inline/sidebar** do chat — renderizado em `Layout.tsx:138` quando `isGlobalAIOpen` e true. O BottomNav (`fixed bottom-0 z-50`, 56px) cobre o input do chat porque o container aside nao considera a altura do nav. O modo **floating** (`UIChat.tsx:1313`, `fixed inset-0`) ja usa viewport completo e pode nao ter este problema.

## Acceptance Criteria

- [ ] AC1: Given o chat de IA aberto no mobile (375px), when renderizado, then o container ocupa no maximo `100dvh` sem ultrapassar a tela ou causar scroll externo
- [ ] AC2: Given o chat de IA no mobile, when o usuario quer digitar, then o input de mensagem e visivel e acessivel acima do BottomNav (56px)
- [ ] AC3: Given o chat de IA no mobile com teclado virtual aberto, when o usuario digita, then o input permanece visivel (nao coberto pelo teclado)
- [ ] AC4: Given respostas longas da IA no mobile, when renderizadas, then o scroll interno funciona e o texto e legivel (verificacao — item ja era PASS no checklist post-td)

## Scope

### IN
- Fix de altura do container do chat no modo inline/sidebar (`Layout.tsx`) para respeitar viewport mobile
- Fix de posicionamento do input considerando a altura do BottomNav (`--app-bottom-nav-height: 56px`)
- Ajuste para viewport resize com teclado virtual (visualViewport API ou `env(keyboard-inset-height)`)

### OUT
- Redesign completo do chat
- Features novas no chat
- Fix no modo floating (`UIChat.tsx:1313`) — esse modo usa `fixed inset-0` e nao apresenta o bug

## Tasks

- [ ] Task 1 — Implementacao (AC1, AC2):
  - [ ] Task 1.1: No modo inline/sidebar (`Layout.tsx:134-138`), ajustar altura do aside do chat para `calc(100dvh - var(--app-bottom-nav-height, 56px))`
  - [ ] Task 1.2: Verificar que o padding do input respeita `--app-bottom-nav-height` (ou adicionar padding-bottom equivalente no container de input)
- [ ] Task 2 — Implementacao (AC3):
  - [ ] Task 2.1: Implementar ajuste para viewport resize com teclado virtual usando `visualViewport` API ou CSS `env(keyboard-inset-height)`
  - [ ] Task 2.2: Verificar que o input permanece visivel ao abrir o teclado no iPhone SE (375px)
- [ ] Task 3 — Verificacao (AC4):
  - [ ] Task 3.1: Confirmar que scroll interno no container de mensagens funciona corretamente no mobile (era PASS no checklist post-td — apenas validar que fix do AC1 nao quebrou)
- [ ] Task 4 — Quality Gate:
  - [ ] Task 4.1: `npm run typecheck` passa sem erros
  - [ ] Task 4.2: `npm run lint` passa sem erros
  - [ ] Task 4.3: `npm test` passa (testes existentes nao regridem)

## Dev Notes

### Modo Afetado

O bug afeta o modo **inline/sidebar** (`Layout.tsx:138`) onde o chat e renderizado como `<aside>` dentro do layout flex. O BottomNav (`fixed bottom-0 z-50`, 56px) cobre o input do chat pois o aside nao desconta a altura do nav.

O modo floating (`UIChat.tsx:1313`, `fixed inset-0 md:inset-auto`) ja usa viewport completo e nao apresenta este bug — nao modificar.

### CSS Variables Reutilizaveis (ja existem)

```css
/* app/globals.css */
--app-safe-area-bottom: env(safe-area-inset-bottom, 0px);
--app-bottom-nav-height: 0px; /* setado via JS em Layout.tsx:58 para 56px no mobile */
```

```typescript
// Layout.tsx:58 — setado dinamicamente
document.documentElement.style.setProperty('--app-bottom-nav-height', isMobile ? '56px' : '0px');
```

O BottomNav usa: `h-[var(--app-bottom-nav-height,56px)]` — confirma 56px no mobile.

### Approach Preferido

Usar `calc(100dvh - var(--app-bottom-nav-height, 56px))` como valor de altura para o aside do chat no mobile. `dvh` e mais moderno que `vh` e lida melhor com barras de endereco mobile (barras que aparecem/somem ao scrollar).

Para teclado virtual: `visualViewport` API e a abordagem mais confiavel cross-browser no mobile. Alternativa CSS: `env(keyboard-inset-height)` (suporte limitado em 2026).

### Source Tree

**Arquivos a modificar:**
- `components/Layout.tsx` — where o aside do chat sidebar e montado (`linha 134-138`) e onde o BottomNav e renderizado (`linha 144`)
- `components/ai/UIChat.tsx` (1338 linhas, 3 modos de renderizacao) — ajustar altura do container no modo inline se necessario

**Arquivos de referencia (somente leitura):**
- `components/navigation/BottomNav.tsx` — menu inferior fixo (`fixed inset-x-0 bottom-0 z-50 md:hidden`, `h-[var(--app-bottom-nav-height,56px)]`)
- `components/AIAssistant.tsx` — wrapper overlay do chat (nao afetado)
- `app/globals.css` — CSS variables (`--app-bottom-nav-height`, `--app-safe-area-bottom`)

### Testing

**Abordagem:** Manual
**Cenarios por AC:**
- AC1: Abrir chat IA no mobile (375px) → container nao ultrapassa 100dvh, sem scroll externo
- AC2: No mobile com chat aberto → input visivel acima do BottomNav (56px)
- AC3: No mobile com chat aberto → abrir teclado virtual → input permanece visivel
- AC4: Enviar prompt que gere resposta longa → scroll interno funciona, texto legivel
**Testes existentes relevantes:** Nenhum teste automatizado para layout mobile
**Dados de teste necessarios:** Nenhum — usar Chrome DevTools device toolbar, iPhone SE 375px

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| `dvh` nao suportado em browser antigo | Baixa | Medio | Usar `vh` como fallback: `calc(100dvh, calc(100vh - var(--app-bottom-nav-height,56px)))` |
| Fix do aside quebrar layout desktop | Media | Alto | Aplicar fix apenas em mobile via CSS `@media (max-width: 768px)` ou verificar `isMobile` ja presente em Layout.tsx |
| visualViewport API ausente em alguns browsers | Baixa | Baixo | Usar feature detection antes de adicionar event listener |

## Dependencies

- **Pre-requisito:** Nenhuma story anterior bloqueante
- **CSS Variables:** Dependem de `Layout.tsx:58` setar `--app-bottom-nav-height` corretamente (ja implementado)
- **Componentes dependentes:** BottomNav (`z-50`) e UIChat — nao modificar z-index do BottomNav

## Criteria of Done

- [ ] AC1-AC4 todos verificados manualmente no Chrome DevTools com iPhone SE (375px)
- [ ] Nenhuma regressao no layout desktop (1024px+)
- [ ] `npm run typecheck`, `npm run lint` e `npm test` passam
- [ ] Arquivo(s) modificado(s) listado(s) na secao File List desta story
- [ ] CodeRabbit Pre-Commit executado e CRITICAL issues resolvidos

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Medium
- Secondary Types: CSS/Layout

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
- Mobile viewport handling (dvh, lvh, svh)
- CSS variable usage consistency
- z-index layering conflicts
- Virtual keyboard interaction (visualViewport API)
- Responsive breakpoint behavior

## File List

_(a ser preenchido pelo @dev durante implementacao)_

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @sm | Rework completo: fixes sistêmicos (SYS-1 a SYS-4) + fixes específicos (FIX-1.3.1 a FIX-1.3.6) aplicados por @po validation |
| 2026-03-09 | @po | Validacao GO (10/10). Status Draft -> Ready. 0 critical, 1 should-fix (quality_gate @qa vs template). Anti-hallucination LIMPO. |
| 2026-03-09 | @sm | Fix SF-1: quality_gate corrigido de @qa para @architect |

---
*Story gerada por @sm (River) — Epic QV*
