# Frontend Specification - ZmobCRM

> **Fase:** Brownfield Discovery - Phase 3 (UX/Frontend)
> **Data:** 2026-03-06 (atualizado)
> **Agente:** @ux-design-expert (Uma)
> **Status:** Completo (revisao v2)
> **Versao do Projeto:** 1.5.x

---

## 1. Sumario Executivo

O ZmobCRM e um CRM de vendas imobiliarias com foco em corretores de imoveis, construido sobre Next.js 15.5 com App Router. A aplicacao e uma PWA com dark mode por padrao, suporte responsivo para 3 breakpoints (mobile/tablet/desktop), e um sistema de design baseado em tokens OKLCH com shadcn/ui e Radix UI.

**Pontos fortes:** Acessibilidade acima da media (lib/a11y dedicada), responsividade de primeira classe (3 patterns de navegacao), design tokens modernos (OKLCH), state management hibrido (TanStack Query + Zustand + Context), PWA com ServiceWorker, error handling robusto, modal system consistente com sidebar-aware overlay.

**Debitos principais:** Componentes monolito (FocusContextPanel 110KB, DealDetailModal 88KB, BoardCreationWizard 76KB), Button duplicado, CRMContext legado (34KB), controller hooks gigantes (37KB+), skeletons quase inexistentes, strings hardcoded PT-BR sem i18n, cores hex residuais em scrollbar/charts.

---

## 2. Visao Geral da Arquitetura Frontend

### 2.1 Stack Tecnologico

| Tecnologia | Versao | Proposito |
|------------|--------|-----------|
| Next.js | 15.5.x | Framework (App Router, Turbopack dev) |
| React | 19.2.1 | UI Library |
| TypeScript | 5.x | Tipagem estatica (strict mode) |
| Tailwind CSS | 4.x | Estilizacao (CSS-first config via @theme) |
| TanStack React Query | 5.90.x | Server state management |
| Zustand | 5.0.x | Client state management |
| Radix UI | 15 primitivos | Componentes primitivos acessiveis |
| class-variance-authority | 0.7.x | Variants tipadas para componentes |
| Framer Motion | 12.x | Animacoes (uso limitado: Sheet, ActionSheet, InboxFocusView, install) |
| Lucide React | 0.560 | Icones (otimizado via optimizePackageImports) |
| Recharts | 3.5.x | Graficos (lazy loaded via React.lazy) |
| React Hook Form + Zod | 7.x / 4.x | Formularios e validacao |
| Supabase SSR | 0.8.x | Auth e banco de dados |
| AI SDK (Vercel) | 6.x | Integracao IA (Anthropic, OpenAI, Google) |
| Sentry | 10.x | Error tracking (condicional via env) |
| date-fns | 4.x | Manipulacao de datas |
| Immer | 11.x | Mutacao imutavel de estado |
| jsPDF + autoTable | 4.x / 5.x | Geracao de PDF (relatorios, export) |
| libphonenumber-js | 1.12.x | Validacao/formatacao de telefone |
| react-markdown + remark-gfm | 10.x / 4.x | Renderizacao de markdown (chat IA) |
| focus-trap-react | 11.x | Focus trap para modais |

### 2.2 Estrutura de Diretorios

```
/
  app/                         # Next.js App Router
    (protected)/               # Grupo de rotas autenticadas
      activities/              # Pagina de atividades
      ai/                     # Hub de IA
      ai-test/                 # Testes do chat IA
      boards/                  # Kanban boards (loading.tsx)
      contacts/                # Gestao de contatos (loading.tsx, /duplicates, /metrics)
      dashboard/               # Visao geral
      deals/[dealId]/          # Deal cockpit (cockpit/, cockpit-v2/)
      decisions/               # Pagina de decisoes
      inbox/                   # Inbox inteligente (loading.tsx)
      instructions/            # Instrucoes do sistema
      labs/                    # Features experimentais (deal-cockpit-mock, deal-jobs-mock)
      notifications/           # Central de notificacoes
      pipeline/                # Alias para boards
      profile/                 # Perfil do usuario
      prospecting/             # Modulo de prospeccao
      reports/                 # Relatorios
      settings/                # Configuracoes (tabs multiplos)
      setup/                   # Setup inicial (sem app shell)
      layout.tsx               # Protected layout wrapper
      providers.tsx            # Composed providers (10 providers)
      page.tsx                 # Redirect condicional (install/setup/dashboard)
    actions/                   # Server Actions
    api/                       # API routes
    auth/callback/             # Auth callback OAuth
    components/ui/             # Componentes shadcn/ui (app-level)
      Button.tsx               # Button com variant "unstyled" (DEBT-001)
      ErrorBoundary.tsx        # Error boundary React
    install/                   # Fluxo de instalacao (page, start, wizard)
    join/                      # Convite de usuario (JoinClient.tsx)
    login/                     # Pagina de login
    lp/                        # Landing page v1
    lp2/                       # Landing page v2
    globals.css                # Design tokens + Tailwind v4 @theme (496 linhas)
    global-error.tsx           # Sentry global error handler
    layout.tsx                 # Root layout (html, body, fonts, PWA)
    manifest.ts                # PWA manifest
  components/                  # Componentes compartilhados
    ai/                        # UIChat, RSCChat (assistente IA)
    charts/                    # FunnelChart, RevenueTrendChart, index (lazy loading)
    debug/                     # DebugFillButton
    filters/                   # PeriodFilterSelect
    navigation/                # BottomNav, NavigationRail, MoreMenuSheet, navConfig
    notifications/             # NotificationPopover
    pwa/                       # ServiceWorkerRegister, InstallBanner, useInstallState
    ui/                        # Biblioteca de componentes UI (23 arquivos)
    AIAssistant.tsx            # Assistente IA (legado, substituido por UIChat)
    ConfirmModal.tsx           # Modal de confirmacao acessivel
    ConsentModal.tsx           # Modal de consentimento LGPD
    Layout.tsx                 # App shell principal (505 linhas)
    MaintenanceBanner.tsx      # Banner de manutencao
    OnboardingModal.tsx        # Modal de onboarding
    PageLoader.tsx             # Spinner de carregamento
  context/                     # React Contexts
    activities/                # ActivitiesContext (154 linhas)
    boards/                    # BoardsContext (264 linhas)
    contacts/                  # ContactsContext (168 linhas)
    deals/                     # DealsContext (268 linhas)
    settings/                  # SettingsContext (717 linhas)
    __tests__/                 # Testes de contexto
    AIChatContext.tsx           # Estado do chat IA (87 linhas)
    AIContext.tsx               # Configuracao IA (116 linhas)
    AuthContext.tsx             # Autenticacao Supabase (261 linhas)
    CRMContext.tsx              # Contexto unificado legado (930 linhas, 34KB)
    ThemeContext.tsx            # Dark/Light mode (99 linhas)
    ToastContext.tsx            # Notificacoes toast (204 linhas)
    index.ts                   # Barrel exports
  features/                    # Feature modules (dominio)
    activities/                # Gestao de atividades (Page + components + hooks)
    ai-hub/                    # Hub de IA
    boards/                    # Kanban boards (Kanban/, Modals/, BoardCreationWizard)
    contacts/                  # Gestao de contatos (cockpit/, components/, hooks/)
    dashboard/                 # Dashboard (StatCard, PipelineAlertsModal)
    deals/                     # Cockpit de deals (cockpit/)
    decisions/                 # Decisoes
    inbox/                     # Inbox inteligente (FocusContextPanel, CallModal, etc.)
    instructions/              # Instrucoes
    notifications/             # Notificacoes
    profile/                   # Perfil
    prospecting/               # Modulo de prospeccao (23 componentes, hooks, testes)
    reports/                   # Relatorios
    settings/                  # Configuracoes (AI, Webhooks, API, Users, Tags, etc.)
  hooks/                       # Hooks globais (13 hooks)
  lib/                         # Bibliotecas utilitarias
    a11y/                      # Acessibilidade (FocusTrap, SkipLink, LiveRegion, hooks)
    ai/                        # Agente IA (crmAgent.ts, tools/)
    auth/                      # Auth helpers
    consent/                   # Consentimento LGPD
    debug/                     # Debug utilities
    fetch/                     # Fetch utilities
    forms/                     # useFormEnhanced
    query/                     # TanStack Query (client, keys, hooks, provider)
    realtime/                  # Supabase realtime sync
    security/                  # Security utilities
    stores/                    # Zustand stores (UI, Form, Notification)
    supabase/                  # Supabase client + service modules
    templates/                 # Template utilities
    utils/                     # cn, responsive, csv, isMobile, etc.
    validations/               # Error codes, schemas, CPF/CEP validacao
  types/                       # Tipos globais TypeScript (592 linhas em types.ts)
```

