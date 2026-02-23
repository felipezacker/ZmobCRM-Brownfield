# Frontend Specification - ZmobCRM

> **Fase:** Brownfield Discovery - Phase 3 (UX/Frontend)
> **Data:** 2026-02-23
> **Agente:** @ux-design-expert
> **Status:** Completo

---

## 1. Visao Geral da Arquitetura Frontend

### Stack Tecnologico

| Tecnologia | Versao | Proposito |
|------------|--------|-----------|
| Next.js | 15.5.x | Framework (App Router) |
| React | 19.2.1 | UI Library |
| TypeScript | 5.x | Tipagem estatica |
| Tailwind CSS | 4.x | Estilizacao |
| TanStack React Query | 5.90.x | Server state management |
| Zustand | 5.0.x | Client state management |
| Radix UI | Multiplos | Componentes primitivos acessiveis |
| Framer Motion | 12.x | Animacoes |
| Lucide React | 0.560 | Icones |
| Recharts | 3.5.x | Graficos |
| React Hook Form + Zod | 7.x / 4.x | Formularios e validacao |
| Supabase SSR | 0.8.x | Auth e banco de dados |
| AI SDK (Vercel) | 6.x | Integracao IA (Anthropic, OpenAI, Google) |

### Estrutura de Diretorios

```
app/                     # Next.js App Router (rotas e layouts)
  (protected)/           # Rotas autenticadas (layout com app shell)
  api/                   # API routes (Next.js Route Handlers)
  login/                 # Pagina de login (publica)
  install/               # Fluxo de instalacao
  join/                  # Convite de usuarios
components/              # Componentes reutilizaveis globais
  ui/                    # Componentes UI primitivos (Button, Modal, Card, etc.)
  navigation/            # Navegacao (BottomNav, NavigationRail, MoreMenu)
  ai/                    # Componentes de IA (UIChat, RSCChat)
  charts/                # Graficos (FunnelChart, RevenueTrend)
  pwa/                   # PWA (ServiceWorker, InstallBanner)
features/                # Feature modules (domain-driven)
  inbox/                 # Inbox de vendas
  boards/                # Boards/Kanban
  contacts/              # Gestao de contatos
  activities/            # Atividades e tarefas
  dashboard/             # Dashboard
  deals/                 # Cockpit de deals
  decisions/             # Fila de decisoes
  reports/               # Relatorios
  settings/              # Configuracoes
  ai-hub/                # Hub de IA
  profile/               # Perfil do usuario
context/                 # React Context providers
  AuthContext             # Autenticacao
  CRMContext              # Contexto unificado legado
  ThemeContext             # Tema (dark/light)
  ToastContext             # Notificacoes toast
  AIContext                # Estado de IA
  AIChatContext            # Chat de IA
  deals/                  # Sub-contexto de deals
  contacts/               # Sub-contexto de contatos
  activities/             # Sub-contexto de atividades
  boards/                 # Sub-contexto de boards
  settings/               # Sub-contexto de configuracoes
hooks/                   # Hooks globais reutilizaveis
lib/                     # Utilitarios e servicos
  a11y/                  # Acessibilidade (FocusTrap, SkipLink, LiveRegion)
  query/                 # TanStack Query config + hooks
  stores/                # Zustand stores
  supabase/              # Clientes e servicos Supabase
  ai/                    # Config e providers de IA
  utils/                 # Utilitarios gerais
types/                   # Definicoes de tipos TypeScript
```

---

## 2. Componentes UI

### 2.1 Componentes Primitivos (`components/ui/`)

