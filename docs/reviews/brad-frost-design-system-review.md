# Design System Review — Brad Frost Perspective

**Reviewer:** Brad Frost (Atomic Design)
**Data:** 2026-03-03
**Projeto:** ZmobCRM
**Versao do Projeto:** 1.4.3
**Fase:** Brownfield Discovery — Complemento ao Phase 6 (UX Specialist Review)

---

## Design System Maturity Score

| Dimensao | Score (1-5) | Notas |
|----------|-------------|-------|
| Token Coverage | 3 | Arquitetura de 3 camadas e moderna, mas 2.475 ocorrencias de cores Tailwind diretas e leaks semanticos em componentes da propria biblioteca base (EmptyState, Sheet, DealCard) indicam que os tokens existem mas nao sao respeitados |
| Component Coverage | 2 | 23 arquivos em `components/ui/` cobrem os atomos basicos bem. Mas nao ha Skeleton, Input standalone, Select (Radix), Textarea, Combobox baseado em primitivo, Accordion exposto, Separator, nem nenhum molecule de layout como PageLayout ou SectionHeader |
| Documentation | 1 | Zero Storybook. Zero stories. JSDoc auto-gerado nos componentes e util mas nao substitui documentacao visual. Sem guia de uso, sem exemplos de composicao, sem catalogo |
| Consistency | 2 | Tres padroes de API incompativeis coexistem (CVA/forwardRef, React.FC sem ref, React.FC sem CVA). A propria biblioteca de atomos contem hardcodes de slate/gray/white. Sheet e ActionSheet duplicam logica de overlay sem compartilhar tokens |
| Composability | 3 | Os shadcn/ui atoms seguem o padrao correto (forwardRef + Slot + VariantProps). Mas componentes como EmptyState e FormField nao usam forwardRef e nao sao compostos via Slot. O Modal nao tem subcomponentes (ModalHeader, ModalBody, ModalFooter como exports) — apenas o ModalForm |
| Accessibility | 4 | Melhor aspecto do projeto. Biblioteca `lib/a11y/` dedicada, FocusTrap, SkipLink, LiveRegion, useFocusReturn, useAnnounce. 172 usos de aria-* confirmados. Reducao de movimento implementada. O score fica em 4 e nao 5 porque nao ha testes automatizados de contraste, e a biblioteca a11y nao e exposta como componentes do design system — vive isolada em `lib/` |
| Visual Testing | 1 | Nenhum Storybook, nenhum Chromatic, nenhum Playwright visual regression. Apenas vitest + testing-library (interacao, nao visual). Regressoes visuais sao detectadas manualmente |
| **Overall** | **2.3** | Base solida de primitivos e tokens, mas design system imaturo: sem catalogo, sem consistencia de API, sem cobertura de componentes suficiente para escalar |

---

## Atomic Design Mapping

O Atomic Design classifica interfaces em 5 niveis: Atoms, Molecules, Organisms, Templates, Pages. Veja como o ZmobCRM mapeia para essa estrutura — e onde as fronteiras estao borradas ou ausentes.

### Atoms (componentes indivisiveis)

**Presentes e bem implementados:**
- `button.tsx` — CVA + forwardRef + Slot. Correto.
- `badge.tsx` — CVA. Sem forwardRef (aceitavel para elemento estatico).
- `alert.tsx` — CVA + forwardRef.
- `avatar.tsx` — Radix Avatar + forwardRef.
- `card.tsx` — forwardRef, mas sem CVA (ok — Card nao precisa de variants semanticas).
- `tooltip.tsx` — Radix Tooltip wrapper.
- `popover.tsx` — Radix Popover wrapper.
- `tabs.tsx` — Radix Tabs wrapper.

**Ausentes — atoms que deveriam existir:**
- `input.tsx` — Nao existe. O `FormField.tsx` embute um `<input>` nativo com estilos locais em vez de exportar um atom `Input` composavel. Qualquer codigo que precise de um input fora do FormField context re-implementa o estilo.
- `textarea.tsx` — Mesmo problema. `TextareaField` contem o textarea, mas nao ha `<Textarea>` atom.
- `select.tsx` — `@radix-ui/react-select` esta instalado (package.json confirmado) mas **nenhum wrapper existe** em `components/ui/`. O `SelectField` usa `<select>` nativo com estilo manual. O Radix Select (com keyboard navigation, portaling, e acessibilidade completa) esta ignorado.
- `skeleton.tsx` — Nao existe. O shadcn/ui tem um Skeleton atom trivial. Sem ele, nao ha como compor skeletons consistentes.
- `separator.tsx` — `@radix-ui/react-separator` instalado, nao exposto.
- `accordion.tsx` — `@radix-ui/react-accordion` instalado, nao exposto. A `InstructionsPage` implementou seu proprio `AccordionItem` custom do zero (usando `Button` e `ChevronDown` manual) em vez de usar o primitivo instalado.
- `scroll-area.tsx` — `@radix-ui/react-scroll-area` instalado, nunca usado.
- `slider.tsx` — `@radix-ui/react-slider` instalado, nunca usado.

**Resumo de atoms ausentes com primitivos instalados mas nao expostos: 4 (accordion, scroll-area, separator, slider).**

