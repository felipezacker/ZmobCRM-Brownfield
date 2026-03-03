# Competitive Analysis: Tecimob vs Jetimob - Property Management

## 1. Company Overview

| Dimension | Tecimob | Jetimob |
|-----------|---------|---------|
| **Founded** | 2012 | 2010 |
| **Positioning** | Site + CRM + App integrado para corretor | Sistema imobiliario completo (CRM + ERP + Site) |
| **Target** | Corretores autonomos e imobiliarias PME | Imobiliarias de todos os portes, incorporadoras, loteadoras |
| **Starting Price** | R$129,90/mes (self-service) | R$199/mes (Lite, pagamento anual) |
| **User Add-on** | R$19,90/usuario adicional | R$29,90/usuario adicional |
| **App** | Nativo iOS/Android | Responsivo (sem app nativo, acesso via browser mobile) |
| **API** | Nao disponivel publicamente | Disponivel nos planos Pro e Enterprise |
| **Trial** | Sim (periodo limitado) | 7 dias gratis |

### Plans Comparison

**Tecimob:**
- Plano unico: R$129,90/mes (self-service) ou R$129,90/mes + R$499,90 implantacao
- Plano anual: 6x R$259,80 (com implantacao gratis)
- Imoveis e contatos ilimitados em todos os planos

**Jetimob:**
- Lite: R$199/mes, 1 usuario, 250 imoveis ativos
- Pro: R$367/mes, 5 usuarios, 750 imoveis ativos (mais popular)
- Enterprise: R$749/mes, 10 usuarios, 5.000 imoveis ativos
- Modulo Aluguel: R$149/mes + R$1/contrato ativo

---

## 2. Cadastro de Imoveis (Property Registration)

### 2.1 Tecimob - Fluxo de Cadastro

O Tecimob usa um wizard de 25 etapas sequenciais com menu lateral. O fluxo:

1. **Informacoes basicas** - Campos obrigatorios marcados com asterisco vermelho
2. **Comodos** - Definicao de quartos, banheiros, etc.
3. **Tipo de negocio e preco** - Venda/locacao, valor (pode ocultar no site)
4. **Caracteristicas do imovel** - Checkboxes para features (elevador com campo quantidade, etc). Permite adicionar novas caracteristicas customizadas
5. **Caracteristicas do condominio** - Amenidades do predio/condominio
6. **Localizacao** - CEP com busca automatica via Google Maps. Pode cadastrar novas cidades/bairros/zonas
7. **Estabelecimentos proximos** - Selecao de POIs proximos, com opcao de adicionar novos
8. **Titulo e descricao** - Titulo da pagina + texto de apresentacao. **Botao "Gerar descricao" com ChatGPT** que cria texto baseado nas informacoes cadastradas
9. **Videos e tours 360** - Links YouTube + links de tours (Roundme, Meu Passeio Virtual)
10. **Dados privativos** - Informacoes internas invisiveis ao cliente (mobilia, observacoes)
11. **Compromissos e documentos** - Autorizacoes, placa, exclusividade, chaves, certidoes
12. **Fotos** - Upload com 3 categorias (imovel, planta, privativas)
13. **Publicacao** - Visibilidade no site, destaques, banner, link proprietario
14. **Portais** - Selecao de portais para sindicalizar
15. **SEO** - Edicao avancada de meta tags

**Diferenciais:**
- Geracao de descricao por IA (ChatGPT integrado)
- Dados privativos separados dos dados publicos
- Controle de compromissos/documentos dentro do cadastro
- Imoveis ILIMITADOS em todos os planos

### 2.2 Jetimob - Fluxo de Cadastro

O Jetimob descreve um cadastro "completo e intuitivo" com:

1. **Dados basicos** - Tipo, endereco, quartos, banheiros, metragem, vagas
2. **Caracteristicas e acabamentos** - Detalhamento de features
3. **Midia** - Fotos, videos, plantas, tours 360 (galeria multi-midia)
4. **Condominio** - Vinculo com cadastro de condominio separado (reusavel)
5. **Localizacao** - Com controle de precisao de exibicao
6. **Permutas** - Configuracao de permutas aceitas
7. **Exclusividade** - Gestao de status de exclusividade
8. **Filtros avancados** - Sistema robusto de filtragem
9. **Historico de alteracoes** - Audit trail completo de mudancas

