# Frontend Specification - ZmobCRM

> **Fase:** Brownfield Discovery - Phase 3 (UX/Frontend)
> **Data:** 2026-03-03
> **Agente:** @ux-design-expert (Uma)
> **Status:** Completo (atualizado)
> **Versao do Projeto:** 1.4.3

---

## 1. Visao Geral da Arquitetura Frontend

### 1.1 Stack Tecnologico

| Tecnologia | Versao | Proposito |
|------------|--------|-----------|
| Next.js | 15.5.x | Framework (App Router, Turbopack dev) |
| React | 19.2.1 | UI Library |
| TypeScript | 5.x | Tipagem estatica (strict mode) |
| Tailwind CSS | 4.x | Estilizacao (CSS-first config via @theme) |
| TanStack React Query | 5.90.x | Server state management |
| Zustand | 5.0.x | Client state management |
| Radix UI | Multiplos | Componentes primitivos acessiveis |
| class-variance-authority | 0.7.x | Variants tipadas para componentes |
| Framer Motion | 12.x | Animacoes (uso limitado) |
| Lucide React | 0.560 | Icones (otimizado via optimizePackageImports) |
| Recharts | 3.5.x | Graficos |
| React Hook Form + Zod | 7.x / 4.x | Formularios e validacao |
| Supabase SSR | 0.8.x | Auth e banco de dados |
| AI SDK (Vercel) | 6.x | Integracao IA (Anthropic, OpenAI, Google) |
| Sentry | 10.x | Error tracking (condicional) |
| date-fns | 4.x | Manipulacao de datas |
| Immer | 11.x | Mutacao imutavel de estado |
| jsPDF + autoTable | 4.x / 5.x | Geracao de PDF |

### 1.2 Estrutura de Diretorios

```
/
  app/                         # Next.js App Router
    (protected)/               # Grupo de rotas autenticadas
      activities/              # Pagina de atividades
      ai/                     # Hub de IA
      boards/                  # Kanban boards
      contacts/                # Gestao de contatos
      dashboard/               # Visao geral
      deals/                   # Deals / cockpit
      inbox/                   # Inbox inteligente
      instructions/            # Instrucoes do sistema
      labs/                    # Features experimentais
      notifications/           # Central de notificacoes
      pipeline/                # Alias para boards
      profile/                 # Perfil do usuario
      reports/                 # Relatorios
      settings/                # Configuracoes
      setup/                   # Setup inicial (sem app shell)
      layout.tsx               # Protected layout wrapper
      providers.tsx            # Composed providers (10 providers)
      page.tsx                 # Dashboard home redirect
    actions/                   # Server Actions
    api/                       # API routes
    auth/                      # Auth callback
    components/ui/             # Componentes shadcn/ui (app-level)
      Button.tsx               # Button com variant "unstyled"
      ErrorBoundary.tsx        # Error boundary React
    install/                   # Fluxo de instalacao
    join/                      # Convite de usuario
    login/                     # Pagina de login
    globals.css                # Design tokens + Tailwind v4 @theme
    layout.tsx                 # Root layout (html, body, fonts)
  components/                  # Componentes compartilhados
    ai/                        # UIChat (assistente IA)
    charts/                    # Graficos com lazy loading
    debug/                     # Ferramentas de debug
    filters/                   # Componentes de filtro
    navigation/                # BottomNav, NavigationRail, navConfig
    notifications/             # NotificationPopover
    pwa/                       # ServiceWorkerRegister, InstallBanner
    ui/                        # Biblioteca de componentes UI
    AIAssistant.tsx            # Assistente IA (legado)
    ConfirmModal.tsx           # Modal de confirmacao acessivel
    ConsentModal.tsx           # Modal de consentimento LGPD
    Layout.tsx                 # App shell principal
    MaintenanceBanner.tsx      # Banner de manutencao
    OnboardingModal.tsx        # Modal de onboarding
    PageLoader.tsx             # Spinner de carregamento
  context/                     # React Contexts
    activities/                # ActivitiesContext
    boards/                    # BoardsContext
    contacts/                  # ContactsContext
    deals/                     # DealsContext
    settings/                  # SettingsContext
    AIChatContext.tsx           # Estado do chat IA
    AIContext.tsx               # Configuracao IA
    AuthContext.tsx             # Autenticacao
    CRMContext.tsx              # Contexto unificado (legado)
    ThemeContext.tsx            # Dark/Light mode
    ToastContext.tsx            # Notificacoes toast
  features/                    # Feature modules (dominio)
    activities/                # Gestao de atividades
    ai-hub/                    # Hub de IA
    boards/                    # Kanban boards
    contacts/                  # Gestao de contatos
    dashboard/                 # Dashboard
    deals/                     # Cockpit de deals
    decisions/                 # Decisoes
    inbox/                     # Inbox inteligente
    instructions/              # Instrucoes
    notifications/             # Notificacoes
    profile/                   # Perfil
    reports/                   # Relatorios
    settings/                  # Configuracoes
  hooks/                       # Hooks globais
  lib/                         # Bibliotecas utilitarias
    a11y/                      # Acessibilidade (FocusTrap, SkipLink, etc.)
    ai/                        # Agente IA
    auth/                      # Auth helpers
    fetch/                     # Fetch utilities
    forms/                     # useFormEnhanced
    query/                     # TanStack Query (client, keys, hooks)
    realtime/                  # Supabase realtime sync
    stores/                    # Zustand stores
    supabase/                  # Supabase client + service modules
    utils/                     # cn, responsive, csv, etc.
    validations/               # Error codes, validacao
  types/                       # Tipos globais TypeScript
  squads/                      # Squads reutilizaveis (design, squad-creator)
```