### Molecules (composicoes de atoms)

**Presentes:**
- `FormField.tsx` — Molecule correto: agrupa Label + Input + Error + Hint.
- `Modal.tsx` — Molecule/Organism correto: agrega overlay + panel + header + body com tokens centralizados.
- `ActionSheet.tsx` — Molecule mobile-first bem construido.
- `Sheet.tsx` — Molecule primitivo, base para FullscreenSheet.
- `FullscreenSheet.tsx` — Molecule que compoe Sheet.
- `EmptyState.tsx` — Molecule de estado vazio com icon + titulo + descricao + action.
- `tabs.tsx` — e um wrapper de primitivo, nao uma molecule original.

**Problemas estruturais em molecules existentes:**

O `EmptyState` e uma molecule bem conceituada mas tem vazamentos: hardcoded `bg-slate-100 dark:bg-white/5` para o container do icone, `text-slate-700 dark:text-slate-200` para o titulo, e usa `Button` de `@/app/components/ui/Button` (a copia duplicada). Uma molecule que integra um atom deveria usar o atom canonico.

O `FormField` usa `React.Children.map` + `React.cloneElement` para injetar IDs ARIA nos filhos — uma tecnica funcional mas fragil. Se o filho for um componente que nao repassa a prop `id`, o sistema quebra silenciosamente. A abordagem mais robusta seria `React.forwardRef` + Context, ou simplesmente um atom `Input` que aceita `id` diretamente.

**Ausentes — molecules que deveriam existir:**
- `PageHeader.tsx` — Cabecalho de pagina padronizado (titulo + breadcrumb + acoes). Cada pagina hoje implementa seu proprio.
- `SectionCard.tsx` — Card com titulo de secao + conteudo (padrao muito repetido em Settings, Cockpit, etc.).
- `DataTable.tsx` — Tabela com sorting, pagination e loading state. Atualmente cada lista tem sua propria implementacao.
- `StatusBadge.tsx` — Badge especializada para status de deal (Aberto, Ganho, Perdido) com as cores semanticas de status. Atualmente replicado inline em varios componentes.
- `UserAvatar.tsx` — Avatar com fallback de iniciais e tooltip de nome. A composicao Avatar + fallback + tooltip e repetida em DealCard, ContactsList, NotificationPopover, etc.

### Organisms (composicoes complexas com logica propria)

A separacao entre organisms e features e onde o ZmobCRM mais se afasta do Atomic Design. Os organisms deveriam ser composicoes reutilizaveis de molecules; as features usam os organisms mas contem logica de dominio.

**Organisms existentes (bem colocados em `components/ui/`):**
- `ContactSearchCombobox.tsx` — Organism correto: tem sua propria busca, estado, e renderiza lista de resultados.
- `DealSearchCombobox.tsx` — Idem.
- `CorretorSelect.tsx` — Organism de selecao de membro da equipe.
- `LossReasonModal.tsx` — Organism que combina Modal + Form + lista de razoes.
- `AudioPlayer.tsx` — Organism autonomo.
- `date-range-picker.tsx` — Organism complexo com calendario proprio.

**Problema: `DealCard` vive na camada de feature mas e um organism reusavel.** O componente `features/boards/components/Kanban/DealCard.tsx` e tao complexo e tao central para o produto (aparece no kanban, deveria aparecer em search results, em notificacoes, etc.) que merecia viver em `components/ui/` ou em uma camada `components/domain/`.

**Organisms que deveriam existir:**
- `SearchResults.tsx` — Resultados de busca global com categorias.
- `NotificationItem.tsx` — Item de notificacao composavel (hoje esta acoplado ao NotificationPopover).
- `ErrorState.tsx` — Conforme sugerido pela UX specialist, mas como organism do design system.

### Templates (estruturas de pagina sem dados reais)

Este nivel e **completamente ausente** no ZmobCRM. Nao existe nenhum componente de template que defina estrutura de pagina sem dados. Cada pagina monta sua propria estrutura.

**O Layout.tsx (`components/Layout.tsx`) e um Template de app shell**, mas nao ha templates de nivel de pagina:
- Nao existe `<PageLayout>` (ausencia ja identificada como TD-UX-022).
- Nao existe `<SplitPaneLayout>` para as views split-view do inbox.
- Nao existe `<DetailPageLayout>` para o padrao header + sidebar + main content do cockpit de deals.
- Nao existe `<ListPageLayout>` para o padrao header + filtros + tabela/lista.

A consequencia e que cada pagina de feature re-implementa estrutura de espacamento, padding, scroll behavior e responsive adjustments independentemente.

### Pages (instancias de templates com dados reais)

O nivel de paginas existe via o sistema de rotas do Next.js App Router (`app/(protected)/*/page.tsx`). Esta parte esta bem estruturada. O problema e que sem Templates, as Pages acumulam responsabilidade estrutural que nao lhes pertence.

---

## Token Architecture Review

### O que esta correto

A arquitetura de 3 camadas documentada na `frontend-spec.md` e **fundamentalmente solida**. OKLCH para cores semanticas e uma escolha moderna e perceptualmente uniforme — melhor que HSL para garantir contraste consistente entre dark e light mode sem recalcular manualmente. O mapping de shadcn semantic tokens para as variaveis customizadas via `@theme inline` e elegante.