**Diferenciais:**
- Vinculo com condominio como entidade separada (nao duplica dados)
- Gestao de permutas (trade-in) nativa
- Historico completo de alteracoes com audit trail
- Gestao de exclusividade como modulo dedicado
- Limite de imoveis por plano (250/750/5000)
- Etiquetas (tags customizaveis) para organizacao

### 2.3 Comparacao Direta - Cadastro

| Feature | Tecimob | Jetimob | ZmobCRM Priority |
|---------|---------|---------|-----------------|
| Wizard sequencial | Sim (25 passos) | Nao detalhado | MEDIA |
| Geracao descricao IA | Sim (ChatGPT) | Integracao ChatGPT | ALTA |
| Dados privativos | Sim (secao separada) | Nao confirmado | ALTA |
| Vinculo condominio | Dentro do cadastro | Entidade separada reutilizavel | ALTA |
| Gestao exclusividade | Basico (checkbox) | Modulo dedicado | MEDIA |
| Permutas | Nao mencionado | Modulo dedicado | BAIXA |
| Historico alteracoes | Nao confirmado | Sim, completo | ALTA |
| Imoveis ilimitados | Sim | Nao (por plano) | VANTAGEM COMPETITIVA |
| Controle de chaves | Sim (compromissos) | Modulo dedicado | MEDIA |
| Tags/etiquetas | Nao mencionado | Sim | MEDIA |

---

## 3. Matching Imoveis-Contatos

### 3.1 Tecimob - Radar de Oportunidades

O Tecimob possui o recurso "Radar de Oportunidades":

**Como funciona:**
1. Quando um cliente entra em contato (site, portal, WhatsApp), o CRM gera automaticamente um **perfil de interesse**
2. O corretor pode criar manualmente o perfil do imovel desejado pelo cliente
3. A cada novo imovel cadastrado, o sistema cruza com todos os perfis e gera uma **lista de clientes compativeis**
4. Notificacao na aba "Radar de Oportunidades" quando ha match
5. O corretor pode enviar imoveis compativeis via WhatsApp, email ou descartar com um clique

**Fluxo:**
```
Novo imovel cadastrado
    -> Sistema cruza com perfis de interesse dos clientes
    -> Lista de clientes compativeis gerada
    -> Notificacao no "Radar de Oportunidades"
    -> Corretor envia ou descarta
```

**Inverso:**
```
Novo cliente com perfil criado
    -> Sistema notifica quando imovel compativel aparece
    -> Notificacao no radar
```

### 3.2 Jetimob - Oportunidades + JetPage

O Jetimob usa uma abordagem em duas camadas:

**Camada 1 - Matching automatico:**
- Ao cruzar informacoes do catalogo com a oportunidade, o sistema gera uma **lista de imoveis compativeis automaticamente**
- O corretor pode tambem selecionar imoveis manualmente

**Camada 2 - JetPage (diferencial exclusivo):**
- Pagina web exclusiva gerada para cada cliente
- Contem apenas imoveis pre-selecionados para aquele cliente (automaticos + manuais)
- O cliente pode: solicitar mais info, agendar visita, indicar desinteresse
- Todas as interacoes sao registradas automaticamente na timeline do CRM
- Elimina distracao do site geral (banners, buscas, imoveis nao relacionados)

**Fluxo:**
```
Oportunidade criada no funil
    -> Sistema sugere imoveis compativeis
    -> Corretor seleciona/favorita imoveis
    -> JetPage gerada com selecao
    -> Link compartilhado com cliente
    -> Cliente interage (agenda visita, pede info, descarta)
    -> Interacoes registradas na timeline do CRM
```

### 3.3 Comparacao - Matching

| Feature | Tecimob | Jetimob | ZmobCRM Priority |
|---------|---------|---------|-----------------|
| Perfil de interesse automatico | Sim | Sim (via oportunidade) | CRITICA |
| Match automatico imovel-cliente | Sim (radar) | Sim (lista compativel) | CRITICA |
| Notificacao de match | Sim | Sim | ALTA |
| Pagina exclusiva por cliente | Nao | Sim (JetPage) | ALTA |
| Descarte com 1 clique | Sim | Sim (via JetPage) | MEDIA |
| Envio via WhatsApp | Sim | Sim | ALTA |
| Registro de interacoes | Basico | Completo (timeline) | ALTA |

---

## 4. Integracao com Orulo

### 4.1 Tecimob - Orulo

