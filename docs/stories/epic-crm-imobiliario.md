# Epic: CRM Imobiliario Foundation — Contatos + Deals para Imobiliarias

**ID:** EPIC-CRM-IMOB
**Status:** In Progress (Wave 2 Done)
**Data:** 2026-02-25
**Responsavel:** @pm (Morgan)
**Origem:** Analise competitiva (6 concorrentes) + auditoria de codebase + decisoes do stakeholder

---

## Objetivo

Transformar o ZmobCRM de um CRM generico em um CRM imobiliario competitivo, expandindo o modelo de dados de contatos e deals com campos especificos do mercado imobiliario, construindo uma experiencia de usuario completa (cockpit 360, lista enriquecida, dedup) e adicionando diferenciais de IA que nenhum concorrente brasileiro possui (lead scoring, notificacoes inteligentes, metricas automaticas).

## Contexto Estrategico

### Analise Competitiva (fonte: Atlas, 2026-02-19)
- **6 concorrentes analisados:** Jetimob, Vista/Loft CRM, Imoview, Arbo/Superlogica, Tecimob, Imobzi
- **Vantagem ZmobCRM:** IA mais avancada do mercado (30+ MCP tools, multi-provider, analise de deals)
- **Gap critico:** Zero campos especificos de imobiliaria no modelo de contatos (7 campos editaveis vs 15+ dos concorrentes)
- **Posicionamento:** "CRM imobiliario AI-first" — IA como diferencial, dados imobiliarios como fundacao

### Decisoes do Stakeholder
- **Deal permanece 1:1 com contato** (sem N:N por enquanto)
- **Comissao simplificada:** % por corretor x valor do deal (visualizacao, nao modulo financeiro)
- **Lista enriquecida aprovada:** colunas owner/source/classificacao/temperatura + filtros + bulk actions
- **WhatsApp e matching imovel:** adiados para epics futuros (dependencias externas)

## Escopo

### Incluido
- Expansao do modelo de dados de contatos (campos imobiliarios)
- Perfil de interesse do contato (preferencias de imovel)
- Expansao do modelo de dados de deals (tipo negocio, data prevista, comissao)
- Resolucao de tech debt critico (soft delete, notas unificadas, org_id)
- Lista de contatos enriquecida (colunas, filtros, busca server-side, bulk actions)
- Cockpit completo do contato (visao 360, timeline, deals, IA)
- Deteccao e merge de contatos duplicados
- Lead scoring com IA
- Notificacoes inteligentes (aniversario, churn alert)
- LTV automatico e metricas de contatos

### Excluido
- Integracao WhatsApp (epic separado — API Business, custo, aprovacao Meta)
- Matching contato-imovel (depende do modulo de imoveis, epic futuro)
- Distribuicao automatica de leads/rodizio (Epic 4)
- Import/Export avancado (Epic 4 — depende de dedup funcionando)
- Multiplos contatos por deal (backlog — operacao atual nao necessita)
- Gestao de locacao, assinatura eletronica, DIMOB (epics futuros)
- Gestao financeira/ERP de comissoes (apenas visualizacao de comissao estimada)

## Criterios de Sucesso

| Metrica | Baseline Atual | Meta Epic 3 |
|---|---|---|
| Campos editaveis no contato | 7 | 15+ |
| Campos especificos imobiliarios | 0 | 10+ (CPF, endereco, classificacao, temperatura, etc.) |
| Cockpit do contato | Scaffold (5 campos) | Completo (timeline, deals, IA, preferencias) |
| Colunas na lista de contatos | 5 | 8+ |
| Filtros avancados | 2 (data inicio/fim) | 6+ (owner, source, classificacao, temperatura, data, LTV) |
| Busca de contatos | Client-side (carrega todos) | Server-side paginada |
| Lead scoring | Inexistente | IA automatico com badge visual |
| Deteccao de duplicatas | Inexistente | Por email/telefone/CPF |
| LTV do contato | Manual | Automatico ao ganhar deal |
| Tipo de negocio no deal | Inexistente | Venda/Locacao/Permuta |
| Comissao estimada | Inexistente | % corretor x valor, visivel no cockpit |

## Arquitetura de Dados (validado por @architect)

### Abordagem: Hibrida (colunas + JSONB)