O `modalStyles.ts` e o exemplo mais claro de tokens de componente feitos corretamente: um arquivo centralizado de strings de classes Tailwind que define os tokens visuais de uma familia de componentes (modal). E o unico lugar no codebase onde isso foi feito de forma sistematica.

### O que esta quebrado na propria camada de tokens

**Problema 1: Inconsistencia interna na Camada 1.**

Os tokens primitivos em `@theme` misturam dois sistemas de cor. A escala `--color-primary-50` ate `--color-primary-900` usa valores hex (escala Sky/Tailwind). Os tokens de status como `--color-success`, `--color-warning`, `--color-error`, `--color-info` e toda a escala de texto usam OKLCH. Isso significa que qualquer componente que usa `bg-primary-500` esta usando um valor hex estatico que nao se adapta da mesma forma perceptual que as cores semanticas OKLCH.

**Problema 2: Token `--primary` declarado inline sem referenciar a escala primitiva.**

O `--primary` em `:root` esta declarado como `oklch(55% 0.20 240)` — um valor hardcoded — em vez de `var(--color-primary-500)`. Isso cria duas fontes de verdade para a cor primaria: a escala `--color-primary-*` hex e o token `--primary` OKLCH. Eles sao similares (ambos azul ciano) mas nao sao identicos. Um desenvolvedor que usa `bg-primary` (token semantico) vs `bg-primary-500` (escala primitiva) ve cores ligeiramente diferentes.

**Problema 3: Chart colors sao cidadaos de segunda classe.**

```css
/* globals.css, lines 148-153 */
--chart-text: #64748b;
--chart-grid: rgba(148, 163, 184, 0.1);
--chart-tooltip-bg: #0f172a;
```

Esses valores hex nao participam da arquitetura OKLCH. No dark mode, os valores dark (`--chart-text: #94a3b8`) sao declarados separadamente em `.dark {}`. Isso e exactamente o padrao que o resto dos tokens evita. A correcao trivial e mapear:
- `--chart-text` → `var(--color-text-muted)` (ja existe em OKLCH)
- `--chart-tooltip-bg` → `var(--color-surface)` (ja existe em OKLCH)
- `--chart-grid` → `var(--color-border)` com opacity (ja existe em OKLCH)

**Problema 4: Focus ring colors sao hardcoded e nao participam do sistema.**

```css
/* globals.css */
.focus-visible-ring:focus-visible {
  outline: 2px solid #2563eb;  /* hardcoded blue-600 */
}
.dark .focus-visible-ring:focus-visible {
  outline-color: #60a5fa;  /* hardcoded blue-400 */
}
```

O focus ring deveria usar `var(--ring)` (ja definido como `oklch(55% 0.20 240)`) ou `var(--primary)`. Dois valores hex hardcoded para algo que claramente deveria ser tokenizado.

**Problema 5: Skip link usa hardcoded hex.**

```css
.skip-link { background-color: #1e40af; }
.dark .skip-link { background-color: #3b82f6; }
.skip-link:focus { outline: 3px solid #60a5fa; }
```

Componente de acessibilidade critico usando hex hardcoded quando todos os tokens necessarios ja existem.

**Problema 6: `--color-dark-card` e tokens `dark-*` coexistem com os tokens OKLCH.**

A Camada 1 (`@theme`) define `--color-dark-bg`, `--color-dark-card`, `--color-dark-border`, `--color-dark-hover` como hex. Esses tokens antigos coexistem com o sistema OKLCH moderno. O `Sheet.tsx` e `ActionSheet.tsx` ainda usam `dark:bg-dark-card` em vez de `dark:bg-card` (que e o token semantico correto). Isso significa que se alguem atualizar `--color-surface` (o token OKLCH para card no dark mode), o Sheet e ActionSheet nao se atualizam junto.

### O que esta ausente

**Tokens de espacamento nao existem.** O projeto usa o sistema de espacamento padrao do Tailwind (gap-1 a gap-8) sem nenhuma semantica adicional. Nao ha tokens como `--spacing-page-padding`, `--spacing-card-padding`, `--spacing-section-gap`. Isso nao e critico agora, mas impede que o espacamento seja ajustado globalmente.

**Tokens de tipografia escalar nao existem.** A escala tipografica usa os valores padrao do Tailwind (`text-xs` ate `text-2xl`). Nao ha tokens semanticos como `--text-heading`, `--text-body`, `--text-caption`. O `--font-display` existe como token de familia, mas nao ha wrapper semantico para "titulo principal de pagina" vs "titulo de card" vs "label de form".

---

## Component Inventory Analysis

### Analise de API consistency

Identifico tres padroes de API distintos coexistindo em `components/ui/`:

**Padrao A (shadcn-canonical): CVA + React.forwardRef + VariantProps**
- `button.tsx`, `badge.tsx`, `alert.tsx`, `card.tsx`, `avatar.tsx`, `tabs.tsx`, `tooltip.tsx`, `popover.tsx`
- Composavel, ref-aware, debuggavel via displayName

