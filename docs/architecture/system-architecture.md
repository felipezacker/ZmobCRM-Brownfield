# Arquitetura do Sistema - ZmobCRM (Brownfield Discovery Phase 1)

**Data:** 2026-03-03
**Agente:** @architect (Aria)
**Fase:** Brownfield Discovery - Phase 1 (Revisao Completa)
**Status:** Completo
**Versao do Projeto:** 1.4.3

---

## 1. Visao Geral

O ZmobCRM e um CRM de vendas SaaS com foco no mercado imobiliario brasileiro. Construido como uma Single-Page Application sobre Next.js 15 (App Router) com Supabase como backend completo (auth, PostgreSQL, RLS, Realtime). Possui agente conversacional de IA com multi-provider, API publica RESTful versionada, e suporte PWA para uso mobile. O sistema opera como single-tenant por instancia (cada organizacao tem sua propria instalacao).

### 1.1 Proposito

CRM inteligente para gestao de vendas imobiliarias com:
- Kanban boards configuravies para pipelines de vendas
- Cockpit detalhado de contatos e negocios
- Agente de IA conversacional com 25+ ferramentas de CRM
- API publica RESTful para integracoes externas
- Suporte offline-first via PWA

### 1.2 Numeros-Chave

| Metrica | Valor |
|---------|-------|
| Linhas de codigo (TS/TSX) | ~93.759 |
| Arquivos fonte (TS/TSX) | 438 |
| Arquivos de teste | 51 (~11.6% cobertura de arquivos) |
| Paginas (App Router) | 29 |
| API Routes | 69 |
| Migrations Supabase | 44 |
| React Contexts | 11 |
| Zustand Stores | 3 |
| Feature Modules | 13 |

---

## 2. Stack Tecnologico

### 2.1 Framework & Runtime

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Next.js | ^15.5.12 | Framework fullstack (App Router, RSC, Route Handlers, Turbopack) |
| React | 19.2.1 (fixo) | Biblioteca de UI (React 19 estavel) |
| React DOM | 19.2.1 (fixo) | Renderizacao DOM |
| TypeScript | ^5 | Tipagem estatica |
| Node.js | 20 (CI) | Runtime server-side |
| ESM | `"type": "module"` | Modulos nativos ES |

### 2.2 Frontend - UI & Estilizacao

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Tailwind CSS | ^4 | Estilizacao utility-first (v4 com `@theme` em CSS) |
| Radix UI | v1-v2 (13 pacotes) | Componentes headless acessiveis (accordion, avatar, checkbox, dialog, dropdown-menu, label, popover, scroll-area, select, separator, slider, slot, switch, tabs, tooltip) |
| Lucide React | ^0.560.0 | Icones (1500+ icones, tree-shaken via `optimizePackageImports`) |
| Framer Motion | ^12.23.26 | Animacoes e transicoes |
| Recharts | ^3.5.1 | Graficos e dashboards |
| class-variance-authority | ^0.7.1 | Variantes de componentes CSS |
| clsx | ^2.1.1 | Composicao condicional de classes |
| tailwind-merge | ^3.4.0 | Merge inteligente de classes Tailwind |
| focus-trap-react | ^11.0.4 | Trap de foco em modais (acessibilidade) |

### 2.3 Formularios & Validacao

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| React Hook Form | ^7.68.0 | Gerenciamento de formularios |
| @hookform/resolvers | ^5.2.2 | Integracao RHF + Zod |
| Zod | ^4.1.13 | Validacao de schemas (nota: v4, nao v3) |
| libphonenumber-js | ^1.12.33 | Validacao e formatacao de telefones |

### 2.4 Estado & Data Fetching

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Zustand | ^5.0.9 | Stores globais (UI, Forms, Notifications) com devtools, persist, subscribeWithSelector |
| TanStack React Query | ^5.90.12 | Cache de dados servidor, fetching, mutations, invalidacao |
| Immer | ^11.0.1 | Atualizacoes imutaveis de estado |
| React Context | nativo | Contextos de dominio (Auth, CRM, AI, Theme, Toast) |

### 2.5 Backend / BaaS

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| @supabase/supabase-js | ^2.87.1 | Cliente Supabase (auth, DB, realtime, storage) |
| @supabase/ssr | ^0.8.0 | Integracao SSR (cookies, middleware, Server Components) |
| PostgreSQL (Supabase) | via Supabase | Banco de dados com RLS, triggers, RPCs |
| pg | ^8.16.3 | Driver PostgreSQL direto (usado pelo installer e AI tools) |
| server-only | ^0.0.1 | Guardrail para modulos exclusivamente server-side |

### 2.6 Inteligencia Artificial

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| ai (Vercel AI SDK) | ^6.0.72 | Framework de agentes IA (tool calling, streaming) |
| @ai-sdk/anthropic | ^3.0.37 | Provider Anthropic Claude |
| @ai-sdk/google | ^3.0.21 | Provider Google Gemini |
| @ai-sdk/openai | ^3.0.25 | Provider OpenAI |
| @ai-sdk/react | ^3.0.74 | Hooks React para chat UI (useChat) |

### 2.7 Utilidades

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| date-fns | ^4.1.0 | Manipulacao de datas |
| jsPDF | ^4.1.0 | Geracao de PDF |
| jspdf-autotable | ^5.0.2 | Tabelas em PDF |
| react-markdown | ^10.1.0 | Renderizacao de Markdown |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown |

### 2.8 Monitoring & Error Tracking

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| @sentry/nextjs | ^10.39.0 | Error tracking e performance monitoring |

Sentry esta integrado com:
- `sentry.client.config.ts` - Client-side com Replay (10% session, 100% on error)
- `sentry.server.config.ts` - Server-side
- `sentry.edge.config.ts` - Edge runtime
- `app/global-error.tsx` - Error boundary global que captura via `Sentry.captureException`
- Condicionalmente habilitado: so inicializa se `NEXT_PUBLIC_SENTRY_DSN` estiver definido

### 2.9 Dev / Build / Testes

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Vitest | ^4.0.0 | Runner de testes |
| @vitejs/plugin-react | ^5.0.4 | Plugin React para Vite/Vitest |
| Vite | ^7.1.3 | Build engine (usado pelo Vitest) |
| @testing-library/react | ^16.3.0 | Testes de componentes React |
| @testing-library/jest-dom | ^6.8.0 | Matchers DOM customizados |
| @testing-library/user-event | ^14.6.1 | Simulacao de eventos de usuario |
| @vitest/coverage-v8 | ^4.0.18 | Cobertura de codigo |
| axe-core | ^4.10.3 | Testes de acessibilidade automatizados |
| vitest-axe | ^0.1.0 | Integracao axe + Vitest |
| happy-dom | ^20.0.11 | Ambiente DOM leve para testes |
| @faker-js/faker | ^10.1.0 | Geracao de dados fake (devDependency) |
| ESLint | ^9 | Linting (flat config) |
| eslint-config-next | ^15.5.12 | Regras ESLint para Next.js |

### 2.10 CI/CD & Deploy

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| GitHub Actions | - | CI (lint, typecheck, test, build) |
| Vercel | - | Deploy (preview + production) |
| Supabase CLI | - | Migrations e gerenciamento de banco |

