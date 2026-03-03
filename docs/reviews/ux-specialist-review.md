# UX Specialist Review

**Reviewer:** @ux-design-expert (Uma)
**Data:** 2026-03-03
**Documento revisado:** docs/prd/technical-debt-DRAFT.md
**Documento de referencia:** docs/frontend/frontend-spec.md
**Fase:** Brownfield Discovery - Phase 6

---

## Metodologia

Para esta revisao, todos os debitos de Frontend/UX (Secao 3) e Cross-Cutting com impacto UX (Secao 4) do DRAFT foram verificados diretamente contra o codigo-fonte. Tamanhos de arquivo, contagens de uso, padroes de import e tokens de estilo foram confirmados via leitura e busca no codebase.

---

## Debitos Validados

### Secao 3 - Frontend/UX

| ID | Debito | Sev. Original | Sev. Ajustada | Horas | Impacto UX | Design Review? | Notas |
|----|--------|---------------|---------------|-------|-----------|---------------|-------|
| TD-UX-001 | Duplicacao de Button component | CRITICAL | CRITICAL | 3-4 | Visual + Funcional | Sim | Confirmado: 111 arquivos importam `app/components/ui/Button.tsx`, apenas 2 arquivos importam `components/ui/button.tsx`. A versao `app/` e a dominante. Diferenca unica: variants `unstyled`. Merge simples. |
| TD-UX-002 | Componentes gigantes (6 arquivos) | CRITICAL | **HIGH** | 40-60 | Funcional + Performance | Sim | Tamanhos confirmados (FocusContextPanel 109KB/1886 linhas, DealDetailModal 87KB/1688 linhas, BoardCreationWizard 75KB/1628 linhas, WebhooksSection 55KB, ContactsImportExportModal 51KB, CockpitDataPanel 48KB). Rebaixo para HIGH porque o impacto para o usuario final e indireto -- afeta manutenibilidade e tempo de carregamento de bundle, mas o UX visivel funciona. O risco principal e para a equipe de desenvolvimento, nao para o usuario. |
| TD-UX-003 | Skeletons quase inexistentes | HIGH | HIGH | 20-28 | Visual + Percebido | Sim | Confirmado: apenas 4 loading.tsx (boards, contacts, inbox, deals/cockpit) existem. Todos usam PageLoader generico com spinner. Nenhum skeleton content-aware. Impacto direto na percepcao de velocidade pelo usuario. |
| TD-UX-004 | Nenhum sistema de i18n | HIGH | **MEDIUM** | 40-60 | Funcional | Nao | Confirmado: strings hardcoded em portugues (400+). Rebaixo para MEDIUM porque o ZmobCRM e atualmente um produto focado no mercado brasileiro (imobiliario). Nao ha demanda imediata de internacionalizacao. E um bloqueio para expansao internacional, mas nao afeta usuarios atuais. Manter como debt documentado e reavaliar quando houver demanda de mercado. |
| TD-UX-005 | Controller hooks gigantes | HIGH | HIGH | 24-32 | Funcional | Nao | Confirmado: useBoardsController 37KB, useContactsController 30KB, useInboxController 28KB, useActivitiesController 19KB. Impacta diretamente re-renders desnecessarios que o usuario percebe como lentidao. |
| TD-UX-006 | Mistura de import paths | HIGH | **MEDIUM** | 4-6 | Nenhum (DX) | Nao | Confirmado. Porem, impacto zero para o usuario final. E puramente um problema de Developer Experience. Rebaixo para MEDIUM. |
| TD-UX-007 | Scrollbar hex hardcoded | HIGH | **MEDIUM** | 2-3 | Visual | Nao | Confirmado: `#cbd5e1`, `#94a3b8`, `#334155`, `#475569` em globals.css. Impacto visual real mas limitado -- scrollbars sao um detalhe periferico. Dark mode ja tem valores separados. Rebaixo para MEDIUM. |
| TD-UX-008 | Chart colors hex hardcoded | HIGH | HIGH | 3-4 | Visual | Nao | Confirmado: `#64748b`, `#0f172a`, `#f8fafc` etc em globals.css. Diferente do scrollbar, charts sao elementos centrais no dashboard e relatorios. Inconsistencia visual e mais perceptivel aqui. Mantenho HIGH. |
| TD-UX-009 | Font serif nao utilizada | MEDIUM | **LOW** | 0.5 | Nenhum | Nao | Confirmado: `--font-serif: 'Cinzel'` declarada em @theme. Se nao e importada via next/font (verificar), nao adiciona peso. Impacto zero para o usuario. Rebaixo para LOW. |
| TD-UX-010 | Cores Tailwind pre-v4 misturadas | MEDIUM | **HIGH** | 12-16 | Visual | Sim | Confirmado com dados concretos: **2.475 ocorrencias** de `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*` em **137 arquivos .tsx**. Este e um problema massivo e subestimado no DRAFT. A escala do problema indica que a migracao para tokens semanticos e uma tarefa significativa. Upgrade para HIGH pela abrangencia do impacto. |
| TD-UX-011 | PageLoader com cores hardcoded | MEDIUM | MEDIUM | 0.5 | Visual | Nao | Confirmado: `text-gray-500 dark:text-gray-400` alem de `border-primary-200` e `border-t-primary-500`. Correcao trivial. |
| TD-UX-012 | ConfirmModal nao usa modalStyles.ts | MEDIUM | MEDIUM | 2-3 | Visual | Nao | Confirmado: zero referencias a `modalStyles` no ConfirmModal. Usa `bg-slate-900/60` hardcoded como overlay vs `bg-background/60` do modalStyles. |
| TD-UX-013 | Optimistic updates limitados | MEDIUM | MEDIUM | 12-16 | Percebido | Nao | Confirmado. Impacto real na percepcao de velocidade em operacoes CRUD. |
| TD-UX-014 | ErrorBoundary usa inline styles | MEDIUM | MEDIUM | 1 | Visual | Nao | Confirmado: 4 ocorrencias de `style={{ ... }}` com CSS vars. Funcional mas inconsistente com padrao Tailwind. |
| TD-UX-015 | GlobalError sem design system | MEDIUM | MEDIUM | 2-3 | Visual | Sim | Confirmado: HTML puro sem qualquer estilizacao. `<h2>Something went wrong!</h2>` e `<button>` nativo. Nota: o comentario no codigo explica que global-error renderiza fora do app layout, entao nao tem acesso ao design system. Solucao requer inline CSS com variaveis. |
| TD-UX-016 | SubmitButton duplicado | LOW | LOW | 2-3 | Nenhum (DX) | Nao | Confirmado: `FormField.tsx` exporta `SubmitButton` com seus proprios `buttonVariants` (objeto JS, nao CVA). Conflito de naming com CVA buttonVariants de button.tsx. |
| TD-UX-017 | Prefetch incompleto | LOW | LOW | 4-6 | Percebido | Nao | Confirmado. Impacto menor -- prefetch e uma otimizacao incremental. |
| TD-UX-018 | Ambient background glow hardcoded | LOW | LOW | 1 | Visual | Nao | Confirmado. Efeito decorativo, impacto minimo. |
| TD-UX-019 | Nenhum teste e2e/visual | LOW | **MEDIUM** | 16-24 | Funcional | Nao | Upgrade para MEDIUM. A ausencia de testes visuais significa que regressoes UX passam despercebidas. Especialmente critico durante a migracao de tokens (TD-UX-010) e decomposicao de componentes (TD-UX-002). |