### 1.3 Metricas do Codebase

| Metrica | Valor |
|---------|-------|
| Arquivos TS/TSX (excl. node_modules) | ~471 |
| Componentes UI (components/ui/) | 23 arquivos |
| Feature modules | 13 modulos |
| React Contexts | 10 providers |
| Hooks globais | 12 hooks |
| Rotas protegidas | 18+ paginas |

---

## 2. UI Components Inventory

### 2.1 Biblioteca de Componentes

O projeto usa uma combinacao de **shadcn/ui** (Radix UI primitivos + CVA) com componentes customizados:

**Radix UI Primitivos instalados (15):**

| Primitivo | Uso |
|-----------|-----|
| `@radix-ui/react-accordion` | Secoes expansiveis |
| `@radix-ui/react-avatar` | Avatares de usuario |
| `@radix-ui/react-checkbox` | Checkboxes |
| `@radix-ui/react-dialog` | Dialogos base |
| `@radix-ui/react-dropdown-menu` | Menus dropdown |
| `@radix-ui/react-label` | Labels de formulario |
| `@radix-ui/react-popover` | Popovers |
| `@radix-ui/react-scroll-area` | Areas de scroll customizadas |
| `@radix-ui/react-select` | Selects acessiveis |
| `@radix-ui/react-separator` | Separadores |
| `@radix-ui/react-slider` | Sliders |
| `@radix-ui/react-slot` | Slot (composicao) |
| `@radix-ui/react-switch` | Switches |
| `@radix-ui/react-tabs` | Tabs |
| `@radix-ui/react-tooltip` | Tooltips |

### 2.2 Componentes Reutilizaveis (components/ui/)

| Componente | Tipo | Pattern | Observacao |
|------------|------|---------|------------|
| `button.tsx` | Atom | CVA + forwardRef | shadcn padrao (6 variants, 4 sizes) |
| `card.tsx` | Atom | forwardRef | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `badge.tsx` | Atom | CVA | 4 variants |
| `alert.tsx` | Atom | CVA | 2 variants (default, destructive) |
| `tabs.tsx` | Molecule | Radix Tabs | TabsList, TabsTrigger, TabsContent |
| `tooltip.tsx` | Atom | Radix Tooltip | Provider, Trigger, Content |
| `avatar.tsx` | Atom | Radix Avatar | Com fallback |
| `popover.tsx` | Atom | Radix Popover | Wrapper basico |
| `Modal.tsx` | Molecule | Custom | FocusTrap, ARIA, sizes sm-5xl |
| `ConfirmModal.tsx` (components/) | Molecule | Custom | role=alertdialog, danger variants |
| `Sheet.tsx` | Molecule | Framer Motion | Bottom sheet mobile |
| `ActionSheet.tsx` | Molecule | Custom | Acoes em lista (mobile) |
| `FullscreenSheet.tsx` | Molecule | Custom | Sheet fullscreen |
| `FormField.tsx` | Molecule | Custom | Input, Textarea, Select, Checkbox, Submit |
| `EmptyState.tsx` | Molecule | Custom | 3 sizes (sm, md, lg) |
| `AudioPlayer.tsx` | Organism | Custom | Player de audio |
| `ContactSearchCombobox.tsx` | Organism | Custom | Busca de contatos |
| `DealSearchCombobox.tsx` | Organism | Custom | Busca de deals |
| `CorretorSelect.tsx` | Molecule | Custom | Selecao de corretor |
| `LossReasonModal.tsx` | Organism | Custom | Modal de motivo de perda |
| `date-range-picker.tsx` | Organism | Custom | Seletor de intervalo de datas |
| `modalStyles.ts` | Tokens | Classes | Tokens visuais compartilhados para modais |

