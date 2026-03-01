# Technical Debt Assessment - DRAFT

> **Projeto:** ZmobCRM (CRMIA)
> **Data:** 2026-02-23
> **Fase:** Brownfield Discovery - Phase 4
> **Agente:** @architect (Aria)
> **Status:** DRAFT - Pendente revisao de especialistas

## Para Revisao dos Especialistas

Este documento consolida todos os debitos tecnicos identificados nas fases 1-3 do Brownfield Discovery:
- **Phase 1** (@architect): `docs/architecture/system-architecture.md` - 23 debitos de sistema
- **Phase 2** (@data-engineer): `supabase/docs/DB-AUDIT.md` - 13 achados de banco de dados
- **Phase 3** (@ux-design-expert): `docs/frontend/frontend-spec.md` - 10 debitos de frontend

---

## 1. Debitos de Sistema

Consolidados a partir de `system-architecture.md` (Phase 1).

### 1.1 CRITICO

| ID | Debito | Descricao | Impacto | Localizacao | Esforço Est. (h) |
|---|---|---|---|---|---|
| TD-001 | `strict: false` no tsconfig.json | TypeScript sem modo strict. Apenas `strictNullChecks` habilitado. Erros de tipo nao detectados em compilacao. | Bugs silenciosos em producao | `tsconfig.json:11` | 40-80 |
| TD-002 | `@faker-js/faker` em dependencies | Biblioteca de 3MB+ incluida no bundle de producao em vez de devDependencies. | Bundle inflado, tempo de carregamento aumentado | `package.json:23` | 1 |
| TD-003 | Admin client (service role) bypassa RLS | `staticAdminClient.ts` usa service role key para TODAS as AI tools. Qualquer bug nas tools pode vazar dados entre tenants. | Vazamento de dados cross-tenant | `lib/supabase/staticAdminClient.ts`, `lib/ai/tools.ts` | 24-40 |
| TD-004 | Cobertura de testes baixa (~7%) | Apenas ~29 arquivos de teste para ~404 arquivos de codigo. Areas criticas (AI tools, API publica, contextos) com cobertura minima. | Regressoes nao detectadas, deploy arriscado | `test/`, `components/`, `features/` | 120-200 |

### 1.2 ALTO

| ID | Debito | Descricao | Impacto | Localizacao | Esforço Est. (h) |
|---|---|---|---|---|---|
| TD-005 | Duplicacao de estado: Context + Zustand | Sistema usa Context API e Zustand simultaneamente com `CRMContext` como camada de compatibilidade. | Re-renders desnecessarios, complexidade | `context/`, `lib/stores/` | 40-60 |
| TD-006 | Paginas protegidas todas client components | `app/(protected)/layout.tsx` e `'use client'`, forcando todas subpaginas a serem client-rendered. | Perda de SSR/streaming, SEO e performance | `app/(protected)/layout.tsx` | 24-40 |
| TD-007 | Nenhum Server Action utilizado | Toda comunicacao server-side usa Route Handlers. Perde beneficios de Server Actions (forms, progressive enhancement). | Experiencia degradada sem JS | Projeto inteiro | 16-32 |
| TD-008 | Tools IA com logica SQL inline massiva | `lib/ai/tools.ts` com 1648 linhas. Logica de negocio misturada com definicoes de ferramentas. | Impossivel testar, manter ou auditar | `lib/ai/tools.ts` | 32-48 |
| TD-009 | Cockpit v2 coexiste com v1 | Duas versoes do cockpit de deals em paralelo, indicando refatoracao incompleta. | Confusao, manutencao duplicada | `app/(protected)/deals/[dealId]/` | 16-24 |
| TD-010 | API keys de AI em texto plano | Chaves de providers IA armazenadas como TEXT plano em `organization_settings`. Sem criptografia em repouso. | Exposicao em caso de dump/leak | `supabase/migrations/schema_init.sql` | 16-24 |

### 1.3 MEDIO

