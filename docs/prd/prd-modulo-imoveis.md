# PRD: Modulo de Imoveis — ZmobCRM

**ID:** PRD-IMOVEIS
**Status:** Draft
**Data:** 2026-03-13
**Autor:** @pm (Morgan)
**Origem:** Backlog triagem equipe (Epic 8) + pesquisas @analyst (portais, competidores) + decisoes stakeholder

---

## 1. Visao Geral do Projeto

### 1.1 Estado Atual

O ZmobCRM e um CRM imobiliario AI-first construido com Next.js, React 19, TypeScript e Supabase. Possui 42+ tabelas (76 migrations), RLS 100%, RBAC 3 niveis (admin > diretor > corretor), e ja completou os Epics CRM Imobiliario (EPIC-CRM-IMOB) e Realtime Everywhere (EPIC-RT) com:

- Modelo de dados de contatos com campos imobiliarios (CPF, classificacao, temperatura)
- **Tabela `contact_preferences`** — perfil de interesse do contato (tipo imovel, faixa preco, regioes, quartos, vagas, financiamento, FGTS, urgencia)
- Cockpit 360 do contato com timeline, deals, IA
- Lead scoring com IA (7 fatores, 0-100)
- Notificacoes inteligentes (aniversario, churn, stagnation, score drop)
- **Realtime sync** — subscriptions Supabase para deals, contacts, activities, notifications com cache patching via React Query

**Gap critico:** O sistema captura preferencias de imovel do contato mas NAO possui catalogo de imoveis. Nao existe matching contato-imovel. 6/6 concorrentes analisados possuem gestao de imoveis.

### 1.2 Documentacao Disponivel

- [x] Tech Stack (SCHEMA.md, system-architecture.md)
- [x] Schema DB (76 migrations, 42+ tabelas)
- [x] Analise competitiva (6 concorrentes: Jetimob, Vista/Loft, Imoview, Arbo, Tecimob, Imobzi)
- [x] Pesquisa APIs portais (ZAP/VivaReal, OLX, Chaves na Mao, Orulo)
- [x] Technical Debt Assessment
- [ ] UX/UI Guidelines (seguir padrao existente do cockpit de deals/contatos)

### 1.3 Tipo de Enhancement

- [x] New Feature Addition
- [x] Integration with New Systems (Orulo API)

### 1.4 Impacto

- **Moderate Impact** — Adicao de novas tabelas e UI, com integracao pontual ao modelo existente de contacts e deals. Nenhuma mudanca arquitetural no sistema existente.

---

## 2. Objetivos

- Criar catalogo completo de imoveis no ZmobCRM (CRUD + fotos + features)
- Importar imoveis de lancamentos via integracao Orulo (API v2)
- Implementar matching inteligente contato-imovel com scoring baseado em `contact_preferences`
- Vincular imovel a deal (relacao direta)
- Habilitar IA para geracao automatica de descricoes de imoveis (diferencial competitivo)

## 3. Contexto e Justificativa

O cadastro de imoveis e a feature #1 mais critica para qualquer CRM imobiliario — presente em 6/6 concorrentes analisados. Sem catalogo de imoveis, o ZmobCRM nao pode:

1. Oferecer matching contato-imovel (feature que so Tecimob tem de forma basica, sem IA)
2. Vincular negocios a imoveis especificos
3. Integrar com portais para importar/publicar imoveis
4. Competir com Tecimob (R$129,90/mes) e Jetimob (R$199/mes)

A integracao Orulo e prioritaria porque alimenta o CRM automaticamente com lancamentos de incorporadoras — o Tecimob ja possui esta integracao e e referencia do stakeholder.

**Contexto tecnico:** O Epic RT (Realtime Everywhere) foi concluido, estabelecendo o pattern de Supabase Realtime + React Query cache patching para todas as entidades. O modulo de imoveis pode aproveitar esse pattern para que cadastros/atualizacoes de imoveis sejam refletidos em tempo real para todos os corretores da organizacao (consideracao para Wave 1, IM-1.2).

O matching com IA sera o **diferencial unico** do ZmobCRM no mercado brasileiro. Nenhum concorrente possui matching inteligente com scoring — apenas o Tecimob tem o "Radar de Clientes" que e basico e sem IA.

### Decisoes do Stakeholder

| Decisao | Valor |
|---------|-------|
| Quem cadastra | Todos (admin, diretor, corretor) |
| Ownership do imovel | Organizacao (org-level, todos veem) |
| Fotos | Supabase Storage (uploads) + URLs externas (Orulo) |
| Relacao imovel-deal | Vinculado diretamente |
| Publicacao em portais | Futuro (apenas site proprio, que ainda nao existe) |
| Integracao portais V1 | Apenas Orulo (importacao) |
| Referencia UX | Tecimob, Jetimob, Beotto (Melnick) |

---

## 3.1 Fora do Escopo V1

Os itens abaixo foram identificados durante pesquisa e analise competitiva mas **NAO fazem parte desta versao**:

| Item | Referencia | Motivo da Exclusao |
|------|-----------|-------------------|
| Publicacao em portais (ZAP, OLX, VivaReal) | Jetimob, Tecimob | Requer site proprio (inexistente) e APIs de publicacao |
| Site proprio do imovel / landing page | Tecimob (JetPage) | Feature separada, nao essencial para MVP |
| Condominio como entidade reutilizavel | Jetimob | Complexidade adicional; imoveis standalone primeiro |
| Marca d'agua em fotos | Tecimob | Feature de vaidade, baixo impacto em conversao |
| Historico completo de alteracoes do imovel | Jetimob | Audit log generico pode cobrir isso futuramente |
| Pipeline de propostas | Jetimob | Deals existentes cobrem negociacao |
| Importacao de outros portais (ZAP, OLX, Chaves na Mao) | Pesquisa @analyst | Apenas Orulo no V1 por decisao do stakeholder |
| Exportacao/publicacao de imoveis para portais | Pesquisa @analyst | Depende de integracao bidirecional (futuro) |

