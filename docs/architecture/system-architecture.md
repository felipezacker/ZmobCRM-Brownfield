# Arquitetura do Sistema - ZmobCRM (Brownfield Discovery Phase 1)

**Data:** 2026-02-23
**Agente:** @architect (Aria)
**Fase:** Brownfield Discovery - Phase 1
**Status:** Completo

---

## 1. Visao Geral

O ZmobCRM (internamente chamado "crmia-next") e um CRM de vendas multi-tenant com foco em pipeline kanban, agente de IA conversacional e API publica RESTful. Construido sobre Next.js 15 (App Router) com Supabase como backend (auth, DB PostgreSQL, RLS, realtime).

---

## 2. Stack Tecnologico

### 2.1 Frontend

| Tecnologia | Versao | Papel |
|---|---|---|
| Next.js | ^15.5.12 | Framework fullstack (App Router, RSC, Route Handlers) |
| React | 19.2.1 | Biblioteca de UI |
| React DOM | 19.2.1 | Renderizacao DOM |
| TypeScript | ^5 | Tipagem estatica |
| Tailwind CSS | ^4 | Estilizacao utility-first (v4 com @theme em CSS) |
| Radix UI | v1-v2 (multiplos) | Componentes headless acessiveis |
| Lucide React | ^0.560.0 | Icones |
| Framer Motion | ^12.23.26 | Animacoes |
| Recharts | ^3.5.1 | Graficos/dashboards |
| React Hook Form | ^7.68.0 | Formularios |
| Zod | ^4.1.13 | Validacao de schemas |

### 2.2 Estado Global

| Tecnologia | Versao | Papel |
|---|---|---|
| Zustand | ^5.0.9 | Stores globais (UI, Forms, Notifications) |
| TanStack React Query | ^5.90.12 | Cache de dados servidor, fetching |
| React Context | nativo | Contextos de dominio (CRM, Auth, Deals, Contacts, Boards, Activities, Settings, AI) |

### 2.3 Backend / Infraestrutura

| Tecnologia | Versao | Papel |
|---|---|---|
| Supabase JS | ^2.87.1 | Cliente do Supabase |
| Supabase SSR | ^0.8.0 | Integracao SSR (cookies, middleware) |
| PostgreSQL (Supabase) | - | Banco de dados com RLS |
| pg | ^8.16.3 | Driver PostgreSQL direto (possivel uso interno) |

### 2.4 IA / LLM

| Tecnologia | Versao | Papel |
|---|---|---|
| Vercel AI SDK | ^6.0.72 | Framework de agentes IA (ToolLoopAgent, streaming) |
| @ai-sdk/google | ^3.0.21 | Provider Google Gemini |
| @ai-sdk/openai | ^3.0.25 | Provider OpenAI |
| @ai-sdk/anthropic | ^3.0.37 | Provider Anthropic Claude |
| @ai-sdk/react | ^3.0.74 | Hooks React para chat UI |

### 2.5 Utilidades

| Tecnologia | Versao | Papel |
|---|---|---|
| date-fns | ^4.1.0 | Manipulacao de datas |
| Immer | ^11.0.1 | Estado imutavel |
| clsx / tailwind-merge / CVA | diversas | Utilidades CSS |
| jsPDF / jspdf-autotable | ^4.1.0 / ^5.0.2 | Geracao de PDF |
| libphonenumber-js | ^1.12.33 | Validacao de telefones |
| react-markdown / remark-gfm | ^10.1.0 / ^4.0.1 | Renderizacao de Markdown |
| @faker-js/faker | ^10.1.0 | Dados fake (WARNING: em dependencies, nao devDependencies) |
| server-only | ^0.0.1 | Guardrail de modulos server-only |
| focus-trap-react | ^11.0.4 | Trap de foco em modais (a11y) |

### 2.6 Dev / Testes