**Colunas dedicadas (indexaveis, FK possivel):**
- `contacts`: cpf, address_cep, address_city, address_state, contact_type (PF/PJ), classification, temperature
- `deals`: deal_type (venda/locacao/permuta), expected_close_date, commission_rate

**JSONB `profile_data` (flexivel, custom):**
- Endereco completo, profissao, renda, estado civil, campos custom da imobiliaria

**Tabela separada:**
- `contact_phones`: multiplos telefones com tipo (celular/comercial/WhatsApp)
- `contact_preferences`: perfil de interesse (tipo imovel, faixa preco, regioes, quartos, urgencia)

---

## Stories

| ID | Titulo | Wave | Pontos | Agente | Status |
|---|---|---|---|---|---|
| 3.1 | Modelo de dados imobiliario — Contatos | 1 | 5 | @dev | Done |
| 3.2 | Perfil de interesse do contato | 1 | 3 | @dev | Done |
| 3.3 | Modelo de dados imobiliario — Deals | 1 | 3 | @dev | Done |
| 3.4 | Tech debt: soft delete, notas unificadas, org_id | 1 | 3 | @dev | Done |
| 3.5 | Lista de contatos enriquecida | 2 | 5 | @dev | Done |
| 3.6 | Cockpit do contato completo | 2 | 8 | @dev | Done |
| 3.7 | Deteccao e merge de duplicatas | 2 | 5 | @dev | Done |
| 3.8 | Lead scoring com IA | 3 | 5 | @dev | Ready |
| 3.9 | Notificacoes inteligentes | 3 | 3 | @dev | Ready |
| 3.10 | LTV automatico + metricas de contatos | 3 | 3 | @dev | Ready |

**Total:** 10 stories, ~43 pontos

---

## Waves e Dependencias

### Wave 1 — Foundation (modelo de dados)

```
3.1 (contatos) ─────┐
3.2 (preferences) ──┼──→ Desbloqueia Wave 2
3.3 (deals) ────────┤
3.4 (tech debt) ────┘  ← pode rodar em PARALELO com 3.1-3.3
```

**Pré-requisito:** @architect valida schema + @data-engineer produz DDL
**Entrega:** Base de dados pronta para CRM imobiliario

### Wave 2 — UI Enriquecida

```
3.5 (lista) ──→ 3.6 (cockpit) ──→ 3.7 (dedup)
```

**Pré-requisito:** Wave 1 completa (modelo de dados expandido)
**Entrega:** CRM visualmente transformado, visao 360 do contato

### Wave 3 — IA + Metricas

```
3.8 (lead scoring) ──┐
3.9 (notificacoes) ──┼──→ Epic Done
3.10 (LTV/metricas) ─┘  ← podem rodar em PARALELO
```

**Pré-requisito:** Wave 2 completa (cockpit e lista para exibir scores/alertas)
**Entrega:** CRM inteligente, diferencial competitivo unico

---

## Detalhamento por Story

### Story 3.1 — Modelo de dados imobiliario: Contatos

**Objetivo:** Expandir o Contact model com campos essenciais para imobiliarias.

**Novos campos (colunas):**
- `cpf` TEXT (com mascara e validacao)
- `contact_type` TEXT ('PF' | 'PJ') — default 'PF'
- `classification` TEXT ('COMPRADOR' | 'VENDEDOR' | 'LOCATARIO' | 'LOCADOR' | 'INVESTIDOR' | 'PERMUTANTE')
- `temperature` TEXT ('HOT' | 'WARM' | 'COLD') — default 'WARM'
- `address_cep` TEXT
- `address_city` TEXT
- `address_state` TEXT (UF, 2 chars)

**Novos campos (JSONB `profile_data`):**
- `address_full` (rua, numero, complemento, bairro)
- `profession`, `income_range`, `marital_status`

**Nova tabela `contact_phones`:**
- `id`, `contact_id`, `phone_number`, `phone_type` (CELULAR/COMERCIAL/RESIDENCIAL), `is_whatsapp` BOOLEAN, `organization_id`, `created_at`

**Formulario e lista:** Atualizar UI para exibir/editar novos campos.

**CodeRabbit Focus:** Validacao CPF, mascara, migration safety, indexes.

---

### Story 3.2 — Perfil de interesse do contato

**Objetivo:** Criar entidade separada para preferencias de imovel do contato.