| ID | Debito | Descricao | Impacto | Localizacao | Esforço Est. (h) |
|---|---|---|---|---|---|
| TD-011 | Provider nesting profundo | Layout protegido empilha 7+ providers. | Complexidade, debugging dificil | `app/(protected)/layout.tsx` | 8-16 |
| TD-012 | Endpoint `/api/chat` e re-export | Re-exporta `/api/ai/chat`. Rota duplicada sem necessidade. | Confusao, rota orfao | `app/api/chat/route.ts` | 1-2 |
| TD-013 | `any` casts extensivos | Uso frequente de `as any` em tools.ts, contextos e route handlers. | Tipagem comprometida | Projeto inteiro | 16-24 |
| TD-014 | Labs com mocks em producao | Diretorio `labs/` com mocks acessiveis em routes protegidas. | Dados falsos em producao | `app/(protected)/labs/` | 2-4 |
| TD-015 | Import de React no final do arquivo | `lib/stores/index.ts` importa React na linha 371, apos uso em hooks. | Potencial erro em runtime | `lib/stores/index.ts:371` | 1 |
| TD-016 | Tipo `pg` em dependencies | Driver PostgreSQL direto como dependencia, mas projeto usa Supabase JS. Possivel orfao. | Dependencia desnecessaria | `package.json` | 1-2 |
| TD-017 | Sem rate limiting na API publica | Endpoints `/api/public/v1/` nao tem rate limiting visivel. | Vulnerabilidade a abuso/DDoS | `app/api/public/v1/` | 8-16 |
| TD-018 | Ausencia de monitoring/observability | `SENTRY_DSN` no .env.example mas sem integracao no codigo. | Sem visibilidade de erros em producao | Projeto inteiro | 8-16 |
| TD-019 | Zod v4 (relativamente novo) | Zod ^4.1.13 pode ter breaking changes vs v3 mais estavel. | Risco de incompatibilidade | `package.json` | 4-8 |
| TD-020 | eslint-config-next versao divergente | eslint-config-next 16.0.8 enquanto Next.js e 15.5.12. | Regras de lint inconsistentes | `package.json` | 1-2 |

### 1.4 BAIXO

| ID | Debito | Descricao | Impacto | Localizacao | Esforço Est. (h) |
|---|---|---|---|---|---|
| TD-021 | `tsconfig 2.tsbuildinfo` na raiz | Arquivo de build incremental duplicado (artefato). | Poluicao do repositorio | Raiz do projeto | 0.5 |
| TD-022 | `.DS_Store` em `context/` | Artefato macOS commitado. | Poluicao do repositorio | `context/.DS_Store` | 0.5 |
| TD-023 | Tailwind config JS com Tailwind v4 | Config JS mantida para "legacy compatibility" mas Tailwind v4 usa CSS @theme. | Potencial conflito de configuracao | `tailwind.config.js` | 2-4 |

---

## 2. Debitos de Database

Consolidados a partir de `DB-AUDIT.md` (Phase 2).

> **PENDENTE:** Revisao do @data-engineer para validar estimativas de esforco e confirmar prioridades.

### 2.1 CRITICO

| ID | Debito | Descricao | Impacto | Esforço Est. (h) |
|---|---|---|---|---|
| DB-001 | RLS permissiva em audit_logs | Politica `USING (true)` permite qualquer usuario autenticado ler e DELETAR logs de auditoria. | Destruicao de trilha de auditoria, compliance LGPD comprometida | 4-8 |
| DB-002 | RLS permissiva em security_alerts | Qualquer usuario pode ler e deletar alertas de seguranca. | Ocultacao de incidentes de seguranca | 4-8 |
| DB-003 | RLS permissiva em user_consents | Qualquer usuario pode ler e ALTERAR consentimentos LGPD de outros. | Violacao direta de LGPD | 4-8 |
| DB-004 | RLS permissiva em ai_conversations | Qualquer usuario pode ler conversas de IA de outros. | Vazamento de dados de negociacao | 4-8 |
| DB-005 | RLS permissiva em ai_decisions/ai_audio_notes | Qualquer usuario pode ler decisoes e transcricoes de audio de outros. | Exposicao de estrategia comercial, informacoes confidenciais | 4-8 |
| DB-006 | RLS permissiva em leads | Corretor pode ver/editar/deletar leads de outros corretores. | Manipulacao de leads entre concorrentes internos | 4-8 |