---

## 4. Requisitos Funcionais

### Cadastro de Imoveis

- **FR1:** O sistema deve permitir cadastro manual de imoveis com campos: titulo, descricao, tipo de transacao (venda/locacao/permuta/venda+locacao), tipo de imovel (apartamento, casa, terreno, comercial, rural, kitnet, galpao, sala comercial, loja), preco de venda, preco de locacao, condominio, IPTU. **Nota arquitetural:** Os tipos kitnet, sala comercial e loja sao novos e nao existem na validacao de `contact_preferences.property_types` (validacao atual e no app layer via comment SQL, sem CHECK constraint no banco). A migration de IM-1.1 deve adicionar os 3 novos tipos a validacao do app layer e, opcionalmente, criar CHECK constraint formal no banco para `contact_preferences.property_types`, garantindo compatibilidade com o matching (Wave 3).
- **FR2:** O sistema deve permitir cadastro de caracteristicas do imovel: quartos, suites, banheiros, vagas de garagem, area util (m2), area total (m2), andar da unidade, andares do predio, ano de construcao.
- **FR3:** O sistema deve permitir cadastro de localizacao: CEP (com preenchimento automatico via API), estado, cidade, bairro, endereco, numero, complemento, latitude, longitude.
- **FR4:** O sistema deve permitir upload de multiplas fotos com reordenacao (drag and drop), definicao de foto principal, suporte a URLs externas (Orulo), e **categorias de foto**: imovel, planta baixa, interna/privada (ref. Tecimob).
- **FR5:** O sistema deve permitir cadastro de features/comodidades (piscina, academia, playground, churrasqueira, portaria 24h, elevador, varanda gourmet, etc.) como tags selecionaveis.
- **FR6:** O sistema deve manter status do imovel: ATIVO, INATIVO, VENDIDO, ALUGADO, RESERVADO.
- **FR7:** O sistema deve atribuir um codigo interno unico por imovel (ex: ZMOB-001) auto-incremental por organizacao. **Mecanismo:** Coluna `property_counter INTEGER DEFAULT 0` na tabela `organizations` + RPC atomica `next_property_code(org_id)` que incrementa o counter e retorna o codigo formatado (ZMOB-{counter zero-padded}).
- **FR8:** O sistema deve registrar a origem do imovel: MANUAL ou ORULO.
- **FR8b:** O sistema deve permitir campo `private_notes` no imovel — notas internas visiveis apenas para a imobiliaria, nao para clientes/portais futuramente (ref. Tecimob).

### Lista e Busca

- **FR9:** O sistema deve exibir lista de imoveis com colunas: codigo, foto principal (thumbnail), titulo, tipo, tipo transacao, preco, bairro/cidade, quartos, vagas, area, status.
- **FR10:** O sistema deve permitir filtros avancados: tipo imovel, tipo transacao, faixa de preco, quartos (min), vagas (min), area (min/max), bairro/cidade, status, origem (manual/orulo).
- **FR11:** O sistema deve permitir busca textual server-side por titulo, codigo, bairro, cidade (com pg_trgm).
- **FR12:** O sistema deve exibir contagem de imoveis por status (badges).

### Detalhe do Imovel (Cockpit)

- **FR13:** O sistema deve exibir pagina de detalhe do imovel com layout **header hero + navegacao por tabs** (ref. Beotto). Header fixo com: logo/foto principal, grid de fotos (2x2), badge de status, nome do empreendimento/imovel, endereco, quick info (area, preco), botoes de acao.
- **FR13b:** As tabs do cockpit devem incluir: **Sobre** (descricao, galeria completa, cronograma lancamento/conclusao), **Localizacao** (mapa interativo full-width, imoveis proximos), **Plantas** (PDFs organizados por categoria/torre com accordion), **Valores** (tabela de precos/tipologias), **Materiais** (PDFs de campanhas, apresentacoes, kit contrato, divulgacao — organizados por categoria com accordion), **Incorporadora** (dados da construtora, quando source=orulo).
- **FR14:** O sistema deve exibir no cockpit do imovel a lista de contatos com match (score de compatibilidade com base em `contact_preferences`).
- **FR15:** O sistema deve exibir no cockpit do imovel a lista de deals vinculados.
- **FR16:** O sistema deve permitir edicao inline dos campos do imovel.
- **FR16b:** O sistema deve permitir upload de **documentos e materiais** vinculados ao imovel (PDFs: plantas, apresentacoes, tabelas de preco, materiais de divulgacao), organizados por categoria (ref. Beotto).

### Integracao Orulo

- **FR17:** O sistema deve implementar autenticacao OAuth 2.0 (client_credentials) com a API Orulo v2, com cache e refresh automatico de token.
- **FR18:** O sistema deve permitir configuracao das credenciais Orulo (client_id, client_secret) na tela de configuracoes da organizacao (admin only).
- **FR19:** O sistema deve importar empreendimentos da Orulo com: dados do empreendimento, tipologias, imagens, localizacao, incorporadora, comissao, status, previsao de entrega.
- **FR20:** Cada tipologia de um empreendimento Orulo deve gerar 1 property separada no ZmobCRM (para granularidade de matching e futura publicacao em portais).
- **FR21:** O sistema deve permitir sincronizacao manual (botao "Sincronizar Agora") e automatica (diaria via Vercel Cron Jobs chamando API Route).
- **FR22:** O sistema deve exibir log de sincronizacao: data/hora, empreendimentos importados/atualizados/erros, status.
- **FR23:** O sistema deve permitir filtrar importacao por estado/cidade (evitar custos desnecessarios — R$0,39/empreendimento/mes).
- **FR24:** O sistema deve marcar imoveis importados da Orulo com `source: 'orulo'`, `source_id` (orulo_id) e dados especificos em `source_data` JSONB (orulo_url, building_name, developer_name, delivery_date, building_status, comissao). Campo `source_last_sync` TIMESTAMPTZ para rastreabilidade. Esse design extensivel suporta futuras fontes (ZAP, OLX) sem alterar schema.