- **Custo:** R$24,90/mes adicional
- **Tipo:** Integracao de estoque de incorporadoras/loteadoras
- **Funcionalidade:** Espelha imoveis de incorporadoras no catalogo do corretor
- **Gestao:** Centralizada no Tecimob - gerencia uma vez, publica em todos os portais
- **Integracao DWV:** Tambem disponivel por R$24,90/mes

### 4.2 Jetimob - Orulo

- **Custo:** Incluso no plano Lite (como add-on R$49,90), incluso nos planos Pro e Enterprise
- **Autenticacao:** Client ID + Client Secret obtidos na plataforma Orulo
- **Configuracoes disponiveis:**
  - Visibilidade dos imoveis (quais mostrar no site)
  - Anuncio automatico no site
  - Nivel de precisao de localizacao exibido
  - Valores exibidos publicamente
  - Exibicao no mapa do site
- **Integracoes adicionais:** DWV e Studio 360 para estoque de incorporadoras

### 4.3 Como Orulo Funciona (contexto geral)

A Orulo e uma plataforma que facilita o contato entre incorporadoras, loteadoras, imobiliarias e corretores. Funciona como um "banco de imoveis" de lancamentos:

1. **Incorporadora** cadastra seus empreendimentos/lancamentos na Orulo
2. **Corretor/imobiliaria** se conecta via API (client ID + secret)
3. **Imoveis de lancamento** aparecem no catalogo do CRM automaticamente
4. **Corretor decide** quais imoveis exibir no seu site/portais
5. **Dados sincronizados** automaticamente (precos, disponibilidade, plantas)

### 4.4 Comparacao - Orulo

| Feature | Tecimob | Jetimob | ZmobCRM Priority |
|---------|---------|---------|-----------------|
| Integracao Orulo | Sim (add-on R$24,90) | Sim (incluso Pro/Enterprise) | ALTA |
| Integracao DWV | Sim (add-on R$24,90) | Sim | MEDIA |
| Studio 360 | Nao mencionado | Sim | BAIXA |
| Controle visibilidade | Basico | Granular (localizacao, preco, mapa) | ALTA |
| Autenticacao API | Nao detalhado | Client ID + Client Secret | REFERENCIA |
| Sync automatico | Sim | Sim | CRITICA |

---

## 5. Pagina de Detalhes do Imovel - Campos e Layout

### 5.1 Campos Essenciais (consenso entre ambas plataformas)

**Dados Basicos:**
- Tipo do imovel (casa, apartamento, terreno, sala comercial, etc.)
- Finalidade (venda, locacao, temporada)
- Endereco completo + CEP
- Preco (com opcao de ocultar)
- Area total e area construida
- Quartos, suites, banheiros, vagas de garagem
- Andar (para apartamentos)
- IPTU

**Caracteristicas/Features:**
- Checkboxes de amenidades (elevador, piscina, churrasqueira, etc.)
- Quantidade quando aplicavel (ex: 2 elevadores)
- Possibilidade de criar caracteristicas customizadas

**Condominio:**
- Nome do condominio
- Taxa de condominio
- Amenidades do condominio (academia, salao de festas, etc.)
- Em Jetimob: entidade separada vinculada

**Localizacao:**
- CEP com autopreenchimento via Google Maps
- Bairro, cidade, estado
- Coordenadas (com nivel de precisao controlavel)
- Estabelecimentos proximos (escolas, comercio, transporte)

**Midia:**
- Fotos do imovel (upload, drag-and-drop para reordenar)
- Fotos da planta baixa
- Fotos privativas (nao visiveis ao cliente)
- Videos (YouTube)
- Tours virtuais 360
- Legenda/caption por foto

**Descricao:**
- Titulo da pagina/anuncio
- Texto descritivo (com IA para gerar)
- Perfil do morador ideal
- Posicao do sol
- Vistas
- Informacoes do bairro

**Controle/Gestao:**
- Status (ativo, inativo, vendido, alugado)
- Exclusividade
- Disponibilidade de chaves
- Autorizacao do proprietario
- Data de revisao/atualizacao agendada
- Portais para sindicalizar

**Dados Privativos (Tecimob):**
- Descricao de mobilia
- Observacoes internas
- Documentos anexados

### 5.2 Layout Tipico

Baseado nos padroes observados, a pagina de detalhes segue este layout:

