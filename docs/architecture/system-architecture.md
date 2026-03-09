# Arquitetura do Sistema - ZmobCRM (Brownfield Discovery Phase 1)

**Data:** 2026-03-06
**Agente:** @architect (Aria)
**Fase:** Brownfield Discovery - Phase 1 (Revisao Completa v2)
**Status:** Completo
**Versao do Projeto:** 1.5.1
**Branch:** develop

---

## 1. Sumario Executivo

O ZmobCRM e um CRM de vendas SaaS voltado ao mercado imobiliario brasileiro. Construido como uma aplicacao Next.js 15 (App Router) com Supabase como backend completo (autenticacao, PostgreSQL com RLS, Realtime, Storage). Inclui um agente conversacional de IA multi-provider (Google Gemini, OpenAI, Anthropic), API publica RESTful, modulo de prospeccao com power dialer, e suporte PWA para uso mobile. Opera como single-tenant por instancia.

### 1.1 Proposito

CRM inteligente para gestao de vendas imobiliarias com:
- Kanban boards configuraveis para pipelines de vendas
- Cockpit detalhado por deal com sinais de IA e proxima melhor acao
- Modulo de prospeccao com power dialer, filas, metas diarias e scripts
- Agente de IA conversacional com 27+ ferramentas de CRM
- API publica RESTful para integracoes externas
- Suporte offline-first via PWA (Service Worker + Install Banner)
- RBAC com 3 papeis: admin > diretor > corretor

### 1.2 Numeros-Chave (2026-03-06)

| Metrica | Valor |
|---------|-------|
| Arquivos de teste | 65 |
| Paginas protegidas (App Router) | 18 |
| API Routes | 68 |
| Migrations Supabase | 54 |
| React Contexts | 11 (Auth, CRM, AI, AICHat, Theme, Toast, Boards, Contacts, Activities, Deals, Settings) |
| Zustand Stores | 3 (UI, Form, Notification) |
| Feature Modules | 16 (activities, ai-hub, boards, contacts, dashboard, deals, decisions, inbox, instructions, notifications, profile, prospecting, reports, settings + sub-features) |
| React Query hooks | 14 (useDealsQuery, useContactsQuery, useBoardsQuery, useActivitiesQuery, useMoveDeal, useAISuggestionsQuery, useProspectingQueueQuery, useProspectingContactsQuery, useDailyGoalsQuery, useNoteTemplatesQuery, useSavedQueuesQuery + 3 internos) |
| Supabase service modules | 13 (boards, contacts, deals, activities, prospecting-queues, prospecting-contacts, prospecting-filtered-contacts, prospecting-goals, prospecting-saved-queues, products, settings, noteTemplates, contact-metrics) |

---

## 2. Stack Tecnologico

### 2.1 Framework & Runtime

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Next.js | ^15.5.12 | Framework fullstack (App Router, RSC, Route Handlers, Turbopack dev) |
| React | 19.2.1 (fixo) | Biblioteca de UI (React 19 estavel) |
| React DOM | 19.2.1 (fixo) | Renderizacao DOM |
| TypeScript | ^5 | Tipagem estatica |
| Node.js | 20 (CI) | Runtime server-side |
| ESM | `"type": "module"` | Modulos nativos ES |

### 2.2 Frontend - UI & Estilizacao

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Tailwind CSS | ^4 | Estilizacao utility-first (v4 com `@theme` em CSS, PostCSS via `@tailwindcss/postcss`) |
| Radix UI | v1-v2 (15 pacotes) | Componentes headless acessiveis (accordion, avatar, checkbox, dialog, dropdown-menu, label, popover, scroll-area, select, separator, slider, slot, switch, tabs, tooltip) |
| Lucide React | ^0.560.0 | Icones (1500+ icones, tree-shaken via `optimizePackageImports`) |
| Framer Motion | ^12.23.26 | Animacoes e transicoes |
| class-variance-authority | ^0.7.1 | Variantes de componentes |
| clsx + tailwind-merge | ^2.1.1 + ^3.4.0 | Merge de classes CSS |
| focus-trap-react | ^11.0.4 | Trap de foco para modais (acessibilidade) |
| react-markdown + remark-gfm | ^10.1.0 + ^4.0.1 | Renderizacao de Markdown |
| recharts | ^3.5.1 | Graficos e visualizacoes de dados |
| jspdf + jspdf-autotable | ^4.1.0 + ^5.0.2 | Geracao de PDFs (relatorios de prospeccao) |

### 2.3 Estado & Data Fetching

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| TanStack React Query | ^5.90.12 | Server state, cache, mutations, invalidacao seletiva |
| Zustand | ^5.0.9 | Client state (UI, forms, notifications) com devtools + persist + subscribeWithSelector |
| React Context | nativo | Dominio (CRM, Auth, Theme, Toast, AI) - camada de compatibilidade |
| Immer | ^11.0.1 | Mutations imutaveis (integrado ao Zustand) |

### 2.4 Backend & Database

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Supabase JS | ^2.87.1 | Cliente principal (queries, auth, realtime, storage) |
| Supabase SSR | ^0.8.0 | Integracao server-side (cookies, middleware) |
| PostgreSQL | 15 (Supabase) | Banco de dados relacional com RLS 100% |
| pg | ^8.16.3 | Cliente PostgreSQL direto (usado em public-api) |

### 2.5 IA & LLM

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| AI SDK (Vercel) | ^6.0.72 | Framework de IA unificado (ToolLoopAgent, streaming) |
| @ai-sdk/google | ^3.0.21 | Provider Google (Gemini 2.5 Flash default) |
| @ai-sdk/openai | ^3.0.25 | Provider OpenAI (GPT-4o default, com retry e model fallback) |
| @ai-sdk/anthropic | ^3.0.37 | Provider Anthropic (Claude Sonnet 4.6 default) |
| @ai-sdk/react | ^3.0.74 | Hooks React para IA (useChat, useAssistant) |

### 2.6 Formularios & Validacao

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| React Hook Form | ^7.68.0 | Formularios performaticos |
| Zod | ^4.1.13 | Validacao de schemas (Zod v4!) |
| @hookform/resolvers | ^5.2.2 | Bridge RHF <-> Zod |
| libphonenumber-js | ^1.12.33 | Validacao e formatacao de telefones |