### 2.3 Componentes em `app/components/ui/`

| Componente | Diferenca do `components/ui/` |
|------------|------------------------------|
| `Button.tsx` | Identico ao components/ui/button.tsx + variant "unstyled" e size "unstyled" |
| `ErrorBoundary.tsx` | Error boundary com UI de fallback |

**DEBT-001:** Duplicacao de Button entre `components/ui/button.tsx` e `app/components/ui/Button.tsx`. O segundo adiciona variants `unstyled` nao presentes no primeiro. Imports no codebase referenciam ambos caminhos.

### 2.4 Padrao de Props e Typing

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

## 3. Design System / Tokens

### 3.1 Arquitetura de Tokens

O sistema usa **3 camadas de tokens** em CSS, definidas em `app/globals.css`:

**Camada 1 - Tailwind v4 @theme (primitivos):**
```css
@theme {
  --font-sans: 'Inter', var(--font-inter), sans-serif;
  --font-display: 'Space Grotesk', sans-serif;
  --font-serif: 'Cinzel', serif;
  --color-primary-50 a --color-primary-900 (escala azul/sky)
  --color-dark-bg, --color-dark-card, --color-dark-border, --color-dark-hover
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

  /* Status Colors (with -hover, -bg, -text variants) */
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

  /* App Shell */
  --app-sidebar-width / --app-bottom-nav-height / --app-safe-area-bottom
}
```

### 3.2 Paleta de Cores

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

**Nota:** Todas as cores semanticas usam OKLCH, o que e uma pratica moderna e perceptualmente uniforme. Os tokens antigos `--color-primary-50..900` na @theme usam hex (escala Sky).

### 3.3 Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-sans` | Inter | Corpo de texto, UI geral |
| `--font-display` | Space Grotesk | Titulos, labels de navegacao |
| `--font-serif` | Cinzel | Nao utilizado no codebase atualmente |

**Escala tipografica:** Usa escala padrao do Tailwind (text-xs a text-2xl). Nao ha escala customizada.

### 3.4 Espacamento

Usa sistema padrao do Tailwind: gap-1 (4px), gap-2 (8px), gap-3 (12px), gap-4 (16px), gap-6 (24px), gap-8 (32px).

### 3.5 Border Radius

| Uso | Valor |
|-----|-------|
| `--radius` (shadcn) | 0.5rem |
| Botoes | rounded-md (0.375rem) a rounded-lg (0.5rem) |
| Cards | rounded-lg (0.5rem) a rounded-xl (0.75rem) |
| Modais | rounded-xl / rounded-2xl (mobile/desktop) |
| Avatares | rounded-full |
| Badges | rounded-full |
| Logo | rounded-xl |

### 3.6 Sombras

| Token | Uso |
|-------|-----|
| `shadow-sm` | Cards |
| `shadow-lg` | Avatares, logo, botoes hover |
| `shadow-xl` | Dropdown menus |
| `shadow-2xl` | Modais, sheets |
| `shadow-primary-500/20` | Logo accent glow |

### 3.7 Dark Mode

**Suporte:** Completo (class-based via `.dark` no `<html>`).

**Implementacao:**
- Default: dark mode ativado (`<html className="dark">`)
- Script inline no `<head>` para evitar flash (FOUC)
- Persistencia em localStorage (`crm_dark_mode`)
- Toggle via `ThemeContext.toggleDarkMode()`
- Todos os tokens semanticos tem variantes dark via `.dark { ... }`

---

## 4. Layout Patterns

### 4.1 App Shell (Layout Principal)

O layout principal (`components/Layout.tsx`) implementa um pattern responsivo com 3 modos:

```
Desktop (>=1280px):     Sidebar (52/20) | Header + Main | AI Panel (opcional)
Tablet (768-1279px):    Navigation Rail (5rem) | Header + Main
Mobile (<768px):        Header + Main + Bottom Nav (fixo)
```

**Composicao:**
1. `app/layout.tsx` - Root layout (html, body, font, ServiceWorker)
2. `app/(protected)/layout.tsx` -> `providers.tsx` - Composed providers wrapper
3. `components/Layout.tsx` - App shell com sidebar/header/main/AI panel
4. Feature page components (injetados como `children`)

### 4.2 Navegacao

**3 patterns de navegacao responsiva:**

| Componente | Breakpoint | Tipo |
|------------|-----------|------|
| **Sidebar** (collapsible) | Desktop (lg+) | Lateral esquerda, 52px (collapsed) / 208px (expanded) |
| **NavigationRail** | Tablet (md-lg) | Lateral esquerda, 80px, so icones |
| **BottomNav** | Mobile (<md) | Barra inferior fixa, 56px |