| Tecnologia | Versao | Papel |
|---|---|---|
| Vitest | ^4.0.0 | Runner de testes |
| Testing Library (React) | ^16.3.0 | Testes de componentes |
| Testing Library (jest-dom) | ^6.8.0 | Matchers DOM |
| Testing Library (user-event) | ^14.6.1 | Simulacao de eventos |
| axe-core / vitest-axe | ^4.10.3 / ^0.1.0 | Testes de acessibilidade |
| happy-dom | ^20.0.11 | Ambiente DOM para testes |
| ESLint | ^9 | Linting |
| eslint-config-next | 16.0.8 | Config ESLint Next.js |
| Vite | ^7.1.3 | Build para testes |

---

## 3. Estrutura de Pastas

```
ZmobCRM-Brownfield/
|-- app/                          # Next.js App Router
|   |-- (protected)/              # Route group autenticado
|   |   |-- layout.tsx            # Layout com providers (client component)
|   |   |-- page.tsx              # Pagina raiz protegida
|   |   |-- dashboard/            # Dashboard
|   |   |-- boards/               # Kanban boards
|   |   |-- contacts/             # Contatos + cockpit
|   |   |-- deals/                # Deals + cockpit + cockpit-v2
|   |   |-- inbox/                # Inbox de vendas
|   |   |-- activities/           # Atividades
|   |   |-- ai/                   # Chat IA standalone
|   |   |-- ai-test/              # Testes de IA
|   |   |-- decisions/            # Decisoes
|   |   |-- reports/              # Relatorios
|   |   |-- pipeline/             # Pipeline view
|   |   |-- profile/              # Perfil usuario
|   |   |-- settings/             # Configuracoes (geral, produtos, integracoes, AI)
|   |   |-- setup/                # Setup inicial
|   |   |-- labs/                 # Features experimentais (mock cockpits)
|   |-- api/                      # Route Handlers (API)
|   |   |-- ai/                   # Endpoints IA (chat, tasks: briefing, script, analyze, email, objections)
|   |   |-- chat/                 # Re-export de /api/ai/chat
|   |   |-- contacts/             # Import/export de contatos
|   |   |-- admin/                # Admin (users, invites)
|   |   |-- settings/             # Settings API (AI features, cockpit, prompts)
|   |   |-- mcp/                  # MCP endpoint
|   |   |-- setup-instance/       # Setup da instancia
|   |   |-- public/v1/            # API publica versionada (REST)
|   |       |-- contacts/         # CRUD contatos
|   |       |-- deals/            # CRUD deals + mark-won/lost + move-stage
|   |       |-- boards/           # Boards + stages
|   |       |-- activities/       # Atividades
|   |       |-- companies/        # Empresas
|   |       |-- me/               # Perfil autenticado
|   |       |-- docs/             # Documentacao da API
|   |       |-- openapi.json/     # Spec OpenAPI
|   |-- auth/callback/            # Callback OAuth Supabase
|   |-- install/                  # Fluxo de instalacao (wizard, start)
|   |-- join/                     # Convite para organizacao
|   |-- login/                    # Pagina de login
|-- components/                   # Componentes compartilhados
|   |-- ui/                       # Design system (Button, Card, Modal, Badge, Tabs, etc.)
|   |-- ai/                       # Componentes de chat IA (UIChat, RSCChat)
|   |-- navigation/               # Navegacao (sidebar, topbar)
|   |-- filters/                  # Filtros
|   |-- charts/                   # Graficos
|   |-- notifications/            # Notificacoes
|   |-- pwa/                      # Service Worker, InstallBanner
|   |-- debug/                    # Debug components
|   |-- Layout.tsx                # Shell principal
|   |-- AIAssistant.tsx           # Assistente IA flutuante
|   |-- ConfirmModal.tsx          # Modal de confirmacao
|   |-- ConsentModal.tsx          # Modal LGPD/consent
|   |-- OnboardingModal.tsx       # Onboarding
|   |-- PageLoader.tsx            # Loader de pagina
|   |-- MaintenanceBanner.tsx     # Banner de manutencao
|-- features/                     # Feature modules (dominio)
|   |-- activities/               # Feature de atividades
|   |-- ai-hub/                   # Hub de IA
|   |-- boards/                   # Feature de boards/kanban
|   |-- contacts/                 # Feature de contatos + cockpit
|   |-- dashboard/                # Feature de dashboard
|   |-- deals/                    # Feature de deals + cockpit + cockpit-v2
|   |-- decisions/                # Feature de decisoes
|   |-- inbox/                    # Feature de inbox (components/, hooks/)
|   |-- profile/                  # Feature de perfil
|   |-- reports/                  # Feature de relatorios
|   |-- settings/                 # Feature de configuracoes (components/, hooks/)
|-- context/                      # React Contexts
|   |-- AuthContext.tsx            # Autenticacao
|   |-- CRMContext.tsx             # Contexto unificado (legado/compat)
|   |-- AIContext.tsx              # Estado IA
|   |-- AIChatContext.tsx          # Chat IA
|   |-- ThemeContext.tsx           # Tema dark/light
|   |-- ToastContext.tsx           # Toasts
|   |-- deals/DealsContext.tsx     # Deals
|   |-- contacts/ContactsContext.tsx  # Contatos
|   |-- boards/BoardsContext.tsx   # Boards
|   |-- activities/ActivitiesContext.tsx  # Atividades
|   |-- settings/SettingsContext.tsx  # Configuracoes
|-- hooks/                        # Hooks compartilhados
|   |-- useAIEnabled.ts           # Toggle AI
|   |-- useConsent.ts             # LGPD consent
|   |-- useFirstVisit.ts          # Primeira visita
|   |-- useIdleTimeout.ts         # Timeout de inatividade
|   |-- useOrganizationMembers.ts # Membros da org
|   |-- usePersistedState.ts      # Estado persistido em localStorage
|   |-- useReassignContactWithDeals.ts  # Reatribuicao
|   |-- useResponsiveMode.ts      # Responsividade
|   |-- useSpeechRecognition.ts   # Reconhecimento de voz
|   |-- useSystemNotifications.ts # Notificacoes do sistema
|   |-- useTags.ts                # Tags
|-- lib/                          # Bibliotecas/utilidades
|   |-- supabase/                 # Clientes Supabase (client, server, middleware, admin)
|   |-- ai/                       # Logica IA (config, agent, tools, prompts, tasks, features)
|   |-- auth/                     # Autorizacao (roles.ts)
|   |-- security/                 # Seguranca (sameOrigin.ts)
|   |-- public-api/               # Logica da API publica (auth, cursor, openapi, sanitize, resolve)
|   |-- realtime/                 # Supabase Realtime hooks (sync, presets)
|   |-- stores/                   # Zustand stores (UI, Form, Notification)
|   |-- query/                    # React Query config + query keys
|   |-- forms/                    # Utilidades de formularios
|   |-- validations/              # Schemas de validacao
|   |-- fetch/                    # Fetch utilities
|   |-- consent/                  # Logica LGPD
|   |-- debug/                    # Debug utilities
|   |-- mcp/                      # MCP integration
|   |-- installer/                # Logica de instalacao
|   |-- templates/                # Templates
|   |-- a11y/                     # Acessibilidade
|   |-- phone.ts                  # Formatacao de telefone
|   |-- prefetch.ts               # Prefetch de dados
|   |-- utils.ts                  # Utilidades gerais
|-- types/                        # Tipos TypeScript
|   |-- ai.ts                     # Tipos IA
|   |-- aiActions.ts              # Tipos de acoes IA
|   |-- types.ts                  # Tipos gerais do CRM
|   |-- index.ts                  # Re-exports
|-- supabase/                     # Supabase local
|   |-- config.toml               # Config do Supabase CLI
|   |-- migrations/               # 6 migration files
|   |-- functions/                # Edge Functions
|   |-- snippets/                 # SQL snippets
|   |-- reset.sql                 # Script de reset
|-- test/                         # Testes
|   |-- helpers/                  # Helpers de teste
|   |-- stories/                  # Testes de stories AIOS
|   |-- setup.ts                  # Setup de testes
|   |-- setup.dom.ts              # Setup DOM
|   |-- *.test.ts                 # Testes unitarios
|-- public/                       # Assets estaticos
|-- proxy.ts                      # Next.js 16+ Proxy (antigo middleware.ts)
|-- next.config.ts                # Configuracao Next.js
|-- tailwind.config.js            # Configuracao Tailwind v4
|-- tsconfig.json                 # Configuracao TypeScript
|-- vitest.config.ts              # Configuracao Vitest
|-- eslint.config.mjs             # Configuracao ESLint flat config
|-- postcss.config.mjs            # PostCSS config
```