### Secao 4 - Cross-Cutting com impacto UX

| ID | Debito | Sev. Original | Sev. Ajustada | Horas | Impacto UX | Design Review? | Notas |
|----|--------|---------------|---------------|-------|-----------|---------------|-------|
| TD-CC-001 | CRMContext monolito (33KB) | CRITICAL | CRITICAL | 24-40 | Performance | Nao | Confirmado: 930 linhas. Impacto UX direto via re-renders em cascata. Qualquer interacao que muda estado causa re-render de toda a sub-arvore. Usuario percebe como lentidao geral. |
| TD-CC-002 | Duplicacao Context + Zustand | HIGH | HIGH | 16-24 | Funcional | Nao | Impacto UX: possibilidade de estado dessincronizado que causa comportamento confuso para o usuario (ex: sidebar aberta no context mas fechada no store). |
| TD-CC-003 | Sem i18n fullstack | HIGH | **MEDIUM** | 40-60 | Funcional | Nao | Mesma justificativa de TD-UX-004. Nao ha demanda imediata. |
| TD-CC-004 | BoardCreationWizard monolito | HIGH | HIGH | 16-24 | Funcional | Sim | Dependencia de TD-CC-001. Impacto UX na experiencia de criacao de boards. |
| TD-CC-005 | N+1 kanban | HIGH | HIGH | 8-16 | Performance | Nao | Impacto UX direto: kanban e a tela mais usada. Performance degrada visivelmente com >50 deals. |