### 2.2 ALTO

| ID | Debito | Descricao | Impacto | Esforço Est. (h) |
|---|---|---|---|---|
| DB-007 | Funcoes SECURITY DEFINER sem validacao | `mark_deal_won/lost`, `reopen_deal` nao verificam se usuario tem permissao no deal. | Manipulacao de deals sem autorizacao | 8-12 |
| DB-008 | Falta indice composto profiles(org_id, role) | Subqueries de RLS executam seq scan por row em CADA consulta RBAC. | Degradacao severa de performance (>1000 registros) | 2-4 |
| DB-009 | Falta indices owner_id e organization_id | Multiplas tabelas (deals, contacts, activities, leads) sem indices nas colunas usadas em RLS/filtros. | Full scans em queries filtradas | 4-8 |
| DB-010 | RLS permissiva em boards/board_stages/activities | 21 tabelas total com `USING (true)`. Boards e activities sem isolamento. | Delecao acidental de pipelines, alteracao de atividades alheias | 16-24 |

### 2.3 MEDIO

| ID | Debito | Descricao | Impacto | Esforço Est. (h) |
|---|---|---|---|---|
| DB-011 | API keys em texto plano no banco | Chaves AI em `user_settings` e `organization_settings`, secrets de webhooks, tudo como TEXT plano. | Exposicao em caso de dump de banco | 16-24 |
| DB-012 | Campos TEXT sem CHECK constraints | `deals.probability`, `deals.value`, `products.price`, `deal_items.quantity/price`, `contacts.email` sem validacao no banco. | Dados inconsistentes/invalidos | 8-12 |
| DB-013 | Sem archiving para audit_logs/webhook_events | Tabelas crescem indefinidamente sem estrategia de particao ou limpeza automatica. | Degradacao progressiva de performance | 8-16 |
| DB-014 | Colunas duplicadas em profiles | `avatar` vs `avatar_url`; `name` vs `first_name`+`last_name`. | Confusao no desenvolvimento, dados inconsistentes | 4-8 |
| DB-015 | `contacts.stage` sem FK para lifecycle_stages | Campo TEXT nao referencia `lifecycle_stages.id`. Mesmo problema em `board_stages.linked_lifecycle_stage` e `boards.linked_lifecycle_stage`. | Integridade referencial ausente | 4-8 |
| DB-016 | Migration inicial monolitica (~2250 linhas) | Schema consolidado em 1 arquivo. Sem down migrations em nenhuma migration. | Impossivel rollback parcial | 8-16 |
| DB-017 | Trigger notify_deal_stage_changed nao filtrado | Executa em CADA UPDATE de deals, nao apenas mudanca de stage_id. | Overhead desnecessario em operacoes de drag-and-drop | 2-4 |
| DB-018 | Storage policies permissivas | deal-files permite upload/leitura/delecao por qualquer usuario autenticado em qualquer deal. | Acesso nao autorizado a arquivos | 4-8 |
| DB-019 | `deals.status` ambiguo com is_won/is_lost | Campo `status` parece legado/nao-utilizado. Flags booleanas sao o mecanismo real. | Confusao, dados potencialmente inconsistentes | 2-4 |
| DB-020 | Seed data misturado com DDL | Dados de seed (lifecycle_stages, quick_scripts) estao no schema init, nao em migration separada. | Dificuldade de manter dados de referencia | 4-8 |

---

## 3. Debitos de Frontend/UX

Consolidados a partir de `frontend-spec.md` (Phase 3).

> **PENDENTE:** Revisao do @ux-design-expert para validar estimativas e confirmar prioridades.

### 3.1 ALTO

| ID | Debito | Descricao | Impacto | Esforço Est. (h) |
|---|---|---|---|---|
| FE-001 | Componentes duplicados (V1/V2) | 4 pares de componentes coexistem: ActivityFormModal, CreateDealModal, ContactFormModal, DealCockpitClient. Sem deprecacao clara. | Confusao sobre qual usar, manutencao duplicada, inconsistencia UX | 16-24 |
| FE-002 | CRMContext monolitico | ~180 propriedades. Qualquer mudanca causa re-render em todos os consumidores. | Performance degradada em telas com muitos componentes | 40-60 |