**Itens primarios (mobile BottomNav):**
- Inbox, Boards, Contatos, Atividades, Mais (menu sheet)

**Itens completos (desktop sidebar):**
- Inbox, Visao Geral, Boards, Contatos, Atividades, Relatorios, Notificacoes, Configuracoes

**Itens secundarios (tablet rail + More menu):**
- Visao Geral, Relatorios, Configuracoes, Perfil, Instrucoes

**Funcionalidades:**
- `aria-current="page"` em links ativos
- Prefetch on hover/focus via `prefetchRoute()`
- Click tracking durante Suspense transitions
- Sidebar collapse/expand com animacao
- User menu dropdown no footer da sidebar

### 4.3 Responsive Breakpoints

| Breakpoint | Tamanho | Modo | CSS Class |
|-----------|---------|------|-----------|
| Mobile | < 768px | `mobile` | Tailwind default (no prefix) |
| Tablet | >= 768px, < 1280px | `tablet` | `md:` |
| Desktop | >= 1280px | `desktop` | `lg:` |

**Nota:** O breakpoint desktop e 1280px (nao 1024px padrao do Tailwind) para que iPad landscape fique em modo tablet.

**Hook:** `useResponsiveMode()` retorna `{ mode: 'mobile'|'tablet'|'desktop', width: number }`.

### 4.4 Grid/Flex Patterns

- **App shell:** `flex h-screen overflow-hidden`
- **Sidebar:** `flex flex-col` com altura 100%
- **Main content:** `flex-1 flex flex-col min-w-0 overflow-hidden`
- **Pages:** Geralmente `space-y-6` ou grid customizado por feature
- **Dashboard:** Grid de StatCards (`grid grid-cols-2 lg:grid-cols-4`)
- **Kanban:** `flex gap-3 overflow-x-auto` (scroll horizontal)
- **Contact list:** Tabela responsiva com scroll

---

## 5. User Flows

### 5.1 Fluxos Principais

| Fluxo | Rota | Componentes Principais |
|-------|------|----------------------|
| **Login** | `/login` | Formulario de email/senha, Supabase Auth |
| **Setup Inicial** | `/setup` | Wizard de configuracao (sem app shell) |
| **Dashboard** | `/dashboard` | StatCards, ActivityFeed, PipelineAlerts |
| **Kanban Boards** | `/boards` | BoardSelector, KanbanBoard, DealCard, DealDetailModal |
| **Contatos** | `/contacts` | ContactsList, ContactFormModal, ContactDetailModal, ContactCockpit |
| **Inbox** | `/inbox` | InboxListView, InboxFocusView, FocusContextPanel |
| **Atividades** | `/activities` | ActivitiesList, ActivitiesCalendar, ActivityFormModal |
| **Deal Cockpit** | `/deals/[id]` | DealCockpitClient, CockpitDataPanel, CockpitTimeline |
| **Relatorios** | `/reports` | Feature de relatorios |
| **Configuracoes** | `/settings` | SettingsPage (tabs: AI, Webhooks, API, Users, etc.) |
| **Perfil** | `/profile` | Edicao de perfil do usuario |

### 5.2 Form Patterns

**Biblioteca de formularios:**
- `react-hook-form` para gestao de estado
- `@hookform/resolvers` + `zod` para validacao
- `useFormEnhanced` hook customizado em `lib/forms/`
- `FormField` componentes tipados em `components/ui/FormField.tsx`

**Componentes de formulario:**
- `InputField` - Input com label, erro, hint, validacao
- `TextareaField` - Textarea com as mesmas features
- `SelectField` - Select nativo com opcoes
- `CheckboxField` - Checkbox com label inline
- `SubmitButton` - Botao com loading state e spinner
- `FormErrorSummary` - Resumo de erros no topo

**Validacao:**
- Tempo real com feedback visual (borda vermelha + icone)
- `aria-invalid`, `aria-describedby` automaticos
- `role="alert"` nas mensagens de erro

### 5.3 Modal/Dialog Patterns

**Modal generico (`components/ui/Modal.tsx`):**
- Focus trap via `focus-trap-react`
- `useFocusReturn` para retorno de foco
- Escape key para fechar
- Backdrop click para fechar
- 8 tamanhos (sm a 5xl)
- Tokens visuais centralizados em `modalStyles.ts`
- `MODAL_OVERLAY_CLASS` respeita `--app-sidebar-width` no desktop

**ConfirmModal (`components/ConfirmModal.tsx`):**
- `role="alertdialog"` para dialogos de confirmacao
- Auto-focus no botao cancelar (opcao segura)
- Variantes: default, danger