### 2.3 Metricas do Codebase

| Metrica | Valor |
|---------|-------|
| Componentes UI (components/ui/) | 23 arquivos |
| Feature modules | 14 modulos |
| React Contexts | 10 providers compostos |
| Hooks globais (/hooks/) | 13 hooks |
| Rotas protegidas | 18+ paginas |
| Radix UI primitivos | 15 pacotes |
| Testes (.test.tsx) | Vitest + @testing-library + vitest-axe |

---

## 3. Inventario de Componentes

### 3.1 Biblioteca Base (components/ui/)

O projeto usa uma combinacao de **shadcn/ui** (Radix UI primitivos + CVA) com componentes customizados.

**Radix UI Primitivos instalados (15):**

| Primitivo | Uso no Projeto |
|-----------|---------------|
| `@radix-ui/react-accordion` | Secoes expansiveis (settings) |
| `@radix-ui/react-avatar` | Avatares de usuario |
| `@radix-ui/react-checkbox` | Checkboxes acessiveis |
| `@radix-ui/react-dialog` | Base para dialogos |
| `@radix-ui/react-dropdown-menu` | Menus dropdown |
| `@radix-ui/react-label` | Labels de formulario |
| `@radix-ui/react-popover` | Popovers (notificacoes, filtros) |
| `@radix-ui/react-scroll-area` | Areas de scroll customizadas |
| `@radix-ui/react-select` | Selects acessiveis |
| `@radix-ui/react-separator` | Separadores visuais |
| `@radix-ui/react-slider` | Sliders (config) |
| `@radix-ui/react-slot` | Slot (composicao asChild) |
| `@radix-ui/react-switch` | Switches (toggle settings) |
| `@radix-ui/react-tabs` | Tabs (settings, contacts, activities) |
| `@radix-ui/react-tooltip` | Tooltips informativos |

### 3.2 Componentes Reutilizaveis (components/ui/)

| Componente | Nivel Atomico | Pattern | Observacao |
|------------|---------------|---------|------------|
| `button.tsx` | Atom | CVA + forwardRef | shadcn padrao (6 variants, 4 sizes) |
| `card.tsx` | Atom | forwardRef | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `badge.tsx` | Atom | CVA | 4 variants |
| `alert.tsx` | Atom | CVA | 2 variants (default, destructive) |
| `tabs.tsx` | Molecule | Radix Tabs | TabsList, TabsTrigger, TabsContent |
| `tooltip.tsx` | Atom | Radix Tooltip | Provider, Trigger, Content |
| `avatar.tsx` | Atom | Radix Avatar | Com fallback initials |
| `popover.tsx` | Atom | Radix Popover | Wrapper basico |
| `Modal.tsx` | Molecule | Custom | FocusTrap, ARIA completo, sizes sm-5xl, modalStyles tokens |
| `Sheet.tsx` | Molecule | Framer Motion | Bottom sheet mobile-first, AnimatePresence |
| `ActionSheet.tsx` | Molecule | Framer Motion | Acoes em lista para mobile |
| `FullscreenSheet.tsx` | Molecule | Custom | Sheet fullscreen |
| `FormField.tsx` | Molecule | Custom | InputField, TextareaField, SelectField, CheckboxField, SubmitButton, FormErrorSummary |
| `EmptyState.tsx` | Molecule | Custom | 3 sizes (sm, md, lg), role="status" |
| `AudioPlayer.tsx` | Organism | Custom | Player de audio com controles acessiveis |
| `ContactSearchCombobox.tsx` | Organism | Custom | Busca de contatos com autocomplete |
| `DealSearchCombobox.tsx` | Organism | Custom | Busca de deals com autocomplete |
| `CorretorSelect.tsx` | Molecule | Custom | Selecao de corretor (RBAC) |
| `LossReasonModal.tsx` | Organism | Custom | Modal para motivo de perda de deal |
| `date-range-picker.tsx` | Organism | Custom | Seletor de intervalo de datas |
| `modalStyles.ts` | Tokens | Classes | 7 tokens visuais compartilhados para modais |

### 3.3 Componentes app-level (app/components/ui/)

| Componente | Diferenca do components/ui/ |
|------------|------------------------------|
| `Button.tsx` | Identico ao button.tsx + variants "unstyled" e size "unstyled" |
| `ErrorBoundary.tsx` | Error boundary com UI de fallback ("Algo deu errado") |

**DEBT-001: Duplicacao de Button.** `components/ui/button.tsx` e `app/components/ui/Button.tsx` sao quase identicos. O segundo adiciona `variant: "unstyled"` e `size: "unstyled"`. Imports no codebase referenciam ambos os caminhos. Layout.tsx importa de `app/components/ui/Button` enquanto a maioria importa de `components/ui/button`.

### 3.4 Componentes Compartilhados (components/)

| Componente | Proposito | Linhas |
|------------|-----------|--------|
| `Layout.tsx` | App shell principal (sidebar/rail/bottomnav/header/AI panel) | 505 |
| `ConfirmModal.tsx` | Modal de confirmacao com role="alertdialog" | ~120 |
| `ConsentModal.tsx` | Modal de consentimento LGPD | ~80 |
| `OnboardingModal.tsx` | Modal de onboarding multi-step | ~150 |
| `PageLoader.tsx` | Spinner de carregamento centralizado | 44 |
| `MaintenanceBanner.tsx` | Banner de manutencao | ~30 |
| `AIAssistant.tsx` | Assistente IA legado (substituido por UIChat) | deprecado |

### 3.5 Componentes por Feature