```
+--------------------------------------------------+
| GALERIA DE FOTOS (carrossel principal)            |
| [Foto grande] [Thumbnails] [Video] [Tour 360]    |
+--------------------------------------------------+
| TITULO + PRECO              | ACOES              |
| Tipo | Quartos | m2 | Vagas | [Compartilhar]     |
|                              | [Favoritar]        |
|                              | [Agendar Visita]   |
+--------------------------------------------------+
| DESCRICAO                                         |
| Texto livre + descricao gerada                   |
+--------------------------------------------------+
| CARACTERISTICAS              | CONDOMINIO          |
| [] Elevador (2)              | [] Academia         |
| [] Piscina                   | [] Salao Festas     |
| [] Churrasqueira             | [] Playground       |
+--------------------------------------------------+
| LOCALIZACAO                                       |
| Mapa + Endereco + Estabelecimentos proximos      |
+--------------------------------------------------+
| DADOS DO CORRETOR                                 |
| Nome + Foto + WhatsApp + Formulario contato      |
+--------------------------------------------------+
```

---

## 6. Gestao de Fotos

### 6.1 Tecimob

- **3 categorias de fotos:** Imovel, Planta baixa, Privativas (cliente nao ve)
- **Upload:** Botao "Enviar fotos" com upload em lote
- **Organizacao:** Drag-and-drop para reordenar
- **Legendas:** Campo de legenda por foto
- **Capa:** Primeira foto automaticamente vira thumbnail/capa
- **Marca d'agua:** Configuracao automatica (Site > Marca d'agua imagens)
  - Recomendacoes: cor branca, transparencia, canto inferior direito
- **Formulario na galeria:** Formulario de contato integrado a galeria de fotos do site

### 6.2 Jetimob

- **Galeria multi-midia:** Fotos, videos, plantas e tours 360 em um so lugar
- **Galeria do condominio:** Midias separadas para o condominio (reusaveis entre imoveis do mesmo predio)
- **Formatos:** Suporte a fotos, videos, plantas baixas, tours 360
- **Organizacao:** Etiquetas para categorizacao

### 6.3 Comparacao - Fotos

| Feature | Tecimob | Jetimob | ZmobCRM Priority |
|---------|---------|---------|-----------------|
| Upload em lote | Sim | Sim | CRITICA |
| Drag-and-drop reorder | Sim | Nao confirmado | ALTA |
| Legenda por foto | Sim | Nao confirmado | MEDIA |
| Foto de capa automatica | Sim (primeira) | Nao detalhado | ALTA |
| Marca d'agua automatica | Sim | Nao confirmado | ALTA |
| Fotos privativas | Sim (3 categorias) | Nao confirmado | ALTA |
| Galeria condominio separada | Nao | Sim | MEDIA |
| Tours 360 | Sim (via link) | Sim (integrado) | MEDIA |
| Videos YouTube | Sim | Sim | MEDIA |

---

## 7. Deals/Negociacoes Vinculados a Imoveis

### 7.1 Tecimob

O Tecimob nao possui um funil de vendas visual (kanban) robusto. O foco esta em:

- **Historico de interacoes** por cliente
- **Radar de oportunidades** como trigger de novas negociacoes
- **Gestao de visitas** com criacao de scripts de visita
- **Comparador de imoveis** para apresentar opcoes ao cliente
- **Relatorios de gestao** sobre performance

**Modelo:** Mais centrado no contato do que no deal. O "deal" e implicito na relacao corretor-cliente-imovel.

### 7.2 Jetimob

O Jetimob tem um sistema robusto de deals com tres modulos interligados:

**a) Pipeline de Vendas (Funil Personalizado):**
- Visualizacao Kanban ou Lista
- Etapas personalizaveis (nomes, quantidade, tempo de atualizacao)
- 5 etapas padrao: Captacao > Qualificacao > Visita > Negociacao > Fechamento
- Cada oportunidade = um card que avanca pelas etapas
- Disponivel no plano Pro+

**b) Gestao de Propostas:**
- Propostas criadas dentro de oportunidades
- Vinculadas a imoveis especificos de interesse do cliente
- Campos: finalidade (venda/locacao/temporada), valor, responsavel, prazo de vencimento
- **Fila de prioridade** quando multiplas propostas disputam o mesmo imovel
- Historico completo por imovel (quem fez, quando, valor)
- Relatorios filtrados por imovel e status
- Cancelamento de propostas