### 2.7 Monitoramento & Erros

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Sentry (Next.js) | ^10.39.0 | Error tracking, session replay, tracing |

**Configuracao Sentry:** Condicional via `NEXT_PUBLIC_SENTRY_DSN`. Em producao: `tracesSampleRate: 0.1`, `replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`.

### 2.8 Testes & Quality

| Tecnologia | Versao | Papel |
|------------|--------|-------|
| Vitest | ^4.0.0 | Test runner (compativel Vite) |
| Vite | ^7.1.3 | Build tool (usado pelo Vitest) |
| @vitejs/plugin-react | ^5.0.4 | Plugin JSX para Vitest |
| @testing-library/react | ^16.3.0 | Testes de componente |
| @testing-library/jest-dom | ^6.8.0 | Matchers DOM |
| @testing-library/user-event | ^14.6.1 | Simulacao de eventos |
| happy-dom | ^20.0.11 | Ambiente DOM para testes |
| @vitest/coverage-v8 | ^4.0.18 | Cobertura de codigo |
| axe-core + vitest-axe | ^4.10.3 + ^0.1.0 | Testes de acessibilidade |
| @faker-js/faker | ^10.1.0 | Dados de teste |
| ESLint | ^9 (flat config) | Linting com eslint-config-next |

### 2.9 Deploy & Infraestrutura

| Tecnologia | Plataforma | Papel |
|------------|------------|-------|
| Vercel | Cloud | Deploy automatico (preview por branch, producao em main) |
| Supabase Cloud | Oregon (prod) / Sao Paulo (staging) | BaaS (auth, DB, RLS, Realtime, Storage, Edge Functions) |
| GitHub Actions | CI | 4 jobs: lint, typecheck, test, build (Node 20) |

---

## 3. Estrutura do Projeto