---

## 4. Padroes de Codigo

### 4.1 Arquitetura de Componentes

- **Feature-based organization**: Cada dominio (deals, contacts, boards, inbox, settings) tem pasta propria em `features/` com componentes, hooks e logica especifica.
- **Convencao de Client Components**: 37 arquivos usam `'use client'` explicitamente. Paginas em `app/(protected)/` sao predominantemente client components.
- **Nenhum `'use server'` encontrado**: Nao ha Server Actions. Toda comunicacao server-side usa Route Handlers (`app/api/`).
- **Route Group `(protected)`**: Encapsula rotas autenticadas com layout que empilha providers.

### 4.2 Gerenciamento de Estado (Hibrido)

O projeto usa uma abordagem hibrida com 3 camadas:

1. **React Context** (dominio): `CRMContext`, `DealsContext`, `ContactsContext`, `BoardsContext`, `ActivitiesContext`, `SettingsContext`, `AuthContext`, `AIContext`, `AIChatContext`, `ThemeContext`, `ToastContext`
2. **Zustand Stores** (UI efemera): `useUIStore`, `useFormStore`, `useNotificationStore`
3. **TanStack React Query** (dados servidor): Cache de queries com invalidacao

O `CRMContext` atua como contexto "legado/compatibilidade" que agrega todos os subcontextos. Novos desenvolvimentos devem usar hooks especificos diretamente.

