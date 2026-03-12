# Relatorio: Listas de Contatos nos Principais CRMs

**Data:** 2026-03-11 | **Confianca geral:** Alta

---

## 1. HubSpot -- Lists (Segments)

**Confianca:** Alta (documentacao oficial acessada)

### Localizacao na UI
- Acesso via **CRM > Segments** no dashboard principal
- Pagina dedicada com lista de todos os segmentos criados
- Suporta organizacao por **pastas** (folders)

### Tipos de Listas

| Tipo | Comportamento | Caso de Uso |
|------|---------------|-------------|
| **Active List** (dinamica) | Atualiza automaticamente. Contatos entram/saem conforme criterios mudam | Newsletters, campanhas recorrentes, segmentos comportamentais |
| **Static List** (estatica) | Snapshot fixo. Nao atualiza automaticamente | Eventos unicos, listas manuais, follow-up pontual |

### Como Adicionar Contatos
- **Filtros automaticos (Active):** Ate 250 criterios de filtro combinados
- **Manual (Static):** Adicao individual ou em massa de contatos especificos
- **Import CSV:** Durante o import, checkbox "Create a list of contacts from this import" cria automaticamente uma lista estatica com os contatos importados
- **AI-assisted:** Opcao de gerar filtros via descricao em linguagem natural

### Filtragem
- Propriedades do objeto (lifecycle stage, etc.)
- Eventos (interacoes com CTAs)
- Dados de objetos associados (empresas, deals)
- Labels de associacao (Professional/Enterprise)

### Gestao de Membros
- Visualizacao em tabela com todos os membros da lista
- Acoes em massa: adicionar/remover de listas estaticas
- Clonar listas existentes
- Excluir registros ou segmentos especificos
- Controle de acesso por usuario/equipe

### Integracao
- Email campaigns, workflows, audiences para ads, surveys, custom reporting
- Listas podem ser associadas a campanhas

### Resumo UX
**Modelo maduro e completo.** O ponto forte e a dualidade active/static com UI unificada. O import CSV com criacao automatica de lista e uma conveniencia excelente. O limite de 250 filtros garante granularidade extrema.

---

## 2. Pipedrive -- Filtros e Labels

**Confianca:** Alta (documentacao oficial acessada)

### Localizacao na UI
- **Dropdown de filtros** no canto superior direito das views de:
  - Lista de leads, deals (list, pipeline, forecast, archive)
  - Contatos (pessoas/organizacoes e timelines)
  - Atividades, projetos, produtos
- Filtros salvos ficam acessiveis no dropdown como "favoritos"

### Abordagem
Pipedrive **NAO tem conceito de "listas"** -- usa **filtros salvos** como equivalente funcional.

| Mecanismo | Descricao |
|-----------|-----------|
| **Quick Filters** | Filtragem rapida direto na view (pipeline ou lista) |
| **Advanced Filters** | Filtros complexos com logica ALL (AND) / ANY (OR) |
| **Contact Labels** | Rotulos (labels) atribuidos a pessoas/organizacoes |

### Como Segmentar
- Criar filtro avancado com ate **16 condicoes**
- Combinar logica AND/OR entre grupos de condicoes
- Salvar como filtro nomeado (privado ou compartilhado)
- Marcar filtros como "favoritos" para acesso rapido

### Visibilidade
- **Shared:** Visivel para todos os usuarios da conta
- **Private:** Visivel apenas para o criador

### Limitacoes
- Maximo 16 condicoes por filtro
- Maximo 5.000 filtros por empresa
- Menos condicoes = melhor performance em contas grandes

### Resumo UX
**Modelo orientado a filtros, sem listas explicitas.** Simples e eficiente para equipes pequenas. Labels complementam os filtros para categorizacao manual. A ausencia de "listas nomeadas" pode ser limitante para usuarios que pensam em termos de agrupamentos manuais.

---

## 3. RD Station CRM -- Segmentacao

**Confianca:** Media-Baixa (informacoes mais genericas, sem deep read da doc oficial do CRM)

### Abordagem
- Foco principal na **segmentacao do RD Station Marketing** (nao CRM)
- CRM centraliza informacoes do cliente com foco em funil de vendas
- Segmentacao no Marketing usa campos de formularios, tags, datas de conversao, estagio do funil