### Matching Contato-Imovel

- **FR25:** O sistema deve calcular score de compatibilidade (0-100) entre imoveis e contatos baseado em `contact_preferences`. **Implementacao:** Duas RPC functions set-returning: `get_matching_contacts(p_property_id, p_threshold, p_limit)` e `get_matching_properties(p_contact_id, p_threshold, p_limit)` que retornam TABLE(id, name/title, score) — evitando N+1 queries. **Logica de regiao:** `score += 20 WHERE property.neighborhood = ANY(contact.regions) OR property.city = ANY(contact.regions)` (match exato por bairro ou cidade).
- **FR26:** O sistema deve exibir no cockpit do contato a lista de imoveis compativeis ordenados por score (tab "Imoveis Sugeridos").
- **FR27:** O sistema deve exibir no cockpit do imovel a lista de contatos compativeis ordenados por score.
- **FR28:** O sistema deve gerar notificacao automatica quando um novo imovel compativel (score >= 70) entra no sistema ("Radar de Imoveis" — similar ao "Radar de Clientes" do Tecimob).
- **FR29:** O sistema deve permitir enviar sugestao de imovel para o contato (acao rapida que cria atividade de follow-up).

### Vinculacao Imovel-Deal

- **FR30:** O sistema deve permitir vincular 1 ou mais imoveis a um deal.
- **FR31:** O sistema deve exibir os imoveis vinculados no cockpit do deal (mini-cards com foto, titulo, preco, tipo).
- **FR32:** O `DealDetailModal` deve incluir campo de selecao de imovel com busca. O `CreateDealModal` e minimalista (3 campos: contato, estagio, responsavel) — o campo de imovel deve ser adicionado apenas no `DealDetailModal` para manter a UX de "criar rapido, detalhar depois".

### IA

- **FR33:** O sistema deve gerar descricao automatica do imovel via IA (baseado nos dados cadastrados: tipo, quartos, area, bairro, features). Usar provider configurado da organizacao (Gemini/OpenAI/Anthropic).
- **FR34:** O sistema deve sugerir preco competitivo baseado em imoveis similares no catalogo (mesmo bairro, tipo, quartos).

---

## 5. Requisitos Nao-Funcionais

- **NFR1:** Listagem de imoveis deve carregar em < 500ms para ate 5.000 registros por organizacao.
- **NFR2:** Busca textual deve usar pg_trgm indexes para performance (ILIKE com trigrams).
- **NFR3:** Fotos devem ser armazenadas em Supabase Storage com policy RLS por organizacao. Path: `{bucket}/{org_id}/{property_id}/{uuid}.{ext}` para isolamento por org.
- **NFR4:** Sync Orulo nao deve impactar performance do sistema — rodar em background via Vercel Cron Jobs + API Route assincrona.
- **NFR5:** Calculo de matching deve ser eficiente — RPC function no Supabase, nao calcular client-side.
- **NFR6:** Todas as novas tabelas devem ter RLS org-level. Properties sao ativos da organizacao (sem owner_id): SELECT/INSERT/UPDATE para todos os membros da org; DELETE (soft) restrito a admin/diretor via `USING (public.is_admin_or_director(organization_id))` — sem fallback de owner_id pois imoveis sao org-level. Tabelas filhas (photos, documents) herdam acesso via JOIN com properties.
- **NFR7:** Todas as queries devem respeitar soft delete (`WHERE deleted_at IS NULL`).

---

## 6. Requisitos de Compatibilidade

- **CR1:** API Publica existente (65+ endpoints) nao deve ser quebrada. Novos endpoints de imoveis adicionados de forma aditiva.
- **CR2:** Schema do banco deve manter integridade referencial com tabelas existentes (contacts, deals, profiles, organizations). Novas tabelas adicionadas, nenhuma alteracao destrutiva.
- **CR3:** UI deve seguir padrao visual existente (Tailwind, Shadcn/UI). Cockpit de imovel usa layout header+tabs (diferente do 3 colunas de contato/deal) por ser mais visual/showcase.
- **CR4:** Integracao com `contact_preferences` existente — matching lê dados de preferences, nao os modifica.

---

## 7. Interface do Usuario

### 7.1 Referencias de UX

Tres plataformas como referencia, pegando o melhor de cada:

| Referencia | O que absorver |
|------------|---------------|
| **Beotto (Melnick)** | Layout do cockpit: header hero com grid de fotos + navegacao por tabs (Sobre, Localizacao, Plantas, Valores, Materiais, Incorporadora). Galeria em grid com "+N". Mapa full-width. Materiais organizados por categoria com accordion. Cronograma de empreendimento. |
| **Tecimob** | Formulario de cadastro rico com wizard por etapas. 3 categorias de foto (imovel, planta, privada). Dados privados (notas internas). Marca d'agua (futuro). "Radar de Clientes" para matching. IA para descricoes. |
| **Jetimob** | Condominio como entidade reutilizavel (futuro). Pipeline de propostas (futuro). JetPage — pagina exclusiva do cliente (futuro). Historico completo de alteracoes. |

### 7.2 Decisao de Layout: Header + Tabs (nao 3 colunas)