**c) Gestao de Vendas:**
- Emissao de contratos
- Assinatura eletronica
- Gestao de comissoes (divisao entre corretores)
- Integracao com ERP financeiro

**Modelo:** Centrado na oportunidade (deal) que conecta cliente + imovel + corretor + proposta.

### 7.3 Comparacao - Deals

| Feature | Tecimob | Jetimob | ZmobCRM Priority |
|---------|---------|---------|-----------------|
| Pipeline visual (Kanban) | Nao | Sim (Pro+) | JA IMPLEMENTADO |
| Etapas personalizaveis | N/A | Sim | ALTA |
| Propostas formais | Nao | Sim (completo) | ALTA |
| Fila de prioridade propostas | Nao | Sim | MEDIA |
| Historico proposta por imovel | Nao | Sim | ALTA |
| Assinatura eletronica | Nao | Sim | BAIXA (futuro) |
| Gestao comissoes | Nao | Sim | MEDIA |
| Contratos | Nao | Sim | BAIXA (futuro) |

---

## 8. Funcionalidades Adicionais Relevantes

### 8.1 Recursos que Ambos Tem

| Feature | Descricao |
|---------|-----------|
| Integracao portais | Publicacao automatica em portais (ZAP, OLX, VivaReal, etc.) |
| Lead distribution | Distribuicao automatica de leads para equipe |
| WhatsApp integration | Plugin/integracao com WhatsApp Web |
| Google Agenda | Sincronizacao de compromissos |
| LGPD | Conformidade com lei de protecao de dados |
| Relatorios ao proprietario | Emails automaticos para donos do imovel |
| Dashboard | Metricas e indicadores do negocio |

### 8.2 Exclusivos Tecimob

| Feature | Descricao |
|---------|-----------|
| App nativo iOS/Android | Aplicativo completo |
| Gerador de cartao virtual | Para corretor compartilhar |
| PopUp de recepcao no site | Para captura de leads |
| Plugin WhatsApp no CRM | Funcoes CRM dentro do WhatsApp Web |
| Imoveis ilimitados | Sem limite em nenhum plano |
| Hotsite ilimitados | Para campanhas especificas |

### 8.3 Exclusivos Jetimob

| Feature | Descricao |
|---------|-----------|
| JetPage | Pagina exclusiva por cliente |
| ERP de alugueis | Gestao completa de locacao |
| Gestao financeira | Fluxo de caixa, cobrancas |
| Assinatura eletronica | Contratos digitais |
| Controle de chaves (modulo) | Gestao de chaves como entidade |
| Webhooks | Automacoes em tempo real |
| API publica | Integracao com sistemas externos |
| Checklists operacionais | Controle de atividades da equipe |
| DIMOB | Geracao de declaracao fiscal |
| Seguro incendio | Contratacao dentro do sistema |
| Subcondominio | Para grandes empreendimentos |

---

## 9. Integracoes - Mapa Completo

### Tecimob
- Portais imobiliarios (ZAP, OLX, VivaReal, ImovelWeb, etc.)
- Orulo (R$24,90/mes)
- DWV (R$24,90/mes)
- Facebook (Leads + Loja)
- Google Agenda
- WhatsApp (plugin)
- ChatGPT (geracao de descricao)

### Jetimob
- Portais imobiliarios (40+ portais)
- Orulo
- DWV
- Studio 360
- Facebook Lead Ads
- ChatGPT
- RD Station (marketing)
- Zapier (Pro+)
- Make (Enterprise)
- Casafy
- Homer
- Mercado Livre
- OLX
- Zap Imoveis
- Imovel Web
- Apto
- Mapfre (seguros)
- C2S
- GreatPages

---

## Confidence Assessment

| Section | Confidence | Notes |
|---------|-----------|-------|
| Cadastro de imoveis | ALTA | Dados do help center e feature pages |
| Matching imoveis-contatos | ALTA | Descricoes detalhadas de ambas plataformas |
| Integracao Orulo | MEDIA-ALTA | Jetimob mais detalhado, Tecimob generico |
| Pagina de detalhes | MEDIA | Inferido de cadastro + blog posts, sem screenshot direto |
| Gestao de fotos | ALTA | Tecimob muito detalhado, Jetimob menos |
| Deals/negociacoes | ALTA | Jetimob muito detalhado, Tecimob confirmado como basico |
| Pricing | ALTA | Dados diretos dos sites oficiais |