### Funcionalidades
- Criacao e gestao de funis de vendas
- Import/export de dados
- Acompanhamento de fontes, campanhas e segmentos
- Relatorios de performance
- Automacao de qualificacao e segmentacao de leads (planos superiores)

### Segmentacao
- Por campos de formularios
- Por tags
- Por data de conversao
- Por paginas visitadas
- Por estagio do funil
- Combinacao de multiplos criterios

### Resumo UX
**Segmentacao forte no Marketing, mais limitada no CRM de vendas.** O RD Station CRM e mais focado em pipeline e tarefas do que em gestao avancada de listas. A segmentacao robusta vive no produto Marketing, nao no CRM.

---

## 4. Salesforce -- List Views e Campaign Members

**Confianca:** Alta (artigo tecnico detalhado acessado)

### List Views
- Acessiveis nas paginas de overview de Leads e Contacts
- Filtram com base em criterios dos objetos Lead/Contact
- **Limitacao critica:** Selecao maxima de 200 registros por vez
- Para adicionar a campanhas: checkbox + botao "Add To Campaign"

### Campaign Members
- Conceito central para agrupar contatos em "campanhas" (que funcionam como listas nomeadas)
- Campaign Members = contatos adicionados a uma campanha especifica
- Campanhas possuem **status de membro** (Sent, Responded, etc.)

### Metodos de Adicao a Campanhas
1. **Via List Views:** Selecionar contatos (max 200) e clicar "Add to Campaign"
2. **Via Report Builder:** Gerar relatorio filtrado e adicionar resultados (max 50.000)
3. **Import CSV:** Importar contatos diretamente como membros de campanha
4. **Automacao:** Via Flow Builder / Process Builder (requer configuracao)
5. **Data Loader:** Import em massa via ferramenta externa

### Limitacoes
- List Views: max 200 registros por selecao
- Report Builder: max 50.000 registros, hierarquia limitada a 4 niveis
- Nao ha ferramenta nativa para manter campanhas automaticamente atualizadas
- Cross-filters sem logica OR

### Resumo UX
**Poderoso mas complexo.** O Salesforce usa "Campaigns" como o conceito mais proximo de listas nomeadas. A UX e pesada e manual -- requer multiplos cliques e repeticoes para grandes volumes. List Views sao uteis para filtragem rapida mas limitadas para acoes em massa.

---

## 5. Kommo (ex-amoCRM) -- Tags

**Confianca:** Media (documentacao oficial parcial acessada)

### Sistema de Tags
- **Localizacao:** Botao "#ADD TAGS" abaixo do nome da entidade (lead, contato, empresa)
- Tags sao o mecanismo primario de organizacao/categorizacao

### Como Criar e Atribuir
- **Individual:** Abrir entidade > clicar ADD TAGS > digitar nome da tag
- **Em massa:** Selecionar multiplos itens na lista > clicar "edit tags"
- Salvamento automatico (sem botao "Save" separado para tags individuais)
- Para remover: clicar na tag multiplas vezes

### Filtragem por Tags
- Secao "Tags" dedicada na busca
- Selecionar uma ou mais tags e clicar "Apply"
- Contagem de uso ao lado de cada tag
- Operadores **AND/OR** para combinar multiplas tags

### Gestao Administrativa
- Administradores podem deletar tags e restringir criacao por usuarios
- **Nomes de tags NAO podem ser editados** -- necessario criar nova tag e reatribuir
- Tags sao **vinculadas a pipelines especificas** -- tag criada no Pipeline 1 nao aparece nos filtros do Pipeline 2

### Resumo UX
**Sistema de tags leve e funcional.** Bom para categorizacao rapida e organica. A limitacao de nao poder editar nomes e a vinculacao a pipelines sao pontos negativos. Nao substitui "listas nomeadas" -- tags sao atributos, nao containers.

---

## 6. Agendor -- Filtros Inteligentes

**Confianca:** Media-Baixa (informacoes genericas de blog/marketing)

### Abordagem
- CRM brasileiro focado em vendas B2B consultivas
- Usa **filtros inteligentes** como mecanismo principal de segmentacao
- Botao "Filtros" nas listagens de negocios, empresas e pessoas