**Sheet (`components/ui/Sheet.tsx`):**
- Bottom sheet mobile-first com Framer Motion
- Animacao de entrada/saida com blur
- Safe area padding para iOS

**FullscreenSheet, ActionSheet:**
- Variantes especializadas para diferentes fluxos mobile

### 5.4 Notificacoes / Feedback

**Toast system (`context/ToastContext.tsx`):**
- 4 tipos: success, error, warning, info
- Auto-dismiss em 3 segundos
- `aria-live="polite"` (info/success) e `aria-live="assertive"` (error)
- Posicao: bottom-right fixo

**Notification store (Zustand):**
- Sistema paralelo mais avancado com acoes clicaveis
- Auto-dismiss configuravel
- Sem duplicacao com toast (funcionalidade diferente)

---

## 6. Responsiveness

### 6.1 Nivel de Suporte Mobile

**Status: BOM.** A aplicacao tem suporte mobile de primeira classe:

| Feature | Suporte Mobile |
|---------|---------------|
| Navegacao | BottomNav dedicado |
| Layout | Responsivo (flexbox) |
| Modais | viewport cap com dvh |
| Kanban | Scroll horizontal |
| Formularios | Full width inputs |
| Touch targets | Minimo 44px (maioria) |
| Safe areas | env(safe-area-inset-*) |
| PWA | ServiceWorker + InstallBanner + manifest |

### 6.2 Patterns Responsivos

| Pattern | Implementacao |
|---------|--------------|
| **Navigation switch** | BottomNav (mobile), Rail (tablet), Sidebar (desktop) |
| **Modal sizing** | `max-h-[calc(90dvh-1rem)]` mobile, `90dvh-2rem` desktop |
| **Sidebar offset** | CSS var `--app-sidebar-width` em modais/overlays |
| **Content padding** | `pb-[calc(1.5rem+var(--app-bottom-nav-height)+var(--app-safe-area-bottom))]` |
| **Grid collapse** | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| **Hide/show** | `hidden md:flex lg:hidden` pattern |
| **Touch optimization** | Larger click targets em mobile |

### 6.3 PWA Support

- ServiceWorker registrado via `ServiceWorkerRegister`
- Install banner para instalacao como app
- Manifest via `app/manifest.ts`
- `sw.js` com cache headers

---

## 7. Accessibility (a11y)

### 7.1 Biblioteca de Acessibilidade (`lib/a11y/`)

**Componentes:**
- `FocusTrap` - Armadilha de foco para modais (via `focus-trap-react`)
- `VisuallyHidden` - Conteudo so para screen readers
- `SkipLink` - Link "Pular para conteudo" no topo
- `LiveRegion` - Anuncios para screen readers

**Hooks:**
- `useFocusReturn` - Retorna foco ao trigger ao fechar modal
- `useAnnounce` - Anuncia mensagens via aria-live
- `useKeyboardShortcut` - Gerencia atalhos de teclado
- `useFormErrorFocus` - Foca no primeiro erro do formulario

### 7.2 Implementacao WCAG

| Criterio | Status | Detalhes |
|----------|--------|----------|
| **Skip link** | Implementado | `<SkipLink targetId="main-content" />` |
| **Landmarks** | Parcial | `<nav>`, `<main>`, `<header>`, `<aside>` com aria-label |
| **Focus management** | Bom | FocusTrap em todos os modais, focusReturn |
| **Keyboard navigation** | Bom | `focus-visible-ring` pattern, Escape para fechar |
| **ARIA roles** | Bom | `role="dialog"`, `role="alertdialog"`, `role="alert"`, `role="status"` |
| **ARIA attributes** | Bom | `aria-modal`, `aria-labelledby`, `aria-describedby`, `aria-current`, `aria-invalid`, `aria-required`, `aria-hidden`, `aria-busy`, `aria-live` |
| **Form accessibility** | Bom | Labels associados, error messages com `role="alert"`, hints |
| **Screen reader** | Parcial | `sr-only` class, LiveRegion, mas falta anuncio de navegacao |
| **Color contrast** | Provavel OK | OKLCH com lightness adequada, mas nao verificado formalmente |
| **Reduced motion** | Implementado | `@media (prefers-reduced-motion: reduce)` reseta animacoes |
| **High contrast** | Parcial | `@media (prefers-contrast: more)` para focus rings |
| **Icons** | Bom | `aria-hidden="true"` em icones decorativos consistentemente |
| **Images** | Parcial | Avatares com alt vazio (decorativo), mas imagens de conteudo variam |

**Total de usos de aria-*:** 172 ocorrencias em 30+ arquivos.

### 7.3 Axe-Core / Testes A11y

- `axe-core` instalado como devDependency
- `vitest-axe` instalado para testes automatizados
- Testes existentes em `lib/a11y/test/` e `components/ui/FormField.test.tsx`