**Nova tabela `contact_preferences`:**
- `id` UUID PK
- `contact_id` FK → contacts
- `property_types` TEXT[] ('APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL')
- `purpose` TEXT ('MORADIA' | 'INVESTIMENTO' | 'VERANEIO')
- `price_min` NUMERIC
- `price_max` NUMERIC
- `regions` TEXT[] (bairros/cidades)
- `bedrooms_min` INTEGER
- `parking_min` INTEGER
- `area_min` NUMERIC (m2)
- `accepts_financing` BOOLEAN
- `accepts_fgts` BOOLEAN
- `urgency` TEXT ('IMMEDIATE' | '3_MONTHS' | '6_MONTHS' | '1_YEAR')
- `notes` TEXT
- `organization_id` FK → organizations
- `created_at`, `updated_at` TIMESTAMPTZ

**UI:** Secao "Perfil de Interesse" no formulario de contato e no cockpit.

---

### Story 3.3 — Modelo de dados imobiliario: Deals

**Objetivo:** Adicionar campos imobiliarios ao modelo de deals.

**Novos campos no `deals`:**
- `deal_type` TEXT ('VENDA' | 'LOCACAO' | 'PERMUTA') — default 'VENDA'
- `expected_close_date` DATE
- `commission_rate` NUMERIC — default 1.5 (%)

**Logica de comissao:**
- Cada corretor tem `commission_rate` no profile (default 1.5%)
- No deal: `comissao_estimada = deal.value * (corretor.commission_rate / 100)`
- Exibir no cockpit do deal e no DealDetailModal como campo read-only

**Novos campos no `profiles` (corretor):**
- `commission_rate` NUMERIC — default 1.5

**UI:** Tipo de negocio no CreateDealModal, data prevista no DealDetailModal, comissao estimada no cockpit.

---

### Story 3.4 — Tech debt: soft delete, notas unificadas, org_id

**Objetivo:** Resolver 4 debitos tecnicos que afetam a qualidade do sistema.

**Items:**
1. **Soft delete:** Implementar `WHERE deleted_at IS NULL` em todas as queries de contacts e deals. Mudar `delete()` para `UPDATE SET deleted_at = NOW()`.
2. **Notas unificadas:** DealDetailModal salva notas como `activities` (type=NOTE), Cockpit salva em `deal_notes`. Unificar para usar `deal_notes` em ambos.
3. **org_id em deal_notes:** Adicionar `organization_id` FK + atualizar RLS policy.
4. **org_id em deal_files:** Adicionar `organization_id` FK + atualizar RLS policy.
5. **Migracao de dados existentes:** Wizard/bulk edit para preenchimento dos novos campos em contatos existentes.

---

### Story 3.5 — Lista de contatos enriquecida

**Objetivo:** Transformar a lista de contatos em ferramenta de gestao.

**Novas colunas:** owner (corretor), source, classificacao, temperatura.
**Filtros avancados:** por owner, source, classificacao, temperatura, faixa de LTV, data de criacao.
**Busca server-side:** Substituir `useContacts()` (carrega todos) por busca paginada com debounce.
**Bulk actions:** Selecionar multiplos → reatribuir owner, mudar stage, exportar CSV.
**Sorting:** Adicionar sort por owner, source, classificacao.

---

### Story 3.6 — Cockpit do contato completo

**Objetivo:** Visao 360 do contato, espelhando o padrao do cockpit de deals.

**Layout 3 colunas (mesmo padrao do deal cockpit):**

**Left rail:**
- Score/temperatura visual
- Dados completos (CPF, endereco, telefones, classificacao)
- Perfil de interesse (preferencias de imovel)

**Center:**
- Timeline unificada (atividades, notas, mudancas de stage)
- Adicionar nota rapida inline

**Right rail (tabs):**
- Chat IA (resumo do contato, sugestao de proxima acao)
- Deals vinculados (mini-cards com valor, stage, tipo negocio)
- Notas
- Arquivos (se aplicavel)

**Header:** Avatar, nome, classificacao badge, temperatura badge, stage badge, botao WhatsApp (placeholder).

---

### Story 3.7 — Deteccao e merge de duplicatas

**Objetivo:** Prevenir e resolver contatos duplicados.