O cockpit de imovel usa layout **header hero + tabs** ao inves do layout 3 colunas usado em contatos/deals. Motivo: imovel e mais visual/showcase (fotos, mapas, plantas, materiais precisam de espaco full-width), diferente de contato/deal que e mais operacional.

- **Contato/Deal:** 3 colunas (left rail + center + right rail) — operacional
- **Imovel:** Header hero + tabs horizontais — showcase/catalogo

### 7.3 Telas Novas/Modificadas

| Tela | Tipo | Descricao |
|------|------|-----------|
| `/properties` | Nova | Lista de imoveis com filtros, busca, grid/lista toggle |
| `/properties/[id]` | Nova | Cockpit do imovel (header hero + tabs: Sobre, Localizacao, Plantas, Valores, Materiais, Incorporadora, Contatos Compativeis, Deals) |
| `/properties/new` | Nova | Formulario de cadastro de imovel (wizard por etapas ou tabs: Basico > Caracteristicas > Midia > Localizacao) |
| `/settings` (aba Orulo) | Modificada | Configuracao de credenciais e sync Orulo |
| Cockpit Contato (tab) | Modificada | Nova tab "Imoveis Sugeridos" com lista de matching |
| Cockpit Deal | Modificada | Secao "Imoveis Vinculados" no right rail |
| DealDetailModal | Modificada | Campo de selecao de imovel + secao "Imoveis Vinculados" |
| Sidebar/Nav | Modificada | Novo item "Imoveis" no menu |

### 7.4 Consistencia Visual

- Grid de imoveis: cards com foto, titulo, preco, tipo, badges (status, quartos, vagas, area)
- Cockpit de imovel: header hero (logo + grid fotos 2x2 + quick info) + tabs horizontais (ref. Beotto)
- Galeria: grid de thumbnails com "+N" para expandir em lightbox full-screen
- Mapa: full-width na tab Localizacao com POIs
- Plantas/Materiais: grid de PDFs com thumbnails organizados por categoria (accordion colapsavel)
- Filtros: mesmo padrao de filters do ContactsList (dropdowns, faixa de preco com slider)
- Formulario: tabs ou wizard (Basico > Caracteristicas > Midia > Localizacao) ref. Tecimob

---

## 8. Restricoes Tecnicas e Integracao

### 8.1 Stack Existente

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Supabase (PostgreSQL 17, RLS, Edge Functions, Storage)
- **IA:** Multi-provider (Gemini, OpenAI, Anthropic) via `organization_settings`
- **State:** React Query (TanStack Query) para cache e mutations
- **Realtime:** Supabase Realtime com cache patching (Epic RT concluido — pattern disponivel para properties)
- **Auth:** Supabase Auth com RBAC (admin > diretor > corretor)

### 8.2 Estrategia de Integracao

**Database:** Novas tabelas: Wave 1 — `properties` (com `features TEXT[]` inline), `property_photos`, `property_documents` (3 tabelas); Wave 2 — `deal_properties`, `orulo_sync_log` (2 tabelas). Total: 5 tabelas novas. Alteracao aditiva em `organizations` (`property_counter`). Alteracao aditiva em `contact_preferences` (expandir validacao de `property_types` com 3 novos tipos). Nenhuma alteracao destrutiva.

**API:** Novos services em `lib/supabase/properties.ts`. Novos hooks em `lib/query/hooks/`.

**Frontend:** Nova feature em `features/properties/`. Componentes reutilizados do cockpit existente.

**Storage:** Novos buckets `property-photos` e `property-documents` no Supabase Storage com RLS por organizacao. Path: `{org_id}/{property_id}/{uuid}.{ext}`.

### 8.3 Organizacao de Codigo

```
features/properties/
  PropertiesPage.tsx          # Lista de imoveis
  PropertyCockpitClient.tsx   # Cockpit do imovel
  PropertyFormPage.tsx        # Formulario novo/editar
  components/
    PropertyCard.tsx           # Card do imovel (grid)
    PropertyRow.tsx            # Linha da tabela (lista)
    PropertyFilters.tsx        # Filtros avancados
    PropertyGallery.tsx        # Galeria de fotos (grid + lightbox)
    PropertyDocuments.tsx      # Materiais/PDFs por categoria (accordion)
    PropertyMatchList.tsx      # Lista de matching contato-imovel
    PropertySelector.tsx       # Selector para vincular a deal
    PropertyNearby.tsx         # Imoveis nas proximidades
    OruloConfigSection.tsx     # Config na tela de settings
    OruloSyncPanel.tsx         # Painel de sync status
  hooks/
    useProperties.ts
    usePropertyMatching.ts
    useOruloSync.ts
    usePropertyRealtimeSync.ts  # Realtime cache patching (pattern do Epic RT)
lib/supabase/
  properties.ts               # CRUD de imoveis
  property-matching.ts        # Funcoes de matching
  orulo-client.ts             # API client Orulo
lib/query/hooks/
  usePropertiesQuery.ts       # React Query hooks
```

### 8.4 Deploy e Operacoes

- **Build:** Sem impacto — adicao de paginas e componentes novos
- **Deploy:** Vercel (preview branch → staging DB, main → prod DB) — fluxo inalterado
- **Migrations:** Incrementais, rollback seguro, sem alteracoes destrutivas
- **Sync Orulo:** Vercel Cron Jobs (diario) chamando API Route `/api/orulo/sync` + sync manual on-demand via mesmo endpoint

### 8.5 Riscos

| # | Risco | Severidade | Mitigacao |
|---|-------|------------|-----------|
| R1 | Orulo API pode mudar sem aviso | MEDIO | Versionamento v2, fallback gracioso, sync log com erros |
| R2 | Volume de imoveis Orulo pode ser alto (custos) | BAIXO | Filtro por estado/cidade, UI de configuracao |
| R3 | Matching score pode ser impreciso | MEDIO | Formula deterministica clara, ajustes por feedback, IA como overlay futuro |
| R4 | Upload de muitas fotos pode impactar storage | BAIXO | Limitar 30 fotos/imovel, comprimir antes de upload |
| R5 | Sync Orulo pode falhar silenciosamente | MEDIO | Log de sync com alertas, retry automatico, dashboard de status |