### Segmentacao
- Filtrar por vendedor responsavel
- Filtrar por status de negocio (ganhos, perdidos, em andamento)
- Combinacao de criterios para listagem segmentada
- Foco na gestao da carteira de clientes

### Resumo UX
**Simples e direto.** Modelo baseado em filtros salvos, similar ao Pipedrive. Nao possui conceito explicito de "listas nomeadas". A interface e adaptada ao mercado brasileiro.

---

## 7. Bitrix24 -- Segmentos

**Confianca:** Media (documentacao oficial parcial)

### Tipos de Segmentos

| Tipo | Comportamento |
|------|---------------|
| **Dinamico** | Lista gerada automaticamente antes de cada envio; muda conforme base muda |
| **Estatico** | Lista criada manualmente; permite upload de enderecos/telefones |

### Configuracao
- **Localizacao:** CRM > Settings > CRM Settings > Start point > Statuses and Dropdowns
- Campos "Contact Type" e "Company Type" para categorizacao basica
- Campos customizados tipo "List" para marcar caracteristicas-chave

### Funcionalidades
- Filtragem por tipo de segmento
- Criacao de regras de automacao baseadas em classificacoes
- Analytics por segmento
- Atribuicao de responsaveis por tipo de deal
- **Acoes em grupo:** Selecionar entidades e adicionar a segmento existente ou criar novo

### Resumo UX
**Segmentacao orientada a marketing (mailings).** O conceito de segmentos e fortemente ligado a campanhas de email/SMS. Para uso geral de "listas de contatos", depende de campos customizados e filtros. Acoes em grupo facilitam a gestao em massa.

---

## 8. Close -- Smart Views

**Confianca:** Alta (documentacao e artigos detalhados)

### O que sao Smart Views
- **Saved search queries** que aparecem na **sidebar** da UI
- Equivalente funcional a "listas dinamicas"
- Podem filtrar por leads OU contatos

### Localizacao na UI
- **Sidebar esquerda** com lista de Smart Views
- Icone dedicado ao lado da busca para acessar pagina de Saved Views
- Pagina centralizada com Smart Views, Conversations e Reports

### Visibilidade
- **Private:** Visivel apenas para o criador
- **Shared:** Visivel para toda a Organization

### Smart Views Default
Close vem com 6 Smart Views pre-criadas:
1. Untouched leads
2. Leads to call
3. Leads never emailed
4. Email opened this week
5. No contact >30 days
6. Opportunity follow-up

### Filtragem
- Filtros por qualquer combinacao de campos, atividades, datas, campos customizados
- Lead status, localizacao, data de ultimo contato
- Visual query builder para construir filtros
- Sem limite de Smart Views

### Resumo UX
**Modelo elegante de "busca salva".** Smart Views na sidebar sao intuitivas e imediatas. A ausencia de listas estaticas manuais pode ser limitante -- tudo depende de criterios de filtro. Excelente para equipes que preferem segmentacao dinamica.

---

## Tabela Comparativa

| CRM | Conceito Principal | Localizacao UI | Estatica | Dinamica | Add Manual | Import CSV | Max Filtros | Compartilhavel |
|-----|-------------------|----------------|----------|----------|------------|------------|-------------|---------------|
| **HubSpot** | Segments (Lists) | Pagina dedicada CRM > Segments | Sim | Sim (Active) | Sim | Sim (com criacao de lista) | 250 | Sim (com permissoes) |
| **Pipedrive** | Filters + Labels | Dropdown nas views | Nao (via labels) | Sim (filtros salvos) | Via labels | Sim (import geral) | 16 | Sim (shared/private) |
| **RD Station** | Segmentacao | Dentro do modulo Marketing | Parcial | Sim | Parcial | Sim | N/D | N/D |
| **Salesforce** | Campaigns + List Views | Paginas de overview | Sim (Campaigns) | Parcial (List Views) | Sim (max 200) | Sim | Limitado | Sim |
| **Kommo** | Tags | Inline na entidade | Nao | Nao (filtro por tag) | Sim (tag) | N/D | AND/OR | Admin controla |
| **Agendor** | Filtros Inteligentes | Botao Filtros nas listagens | Nao | Sim (filtros) | Nao | Sim | N/D | N/D |
| **Bitrix24** | Segmentos | CRM Settings + acoes grupo | Sim (upload manual) | Sim (antes de mailings) | Sim | Sim (telefones/emails) | N/D | N/D |
| **Close** | Smart Views | Sidebar esquerda | Nao | Sim (saved searches) | Nao | Sim (import geral) | Sem limite | Sim (shared/private) |