---

## 3. Estrutura de Pastas

```
ZmobCRM-Brownfield/                  # Raiz do projeto Next.js
|
|-- app/                             # Next.js App Router (pages + API)
|   |-- (protected)/                 # Route group: todas as rotas autenticadas
|   |   |-- layout.tsx               # Client-side layout com Providers
|   |   |-- providers.tsx            # Composicao de providers (composeProviders)
|   |   |-- page.tsx                 # Pagina raiz protegida (redirect para dashboard)
|   |   |-- dashboard/page.tsx       # Dashboard principal
|   |   |-- boards/                  # Kanban boards (page + loading)
|   |   |-- contacts/                # Contatos (page + loading + duplicates/ + metrics/)
|   |   |-- deals/[dealId]/cockpit/  # Cockpit de deal
|   |   |-- inbox/                   # Inbox de vendas (page + loading)
|   |   |-- activities/page.tsx      # Atividades
|   |   |-- notifications/page.tsx   # Central de notificacoes
|   |   |-- instructions/page.tsx    # Instrucoes configuravies
|   |   |-- ai/page.tsx              # Chat IA standalone
|   |   |-- ai-test/page.tsx         # Teste de IA (dev only)
|   |   |-- decisions/page.tsx       # Decisoes
|   |   |-- pipeline/page.tsx        # Pipeline view
|   |   |-- reports/page.tsx         # Relatorios
|   |   |-- profile/page.tsx         # Perfil do usuario
|   |   |-- settings/               # Configuracoes (geral, produtos, integracoes, AI)
|   |   |-- setup/page.tsx          # Setup inicial pos-instalacao
|   |   |-- labs/                   # Features experimentais (mock cockpits)
|   |
|   |-- api/                        # Route Handlers (69 endpoints)
|   |   |-- admin/                  # Endpoints administrativos
|   |   |   |-- backfill-scores/    # Backfill de lead scores
|   |   |   |-- invites/            # Gerenciamento de convites
|   |   |   |-- users/              # Gerenciamento de usuarios
|   |   |-- ai/                     # Endpoints de IA
|   |   |   |-- chat/               # Chat principal (streaming)
|   |   |   |-- actions/            # Acoes de IA (tool calling)
|   |   |   |-- tasks/              # Tasks pre-configuradas
|   |   |   |   |-- boards/         # Gerar estrategia, estrutura, refinar
|   |   |   |   |-- deals/          # Analisar, email draft, objecoes
|   |   |   |   |-- inbox/          # Daily briefing, sales script
|   |   |   |-- test/               # Teste de IA (dev only)
|   |   |-- boards/                 # CRUD de boards
|   |   |-- chat/                   # Re-export de /api/ai/chat
|   |   |-- contacts/               # Import/export de contatos
|   |   |-- custom-fields/          # Campos customizados
|   |   |-- installer/              # Wizard de instalacao (13 endpoints)
|   |   |-- invites/                # Aceitar/validar convites
|   |   |-- mcp/                    # MCP endpoint
|   |   |-- settings/               # Settings API (AI, cockpit, prompts)
|   |   |-- setup-instance/         # Setup da instancia
|   |   |-- public/v1/              # API publica versionada (REST)
|   |       |-- contacts/           # CRUD contatos
|   |       |-- deals/              # CRUD deals + mark-won/lost + move-stage
|   |       |-- boards/             # Boards + stages
|   |       |-- activities/         # Atividades
|   |       |-- companies/          # Empresas
|   |       |-- me/                 # Perfil autenticado
|   |       |-- docs/               # Documentacao da API
|   |       |-- openapi.json/       # Spec OpenAPI auto-gerada
|   |
|   |-- auth/                       # Callback OAuth Supabase
|   |-- install/                    # Wizard de instalacao
|   |-- join/                       # Convite para organizacao
|   |-- login/                      # Pagina de login
|   |-- components/                 # Componentes locais do app
|   |   |-- ui/ErrorBoundary.tsx    # Error boundary reutilizavel
|   |-- actions/                    # Server Actions (contacts, deals, notifications, contact-metrics)
|   |-- layout.tsx                  # Root layout (html, body, fonts, PWA)
|   |-- globals.css                 # CSS global + Tailwind v4 @theme
|   |-- manifest.ts                 # PWA manifest
|   |-- global-error.tsx            # Global error handler (Sentry)
|
|-- components/                     # Componentes compartilhados
|   |-- ui/                         # Design system (23 componentes)
|   |   |-- ActionSheet.tsx         # Sheet de acoes mobile
|   |   |-- alert.tsx               # Alert
|   |   |-- AudioPlayer.tsx         # Player de audio
|   |   |-- avatar.tsx              # Avatar
|   |   |-- badge.tsx               # Badge
|   |   |-- button.tsx              # Button (base do design system)
|   |   |-- card.tsx                # Card
|   |   |-- ContactSearchCombobox   # Combobox de busca de contatos
|   |   |-- CorretorSelect          # Select de corretor
|   |   |-- date-range-picker.tsx   # Date range picker
|   |   |-- DealSearchCombobox      # Combobox de busca de deals
|   |   |-- EmptyState.tsx          # Estado vazio
|   |   |-- FormField.tsx           # Campo de formulario generico
|   |   |-- FullscreenSheet.tsx     # Sheet fullscreen mobile
|   |   |-- LossReasonModal.tsx     # Modal de motivo de perda
|   |   |-- Modal.tsx               # Modal base
|   |   |-- modalStyles.ts          # Estilos de modal compartilhados
|   |   |-- popover.tsx             # Popover (Radix)
|   |   |-- Sheet.tsx               # Sheet (bottom sheet mobile)
|   |   |-- tabs.tsx                # Tabs (Radix)
|   |   |-- tooltip.tsx             # Tooltip (Radix)
|   |-- ai/                         # Componentes de chat IA (UIChat, RSCChat)
|   |-- navigation/                 # Navegacao
|   |   |-- BottomNav.tsx           # Barra inferior mobile
|   |   |-- NavigationRail.tsx      # Rail lateral desktop
|   |   |-- MoreMenuSheet.tsx       # Menu "mais" mobile
|   |   |-- navConfig.ts            # Configuracao de navegacao
|   |-- charts/                     # Componentes de graficos
|   |-- notifications/              # Popover de notificacoes
|   |-- pwa/                        # Service Worker + Install Banner
|   |-- filters/                    # Filtros (PeriodFilterSelect)
|   |-- debug/                      # Componentes de debug
|   |-- Layout.tsx                  # Shell principal (sidebar + header + content)
|   |-- AIAssistant.tsx             # Assistente IA flutuante
|   |-- ConfirmModal.tsx            # Modal de confirmacao
|   |-- ConsentModal.tsx            # Modal LGPD/consent
|   |-- OnboardingModal.tsx         # Onboarding
|   |-- PageLoader.tsx              # Loader de pagina
|   |-- MaintenanceBanner.tsx       # Banner de manutencao
|
|-- features/                       # Feature modules (dominio)
|   |-- activities/                 # Feature atividades (components/, hooks/)
|   |-- ai-hub/                     # Hub de IA
|   |-- boards/                     # Feature boards/kanban
|   |   |-- BoardsPage.tsx          # Pagina principal
|   |   |-- components/
|   |   |   |-- BoardCreationWizard.tsx  # Wizard de criacao (75KB - maior arquivo)
|   |   |   |-- PipelineView.tsx    # Vista de pipeline
|   |   |   |-- Kanban/             # KanbanBoard, KanbanList, DealCard, KanbanHeader
|   |   |   |-- Modals/             # DealDetailModal, etc.
|   |   |-- hooks/                  # Hooks especificos de boards
|   |-- contacts/                   # Feature contatos
|   |   |-- ContactsPage.tsx        # Pagina principal
|   |   |-- cockpit/                # Cockpit de contato (DataPanel, RightRail, Timeline, PipelineBar)
|   |   |-- components/             # ContactFormModal, ContactDetailModal, ContactMergeModal, etc.
|   |-- dashboard/                  # Feature dashboard
|   |-- deals/                      # Feature deals
|   |   |-- cockpit/                # Cockpit de deal
|   |-- decisions/                  # Feature decisoes
|   |-- inbox/                      # Feature inbox
|   |-- instructions/               # Feature instrucoes
|   |-- notifications/              # Feature notificacoes
|   |-- profile/                    # Feature perfil
|   |-- reports/                    # Feature relatorios
|   |-- settings/                   # Feature configuracoes
|
|-- context/                        # React Contexts (11 contextos)
|   |-- AuthContext.tsx              # Autenticacao Supabase (session, user, profile)
|   |-- CRMContext.tsx               # Contexto unificado LEGADO (agrega todos os sub-contextos)
|   |-- AIContext.tsx                # Estado do AI assistant
|   |-- AIChatContext.tsx            # Estado do chat IA
|   |-- ThemeContext.tsx             # Tema dark/light
|   |-- ToastContext.tsx             # Sistema de toasts
|   |-- index.ts                    # Re-exports
|   |-- deals/DealsContext.tsx       # Contexto de deals
|   |-- contacts/ContactsContext.tsx # Contexto de contatos
|   |-- boards/BoardsContext.tsx     # Contexto de boards
|   |-- activities/ActivitiesContext.tsx  # Contexto de atividades
|   |-- settings/SettingsContext.tsx  # Contexto de configuracoes + AI config
|
|-- hooks/                          # Hooks compartilhados (12 hooks)
|   |-- useCRMActions.ts            # Acoes CRM unificadas
|   |-- useAIEnabled.ts             # Toggle AI habilitado
|   |-- useConsent.ts               # LGPD consent
|   |-- useFirstVisit.ts            # Primeira visita
|   |-- useIdleTimeout.ts           # Timeout de inatividade
|   |-- useOrganizationMembers.ts   # Membros da organizacao
|   |-- usePersistedState.ts        # Estado persistido em localStorage
|   |-- useReassignContactWithDeals.ts  # Reatribuicao de contato
|   |-- useResponsiveMode.ts        # Mobile/desktop detection
|   |-- useSpeechRecognition.ts     # Reconhecimento de voz
|   |-- useSystemNotifications.ts   # Notificacoes do sistema
|   |-- useTags.ts                  # Gerenciamento de tags
|
|-- lib/                            # Bibliotecas e utilidades
|   |-- supabase/                   # Clientes Supabase (25 arquivos de servico)
|   |   |-- client.ts               # Singleton browser (createBrowserClient)
|   |   |-- server.ts               # Server client + admin client + static admin
|   |   |-- middleware.ts            # Middleware de sessao
|   |   |-- index.ts                # Re-exports de servicos
|   |   |-- boards.ts               # Servico de boards (924 linhas)
|   |   |-- contacts.ts             # Servico de contatos (814 linhas)
|   |   |-- deals.ts                # Servico de deals (757 linhas)
|   |   |-- activities.ts           # Servico de atividades
|   |   |-- settings.ts             # Servico de configuracoes
|   |   |-- products.ts             # Servico de produtos
|   |   |-- notifications.ts        # Servico de notificacoes
|   |   |-- contact-dedup.ts        # Deduplicacao de contatos
|   |   |-- contact-metrics.ts      # Metricas de contatos
|   |   |-- contact-preferences.ts  # Preferencias de contato
|   |   |-- lead-scoring.ts         # Lead scoring
|   |   |-- dealNotes.ts            # Notas de deals
|   |   |-- dealFiles.ts            # Arquivos de deals
|   |   |-- consent.ts / consents.ts  # LGPD consent
|   |   |-- ai-proxy.ts             # Proxy de IA
|   |   |-- aiSuggestions.ts        # Sugestoes de IA
|   |   |-- quickScripts.ts         # Scripts rapidos
|   |   |-- utils.ts                # Utilidades Supabase
|   |   |-- staticAdminClient.ts    # Admin client sem cookies
|   |-- ai/                         # Inteligencia Artificial
|   |   |-- config.ts               # Configuracao de providers IA
|   |   |-- defaults.ts             # Defaults de IA
|   |   |-- crmAgent.ts             # Agente CRM principal (24KB)
|   |   |-- tools.ts                # Definicoes de tools
|   |   |-- actionsClient.ts        # Client de acoes IA
|   |   |-- tasksClient.ts          # Client de tasks IA
|   |   |-- provider.ts             # Provider factory
|   |   |-- actions.tsx              # Server actions de IA
|   |   |-- prompts/                # Prompts do agente
|   |   |-- tools/                  # Tools individuais
|   |   |-- tasks/                  # Tasks pre-configuradas
|   |   |-- features/               # Feature flags IA
|   |-- auth/roles.ts               # Autorizacao baseada em roles (admin, diretor, corretor)
|   |-- security/sameOrigin.ts      # Verificacao de same-origin
|   |-- public-api/                 # Logica da API publica
|   |   |-- openapi.ts              # Spec OpenAPI (27KB)
|   |   |-- auth.ts                 # Autenticacao da API publica
|   |   |-- cursor.ts               # Paginacao cursor-based
|   |   |-- sanitize.ts             # Sanitizacao de input
|   |   |-- resolve.ts              # Resolucao de entidades
|   |   |-- dealsMoveStage.ts       # Logica de mover deal entre estagios
|   |-- realtime/                   # Supabase Realtime
|   |   |-- useRealtimeSync.ts      # Hook principal (27KB) com deduplicacao global
|   |   |-- presets.ts              # Presets de tabelas monitoradas
|   |-- stores/index.ts             # Zustand stores (UIState, FormState, NotificationState)
|   |-- query/                      # TanStack React Query
|   |   |-- index.tsx               # Provider + QueryClient config
|   |   |-- queryKeys.ts            # Query keys centralizadas
|   |   |-- createQueryKeys.ts      # Factory de query keys
|   |   |-- hooks/                  # Hooks de query
|   |       |-- useDealsQuery.ts    # Deals query + mutations (24KB)
|   |       |-- useContactsQuery.ts # Contacts query + mutations (21KB)
|   |       |-- useMoveDeal.ts      # Move deal entre estagios (12KB)
|   |       |-- useBoardsQuery.ts   # Boards query
|   |       |-- useActivitiesQuery.ts  # Activities query
|   |       |-- useAISuggestionsQuery.ts  # AI suggestions query
|   |-- validations/                # Schemas Zod
|   |   |-- schemas.ts              # Schemas de validacao
|   |   |-- cpf-cep.ts              # Validacao CPF/CEP brasileiro
|   |   |-- errorCodes.ts           # Codigos de erro centralizados
|   |-- a11y/                       # Acessibilidade
|   |   |-- index.ts                # API principal de a11y
|   |   |-- overlay.ts              # Overlay de acessibilidade
|   |   |-- components/             # Componentes a11y
|   |   |-- hooks/                  # Hooks a11y
|   |   |-- test/                   # Utilidades de teste a11y
|   |-- fetch/safeFetch.ts          # Fetch wrapper com tratamento de erros
|   |-- installer/                  # Logica de instalacao (Supabase, Vercel, migrations)
|   |-- mcp/                        # MCP integration (registry, tool catalog, zodToJsonSchema)
|   |-- utils/                      # Utilidades gerais
|   |   |-- cn.ts                   # Class name utility (clsx + tailwind-merge)
|   |   |-- csv.ts                  # Import/export CSV
|   |   |-- errorUtils.ts           # Utilidades de erro
|   |   |-- activitySort.ts         # Ordenacao de atividades
|   |   |-- migrateLocalStorage.ts  # Migracao de localStorage
|   |   |-- priority.ts             # Logica de prioridade
|   |   |-- responsive.ts           # Breakpoints responsivos
|   |   |-- slugify.ts              # Slugificacao de strings
|   |   |-- isMobile.ts             # Deteccao mobile
|   |-- phone.ts                    # Formatacao de telefone (libphonenumber-js)
|   |-- prefetch.ts                 # Prefetch de dados
|   |-- rate-limit.ts               # Rate limiting (token bucket)
|
|-- types/                          # Tipos TypeScript centrais
|   |-- types.ts                    # Tipos do CRM (Deal, Contact, Board, Activity, etc.)
|   |-- ai.ts                       # Tipos de IA (AITool, AIConfig, etc.)
|   |-- aiActions.ts                # Tipos de acoes IA
|   |-- index.ts                    # Re-exports
|
|-- supabase/                       # Supabase local
|   |-- config.toml                 # Configuracao do Supabase CLI
|   |-- migrations/ (44 arquivos)   # Migrations SQL
|   |-- functions/                  # Edge Functions (diretorio presente)
|   |-- backups/                    # Backups do banco
|   |-- reset.sql                   # Script de reset
|
|-- test/                           # Testes
|   |-- helpers/                    # Fixtures, env, harness, admin client
|   |-- stories/                    # Testes de user stories
|   |-- setup.ts                    # Setup base
|   |-- setup.dom.ts                # Setup DOM (happy-dom)
|
|-- public/                         # Assets estaticos
|   |-- icons/                      # Icones PWA
|   |-- sw.js                       # Service Worker
|
|-- .github/workflows/              # CI/CD
|   |-- ci.yml                      # Pipeline CI (lint, typecheck, test, build)
|   |-- pr-automation.yml           # Automacao de PRs
|   |-- release.yml                 # Release automation
```