---

## 9. Estrutura de Epic e Stories

### Abordagem

Epic unico com 3 waves sequenciais, mesmo padrao validado do EPIC-CRM-IMOB:

- **Wave 1 — Foundation:** Schema + CRUD basico de imoveis
- **Wave 2 — Integracao:** Orulo sync + vinculacao com deals
- **Wave 3 — Inteligencia:** Matching + IA

### Epic: Modulo de Imoveis (EPIC-IMOVEIS)

**Goal:** Criar catalogo completo de imoveis com importacao Orulo, matching inteligente contato-imovel, e vinculacao com deals.

**Integration Requirements:** Integrar com `contact_preferences` (matching), `deals` (vinculacao), `organization_settings` (IA, credenciais Orulo), Supabase Storage (fotos).

---

#### Wave 1 — Foundation (Schema + CRUD)

##### Story IM-1.1: Schema de Imoveis

**Como** admin/diretor/corretor,
**quero** que o sistema tenha uma estrutura de dados para imoveis,
**para que** eu possa cadastrar e gerenciar meu catalogo.

**Acceptance Criteria:**
1. Tabela `properties` criada com todos os campos (titulo, descricao, tipo_transacao, tipo_imovel, precos, caracteristicas, localizacao, status, source, source_id, source_data JSONB, source_last_sync, codigo interno, org_id, `features TEXT[] DEFAULT '{}'`, private_notes)
2. Tabela `property_photos` criada (id, property_id, url, source, position, is_primary, **category** [imovel/planta/interna], org_id)
3. Tabela `property_documents` criada (id, property_id, url, title, **category** [campanha/apresentacao/kit_contrato/divulgacao/documento/planta_contrato], file_type, file_size, org_id)
4. RLS org-level em todas as novas tabelas: SELECT/INSERT/UPDATE para membros da org, DELETE (soft) restrito a admin/diretor
5. Indexes para busca server-side (titulo trigram, tipo, preco, bairro/cidade, status)
6. Types TypeScript atualizados
7. Coluna `property_counter INTEGER DEFAULT 0` adicionada a `organizations` + RPC `next_property_code(org_id)` atomica
8. Validacao de `contact_preferences.property_types` expandida com 3 novos tipos: KITNET, SALA_COMERCIAL, LOJA (app layer — atualmente nao existe CHECK constraint no banco, apenas validacao via comment SQL; opcionalmente criar CHECK formal)
9. Trigger `update_updated_at_column()` aplicado em `properties`

**Integration Verification:**
- IV1: Tabelas existentes (contacts, deals, profiles) nao foram alteradas destrutivamente (apenas aditivas: counter em organizations, CHECK expandido em contact_preferences)
- IV2: RLS policies seguem padrao existente (org-level via `is_admin_or_director()`)
- IV3: Migrations sao incrementais e tem rollback seguro
- IV4: `deals.property_ref` existente mantido como deprecated (nao removido)

**Estimativa:** 5 pontos

---

##### Story IM-1.2: CRUD de Imoveis + Lista

**Como** corretor,
**quero** cadastrar, editar, visualizar e excluir imoveis,
**para que** eu possa manter meu catalogo atualizado.

**Acceptance Criteria:**
1. Formulario de cadastro com todos os campos (FR1-FR8)
2. Upload de fotos com reordenacao drag-and-drop, foto principal, e **3 categorias** (imovel, planta baixa, interna/privada) (FR4)
3. Upload de **documentos/materiais** (PDFs) com categoria (campanha, apresentacao, kit contrato, divulgacao, documento, planta contrato) (FR16b)
4. Selecao de features/comodidades como tags (FR5)
5. Preenchimento automatico de endereco por CEP (API ViaCEP)
6. Lista de imoveis com colunas, filtros e busca server-side (FR9-FR12)
7. Toggle grid/lista na listagem
8. Soft delete (deleted_at)
9. Validacao de campos obrigatorios (titulo, tipo, tipo transacao, preco, localizacao)
10. Supabase Storage buckets `property-photos` e `property-documents` com RLS. Path: `{org_id}/{property_id}/{uuid}.{ext}`
11. Item "Imoveis" adicionado ao menu lateral
12. Campo `private_notes` para notas internas (FR8b)

**Integration Verification:**
- IV1: Menu lateral existente funciona normalmente com novo item
- IV2: Navegacao entre paginas nao quebra rotas existentes
- IV3: Upload de fotos funciona corretamente no Supabase Storage

**Estimativa:** 8 pontos

---

##### Story IM-1.3: Cockpit do Imovel

**Como** corretor,
**quero** ver uma pagina de detalhe completa do imovel,
**para que** eu tenha visao 360 do imovel, seus contatos interessados e deals vinculados.