#### Boards (features/boards/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `BoardCreationWizard.tsx` | 1628 (76KB) | **GIGANTE** - wizard multi-step |
| `BoardSelector.tsx` | ~100 | Seletor de board/pipeline |
| `DealSheet.tsx` | ~120 | Sheet de deal mobile |
| `PipelineView.tsx` | ~200 | Wrapper da visao pipeline |
| `StageProgressBar.tsx` | ~80 | Barra de progresso por estagio |
| **Kanban/** | | |
| `KanbanBoard.tsx` | 430 | Board principal |
| `KanbanList.tsx` | 560 | Coluna de estagios |
| `KanbanHeader.tsx` | 221 | Header do kanban |
| `DealCard.tsx` | 538 | Card de deal arrastavel |
| `ActivityStatusIcon.tsx` | 228 | Icones de status de atividade |
| `BoardStrategyHeader.tsx` | 442 | Header de estrategia |
| **Modals/** | | |
| `DealDetailModal.tsx` | 1694 (88KB) | **GIGANTE** - detalhe completo de deal |
| `CreateBoardModal.tsx` | 782 | Criacao de board |
| `CreateDealModal.tsx` | 395 | Criacao de deal |
| `CreateDealModalV2.tsx` | 145 | V2 simplificado |
| `ExportTemplateModal.tsx` | 618 | Exportacao de templates |
| `DeleteBoardModal.tsx` | 224 | Confirmacao de exclusao |
| `MoveToStageModal.tsx` | 129 | Mover deal de estagio |
| `AIProcessingModal.tsx` | 146 | Processamento IA |

#### Inbox (features/inbox/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `FocusContextPanel.tsx` | 1886 (110KB) | **GIGANTE** - painel de contexto completo |
| `InboxListView.tsx` | ~200 | Lista de itens |
| `InboxFocusView.tsx` | ~300 | Visao focada (Framer Motion) |
| `InboxBriefing.tsx` | ~150 | Briefing do dia |
| `InboxItem.tsx` | ~120 | Item individual |
| `InboxOverviewView.tsx` | ~100 | Visao geral |
| `InboxZeroState.tsx` | ~80 | Estado vazio |
| `InboxSection.tsx` | ~60 | Secao agrupada |
| `CallModal.tsx` | ~200 | Modal de ligacao |
| `MessageComposerModal.tsx` | ~150 | Compositor de mensagem |
| `ScheduleModal.tsx` | ~120 | Agendamento |
| `ScriptEditorModal.tsx` | ~100 | Editor de script |
| `ViewModeToggle.tsx` | ~50 | Toggle de modo de visualizacao |
| `AISuggestionsSection.tsx` | ~100 | Sugestoes de IA |

#### Prospecting (features/prospecting/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `ProspectingPage.tsx` | 738 | Pagina principal |
| `PowerDialer.tsx` | 370 | Discador automatico |
| `QuickActionsPanel.tsx` | 319 | Painel de acoes rapidas |
| `ProspectingFilters.tsx` | 314 | Filtros de prospeccao |
| `FilteredContactsList.tsx` | 305 | Lista filtrada |
| `ConnectionHeatmap.tsx` | 240 | Mapa de calor de conexoes |
| `ProspectingScriptGuide.tsx` | 225 | Guia de scripts |
| `MetricsChart.tsx` | 201 | Graficos de metricas |
| `CorretorRanking.tsx` | 172 | Ranking de corretores |
| `CallDetailsTable.tsx` | 167 | Tabela de detalhes de ligacao |
| `MetricsCards.tsx` | ~130 | Cards de metricas com skeleton |
| `DailyGoalCard.tsx` | ~100 | Card de meta diaria |
| `CallQueue.tsx` | ~120 | Fila de ligacoes |
| `ContactHistory.tsx` | ~100 | Historico de contato |
| `ConversionFunnel.tsx` | ~100 | Funil de conversao com skeleton |
| `SavedQueuesList.tsx` | ~80 | Filas salvas |
| `SaveQueueModal.tsx` | ~100 | Modal de salvar fila |
| `GoalConfigModal.tsx` | ~120 | Configuracao de metas |
| `SessionSummary.tsx` | ~80 | Resumo da sessao |
| `NoteTemplates.tsx` | ~100 | Templates de notas |
| `NoteTemplatesManager.tsx` | ~150 | Gerenciador de templates |
| `QueueItem.tsx` | ~80 | Item na fila |
| `AddToQueueSearch.tsx` | ~80 | Busca para adicionar a fila |
| `AutoInsights.tsx` | ~100 | Insights automaticos |

#### Contacts (features/contacts/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `ContactsPage.tsx` | 276 | Pagina principal |
| `ContactsList.tsx` | ~400 | Lista com ARIA extenso |
| `ContactFormModal.tsx` | ~300 | Formulario de contato |
| `ContactDetailModal.tsx` | ~250 | Detalhe de contato |
| `ContactMergeModal.tsx` | ~200 | Merge de duplicados |
| `ContactsFilters.tsx` | ~150 | Filtros |
| `ContactsHeader.tsx` | ~120 | Header com ARIA |
| `CompanyFormModal.tsx` | ~200 | Formulario de empresa |
| `ContactsImportExportModal.tsx` | ~400 | Import/export CSV |
| `SelectBoardModal.tsx` | ~150 | Selecao de board |
| `BulkActionsToolbar.tsx` | ~120 | Acoes em massa |
| `PaginationControls.tsx` | ~150 | Paginacao acessivel |
| `DuplicateScanPage.tsx` | ~200 | Scanner de duplicados |
| `MetricsDashboard.tsx` | ~250 | Dashboard de metricas |
| **cockpit/** | | |
| `ContactCockpitDataPanel.tsx` | ~200 | Painel de dados do contato |

#### Activities (features/activities/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `ActivitiesPage.tsx` | 295 | Pagina principal |
| `ActivitiesList.tsx` | ~200 | Lista de atividades |
| `ActivitiesCalendar.tsx` | ~250 | Visao calendario |
| `ActivitiesMonthlyCalendar.tsx` | ~200 | Calendario mensal |
| `ActivitiesFilters.tsx` | ~150 | Filtros com ARIA |
| `ActivitiesHeader.tsx` | ~100 | Header |
| `ActivityFormModal.tsx` | ~300 | Formulario de atividade |
| `ActivityFormModalV2.tsx` | ~150 | V2 simplificado |
| `ActivityRow.tsx` | ~120 | Linha de atividade |
| `BulkActionsToolbar.tsx` | ~120 | Acoes em massa |

#### Settings (features/settings/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `SettingsPage.tsx` | 261 | Pagina com tabs |
| `AICenterSettings.tsx` | ~150 | Config de IA |
| `UsersPage.tsx` | ~200 | Gestao de usuarios (RBAC) |
| `AIConfigSection.tsx` | ~200 | Secao de config IA |
| `AIFeaturesSection.tsx` | ~150 | Features de IA |
| `ApiKeysSection.tsx` | ~150 | Chaves de API |
| `AuditLogDashboard.tsx` | ~200 | Dashboard de audit log |
| `CustomFieldsManager.tsx` | ~250 | Campos customizados |
| `DataStorageSettings.tsx` | ~100 | Configuracoes de dados |
| `LifecycleSettingsModal.tsx` | ~150 | Ciclo de vida |
| `McpSection.tsx` | ~100 | Configuracao MCP |
| `ProductsCatalogManager.tsx` | ~300 | Catalogo de produtos |
| `TagsManager.tsx` | ~150 | Gerenciador de tags |
| `WebhooksSection.tsx` | ~300 | Webhooks |
| `SettingsSection.tsx` | ~80 | Wrapper de secao |

#### Dashboard (features/dashboard/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `DashboardPage.tsx` | 347 | Pagina principal |
| `StatCard.tsx` | ~60 | Card de estatistica |
| `ActivityFeedItem.tsx` | ~80 | Item do feed |
| `PipelineAlertsModal.tsx` | ~120 | Alertas do pipeline |

#### Deal Cockpit (features/deals/cockpit/)

| Componente | Linhas | Observacao |
|------------|--------|------------|
| `DealCockpitClient.tsx` | 856 | Cliente principal do cockpit |
| `DealCockpitFocusClient.tsx` | 107 | Versao focada |
| `CockpitDataPanel.tsx` | 964 (48KB) | **GRANDE** - painel de dados |
| `CockpitTimeline.tsx` | 240 | Timeline de eventos |
| `CockpitPipelineBar.tsx` | 314 | Barra de progresso |
| `CockpitRightRail.tsx` | 299 | Painel lateral |
| `CockpitActionPanel.tsx` | 131 | Painel de acoes |
| `CockpitNextActionPanel.tsx` | 146 | Proxima acao |
| `CockpitChecklist.tsx` | 105 | Checklist |
| `CockpitHealthPanel.tsx` | ~100 | Saude do deal |
| `TemplatePickerModal.tsx` | 136 | Seletor de template |

### 3.6 Padrao de Props e Typing

Todos os componentes shadcn/ui seguem o padrao:

```typescript
// CVA para variants
const variants = cva("base-classes", {
  variants: { variant: {...}, size: {...} },
  defaultVariants: { variant: "default", size: "default" }
});

// Interface com extends + VariantProps
export interface ComponentProps
  extends React.HTMLAttributes<HTMLElement>,
  VariantProps<typeof variants> {
  asChild?: boolean;
}

// forwardRef para composicao
const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => (
    <element ref={ref} className={cn(variants({ variant, size, className }))} {...props} />
  )
);
Component.displayName = "Component";
```

Componentes customizados (Modal, FormField, EmptyState) usam interfaces tipadas sem CVA.

---

## 4. Analise do Design System

### 4.1 Arquitetura de Tokens (3 camadas)

O sistema usa **3 camadas de tokens** em CSS, definidas em `app/globals.css`:

**Camada 1 - Tailwind v4 @theme (primitivos):**
```css
@theme {
  --font-sans: 'Inter', var(--font-inter), sans-serif;
  --font-display: 'Space Grotesk', sans-serif;
  --font-serif: 'Cinzel', serif;  /* NAO UTILIZADO */
  --color-primary-50 a --color-primary-900  /* escala hex (Sky) */
  --color-dark-bg, --color-dark-card, --color-dark-border, --color-dark-hover  /* hex */
}
```

**Camada 2 - shadcn/ui semantic tokens (@theme inline):**
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card / --color-card-foreground
  --color-popover / --color-popover-foreground
  --color-secondary / --color-secondary-foreground
  --color-muted / --color-muted-foreground
  --color-accent / --color-accent-foreground
  --color-destructive / --color-destructive-foreground
  --color-border, --color-input, --color-ring
}
```