**Padrao B (custom-functional): React.FC sem forwardRef**
- `EmptyState.tsx`, `FormField.tsx`, `Modal.tsx`, `ActionSheet.tsx`, `Sheet.tsx`, `FullscreenSheet.tsx`, `LossReasonModal.tsx`, `ContactSearchCombobox.tsx`, `DealSearchCombobox.tsx`, `CorretorSelect.tsx`, `AudioPlayer.tsx`
- Funcional, mas nao composavel via `ref`. Nao pode ser usado com `asChild`.

**Padrao C (export-function sem interface): export function sem Props interface separada**
- `Sheet.tsx`, `ActionSheet.tsx`, `FullscreenSheet.tsx` (usam `type` em vez de `interface`, ok — mas inconsistente com outros)

O problema nao e que o Padrao B seja errado — para componentes de alto nivel (organisms), `React.FC` sem `forwardRef` e adequado. O problema e que **atoms** como `EmptyState` usam Padrao B quando deveriam usar Padrao A.

### Duplicacoes que a UX review nao identificou completamente

**Duplicacao 1: Tres sistemas de dialog coexistem sem unificacao.**

- `Modal.tsx` (generic modal) — usa `modalStyles.ts` corretamente
- `ActionSheet.tsx` (bottom sheet com header proprio) — tem seu proprio overlay com `bg-background/70`
- `Sheet.tsx` (bottom sheet primitivo) — overlay com `bg-background/70`
- `ConfirmModal.tsx` (alertdialog) — overlay `bg-slate-900/60`, sem usar `modalStyles.ts`

A UX review identificou o overlay inconsistente (TD-UX-020), mas nao apontou que `ActionSheet` e `Sheet` duplicam logica de overlay, backdrop click, FocusTrap, e animacao de entrada quase identicamente. Ambos devem ter uma base compartilhada — exatamente o que `Sheet` deveria ser para `ActionSheet`, mas `ActionSheet` nao compoe `Sheet` (ao contrario de `FullscreenSheet`, que sim compoe `Sheet`).

A hierarquia correta seria:
```
Sheet (primitivo: overlay + backdrop + FocusTrap + animacao)
  └── ActionSheet (adiciona: header tipado, titulo, close button)
  └── FullscreenSheet (adiciona: header + body scroll + footer)
  └── Modal (adiciona: panel centrado, tamanhos, modalStyles tokens)
       └── ConfirmModal (especializa: role=alertdialog, botoes danger/primary)
```

Atualmente `ConfirmModal` nao compoe `Modal` — re-implementa o overlay do zero.

**Duplicacao 2: Logica de combobox duplicada.**

`ContactSearchCombobox.tsx` e `DealSearchCombobox.tsx` compartilham a mesma estrutura: input de busca, dropdown posicionado com `absolute z-50`, lista de resultados com highlight de selecao, estado de loading, estado de erro. A implementacao esta duplicada. Deveria existir um `Combobox` atom (baseado em Radix Select ou uma implementacao propria) do qual ambos derivam.

**Duplicacao 3: Botao com spinner implementado duas vezes.**

`SubmitButton` em `FormField.tsx` implementa um botao com spinner e loading state do zero — SVG de spinner, aria-busy, disabled state — sem usar o `Button` atom. O `Button` atom poderia aceitar `isLoading` e `loadingText` como props e encapsular o spinner, eliminando a necessidade do `SubmitButton` completamente (ou reduzindo-o a um wrapper trivial de `Button` com `type="submit"`).

**Duplicacao 4: AccordionItem custom ignorando primitivo instalado.**

`features/instructions/InstructionsPage.tsx` implementou seu proprio `AccordionItem` usando `Button` + `ChevronDown` + `useState`. O `@radix-ui/react-accordion` esta instalado e nao exposto. Resultado: um accordeon sem keyboard navigation adequada (setas para navegar entre itens), sem animacao de abertura padronizada, e sem o `aria-expanded` correto no trigger.

### Radix primitivos instalados e nunca usados (ou mal usados)

| Primitivo | Status | Impacto |
|-----------|--------|---------|
| `@radix-ui/react-accordion` | Instalado, nao exposto. Custom accordion na InstructionsPage | Acessibilidade de teclado incompleta |
| `@radix-ui/react-scroll-area` | Instalado, **zero usos em todo o codebase** | Bundle weight sem beneficio |
| `@radix-ui/react-separator` | Instalado, **zero usos em todo o codebase** | Bundle weight sem beneficio |
| `@radix-ui/react-slider` | Instalado, **zero usos em todo o codebase** | Bundle weight sem beneficio |
| `@radix-ui/react-select` | Instalado, nao exposto. `SelectField` usa `<select>` nativo | Feature set reduzido (sem search, sem grouping, sem portaling) |

### Componentes que violam os proprios tokens do design system

A UX review documentou as 2.475 ocorrencias de cores Tailwind diretas em features. O que nao foi enfatizado e que **a propria biblioteca de componentes `components/ui/` tambem viola os tokens em 42 lugares**. Exemplos diretos do codigo:

- `EmptyState.tsx`: `bg-slate-100 dark:bg-white/5`, `text-slate-700 dark:text-slate-200`, `text-slate-500 dark:text-slate-400`
- `Sheet.tsx`: `bg-white dark:bg-dark-card` (deveria ser `bg-card dark:bg-card`)
- `ActionSheet.tsx`: `bg-white dark:bg-dark-card` (idem)
- `DealSearchCombobox.tsx`: `bg-white dark:bg-dark-card`, `border-slate-200 dark:border-white/10`, `hover:bg-slate-50 dark:hover:bg-white/5`
- `date-range-picker.tsx`: multiplas classes slate hardcoded
- `Modal.tsx` (linha 153): `text-slate-500` para o icone X do close button — apesar do resto do Modal usar `modalStyles.ts` corretamente

Isto e significativo: os proprios atomos e molecules que deveriam ser a fundacao do sistema de tokens **ja nao seguem os tokens**. Qualquer migracao de tokens que nao inclua `components/ui/` como escopo sera incompleta.

### Ausencia de `Input` standalone como atom critico

Este e o problema mais grave da cobertura de componentes. Em qualquer design system maduro, `Input` e um atom fundamental. No ZmobCRM:

1. Nao ha `components/ui/input.tsx`
2. Os estilos de input estao definidos em `baseInputStyles` dentro de `FormField.tsx` como uma const local
3. Qualquer input fora do contexto do `FormField` (ex: inputs de busca, filtros inline, campos em modais customizados) re-implementa os estilos manualmente
4. O `DealSearchCombobox` e `ContactSearchCombobox` tem seus proprios inputs estilizados independentemente

Isso significa que ha pelo menos 3-4 variantes visuais de "input" no produto, todas com estilos ligeiramente diferentes.

---

## What the UX Review Got Right

A UX specialist (Uma) fez uma revisao tecnicamente precisa. Os acertos principais:

**Acerto 1: Dimensionamento real do problema de cores Tailwind diretas.** A contagem de 2.475 ocorrencias em 137 arquivos com os componentes mais impactados identificados e exatamente o tipo de dado quantitativo que transforma um "devemos migrar" em uma estimativa real de esforco. A lista de mapeamento (`text-gray-500` → `text-muted-foreground`, etc.) esta correta e e acionavel.

**Acerto 2: Overlay inconsistente como debito novo (TD-UX-020).** Identificar os 31 usos de 6 padroes diferentes de overlay e a evidencia de que o sistema de modais cresceu organicamente sem uma base compartilhada. Correto elevar isso para HIGH.

**Acerto 3: Decomposicao do FocusContextPanel.** A analise por tabs e o mapa de 7 sub-componentes propostos e tecnicamente solida. A observacao de que os hooks auxiliares ja estao separados (o que facilita a decomposicao) e precisa.

**Acerto 4: Estrategia de skeleton hibrida.** A recomendacao de atoms reutilizaveis (`Skeleton.tsx`, `SkeletonCard.tsx`) compostos em molecules especificas por feature (`SkeletonKanban`, `SkeletonDashboard`) esta alinhada com o Atomic Design. E a abordagem correta — nao criar um skeleton generico universal, nao criar skeletons completamente custom por pagina.

**Acerto 5: Recusa em criar pacote separado de design system.** Para um produto single-tenant de tamanho medio com uma equipe pequena, um monorepo com pacote de design system separado cria overhead de manutencao desproporcional. Manter em `components/ui/` e a decisao certa agora.

**Acerto 6: Rebaixamento do i18n para MEDIUM.** Correto. O custo de implementar next-intl com 400+ strings hardcoded neste momento nao justifica o beneficio para um produto focado no mercado brasileiro. A ADR documentando a decisao e o caminho certo.

---

## What Was Missed

A UX review foi feita com foco em UX e impacto no usuario final. O olhar de design system revela lacunas de natureza diferente:

**Lacuna 1: A biblioteca de atoms viola os proprios tokens.**

A review identificou violacoes em features (2.475 ocorrencias). Nao identificou que `components/ui/` — a propria biblioteca — tem 42 violacoes. Esta distinção importa porque `components/ui/` e a fonte da verdade. Se os atomos base nao seguem os tokens, o restante do codebase nunca vai seguir.

**Lacuna 2: Quatro Radix primitivos instalados e nao expostos representam bundle waste e oportunidades perdidas.**