**Deteccao na criacao:** Ao criar contato, verificar se existe outro com mesmo email OU telefone OU CPF. Exibir aviso "Contato similar encontrado" com opcao de abrir o existente.
**Tela de merge:** Selecionar 2 contatos → escolher quais dados manter de cada → unificar deals, atividades, notas.
**Busca de duplicatas:** Tela administrativa para listar possiveis duplicatas (match por email/telefone/CPF).

---

### Story 3.8 — Lead scoring com IA

**Objetivo:** Qualificacao automatica de contatos via IA.

**Fatores de score (0-100):**
- Interacoes recentes (ultima interacao < 7 dias = +20)
- Total value/LTV (> R$0 = +15)
- Tempo no stage atual (< 30 dias = +10, > 90 dias = -10)
- Atividades completadas (> 5 = +15)
- Preferencias preenchidas (perfil completo = +10)
- Deals ativos (> 0 = +20)
- Temperatura manual (HOT = +10, COLD = -10)

**UI:** Badge colorido na lista e cockpit (0-30 vermelho, 31-60 amarelo, 61-100 verde).
**IA panel:** Sugestao de proxima acao baseada no score e historico.

---

### Story 3.9 — Notificacoes inteligentes

**Objetivo:** Alertas proativos para o corretor.

**Tipos de notificacao:**
- Aniversario (birthDate) — "Hoje e aniversario de Maria Silva"
- Churn alert — "Joao sem interacao ha 30 dias" (configuravel)
- Deal estagnado — "Deal X no mesmo stage ha 15+ dias"
- Score caiu — "Lead score de Maria caiu de 75 para 40"

**Implementacao:** Tabela `notifications` + dashboard de alertas + badge counter no header.

---

### Story 3.10 — LTV automatico + metricas de contatos

**Objetivo:** Metricas automaticas para gestao.

**LTV automatico:** Ao marcar deal como won (`markAsWon`), somar `deal.value` no `contact.totalValue`. Trigger ou server action.
**Dashboard de metricas:**
- Contatos novos por periodo/source
- Funil de conversao por stage (LEAD → MQL → PROSPECT → CUSTOMER)
- Distribuicao por classificacao e temperatura
- Performance por corretor (contatos atribuidos, convertidos, LTV gerado)

---

## Riscos Cruzados

| ID | Risco | Severidade | Mitigacao |
|---|---|---|---|
| RC-01 | Migration pesada (novos campos + tabelas) pode quebrar dados existentes | ALTO | Migrations incrementais, rollback testado, wizard de preenchimento |
| RC-02 | Cockpit do contato vs cockpit do deal ficarem inconsistentes | MEDIO | Usar mesmos componentes base (CockpitTimeline, CockpitRightRail pattern) |
| RC-03 | Busca server-side impactar performance se queries nao otimizadas | MEDIO | Indexes nos novos campos, EXPLAIN ANALYZE antes de deploy |
| RC-04 | Lead scoring com IA gerar scores inconsistentes | MEDIO | Scoring deterministico (formula) com overlay de IA para sugestoes |
| RC-05 | Merge de duplicatas perder dados | ALTO | Audit log do merge, soft delete do contato "perdedor", rollback possivel |
| RC-06 | Scope creep — adicionar features nao planejadas durante implementacao | MEDIO | Stories validadas por @po, AC claras, @qa gate em cada story |

## Quality Gates

### CodeRabbit Integration (por story)
- **Dev phase:** light mode, max 2 iterations, CRITICAL + HIGH auto-fix
- **QA phase:** full mode, max 3 iterations, 7-point quality check

### Agent Assignment
| Story | Primary Agent | Quality Gate | Specialist |
|---|---|---|---|
| 3.1-3.4 (Wave 1) | @dev | @qa | @data-engineer (DDL review) |
| 3.5-3.7 (Wave 2) | @dev | @qa | @ux-design-expert (cockpit UX) |
| 3.8-3.10 (Wave 3) | @dev | @qa | @architect (IA scoring algorithm) |

---

## Proximo Passo