---

## 4. Padroes Arquiteturais

### 4.1 Arquitetura de Componentes

**Padrao Feature-based:** Cada dominio (boards, contacts, deals, inbox, settings, etc.) tem pasta propria em `features/` contendo:
- Componente de pagina principal (ex: `BoardsPage.tsx`, `ContactsPage.tsx`)
- Subpasta `components/` com componentes especificos
- Subpasta `hooks/` com hooks especificos
- Subpasta `cockpit/` para views detalhadas (quando aplicavel)
- Arquivo `utils.ts` ou `constants.ts` (quando necessario)

**Client vs Server Components:**
- O route group `(protected)` usa `'use client'` no layout, forcando todas as sub-paginas a serem client components
- Paginas publicas (`login`, `join`, `install`) nao usam o protected layout
- Server Actions existem em `app/actions/` (contacts, deals, notifications, contact-metrics) mas sao usadas de forma limitada
- A maior parte da comunicacao server-side usa Route Handlers (`app/api/`)

**Composicao de Providers:** O arquivo `app/(protected)/providers.tsx` usa o padrao `composeProviders()` para empilhar 10 providers de forma declarativa:
```
QueryProvider > ToastProvider > ThemeProvider > AuthProvider > SettingsProvider >
BoardsProvider > ContactsProvider > ActivitiesProvider > DealsProvider > AIProvider
```