| Componente | Base | Descricao |
|-----------|------|-----------|
| `Button` | CVA + Radix Slot | Variantes: default, destructive, outline, secondary, ghost, link. Tamanhos: default, sm, lg, icon |
| `Modal` | Custom + FocusTrap | Dialog acessivel com focus trap, escape, backdrop click. Tamanhos sm/md/lg/xl |
| `ConfirmModal` | Modal | Modal de confirmacao com acoes destrutivas |
| `Sheet` | Custom | Slide-in panel |
| `FullscreenSheet` | Custom | Sheet fullscreen mobile |
| `ActionSheet` | Custom | Menu de acoes mobile |
| `FormField` | Custom | Campo de formulario com label, erro, variantes |
| `Card` | Custom | Container de conteudo |
| `Badge` | Custom | Etiquetas/status |
| `Tabs` | Radix Tabs | Navegacao por abas |
| `Popover` | Radix Popover | Menu popup |
| `Tooltip` | Radix Tooltip | Dica contextual |
| `Avatar` | Radix Avatar | Foto/iniciais do usuario |
| `Alert` | Custom | Mensagens de alerta |
| `AudioPlayer` | Custom | Player de audio |
| `ContactSearchCombobox` | Custom | Combobox de busca de contatos |
| `CorretorSelect` | Custom | Select de corretor/responsavel |
| `LossReasonModal` | Modal | Modal especifico para motivo de perda |

### 2.2 Componentes de Feature (`features/`)

Cada feature segue padrao de organizacao:
```
features/{feature}/
  {Feature}Page.tsx           # Pagina principal
  components/                 # Componentes especificos
  hooks/                      # Hooks especificos
  utils/                      # Utilitarios
  types.ts                    # Tipos
```

Features identificadas: **inbox, boards, contacts, activities, dashboard, deals, decisions, reports, settings, ai-hub, profile**

### 2.3 Componentes de Navegacao

- **Desktop (>= 1280px):** Sidebar colapsavel (52px -> 80px) com icones + labels
- **Tablet (768px - 1279px):** NavigationRail (apenas icones)
- **Mobile (< 768px):** BottomNav fixa + MoreMenuSheet

---

## 3. Design System / Tokens

### 3.1 Sistema de Cores

**Abordagem:** CSS Custom Properties com OKLCH color space + Tailwind v4 `@theme`.