```
ZmobCRM-Brownfield/
├── app/                          # Next.js App Router
│   ├── (protected)/              # Route group autenticado
│   │   ├── activities/           #   Pagina de atividades
│   │   ├── ai/                   #   Chat IA
│   │   ├── ai-test/              #   Teste de IA (dev only)
│   │   ├── boards/               #   Kanban boards
│   │   ├── contacts/             #   Contatos + duplicatas + metricas
│   │   ├── dashboard/            #   Dashboard principal
│   │   ├── deals/                #   Deals
│   │   ├── decisions/            #   Decisoes
│   │   ├── inbox/                #   Caixa de entrada
│   │   ├── instructions/         #   Instrucoes/scripts
│   │   ├── labs/                 #   Laboratorio (dev only)
│   │   ├── notifications/        #   Notificacoes
│   │   ├── pipeline/             #   Pipeline de vendas
│   │   ├── profile/              #   Perfil do usuario
│   │   ├── prospecting/          #   Prospeccao (power dialer, filas, metas)
│   │   ├── reports/              #   Relatorios
│   │   ├── settings/             #   Configuracoes
│   │   ├── setup/                #   Setup inicial
│   │   ├── layout.tsx            #   Protected layout (wraps providers)
│   │   └── providers.tsx         #   Provider composition (10 providers)
│   ├── actions/                  # Server Actions (contacts, deals, notifications, contact-metrics)
│   ├── api/                      # API Routes (68 endpoints)
│   │   ├── admin/                #   Admin (backfill-scores, invites, users)
│   │   ├── ai/                   #   AI endpoints (chat, tasks, suggestions)
│   │   ├── boards/               #   Board CRUD
│   │   ├── chat/                 #   Chat endpoint
│   │   ├── contacts/             #   Contact endpoints
│   │   ├── custom-fields/        #   Custom fields CRUD
│   │   ├── installer/            #   Installer wizard (13 endpoints)
│   │   ├── invites/              #   Invitation system
│   │   ├── mcp/                  #   MCP integration
│   │   ├── public/               #   Public API (v1, keys, deals)
│   │   ├── settings/             #   Settings CRUD
│   │   └── setup-instance/       #   Instance setup
│   ├── auth/                     # Auth callback
│   ├── install/                  # Installer UI
│   ├── join/                     # Join via invite
│   ├── login/                    # Login page
│   ├── lp/, lp2/                 # Landing pages
│   ├── layout.tsx                # Root layout (Inter font, PWA, dark mode)
│   ├── globals.css               # Tailwind @theme, CSS variables
│   └── manifest.ts               # PWA manifest
│
├── components/                   # Componentes compartilhados
│   ├── ai/                       #   Componentes de IA
│   ├── charts/                   #   Graficos reutilizaveis
│   ├── debug/                    #   Debug UI
│   ├── filters/                  #   Filtros genericos
│   ├── navigation/               #   Sidebar, navigation
│   ├── notifications/            #   Notification bell
│   ├── pwa/                      #   ServiceWorkerRegister, InstallBanner
│   ├── ui/                       #   Design system (24 componentes: Button, Modal, FormField, Sheet, etc.)
│   ├── AIAssistant.tsx           #   Painel de chat IA
│   ├── ConfirmModal.tsx          #   Modal de confirmacao
│   ├── ConsentModal.tsx          #   LGPD consent
│   ├── Layout.tsx                #   Layout principal (505 linhas)
│   ├── MaintenanceBanner.tsx     #   Banner de manutencao
│   ├── OnboardingModal.tsx       #   Onboarding wizard
│   └── PageLoader.tsx            #   Skeleton de carregamento
│
├── context/                      # React Contexts (estado de dominio)
│   ├── activities/               #   ActivitiesContext
│   ├── boards/                   #   BoardsContext
│   ├── contacts/                 #   ContactsContext
│   ├── deals/                    #   DealsContext
│   ├── settings/                 #   SettingsContext
│   ├── AIChatContext.tsx          #   Chat IA state
│   ├── AIContext.tsx              #   IA config state
│   ├── AuthContext.tsx            #   Autenticacao + perfil
│   ├── CRMContext.tsx             #   Contexto legado unificado (930 linhas)
│   ├── ThemeContext.tsx           #   Dark/light mode
│   └── ToastContext.tsx           #   Sistema de toasts
│
├── features/                     # Feature modules (dominio de negocio)
│   ├── activities/               #   Gerenciamento de atividades
│   ├── ai-hub/                   #   Hub de IA (teste de prompts, config)
│   ├── boards/                   #   Boards kanban
│   ├── contacts/                 #   Contatos (lista, detalhe, dedup)
│   ├── dashboard/                #   Dashboard com metricas
│   ├── deals/                    #   Deals + cockpit
│   ├── decisions/                #   Decisoes de negocio
│   ├── inbox/                    #   Inbox com CallModal
│   ├── instructions/             #   Scripts de instrucao
│   ├── notifications/            #   Gerenciamento de notificacoes
│   ├── profile/                  #   Perfil do usuario
│   ├── prospecting/              #   Prospeccao (24 componentes, 7 hooks, 3 utils, 25 testes)
│   ├── reports/                  #   Relatorios
│   └── settings/                 #   Configuracoes
│
├── hooks/                        # Hooks globais reutilizaveis
│   ├── useAIEnabled.ts            #   Verifica se IA esta habilitada
│   ├── useConsent.ts              #   Consentimento LGPD
│   ├── useCRMActions.ts           #   Acoes CRM com guards (14.9KB)
│   ├── useFirstVisit.ts           #   Deteccao de primeira visita
│   ├── useIdleTimeout.ts          #   Timeout por inatividade
│   ├── useOrganizationMembers.ts  #   Lista membros da org
│   ├── usePersistedState.ts       #   State persistido em localStorage
│   ├── useReassignContactWithDeals.ts # Reatribuicao de contatos
│   ├── useResponsiveMode.ts       #   Deteccao mobile/desktop
│   ├── useSpeechRecognition.ts    #   Reconhecimento de voz (IA)
│   ├── useSystemNotifications.ts  #   Notificacoes do navegador
│   └── useTags.ts                 #   Gerenciamento de tags
│
├── lib/                          # Bibliotecas e servicos
│   ├── a11y/                     #   Acessibilidade (4 componentes, 4 hooks, testes axe)
│   ├── ai/                       #   Motor de IA
│   │   ├── crmAgent.ts           #     ToolLoopAgent (589 linhas, retry, model fallback)
│   │   ├── config.ts             #     Factory de providers
│   │   ├── defaults.ts           #     Defaults: Gemini 2.5 Flash, GPT-4o, Claude Sonnet 4.6
│   │   ├── tools/                #     27 ferramentas: deal, contact, activity, pipeline, note
│   │   ├── prompts/              #     Catalogo de prompts (catalog.ts, render.ts, server.ts)
│   │   ├── tasks/                #     Schemas e server-side tasks
│   │   ├── features/             #     Feature flags de IA
│   │   ├── actionsClient.ts      #     Acoes client-side
│   │   └── tasksClient.ts        #     Tasks client-side
│   ├── auth/                     #   Roles e permissoes
│   ├── consent/                  #   Servico LGPD
│   ├── debug/                    #   Utilidades de debug
│   ├── fetch/                    #   SafeFetch wrapper
│   ├── forms/                    #   Utilidades de formularios
│   ├── installer/                #   Wizard de instalacao (Supabase + Vercel)
│   ├── mcp/                      #   MCP registry e Zod-to-JSON schema
│   ├── prefetch.ts               #   Prefetch de dados (SSR)
│   ├── public-api/               #   API publica v1 (OpenAPI, cursor, auth, sanitize, dealsMoveStage)
│   ├── query/                    #   React Query (provider, queryKeys factory, 14 hooks)
│   ├── rate-limit.ts             #   Rate limiter in-memory (60 req/min por IP)
│   ├── realtime/                 #   Supabase Realtime (useRealtimeSync, presets, 590 linhas)
│   ├── security/                 #   sameOrigin check
│   ├── stores/                   #   Zustand stores (UI, Form, Notification)
│   ├── supabase/                 #   Camada de acesso a dados (13 service modules, 31 arquivos)
│   ├── templates/                #   Templates de boards e journeys
│   ├── utils/                    #   Utilidades gerais
│   └── validations/              #   Schemas de validacao Zod
│
├── types/                        # Tipos TypeScript centralizados
│   ├── types.ts                  #   Tipos de dominio (Deal, Contact, Board, Activity, etc.)
│   ├── ai.ts                    #   Tipos de IA (CRMCallOptions, schemas)
│   └── index.ts                 #   Re-exports
│
├── supabase/                     # Configuracao Supabase
│   ├── migrations/ (54)          #   Migrations SQL sequenciais
│   ├── config.toml               #   Configuracao local
│   ├── reset.sql                 #   Script de reset
│   ├── functions/                #   Edge Functions
│   └── docs/                     #   Documentacao de schema
│
├── test/                         # Testes globais e fixtures
│   ├── helpers/                  #   Fixtures, env, supabaseAdmin, toolHarness
│   ├── stories/                  #   User story tests (US-001, US-create-deal)
│   ├── setup.ts                  #   Setup global de testes
│   └── setup.dom.ts              #   Setup DOM (happy-dom)
│
├── middleware.ts                 # Middleware Next.js (auth refresh, redirects)
├── next.config.ts                # Config Next.js (optimizePackageImports, Sentry, SW headers)
├── vitest.config.ts              # Config Vitest (happy-dom, setupFiles, timeouts)
├── eslint.config.mjs             # ESLint flat config (next/core-web-vitals)
├── tailwind.config.js            # Tailwind v4 config (darkMode: 'class')
├── postcss.config.mjs            # PostCSS (@tailwindcss/postcss)
├── sentry.*.config.ts            # Sentry (client, server, edge)
└── package.json                  # Versao 1.5.1
```

---

## 4. Padroes de Arquitetura

### 4.1 Padrao de Camadas

```
[Browser] <-> [Next.js App Router] <-> [Supabase (PostgreSQL + RLS)]
                    |                          |
              [API Routes]              [Supabase Realtime]
                    |                          |
             [AI Agent Layer]          [Service Workers]
```

**Camada de Apresentacao:**
- App Router com route groups (`(protected)`)
- Feature modules com componentes, hooks e utilidades co-localizados
- Provider composition pattern (10 providers aninhados via `composeProviders`)

**Camada de Estado:**
- React Query para server state (cache, mutations, invalidacao)
- Zustand para client state (UI, formularios, notificacoes)
- React Context para dominio (legado, gradualmente migrando para React Query + Zustand)