`@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, e `@radix-ui/react-slider` tem **zero usos** em todo o codebase. `@radix-ui/react-accordion` existe mas nao tem wrapper. Isso nao foi mencionado. Num design system maduro, cada primitivo instalado ou tem um wrapper exposto ou e removido. Primitivos instalados mas nao expostos sao uma divida latente: quando alguem precisar deles, vai implementar do zero ao inves de usar o primitivo.

**Lacuna 3: A ausencia de `Input` como atom standalone e o debito mais silencioso.**

A review menciona `FormField` como molecule mas nao aponta que a ausencia de um `Input` atom torna imposssivel compor qualquer input fora do contexto de formulario sem re-implementar os estilos. E o "missing atom" mais critico.

**Lacuna 4: `ActionSheet` deveria compor `Sheet`, nao duplicar sua logica.**

A hierarquia de composicao entre os componentes de dialogo nao foi mapeada. A review identificou overlay inconsistente mas nao o padrao de composicao ausente que o resolveria estruturalmente.

**Lacuna 5: `ConfirmModal` nao compoe `Modal` — e isso e um problema de design system, nao so de tokens.**

Alem de nao usar `modalStyles.ts` (identificado em TD-UX-012), o `ConfirmModal` re-implementa toda a estrutura de dialog (overlay, FocusTrap, escape handler, backdrop click) que ja existe em `Modal`. O correto seria `ConfirmModal` usar `<Modal role="alertdialog" ...>` internamente. Isso nao foi apontado.

**Lacuna 6: `SubmitButton` deveria ser `Button` com props, nao um componente separado.**

A review classificou isso como LOW ("confusao de naming"). Mas o problema e mais fundamental: `SubmitButton` duplica logica de spinner e loading state que deveria ser parte do atom `Button`. Um design system maduro tem um unico Button atom que aceita `isLoading` — nao dois componentes paralelos.

**Lacuna 7: `select` nativo vs Radix Select e um problema de feature set, nao so de styling.**

A review nao mencionou que `SelectField` usa `<select>` nativo. O `<select>` nativo e notoriamente dificil de estilizar de forma consistente entre browsers, nao suporta busca, nao suporta grouping, e nao tem suporte a multi-select sem atributo `multiple` (que tem UX ruim em mobile). O `@radix-ui/react-select` instalado resolveria todos esses problemas.

**Lacuna 8: Sem tokens de radius semanticos.**

A review documenta o uso de `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` sem mencionar que nao ha tokens semanticos para radius. O `--radius: 0.5rem` do shadcn existe mas so e usado nos proprios componentes shadcn. Componentes customizados escolhem radius arbitrariamente. Numa migracao de design system seria impossivel mudar o "feel" do produto (de sharp para rounded) sem alterar centenas de classes individualmente.

**Lacuna 9: Sem tokens de z-index semanticos — e isso e pior do que parece.**

A review identificou o problema (TD-UX-021) mas classificou como MEDIUM. Do ponto de vista de design system, e HIGH. O padrao `z-[9999]` com `z-[10000]` para "vencer" outros `z-[9999]` e o sintoma classico de ausencia de z-index scale. Quando um novo modal empilhado precisar aparecer sobre todos os outros, alguem vai usar `z-[10001]` — e assim indefinidamente. A correcao precede qualquer adicao de novos dialogs.

**Lacuna 10: `StatCard` usa workaround de hex para cores dinamicas.**

O `StatCard` (`features/dashboard/components/StatCard.tsx`) tem uma lookup table de `bg-[color]-500` → hex value porque Tailwind v4 nao processa classes dinamicas. Isso e um problema de design system: os tokens de cor do dashboard nao existem como CSS custom properties acessiveis em runtime — o que torna impossivel usar as cores do stat card fora do proprio componente sem duplicar a lookup table.

---

## Recommendations

### Quick Wins (Semana 1)

**QW-1: Criar `components/ui/input.tsx` como atom standalone.**

```typescript
// components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full bg-muted dark:bg-black/20",
          "border border-border",
          "rounded-lg px-3 py-2 text-sm",
          "text-foreground",
          "outline-none focus:ring-2 focus:ring-primary",
          "transition-all duration-200",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

Depois, atualizar `FormField.tsx` para usar `Input` internamente. Efeito imediato: qualquer desenvolvedor que precise de um input standalone usa o atom, nao inventa estilos novos.

**QW-2: Migrar tokens hardcoded dentro de `components/ui/` proprios.**

42 violacoes em `components/ui/`. Prioridade: Sheet, ActionSheet, EmptyState, DealSearchCombobox. Escopo pequeno, alto impacto simbolico — se os atomos base seguem os tokens, o resto do codebase tem um exemplo claro.

**QW-3: Migrar chart colors para tokens semanticos.**

```css
/* globals.css — remover hardcoded hex */
--chart-text: var(--color-text-muted);     /* era #64748b */
--chart-grid: oklch(from var(--color-border) l c h / 0.1);
--chart-tooltip-bg: var(--color-surface);   /* era #0f172a */
--chart-tooltip-text: var(--color-text-primary);
```

Escopo: 3 linhas em globals.css. Impacto: charts participam do sistema de tokens.

**QW-4: Migrar focus ring e skip link para tokens.**

```css
.focus-visible-ring:focus-visible {
  outline: 2px solid var(--ring); /* era #2563eb */
}
.skip-link {
  background-color: oklch(35% 0.20 240); /* ou var(--primary) ajustado */
}
```

**QW-5: Remover `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slider` ou expor wrappers.**

Decisao binaria: ou criar `scroll-area.tsx`, `separator.tsx`, `slider.tsx` em `components/ui/`, ou remover do `package.json`. Primitivos instalados sem uso sao ruido no inventario do design system.

**QW-6: Corrigir `--primary` para referenciar `--color-primary-500` ou migrar a escala para OKLCH.**

Consolidar as duas fontes de verdade da cor primaria. A mais simples: remover a escala `--color-primary-50..900` do `@theme` e substituir pelos tokens OKLCH diretos (que ja existem para `--primary`).

### Foundation (Semanas 2-4)

**F-1: Criar z-index scale como tokens.**

```css
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;
}
```