### 4.2 Gerenciamento de Estado (3 Camadas)

| Camada | Tecnologia | Proposito | Arquivos |
|--------|-----------|-----------|----------|
| **Server State** | TanStack React Query | Cache de dados do Supabase, invalidacao, mutations, optimistic updates | `lib/query/` |
| **Domain State** | React Context | Estado de dominio (Deals, Contacts, Boards, Activities, Settings, Auth, AI) | `context/` |
| **UI State** | Zustand | Estado efemero de UI (sidebar, modais, busca, loading) | `lib/stores/` |

**CRMContext (Legacy):** O arquivo `context/CRMContext.tsx` (~930 linhas) atua como camada de compatibilidade que:
- Agrega todos os sub-contextos especializados
- Expoe uma API unificada `useCRM()` para codigo legado
- Contem logica de negocio complexa (addDeal com optimistic updates, checkWalletHealth, checkStagnantDeals)
- Projeta views denormalizadas (DealView com contactName, stageLabel)
- Novos desenvolvimentos devem usar hooks especificos diretamente (`useDeals()`, `useContacts()`, etc.)

**Query Keys:** Sistema centralizado em `lib/query/queryKeys.ts` com factory pattern (`createQueryKeys.ts`). Keys organizadas por entidade: `queryKeys.deals`, `queryKeys.contacts`, `queryKeys.boards`, etc.

**Optimistic Updates:** Implementados diretamente no CRMContext via `queryClient.setQueryData()` para operacoes de criacao de deals (inserir deal temporario no cache, substituir pelo real apos server response).

### 4.3 Padrao de Servicos Supabase

Cada entidade do dominio tem um arquivo de servico em `lib/supabase/`:
- Funcoes puras que recebem o Supabase client e parametros
- Queries tipadas com `.select()`, `.eq()`, `.order()`
- Retorno padronizado `{ data, error }` do Supabase
- Servicos maiores: `boards.ts` (924 LOC), `contacts.ts` (814 LOC), `deals.ts` (757 LOC)

**Tres tipos de cliente Supabase:**
1. **Browser client** (`lib/supabase/client.ts`): Singleton, usa anon key, respeita RLS
2. **Server client** (`lib/supabase/server.ts`): Usa cookies, para Route Handlers e RSC
3. **Admin client** (`lib/supabase/server.ts > createStaticAdminClient`): Service role key, bypassa RLS, usado por AI tools

### 4.4 Padrao de Realtime