### 3.2 MEDIO

| ID | Debito | Descricao | Impacto | Esforço Est. (h) |
|---|---|---|---|---|
| FE-003 | Dois sistemas de notificacao | `ToastContext` (3s) e `useNotificationStore` (5s) coexistem com funcionalidades sobrepostas. | Inconsistencia na experiencia, confusao para devs | 8-12 |
| FE-004 | Tokens de Button orfaos | Componente Button (shadcn) referencia `bg-primary`, `text-primary-foreground` que nao estao definidos no tailwind config. | Botoes podem nao renderizar cores corretas | 4-8 |
| FE-005 | Debug logging excessivo | CRMContext e ProtectedLayout com chamadas fetch para `127.0.0.1:7242`. Condicionado a dev mas polui o codigo. | Codigo dificil de ler, requests desnecessarios | 4-8 |
| FE-006 | AI Panel nao responsivo | Painel IA so aparece em desktop (w-96 fixa). Sem alternativa mobile/tablet. | Funcionalidade de IA inacessivel em dispositivos moveis | 16-24 |
| FE-007 | Ausencia de Error Boundaries | Nenhum componente ErrorBoundary encontrado para captura de erros de renderizacao. | Erros de runtime crasham toda a aplicacao sem feedback | 8-16 |

### 3.3 BAIXO

| ID | Debito | Descricao | Impacto | Esforço Est. (h) |
|---|---|---|---|---|
| FE-008 | Design system informal | Sem Storybook, catalogo ou documentacao de design system. Tokens espalhados entre config JS, CSS @theme e inline styles. | Inconsistencias visuais, dificuldade de onboarding | 24-40 |
| FE-009 | Hydration safety com useState fixo | `useResponsiveMode` inicializa com `useState(1024)`. Causa flash de layout em mobile no primeiro render. | Flash visual em mobile | 4-8 |
| FE-010 | PWA incompleto | Service Worker e InstallBanner implementados, mas sem cache offline, sync background ou push notifications. | PWA funcional mas basico | 16-24 |

---

## 4. Matriz Preliminar de Priorizacao

Todos os debitos consolidados, ordenados por prioridade (Critico > Alto > Medio > Baixo).

**Legenda de Impacto:** S = Seguranca | P = Performance | M = Manutenibilidade | UX = Experiencia do Usuario | C = Compliance

### CRITICO (P0 - Fazer Imediatamente)

| ID | Debito | Area | Severidade | Impacto | Esforco (h) | Prioridade |
|---|---|---|---|---|---|---|
| DB-001 | RLS permissiva em audit_logs | Database | CRITICO | S, C | 4-8 | P0 |
| DB-002 | RLS permissiva em security_alerts | Database | CRITICO | S | 4-8 | P0 |
| DB-003 | RLS permissiva em user_consents (LGPD) | Database | CRITICO | S, C | 4-8 | P0 |
| DB-004 | RLS permissiva em ai_conversations | Database | CRITICO | S | 4-8 | P0 |
| DB-005 | RLS permissiva em ai_decisions/audio | Database | CRITICO | S | 4-8 | P0 |
| DB-006 | RLS permissiva em leads | Database | CRITICO | S | 4-8 | P0 |
| TD-003 | Admin client bypassa RLS (AI tools) | Sistema | CRITICO | S | 24-40 | P0 |
| TD-004 | Cobertura de testes ~7% | Sistema | CRITICO | M | 120-200 | P0 |
| TD-001 | `strict: false` no tsconfig | Sistema | CRITICO | M | 40-80 | P0 |
| TD-002 | faker.js em dependencies | Sistema | CRITICO | P | 1 | P0 |

### ALTO (P1 - Proximas 2 Sprints)