Migrar todos os `z-[9999]` e `z-[10000]` para tokens semanticos. Isso precede a adicao de qualquer novo dialog ou layer.

**F-2: Unificar a hierarquia de dialogs (Sheet → ActionSheet → Modal → ConfirmModal).**

Refatorar `ActionSheet` para compor `Sheet` (como `FullscreenSheet` ja faz). Refatorar `ConfirmModal` para compor `Modal`. Resultado: um unico local de overlay logic, um unico local de FocusTrap setup, um unico local de animacao.

**F-3: Expor `accordion.tsx` baseado em Radix e migrar `InstructionsPage`.**

```typescript
// components/ui/accordion.tsx
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
// ... wrapper com tokens e animacao
```

Depois migrar `InstructionsPage` para usar o atom. Ganho: keyboard navigation correta (setas entre itens), aria-expanded automatico.

**F-4: Criar `PageLayout` template component.**

```typescript
// components/ui/PageLayout.tsx
interface PageLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}
```

Aplicar progressivamente: dashboard, contacts, activities, reports. Cada pagina que migra para `PageLayout` descarta seu proprio wrapper de estrutura.

**F-5: Criar `StatusBadge` molecule como composicao de `Badge`.**

```typescript
// components/ui/StatusBadge.tsx
type DealStatus = 'open' | 'won' | 'lost' | 'stale'
const statusConfig = {
  open:  { label: 'Aberto',  className: 'bg-info-bg text-info-text border-info' },
  won:   { label: 'Ganho',   className: 'bg-success-bg text-success-text border-success' },
  lost:  { label: 'Perdido', className: 'bg-error-bg text-error-text border-error' },
  stale: { label: 'Parado',  className: 'bg-warning-bg text-warning-text border-warning' },
}
```

Remove a logica de status inline de DealCard, ContactsList, e multiplos outros componentes.

**F-6: Criar `UserAvatar` molecule como composicao de `Avatar` + `Tooltip`.**

```typescript
// components/ui/UserAvatar.tsx
interface UserAvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}
```

A composicao Avatar + iniciais + tooltip de nome e repetida em pelo menos 6 lugares (DealCard, CorretorSelect, Sidebar user menu, NotificationPopover, ContactDetailModal, etc.).

**F-7: Migrar `SubmitButton` para ser `Button` com `isLoading` prop.**

Adicionar `isLoading` e `loadingText` ao `Button` atom. Simplificar `SubmitButton` para:

```typescript
export const SubmitButton = ({ isLoading, loadingText, ...props }) => (
  <Button type="submit" isLoading={isLoading} loadingText={loadingText} {...props} />
)
```

Ou eliminar `SubmitButton` completamente.

### Long-term Vision

**LTV-1: Storybook com coverage minimo para `components/ui/`.**

Objetivo nao e documentar 100% do codebase — e ter um catalogo visual dos 23 (futuramente ~35) componentes em `components/ui/`. Setup estimado: 8-12 horas. Stories por componente: 30 minutos cada. ROI: cada novo desenvolvedor pode entender o design system sem ler codigo.

Configuracao recomendada: Storybook 8 com Next.js addon. Publicar via Chromatic para visual regression automatizada em PRs.

**LTV-2: Tokens de radius semanticos.**

```css
:root {
  --radius-sm: 0.375rem;   /* rounded-md — botoes pequenos */
  --radius-md: 0.5rem;     /* rounded-lg — inputs, cards padrao */
  --radius-lg: 0.75rem;    /* rounded-xl — modais, cards de feature */
  --radius-xl: 1rem;       /* rounded-2xl — sheets, modais mobile */
  --radius-full: 9999px;   /* rounded-full — avatares, badges */
}
```

Uma mudanca em `--radius-md` atualiza todos os inputs, cards e botoes simultaneamente.

**LTV-3: Expor `components/a11y/` como parte do design system.**

Atualmente `lib/a11y/` vive separado de `components/ui/`. Os componentes `FocusTrap`, `VisuallyHidden`, `SkipLink`, `LiveRegion` sao primitivos de acessibilidade que qualquer consumidor do design system precisa. Mova-os (ou re-exporte-os) de `components/ui/a11y/`. Isso torna a biblioteca de acessibilidade uma parte formalmente reconhecida do design system, nao um detalhe de implementacao escondido em `lib/`.

**LTV-4: `Combobox` atom baseado em Radix Select ou Headless UI.**

Substituir `ContactSearchCombobox` e `DealSearchCombobox` por composicoes de um `Combobox` atom reutilizavel. O `@radix-ui/react-select` nao suporta busca nativamente — considerar `@radix-ui/react-combobox` (se disponivel) ou implementacao custom sobre `useCombobox` do Downshift/Headless UI.

**LTV-5: Migracao completa da escala `--color-primary-*` para OKLCH.**

Substituir a escala hex `--color-primary-50..900` por valores OKLCH equivalentes, mantendo os nomes de token. Isso unifica o sistema de cores completamente em OKLCH.

---

## Brownfield Migration Strategy

### Principio: Nao reescrever, solidificar

A tentacao em brownfield e "fazer do jeito certo desta vez" — criar um pacote de design system separado, migrar tudo de uma vez, documentar cada componente antes de usar. Isso e o caminho para um projeto de 6 meses que nunca termina enquanto o produto continua crescendo com os debitos antigos.