**Camada 3 - Custom semantic tokens (:root / .dark):**
```css
:root {
  /* Backgrounds */
  --color-bg: oklch(97% 0.005 90);        /* Soft Cream */
  --color-surface: oklch(99% 0.002 90);
  --color-muted: oklch(95% 0.008 90);
  --color-border: oklch(90% 0.01 90);
  --color-border-subtle: oklch(93% 0.008 90);

  /* Status Colors (cada um com -hover, -bg, -text) */
  --color-success: oklch(65% 0.17 145);
  --color-warning: oklch(75% 0.15 85);
  --color-error: oklch(62% 0.25 25);
  --color-info: oklch(60% 0.20 240);
  --color-orange: oklch(70% 0.18 55);

  /* Text hierarchy */
  --color-text-primary: oklch(25% 0.015 260);
  --color-text-secondary: oklch(45% 0.02 260);
  --color-text-muted: oklch(55% 0.025 260);
  --color-text-subtle: oklch(62% 0.025 260);

  /* Glass effect */
  --glass-bg / --glass-border / --glass-blur

  /* App Shell (runtime) */
  --app-sidebar-width: 0px;
  --app-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --app-bottom-nav-height: 0px;

  /* Premium (Nocturne Cian) */
  --premium-accent: #7DE8EB;    /* HEX - deveria ser OKLCH */
  --premium-mesh-color: rgba(125, 232, 235, 0.03);

  /* Chart Colors */
  --chart-text: #64748b;        /* HEX - DEBT-009 */
  --chart-grid: rgba(148, 163, 184, 0.1);
  --chart-tooltip-bg: #0f172a;
  --chart-tooltip-border: rgba(255, 255, 255, 0.1);
  --chart-tooltip-text: #f8fafc;
}
```

### 4.2 Paleta de Cores

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--color-bg` | oklch(97% 0.005 90) | oklch(11% 0.025 260) | Background principal |
| `--color-surface` | oklch(99% 0.002 90) | oklch(15% 0.02 260) | Cards, paineis |
| `--color-muted` | oklch(95% 0.008 90) | oklch(22% 0.015 260) | Backgrounds sutis |
| `--color-border` | oklch(90% 0.01 90) | oklch(26% 0.012 260) | Bordas |
| `--primary` | oklch(55% 0.20 240) | oklch(65% 0.20 240) | Acoes primarias |
| `--color-success` | oklch(65% 0.17 145) | oklch(70% 0.17 145) | Sucesso |
| `--color-warning` | oklch(75% 0.15 85) | oklch(80% 0.14 85) | Alerta |
| `--color-error` | oklch(62% 0.25 25) | oklch(68% 0.24 25) | Erro |
| `--color-info` | oklch(60% 0.20 240) | oklch(70% 0.19 240) | Informacional |
| `--color-orange` | oklch(70% 0.18 55) | oklch(75% 0.17 55) | Tags/categorias |

**Cores residuais nao-OKLCH:**
- `--color-primary-50..900`: escala hex Sky (Camada 1, Tailwind v4 @theme)
- `--color-dark-*`: hex (#020617, #0f172a, #1e293b, #334155)
- `--premium-accent`: hex (#7DE8EB)
- `--chart-*`: hex e rgba
- Scrollbar: hex (#cbd5e1, #94a3b8, #334155, #475569)

### 4.3 Tipografia

| Token | Familia | Peso | Uso |
|-------|---------|------|-----|
| `--font-sans` | Inter | 400-700 | Corpo de texto, UI geral |
| `--font-display` | Space Grotesk | 500-700 | Titulos, labels de navegacao, branding |
| `--font-serif` | Cinzel | - | Definido mas **nao utilizado** em nenhum componente |

**Escala tipografica:** Usa escala padrao do Tailwind (text-xs 12px, text-sm 14px, text-base 16px, text-lg 18px, text-xl 20px, text-2xl 24px). Nao ha escala customizada.

**Custom utility:** `@utility font-display` mapeia para Space Grotesk.

### 4.4 Espacamento

Usa sistema padrao do Tailwind: gap-1 (4px), gap-2 (8px), gap-3 (12px), gap-4 (16px), gap-5 (20px), gap-6 (24px), gap-8 (32px).

Padding de conteudo principal: `p-6` (24px), modal body: `p-4 sm:p-5`.

### 4.5 Border Radius

| Uso | Valor Tailwind | Valor px |
|-----|---------------|----------|
| `--radius` (shadcn) | - | 0.5rem (8px) |
| Botoes | rounded-md a rounded-xl | 6px-12px |
| Cards | rounded-lg a rounded-2xl | 8px-16px |
| Modais | rounded-xl / rounded-2xl | 12px/16px (mobile/desktop) |
| Avatares | rounded-full | circulo |
| Badges | rounded-full | circulo |
| Logo | rounded-xl | 12px |
| Inputs | rounded-lg | 8px |

### 4.6 Sombras

| Nivel | Uso |
|-------|-----|
| `shadow-sm` | Cards padrao |
| `shadow-lg` | Avatares, logo, botoes hover |
| `shadow-xl` | Dropdown menus |
| `shadow-2xl` | Modais, sheets |
| `shadow-primary-500/20` | Logo accent glow |

### 4.7 Dark Mode

**Implementacao completa (class-based):**
- Default: dark mode ativado (`<html className="dark">`)
- Script inline no `<head>` para evitar FOUC (lê localStorage antes do render)
- Persistencia em `localStorage` via chave `crm_dark_mode`
- Toggle via `ThemeContext.toggleDarkMode()`
- Todos os tokens semanticos OKLCH tem variantes dark via `.dark { ... }`
- `.dark` tambem redefine `--primary` e `--primary-foreground` com luminancia mais alta
- Textos dark usam luminancia alta (98%, 83%, 72%) para hierarquia

### 4.8 Custom Utilities

| Utility | Proposito |
|---------|-----------|
| `@utility font-display` | Fonte Space Grotesk |
| `@utility glass` | Efeito glassmorphism (backdrop-blur + bg semi-transparente) |
| `@utility grain` | Textura animada para fundo premium |
| `@utility scrollbar-custom` | Scrollbar estilizada |
| `@utility sr-only` | Screen reader only (acessibilidade) |
| `.cv-auto` | content-visibility: auto (performance) |
| `.cv-row-sm/md/lg` | contain-intrinsic-size para linhas |
| `.cv-card` / `.cv-card-lg` | contain-intrinsic-size para cards |
| `.focus-visible-ring` | Focus ring padrao (outline 2px) |
| `.focus-visible-high` | Focus ring high contrast (outline 3px + box-shadow) |
| `.skip-link` | Link de pular navegacao |
| `.live-region` | Regiao aria-live oculta |

---

## 5. Arquitetura de Layout

### 5.1 App Shell (components/Layout.tsx)

O layout principal implementa um pattern responsivo com 3 modos:

```
Desktop (>=1280px):     Sidebar (52/208px) | Header + Main | AI Panel (396px, opcional)
Tablet (768-1279px):    Navigation Rail (80px) | Header + Main
Mobile (<768px):        Header + Main + Bottom Nav (56px, fixo)
```

**Composicao de layouts:**
1. `app/layout.tsx` - Root layout: `<html>`, `<body>`, font (Inter), ServiceWorker, InstallBanner
2. `app/(protected)/layout.tsx` -> `providers.tsx` - Composed providers wrapper (10 providers)
3. `components/Layout.tsx` - App shell com sidebar/rail/bottomnav/header/main/AI panel
4. Feature page components injetados como `{children}`

**CSS vars runtime:**
- `--app-sidebar-width`: definida via JS em Layout.tsx (5rem collapsed, 13rem expanded, 0px mobile)
- `--app-bottom-nav-height`: 56px em mobile, 0px em desktop
- `--app-safe-area-bottom`: env(safe-area-inset-bottom)

### 5.2 Navegacao

**3 patterns de navegacao responsiva:**

| Componente | Breakpoint | Largura | Tipo |
|------------|-----------|---------|------|
| `Sidebar` (collapsible) | Desktop (lg+) | 52px collapsed / 208px expanded | Lateral esquerda |
| `NavigationRail` | Tablet (md-lg) | 80px | Lateral esquerda, so icones |
| `BottomNav` | Mobile (<md) | 100% x 56px | Barra inferior fixa |

**Itens de navegacao (navConfig.ts):**

Primarios (BottomNav + Rail):
- Inbox, Boards, Contatos, Atividades, Prospeccao, Mais (sheet)

Secundarios (Rail, Sidebar, More sheet):
- Visao Geral, Relatorios, Configuracoes, Perfil, Instrucoes

Sidebar (Desktop completo):
- Inbox, Visao Geral, Boards, Contatos, Atividades, Prospeccao, Relatorios, Configuracoes

**Funcionalidades da navegacao:**
- `aria-current="page"` em links ativos
- `aria-label` em cada `<nav>` (diferente por breakpoint)
- Prefetch on hover/focus via `prefetchRoute()`
- Click tracking durante Suspense transitions (clickedPath state)
- Sidebar collapse/expand com animacao CSS (transition-all duration-300)
- User menu dropdown no footer da sidebar (avatar, nome, email)
- MoreMenuSheet para itens secundarios em mobile

### 5.3 Responsive Breakpoints

| Breakpoint | Tamanho | Modo | CSS Class | Justificativa |
|-----------|---------|------|-----------|---------------|
| Mobile | < 768px | `mobile` | (sem prefixo) | Padrao mobile-first |
| Tablet | >= 768px, < 1280px | `tablet` | `md:` | Inclui iPad landscape (1024px) |
| Desktop | >= 1280px | `desktop` | `lg:` | 1280px (nao 1024px padrao Tailwind) |

**Breakpoints definidos em:** `lib/utils/responsive.ts` (APP_BREAKPOINTS)
**Hook:** `useResponsiveMode()` retorna `{ mode, width }` com hydration safety (inicia com 1024 no SSR)

### 5.4 Header

Header minimalista (h-16) posicionado no topo da area de conteudo, com glass effect:
- Botao de IA (Sparkles icon, toggle)
- Botao de debug (Bug icon, toggle com ring visual)
- NotificationPopover
- Toggle dark/light mode (Sun/Moon icons)

### 5.5 Grid/Flex Patterns

| Contexto | Pattern |
|----------|---------|
| App shell | `flex h-screen overflow-hidden` |
| Sidebar | `flex flex-col` com altura 100% |
| Main content | `flex-1 flex flex-col min-w-0 overflow-hidden` |
| Main scroll | `overflow-y-auto overflow-x-hidden p-6` com padding bottom dinamico |
| Dashboard | Grid de StatCards: `grid grid-cols-2 lg:grid-cols-4` |
| Kanban | `flex gap-3 overflow-x-auto` (scroll horizontal) |
| Contact list | Tabela responsiva com scroll vertical |
| Modais | `flex items-stretch sm:items-center justify-center` |

---

## 6. User Flows

### 6.1 Fluxos Principais

| Fluxo | Rota | Componentes Principais | Status |
|-------|------|----------------------|--------|
| **Instalacao** | `/install` | Wizard multi-step com Framer Motion | Completo |
| **Login** | `/login` | Formulario email/senha, Supabase Auth, Loader2 | Completo |
| **Convite** | `/join` | JoinClient, acesso via link | Completo |
| **Setup** | `/setup` | Setup inicial sem app shell | Completo |
| **Dashboard** | `/dashboard` | StatCards, ActivityFeedItem, PipelineAlertsModal | Completo |
| **Kanban Boards** | `/boards` | BoardSelector, KanbanBoard, DealCard, DealDetailModal | Completo |
| **Contatos** | `/contacts` | ContactsList, ContactFormModal, ContactDetailModal, Cockpit | Completo |
| **Contatos Metricas** | `/contacts/metrics` | MetricsDashboard, charts | Completo |
| **Contatos Duplicados** | `/contacts/duplicates` | DuplicateScanPage | Completo |
| **Inbox** | `/inbox` | InboxListView, InboxFocusView, FocusContextPanel, CallModal | Completo |
| **Atividades** | `/activities` | ActivitiesList, ActivitiesCalendar, ActivityFormModal | Completo |
| **Deal Cockpit** | `/deals/[id]/cockpit` | DealCockpitClient, CockpitDataPanel, CockpitTimeline | Completo |
| **Prospeccao** | `/prospecting` | ProspectingPage, PowerDialer, CallQueue, MetricsCards | Completo |
| **Relatorios** | `/reports` | ReportsPage | Basico |
| **Configuracoes** | `/settings` | SettingsPage (tabs: AI, Webhooks, API, Users, etc.) | Completo |
| **Perfil** | `/profile` | ProfilePage | Completo |
| **Notificacoes** | `/notifications` | NotificationsPage | Completo |
| **Hub IA** | `/ai` | AIHubPage | Completo |
| **Landing pages** | `/lp`, `/lp2` | Paginas de marketing | Completo |

### 6.2 Form Patterns

**Biblioteca de formularios:**
- `react-hook-form` v7.x para gestao de estado
- `@hookform/resolvers` + `zod` v4.x para validacao
- `useFormEnhanced` hook customizado em `lib/forms/`
- `FormField` componentes tipados em `components/ui/FormField.tsx`

**Componentes de formulario:**
- `InputField` - Input com label, erro, hint, validacao visual
- `TextareaField` - Textarea com as mesmas features
- `SelectField` - Select nativo com opcoes
- `CheckboxField` - Checkbox com label inline
- `SubmitButton` - Botao com loading state (spinner SVG + texto)
- `FormErrorSummary` - Resumo de erros no topo com role="alert"

**Validacao UX:**
- Tempo real com feedback visual: borda vermelha + icone AlertCircle
- Estado de sucesso: borda verde + icone CheckCircle2 (quando `showSuccessState=true`)
- `aria-invalid`, `aria-describedby` injetados automaticamente via React.cloneElement
- `role="alert"` nas mensagens de erro (aria-live="polite")
- Hint text com id para associacao via aria-describedby
- `FormErrorSummary` com `aria-labelledby="form-errors-heading"`

**Validacao de dados:**
- `lib/validations/schemas.ts` - Schemas Zod para entidades
- `lib/validations/cpf-cep.ts` - Validacao de CPF e CEP
- `lib/validations/errorCodes.ts` - Codigos de erro padronizados

### 6.3 Modal/Dialog Patterns

**Modal generico (`components/ui/Modal.tsx`):**
- `role="dialog"` e `aria-modal="true"`
- `aria-labelledby` apontando para titulo auto-gerado (useId)
- Focus trap via `FocusTrap` component (wrap de `focus-trap-react`)
- `useFocusReturn` para retorno de foco ao trigger
- Escape key para fechar
- Backdrop click para fechar
- 8 tamanhos (sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl)
- Tokens visuais centralizados em `modalStyles.ts` (7 constantes)
- `MODAL_OVERLAY_CLASS` usa `md:left-[var(--app-sidebar-width,0px)]` no desktop
- z-index 9999 para ficar acima de tudo
- Viewport cap: `max-h-[calc(90dvh-1rem)]` mobile, `90dvh-2rem` desktop
- `focusTrapEnabled` prop para nested modals

**ConfirmModal (`components/ConfirmModal.tsx`):**
- `role="alertdialog"` para dialogos de confirmacao
- Auto-focus no botao cancelar (opcao segura)
- Variantes: default, danger
- **DEBT-013:** Nao usa `modalStyles.ts`, estilos inline proprios

**Sheet (`components/ui/Sheet.tsx`):**
- Bottom sheet mobile-first com AnimatePresence (Framer Motion)
- Animacao de entrada de baixo para cima com blur
- FocusTrap e useFocusReturn integrados
- Backdrop com onClick para fechar

**FullscreenSheet, ActionSheet:**
- Variantes especializadas para diferentes fluxos mobile

### 6.4 Notificacoes / Feedback

**Toast system (`context/ToastContext.tsx`):**
- 4 tipos: success, error, info, warning
- Auto-dismiss em 3 segundos
- `aria-live="polite"` para container
- role="alert" para erros (assertive) / role="status" para sucesso
- Botao de fechar com aria-label="Fechar notificacao"
- Posicao: bottom-right fixo, z-50
- Icones por tipo: CheckCircle (success), AlertCircle (error), Info (info)

**Notification store (Zustand, `lib/stores/`):**
- Sistema paralelo mais avancado com acoes clicaveis
- Auto-dismiss configuravel (default 5s, 0 = persistente)
- Sem duplicacao com toast (funcionalidade complementar)

---

## 7. State Management

### 7.1 Arquitetura de Estado

O projeto usa uma arquitetura hibrida com separacao clara:

```
Server State (TanStack Query)    Client State (Zustand)    UI State (React Context)
  Deals, Contacts, Activities      UI Store (sidebar,        Auth, Theme, Toast,
  Boards, Settings, AI              modals, search)          AI, CRM (legado)
  Prospecting metrics             Form Store (drafts)
  via query hooks + realtime       Notification Store