**Acceptance Criteria:**
1. Pagina de detalhe com layout **header hero + tabs horizontais** (ref. Beotto, nao 3 colunas)
2. Header hero: logo/foto principal (esquerda) + grid de 4 fotos (direita, 2x2) + badge status + nome + endereco + quick info (area, preco) + botoes acao (Editar, Inativar, Excluir) + link externo ("Site do produto" quando aplicavel)
3. Tab **Sobre**: descricao, galeria de imagens em grid (com "+N" para expandir em lightbox), cronograma (lancamento/conclusao quando source=orulo), features/comodidades
4. Tab **Localizacao**: mapa interativo full-width com pin + endereco completo + secao "Imoveis nas proximidades" (cards de imoveis do mesmo bairro)
5. Tab **Plantas**: fotos da categoria "planta" + PDFs de plantas organizados por categoria/torre (accordion colapsavel)
6. Tab **Valores**: tabela de tipologias com precos (quando source=orulo com multiplas tipologias) ou dados de preco do imovel
7. Tab **Materiais**: documentos/PDFs organizados por categoria (campanhas, apresentacoes, kit contrato, divulgacao, documentos) com accordion colapsavel (ref. Beotto)
8. Tab **Incorporadora**: dados da construtora (nome, contato) quando source=orulo
9. Tab **Contatos Compativeis**: placeholder para Wave 3 (matching)
10. Tab **Deals**: lista de deals vinculados a este imovel
11. Dados de Orulo visiveis quando source=orulo (incorporadora, previsao entrega, link Orulo, building_status)

**Integration Verification:**
- IV1: Componentes Shadcn/UI (Tabs, Card, Badge) reutilizados
- IV2: Navegacao de/para cockpit do imovel funciona (breadcrumbs, links da lista)
- IV3: Layout responsivo (tabs empilham em mobile)

**Estimativa:** 8 pontos

---

#### Wave 2 — Integracao (Orulo + Deals)

##### Story IM-2.1: Integracao Orulo — Import

**Como** admin,
**quero** importar imoveis de lancamentos da Orulo automaticamente,
**para que** meu catalogo seja alimentado com empreendimentos de incorporadoras sem cadastro manual.

**Acceptance Criteria:**
1. Orulo Auth Client com OAuth 2.0 (client_credentials), cache e refresh de token (FR17)
2. Orulo API Client com endpoints: buildings (list, get, search), images, files, partners (FR19)
3. Tela de configuracao Orulo em Settings (admin only): client_id, client_secret, filtros por estado/cidade (FR18, FR23)
4. Sincronizacao manual via botao "Sincronizar Agora" (FR21)
5. Cada tipologia gera 1 property separada (FR20)
6. Imagens da Orulo armazenadas como URLs externas (sem re-download) (FR24)
7. Log de sincronizacao com status, contagem, erros (FR22)
8. Properties importadas marcadas com source='orulo', source_id=orulo_building_id, source_data JSONB preenchido com dados Orulo (FR24)
9. Sync incremental (updated_at) para evitar reimportar dados inalterados

10. Migration para `ALTER TABLE organization_settings ADD COLUMN orulo_client_id TEXT, orulo_client_secret TEXT, orulo_filter_states TEXT[] DEFAULT '{}', orulo_filter_cities TEXT[] DEFAULT '{}', orulo_enabled BOOLEAN DEFAULT false` (tabela atual so possui campos AI)
11. Tabela `orulo_sync_log` criada (id, org_id, started_at, finished_at, status, buildings_imported, buildings_updated, errors) com RLS org-level

**Integration Verification:**
- IV1: Credenciais Orulo armazenadas em `organization_settings` com colunas dedicadas (orulo_client_id, orulo_client_secret, orulo_filter_states, orulo_filter_cities, orulo_enabled)
- IV2: Sync nao impacta performance do sistema (roda em background)
- IV3: Imoveis importados aparecem corretamente na lista e cockpit
- IV4: `orulo_sync_log` com RLS org-level seguindo padrao existente

**Estimativa:** 8 pontos

---

##### Story IM-2.2: Sync Automatico Orulo

**Como** admin,
**quero** que a importacao Orulo rode automaticamente todos os dias,
**para que** meu catalogo esteja sempre atualizado sem acao manual.

**Acceptance Criteria:**
1. Vercel Cron Job configurado em `vercel.json` que chama API Route `/api/orulo/sync` diariamente
2. Respeita filtros de estado/cidade configurados pela organizacao
3. Retry automatico com backoff exponencial em caso de falha
4. Rate limiting respeitado (max 60 req/min conforme API Orulo)
5. Notificacao para admin quando sync falha 3x consecutivas (tipo ORULO_SYNC_FAILED)
6. Dashboard de sync status: ultima sync, proxima sync, imoveis totais importados, erros recentes
7. Migration para ALTER CHECK constraint da tabela `notifications` adicionando tipo 'ORULO_SYNC_FAILED' (CHECK atual: BIRTHDAY, CHURN_ALERT, DEAL_STAGNANT, SCORE_DROP)

**Integration Verification:**
- IV1: Vercel Cron Job nao conflita com outras rotas/crons existentes
- IV2: Notificacao usa tabela `notifications` existente com novo tipo via ALTER CHECK constraint
- IV3: Dashboard de sync acessivel apenas por admin

**Estimativa:** 5 pontos

---

##### Story IM-2.3: Vinculacao Imovel-Deal

**Como** corretor,
**quero** vincular imoveis a um deal,
**para que** eu saiba exatamente quais imoveis estao em negociacao com cada contato.

**Acceptance Criteria:**
1. Campo de selecao de imovel no DealDetailModal com busca (FR32) — CreateDealModal permanece minimalista
2. Secao "Imoveis Vinculados" no DealDetailModal com busca e mini-cards (FR31, FR32)
3. Multiplos imoveis podem ser vinculados ao mesmo deal (FR30)
4. Imoveis vinculados exibidos no cockpit do deal como mini-cards (FR31)
5. Migration: Tabela `deal_properties` criada (deal_id, property_id — junction table) com RLS org-level e cascade delete
6. Remover vinculacao com confirmacao

**Integration Verification:**
- IV1: DealDetailModal existente continua funcionando sem imovel selecionado (campo opcional). CreateDealModal nao e alterado
- IV2: Cockpit do deal existente nao quebra com nova secao
- IV3: Performance do cockpit do deal nao e impactada
- IV4: Campo `deals.property_ref` (TEXT) existente mantido como deprecated/read-only. Dados existentes preservados. Migracão futura converterá property_ref em vinculacao via deal_properties