| ID | Debito | Area | Severidade | Impacto | Esforco (h) | Prioridade |
|---|---|---|---|---|---|---|
| DB-007 | Funcoes SECURITY DEFINER sem auth | Database | ALTO | S | 8-12 | P1 |
| DB-008 | Falta indice profiles(org_id, role) | Database | ALTO | P | 2-4 | P1 |
| DB-009 | Falta indices owner_id/organization_id | Database | ALTO | P | 4-8 | P1 |
| DB-010 | RLS permissiva em 21 tabelas restantes | Database | ALTO | S | 16-24 | P1 |
| TD-005 | Duplicacao de estado Context + Zustand | Sistema | ALTO | P, M | 40-60 | P1 |
| TD-006 | Paginas protegidas todas client components | Sistema | ALTO | P | 24-40 | P1 |
| TD-008 | Tools IA com 1648 linhas | Sistema | ALTO | M | 32-48 | P1 |
| TD-009 | Cockpit v2 coexiste com v1 | Sistema | ALTO | M | 16-24 | P1 |
| TD-010 | API keys AI em texto plano | Sistema | ALTO | S | 16-24 | P1 |
| FE-001 | Componentes duplicados V1/V2 | Frontend | ALTO | M, UX | 16-24 | P1 |
| FE-002 | CRMContext monolitico (~180 props) | Frontend | ALTO | P, M | 40-60 | P1 |
| TD-007 | Nenhum Server Action utilizado | Sistema | ALTO | UX | 16-32 | P1 |

### MEDIO (P2 - Backlog Priorizado)

| ID | Debito | Area | Severidade | Impacto | Esforco (h) | Prioridade |
|---|---|---|---|---|---|---|
| DB-011 | API keys em texto plano no banco | Database | MEDIO | S | 16-24 | P2 |
| DB-012 | Campos TEXT sem CHECK constraints | Database | MEDIO | M | 8-12 | P2 |
| DB-013 | Sem archiving para audit/webhook | Database | MEDIO | P | 8-16 | P2 |
| DB-014 | Colunas duplicadas em profiles | Database | MEDIO | M | 4-8 | P2 |
| DB-015 | contacts.stage sem FK lifecycle_stages | Database | MEDIO | M | 4-8 | P2 |
| DB-016 | Migration monolitica, sem rollback | Database | MEDIO | M | 8-16 | P2 |
| DB-017 | Trigger notify nao filtrado por coluna | Database | MEDIO | P | 2-4 | P2 |
| DB-018 | Storage policies permissivas | Database | MEDIO | S | 4-8 | P2 |
| DB-019 | deals.status ambiguo | Database | MEDIO | M | 2-4 | P2 |
| DB-020 | Seed data misturado com DDL | Database | MEDIO | M | 4-8 | P2 |
| TD-011 | Provider nesting profundo | Sistema | MEDIO | M | 8-16 | P2 |
| TD-012 | Endpoint /api/chat re-export | Sistema | MEDIO | M | 1-2 | P2 |
| TD-013 | `any` casts extensivos | Sistema | MEDIO | M | 16-24 | P2 |
| TD-014 | Labs com mocks em producao | Sistema | MEDIO | S | 2-4 | P2 |
| TD-015 | Import de React no final do arquivo | Sistema | MEDIO | M | 1 | P2 |
| TD-016 | `pg` como dependencia possivelmente orfao | Sistema | MEDIO | M | 1-2 | P2 |
| TD-017 | Sem rate limiting na API publica | Sistema | MEDIO | S | 8-16 | P2 |
| TD-018 | Ausencia de monitoring/Sentry | Sistema | MEDIO | M | 8-16 | P2 |
| TD-019 | Zod v4 (risco de breaking changes) | Sistema | MEDIO | M | 4-8 | P2 |
| TD-020 | eslint-config-next versao divergente | Sistema | MEDIO | M | 1-2 | P2 |
| FE-003 | Dois sistemas de notificacao | Frontend | MEDIO | UX, M | 8-12 | P2 |
| FE-004 | Tokens de Button orfaos | Frontend | MEDIO | UX | 4-8 | P2 |
| FE-005 | Debug logging excessivo | Frontend | MEDIO | M | 4-8 | P2 |
| FE-006 | AI Panel nao responsivo | Frontend | MEDIO | UX | 16-24 | P2 |
| FE-007 | Ausencia de Error Boundaries | Frontend | MEDIO | UX | 8-16 | P2 |