O hook `useRealtimeSync` (`lib/realtime/useRealtimeSync.ts`, 27KB) implementa:
- Subscricao a mudancas PostgreSQL via Supabase Realtime
- Deduplicacao global de eventos INSERT (usando `Map` com TTL de 5s)
- Invalidacao automatica de React Query caches por tabela
- Suporte a multiplas tabelas simultaneas (`useRealtimeSyncAll`)
- Tratamento especial para Kanban (`useRealtimeSyncKanban`) com merge de DealView

### 4.5 Padrao de IA

**Agente CRM** (`lib/ai/crmAgent.ts`):
- Baseado no Vercel AI SDK v6 com tool calling
- Multi-provider: Google Gemini (default), OpenAI, Anthropic
- 25+ ferramentas de CRM: pipeline analysis, deal CRUD, contact CRUD, activities, stages, email drafts, objecoes
- Tool approval: acoes destrutivas requerem aprovacao do usuario
- Streaming via `createAgentUIStreamResponse`

**API de IA:**
- `POST /api/ai/chat` - Chat principal (streaming)
- `POST /api/ai/actions` - Acoes de IA (tool calling com approval)
- `GET/POST /api/ai/tasks/*` - Tasks pre-configuradas (briefing, script, analyze, email)

### 4.6 API Publica

- **Versionada**: `/api/public/v1/`
- **RESTful**: CRUD completo para contacts, deals, boards, stages, activities, companies
- **Autenticacao**: Via `lib/public-api/auth.ts` (API key ou session)
- **Paginacao**: Cursor-based (`lib/public-api/cursor.ts`)
- **OpenAPI**: Spec auto-gerada em `/api/public/v1/openapi.json`
- **Sanitizacao**: Input sanitization via `lib/public-api/sanitize.ts`
- **Rate Limiting**: Implementado via `lib/rate-limit.ts` (token bucket algorithm)

---

## 5. Autenticacao & Seguranca

### 5.1 Fluxo de Autenticacao

```
Browser Request
    |
    v
middleware.ts (raiz)
    |
    v
lib/supabase/middleware.ts
    |-- 1. Skip /api/* (Route Handlers tratam auth propria)
    |-- 2. Verificar Supabase configurado
    |-- 3. createServerClient (cookies)
    |-- 4. supabase.auth.getUser() (refresh token)
    |-- 5. Guard: is_instance_initialized() -> /setup
    |-- 6. Se nao autenticado + rota protegida -> /login
    |-- 7. Se autenticado + rota de auth -> /dashboard
    v
Response (com cookies atualizados)
```

### 5.2 RBAC

Sistema de roles em `lib/auth/roles.ts`:
- **admin**: Acesso total
- **diretor**: Acesso a equipe/organizacao
- **corretor**: Acesso ao proprio portfolio

RLS no PostgreSQL filtra dados por `organization_id` e `owner_id` dependendo do role.

### 5.3 Pontos de Seguranca

| Aspecto | Implementacao | Localizacao |
|---------|--------------|-------------|
| Autenticacao | Supabase Auth (JWT) | `middleware.ts` |
| Autorizacao | RLS + RBAC (admin/diretor/corretor) | PostgreSQL policies + `lib/auth/roles.ts` |
| Same-Origin | Verificacao em API routes | `lib/security/sameOrigin.ts` |
| LGPD/Consent | Modal de consentimento + tracking | `lib/consent/`, `hooks/useConsent.ts` |
| AI Tool Approval | Acoes destrutivas requerem confirmacao | `lib/ai/tools.ts` |
| Rate Limiting | Token bucket na API publica | `lib/rate-limit.ts` |
| Input Sanitization | Sanitizacao de input na API publica | `lib/public-api/sanitize.ts` |

---

## 6. Modelo de Dados

### 6.1 Tabelas Principais (44 migrations)

| Tabela | Descricao | RLS |
|--------|-----------|-----|
| `organizations` | Organizacoes (tenant - quem paga o SaaS) | Sim |
| `organization_settings` | Config por org (AI provider, keys, feature flags) | Sim |
| `profiles` | Perfis de usuario (estende auth.users, com role, org_id) | Sim |
| `boards` | Boards/pipelines kanban | Sim |
| `board_stages` | Estagios de cada board (com linkedLifecycleStage) | Sim |
| `contacts` | Contatos/leads (com campos imobiliarios: cpf, birth_date, etc.) | Sim |
| `contact_phones` | Telefones de contatos (multi-phone) | Sim |
| `contact_preferences` | Preferencias de contato (imobiliarias) | Sim |
| `deals` | Negocios/oportunidades (com property_ref, metadata JSONB) | Sim |
| `deal_items` | Itens/produtos de um deal | Sim |
| `deal_notes` | Notas em deals | Sim |
| `deal_files` | Arquivos em deals (Supabase Storage) | Sim |
| `activities` | Atividades (calls, meetings, emails, tasks, status_change) | Sim |
| `lifecycle_stages` | Estagios de lifecycle dinamicos (lead, mql, prospect, customer) | Sim |
| `products` | Catalogo de produtos | Sim |
| `quick_scripts` | Scripts rapidos de vendas | Sim |
| `notifications` | Sistema de notificacoes | Sim |
| `lead_score_history` | Historico de lead scoring | Sim |
| `consents` | Registros LGPD | Sim |

### 6.2 Extensoes PostgreSQL

- `uuid-ossp` - Geracao de UUIDs
- `pgcrypto` - Criptografia
- `unaccent` - Busca sem acentos
- `pg_net` - Webhooks async

### 6.3 RPCs Notaveis

| RPC | Proposito |
|-----|-----------|
| `is_instance_initialized` | Guard de setup (usado no middleware) |
| `reassign_contact_with_deals` | Reatribuicao de contato para outro corretor |
| `merge_contacts` | Merge de contatos duplicados |
| `calculate_ltv` | Calculo de LTV de contato |

---

## 7. Build, Deploy & CI/CD

### 7.1 Build Configuration

**Next.js (`next.config.ts`):**
- Turbopack habilitado (`next dev --turbopack`)
- `optimizePackageImports`: lucide-react, recharts, date-fns (reduz bundle 15-25KB)
- Sentry condicionalmente habilitado (wraps config se `NEXT_PUBLIC_SENTRY_DSN` existe)
- Custom headers para Service Worker (no-cache)

**TypeScript (`tsconfig.json`):**
- Target: ES2022
- Module: ESNext com bundler resolution
- `strict: true` habilitado
- `incremental: true` com buildinfo
- Path alias `@/*` mapeando para raiz
- Excludes: node_modules, test, **/*.test.*, supabase/functions

**Vitest (`vitest.config.ts`):**
- Environment: happy-dom (DOM leve)
- Setup files: `test/setup.ts` + `test/setup.dom.ts`
- Include: `**/*.{test,spec}.{ts,tsx}`
- Timeout: 60s (test + hook)
- Coverage via v8

**ESLint (`eslint.config.mjs`):**
- Flat config (ESLint v9)
- Extends: next/core-web-vitals
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-unused-vars`: off
- `react-hooks/exhaustive-deps`: off
- Custom rule: ban raw `<button>` em favor de `<Button>` do design system
- Ignores: .next, .aios-core, .antigravity, .gemini, squads, coverage