### 4.3 Padroes de Supabase

- **Cliente browser** (`lib/supabase/client.ts`): Singleton com `createBrowserClient`, verifica se Supabase esta configurado.
- **Cliente server** (`lib/supabase/server.ts`): Para Route Handlers e Server Components.
- **Cliente admin** (`lib/supabase/staticAdminClient.ts`): Service role, sem cookies. Usado pelas AI tools para bypass de RLS.
- **Proxy/middleware** (`proxy.ts` + `lib/supabase/middleware.ts`): Refresh de sessao, redirect para login, guard de setup.
- **RLS habilitado** em todas as tabelas principais.

### 4.4 Padroes de IA

- **Agente CRM** (`lib/ai/crmAgent.ts`): ToolLoopAgent do AI SDK v6 com 25+ ferramentas.
- **Multi-provider**: Google Gemini, OpenAI, Anthropic - configuravel por organizacao.
- **Tool approval**: Acoes destrutivas (mover deal, criar deal, etc.) requerem aprovacao no UI. Bypass via `AI_TOOL_APPROVAL_BYPASS=true`.
- **Multi-tenant isolation**: Todas as tools filtram por `organization_id`.
- **Streaming**: `createAgentUIStreamResponse` para respostas em tempo real.

### 4.5 API Publica

- **Versionada**: `/api/public/v1/`
- **RESTful**: Endpoints CRUD para contacts, deals, boards, stages, activities, companies
- **OpenAPI spec**: Endpoint `/api/public/v1/openapi.json`
- **Paginacao cursor-based**: Via `lib/public-api/cursor.ts`

### 4.6 Realtime

- **Supabase Realtime**: Hooks customizados (`useRealtimeSync`, `useRealtimeSyncKanban`)
- **Presets**: Configuracoes pre-definidas para tabelas monitoradas

---

## 5. Modelo de Dados (Tabelas Principais)