**Estimativa:** 5 pontos

---

#### Wave 3 — Inteligencia (Matching + IA)

##### Story IM-3.1: Matching Contato-Imovel

**Como** corretor,
**quero** ver automaticamente quais contatos sao compativeis com cada imovel (e vice-versa),
**para que** eu possa fazer follow-up direcionado e fechar mais negocios.

**Acceptance Criteria:**
1. Duas RPC functions set-returning: `get_matching_contacts(p_property_id UUID, p_threshold INT DEFAULT 30, p_limit INT DEFAULT 50)` RETURNS TABLE(contact_id, contact_name, score) e `get_matching_properties(p_contact_id UUID, p_threshold INT DEFAULT 30, p_limit INT DEFAULT 50)` RETURNS TABLE(property_id, title, score). Calculo server-side sem N+1 queries (FR25)
2. Criterios de score: tipo imovel (match exato = +20), faixa de preco (dentro = +25, proximo ±20% = +10), regiao/bairro (property.neighborhood = ANY(contact.regions) OR property.city = ANY(contact.regions) = +20), quartos >= min (+10), vagas >= min (+5), area >= min (+5), financiamento compativel (+5), finalidade compativel (+10)
3. Tab "Imoveis Sugeridos" no cockpit do contato com lista ordenada por score (FR26)
4. Lista "Contatos Compativeis" no cockpit do imovel com lista ordenada por score (FR27)
5. Score exibido como badge colorido (0-30 vermelho, 31-60 amarelo, 61-100 verde)
6. Filtro de threshold minimo (default 30) para nao exibir matches irrelevantes
7. Acao rapida "Sugerir para Contato" que cria atividade de follow-up (FR29)

**Integration Verification:**
- IV1: `contact_preferences` existente nao e modificado (somente leitura)
- IV2: Cockpit do contato existente funciona normalmente com nova tab
- IV3: Performance aceitavel (< 2s para calcular matches de 1 imovel vs 1000 contatos)

**Estimativa:** 8 pontos

---

##### Story IM-3.2: Radar de Imoveis (Notificacoes)

**Como** corretor,
**quero** ser notificado quando um imovel compativel com meus contatos entra no sistema,
**para que** eu possa agir rapidamente e oferecer o imovel ao contato certo.

**Acceptance Criteria:**
1. Ao criar/importar imovel, calcular matching com todos os contatos da org com preferences preenchidas (FR28)
2. Gerar notificacao tipo 'PROPERTY_MATCH' para o owner do contato quando score >= 70
3. Notificacao inclui: nome do contato, titulo do imovel, score, link para cockpit do imovel
4. Integrar com sistema de notificacoes existente (tabela `notifications`, badge header)
5. Configuravel: threshold de score (default 70), ativar/desativar por organizacao
6. Migration para alterar CHECK constraint da tabela `notifications` adicionando tipo 'PROPERTY_MATCH' (CHECK atual: BIRTHDAY, CHURN_ALERT, DEAL_STAGNANT, SCORE_DROP)

**Integration Verification:**
- IV1: Tabela `notifications` existente recebe novo tipo via ALTER CHECK constraint sem quebrar tipos existentes
- IV2: Badge counter no header funciona com novo tipo
- IV3: Volume de notificacoes nao e excessivo (batch + dedupe)

**Estimativa:** 5 pontos

---

##### Story IM-3.3: IA para Descricoes de Imoveis

**Como** corretor,
**quero** gerar descricoes profissionais do imovel automaticamente com IA,
**para que** eu nao perca tempo escrevendo textos e tenha anuncios de alta qualidade.

**Acceptance Criteria:**
1. Botao "Gerar Descricao com IA" no formulario de cadastro/edicao do imovel (FR33)
2. IA gera descricao baseada nos dados: tipo, quartos, area, bairro, features, preco
3. Usa provider configurado da organizacao (Gemini/OpenAI/Anthropic via `organization_settings`)
4. Preview da descricao antes de aceitar
5. Opcao de regenerar com tom diferente (formal, casual, premium)
6. Sugestao de preco competitivo baseado em imoveis similares no catalogo (FR34) — quando houver dados suficientes (>= 5 imoveis similares)

**Integration Verification:**
- IV1: Proxy de IA existente (`lib/supabase/ai-proxy.ts`) reutilizado
- IV2: Chamadas de IA respeitam rate limits e quota da organizacao
- IV3: Provider fallback funciona (se Gemini falhar, tenta OpenAI)

**Estimativa:** 5 pontos

---

## 10. Waves e Dependencias

### Wave 1 — Foundation (Schema + CRUD)
```
IM-1.1 (Schema) → IM-1.2 (CRUD + Lista) → IM-1.3 (Cockpit)
```
**Pre-requisito:** Nenhum (base nova)
**Entrega:** Catalogo de imoveis funcional (cadastro, lista, detalhe)

### Wave 2 — Integracao (Orulo + Deals)
```
IM-2.1 (Orulo Import) → IM-2.2 (Sync Automatico)
IM-2.3 (Vinculacao Deal) ← pode rodar em paralelo com 2.1/2.2
```
**Pre-requisito:** Wave 1 completa
**Entrega:** Catalogo alimentado automaticamente, deals vinculados a imoveis

### Wave 3 — Inteligencia (Matching + IA)
```
IM-3.1 (Matching) → IM-3.2 (Radar/Notificacoes)
IM-3.3 (IA Descricoes) ← pode rodar em paralelo com 3.1/3.2
```
**Pre-requisito:** Wave 2 completa (imoveis no catalogo para matching funcionar)
**Entrega:** Matching inteligente, radar de imoveis, descricoes com IA