### BAIXO (P3 - Quando Oportuno)

| ID | Debito | Area | Severidade | Impacto | Esforco (h) | Prioridade |
|---|---|---|---|---|---|---|
| TD-021 | tsconfig buildinfo duplicado | Sistema | BAIXO | M | 0.5 | P3 |
| TD-022 | .DS_Store commitado | Sistema | BAIXO | M | 0.5 | P3 |
| TD-023 | Tailwind config JS com v4 | Sistema | BAIXO | M | 2-4 | P3 |
| FE-008 | Design system informal | Frontend | BAIXO | M, UX | 24-40 | P3 |
| FE-009 | Hydration flash em mobile | Frontend | BAIXO | UX | 4-8 | P3 |
| FE-010 | PWA incompleto | Frontend | BAIXO | UX | 16-24 | P3 |

---

## 5. Dependencias entre Debitos

### Cadeia 1: Seguranca de Banco de Dados (Critica)

```
DB-001..DB-006 (RLS permissivas)
  └── DB-008 (indice profiles org/role) -- PREREQUISITO de performance
  └── DB-009 (indices owner_id/org_id) -- PREREQUISITO de performance
  └── DB-010 (RLS restantes 21 tabelas) -- SEQUENCIA natural
  └── DB-007 (funcoes SECURITY DEFINER) -- DEPENDE de RLS corretas
```

**Nota:** Implementar DB-008 e DB-009 ANTES de criar novas politicas RLS, pois as subqueries de RLS sem indices causam degradacao severa.

### Cadeia 2: Admin Client e AI Tools

```
TD-003 (admin client bypassa RLS)
  └── TD-008 (refatorar tools.ts de 1648 linhas) -- para isolar queries
  └── DB-007 (funcoes SECURITY DEFINER) -- alternativa ao admin client
```

### Cadeia 3: Estado e Performance

```
TD-005 (duplicacao Context + Zustand)
  ├── FE-002 (CRMContext monolitico) -- MESMO PROBLEMA, resolver juntos
  ├── FE-003 (dois sistemas notificacao) -- CONSEQUENCIA da duplicacao
  └── TD-006 (client components) -- RELACIONADO (server state vs client state)
```

### Cadeia 4: Componentes Duplicados

```
FE-001 (componentes V1/V2)
  └── TD-009 (cockpit v1/v2) -- MESMO PADRAO, resolver juntos
  └── TD-023 (Tailwind config) -- pode afetar estilos ao consolidar
  └── FE-004 (tokens Button orfaos) -- resolver ao consolidar design system
```

### Cadeia 5: TypeScript Strict Mode

```
TD-001 (strict: false)
  └── TD-013 (any casts extensivos) -- BLOQUEADO por strict mode
  └── TD-004 (cobertura de testes) -- testes ajudam na migracao strict
```

### Cadeia 6: Observabilidade

```
TD-018 (sem monitoring/Sentry)
  └── FE-007 (sem Error Boundaries) -- COMPLEMENTAR
  └── FE-005 (debug logging excessivo) -- SUBSTITUIR por telemetria real
```

---

## 6. Perguntas para Especialistas

### Para @data-engineer (Dara):

1. **RLS P0:** Qual a ordem recomendada para implementar RLS nas 21 tabelas permissivas? Deve-se criar uma migration unica ou uma por grupo de tabelas?

2. **Indice profiles(org, role):** Confirmamos que este e o maior gargalo de performance das politicas RBAC? Ha metricas de query plan disponivel para validar?

3. **Criptografia de keys:** Voce recomenda `pgsodium`, `vault` do Supabase, ou criptografia em nivel de aplicacao para as API keys? Qual o impacto em latencia?

4. **Archiving:** Qual estrategia para `audit_logs` e `webhook_events_*`? Particao por data, tabela de archive, ou cleanup com cron? Qual a expectativa de volume?

5. **Migration monolitica:** Vale a pena refatorar a migration init de 2250 linhas ou apenas garantir que novas migrations sigam boas praticas?

6. **contacts.stage sem FK:** A remocao da FK foi intencional (flexibilidade) ou um descuido? Qual o risco de adicionar a FK agora dado os dados existentes?