```

### 7.2 Server State (TanStack Query)

**Configuracao (`lib/query/index.tsx`):**
- Stale time: 5 minutos
- GC time: 30 minutos
- Retry: 3x com backoff exponencial
- Refetch em foco/reconexao
- Error handling global com toast

**Query keys centralizadas (`lib/query/queryKeys.ts`):**
- `queryKeys.deals.*`, `queryKeys.contacts.*`, `queryKeys.activities.*`
- `queryKeys.boards.*`, `queryKeys.settings.*`, `queryKeys.dashboard.*`
- `queryKeys.prospectingMetrics.*` (adicionado recentemente)

**Hooks de entidade (`lib/query/hooks/`):**
- `useDealsQuery.ts` - CRUD de deals
- `useContactsQuery.ts` - CRUD de contatos
- `useBoardsQuery.ts` - CRUD de boards
- `useActivitiesQuery.ts` - CRUD de atividades
- `useMoveDeal.ts` - Mover deal entre estagios (optimistic update)
- `useAISuggestionsQuery.ts` - Sugestoes de IA

**Realtime sync (`lib/realtime/`):**
- `useRealtimeSync.ts` para subscricoes Supabase realtime
- Cobertura expandida para: daily goals, org settings, prospecting, dashboard, activities
- Cache invalidation automatica em mudancas realtime

### 7.3 Client State (Zustand)

**3 stores especializados (`lib/stores/index.ts`):**

| Store | Persiste? | Responsabilidade |
|-------|----------|------------------|
| `useUIStore` | Nao | Sidebar, AI panel, board ativo, modais, search, loading states |
| `useFormStore` | Sim (localStorage) | Drafts de formularios, submitting states |
| `useNotificationStore` | Nao | Notificacoes com auto-dismiss |

**Selector hooks para performance (re-render granular):**
- `useSidebarOpen()`, `useAIAssistantOpen()`, `useIsGlobalAIOpen()`
- `useActiveBoardId()`, `useActiveModal()`, `useModalData()`
- `useGlobalSearch()`, `useFormDraft(formId)`, `useIsFormSubmitting(formId)`
- `useNotifications()`

**Helper hooks:**
- `useFormDraftAutoSave(formId, data, debounceMs)` - auto-save com debounce (1s)

### 7.4 React Contexts (10 providers compostos)

**Provider Composition (`providers.tsx`):**

```
QueryProvider
  ToastProvider
    ThemeProvider
      AuthProvider
        SettingsProvider (717 linhas)
          BoardsProvider (264 linhas)
            ContactsProvider (168 linhas)
              ActivitiesProvider (154 linhas)
                DealsProvider (268 linhas)
                  AIProvider (116 linhas)