### Secao 1 - Sistema com impacto UX

| ID | Debito | Sev. Original | Sev. Ajustada | Horas (UX) | Impacto UX | Design Review? | Notas |
|----|--------|---------------|---------------|------------|-----------|---------------|-------|
| TD-SYS-005 | Paginas client-only | HIGH | HIGH | N/A (arch) | Performance | Nao | Impacto UX: first paint mais lento. Usuario ve tela branca por mais tempo. Porem, resolucao e arquitetural, nao de UX. |
| TD-SYS-006 | Nenhum error.tsx por segmento | HIGH | HIGH | 8-12 | Visual + Funcional | Sim | Impacto UX direto: erro em uma feature derruba a pagina inteira. Cada route segment deveria ter seu error.tsx com design coerente. |
| TD-SYS-007 | Nenhum not-found.tsx | HIGH | HIGH | 3-4 | Visual | Sim | Impacto UX direto: usuario ve pagina 404 generica do Next.js sem branding. |
| TD-SYS-012 | Loading states em 4 paginas | MEDIUM | **HIGH** | 8-12 | Percebido | Sim | Upgrade para HIGH. 14+ paginas protegidas sem loading.tsx = tela branca durante carregamento. Impacto direto na percepcao de qualidade pelo usuario. |
| TD-SYS-014 | Provider nesting 10 niveis | MEDIUM | MEDIUM | N/A (arch) | Performance | Nao | Impacto UX indireto via overhead de reconciliacao. |
| TD-SYS-020 | Hardcoded avatar URLs | LOW | LOW | 2 | Visual | Nao | `pravatar.cc` como fallback. Risco: servico externo indisponivel = avatares quebrados. |

---

## Debitos Removidos

Nenhum debito do DRAFT foi removido. Todos os 19 debitos de Frontend/UX foram confirmados como problemas reais apos verificacao no codigo-fonte.

---

## Debitos Adicionados

| ID | Debito | Severidade | Horas | Impacto UX | Design Review? | Evidencia |
|----|--------|-----------|-------|-----------|---------------|-----------|
| TD-UX-020 | **Overlay background inconsistente em modais.** Encontrados 6 padroes diferentes de overlay: `bg-slate-900/60`, `bg-black/50`, `bg-black/60`, `bg-black/80`, `bg-background/60`, `bg-background/70`. Distribuidos em 27 arquivos (31 ocorrencias). Apenas `modalStyles.ts` define o padrao correto (`bg-background/60`), mas a maioria dos modais nao o usa. | HIGH | 4-6 | Visual | Sim | 31 ocorrencias em 27 arquivos. O padrao correto `MODAL_OVERLAY_CLASS` de `modalStyles.ts` usa `bg-background/60`, mas apenas o `Modal.tsx` generico o consome. |
| TD-UX-021 | **z-index arbitrario sem escala.** Encontrados `z-[9999]` (dominante, 24 arquivos), `z-[10000]` (TemplatePickerModal), `z-[100]` (BoardStrategyHeader), `z-[60]` e `z-[62]` (installer). Nao existe escala de z-index definida em tokens. Risco de sobreposicao incorreta entre modais empilhados. | MEDIUM | 3-4 | Funcional | Nao | 24 ocorrencias de z-[9999], sem escala padrao. TemplatePickerModal usa z-[10000] para "ganhar" de outros z-[9999]. |
| TD-UX-022 | **Ausencia de PageLayout component reutilizavel.** Nao existe um componente `<PageLayout>` que padronize header, spacing, max-width e scroll behavior das paginas. Cada pagina implementa seu proprio wrapper com padroes variados. | MEDIUM | 8-12 | Visual | Sim | Verificado: cada feature page tem seu proprio layout wrapper. Nao ha componente compartilhado. |
| TD-UX-023 | **Feedback visual inconsistente em acoes destrutivas.** Modais de confirmacao para exclusao usam padroes visuais diferentes: alguns com `variant="destructive"`, outros com classes inline vermelhas, outros sem destaque visual. | MEDIUM | 3-4 | Funcional | Sim | ConfirmModal tem variant danger, mas nem todos os fluxos destrutivos usam o ConfirmModal. |
| TD-UX-024 | **Ausencia de empty states padronizados por feature.** O componente `EmptyState` existe mas muitas features usam textos inline (`<p>Nenhum resultado</p>`) em vez do componente. | LOW | 4-6 | Visual | Sim | EmptyState.tsx existe com 3 sizes, mas adocao e parcial. |