**Camada de Acesso a Dados:**
- Service modules em `lib/supabase/` (funcoes puras que recebem client Supabase)
- Server Actions em `app/actions/` (operacoes server-side com revalidation)
- Route Handlers em `app/api/` (REST endpoints)

**Camada de Integracao:**
- AI SDK com ToolLoopAgent (agent com tool loop, 10 steps max)
- Supabase Realtime com deduplicacao de eventos
- Public API RESTful com OpenAPI spec e rate limiting

### 4.2 Autenticacao & Autorizacao

```
[Browser] -> [Middleware] -> [Supabase Auth (getUser)] -> [RLS]
                                                            |
                              [Profile + Role] -----> [RBAC Filter]
```

- **Middleware** (`middleware.ts`): Refresh de sessao Supabase SSR, redirect para `/login` em rotas protegidas
- **AuthContext**: Gerencia sessao, usuario, perfil (role: admin/diretor/corretor) e organizationId
- **RLS 100%**: Todas as tabelas possuem Row Level Security baseado em `organization_id`
- **RBAC**: 3 niveis (admin > diretor > corretor), implementado no DB e validado na UI

### 4.3 Composicao de Providers

```tsx
// app/(protected)/providers.tsx
const ComposedProviders = composeProviders(
    QueryProvider,      // React Query
    ToastProvider,      // Notificacoes toast
    ThemeProvider,      // Dark/light mode
    AuthProvider,       // Autenticacao Supabase
    SettingsProvider,   // Configuracoes da org
    BoardsProvider,     // Boards/pipelines
    ContactsProvider,   // Contatos
    ActivitiesProvider, // Atividades
    DealsProvider,      // Deals
    AIProvider,         // Configuracao IA
)
```

A funcao `composeProviders` cria um pipeline de providers sem aninhamento manual, com `displayName` para debug.

### 4.4 Padrao de Estado Hibrido

O sistema usa um padrao hibrido de gerenciamento de estado:

| Tipo de Estado | Solucao | Quando Usar |
|----------------|---------|-------------|
| Server state (dados do DB) | React Query | Deals, contacts, boards, activities |
| Client state (UI) | Zustand | Sidebar, modais, busca, loading |
| Dominio compartilhado | React Context | Auth, theme, AI config |
| Formularios | React Hook Form + Zod | Create/edit forms |
| Compatibilidade legado | CRMContext (930 linhas) | Codigo antigo que usa `useCRM()` |

**Direcao de migracao:** CRMContext -> hooks especializados (useDeals, useContacts, etc.)

### 4.5 Padrao de Data Fetching

```
[Componente] -> [useXxxQuery hook] -> [React Query] -> [lib/supabase/xxx.ts] -> [Supabase]
                                            |
                                     [Cache + Stale]
                                            |
                                [Realtime Invalidation]
```

- Query keys centralizadas em `lib/query/queryKeys.ts` usando factory pattern (`createQueryKeys`)
- Invalidacao seletiva via Supabase Realtime (`useRealtimeSync`)
- Mutations otimistas com rollback automatico
- Prefetch via `lib/prefetch.ts` para SSR

### 4.6 Padrao de IA (Agent)

```
[Chat UI] -> [POST /api/ai/chat] -> [createCRMAgent()] -> [ToolLoopAgent]
                                          |                      |
                                   [Provider Factory]     [27 CRM Tools]
                                          |                      |
                                   [Google/OpenAI/Anthropic]  [Supabase]
```

- **ToolLoopAgent**: Agent com loop de ferramentas (maximo 10 steps)
- **prepareCall**: Injeta contexto inicial (board, deal, contato, metricas)
- **prepareStep**: Injeta contexto dinamico (IDs de deals encontrados, memoria da conversa)
- **Retry com fallback**: OpenAI tem retry com fallback de modelo em 429/5xx
- **Multi-provider**: Configuravel por organizacao (stored em `organization_settings`)
- **Defaults**: Gemini 2.5 Flash (Google), GPT-4o (OpenAI), Claude Sonnet 4.6 (Anthropic)

### 4.7 Padrao de Realtime

```
[Supabase Realtime] -> [useRealtimeSync hook] -> [React Query Invalidation]
                              |
                    [Deduplicacao global]
                    [Map<key, timestamp>]
                    [TTL: 5 segundos]
```

Tabelas com realtime: `deals`, `contacts`, `activities`, `boards`, `board_stages`, `prospecting_queues`, `prospecting_saved_queues`, `prospecting_daily_goals`, `organization_settings`.

---

## 5. Analise de Dependencias

### 5.1 Dependencias de Producao (35 pacotes)

**Core Framework:**
- `next: ^15.5.12` - Framework fullstack
- `react: 19.2.1` / `react-dom: 19.2.1` - Versoes fixas (sem ^)
- `typescript: ^5` - Tipagem

**UI:**
- 15 pacotes Radix UI (componentes headless)
- `lucide-react`, `framer-motion`, `class-variance-authority`, `clsx`, `tailwind-merge`
- `recharts` (graficos), `jspdf` (PDFs), `react-markdown`

**Estado:**
- `@tanstack/react-query: ^5.90.12`, `zustand: ^5.0.9`, `immer: ^11.0.1`

**Backend:**
- `@supabase/supabase-js: ^2.87.1`, `@supabase/ssr: ^0.8.0`, `pg: ^8.16.3`