### 7.2 CI Pipeline (GitHub Actions)

```
on: push/PR to main/develop
    |
    |--> lint (ESLint, max-warnings 0)
    |--> typecheck (tsc --noEmit)
    |--> test (vitest run)
    |
    v (all pass)
    build (next build)
```

- Concurrency: cancela runs anteriores do mesmo branch
- Node.js 20 com npm cache
- Build depende de lint + typecheck + test passarem

### 7.3 Deploy (Vercel)

| Ambiente | Branch | Supabase |
|----------|--------|----------|
| Preview | qualquer branch != main | Staging (`xbwbwnevtpmmehgxfvcp`, Sao Paulo) |
| Production | main | Producao (`fkfqwxjrgfuerysaxayr`, Oregon) |

- `.vercel/project.json` configurado
- Env vars separadas por scope na Vercel
- Migrations: `supabase db push` (staging por default, producao requer `--db-url` explicito)

### 7.4 PWA

- Service Worker registrado via `components/pwa/ServiceWorkerRegister.tsx`
- Install Banner via `components/pwa/InstallBanner.tsx`
- Manifest gerado em `app/manifest.ts` com icones SVG + PNG
- `display: 'standalone'`, start_url: `/boards`
- Headers customizados para `sw.js`: no-cache

---

## 8. Variaveis de Ambiente

### 8.1 Obrigatorias