---

## 8. Performance (Percebida)

### 8.1 Loading States

| Pattern | Implementacao | Status |
|---------|--------------|--------|
| **PageLoader** | Spinner centralizado (`components/PageLoader.tsx`) | Basico |
| **Skeleton** | Usado em charts (`ChartSkeleton`) | Limitado (2 arquivos) |
| **Button loading** | `SubmitButton` com `isLoading` + spinner | Implementado |
| **EmptyState** | Componente reutilizavel (3 sizes) | Implementado |
| **ErrorBoundary** | Error boundary com "Tentar novamente" | Implementado |
| **GlobalError** | Sentry + fallback page | Implementado |

**DEBT-002:** Skeletons quase inexistentes. Apenas charts tem skeleton loading. Paginas inteiras usam spinner generico em vez de content-aware skeletons.

### 8.2 Error States

| Tipo | Implementacao |
|------|--------------|
| **Global error** | `app/global-error.tsx` (Sentry) |
| **Error boundary** | `app/components/ui/ErrorBoundary.tsx` |
| **Query errors** | Tratamento global no `QueryClient` com toast |
| **Form errors** | `FormErrorSummary` + per-field errors |
| **Empty state** | `EmptyState` component |

### 8.3 Optimistic Updates

Implementado via `useOptimisticMutation` em `lib/query/index.tsx`:
- Cancel outgoing refetches
- Snapshot previous value
- Apply optimistic update
- Rollback on error
- Invalidate on settle

### 8.4 Code Splitting / Lazy Loading

| Pattern | Uso |
|---------|-----|
| **React.lazy** | Charts (FunnelChart, RevenueTrendChart), AIAssistant |
| **Suspense** | Charts wrapper, Join page, Inbox panels |
| **Dynamic imports** | Limitado |
| **optimizePackageImports** | lucide-react, recharts, date-fns |
| **content-visibility** | `.cv-auto` classes para listas longas |

**Nota:** `content-visibility: auto` esta implementado com classes utilitarias (`.cv-auto`, `.cv-row-sm/md/lg`, `.cv-card`, `.cv-card-lg`) para renderizacao virtual CSS nativa.

### 8.5 Prefetching

- Prefetch de rotas via `prefetchRoute()` em `lib/prefetch.ts`
- Ativado em `onMouseEnter` e `onFocus` nos links de navegacao
- Implementado para dashboard e contacts

---

## 9. State Management

### 9.1 Arquitetura de Estado

O projeto usa uma arquitetura hibrida com separacao clara:

```
Server State (TanStack Query)    Client State (Zustand)    UI State (React Context)
  Deals, Contacts, Activities      UI Store (sidebar,        Auth, Theme, Toast,
  Boards, Settings, AI              modals, search)          CRM (legado)
  via query hooks                  Form Store (drafts)
                                   Notification Store
```

### 9.2 Server State (TanStack Query)

**Configuracao:**
- Stale time: 5 minutos
- GC time: 30 minutos
- Retry: 3x com backoff exponencial
- Refetch em foco/reconexao

**Query keys centralizadas (`lib/query/queryKeys.ts`):**
- `queryKeys.deals.*`, `queryKeys.contacts.*`, `queryKeys.activities.*`
- `queryKeys.boards.*`, `queryKeys.settings.*`, `queryKeys.dashboard.*`

**Hooks de entidade (`lib/query/hooks/`):**
- `useDealsQuery.ts` - CRUD de deals
- `useContactsQuery.ts` - CRUD de contatos
- `useBoardsQuery.ts` - CRUD de boards
- `useActivitiesQuery.ts` - CRUD de atividades
- `useMoveDeal.ts` - Mover deal entre estagios
- `useAISuggestionsQuery.ts` - Sugestoes de IA

**Realtime sync:** `lib/realtime/useRealtimeSync.ts` para subscricoes Supabase.

### 9.3 Client State (Zustand)

**3 stores especializados (`lib/stores/index.ts`):**

| Store | Persiste? | Responsabilidade |
|-------|----------|------------------|
| `useUIStore` | Nao | Sidebar, AI panel, board ativo, modais, search, loading |
| `useFormStore` | Sim (localStorage) | Drafts de formularios, submitting states |
| `useNotificationStore` | Nao | Notificacoes com auto-dismiss |

**Selector hooks para performance:**
- `useSidebarOpen()`, `useAIAssistantOpen()`, `useIsGlobalAIOpen()`
- `useActiveBoardId()`, `useActiveModal()`, `useGlobalSearch()`
- `useFormDraft(formId)`, `useIsFormSubmitting(formId)`

### 9.4 React Contexts