```

Compostos via `composeProviders()` helper que reduz aninhamento visual.

**CRMContext (legado, 930 linhas, 34KB):**
- Contexto unificado que agrega todos os contextos de dominio
- Interface de compatibilidade mantida para codigo legado
- Recomendacao oficial no JSDoc: usar hooks especificos diretamente
- Qualquer mudanca causa re-render em todos os consumers (DEBT-003)

**AIChatContext (87 linhas):**
- Estado do chat IA (mensagens, loading)
- Separado do AIContext (configuracao)

### 7.5 Feature Controller Hooks

Cada feature principal tem um controller hook que centraliza logica:

| Hook | Feature | Tamanho | Observacao |
|------|---------|---------|------------|
| `useBoardsController.ts` | Boards | 1081 linhas (37KB) | **GIGANTE** - DEBT-006 |
| `useContactsController.ts` | Contacts | 883 linhas (30KB) | **GIGANTE** - DEBT-006 |
| `useInboxController.ts` | Inbox | 872 linhas (28KB) | **GIGANTE** - DEBT-006 |
| `useActivitiesController.ts` | Activities | 551 linhas (20KB) | Grande |
| `useDashboardMetrics.ts` | Dashboard | 494 linhas | Moderado |
| `useProspectingMetrics.ts` | Prospecting | 273 linhas | Adequado |
| `useProspectingQueue.ts` | Prospecting | 224 linhas | Adequado |
| `useSavedQueues.ts` | Prospecting | 115 linhas | Adequado |
| `useKanbanKeyboard.ts` | Boards | 195 linhas | Adequado |

### 7.6 Optimistic Updates

Implementado via `useOptimisticMutation` em `lib/query/index.tsx`:
- Cancel outgoing refetches
- Snapshot previous value
- Apply optimistic update
- Rollback on error (with toast)
- Invalidate on settle

**Uso atual:**
- Deal moves (KanbanBoard): optimistic completo
- Prospecting queue (add/remove contacts): optimistic com `setQueriesData`
- Contacts, activities, settings: full refetch (sem optimistic) - **DEBT-014**

---

## 8. Estrutura de Rotas

### 8.1 App Router Structure

```
/                          # Redirect condicional (install/setup/dashboard)
/login                     # Pagina de login (publica)
/install                   # Wizard de instalacao (publica)
/install/start             # Inicio da instalacao
/install/wizard            # Wizard multi-step
/join                      # Convite de usuario (publica)
/lp                        # Landing page v1 (publica)
/lp2                       # Landing page v2 (publica)
/auth/callback             # OAuth callback
/(protected)/              # Grupo de rotas autenticadas
  /dashboard               # Visao geral
  /inbox                   # Inbox inteligente (loading.tsx)
  /boards                  # Kanban boards (loading.tsx)
  /contacts                # Gestao de contatos (loading.tsx)
  /contacts/duplicates     # Scanner de duplicados
  /contacts/metrics        # Dashboard de metricas
  /activities              # Gestao de atividades
  /deals/[dealId]/cockpit  # Cockpit de deal (loading.tsx)
  /deals/[dealId]/cockpit-v2  # Cockpit v2 (experimental)
  /prospecting             # Modulo de prospeccao
  /reports                 # Relatorios
  /settings                # Configuracoes (tabs)
  /profile                 # Perfil do usuario
  /notifications           # Central de notificacoes
  /instructions            # Instrucoes do sistema
  /decisions               # Pagina de decisoes
  /ai                      # Hub de IA
  /ai-test                 # Testes do chat IA
  /pipeline                # Alias para /boards
  /setup                   # Setup inicial (sem app shell)
  /labs/deal-cockpit-mock  # Labs: mock do cockpit
  /labs/deal-jobs-mock     # Labs: mock de jobs