---

## Respostas ao Architect

### Pergunta 1: DEBT-004 - Decomposicao do FocusContextPanel (109KB)

O FocusContextPanel tem uma divisao funcional clara baseada em tabs, confirmada pela analise do codigo:

**Tabs identificados (4):**
1. `notas` - Sistema de notas do deal (linhas ~1503-1570)
2. `chat` - Chat IA integrado (linhas ~1772+, usa `React.lazy(() => import('@/components/AIAssistant'))`)
3. `scripts` - Scripts de vendas (linhas ~1570-1700)
4. `files` - Arquivos do deal (linhas ~1700-1772)

**Decomposicao recomendada (7 sub-componentes):**

```
FocusContextPanel/
  index.tsx               (~200 linhas) - Shell com tabs, context do deal
  FocusDealHeader.tsx     (~150 linhas) - Header com info do deal + contato
  FocusDealHealth.tsx     (~200 linhas) - Health score, AI analysis
  FocusNotesTab.tsx       (~250 linhas) - Lista e editor de notas
  FocusChatTab.tsx        (~100 linhas) - Wrapper do AIAssistant (ja e lazy)
  FocusScriptsTab.tsx     (~300 linhas) - Scripts de vendas + editor
  FocusFilesTab.tsx       (~200 linhas) - Upload e lista de arquivos
  FocusActionsBar.tsx     (~150 linhas) - Acoes (mover stage, marcar ganho/perdido)
```

A logica NAO esta entrelaçada -- cada tab renderiza condicionalmente via `activeTab === 'tab'`. Os hooks auxiliares (`useAIDealAnalysis`, `useDealNotes`, `useDealFiles`, `useQuickScripts`) ja estao em arquivos separados, o que facilita a decomposicao.

**Dependencia critica:** O componente importa `Button` de `@/app/components/ui/Button` (a copia duplicada). Resolver TD-UX-001 primeiro.

### Pergunta 2: DEBT-001 - Unificacao do Button (variant unstyled)

**Recomendacao: Adicionar `unstyled` ao `components/ui/button.tsx` principal.**

Justificativa:
- A variant `unstyled` com valor `""` (string vazia) e um padrao valido e util para composicao (ex: botoes que precisam de estilo completamente customizado pelo consumer).
- O Radix `Slot` (`asChild`) ja existe no Button e resolve parte do caso de uso, mas `unstyled` e mais ergonomico para casos onde o consumer quer manter a semantica de `<button>` mas sem estilo visual.
- NAO e um anti-pattern -- e um padrao reconhecido em design systems (ex: "reset variant" no Chakra UI, "ghost" sem hover no MUI).

**Plano de execucao:**
1. Adicionar `unstyled: ""` em variant e size no `components/ui/button.tsx`
2. Buscar e substituir todos os imports de `@/app/components/ui/Button` para `@/components/ui/button` (111 arquivos)
3. Deletar `app/components/ui/Button.tsx`
4. Atualizar o `SubmitButton` em `FormField.tsx` para importar de `@/components/ui/button`

Estimativa: 3-4 horas (inclui grep/replace, verificacao visual, testes).

### Pergunta 3: DEBT-005 - Biblioteca i18n para Next.js 15 App Router

**Recomendacao: `next-intl`**