**Provider Composition (10 providers em `providers.tsx`):**
1. `QueryProvider` - TanStack Query
2. `ToastProvider` - Notificacoes toast
3. `ThemeProvider` - Dark/Light mode
4. `AuthProvider` - Autenticacao Supabase
5. `SettingsProvider` - Configuracoes da org
6. `BoardsProvider` - Boards/pipelines
7. `ContactsProvider` - Contatos
8. `ActivitiesProvider` - Atividades
9. `DealsProvider` - Deals
10. `AIProvider` - Configuracao IA

**CRMContext (legado):**
- Contexto unificado que agrega todos os contextos de dominio
- Mantido para compatibilidade retroativa
- Recomendacao: usar hooks especificos diretamente

### 9.5 Form State

- `react-hook-form` para gestao de estado de formularios
- `useFormEnhanced` hook customizado (`lib/forms/`)
- Auto-save de drafts via `useFormDraftAutoSave()` hook
- Drafts persistidos em localStorage

---

## 10. Technical Debts (UX/UI Level)

### Severidade CRITICA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-001** | **Duplicacao de Button component.** Existem 2 versoes: `components/ui/button.tsx` e `app/components/ui/Button.tsx`. A segunda adiciona variants `unstyled`. Imports misturados no codebase. | Inconsistencia visual, confusao para devs | `components/ui/button.tsx`, `app/components/ui/Button.tsx` |
| **DEBT-003** | **CRMContext monolito (33KB).** Contexto unificado que agrega todos os domainios. Qualquer mudanca causa re-render em todos os consumers. | Performance, manutenibilidade | `context/CRMContext.tsx` |
| **DEBT-004** | **Componentes gigantes.** `FocusContextPanel.tsx` tem 109KB, `BoardCreationWizard.tsx` tem 75KB, `DealDetailModal.tsx` tem 87KB, `WebhooksSection.tsx` tem 55KB, `ContactsImportExportModal.tsx` tem 51KB, `CockpitDataPanel.tsx` tem 48KB. Estes precisam ser decompostos. | Manutenibilidade, performance, bundle | `features/inbox/components/`, `features/boards/components/` |

### Severidade ALTA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-002** | **Skeletons quase inexistentes.** Apenas charts tem skeleton. Paginas usam spinner generico. | Percepcao de velocidade ruim | Todas as paginas |
| **DEBT-005** | **Nenhum sistema de i18n.** Strings hardcoded em portugues em todos os componentes (400+ strings). Sem infraestrutura para internacionalizacao. | Impossivel traduzir sem refatoracao massiva | Todo o codebase |
| **DEBT-006** | **Controller hooks gigantes.** `useBoardsController.ts` (37KB), `useContactsController.ts` (30KB), `useInboxController.ts` (28KB), `useActivitiesController.ts` (19KB). Cada um centraliza toda a logica de uma feature. | Manutenibilidade, testabilidade | `features/*/hooks/` |
| **DEBT-007** | **Mistura de import paths.** Alguns imports usam `@/lib/utils` e outros `@/lib/utils/cn`. Nao ha barrel file consistente. | Confusao para devs | `lib/utils/` |
| **DEBT-008** | **Scrollbar styling com hex hardcoded.** Scrollbar custom usa `#cbd5e1`, `#94a3b8`, `#334155`, `#475569` em vez de tokens semanticos. | Inconsistencia com o sistema de tokens | `app/globals.css` (linhas 289-295, 434-458) |
| **DEBT-009** | **Chart colors com hex hardcoded.** Tokens de chart usam `#64748b`, `#0f172a`, `rgba(...)` em vez de OKLCH ou tokens semanticos. | Inconsistencia visual em temas | `app/globals.css` (linhas 149-154, 209-214) |

### Severidade MEDIA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-010** | **Font serif nao utilizada.** `--font-serif: 'Cinzel'` definida mas nao referenciada em nenhum componente. | Peso desnecessario se carregada | `app/globals.css` |
| **DEBT-011** | **Cores tailwind pre-v4 misturadas.** Uso de `text-slate-*`, `bg-slate-*`, `text-gray-*` diretamente em componentes (cores Tailwind padrao) ao lado de tokens semanticos customizados. | Duas fontes de verdade para cores | Multiplos componentes |
| **DEBT-012** | **PageLoader com cores hardcoded.** Usa `text-gray-500 dark:text-gray-400` em vez de tokens semanticos (`text-muted-foreground`). | Inconsistencia | `components/PageLoader.tsx` |
| **DEBT-013** | **ConfirmModal duplica estilo de modal.** Nao usa `modalStyles.ts` centralizado, tendo seus proprios estilos inline. | Deriva visual possivel | `components/ConfirmModal.tsx` |
| **DEBT-014** | **Sem optimistic updates em todas as mutations.** Apenas deal moves tem updates otimistas via helper generico. Contacts, activities, etc. fazem full refetch. | UX mais lenta em operacoes CRUD | `lib/query/hooks/` |
| **DEBT-015** | **ErrorBoundary usa inline styles.** `ErrorBoundary.tsx` usa `style={{ borderColor: 'var(--border)' }}` em vez de classes Tailwind com tokens. | Inconsistencia de padrao | `app/components/ui/ErrorBoundary.tsx` |
| **DEBT-016** | **GlobalError sem design system.** `app/global-error.tsx` usa HTML puro sem nenhum styling do design system. | Experiencia visual quebrada em erros globais | `app/global-error.tsx` |