**IA:**
- `ai: ^6.0.72`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/react`

**Formularios:**
- `react-hook-form: ^7.68.0`, `@hookform/resolvers: ^5.2.2`, `zod: ^4.1.13`

**Outros:**
- `@sentry/nextjs: ^10.39.0`, `date-fns: ^4.1.0`, `libphonenumber-js`, `focus-trap-react`, `server-only`

### 5.2 Dependencias de Desenvolvimento (15 pacotes)

- Vitest + @vitejs/plugin-react + @vitest/coverage-v8
- Testing Library (react, jest-dom, user-event)
- ESLint + eslint-config-next
- Tailwind CSS + PostCSS
- @faker-js/faker, happy-dom, axe-core, vitest-axe

### 5.3 Alertas de Dependencias

| Pacote | Status | Risco | Acao Recomendada |
|--------|--------|-------|------------------|
| `zod: ^4.1.13` | Zod v4 (recem-lancado) | MEDIO | Monitorar breaking changes; v4 tem API diferente de v3 |
| `ai: ^6.0.72` | Atualizavel para ^6.0.111 | BAIXO | Atualizar para ultima minor |
| `@ai-sdk/google: ^3.0.21` | Atualizavel para ^3.0.37 | BAIXO | Atualizar |
| `@ai-sdk/openai: ^3.0.25` | Atualizavel para ^3.0.39 | BAIXO | Atualizar |
| `@ai-sdk/anthropic: ^3.0.37` | Atualizavel para ^3.0.54 | BAIXO | Atualizar |
| `@ai-sdk/react: ^3.0.74` | Atualizavel para ^3.0.113 | BAIXO | Atualizar |
| `@sentry/nextjs: ^10.39.0` | v10 (major recente) | BAIXO | Verificar changelog |
| `react: 19.2.1` (fixo) | Sem ^ (versao pinada) | INFO | Intencional para estabilidade |

---

## 6. Pontos de Integracao

### 6.1 Supabase (Principal)

| Servico | Uso | Arquivos-Chave |
|---------|-----|----------------|
| Auth | Login/logout, sessao, refresh via middleware | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts` |
| Database (PostgreSQL) | CRUD completo, RLS, RPCs | `lib/supabase/*.ts` (13 service modules) |
| Realtime | Sync multi-usuario | `lib/realtime/useRealtimeSync.ts` |
| Storage | Arquivos de deals | `lib/supabase/dealFiles.ts` |
| Edge Functions | Funcoes serverless | `supabase/functions/` |

**Ambientes:**
- Producao: `fkfqwxjrgfuerysaxayr` (Oregon)
- Staging: `xbwbwnevtpmmehgxfvcp` (Sao Paulo)
- Local: `localhost:54321`

### 6.2 Provedores de IA

| Provider | Default Model | Fallback | Config |
|----------|--------------|----------|--------|
| Google (Gemini) | gemini-2.5-flash | N/A | API key em `organization_settings` |
| OpenAI | gpt-4o | Retry com fallback em 429/5xx | API key em `organization_settings` |
| Anthropic | claude-sonnet-4-6 | N/A | API key em `organization_settings` |

**Nota:** O provider e modelo sao configuraveis por organizacao via `organization_settings` no Supabase.

### 6.3 Vercel

- Deploy automatico via Git push
- Preview deployments por branch (usa staging Supabase)
- Producao em merge para `main` (usa producao Supabase)
- Environment variables gerenciadas no Vercel dashboard

### 6.4 Sentry

- Error tracking condicional (so ativa se `NEXT_PUBLIC_SENTRY_DSN` esta definido)
- Client, server e edge configs separados
- Session replay para debug em producao

### 6.5 GitHub Actions (CI)

4 jobs paralelos com dependencia:
```
lint ─────┐
typecheck ─┤─→ build
test ──────┘
```

### 6.6 API Publica

- REST API em `/api/public/v1/`
- Autenticacao via API key
- Rate limiting: 60 req/min por IP (in-memory sliding window)
- OpenAPI spec em `lib/public-api/openapi.ts` (27K linhas)
- Cursor-based pagination
- Input sanitization

---

## 7. Configuracao

### 7.1 Variaveis de Ambiente

**Obrigatorias:**
- `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`) - Chave publica
- `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`) - Chave de servico (server-only)