```

### 8.2 Loading States por Rota

| Rota | Tem loading.tsx? | Tipo de Loading |
|------|-----------------|-----------------|
| `/boards` | Sim | Skeleton (colunas kanban + cards) |
| `/contacts` | Sim | Skeleton |
| `/inbox` | Sim | Skeleton |
| `/deals/[id]/cockpit` | Sim | Skeleton |
| Demais rotas | Nao | `PageLoader` generico (spinner) |

### 8.3 Prefetching

- `lib/prefetch.ts` define `prefetchRoute()` e `prefetchRouteData()`
- Ativado em `onMouseEnter` e `onFocus` nos links de navegacao
- `prefetchRouteData()` implementado apenas para dashboard e contacts (DEBT-018)

---

## 9. Auditoria de Acessibilidade

### 9.1 Biblioteca de Acessibilidade (`lib/a11y/`)

**Componentes:**
| Componente | Proposito |
|------------|-----------|
| `FocusTrap` | Armadilha de foco para modais (wrap de `focus-trap-react`) |
| `VisuallyHidden` | Conteudo visivel apenas para screen readers |
| `SkipLink` | Link "Pular para conteudo" no topo |
| `LiveRegion` | Anuncios para screen readers (aria-live) |

**Hooks:**
| Hook | Proposito |
|------|-----------|
| `useFocusReturn` | Retorna foco ao elemento trigger ao fechar modal |
| `useAnnounce` | Anuncia mensagens via aria-live region |
| `useKeyboardShortcut` | Gerencia atalhos de teclado |
| `useFormErrorFocus` | Foca automaticamente no primeiro erro do formulario |

### 9.2 Implementacao WCAG

| Criterio | Status | Detalhes |
|----------|--------|----------|
| **Skip link** | Implementado | `<SkipLink targetId="main-content" />` no Layout |
| **Landmarks** | Bom | `<nav>` (3x com aria-label distinto), `<main id="main-content">`, `<header role="banner">`, `<aside aria-label="Assistente de IA">` |
| **Focus management** | Bom | FocusTrap em todos os modais, useFocusReturn em Modal/Sheet/ConfirmModal |
| **Keyboard navigation** | Bom | `focus-visible-ring` pattern global, Escape para fechar modais, Tab navigation, useKanbanKeyboard |
| **ARIA roles** | Bom | `role="dialog"`, `role="alertdialog"`, `role="alert"`, `role="status"`, `role="banner"` |
| **ARIA attributes** | Bom | aria-modal, aria-labelledby, aria-describedby, aria-current, aria-invalid, aria-required, aria-hidden, aria-busy, aria-live (279 ocorrencias em 82 arquivos) |
| **Form accessibility** | Bom | Labels associados via htmlFor, error messages com role="alert", hints com aria-describedby, required indicators |
| **Screen reader** | Parcial | sr-only class, LiveRegion, mas falta anuncio de mudanca de pagina |
| **Color contrast** | Provavel OK | OKLCH com lightness adequada, mas **nao verificado formalmente** com ferramenta |
| **Reduced motion** | Implementado | `@media (prefers-reduced-motion: reduce)` zera animacoes |
| **High contrast** | Parcial | `@media (prefers-contrast: more)` para focus rings (outline 3px) |
| **Icons** | Bom | `aria-hidden="true"` em icones decorativos consistentemente |
| **Images** | Parcial | Avatares com alt vazio (decorativo), imagens de conteudo variam |
| **Error handling** | Bom | FormErrorSummary com aria-labelledby, inline errors com role="alert", login error com aria-describedby |
| **Loading states** | Parcial | SubmitButton com aria-busy, mas spinners genericos sem anuncio |
| **Tables** | Parcial | ContactsList com aria extenso, mas nem todas as tabelas sao acessiveis |

### 9.3 Testes de Acessibilidade

- `axe-core` v4.10 instalado como devDependency
- `vitest-axe` v0.1 instalado para testes automatizados
- Testes existentes em `components/ui/FormField.test.tsx`, `components/ConfirmModal.test.tsx`, `components/ui/Modal.test.tsx`
- Cobertura limitada: a maioria dos feature components nao tem testes a11y

---

## 10. Auditoria de Responsividade

### 10.1 Nivel de Suporte Mobile

**Status: BOM.** A aplicacao tem suporte mobile de primeira classe.

| Feature | Suporte Mobile | Implementacao |
|---------|---------------|---------------|
| Navegacao | Dedicado | BottomNav com 5 itens + MoreMenuSheet |
| Layout | Responsivo | Flexbox com min-w-0 anti-overflow |
| Modais | Adaptativo | viewport cap com dvh, full-width em mobile |
| Kanban | Scroll horizontal | Colunas com overflow-x-auto |
| Formularios | Full width | Inputs 100% width |
| Touch targets | Minimo 44px | Maioria dos botoes >= 40x40px |
| Safe areas | Implementado | env(safe-area-inset-*) |
| PWA | Completo | ServiceWorker + InstallBanner + manifest |
| Anti overflow-x | Implementado | `html, body { overflow-x: hidden }` |

### 10.2 Patterns Responsivos

| Pattern | Implementacao |
|---------|--------------|
| **Navigation switch** | BottomNav (mobile), Rail (tablet), Sidebar (desktop) |
| **Modal sizing** | `max-h-[calc(90dvh-1rem)]` mobile, `90dvh-2rem` desktop |
| **Sidebar offset** | CSS var `--app-sidebar-width` em modais/overlays |
| **Content padding** | `pb-[calc(1.5rem+var(--app-bottom-nav-height)+var(--app-safe-area-bottom))]` |
| **Grid collapse** | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| **Hide/show** | `hidden md:flex lg:hidden` pattern |
| **Modal responsive** | `p-2 sm:p-4`, `rounded-xl sm:rounded-2xl` |
| **Text responsive** | `text-base sm:text-lg` em titulos de modal |

### 10.3 PWA Support

- `ServiceWorkerRegister` registra SW no mount
- `InstallBanner` mostra banner de instalacao (useInstallState hook)
- `app/manifest.ts` gera manifest dinamico
- `sw.js` servido com `Cache-Control: no-cache`
- Headers configurados em `next.config.ts`

---

## 11. Observacoes de Performance

### 11.1 Loading States

| Pattern | Implementacao | Status |
|---------|--------------|--------|
| **PageLoader** | Spinner centralizado (`components/PageLoader.tsx`) | Basico (generico) |
| **Route skeletons** | loading.tsx em boards, contacts, inbox, deal cockpit | Parcial (4/18 rotas) |
| **Component skeletons** | MetricsCards, ConversionFunnel (prospecting) | Limitado |
| **Button loading** | `SubmitButton` com `isLoading` + spinner SVG | Implementado |
| **EmptyState** | Componente reutilizavel (3 sizes, role="status") | Implementado |
| **ErrorBoundary** | Error boundary com "Tentar novamente" | Implementado |
| **GlobalError** | Sentry + fallback page | Implementado |

**DEBT-002:** Skeletons quase inexistentes. Apenas 4 rotas tem loading.tsx com skeletons. Features como dashboard, activities, settings, reports usam spinner generico.

### 11.2 Code Splitting / Lazy Loading

| Pattern | Uso |
|---------|-----|
| **React.lazy** | Charts (FunnelChart, RevenueTrendChart), AIAssistant (deprecado) |
| **Suspense** | Charts wrapper, Join page, Inbox FocusContextPanel, Layout |
| **Dynamic imports** | Limitado (poderia lazy-load mais features) |
| **optimizePackageImports** | lucide-react (1500+ icones), recharts, date-fns |
| **content-visibility** | `.cv-auto` classes para listas longas (CSS nativo virtual scroll) |

### 11.3 Optimistic Updates

- Deal moves (Kanban): optimistic completo com rollback
- Prospecting queue mutations: optimistic com setQueriesData
- `useOptimisticMutation` helper generico em lib/query
- Contacts/Activities/Settings: refetch completo sem optimistic (DEBT-014)

### 11.4 Prefetching

- Rotas prefetchadas on hover/focus: todas no nav
- Dados prefetchados: apenas dashboard e contacts (DEBT-018)

### 11.5 React 19 Features

- `useOptimistic`: 2 usos (query layer, notifications)
- `useTransition`: 2 usos (query layer, notifications)
- `Suspense boundaries`: 4 locais
- `use()` hook: nao utilizado

### 11.6 Bundle Optimization

- `next.config.ts` usa `optimizePackageImports` para lucide-react, recharts, date-fns
- Sentry condicional (so com NEXT_PUBLIC_SENTRY_DSN)
- Source maps deletados apos upload (Sentry)
- Turbopack em dev mode

---

## 12. Inventario de Debitos Tecnicos

### Severidade CRITICA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-001** | **Duplicacao de Button component.** 2 versoes: `components/ui/button.tsx` (6 variants, 4 sizes) e `app/components/ui/Button.tsx` (+variant "unstyled", +size "unstyled"). Imports misturados. Layout.tsx importa de app/components. | Inconsistencia visual, confusao, manutencao duplicada | `components/ui/button.tsx`, `app/components/ui/Button.tsx` |
| **DEBT-003** | **CRMContext monolito (34KB, 930 linhas).** Contexto unificado que agrega todos os dominios. Qualquer mudanca causa re-render em todos os consumers. | Performance de re-render, manutenibilidade | `context/CRMContext.tsx` |
| **DEBT-004** | **Componentes gigantes.** FocusContextPanel 110KB (1886 linhas), DealDetailModal 88KB (1694 linhas), BoardCreationWizard 76KB (1628 linhas), CockpitDataPanel 48KB (964 linhas). Precisam decomposicao. | Manutenibilidade, code review, bundle, performance | `features/inbox/components/FocusContextPanel.tsx`, `features/boards/components/Modals/DealDetailModal.tsx`, `features/boards/components/BoardCreationWizard.tsx`, `features/deals/cockpit/CockpitDataPanel.tsx` |

### Severidade ALTA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-002** | **Skeletons quase inexistentes.** Apenas 4 de 18+ rotas tem loading.tsx com skeletons (boards, contacts, inbox, deal cockpit). Demais usam PageLoader (spinner generico). | Percepcao de velocidade ruim, UX inferior | Todas as paginas sem loading.tsx |
| **DEBT-005** | **Nenhum sistema de i18n.** Todas as strings hardcoded em portugues (400+ strings em componentes). Sem infraestrutura para internacionalizacao. | Impossivel traduzir sem refatoracao massiva | Todo o codebase |
| **DEBT-006** | **Controller hooks gigantes.** useBoardsController (37KB, 1081 linhas), useContactsController (30KB, 883 linhas), useInboxController (28KB, 872 linhas). Centralizam toda logica. | Manutenibilidade, testabilidade, code review | `features/*/hooks/use*Controller.ts` |
| **DEBT-007** | **Mistura de import paths.** Imports de `@/lib/utils` e `@/lib/utils/cn` inconsistentes. | Confusao, imports quebrados potenciais | `lib/utils/` |
| **DEBT-008** | **Scrollbar styling com hex hardcoded.** Custom scrollbar usa `#cbd5e1`, `#94a3b8`, `#334155`, `#475569` em vez de tokens semanticos. Global scrollbar duplica scrollbar-custom com os mesmos hex. | Inconsistencia com sistema OKLCH | `app/globals.css` (linhas 282-308, 447-471) |
| **DEBT-009** | **Chart colors com hex hardcoded.** Tokens de chart e premium usam `#64748b`, `#0f172a`, `#7DE8EB`, `rgba(...)` em vez de OKLCH. | Inconsistencia visual entre temas, nao-adaptavel | `app/globals.css` (linhas 146-155, 207-215) |

### Severidade MEDIA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-010** | **Font serif nao utilizada.** `--font-serif: 'Cinzel'` definida na @theme mas nao referenciada em nenhum componente. Se carregada via Google Fonts, adiciona peso desnecessario. | Peso de fonte desnecessario | `app/globals.css` |
| **DEBT-011** | **Cores Tailwind pre-v4 misturadas.** Uso direto de `text-slate-*`, `bg-slate-*`, `text-gray-*` (cores Tailwind padrao) ao lado de tokens semanticos customizados. Duas fontes de verdade para cores. | Inconsistencia visual potencial | Layout.tsx, NavItem, LoginPage, multiplos |
| **DEBT-012** | **PageLoader com cores hardcoded.** Usa `text-gray-500 dark:text-gray-400` em vez de `text-muted-foreground`. | Inconsistencia | `components/PageLoader.tsx` |
| **DEBT-013** | **ConfirmModal nao usa modalStyles.** Tem estilos inline proprios ao inves de usar os tokens centralizados de `modalStyles.ts`. | Possivel deriva visual | `components/ConfirmModal.tsx` |
| **DEBT-014** | **Optimistic updates parciais.** Apenas deal moves e prospecting queue tem optimistic updates. Contacts, activities, settings fazem full refetch. | UX mais lenta em CRUD | `lib/query/hooks/` |
| **DEBT-015** | **ErrorBoundary usa inline styles.** `ErrorBoundary.tsx` usa `style={{ borderColor: 'var(--border)' }}` em vez de classes Tailwind. | Inconsistencia de padrao | `app/components/ui/ErrorBoundary.tsx` |
| **DEBT-016** | **GlobalError sem design system.** `app/global-error.tsx` usa HTML puro sem styling do design system. | Experiencia visual quebrada em erros globais | `app/global-error.tsx` |
| **DEBT-021** | **Duplicacao de scrollbar styling.** `@utility scrollbar-custom` e global scrollbar styling (`*::-webkit-scrollbar`) coexistem com mesmos valores hex. | Redundancia, manutencao duplicada | `app/globals.css` (linhas 282-308, 447-471) |
| **DEBT-022** | **ActivityFormModal duplicado.** V1 e V2 coexistem: `ActivityFormModal.tsx` (~300 linhas) e `ActivityFormModalV2.tsx` (~150 linhas). | Ambiguidade sobre qual usar | `features/activities/components/` |
| **DEBT-023** | **CreateDealModal duplicado.** V1 e V2 coexistem: `CreateDealModal.tsx` (395 linhas) e `CreateDealModalV2.tsx` (145 linhas). | Ambiguidade sobre qual usar | `features/boards/components/Modals/` |
| **DEBT-024** | **DealCockpit duplicado.** Cockpit original e cockpit-v2 coexistem como rotas separadas. | Confusao de fluxo, manutencao duplicada | `app/(protected)/deals/[dealId]/cockpit`, `cockpit-v2` |

### Severidade BAIXA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-017** | **SubmitButton em FormField.tsx.** Exporta `SubmitButton` com `buttonVariants` proprios que conflitam semanticamente com os do `button.tsx`. | Confusao de naming | `components/ui/FormField.tsx` |
| **DEBT-018** | **Prefetch incompleto.** `prefetchRouteData()` implementa apenas dashboard e contacts. Outras rotas retornam `null`. | Prefetch parcial | `lib/query/index.tsx` |
| **DEBT-019** | **Ambient glow hardcoded.** Efeito decorativo no main content usa cores hardcoded. | Nao adaptavel por tema | `components/Layout.tsx` |
| **DEBT-020** | **Nenhum teste e2e/visual.** Sem Playwright, Storybook, ou testes visuais/regression. Apenas testes unitarios com vitest + @testing-library. | Regressoes visuais nao detectadas | Infraestrutura de testes |
| **DEBT-025** | **AIAssistant.tsx deprecado.** Importacao comentada no Layout, substituido por UIChat, mas arquivo ainda existe. | Dead code | `components/AIAssistant.tsx` |

---

## 13. Recomendacoes

### 13.1 Pontos Fortes (manter e expandir)

1. **Design system bem fundamentado.** Tokens OKLCH em 3 camadas, shadcn/ui, CVA, Radix UI. Base solida para evolucao.
2. **Acessibilidade acima da media.** Biblioteca dedicada (`lib/a11y/`), FocusTrap, SkipLink, ARIA attributes consistentes, axe-core.
3. **Dark mode completo.** Todas as cores semanticas com variantes dark, FOUC prevention, persistencia.
4. **Responsividade de primeira classe.** 3 patterns de navegacao, safe areas, viewport caps, PWA.
5. **State management moderno.** TanStack Query + Zustand + Context compostos, selector hooks, optimistic updates.
6. **Modal system consistente.** Tokens centralizados em modalStyles.ts, sidebar-aware overlay, FocusTrap.
7. **Error handling robusto.** Global error (Sentry), ErrorBoundary, Query error handlers, Toast com a11y.
8. **Performance CSS.** content-visibility para listas longas, optimizePackageImports.
9. **Modulo de Prospeccao maduro.** 23 componentes, skeleton loading, optimistic updates, realtime sync, testes.
10. **Form system acessivel.** FormField com ARIA automatico, validacao real-time, error summary, success states.

### 13.2 Acoes Prioritarias

| Prioridade | Acao | Debts Resolvidos | Esforco |
|-----------|------|-----------------|---------|
| 1 | **Unificar Button component.** Merge das 2 versoes, manter variants unstyled no unico componente. Atualizar todos os imports. | DEBT-001 | Baixo |
| 2 | **Decompor componentes gigantes.** FocusContextPanel -> 5-8 sub-componentes. DealDetailModal -> tabs separados. BoardCreationWizard -> wizard steps. CockpitDataPanel -> secoes. | DEBT-004 | Alto |
| 3 | **Implementar skeletons por rota.** Criar loading.tsx para dashboard, activities, settings, reports, profile, prospecting. | DEBT-002 | Medio |
| 4 | **Migrar cores hardcoded para tokens OKLCH.** Scrollbar, charts, premium accent, PageLoader, backgrounds glow. | DEBT-008, 009, 011, 012, 021 | Medio |
| 5 | **Decompor controller hooks.** Separar useBoardsController em useKanbanDragDrop, useBoardCRUD, useDealActions, etc. | DEBT-006 | Alto |
| 6 | **Limpar duplicacoes V1/V2.** Decidir e remover ActivityFormModal V1 ou V2, CreateDealModal V1 ou V2, consolidar cockpit. | DEBT-022, 023, 024 | Medio |
| 7 | **Depreciar CRMContext.** Migrar consumers restantes para hooks especificos, marcar como deprecated. | DEBT-003 | Medio |
| 8 | **Avaliar i18n.** Definir se internationalizacao e necessaria antes de crescer mais. Se sim, adotar next-intl ou similar. | DEBT-005 | Alto (se decidir implementar) |

### 13.3 Arquitetura Target

```
Atual:                              Target:
components/ui/button.tsx        --> components/ui/button.tsx (UNICO, com unstyled)
app/components/ui/Button.tsx        (REMOVIDO, imports migrados)

CRMContext (34KB monolito)      --> hooks especificos (useDeals, useContacts, etc.)
                                    CRMContext DEPRECATED com aviso no console

FocusContextPanel (110KB)       --> 5-8 sub-componentes focados
DealDetailModal (88KB)          --> tabs/secoes em componentes separados
BoardCreationWizard (76KB)      --> wizard steps em componentes separados
CockpitDataPanel (48KB)         --> secoes em componentes separados

useBoardsController (37KB)      --> useKanbanDragDrop + useBoardCRUD + useDealActions
useContactsController (30KB)    --> useContactCRUD + useContactFilters + useContactBulk
useInboxController (28KB)       --> useInboxItems + useInboxActions + useInboxFilters

PageLoader (spinner generico)   --> Route-specific skeletons (loading.tsx)
#cbd5e1 (scrollbar hex)         --> var(--color-border) / oklch tokens
#64748b (chart hex)             --> oklch tokens adaptaveis por tema
text-gray-500                   --> text-muted-foreground
ActivityFormModal V1+V2         --> ActivityFormModal (unico, melhor versao)
CreateDealModal V1+V2           --> CreateDealModal (unico, melhor versao)
```

---

> **Gerado por:** @ux-design-expert (Uma) - Brownfield Discovery Phase 3
> **Revisao:** v2 (2026-03-06) - Auditoria completa do codebase com dados atualizados
> **Proxima fase:** Phase 4 (Technical Debt Draft) - @architect