A estrategia correta e **solidificar o que existe, migrar incrementalmente, nunca regredir**.

### Fase 1 — Fundacao (Semanas 1-2): Sem funcionalidades novas

Escopo limitado a `components/ui/` e `app/globals.css`. Nenhuma mudanca em features, nenhuma mudanca em pages. Apenas:
1. Adicionar `Input.tsx` e `Textarea.tsx` como atoms (QW-1)
2. Limpar os 42 hardcodes internos de `components/ui/` (QW-2)
3. Migrar chart tokens para semanticos (QW-3, QW-4)
4. Adicionar tokens de z-index (F-1)
5. Decisao sobre Radix primitivos nao usados (QW-5)

Resultado: `components/ui/` e `app/globals.css` passam a ser uma fonte de verdade confiavel.

### Fase 2 — Consolidacao de dialogs (Semanas 2-3)

Refatorar a hierarquia Sheet → ActionSheet → Modal → ConfirmModal. Migrar todos os 27 arquivos com overlay inconsistente para `MODAL_OVERLAY_CLASS` de `modalStyles.ts` (TD-UX-020). Unificar Button (TD-UX-001).

Nao iniciar decomposicao de componentes gigantes ainda — esperar a Fase 3.

### Fase 3 — Novas molecules (Semanas 3-4)

Criar `StatusBadge`, `UserAvatar`, `PageLayout`, `StatusBadge`, expor `accordion.tsx`. Migrar as primeiras paginas para `PageLayout`. Criar Skeleton atoms (Skeleton, SkeletonCard, SkeletonTable, SkeletonKanban).

Ao final desta fase, o design system tem coverage suficiente para novos desenvolvedores usarem `components/ui/` como primeiro recurso.

### Fase 4 — Migracao de tokens em features (Sprints regulares)

Com a fundacao solida, iniciar a migracao das 2.475 ocorrencias de `text-slate-*` / `bg-gray-*` para tokens semanticos. Estrategia: 1-2 features por sprint, priorizando as com mais ocorrencias (DealCockpitRealClient, DealDetailModal, FocusContextPanel, BoardCreationWizard).

Esta fase nao deve ser um projeto isolado — deve acontecer em paralelo com features normais, com cada desenvolvedor responsavel por migrar o arquivo que esta tocando.

### Fase 5 — Storybook e Visual Regression (Quando Fase 1-3 estiver completa)

Adicionar Storybook apos a biblioteca de atoms estar estavel. Adicionar Chromatic para visual regression em PRs. Nao antes — um Storybook documentando um design system em transicao e uma documentacao de debitos, nao de um sistema.

### Token Migration Approach

Para a migracao de cores Tailwind diretas, a abordagem de search-and-replace em batch (conforme mapeamento da UX review) e correta, mas com uma adicao: **cada substituicao deve ser verificada visualmente no browser, nao apenas no codigo**.

Tokens semanticos podem ter valores ligeiramente diferentes dos Tailwind diretos que estao substituindo. `text-muted-foreground` (mapeado para `--color-text-muted: oklch(55% 0.025 260)`) pode ser perceptualmente diferente de `text-gray-500` em alguns contextos. A verificacao visual por pagina e necessaria — nao e um processo 100% automatizavel.

### Regra de nao-regressao

Proposta: adicionar lint rule (via ESLint plugin ou custom rule) que bloqueia novos usos de `text-slate-*`, `text-gray-*`, `bg-slate-*`, `bg-gray-*` em arquivos que ja foram migrados. Isso previne que os debitos ressurjam enquanto a migracao acontece.

```javascript
// .eslintrc (exemplo conceptual)
"rules": {
  "no-restricted-syntax": [
    "warn",
    {
      "selector": "Literal[value=/^(text|bg|border)-(slate|gray)-/]",
      "message": "Use semantic tokens (text-foreground, bg-muted, etc.) instead of Tailwind direct colors"
    }
  ]
}
```

---

## Conclusao

O ZmobCRM tem a **infraestrutura certa** para um design system — OKLCH tokens, Radix primitivos, CVA variants, shadcn/ui como base, uma biblioteca de acessibilidade dedicada. O que falta e **disciplina de execucao**: tokens que chegam ate a propria biblioteca de atoms, uma hierarquia de componentes clara (atoms → molecules → organisms → templates), e um catalogo visual que torne o sistema discoveravel.

A avaliacao global de 2.3/5 nao e uma critica — e uma oportunidade. O design system existente e uma fundacao real, nao um campo vazio. A distancia para chegar a 4/5 e de semanas de trabalho focado, nao de meses de reescrita.

O maior risco nao e a divida tecnica atual — e que a divida crescaa durante o tempo necessario para paga-la. A regra de nao-regressao (lint rule) e o Storybook sao as ferramentas que previnem isso.

---

> **Gerado por:** Brad Frost Agent — Design Squad
> **Proxima acao recomendada:** Criar stories de implementacao para Fase 1 (QW-1 a QW-6) — estimativa 3-5 dias de trabalho focado
> **Handoff para:** @po para criacao de stories de design system, @dev para implementacao