Baseado na migration `schema_init.sql`:

| Tabela | Descricao |
|---|---|
| `organizations` | Organizacoes (multi-tenant) |
| `organization_settings` | Config por org (AI provider, keys, toggles) |
| `profiles` | Usuarios (estende `auth.users`) |
| `boards` | Boards/pipelines kanban |
| `board_stages` | Estagios de cada board |
| `contacts` | Contatos/leads |
| `deals` | Negocios/oportunidades |
| `deal_notes` | Notas em deals |
| `deal_files` | Arquivos em deals |
| `activities` | Atividades (calls, meetings, emails, tasks) |
| `lifecycle_stages` | Estagios de lifecycle (global) |
| `products` | Catalogo de produtos |
| `quick_scripts` | Scripts rapidos de vendas |

**Extensoes PostgreSQL**: `uuid-ossp`, `pgcrypto`, `unaccent`, `pg_net`

**Migrations**: 6 arquivos, incluindo schema init consolidado, indices de performance, RBAC corretor/diretor, RLS protect owner_id, e RPC para reatribuicao.

---

## 6. Pontos de Integracao

### 6.1 Supabase
- **Auth**: Login, signup, OAuth callback, session refresh via proxy
- **Database**: PostgreSQL com RLS, queries via `supabase-js`
- **Realtime**: Subscriptions para sync multi-usuario
- **RPC**: `is_instance_initialized`, `reassign_contact_with_deals`
- **Edge Functions**: Diretorio `supabase/functions/` presente

### 6.2 AI SDKs (Vercel AI SDK v6)
- **Google Gemini**: Provider primario default
- **OpenAI GPT-4o**: Provider alternativo
- **Anthropic Claude**: Provider alternativo
- **Streaming**: `createAgentUIStreamResponse` para chat em tempo real
- **25+ Tools**: Pipeline analysis, deal CRUD, contact CRUD, activities, stages

### 6.3 API Publica
- REST versionada (`/api/public/v1/`)
- OpenAPI spec auto-gerada
- Autenticacao via `lib/public-api/auth.ts`

### 6.4 PWA
- Service Worker (`components/pwa/ServiceWorkerRegister.tsx`)
- Install Banner (`components/pwa/InstallBanner.tsx`)
- Manifest webmanifest

### 6.5 Webhooks
- Secao de webhooks em settings (`features/settings/components/WebhooksSection.tsx`)
- `pg_net` para webhooks async do PostgreSQL

---

## 7. Configuracoes

### 7.1 Variaveis de Ambiente

**Obrigatorias para funcionamento:**
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (para AI tools admin client)

**AI providers (configurados por org em organization_settings):**
- Chaves AI sao armazenadas no banco, nao em env vars

**Opcionais (env):**
- `AI_TOOL_APPROVAL_BYPASS` - Bypass de aprovacao de tools IA
- `AI_TOOL_CALLS_DEBUG` - Debug de chamadas de tools
- `NODE_ENV` - Ambiente