---

## Padroes Identificados

### 1. Dualidade Estatica/Dinamica (padrao dominante)
- **HubSpot** e o benchmark: Active Lists (dinamicas) + Static Lists (manuais) convivem na mesma interface
- **Bitrix24** replica esse modelo no contexto de marketing
- **Salesforce** usa Campaigns (estaticas) + List Views (semi-dinamicas)

### 2. Filtros Salvos como Substitute de Listas (padrao emergente)
- **Close, Pipedrive, Agendor** nao tem "listas" -- usam filtros salvos/Smart Views
- Vantagem: sempre atualizados, sem gestao manual
- Desvantagem: nao suportam agrupamento manual arbitrario

### 3. Tags como Mecanismo de Categorizacao (complementar)
- **Kommo** usa tags como mecanismo primario
- **Pipedrive** usa labels como complemento aos filtros
- Tags permitem categorizacao multi-dimensional (contato pode ter N tags)
- Tags NAO sao listas -- sao atributos no contato

### 4. Import CSV com Criacao de Lista (conveniencia chave)
- **HubSpot** permite criar lista automaticamente durante import
- Outros CRMs importam contatos mas nao criam lista a partir do import
- Este e um diferencial de UX significativo

### 5. UI: Pagina Dedicada vs Sidebar vs Inline
- **HubSpot:** Pagina dedicada com pastas
- **Close:** Sidebar com Smart Views
- **Pipedrive:** Dropdown no topo das views
- **Kommo:** Inline no registro do contato (tags)
- **Salesforce:** Tabs nas paginas de overview

### 6. Especifico para Imobiliario
- CRMs imobiliarios (Top Producer, Follow Up Boss, RealOffice360) enfatizam:
  - **Segmentacao por estagio do funil** (prospect, buyer ativo, past client)
  - **Tags por fonte** (referral, portal, walk-in)
  - **Segmentacao geografica** (bairro, cidade, farming area)
  - Comecar simples e escalar: poucos grupos bem mantidos > muitos grupos vazios

---

## Fontes

- [HubSpot - Create Segments](https://knowledge.hubspot.com/segments/create-active-or-static-lists)
- [HubSpot Active vs Static Lists](https://www.hublead.io/blog/hubspot-active-vs-static-list)
- [HubSpot List Management Masterclass 2025](https://www.pixcell.io/blog/hubspot-list-management-best-practices)
- [Pipedrive Advanced Filtering](https://support.pipedrive.com/en/article/filtering)
- [Pipedrive List Views & Filtering Blog](https://www.pipedrive.com/en/blog/new-list-views-powerful-filtering-of-contacts-and-deals)
- [Pipedrive Segmentation Features](https://www.crm-goat.com/pipedrive-segmentation-features-for-improved-audience-targeting/)
- [RD Station Segmentacao de Leads](https://www.rdstation.com/produtos/marketing/gestao-de-leads/segmentacao-de-leads/)
- [Salesforce Segmentation Approaches](https://www.campaign-audience-builder.com/post/segmentation-in-salesforce-list-views-vs-report-builder-vs-campaign-audience-builder)
- [Salesforce Add Contacts to Campaigns](https://www.salesforceben.com/ways-to-add-leads-to-salesforce-campaigns-as-campaign-members/)
- [Kommo Tag Management](https://www.kommo.com/support/crm/tags/)
- [Bitrix24 Segment Customer Base](https://helpdesk.bitrix24.com/open/23100886/)
- [Close Smart Views](https://help.close.com/docs/search-and-smart-views)
- [Close Create Smart View](https://help.close.com/docs/creating-smart-views)
- [Top Producer Tagging Contacts](https://www.topproducer.com/blog/tagging-contacts-organizing-crm-database)
- [RealOffice360 Contact Database](https://realoffice360.com/article/effective-contact-database-real-estate-agents)