7. **deals.status vs is_won/is_lost:** Confirmamos que `status` pode ser removido? Ha algum codigo no frontend que dependa desse campo?

8. **Funcoes SECURITY DEFINER:** Preferencia por adicionar validacao dentro das funcoes ou migrar para SECURITY INVOKER com RLS?

### Para @ux-design-expert:

1. **Componentes V1/V2:** Qual versao deve ser mantida para cada par? Existe alguma feature em V1 que V2 nao cobre?

2. **CRMContext:** A migracao para hooks especificos pode ser feita incrementalmente? Quais componentes sao os maiores consumidores?

3. **AI Panel responsivo:** Qual o padrao recomendado para mobile? FullscreenSheet, modal, ou bottom drawer?

4. **Tokens Button:** O componente Button deve migrar para tokens existentes (`primary-500`, etc.) ou devemos criar os tokens semanticos que o shadcn espera (`--primary`, `--primary-foreground`)?

5. **Error Boundaries:** Deve haver um por feature/rota ou um global com fallback customizado por tipo de erro?

6. **Sistemas de notificacao:** Qual manter? ToastContext ou NotificationStore? Ou criar um novo unificado?

7. **Design system:** Vale investir em Storybook agora ou criar documentacao mais leve primeiro?

---

## 7. Resumo Executivo Preliminar

### Totais

| Metrica | Valor |
|---|---|
| **Total de debitos identificados** | **53** |
| Criticos (P0) | 10 |
| Altos (P1) | 12 |
| Medios (P2) | 25 |
| Baixos (P3) | 6 |

### Por Area

| Area | Total | Criticos | Altos | Medios | Baixos |
|---|---|---|---|---|---|
| Sistema (@architect) | 23 | 4 | 6 | 10 | 3 |
| Database (@data-engineer) | 20 | 6 | 4 | 10 | 0 |
| Frontend (@ux-design-expert) | 10 | 0 | 2 | 5 | 3 |

### Esforco Total Estimado

| Prioridade | Esforco Estimado (h) | Observacao |
|---|---|---|
| P0 (Critico) | 225-381 | Inclui cobertura de testes (120-200h) que e esforco continuo |
| P1 (Alto) | 231-360 | Inclui refatoracoes estruturais grandes |
| P2 (Medio) | 148-262 | Majoritariamente melhorias incrementais |
| P3 (Baixo) | 48-77 | Quando oportuno |
| **TOTAL** | **652-1080 horas** | ~16-27 sprints de 2 semanas (1 dev) |

### Riscos Principais

1. **Seguranca (URGENTE):** 21 tabelas com RLS `USING (true)` permitem acesso irrestrito. Em ambiente multi-usuario (corretores), isso e um vetor de ataque real. Violacao de LGPD via `user_consents`.

2. **Performance:** Sem indices compostos nas colunas usadas por RLS, a performance degrada significativamente com crescimento de dados. O indice `profiles(organization_id, role)` e blocker para qualquer nova politica RLS.

3. **Manutenibilidade:** `tools.ts` de 1648 linhas, CRMContext de ~180 propriedades, 4 pares de componentes duplicados V1/V2 -- o codebase tem complexidade crescente que dificulta novos desenvolvimentos.

4. **Admin Client (service role):** O uso de service role key para todas as AI tools bypassa completamente o RLS. Um bug em qualquer tool de IA pode vazar dados de qualquer tenant.

### Proximos Passos

1. **@data-engineer:** Revisar secao 2 (Debitos de Database) e responder perguntas da secao 6
2. **@ux-design-expert:** Revisar secao 3 (Debitos de Frontend/UX) e responder perguntas da secao 6
3. **@architect:** Consolidar feedbacks e gerar documento final (`technical-debt-assessment.md`)
4. **@pm:** Converter debitos priorizados em epics e stories para desenvolvimento

---

*Documento gerado por @architect (Aria) - Brownfield Discovery Phase 4*
*Synkra AIOS v2.2.0*
*Status: DRAFT - Aguardando revisao de @data-engineer e @ux-design-expert*