**Definidas em `.env.example` mas nao usadas diretamente no app:**
- `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `EXA_API_KEY`, `CONTEXT7_API_KEY`
- `GITHUB_TOKEN`, `CLICKUP_API_KEY`
- `N8N_API_KEY`, `N8N_WEBHOOK_URL`
- `SENTRY_DSN`
- `RAILWAY_TOKEN`, `VERCEL_TOKEN`

### 7.2 Next.js Config
- Turbopack habilitado
- `optimizePackageImports` para lucide-react, recharts, date-fns, @radix-ui/react-icons
- Custom headers para `sw.js` (no-cache)

### 7.3 TypeScript Config
- **`strict: false`** (com TODO para habilitar apos migracao)
- `strictNullChecks: true` (habilitado separadamente)
- Target ES2017, module esnext, bundler resolution
- Path alias `@/*`

### 7.4 Tailwind Config
- v4 com CSS @theme (arquivo JS mantido para compatibilidade de content scanning)
- Dark mode via classe
- Paleta customizada (primary blue, dark bg)
- Fontes: Inter, Space Grotesk, Cinzel

### 7.5 Deploy
- Diretorio `.vercel/` presente - deploy na Vercel
- `proxy.ts` compativel com Next.js 16+

---

## 8. Debitos Tecnicos Identificados

### 8.1 CRITICO

| ID | Debito | Impacto | Localizacao |
|---|---|---|---|
| TD-001 | **`strict: false` no tsconfig.json** | Erros de tipo nao detectados em compilacao. Apenas `strictNullChecks` esta habilitado. | `tsconfig.json:11` |
| TD-002 | **`@faker-js/faker` em dependencies (nao devDependencies)** | Biblioteca de 3MB+ incluida no bundle de producao. | `package.json:23` |
| TD-003 | **Admin client (service role) bypassa RLS** | `staticAdminClient.ts` usa service role key para todas as AI tools. Qualquer bug nas tools pode vazar dados entre tenants. | `lib/supabase/staticAdminClient.ts`, `lib/ai/tools.ts` |
| TD-004 | **Cobertura de testes baixa** | Apenas ~29 arquivos de teste para ~404 arquivos de codigo TS/TSX (~7%). Areas criticas como AI tools, API publica e contextos tem cobertura minima. | `test/`, `components/`, `features/` |

### 8.2 ALTO

| ID | Debito | Impacto | Localizacao |
|---|---|---|---|
| TD-005 | **Duplicacao de estado: Context API + Zustand** | O sistema usa ambos para gerenciamento de estado, com `CRMContext` como camada de compatibilidade. Isso gera re-renders desnecessarios e complexidade. | `context/`, `lib/stores/` |
| TD-006 | **Todas as paginas protegidas sao client components** | `app/(protected)/layout.tsx` e `'use client'`, forcando todas as subpaginas a serem client-rendered. Perde beneficios de SSR/streaming. | `app/(protected)/layout.tsx` |
| TD-007 | **Nenhum Server Action utilizado** | Toda comunicacao server-side usa Route Handlers, perdendo beneficios de Server Actions (forms, progressive enhancement). | Projeto inteiro |
| TD-008 | **Tools IA tem logica SQL inline massiva** | Arquivo `lib/ai/tools.ts` com 1648 linhas. Logica de negocio misturada com definicoes de ferramentas. | `lib/ai/tools.ts` |
| TD-009 | **Cockpit v2 coexiste com v1** | Duas versoes do cockpit de deals em paralelo (`cockpit/` e `cockpit-v2/`), indicando refatoracao incompleta. | `app/(protected)/deals/[dealId]/` |
| TD-010 | **Supabase keys tratadas como string null** | API keys de AI providers armazenadas como texto plano em `organization_settings`. Sem criptografia em repouso. | `supabase/migrations/schema_init.sql` |

### 8.3 MEDIO

| ID | Debito | Impacto | Localizacao |
|---|---|---|---|
| TD-011 | **Provider nesting profundo** | Layout protegido empilha 7+ providers (Query, Toast, Theme, Auth, CRM, AI, Layout). | `app/(protected)/layout.tsx` |
| TD-012 | **Endpoint `/api/chat` e re-export** | `app/api/chat/route.ts` apenas re-exporta `app/api/ai/chat/route.ts`. Rota duplicada sem necessidade clara. | `app/api/chat/route.ts` |
| TD-013 | **`any` casts extensivos** | Uso frequente de `as any` em tools.ts, contextos e route handlers. | Projeto inteiro |
| TD-014 | **Labs com mocks em producao** | Diretorio `labs/` com mocks de deal cockpit acessiveis em routes protegidas. | `app/(protected)/labs/` |
| TD-015 | **Import de React no final do arquivo** | `lib/stores/index.ts` importa React na linha 371, apos uso em hooks. | `lib/stores/index.ts:371` |
| TD-016 | **Tipo `pg` em dependencies** | Driver PostgreSQL direto (`pg`) como dependencia, mas projeto usa Supabase JS. Possivel dependencia orfao ou uso pontual nao mapeado. | `package.json` |
| TD-017 | **Sem rate limiting na API publica** | Endpoints `/api/public/v1/` nao tem rate limiting visivel. | `app/api/public/v1/` |
| TD-018 | **Ausencia de monitoring/observability** | `SENTRY_DSN` esta no .env.example mas nao ha integracao de Sentry no codigo. | Projeto inteiro |
| TD-019 | **Validacoes Zod v4** | Zod ^4.1.13 e relativamente novo e pode ter breaking changes vs v3 que e mais estavel. | `package.json` |
| TD-020 | **eslint-config-next versao divergente** | eslint-config-next 16.0.8 enquanto Next.js e 15.5.12 - versoes desalinhadas. | `package.json` |

### 8.4 BAIXO

| ID | Debito | Impacto | Localizacao |
|---|---|---|---|
| TD-021 | **`tsconfig 2.tsbuildinfo` na raiz** | Arquivo de build incremental duplicado (provavel artefato). | Raiz do projeto |
| TD-022 | **`.DS_Store` em `context/`** | Artefato macOS commitado. | `context/.DS_Store` |
| TD-023 | **Tailwind config JS com Tailwind v4** | Configuracao JS mantida para "legacy compatibility" mas Tailwind v4 usa CSS @theme. Potencial conflito. | `tailwind.config.js` |

---

## 9. Metricas do Codebase

| Metrica | Valor |
|---|---|
| Total de arquivos TS/TSX | ~404 |
| Arquivos de teste | ~29 (~7% cobertura de arquivos) |
| Client Components (`'use client'`) | 37 |
| Server Actions (`'use server'`) | 0 |
| Route Handlers (API) | ~30+ endpoints |
| Supabase Migrations | 6 |
| Tabelas principais | ~13 |
| AI Tools | 25+ |
| React Contexts | 11 |
| Zustand Stores | 3 |
| Custom Hooks | 11 (compartilhados) + varios em features |

---

## 10. Diagramas de Dependencia

### 10.1 Fluxo de Autenticacao

```
Browser → proxy.ts → lib/supabase/middleware.ts → Supabase Auth
                                                     ↓
                                              Cookie refresh
                                                     ↓
                                         Redirect /login (se nao auth)
                                         Redirect /setup (se nao init)
```

### 10.2 Fluxo do Agente IA

```
UIChat (client) → POST /api/ai/chat → Auth check (Supabase)
                                         ↓
                                    Profile + org_settings
                                         ↓
                                    getModel(provider, apiKey, modelId)
                                         ↓
                                    createCRMAgent(context, tools)
                                         ↓
                                    createAgentUIStreamResponse
                                         ↓
                                    Tools executam via staticAdminClient
                                    (service role, bypass RLS)
```

### 10.3 Hierarquia de Providers

```
QueryProvider
  └── ToastProvider
       └── ThemeProvider
            └── AuthProvider
                 └── CRMProvider
                      └── AIProvider
                           └── Layout (shell)
                                └── Page content
```

---

## 11. Recomendacoes Prioritarias

1. **Habilitar `strict: true`** no tsconfig.json e corrigir erros de tipo gradualmente
2. **Mover `@faker-js/faker` para devDependencies** imediatamente
3. **Extrair logica de negocio das AI tools** em services separados (SRP)
4. **Migrar de Context legado para hooks especificos** (eliminar CRMContext)
5. **Adicionar testes para AI tools e API publica** (areas de maior risco)
6. **Implementar rate limiting** na API publica
7. **Criptografar API keys no banco** ou usar Supabase Vault
8. **Resolver cockpit v1/v2** - escolher uma versao e remover a outra
9. **Considerar SSR para paginas protegidas** onde possivel
10. **Integrar Sentry** para monitoring em producao

---

*Documento gerado por @architect (Aria) - Brownfield Discovery Phase 1*
*Synkra AIOS v2.2.0*