1. ~~**@architect** — Validar schema detalhado (DDL) antes de criar stories~~ DONE
2. ~~**@data-engineer** — Revisar e corrigir DDL~~ DONE (7 correcoes aplicadas)
3. ~~**@sm** — Criar stories formais Wave 1 (3.1-3.4)~~ DONE
4. ~~**@po** — Validar cada story da Wave 1 (10-point checklist)~~ DONE (GO — 7/10→10/10)
5. ~~**@dev** — Implementar Wave 1 (Stories 3.1-3.4)~~ DONE (commit e7cec53)
6. ~~**@qa** — QA Gate Wave 1~~ DONE (PASS — 4/4 stories)
7. ~~**@devops** — Push Wave 1 para remote~~ DONE (branch refactor-contatos)
8. ~~**@sm** — Criar stories Wave 2 (3.5-3.7) apos Wave 1 validada~~ DONE
9. ~~**@dev** — Implementar Wave 2 (Stories 3.5-3.7)~~ DONE
10. ~~**@qa** — QA Gate Wave 2~~ DONE (PASS — 3/3 stories)
11. ~~**@devops** — Push Wave 2 para remote~~ DONE (branch refactor-contatos)
12. **@sm** — Criar stories Wave 3 (3.8-3.10) apos Wave 2 validada
13. **@dev** — Implementar Wave 3

---

## Change Log

| Data | Agente | Acao |
|---|---|---|
| 2026-02-25 | @analyst (Atlas) | Analise competitiva (6 concorrentes) + gaps identificados |
| 2026-02-25 | @analyst (Atlas) | Analise critica: modelo de dados insuficiente, recomendacao de epic unificado |
| 2026-02-25 | @architect (Aria) | Parecer tecnico: abordagem hibrida colunas+JSONB, contact_preferences separado |
| 2026-02-25 | @pm (Morgan) | Consolidacao: 10 stories, 3 waves, decisoes do stakeholder incorporadas |
| 2026-02-25 | @pm (Morgan) | Epic criado — Status: Draft |
| 2026-02-26 | @architect (Aria) | Schema DDL validado — docs/architecture/epic-crm-imob-schema.md |
| 2026-02-26 | @data-engineer (Dara) | Revisao DDL — 7 correcoes aplicadas (RLS, indexes, triggers, backfill) |
| 2026-02-26 | @sm (River) | Stories Wave 1 criadas: 3.1, 3.2, 3.3, 3.4 — Status: Draft |
| 2026-02-26 | @po (Pax) | Validacao Wave 1: GO CONDICIONAL (7/10→10/10). Gaps corrigidos (Estimate, Dependencies, DoD). Status: Draft → Ready |
| 2026-02-26 | @dev (Dex) | Wave 1 implementada: 6 migrations, types, services, UI (ContactFormModal, ContactPreferencesSection, CreateDealModal, DealDetailModal, CockpitDataPanel, ProfilePage, ContactsList). Commit e7cec53 |
| 2026-02-26 | @qa (Quinn) | QA Gate Wave 1: PASS (4/4 stories). Issues 3.1 HIGH + 3.2 MEDIUM/LOW corrigidos e re-reviewed |
| 2026-02-26 | @devops (Gage) | Push Wave 1 para origin/refactor-contatos. Status Stories 3.1-3.4: Done. Epic: In Progress (Wave 1 Done) |
| 2026-02-26 | @sm (River) | Stories Wave 2 criadas: 3.5, 3.6, 3.7 — Status: Draft |
| 2026-02-26 | @po (Pax) | Validacao Wave 2: GO. Status: Draft → Ready |
| 2026-02-26 | @dev (Dex) | Wave 2 implementada: lista enriquecida (filtros, busca, bulk), cockpit 360 (timeline, deals, IA), dedup (scan, merge RPC, audit). Commits 8731769-130a3f0 |
| 2026-02-26 | @qa (Quinn) | QA Gate Wave 2: PASS (3/3 stories). Story 3.7 re-reviewed apos fix de 4 issues (org filter, RPC transaction, batch scan, audit log) |
| 2026-02-26 | @devops (Gage) | Push Wave 2 para origin/refactor-contatos. Status Stories 3.5-3.7: Done. Epic: In Progress (Wave 2 Done) |
| 2026-02-26 | @sm (River) | Stories Wave 3 criadas: 3.8, 3.9, 3.10 — Status: Draft |
| 2026-02-26 | @po (Pax) | Validacao Wave 3: GO (10/10 x3). Notas: activities query via deals (3.8), stage UUID/name handling (3.10). Status: Draft → Ready |