**Opcionais:**
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` - Sentry
- `INSTALLER_ENABLED`, `INSTALLER_TOKEN` - Wizard de instalacao
- `ALLOW_AI_TEST_ROUTE` - Habilita rota de teste IA
- `ALLOW_UI_MOCKS_ROUTE` - Habilita paginas mock (labs)
- `AI_TOOL_APPROVAL_BYPASS` - Bypass aprovacao de tools IA
- `AI_TOOL_CALLS_DEBUG` - Log de tool calls IA
- `NEXT_PUBLIC_DEBUG_REALTIME` - Log de eventos realtime

### 7.2 Configuracoes de Build

- **next.config.ts**: `optimizePackageImports` para lucide-react, recharts, date-fns
- **Turbopack**: Habilitado para dev (`next dev --turbopack`)
- **ESLint**: `@typescript-eslint/no-explicit-any: off`, `react-hooks/exhaustive-deps: off`, ban `<button>` em favor de `<Button>`
- **Vitest**: `happy-dom` environment, 60s timeout, `@/` path alias

---

## 8. Inventario de Debito Tecnico

### 8.1 CRITICO

#### DT-001: CRMContext Monolito (930 linhas)

**Arquivo:** `context/CRMContext.tsx`
**Descricao:** Contexto monolitico que agrega deals, contacts, activities, boards, AI config, settings, custom fields, tags, e estado de UI em uma unica interface de ~180 propriedades. Qualquer mudanca causa re-render em todos os consumidores.
**Impacto:** Performance (re-renders desnecessarios), manutenibilidade (arquivo enorme), acoplamento alto.
**Mitigacao em andamento:** Contexts especializados ja existem (DealsContext, ContactsContext, etc.) mas CRMContext ainda e amplamente usado como camada de compatibilidade.
**Recomendacao:** Migrar consumidores restantes para hooks especializados (useDeals, useContacts, etc.) e eventualmente remover CRMContext.

#### DT-002: BASE_INSTRUCTIONS Hardcoded no crmAgent.ts

**Arquivo:** `lib/ai/crmAgent.ts:404-439`
**Descricao:** O system prompt do agente de IA e um template literal hardcoded que lista "15 ferramentas disponiveis" quando na verdade existem 27. O prompt ignora completamente o catalogo de prompts em `lib/ai/prompts/catalog.ts` e a tabela `ai_prompt_templates` no banco. Editar prompts no admin nao tem efeito no agente.
**Impacto:** IA desatualizada (nao conhece 12 tools), configuracao de prompts via admin nao funciona.
**Recomendacao:** Refatorar para usar `getResolvedPrompt('agent_crm_base_instructions')` do catalogo, e gerar lista de ferramentas dinamicamente a partir de `createCRMTools()`.

#### DT-003: ESLint `no-explicit-any: off`

**Arquivo:** `eslint.config.mjs:57`
**Descricao:** Regra `@typescript-eslint/no-explicit-any` desabilitada globalmente. Existem 209 ocorrencias de `any` em 51 arquivos dentro de `lib/`.
**Impacto:** Seguranca de tipos comprometida, bugs em runtime que TypeScript deveria pegar.
**Recomendacao:** Habilitar como `warn`, corrigir progressivamente, priorizar `lib/supabase/` e `lib/ai/`.

### 8.2 ALTO

#### DT-004: Modulo de Prospeccao Invisivel para a IA

**Descricao:** O modulo de prospeccao (`features/prospecting/` com 24 componentes, 7 hooks) nao possui nenhuma ferramenta de IA correspondente. O agente nao consegue interagir com filas de prospeccao, power dialer, metas diarias, scripts ou metricas.
**Arquivos afetados:** `lib/ai/tools/` (falta: prospecting-tools.ts), `lib/ai/crmAgent.ts`
**Impacto:** Funcionalidade de IA incompleta para o modulo mais ativo do sistema.
**Recomendacao:** Criar `lib/ai/tools/prospecting-tools.ts` com ferramentas para filas, metas, scripts e metricas.

#### DT-005: `property_ref` e `metadata` Invisiveis nas Tools

**Descricao:** Campos adicionados em migrations recentes (`property_ref` em deals - migration 20260303120000, `metadata` JSONB em activities - migration 20260303130000) nao estao expostos nas ferramentas de IA nem nas interfaces de busca/criacao.
**Impacto:** Dados existem no DB mas nao sao acessiveis via IA ou busca.
**Recomendacao:** Expor `property_ref` em deal-tools.ts e `metadata` em activity-tools.ts.

#### DT-006: Tipagem `any` no Supabase Client Export

**Arquivo:** `lib/supabase/client.ts:40`
**Descricao:** `export const supabase: SupabaseClient = createClient() as SupabaseClient` - cast para non-null de algo que pode ser null em dev sem `.env`. Se `createClient()` retorna null (env nao configurado), o cast silencia o erro e causa crash em runtime.
**Impacto:** Crash silencioso em ambientes sem configuracao Supabase.
**Recomendacao:** Manter o cast mas adicionar um assertion guard no topo dos service modules.

#### DT-007: Rate Limiter In-Memory

**Arquivo:** `lib/rate-limit.ts`
**Descricao:** Rate limiter usa `Map<string, number[]>` in-memory. Em deploy serverless (Vercel), cada invocacao pode ter uma instancia separada, tornando o rate limiting ineficaz.
**Impacto:** Rate limiting nao funciona de forma consistente em producao serverless.
**Recomendacao:** Migrar para rate limiting baseado em Redis/Upstash ou usar Vercel Edge Middleware com KV.

#### DT-008: `exhaustive-deps` Desabilitado

**Arquivo:** `eslint.config.mjs:63`
**Descricao:** `react-hooks/exhaustive-deps: off` desabilitado globalmente.
**Impacto:** Hooks com dependencias faltantes podem causar bugs de stale closure, re-renders infinitos ou efeitos que nao re-executam quando deveriam.
**Recomendacao:** Habilitar como `warn`, revisar e corrigir os casos existentes.

### 8.3 MEDIO

#### DT-009: Layout.tsx (505 linhas)

**Arquivo:** `components/Layout.tsx`
**Descricao:** Componente de layout principal com 505 linhas que inclui sidebar, navigation, e logica de responsividade misturados.
**Impacto:** Dificil de manter e testar.
**Recomendacao:** Extrair para componentes menores: Sidebar, TopBar, MobileNav.

#### DT-010: useRealtimeSync.ts (590 linhas)

**Arquivo:** `lib/realtime/useRealtimeSync.ts`
**Descricao:** Hook monolitico que gerencia subscricoes Realtime para 9 tabelas com logica de deduplicacao, query invalidation, e logging de debug.
**Impacto:** Complexo de debugar e testar (apenas 1 teste para presets).
**Recomendacao:** Extrair logica de deduplicacao e invalidacao para funcoes puras testadas separadamente.

#### DT-011: Enum WHATSAPP Faltando nas Activity Tools

**Arquivo:** `lib/ai/tools/activity-tools.ts`
**Descricao:** O enum de tipos de atividade no AI tools lista `['CALL','MEETING','EMAIL','TASK']` mas o sistema aceita `WHATSAPP` (usado no prompt e nos clientes).
**Impacto:** IA nao consegue criar ou buscar atividades do tipo WHATSAPP.
**Recomendacao:** Adicionar `'WHATSAPP'` ao schema da ferramenta.

#### DT-012: Quick Scripts Desconectados da IA

**Arquivo:** `lib/supabase/quickScripts.ts`, `lib/ai/tools/`
**Descricao:** Tabela `quick_scripts` existe com 6 categorias (followup, objection, closing, intro, rescue, other) mas nao ha ferramentas de IA para listar, sugerir ou usar scripts. `generateSalesScript` gera texto solto que nao persiste.
**Impacto:** IA nao consegue ajudar com scripts de vendas.
**Recomendacao:** Criar ferramenta IA para listagem e sugestao de scripts.

#### DT-013: Tags/Custom Fields em Contacts Sem Exposure nas Tools

**Descricao:** Tags e custom fields foram movidos de deals para contacts (migration 20260227220048) mas as tools de IA nao aceitam esses campos como input/filtro.
**Impacto:** IA nao pode filtrar contatos por tags ou campos customizados.
**Recomendacao:** Expor em contact-tools.ts.

#### DT-014: Lead Score Tool Existente mas Nao Mencionada no Prompt

**Descricao:** Tool `getLeadScore` existe mas o BASE_INSTRUCTIONS nao a menciona, entao o agente nao sabe que pode usar.
**Impacto:** Funcionalidade de lead scoring subutilizada.
**Recomendacao:** Incluir no prompt (ver DT-002).

#### DT-015: Pacotes AI SDK Desatualizados

**Descricao:** 6 pacotes AI SDK estao atras das ultimas versoes (incrementos minor).
**Impacto:** Potenciais bug fixes e melhorias nao aproveitados.
**Recomendacao:** Atualizar para ultimas minor versions.

#### DT-016: OpenAPI Spec Monolitica

**Arquivo:** `lib/public-api/openapi.ts` (27.7K linhas)
**Descricao:** Especificacao OpenAPI como um unico objeto TypeScript de 27K+ linhas.
**Impacto:** Extremamente dificil de manter e revisar.
**Recomendacao:** Separar em modulos por recurso (deals, contacts, boards) e compor.

### 8.4 BAIXO

#### DT-017: ProspectingPage.tsx (32K)

**Arquivo:** `features/prospecting/ProspectingPage.tsx`
**Descricao:** Componente de pagina com 32KB que orquestra 24 sub-componentes. Embora delegue bem para componentes filhos, e um arquivo grande.
**Impacto:** Complexidade visual alta.
**Recomendacao:** Extrair logica de orquestracao para um hook `useProspectingPage`.

#### DT-018: boards.ts Service Module (924 linhas)

**Arquivo:** `lib/supabase/boards.ts`
**Descricao:** Service module com 924 linhas contendo 209 ocorrencias de `any` e logica complexa de boards, stages, deal filtering e ordenacao.
**Impacto:** Tipagem fraca, logica complexa num unico arquivo.
**Recomendacao:** Separar em `boards-service.ts`, `stages-service.ts`, e melhorar tipagem.

#### DT-019: Sem Testes E2E

**Descricao:** Nao ha testes E2E (Playwright ou Cypress). O `.playwright-mcp/` existe para MCP browser automation mas nao para testes automatizados.
**Impacto:** Fluxos criticos (login, criar deal, mover no kanban) nao sao testados end-to-end.
**Recomendacao:** Implementar testes E2E para os 5 fluxos criticos.

#### DT-020: Dark Mode via Script Inline + Class Toggle

**Arquivo:** `app/layout.tsx:32-39`
**Descricao:** Dark mode implementado via script inline no `<head>` que le localStorage e remove classe `dark`. Funcional mas fragil e nao-padronizado.
**Impacto:** Flash de tema incorreto possivel, duplicacao de logica com ThemeContext.
**Recomendacao:** Consolidar via `next-themes` ou cookie-based theme detection.

#### DT-021: Deprecacoes Legado Acumuladas

**Arquivo:** `types/types.ts`
**Descricao:** Multiplos tipos marcados como `@deprecated`: `DealStatus` enum, `ContactStage` enum, `Lead` interface, `OrganizationId` type alias. O sistema migrou para modelos mais flexiveis (lifecycle stages, deal.isWon/isLost) mas os tipos antigos permanecem.
**Impacto:** Confusao para novos desenvolvedores, imports desnecessarios.
**Recomendacao:** Remover tipos deprecated em uma major version.

#### DT-022: Tailwind Config Residual

**Arquivo:** `tailwind.config.js`
**Descricao:** Config JS existe mas esta praticamente vazio (tema em `globals.css` via `@theme`). O sistema usa Tailwind v4 com config via CSS, tornando o arquivo JS redundante.
**Impacto:** Confusao sobre onde configurar Tailwind.
**Recomendacao:** Verificar se pode ser removido completamente (Tailwind v4 pode nao precisar dele).

---

## 9. Mapeamento de Testes

### 9.1 Distribuicao de Testes (65 arquivos)

| Area | Arquivos | Cobertura |
|------|----------|-----------|
| `features/prospecting/` | 25 | Excelente (componentes, hooks, utils) |
| `lib/` (a11y, ai, auth, public-api, query, realtime, security, stores, supabase, utils, validations) | 25 | Moderada (utilitarios cobertos, services parcial) |
| `test/` (globais) | 9 | Integracao (RBAC, multiTenant, rate-limit, middleware, salesTeamMatrix, publicApi, user stories) |
| `components/ui/` | 3 | Baixa (apenas ConfirmModal, FormField, Modal) |
| `hooks/` | 1 | Muito baixa (apenas useCRMActions guard) |
| `context/` | 1 | Muito baixa (apenas ToastContext) |
| `features/` (outros) | 1 | Muito baixa (apenas SettingsPage RBAC, DealDetailModal, cockpit-utils) |

### 9.2 Gaps de Teste Criticos

| Gap | Severidade | Descricao |
|-----|-----------|-----------|
| CRMContext | CRITICO | Contexto de 930 linhas sem nenhum teste |
| AuthContext | ALTO | Fluxos de autenticacao nao testados |
| useRealtimeSync | ALTO | Hook de 590 linhas com apenas 1 teste (presets) |
| crmAgent.ts | ALTO | Agent de IA sem testes unitarios (apenas integracao) |
| Layout.tsx | MEDIO | Componente de 505 linhas sem teste |
| Dashboard hooks | MEDIO | useDashboardMetrics sem teste |
| Server Actions | MEDIO | 4 server actions sem testes |
| Contacts feature | MEDIO | Feature complexa com 0 testes de componente |

---

## 10. Seguranca

### 10.1 Pontos Fortes

- **RLS 100%**: Todas as tabelas protegidas por Row Level Security no PostgreSQL
- **RBAC 3-tier**: admin > diretor > corretor com enforcement no DB
- **Middleware de autenticacao**: Refresh automatico de sessao, redirect para login
- **Setup guard**: Redireciona para `/setup` se instancia nao inicializada
- **sameOrigin check**: Validacao de origem para APIs internas
- **Rate limiting**: 60 req/min por IP na API publica
- **Input sanitization**: Sanitizacao na API publica
- **Server-only imports**: Uso de `server-only` para prevenir vazamento de credenciais

### 10.2 Preocupacoes

| Item | Severidade | Descricao |
|------|-----------|-----------|
| Rate limiter in-memory | ALTO | Ineficaz em serverless (DT-007) |
| API keys em organization_settings | MEDIO | Keys de IA armazenadas no Supabase sem encriptacao (protegidas por RLS) |
| `as SupabaseClient` cast | MEDIO | Cast unsafe pode causar crash (DT-006) |
| CSP headers ausentes | MEDIO | Nao ha Content-Security-Policy headers configurados |
| CORS nao explicitamente configurado | BAIXO | Next.js default CORS (same-origin); API publica pode precisar de headers CORS explicitos |

---

## 11. Performance

### 11.1 Otimizacoes Existentes

- **Turbopack**: Dev server com hot reload rapido
- **optimizePackageImports**: lucide-react, recharts, date-fns (economiza 15-25KB)
- **React Query cache**: Evita refetch desnecessario
- **Zustand selectors**: Re-render seletivo por slice de estado
- **Realtime deduplicacao**: Evita processamento duplicado de eventos
- **queryKeys factory**: Chaves de cache granulares para invalidacao seletiva
- **Sentry sourcemap deletion**: Sourcemaps deletados apos upload

### 11.2 Preocupacoes de Performance

| Item | Severidade | Descricao |
|------|-----------|-----------|
| CRMContext re-renders | ALTO | Contexto monolitico causa re-render em cascata (DT-001) |
| 10 providers aninhados | MEDIO | Cada provider pode causar re-render; porem usando `composeProviders` mitiga parcialmente |
| boards.ts queries complexas | MEDIO | Queries com joins em 924 linhas de service module |
| useRealtimeSync global | BAIXO | Subscricao unica para 9 tabelas; eficiente mas pode gerar eventos desnecessarios |

---

## 12. Recomendacoes

### 12.1 Prioridade Imediata (Sprint 1-2)

1. **[DT-002] Corrigir BASE_INSTRUCTIONS**: Integrar com catalogo de prompts, gerar lista de ferramentas dinamicamente, sincronizar com as 27 tools reais.
2. **[DT-004] Criar tools de IA para prospeccao**: O modulo mais ativo do sistema esta completamente invisivel para o agente.
3. **[DT-005] Expor property_ref e metadata**: Campos no DB que nao sao acessiveis via IA.
4. **[DT-015] Atualizar pacotes AI SDK**: Atualizacao segura (minor versions).

### 12.2 Prioridade Alta (Sprint 3-4)

5. **[DT-001] Planejar migracao do CRMContext**: Mapear consumidores, migrar para hooks especializados, medir impacto de performance.
6. **[DT-003] Habilitar no-explicit-any como warn**: Corrigir progressivamente, priorizar lib/supabase/.
7. **[DT-007] Migrar rate limiter**: Implementar rate limiting distribuido (Upstash/Redis).
8. **[DT-008] Habilitar exhaustive-deps como warn**: Revisar e corrigir hooks com dependencias faltantes.

### 12.3 Prioridade Media (Sprint 5-8)

9. **[DT-009] Refatorar Layout.tsx**: Extrair Sidebar, TopBar, MobileNav.
10. **[DT-010] Refatorar useRealtimeSync**: Extrair logica em funcoes puras testadas.
11. **[DT-011, DT-012, DT-013, DT-014] Completar exposure de features na IA**: WHATSAPP, quick scripts, tags/custom fields, lead score.
12. **[DT-016] Modularizar OpenAPI spec**: Separar por recurso.
13. **Aumentar cobertura de testes**: Priorizar CRMContext, AuthContext, crmAgent.ts, useRealtimeSync.

### 12.4 Prioridade Baixa (Backlog)

14. **[DT-019] Implementar testes E2E**: Playwright para fluxos criticos.
15. **[DT-020] Consolidar dark mode**: Usar `next-themes` ou cookie-based.
16. **[DT-021] Remover tipos deprecated**: Em proxima major version.
17. **[DT-022] Limpar tailwind.config.js residual**.
18. **CSP headers**: Implementar Content-Security-Policy.

---

## 13. Diagrama de Fluxo de Dados

```
                    ┌─────────────────────────────────────────────┐
                    │              BROWSER (PWA)                  │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
                    │  │ Features │  │ AI Chat  │  │ Kanban   │  │
                    │  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
                    │       │             │             │         │
                    │  ┌────▼─────────────▼─────────────▼─────┐  │
                    │  │     React Query + Zustand + Context    │  │
                    │  └────┬──────────────────────────┬──────┘  │
                    │       │                          │         │
                    │  ┌────▼──────┐          ┌───────▼──────┐  │
                    │  │ Realtime  │          │ Service      │  │
                    │  │ Sync      │          │ Workers      │  │
                    │  └────┬──────┘          └──────────────┘  │
                    └───────┼────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────────────┐
              │             │                     │
    ┌─────────▼──────┐ ┌────▼──────┐  ┌──────────▼──────┐
    │  Supabase      │ │ Next.js   │  │  Server Actions  │
    │  Realtime      │ │ API Routes│  │  (app/actions/)  │
    │  (WebSocket)   │ │ (68 endp) │  │  (4 modules)     │
    └────────────────┘ └────┬──────┘  └────────┬─────────┘
                            │                   │
                  ┌─────────▼───────────────────▼──────────┐
                  │              Supabase                    │
                  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌─────┐│
                  │  │ Auth │  │ DB   │  │ RLS  │  │Store││
                  │  │      │  │ (PG) │  │100%  │  │ age ││
                  │  └──────┘  └──────┘  └──────┘  └─────┘│
                  │       54 migrations, 39+ tabelas       │
                  └────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────────────┐
              │             │                     │
    ┌─────────▼──────┐ ┌────▼──────┐  ┌──────────▼──────┐
    │  Google AI     │ │  OpenAI   │  │  Anthropic      │
    │  (Gemini)      │ │  (GPT)   │  │  (Claude)       │
    └────────────────┘ └───────────┘  └─────────────────┘
```

---

## 14. Apendice: Ambiente de Desenvolvimento

### 14.1 Comandos Essenciais

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Build producao
npm test                 # Vitest (watch mode)
npm run test:run         # Vitest (single run)
npm run lint             # ESLint
npm run typecheck        # TypeScript check
npm run precheck         # lint + typecheck + test + build
npm run precheck:fast    # lint + typecheck + test (sem build)
```

### 14.2 Fluxo de Deploy

```
[Codigo] -> [Push branch] -> [Vercel Preview (staging DB)]
                                      |
                              [PR para main]
                                      |
                              [Merge] -> [Vercel Production (prod DB)]
```

### 14.3 Fluxo de Migrations

```
[Criar migration local] -> [supabase db push] -> [Staging DB]
                                                       |
                    [Validar] -> [supabase db push --db-url "prod_url"] -> [Prod DB]
```

---

*Documento gerado por @architect (Aria) - Brownfield Discovery Phase 1 v2*
*Arquitetando o futuro*