### Severidade BAIXA

| ID | Descricao | Impacto | Localizacao |
|----|-----------|---------|-------------|
| **DEBT-017** | **SubmitButton em FormField.tsx e duplicado.** Componente FormField exporta `SubmitButton` com seus proprios `buttonVariants` que conflitam com os do `button.tsx`. | Confusao de naming | `components/ui/FormField.tsx` |
| **DEBT-018** | **Prefetch incompleto.** `prefetchRouteData()` so implementa dashboard e contacts. Outras rotas retornam `null`. | Prefetch parcial | `lib/query/index.tsx` |
| **DEBT-019** | **Ambient background glow hardcoded.** O efeito decorativo de glow no main content usa `bg-primary-500/10` e `bg-purple-500/10` hardcoded. | Nao adaptavel por tema | `components/Layout.tsx` |
| **DEBT-020** | **Nenhum teste e2e/visual.** Sem Playwright, Storybook, ou testes visuais. Apenas testes unitarios com vitest + @testing-library. | Regressoes visuais nao detectadas | Infraestrutura de testes |

---

## 11. Resumo e Recomendacoes

### 11.1 Pontos Fortes

1. **Design system bem fundamentado.** Tokens OKLCH, shadcn/ui, CVA, Radix UI primitivos.
2. **Acessibilidade acima da media.** Biblioteca dedicada (`lib/a11y/`), focus trap, skip link, ARIA attributes, axe-core.
3. **Dark mode completo.** Todas as cores semanticas tem variantes dark.
4. **Responsividade de primeira classe.** 3 patterns de navegacao, safe areas, viewport caps.
5. **State management moderno.** TanStack Query + Zustand + Context compostos.
6. **PWA support.** ServiceWorker, InstallBanner, manifest.
7. **Performance CSS.** content-visibility para listas longas.
8. **Error handling robusto.** Global error, ErrorBoundary, Query error handlers, Toast.
9. **Modal system consistente.** Tokens centralizados, sidebar-aware, FocusTrap.

### 11.2 Acoes Prioritarias

| Prioridade | Acao | Debts Resolvidos |
|-----------|------|-----------------|
| 1 | **Unificar Button component** - Merge das 2 versoes, manter variants unstyled | DEBT-001 |
| 2 | **Decompor componentes gigantes** - BoardCreationWizard, DealDetailModal, FocusContextPanel | DEBT-004 |
| 3 | **Implementar skeletons** - Criar skeletons para todas as paginas principais | DEBT-002 |
| 4 | **Migrar cores hardcoded para tokens** - Scrollbar, charts, PageLoader, backgrounds | DEBT-008, 009, 011, 012 |
| 5 | **Decompor CRMContext** - Usar hooks especificos, depreciar contexto unificado | DEBT-003 |
| 6 | **Decompor controller hooks** - Separar em hooks menores por responsabilidade | DEBT-006 |
| 7 | **Avaliar i18n** - Definir se internationalizacao e necessaria antes de crescer mais | DEBT-005 |

### 11.3 Arquitetura Target

```
Atual:                          Target:
components/ui/button.tsx    --> components/ui/button.tsx (UNICO, com unstyled)
app/components/ui/Button.tsx    (REMOVIDO)

CRMContext (33KB monolito)  --> hooks especificos (useDeals, useContacts, etc.)
                                CRMContext DEPRECATED

FocusContextPanel (109KB)   --> 5-8 sub-componentes focados
DealDetailModal (87KB)      --> tabs em componentes separados
BoardCreationWizard (75KB)  --> wizard steps em componentes separados

PageLoader (generico)       --> Page-specific skeletons
text-gray-500               --> text-muted-foreground (tokens)
#cbd5e1 (scrollbar)         --> var(--color-border) (tokens)
```

---

> **Gerado por:** @ux-design-expert (Uma) - Brownfield Discovery Phase 3
> **Proxima fase:** Phase 4 (Technical Debt Draft) - @architect