---

## 11. Resumo de Stories

| ID | Titulo | Wave | Pontos | Dependencia |
|----|--------|------|--------|-------------|
| IM-1.1 | Schema de Imoveis | 1 | 5 | — |
| IM-1.2 | CRUD de Imoveis + Lista | 1 | 8 | IM-1.1 |
| IM-1.3 | Cockpit do Imovel | 1 | 8 | IM-1.2 |
| IM-2.1 | Integracao Orulo — Import | 2 | 8 | IM-1.1 |
| IM-2.2 | Sync Automatico Orulo | 2 | 5 | IM-2.1, notifications (ALTER CHECK) |
| IM-2.3 | Vinculacao Imovel-Deal | 2 | 5 | IM-1.1 (migration deal_properties) |
| IM-3.1 | Matching Contato-Imovel | 3 | 8 | IM-1.1, contact_preferences |
| IM-3.2 | Radar de Imoveis | 3 | 5 | IM-3.1 |
| IM-3.3 | IA para Descricoes | 3 | 5 | IM-1.2 |

**Total:** 9 stories, 57 pontos, 3 waves

---

## 12. Criterios de Sucesso

| Metrica | Baseline Atual | Meta |
|---------|---------------|------|
| Catalogo de imoveis | Inexistente | CRUD completo com fotos, busca, filtros |
| Imoveis importados Orulo | 0 | Sync funcional com log e retry |
| Matching contato-imovel | Inexistente | Score 0-100 baseado em preferences |
| Imoveis vinculados a deals | Impossivel | Multi-vinculacao com mini-cards |
| Descricao IA | Inexistente | 3 tons, preview, multi-provider |
| Notificacao de match | Inexistente | Radar automatico com threshold |

### Quality Gates por Wave

Cada wave deve receber **PASS** no QA gate (@qa) antes de iniciar a proxima wave. Stories dentro de uma wave podem rodar em paralelo quando nao ha dependencia direta, mas o QA gate e por wave completa.

| Wave | Gate | Criterio de PASS |
|------|------|-----------------|
| Wave 1 | QA-W1 | Schema correto + CRUD funcional + Cockpit navegavel |
| Wave 2 | QA-W2 | Orulo sync funcional + Deals vinculados + Storage operacional |
| Wave 3 | QA-W3 | Matching preciso + Radar operacional + IA gerando descricoes |

---

## Change Log

| Data | Agente | Acao |
|------|--------|------|
| 2026-03-03 | @pm (Morgan) | PRD criado — 9 stories, 3 waves, 34 FRs, baseado em pesquisas @analyst e decisoes stakeholder |
| 2026-03-03 | @pm (Morgan) | PRD atualizado — UX refs adicionadas (Beotto, Tecimob, Jetimob). Layout cockpit alterado para header+tabs (ref. Beotto). Adicionados: categorias de foto (FR4), notas privadas (FR8b), documentos/materiais (FR16b), tabs detalhadas (FR13b), tabela property_documents. IM-1.3 ajustada de 5 para 8 pontos. Total: 57 pontos |
| 2026-03-03 | @architect (Aria) | Review tecnico aplicado — 11 ajustes: (C1) Expandir contact_preferences CHECK com 3 novos tipos, (C2) Definir mecanismo counter atomico para codigo interno, (C3) Trocar Edge Function por Vercel Cron Jobs, (H1) property_features removida — usar features TEXT[] inline, (H2) Campos Orulo individuais → source_data JSONB extensivel, (H3) Matching RPC set-returning (evitar N+1), (H4) Logica de match regiao definida, (M1) deals.property_ref deprecated path, (M2) RLS DELETE restrito admin/diretor, (M3) Storage path com org_id, (M4) Credenciais Orulo em organization_settings. Total tabelas: 6→5 |
| 2026-03-04 | @po (Pax) | Validacao PRD (84/100, GO condicional). 7 correcoes aplicadas: (C1) contact_preferences.property_types nao tem CHECK — corrigido para app layer, (C2) notifications.type CHECK precisa incluir PROPERTY_MATCH — AC adicionada em IM-3.2, (C3) Contagem tabelas 36→42 (48 migrations), (M1) Colunas Orulo explicitadas em organization_settings na IM-2.1, (M2) DELETE policy clarificada sem owner_id, (M3) CreateDealModal mantido minimalista — campo imovel apenas no DealDetailModal, (M4) Secao "Fora do Escopo V1" adicionada com 8 exclusoes |
| 2026-03-13 | @pm (Morgan) | PRD atualizado — 5 correcoes pos-Epic RT: (1) Contagem migrations 48→76, (2) Estado atual inclui Epic RT (Realtime Everywhere) concluido, (3) Stack atualizada com Supabase Realtime, (4) Adicionado usePropertyRealtimeSync.ts na organizacao de codigo, (5) Contexto tecnico do Realtime como oportunidade para IM-1.2 |
| 2026-03-13 | @po (Pax) | Validacao Epic (90/100, GO condicional). 5 correcoes solicitadas |
| 2026-03-13 | @pm (Morgan) | 5 correcoes @po aplicadas: (C1) CreateDealModal removido de §7.3 — nao e modificado, apenas DealDetailModal, (C2) IM-2.2 AC7 adicionada — migration para ORULO_SYNC_FAILED no notifications CHECK, (C3) deal_properties movida de IM-1.1 para IM-2.3, orulo_sync_log movida para IM-2.1 — tabelas na wave onde sao usadas, (M1) Tabela §11 atualizada com dependency de notifications CHECK em IM-2.2 e migration deal_properties em IM-2.3, (M2) §12 Quality Gates por Wave adicionados — QA gate obrigatorio antes de iniciar proxima wave |

---

*— Morgan, planejando o futuro*