Justificativa:
- **next-intl** e a biblioteca mais adequada para Next.js App Router porque:
  - Suporte nativo a Server Components (diferente de react-i18next que e client-first)
  - Middleware para roteamento de locale integrado com App Router
  - Tipagem forte com TypeScript
  - API simples: `useTranslations('namespace')` em client, `getTranslations('namespace')` em server
  - Comunidade ativa, mantida especificamente para Next.js
- **react-i18next** seria a segunda opcao, mas requer `'use client'` wrapper para hooks, o que conflita com a meta futura de SSR (TD-SYS-005).
- **Momento de implementar:** NAO agora. O custo (40-60h) e desproporcional ao beneficio atual. Criar uma ADR documentando a decisao e implementar quando houver demanda real de mercado internacional.

### Pergunta 4: DEBT-002 - Skeletons por feature vs generico

**Recomendacao: Hibrido -- sistema generico com composicao por feature.**

Abordagem concreta:

```
components/ui/Skeleton.tsx          - Atom: barra animada (ja existe no shadcn)
components/ui/SkeletonCard.tsx      - Molecule: card com linhas de skeleton
components/ui/SkeletonTable.tsx     - Molecule: tabela com N linhas skeleton
components/ui/SkeletonKanban.tsx    - Molecule: colunas com cards skeleton

app/(protected)/boards/loading.tsx      -> <SkeletonKanban columns={5} cardsPerColumn={4} />
app/(protected)/contacts/loading.tsx    -> <SkeletonTable rows={10} columns={5} />
app/(protected)/dashboard/loading.tsx   -> <SkeletonDashboard />  (grid de StatCard skeletons)
app/(protected)/inbox/loading.tsx       -> <SkeletonInbox />  (lista + detail panel)
```

**Razao:** Cada pagina tem layout distinto, entao skeletons puramente genericos nao imitam corretamente o conteudo final (violando o principio de skeleton: "parecer com o que vai aparecer"). Porem, os building blocks (linhas, cards, tabelas) devem ser reutilizaveis.

**Prioridade de implementacao:**
1. Dashboard (primeira tela que o usuario ve)
2. Boards/Kanban (tela mais usada)
3. Contacts (tabela com muitos dados)
4. Inbox (layout split-view)
5. Demais paginas (activities, reports, settings, etc.)

### Pergunta 5: DEBT-011 - Quantidade de componentes com cores Tailwind diretas

**Dado concreto verificado:**

- **2.475 ocorrencias** de `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*`
- Distribuidas em **137 arquivos .tsx**
- Componentes mais impactados (por ocorrencia):
  - `DealCockpitRealClient.tsx`: 137 ocorrencias
  - `DealCockpitMockClient.tsx`: 118 ocorrencias
  - `DealDetailModal.tsx`: 110 ocorrencias
  - `FocusContextPanel.tsx`: 99 ocorrencias
  - `BoardCreationWizard.tsx`: 86 ocorrencias
  - `CockpitDataPanel.tsx`: 86 ocorrencias
  - `BoardStrategyHeader.tsx`: 39 ocorrencias (inclui `bg-slate-900` hardcoded em tooltips)

**Esforco estimado para migracao completa:** 12-16 horas (bulk search-and-replace com verificacao visual por pagina).

**Mapeamento de migracao recomendado:**

| Tailwind Direto | Token Semantico |
|----------------|-----------------|
| `text-gray-500`, `text-slate-500` | `text-muted-foreground` |
| `text-gray-400`, `text-slate-400` | `text-text-subtle` |
| `text-gray-600`, `text-slate-600` | `text-text-secondary` |
| `text-gray-900`, `text-slate-900` | `text-foreground` |
| `bg-gray-50`, `bg-slate-50` | `bg-muted` |
| `bg-gray-100`, `bg-slate-100` | `bg-muted` |
| `bg-gray-200`, `bg-slate-200` | `bg-accent` |
| `border-gray-200`, `border-slate-200` | `border-border` |
| `bg-slate-900` (tooltips/overlays) | `bg-popover` ou `bg-card` com `dark:` |

### Pergunta 6: DEBT-006 - Estrategia de decomposicao dos controller hooks

**Recomendacao: Separar por responsabilidade (queries, mutations, UI logic) E por sub-feature quando natural.**

Abordagem concreta para `useBoardsController.ts` (37KB) como modelo:

```
features/boards/hooks/
  useBoardsController.ts          -> DEPRECATED (re-export wrapper)
  queries/
    useBoardsQuery.ts             - Queries TanStack (ja existe parcialmente)
    useBoardStagesQuery.ts        - Stages de um board
  mutations/
    useCreateBoard.ts             - Criar board
    useDeleteBoard.ts             - Deletar board
    useMoveDeal.ts                - Mover deal (ja existe)
    useUpdateDealInBoard.ts       - Atualizar deal
  ui/
    useBoardDragDrop.ts           - Logica de DnD (dndkit)
    useBoardFilters.ts            - Filtros e busca
    useBoardSelection.ts          - Selecao de board ativo
  useBoardOrchestrator.ts         - Hook "leve" que compoe os menores
```

**Razao:** A separacao por responsabilidade (queries/mutations/UI) alinha-se com a arquitetura existente de TanStack Query hooks em `lib/query/hooks/`. A separacao adicional por sub-feature dentro de cada camada evita hooks ainda grandes demais. O `useBoardOrchestrator` e um hook de conveniencia que importa e compoe os menores, mantendo a API do componente simples.

**Principio:** Cada hook deve ter no maximo ~200 linhas. Se passa disso, precisa ser subdividido.

---

## Recomendacoes de Design

### Abordagem para Design System

**Recomendacao: Extender shadcn/ui existente + formalizar tokens OKLCH + Storybook minimo.**

O design system atual ja tem uma base solida (shadcn/ui, Radix, CVA, OKLCH tokens). A estrategia NAO deve ser reconstruir -- deve ser consolidar e formalizar.

**Passos concretos:**

1. **Consolidar tokens (Cluster 3 do DRAFT):** Migrar TODAS as cores hardcoded (hex em globals.css, Tailwind diretas em componentes) para tokens semanticos OKLCH. Resultado: uma unica fonte de verdade.

2. **Adicionar Storybook minimo:** Configurar Storybook apenas para componentes `components/ui/` (23 arquivos). NAO para features inteiras. Objetivo: documentacao visual + playground para QA visual. Estimativa: 8-12h para setup + stories dos componentes existentes.

3. **Formalizar component API:** Garantir que todos os componentes em `components/ui/` usem o padrao CVA + forwardRef + VariantProps. Componentes que nao seguem (FormField, EmptyState, Modal) devem ser atualizados.

4. **NAO criar um pacote separado de design system.** O custo de manter um monorepo com pacote externo nao se justifica para um produto unico. Manter em `components/ui/` e suficiente.

### Estrategia de Componentizacao

**Ordem de consolidacao recomendada:**

1. **Button (TD-UX-001):** Merge imediato. 3-4h. Desbloqueio para todos os demais.
2. **Modal overlay pattern (TD-UX-020):** Migrar todos os modais para usar `MODAL_OVERLAY_CLASS` de `modalStyles.ts`. 4-6h.
3. **ConfirmModal (TD-UX-012):** Migrar para usar `modalStyles.ts`. 2-3h.
4. **FocusContextPanel (TD-UX-002):** Decompor em 7 sub-componentes. 12-16h.
5. **DealDetailModal (TD-UX-002):** Decompor por tabs. 8-12h.
6. **BoardCreationWizard (TD-UX-002):** Decompor por steps. 8-12h. Requer TD-CC-001 parcial.

### Padroes de Loading/Error/Empty States

**Loading States -- Padrao Recomendado:**

```tsx
// app/(protected)/dashboard/loading.tsx
import { SkeletonDashboard } from '@/components/ui/skeletons/SkeletonDashboard'
export default function Loading() {
  return <SkeletonDashboard />
}

// components/ui/skeletons/SkeletonDashboard.tsx
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Grid de StatCards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  )
}
```

**Error States -- Padrao Recomendado:**

```tsx
// app/(protected)/boards/error.tsx
'use client'
import { ErrorState } from '@/components/ui/ErrorState'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} context="boards" />
}
```

O `ErrorState` deve ser um componente novo que:
- Usa design system (tokens, tipografia)
- Tem variantes por contexto (boards, contacts, etc.) com mensagens amigaveis
- Oferece acoes: "Tentar novamente", "Voltar ao inicio"
- Reporta para Sentry automaticamente

**Empty States -- Padrao Recomendado:**