**Cores primarias:** Escala blue/sky (primary-50 a primary-900, base #0ea5e9)

**Cores semanticas (via CSS vars):**
- `--color-bg`, `--color-surface`, `--color-muted` - Fundos
- `--color-border`, `--color-border-subtle` - Bordas
- `--color-text-primary/secondary/muted/subtle` - Texto
- `--color-success/warning/error/info` - Status (com variantes hover, bg, text)
- `--glass-bg`, `--glass-border`, `--glass-blur` - Efeito glassmorphism

**Dark mode:** Classe `.dark` no `<html>` com override completo de todas as vars.

### 3.2 Tipografia

| Token | Fonte | Uso |
|-------|-------|-----|
| `--font-sans` | Inter | Corpo de texto principal |
| `--font-display` | Space Grotesk | Titulos, labels de navegacao |
| `--font-serif` | Cinzel | Decorativo (uso limitado) |

### 3.3 Efeitos Visuais

- **Glass effect:** Backdrop blur + transparencia (utility `glass`)
- **Dot background:** Padrao de pontos radial (utility `bg-dots`)
- **Ambient glow:** Gradientes blur como background decorativo
- **Scrollbar customizado:** WebKit scrollbar estilizado

### 3.4 Breakpoints

| Nome | Valor | Modo |
|------|-------|------|
| mobile | < 768px | BottomNav |
| tablet (md) | 768px - 1279px | NavigationRail |
| desktop (lg) | >= 1280px | Sidebar completa |

---

## 4. Padroes de Layout

### 4.1 App Shell

```
+--sidebar--+--header---------+--ai-panel--+
|            |                 |            |
|  Nav       |  Page Content   |  UIChat    |
|  Items     |                 |  (toggle)  |
|            |                 |            |
+------------+-----------------+------------+
```

- **Sidebar:** Colapsavel (13rem -> 5rem), com logo, nav items, user card
- **Header:** Fixa h-16, contendo botoes AI, debug, notificacoes, tema
- **AI Panel:** Sidebar direita w-96, toggle via botao no header
- **Main content:** `overflow-auto`, padding 1.5rem, padding-bottom adicional no mobile

### 4.2 Paginas Protegidas

Todas as rotas em `app/(protected)/` usam layout comum com:
- `QueryProvider` > `ToastProvider` > `ThemeProvider` > `AuthProvider` > `CRMProvider` > `AIProvider` > `Layout`
- Redirect automatico para `/login` se nao autenticado

### 4.3 Lazy Loading de Paginas

Todas as paginas de feature usam `React.lazy()` + `<Suspense>` com fallback `<PageLoader>`.

---

## 5. Fluxos de Usuario

### 5.1 Login
`/login` -> Auth Supabase (OAuth) -> `/auth/callback` -> redirect para `/inbox`

### 5.2 Inbox (Pagina Inicial)
- Overview com briefing diario (AI)
- Lista de itens priorizados por urgencia
- Acoes rapidas: ligar, agendar, enviar mensagem
- Toggle entre views: overview / lista / foco

### 5.3 Boards/Kanban
- Selector de board no topo
- Kanban horizontal com drag-and-drop
- DealCard com info de contato, valor, probabilidade, atividades
- Modais: criar deal, detalhe do deal, mover estagio, marcar ganho/perda

### 5.4 Contatos
- Tabs por lifecycle stage
- Lista com filtros, busca, paginacao
- Import/export CSV
- Formulario de criacao/edicao (modal)

### 5.5 Atividades
- Lista com filtros por tipo, status, periodo
- Calendario visual
- Formulario de atividade (modal)
- Bulk actions (completar, excluir)

### 5.6 Deal Cockpit
- Pagina dedicada por deal (`/deals/[dealId]/cockpit`)
- Informacoes completas, timeline, notas, arquivos
- Analise AI do deal

### 5.7 Decisoes
- Fila de decisoes automaticas (deals estagnados, atividades atrasadas)
- Cards com recomendacoes acionaveis

### 5.8 Dashboard
- Metricas: pipeline value, deals, win rate
- Graficos: funil, tendencia de receita
- Feed de atividades recentes

### 5.9 Configuracoes
- Secoes: IA, campos customizados, tags, lifecycle stages, produtos, webhooks, API keys, audit log
- RBAC para controle de acesso

---

## 6. Responsividade

### Implementacao

- Hook `useResponsiveMode()` com `window.innerWidth` + resize listener
- Breakpoints: mobile (<768), tablet (768-1279), desktop (>=1280)
- CSS var `--app-sidebar-width` e `--app-bottom-nav-height` para layout dinamic
- Safe area insets para dispositivos com notch (`env(safe-area-inset-*)`)
- `overflow-x: hidden` global para evitar scroll horizontal

### Adaptacoes por Modo

| Elemento | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Navegacao | BottomNav + MoreSheet | NavigationRail | Sidebar colapsavel |
| AI Panel | (nao visivel) | (nao visivel) | Sidebar direita toggle |
| Modais | Fullscreen | Centered | Centered |
| Tabelas | Scroll horizontal | Adaptadas | Completas |

---

## 7. Acessibilidade (a11y)

### Implementacoes Existentes

**Infraestrutura dedicada (`lib/a11y/`):**
- `SkipLink` - Link "pular para conteudo" para navegacao por teclado
- `FocusTrap` - Armadilha de foco para modais/dialogs (usa `focus-trap-react`)
- `LiveRegion` - Regiao ARIA live para anuncios de screen reader
- `VisuallyHidden` - Texto visivel apenas para leitores de tela
- `useFocusReturn` - Retorna foco ao elemento trigger ao fechar modal
- `useAnnounce` - Hook para anunciar mudancas via live region
- `useFormErrorFocus` - Foco automatico no primeiro campo com erro
- `useKeyboardShortcut` - Atalhos de teclado

**Nos componentes:**
- `aria-hidden="true"` em icones decorativos (Lucide) - **consistente**
- `aria-label` em botoes e regioes de navegacao - **presente na maioria**
- `aria-current="page"` na navegacao ativa - **implementado no BottomNav**
- `role="dialog"` + `aria-modal="true"` em modais - **implementado no Modal.tsx**
- `aria-labelledby` nos modais apontando para titulo
- Focus visible ring customizado (`.focus-visible-ring`)
- `prefers-reduced-motion: reduce` - Desabilita animacoes
- `prefers-contrast: more` - Aumenta outline de foco
- Toast com `role="alert"` (erros) e `role="status"` (demais)
- `aria-live="polite"` / `aria-live="assertive"` nos toasts

**Cobertura de aria-labels:** 217 ocorrencias em 58 arquivos.

### Testes de Acessibilidade
- `axe-core` e `vitest-axe` configurados
- Utilidades de teste em `lib/a11y/test/a11y-utils.ts`

---

## 8. Consistencia Visual

### Pontos Fortes

- Sistema de CSS vars semantico bem definido (light + dark)
- Utility classes customizadas (`glass`, `bg-dots`, `font-display`)
- Componente `Modal` centralizado com `modalStyles.ts` compartilhado
- Componente `Button` usando CVA (class-variance-authority) com variantes
- Icones consistentes via Lucide React
- `cn()` utility (clsx + tailwind-merge) para composicao de classes

### Pontos de Atencao

- Componente `Button` (CVA/shadcn) usa tokens como `bg-primary`, `text-primary-foreground` que **nao estao definidos** no CSS/tailwind config (apenas `primary-500`, `primary-600`, etc. estao definidos). Isso indica tokens orfaos do shadcn-ui que podem nao renderizar corretamente.
- Mistura de abordagens de estilizacao: classes Tailwind inline vs CSS vars vs hardcoded hex values

---

## 9. Gerenciamento de Estado

### Arquitetura Hibrida

```
                     +-------------------+
                     |   TanStack Query  |  Server State
                     |   (dados do DB)   |  staleTime: 5min
                     +-------------------+  gcTime: 30min
                              |
                     +-------------------+
                     |   React Context   |  Domain State (legado)
                     |   CRMContext       |  Compoe 5 sub-contexts
                     +-------------------+
                              |
                     +-------------------+
                     |     Zustand       |  Client State
                     |   UI/Form/Notif   |  Seletores finos
                     +-------------------+
```

### TanStack React Query
- **Configuracao:** staleTime 5min, gcTime 30min, retry 3x com backoff exponencial
- **Query keys centralizadas:** `lib/query/queryKeys.ts`
- **Hooks de entidade:** `useDealsQuery`, `useContactsQuery`, `useBoardsQuery`, `useActivitiesQuery`, `useAISuggestionsQuery`, `useMoveDeal`
- **Optimistic updates:** Hook `useOptimisticMutation` generico
- **Prefetch:** Na navegacao (hover/focus dos links)
- **Realtime sync:** `lib/realtime/useRealtimeSync.ts` com presets Supabase

### React Context (Legado)
- **CRMContext:** Mega-contexto que agrega 5 sub-contextos (Deals, Contacts, Activities, Boards, Settings)
- **Problema:** Interface enorme (~180 propriedades), re-renders em cascata
- **Sub-contextos individuais existem** mas CRMContext ainda e a interface principal

### Zustand Stores
- **useUIStore:** Sidebar, modais, busca global, loading states
- **useFormStore:** Rascunhos de formulario com persistencia (localStorage)
- **useNotificationStore:** Notificacoes com auto-dismiss
- Seletores de granulacao fina (`useSidebarOpen`, `useAIAssistantOpen`, etc.)

---

## 10. Estados de Erro e Loading

### Loading
- `<PageLoader>` - Spinner centralizado para carregamento de paginas
- Loading states por contexto (deals, contacts, activities, boards, settings)
- Loading states por chave no Zustand (`useUIStore.loadingStates`)
- Suspense boundaries em todas as paginas lazy-loaded

### Erro
- Error handler global no QueryCache e MutationCache
- Codigos de erro centralizados (`lib/validations/errorCodes.ts`)
- Notificacao automatica via `useNotificationStore` em erros de query/mutation
- Tratamento de network error, timeout, 401, 404

### Toast/Feedback
- `ToastContext` com auto-dismiss (3s)
- `useNotificationStore` (Zustand) com auto-dismiss (5s, configuravel)
- **Duplicacao:** Dois sistemas de notificacao coexistem (Toast Context + Notification Store)

---

## 11. Performance

### Otimizacoes Implementadas

- **Package imports otimizados:** `optimizePackageImports` para lucide-react, recharts, date-fns
- **Lazy loading de paginas:** Todas as feature pages via `React.lazy()` + Suspense
- **Prefetch de rotas:** `lib/prefetch.ts` com prefetch em hover/focus de links de navegacao
- **Content-visibility:** Classes CSS `.cv-auto` para listas longas (skip layout/paint off-viewport)
- **TanStack Query cache:** staleTime 5min evita refetches desnecessarios
- **Optimistic updates:** UX instantanea com rollback em caso de erro
- **PWA:** Service Worker registrado, manifest configurado
- **Turbopack:** Habilitado para dev

### Pontos de Atencao

- **CRMContext monolitico:** Re-renders em cascata quando qualquer sub-estado muda
- **Debug logging em producao:** Multiplos `fetch` para endpoint `127.0.0.1:7242` em CRMContext e layout (embora condicionados a `NODE_ENV !== 'production'`)
- **Sem image optimization significativa:** next/image usado minimamente (apenas avatar)

---

## 12. Debitos Tecnicos de Frontend

### DEB-FE-001: Componentes Duplicados (ALTA)

**Descricao:** Existem versoes V1 e V2 de componentes criticos sem deprecacao clara:
- `ActivityFormModal.tsx` + `ActivityFormModalV2.tsx`
- `CreateDealModal.tsx` + `CreateDealModalV2.tsx`
- `ContactFormModal.tsx` + `ContactFormModalV2.tsx`
- `DealCockpitClient.tsx` + `DealCockpitFocusClient.tsx`

**Impacto:** Confusao sobre qual usar, manutencao duplicada, inconsistencia de UX.
**Recomendacao:** Consolidar em versao unica, remover duplicatas.

### DEB-FE-002: CRMContext Monolitico (ALTA)

**Descricao:** `CRMContext` com ~180 propriedades agrega 5 sub-contextos. Qualquer mudanca causa re-render em todos os consumidores.
**Impacto:** Performance degradada em telas com muitos componentes.
**Recomendacao:** Migrar consumidores para hooks especificos (`useDeals`, `useContacts`, etc.) e deprecar CRMContext.

### DEB-FE-003: Dois Sistemas de Notificacao (MEDIA)

**Descricao:** `ToastContext` (React Context, 3s) e `useNotificationStore` (Zustand, 5s) coexistem com funcionalidades sobrepostas.
**Impacto:** Inconsistencia na experiencia de notificacoes, confusao para devs.
**Recomendacao:** Unificar em um unico sistema (preferencialmente Zustand store).

### DEB-FE-004: Tokens de Button Orfaos (MEDIA)

**Descricao:** Componente `Button` (shadcn) referencia tokens como `bg-primary`, `text-primary-foreground`, `bg-destructive` que nao estao definidos no tailwind.config.js nem no globals.css. Apenas `primary-50` a `primary-900` existem.
**Impacto:** Botoes podem nao renderizar cores corretas; dependencia de defaults do Tailwind.
**Recomendacao:** Definir tokens semanticos completos ou migrar Button para usar tokens existentes.

### DEB-FE-005: Debug Logging Excessivo (MEDIA)

**Descricao:** `CRMContext` e `ProtectedLayout` contem multiplas chamadas `fetch` para `http://127.0.0.1:7242/ingest/...` com dados de debug. Condicionadas a `NODE_ENV !== 'production'` mas poluem o codigo.
**Impacto:** Codigo dificil de ler, requests desnecessarios em dev.
**Recomendacao:** Extrair para modulo de telemetria dedicado ou remover apos debug.

### DEB-FE-006: AI Panel Nao Responsivo (MEDIA)

**Descricao:** O painel de IA (UIChat sidebar) so aparece em desktop (w-96 fixa). Nao ha alternativa mobile/tablet.
**Impacto:** Funcionalidade de IA inacessivel em dispositivos moveis.
**Recomendacao:** Implementar como FullscreenSheet ou modal em mobile.

### DEB-FE-007: Ausencia de Error Boundaries (MEDIA)

**Descricao:** Nao foram encontrados componentes `ErrorBoundary` para captura de erros de renderizacao.
**Impacto:** Erros de runtime podem crashar toda a aplicacao sem feedback ao usuario.
**Recomendacao:** Adicionar ErrorBoundary por feature/rota com fallback UI.

### DEB-FE-008: Design System Informal (BAIXA)

**Descricao:** Nao existe documentacao de design system, storybook ou catalogo de componentes. Os tokens estao espalhados entre `tailwind.config.js`, `globals.css` (@theme) e inline styles.
**Impacto:** Inconsistencias visuais ao longo do tempo, dificuldade de onboarding.
**Recomendacao:** Consolidar tokens, criar documentacao visual (Storybook ou similar).

### DEB-FE-009: Hydration Safety com useState Fixo (BAIXA)

**Descricao:** `useResponsiveMode` inicializa com `useState(1024)` (desktop) para evitar hydration mismatch, depois atualiza no mount. Causa flash de layout em mobile.
**Impacto:** Flash visual em primeiro render no mobile.
**Recomendacao:** Considerar `useSyncExternalStore` ou cookie/header-based detection.

### DEB-FE-010: PWA Incompleto (BAIXA)

**Descricao:** Service Worker e InstallBanner implementados, mas nao ha estrategia de cache offline, sync em background, ou push notifications.
**Impacto:** PWA funcional mas basico.
**Recomendacao:** Definir estrategia de offline-first se necessario para o produto.

---

## 13. Resumo de Metricas

| Metrica | Valor |
|---------|-------|
| Rotas protegidas | 17 |
| API routes | 40+ |
| Componentes UI primitivos | 17 |
| Feature modules | 11 |
| React Contexts | 7 (+ 5 sub-contexts) |
| Zustand Stores | 3 |
| Hooks globais | 11 |
| Hooks de feature | 10+ |
| Ocorrencias a11y (aria) | 217 em 58 arquivos |
| Componentes duplicados (V1/V2) | 4 pares |
| Debitos identificados | 10 |

---

## 14. Recomendacoes Prioritarias

1. **Consolidar componentes duplicados (V1/V2)** - Eliminar confusao e manutencao duplicada
2. **Migrar de CRMContext para hooks especificos** - Performance e manutenibilidade
3. **Unificar sistema de notificacoes** - Consistencia UX
4. **Adicionar Error Boundaries** - Resiliencia da aplicacao
5. **Corrigir tokens de Button** - Garantir renderizacao correta
6. **Tornar AI Panel responsivo** - Funcionalidade em todos os dispositivos
7. **Limpar debug logging** - Legibilidade do codigo
8. **Criar documentacao de design system** - Onboarding e consistencia

---

*Documento gerado por @ux-design-expert como parte da Brownfield Discovery Phase 3.*