| Variavel | Escopo | Proposito |
|----------|--------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + Server | Chave publica (ou fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | Server only | Service role key (ou fallback `SUPABASE_SERVICE_ROLE_KEY`) |

### 8.2 Opcionais

| Variavel | Escopo | Proposito |
|----------|--------|-----------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client + Server | DSN do Sentry (habilita error tracking) |
| `SENTRY_ORG` | Build time | Organizacao Sentry (sourcemaps upload) |
| `SENTRY_PROJECT` | Build time | Projeto Sentry (sourcemaps upload) |
| `INSTALLER_ENABLED` | Server | Habilita wizard de instalacao |
| `INSTALLER_TOKEN` | Server | Token para wizard |
| `ALLOW_AI_TEST_ROUTE` | Server | Habilita `/api/ai/test` e `/ai-test` |
| `ALLOW_UI_MOCKS_ROUTE` | Server | Habilita `/labs/*` mock pages |
| `AI_TOOL_APPROVAL_BYPASS` | Server | Bypass de aprovacao de tools IA |
| `AI_TOOL_CALLS_DEBUG` | Server | Log de chamadas de tools IA |
| `NEXT_PUBLIC_DEBUG_REALTIME` | Client | Log de eventos realtime |

### 8.3 Configuracao de AI (via Banco)

API keys de AI providers sao armazenadas na tabela `organization_settings`, nao em env vars. Cada organizacao configura seu proprio provider (Google, OpenAI, Anthropic) e chave.

---

## 9. Testes

### 9.1 Distribuicao de Testes

| Categoria | Arquivos | Localizacao |
|-----------|----------|-------------|
| Unitarios - Utils | 9 | `lib/utils/__tests__/`, `lib/utils/csv.test.ts` |
| Unitarios - Services | 4 | `lib/supabase/__tests__/`, `lib/stores/__tests__/` |
| Unitarios - Query | 1 | `lib/query/__tests__/cache-integrity.test.ts` |
| Unitarios - Security | 3 | `lib/security/__tests__/`, `lib/auth/__tests__/`, `lib/public-api/__tests__/` |
| Unitarios - Validations | 1 | `lib/validations/__tests__/` |
| Unitarios - AI | 2 | `lib/ai/__tests__/` |
| Unitarios - A11y | 4 | `lib/a11y/__tests__/`, `lib/a11y/test/` |
| Unitarios - Realtime | 1 | `lib/realtime/__tests__/` |
| Componentes UI | 3 | `components/ui/FormField.test.tsx`, `Modal.test.tsx`, `ConfirmModal.test.tsx` |
| Componentes Feature | 3 | `features/boards/`, `features/deals/`, `features/inbox/`, `features/settings/` |
| Hooks | 1 | `hooks/__tests__/useCRMActions.guard.test.ts` |
| Integracao | 6 | `test/` (rate-limit, middleware, RBAC, multi-tenant, salesTeam, publicAPI) |
| User Stories | 1 | `test/stories/US-001-abrir-deal-no-boards.test.tsx` |
| AIOS Framework | 9 | `.aios-core/` (permissions, workflow-intelligence, infrastructure) |
| **Total** | **~51** | |

### 9.2 Cobertura

- Ratio arquivo/teste: ~11.6% (51 testes / 438 arquivos fonte)
- Areas com ZERO cobertura: maioria dos features/, contexts/, API routes, AI agent
- Areas com boa cobertura: lib/utils/, lib/security/, lib/a11y/

### 9.3 Configuracao de Testes

- Runner: Vitest v4 com happy-dom
- Setup: `test/setup.ts` (mocks globais) + `test/setup.dom.ts` (DOM helpers)
- Accessibility: axe-core + vitest-axe
- Fixtures: `test/helpers/fixtures.ts`, `test/helpers/salesTeamFixtures.ts`
- Timeout: 60 segundos

---

## 10. Fluxos Arquiteturais

### 10.1 Autenticacao

```
Browser ---> middleware.ts ---> lib/supabase/middleware.ts
                                    |
                                    |-- Skip /api/*
                                    |-- createServerClient (cookies)
                                    |-- auth.getUser() (refresh)
                                    |-- Guard: is_instance_initialized() -> /setup
                                    |-- Not auth + protected -> /login
                                    |-- Auth + login -> /dashboard
                                    v
                                Response (cookies updated)
```

### 10.2 Data Flow (Read)

```
Component
    |-- useContacts() / useDeals() / useBoards()  [React Context hooks]
    |       |
    |       v
    |   Context Provider (DealsContext, ContactsContext, etc.)
    |       |-- useDealsQuery() / useContactsQuery()  [TanStack Query hooks]
    |       |       |
    |       |       v
    |       |   QueryClient (cache, stale time 5min, GC 30min)
    |       |       |
    |       |       v
    |       |   lib/supabase/deals.ts (service)
    |       |       |
    |       |       v
    |       |   Supabase JS Client -> PostgreSQL (RLS applied)
    |       |
    |       |-- useRealtimeSync('deals')  [Realtime subscription]
    |               |
    |               v
    |           Supabase Realtime Channel
    |               |-- INSERT/UPDATE/DELETE event
    |               v
    |           queryClient.invalidateQueries()
    |
    v
UI renders with cached data
```

### 10.3 Data Flow (Write - Optimistic)

```
User Action (ex: criar deal)
    |
    v
CRMContext.addDeal()
    |-- 1. Optimistic insert (temp ID) via queryClient.setQueryData()
    |-- 2. Contact resolution (find existing or create new)
    |-- 3. Server call: addDealState() -> dealsService.createDeal()
    |-- 4. Replace temp deal with real deal in cache
    |-- 5. Create "Deal Criado" activity
    v
UI already showed deal (step 1), now confirmed
```

### 10.4 AI Agent Flow

```
UIChat Component (client)
    |
    v
POST /api/ai/chat
    |-- 1. Auth check (Supabase session)
    |-- 2. Load profile + organization_settings
    |-- 3. getModel(provider, apiKey, modelId) [multi-provider]
    |-- 4. createCRMAgent(context, tools)
    |-- 5. Stream response via createAgentUIStreamResponse
    |       |
    |       |-- Tool call detected
    |       |       |
    |       |       v
    |       |   Tool execution (staticAdminClient - service role)
    |       |   (se destructive: return pending approval)
    |       |
    |       v
    |   Stream tokens to client
    v
UIChat renders markdown + tool results
```

### 10.5 Hierarquia de Providers

```
<html> (RootLayout)
  <body>
    <ServiceWorkerRegister />
    <InstallBanner />
    {children}  <-- Router decides:
      |
      |-- Public routes: /login, /join, /install
      |       (no providers, no shell)
      |
      |-- Protected routes: /(protected)/*
              |
              v
          <Providers>  (composeProviders)
            <QueryProvider>        [1. TanStack Query]
              <ToastProvider>      [2. Toast notifications]
                <ThemeProvider>    [3. Dark/light theme]
                  <AuthProvider>   [4. Supabase auth]
                    <SettingsProvider>  [5. Org settings]
                      <BoardsProvider>   [6. Boards/pipelines]
                        <ContactsProvider>  [7. Contacts]
                          <ActivitiesProvider>  [8. Activities]
                            <DealsProvider>   [9. Deals]
                              <AIProvider>   [10. AI state]
                                <Layout>     [App shell: sidebar + header]
                                  {children}
```

---

## 11. Debitos Tecnicos

### 11.1 CRITICO

| ID | Debito | Impacto | Localizacao |
|----|--------|---------|-------------|
| TD-001 | **Admin client (service role) bypassa RLS para AI tools** | Qualquer bug nas AI tools pode vazar dados entre organizacoes. O `createStaticAdminClient()` usa service role key sem nenhum filtro adicional de tenant, dependendo inteiramente da logica do tool para filtrar por `organization_id`. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/lib/supabase/server.ts` (createStaticAdminClient), `lib/ai/tools/` |
| TD-002 | **AI API keys armazenadas como texto plano no banco** | Chaves de API de providers IA (OpenAI, Google, Anthropic) sao armazenadas como texto plano na tabela `organization_settings`. Sem criptografia em repouso. Se o banco for comprometido, todas as keys ficam expostas. | Tabela `organization_settings`, `lib/supabase/settings.ts` |
| TD-003 | **Debug logging com endpoint externo em producao** | `CRMContext.tsx` contem multiplos blocos de debug que fazem `fetch('http://127.0.0.1:7242/ingest/...')`. Embora protegidos por `NODE_ENV !== 'production'`, os blocos adicionam ~150 linhas de codigo morto e o UUID do endpoint esta hardcoded. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/context/CRMContext.tsx` (linhas 358-538) |

### 11.2 ALTO

| ID | Debito | Impacto | Localizacao |
|----|--------|---------|-------------|
| TD-004 | **Cobertura de testes baixa (11.6%)** | 51 arquivos de teste para 438 arquivos fonte. Areas criticas com ZERO testes: maioria dos features/, todos os contexts/, todos os API routes, AI agent, middleware de auth. Risco alto de regressoes nao detectadas. | Projeto inteiro |
| TD-005 | **CRMContext como "God Context" (930 linhas)** | Agrega 5 sub-contextos, contem logica de negocio complexa (addDeal com optimistic updates, contact resolution, wallet health, stagnant deals), projeta views denormalizadas. Qualquer mudanca pode causar re-renders em cascata em toda a aplicacao. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/context/CRMContext.tsx` |
| TD-006 | **Duplicacao de estado: Context API + Zustand** | O sistema usa Context API para estado de dominio E Zustand para estado de UI, com sobreposicao (ex: `isGlobalAIOpen` existe em ambos). `CRMContext` depende de 5 sub-contextos que por sua vez dependem de React Query. Complexidade excessiva. | `context/`, `lib/stores/` |
| TD-007 | **Todas as paginas protegidas sao client components** | O layout `(protected)/layout.tsx` chama `<Providers>` que e `'use client'`, forcando toda a sub-arvore a ser client-rendered. Perde beneficios de Server Components, streaming, e Suspense boundaries nativas do App Router. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/app/(protected)/providers.tsx` |
| TD-008 | **BoardCreationWizard.tsx com 75KB** | Maior arquivo do projeto. Componente monolitico que deveria ser decomposto em steps menores. Dificil de testar, manter e fazer code review. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/features/boards/components/BoardCreationWizard.tsx` |
| TD-009 | **Nenhum error.tsx em route segments** | O App Router suporta `error.tsx` por segmento de rota para error boundaries granulares. O projeto so tem `global-error.tsx` (raiz) e um `ErrorBoundary` generico em `app/components/ui/`. Erros em features individuais propagam ate o topo. | `app/(protected)/` (nenhum error.tsx encontrado) |
| TD-010 | **Nenhum not-found.tsx** | O App Router suporta `not-found.tsx` por segmento. O projeto nao tem nenhum, resultando na pagina 404 default do Next.js. | `app/` (nenhum not-found.tsx encontrado) |
| TD-011 | **ESLint rules desabilitadas** | `@typescript-eslint/no-explicit-any: off` e `@typescript-eslint/no-unused-vars: off` desabilitam protecoes importantes. `react-hooks/exhaustive-deps: off` permite bugs de stale closures silenciosos. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/eslint.config.mjs` |

### 11.3 MEDIO

| ID | Debito | Impacto | Localizacao |
|----|--------|---------|-------------|
| TD-012 | **Endpoint /api/chat e re-export vazio** | `app/api/chat/route.ts` contem apenas uma linha re-exportando de `/api/ai/chat`. Rota duplicada sem proposito claro, potencial confusao. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/app/api/chat/route.ts` |
| TD-013 | **Labs com mocks acessiveis em producao** | Diretorio `app/(protected)/labs/` contem mock cockpits que sao acessiveis em qualquer deploy. Deveria ser protegido por feature flag ou removido em producao. | `app/(protected)/labs/` |
| TD-014 | **useRealtimeSync.ts com 27KB** | Hook monolitico com deduplicacao global, tratamento especial para Kanban, e multiplas variantes. Deveria ser decomposto em hooks menores e mais focados. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/lib/realtime/useRealtimeSync.ts` |
| TD-015 | **Loading states apenas em 4 paginas** | So `boards`, `contacts`, `inbox` e `deals/cockpit` tem `loading.tsx`. Dashboard, activities, reports, settings e outras paginas nao tem, resultando em tela branca durante carregamento. | `app/(protected)/` |
| TD-016 | **Sem internationalizacao (i18n)** | Todo o UI esta hardcoded em portugues brasileiro. Zero arquivos de traducao ou uso de bibliotecas i18n. Strings de UI espalhadas por dezenas de componentes. Bloqueio para mercados internacionais. | Projeto inteiro |
| TD-017 | **Supabase client pode ser null** | `lib/supabase/client.ts` retorna `SupabaseClient | null` mas faz cast para `SupabaseClient` na exportacao. Se env vars nao estiverem configuradas, causa crash em runtime sem mensagem clara. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/lib/supabase/client.ts` (linha 40) |
| TD-018 | **Provider nesting profundo (10 niveis)** | O `composeProviders` empilha 10 providers. Embora otimizado com composicao, cada provider adiciona overhead e complexidade de debug quando algo falha. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/app/(protected)/providers.tsx` |
| TD-019 | **Installer endpoint complex (13 routes)** | O sistema de instalacao tem 13 API routes para gerenciar Supabase, Vercel, migrations, bootstrap, etc. Complexidade significativa que so roda uma vez por instancia. | `app/api/installer/` |
| TD-020 | **pg em dependencies** | Driver PostgreSQL direto (`pg`) como dependencia em producao. Supabase JS ja abstrai o acesso ao banco. O `pg` parece ser usado apenas pelo installer e possivelmente AI tools. | `package.json` |

### 11.4 BAIXO

| ID | Debito | Impacto | Localizacao |
|----|--------|---------|-------------|
| TD-021 | **Tailwind config JS com Tailwind v4** | `tailwind.config.js` mantido para content scanning, mas Tailwind v4 usa CSS `@theme` em `globals.css`. Potencial conflito de configuracao ou duplicacao. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/tailwind.config.js` |
| TD-022 | **.DS_Store commitados** | Artefatos macOS presentes em `context/` e `app/`. Deveria estar no `.gitignore`. | `context/.DS_Store`, `app/.DS_Store` |
| TD-023 | **ErrorBoundary em localizacao nao-padrao** | O `ErrorBoundary` esta em `app/components/ui/` em vez de `components/ui/` ou `components/`. Importacoes usam `@/app/components/ui/ErrorBoundary` que e incomum. | `/Users/felipezacker/Desktop/code/ZmobCRM-Brownfield/app/components/ui/ErrorBoundary.tsx` |
| TD-024 | **Button importado de dois locais** | `ErrorBoundary` importa `Button` de `@/app/components/ui/Button`, mas o design system principal tem `button.tsx` em `components/ui/`. Dois Buttons potencialmente diferentes. | `app/components/ui/`, `components/ui/button.tsx` |
| TD-025 | **hardcoded avatar URLs** | `'https://i.pravatar.cc/150?u=me'` e `'Eu'` hardcoded em varios locais como fallback de owner. | `context/CRMContext.tsx` |

---

## 12. Recomendacoes Prioritarias

### Prioridade 1 (Critico - Fazer Agora)

1. **Eliminar debug logging do CRMContext** - Remover todos os blocos `#region agent log` que fazem fetch para `http://127.0.0.1:7242`. Sao ~150 linhas de codigo morto com UUID hardcoded.

2. **Proteger AI tools com filtro de tenant explicito** - Criar um wrapper que injete `organization_id` em todas as queries do admin client, evitando bypass acidental de RLS. Alternativa: usar client autenticado (com RLS) e conceder permissoes especificas via roles PostgreSQL.

3. **Criptografar API keys no banco** - Usar Supabase Vault ou `pgcrypto` para criptografar chaves de AI providers em `organization_settings`. Keys devem ser decriptadas apenas server-side no momento do uso.

### Prioridade 2 (Alto - Proximo Sprint)

4. **Decompor CRMContext** - Extrair logica de negocio (optimistic updates, wallet health, stagnant deals) para hooks dedicados. Manter CRMContext apenas como thin wrapper de compatibilidade, com deprecation notice.

5. **Adicionar error.tsx e not-found.tsx** - Criar error boundaries por segmento de rota para melhor UX em caso de falhas. Pelo menos `(protected)/error.tsx` e `(protected)/not-found.tsx`.

6. **Habilitar ESLint rules** - Reabilitar `no-explicit-any` (pelo menos como warn) e `no-unused-vars`. Corrigir violacoes gradualmente. `exhaustive-deps` pode ficar como warn.

7. **Adicionar testes para areas criticas** - Priorizar testes para: API routes (especialmente `public/v1/`), AI agent tools, middleware de autenticacao, CRMContext (optimistic updates).

### Prioridade 3 (Medio - Roadmap)

8. **Decompor BoardCreationWizard** - Extrair em componentes menores por step do wizard. Objetivo: nenhum componente acima de 500 linhas.

9. **Adicionar loading.tsx para todas as paginas** - Dashboard, activities, reports, settings, profile, notifications devem ter loading states.

10. **Investigar SSR para paginas protegidas** - Avaliar se e possivel mover providers para server-side ou usar interleaved pattern (RSC + Client) para melhorar performance de primeiro load.

11. **Consolidar sistema de estado** - Definir claramente fronteiras: Zustand para UI, React Query para server state. Eliminar duplicacao entre Context e Zustand (ex: `isGlobalAIOpen`).

---

## 13. Diagramas de Dependencia

### 13.1 Mapa de Dependencias entre Modulos

```
app/ (pages + API)
  |-- components/ (shared UI)
  |-- features/ (domain modules)
  |      |-- uses --> components/ui/
  |      |-- uses --> context/
  |      |-- uses --> hooks/
  |      |-- uses --> lib/supabase/
  |      |-- uses --> types/
  |
  |-- context/
  |      |-- uses --> lib/supabase/ (services)
  |      |-- uses --> lib/query/ (React Query)
  |      |-- uses --> types/
  |
  |-- hooks/
  |      |-- uses --> context/
  |      |-- uses --> lib/supabase/
  |      |-- uses --> lib/query/
  |
  |-- lib/
  |      |-- supabase/ (data layer)
  |      |-- query/ (cache layer)
  |      |-- ai/ (AI agent)
  |      |      |-- uses --> lib/supabase/ (via admin client)
  |      |-- realtime/ (live sync)
  |      |      |-- uses --> lib/query/ (invalidation)
  |      |-- stores/ (UI state)
  |      |-- validations/ (schemas)
  |      |-- public-api/ (REST API logic)
  |
  |-- types/ (shared type definitions)
```

### 13.2 Fluxo de Dados End-to-End

```
                          [Supabase PostgreSQL]
                                  |
                    +-------------+-------------+
                    |             |             |
              [Supabase JS]  [Realtime]   [pg driver]
                    |             |             |
              [lib/supabase/]    |        [lib/ai/tools]
              [services]         |             |
                    |             |             |
              [lib/query/]       |        [AI Agent]
              [hooks]            |             |
                    |             |             |
              [context/]    [lib/realtime/]     |
              [providers]   [useRealtimeSync]   |
                    |             |             |
                    +------+------+             |
                           |                    |
                    [components/]          [API Routes]
                    [features/]            /api/ai/chat
                           |               /api/public/v1/*
                           |                    |
                    +------+------+-------------+
                           |
                      [Browser UI]
```

---

*Documento gerado por @architect (Aria) - Brownfield Discovery Phase 1*
*ZmobCRM v1.4.3 | 2026-03-03 | Synkra AIOS*