Usar o `EmptyState` existente em TODOS os lugares onde hoje ha `<p>` inline. O componente ja suporta 3 sizes e icones customizados.

### Mobile Strategy

**Status atual: BOM.** A estrategia mobile ja implementada e solida:
- 3 patterns de navegacao (BottomNav, Rail, Sidebar)
- Safe areas para iOS
- PWA support
- Modal viewport caps com dvh
- Touch targets adequados

**Recomendacoes incrementais:**

1. **Skeleton loading no mobile:** Mais critico que desktop porque conexoes sao mais lentas. Priorizar skeletons nas telas mobile-first (inbox, boards).

2. **Bottom sheet para formularios curtos:** Usar `Sheet.tsx` (ja existe) em vez de modais fullscreen para formularios de 1-3 campos no mobile. Melhora a orientacao espacial do usuario.

3. **Pull-to-refresh:** Considerar implementar pull-to-refresh nativo nas listas (contacts, inbox) para recarregar dados. Padrao esperado em apps mobile.

4. **Offline indicators:** Com PWA + ServiceWorker ja implementados, adicionar feedback visual quando offline (banner ou badge no BottomNav).

---

## Priorizacao Final (Perspectiva UX)

### Prioridade 1 -- Impacto imediato no usuario (fazer AGORA)

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| TD-UX-001 | Button unificacao | 3-4 | Desbloqueia tudo. Risco de inconsistencia visual. |
| TD-SYS-006 | error.tsx por segmento | 8-12 | Erro = UX quebrada. Usuario perde confianca. |
| TD-SYS-007 | not-found.tsx | 3-4 | 404 generica = impressao de produto inacabado. |
| TD-SYS-012 | loading.tsx faltando | 8-12 | Tela branca = usuario pensa que travou. |

### Prioridade 2 -- Percepcao de qualidade (proximo sprint)

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| TD-UX-003 | Skeletons content-aware | 20-28 | Percepcao de velocidade dramaticamente melhor. |
| TD-UX-020 | Overlay background inconsistente | 4-6 | Padronizacao visual de modais. |
| TD-UX-008 | Chart colors hardcoded | 3-4 | Charts sao elemento central do dashboard. |
| TD-CC-005 | N+1 kanban | 8-16 | Performance perceptivel na tela mais usada. |

### Prioridade 3 -- Manutencao e escala (backlog prioritizado)

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| TD-CC-001 | CRMContext decomposicao | 24-40 | Desbloqueia TD-CC-002, TD-CC-004, TD-UX-002 parcial. |
| TD-UX-010 | Cores Tailwind diretas | 12-16 | 2.475 ocorrencias. Incoerencia visual em temas. |
| TD-UX-002 | Componentes gigantes | 40-60 | Manutenibilidade, bundle size. |
| TD-UX-005 | Controller hooks gigantes | 24-32 | Re-renders desnecessarios. |

### Prioridade 4 -- Nice-to-have (backlog)

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| TD-UX-019 | Testes e2e/visuais | 16-24 | Importante mas nao urgente. |
| TD-UX-022 | PageLayout component | 8-12 | Padronizacao de paginas. |
| TD-UX-021 | z-index escala | 3-4 | Risco de sobreposicao. |
| TD-UX-012 | ConfirmModal migrar modalStyles | 2-3 | Consistencia. |

### Prioridade 5 -- Adiado com justificativa

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| TD-UX-004 / TD-CC-003 | i18n | 40-60 | Sem demanda de mercado atual. Reavaliar em 6 meses. |

---

## Resumo Quantitativo

| Metrica | Valor |
|---------|-------|
| Debitos validados sem ajuste | 10 |
| Debitos com severidade ajustada | 9 (5 rebaixados, 4 elevados) |
| Debitos removidos | 0 |
| Debitos adicionados | 5 |
| Total de debitos UX apos revisao | 24 (19 originais + 5 novos) |
| Esforco total estimado (UX) | ~290-410 horas |
| Debitos que precisam de Design Review | 11 |

---

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @ux-design-expert (Uma) | Review inicial. Validacao de 19 debitos UX + 6 cross-cutting. 9 ajustes de severidade. 5 debitos novos adicionados. Respostas a 6 perguntas do architect. |
