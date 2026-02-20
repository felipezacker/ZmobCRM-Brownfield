# Pesquisa: API do Portal Orulo (Importacao de Imoveis para o ZmobCRM)

> **Data:** 2026-02-19
> **Autor:** Atlas (Analyst Agent)
> **Objetivo:** Mapear requisitos tecnicos para IMPORTAR imoveis da Orulo para o ZmobCRM

---

## 1. Resumo Executivo

| Aspecto | Detalhe |
|---|---|
| **Portal** | Orulo (orulo.com.br) |
| **Tipo** | Plataforma B2B de distribuicao de imoveis primarios (lancamentos) |
| **Metodo de Integracao** | REST API v2 (JSON) |
| **Autenticacao** | OAuth 2.0 (Client Credentials) |
| **Base URL** | `https://www.orulo.com.br/` |
| **Direcao** | **PULL** — Puxar imoveis da Orulo para o ZmobCRM |
| **Custo** | R$ 0,39 por empreendimento ativo/mes |
| **Documentacao oficial** | https://documento.orulo.com.br/ |
| **Suporte** | Via portal Orulo |

**Descoberta chave:** Diferente dos outros portais (ZAP, OLX, Chaves na Mao) onde o ZmobCRM PUBLICA imoveis, a Orulo e uma fonte de IMPORTACAO. A Orulo conecta incorporadoras/construtoras a imobiliarias, centralizando estoques de lancamentos. O ZmobCRM puxaria esses dados para alimentar a carteira da imobiliaria.

---

## 2. O que e a Orulo

A Orulo e a maior plataforma de gestao de estoques de imoveis primarios (lancamentos) do Brasil:

- **Conecta:** Incorporadoras/Construtoras ↔ Imobiliarias/Corretores
- **Centraliza:** Dados de milhares de empreendimentos em um unico lugar
- **Fornece:** Dados completos dos lancamentos, tabelas de disponibilidade e valores, comissionamento, fotos, plantas, videos, localizacao, arquivos
- **Integracao:** 40+ CRMs imobiliarios ja integrados (Jetimob, Kenlo, Loft, SmartImob, etc.)
- **Privacidade:** A incorporadora NAO tem acesso aos leads/contatos da imobiliaria

---

## 3. Autenticacao - OAuth 2.0 (Client Credentials)

### 3.1 Obter Credenciais

Solicitar `client_id` e `client_secret` junto a Orulo (via contrato/parceria).

### 3.2 Obter Access Token

```http
POST https://www.orulo.com.br/oauth/token
Content-Type: application/x-www-form-urlencoded

client_id={clientId}&client_secret={clientSecret}&grant_type=client_credentials
```

**Response:**
```json
{
  "access_token": "TOKEN_AQUI",
  "token_type": "Bearer",
  "expires_in": 7200,
  "created_at": 1708358400,
  "scope": "public"
}
```

### 3.3 Usar Token nas Requisicoes

```http
Authorization: Bearer {access_token}
```

**Importante:** O token tem validade (`expires_in`). Implementar refresh automatico antes da expiracao.

---

## 4. Endpoints da API v2

### 4.1 Empreendimentos (Buildings)

#### Listar todos os empreendimentos

```http
GET https://www.orulo.com.br/api/v2/buildings
Authorization: Bearer {token}
```

Suporta parametros de filtragem (paginacao, localizacao, etc.).

#### Buscar empreendimento por ID

```http
GET https://www.orulo.com.br/api/v2/buildings/{buildingId}
Authorization: Bearer {token}
```

**Response (estrutura inferida da documentacao e SDK):**
```json
{
  "id": 1234,
  "name": "Residencial Vista Mar",
  "description": "Empreendimento de alto padrao...",
  "address": "Rua Example, 100",
  "neighborhood": "Consolacao",
  "city": "Sao Paulo",
  "state": "SP",
  "postal_code": "01415-000",
  "latitude": -23.5531,
  "longitude": -46.6599,
  "status": "launching",
  "developer": {
    "id": 456,
    "name": "Construtora ABC"
  },
  "typologies": [
    {
      "id": 1,
      "bedrooms": 2,
      "suites": 1,
      "bathrooms": 2,
      "parking_spots": 1,
      "living_area": 65.0,
      "total_area": 80.0,
      "min_price": 450000,
      "max_price": 520000
    }
  ],
  "amenities": ["Piscina", "Academia", "Playground"],
  "delivery_date": "2027-06-01",
  "updated_at": "2026-02-19T10:00:00Z"
}
```

#### Buscar empreendimento por nome

```http
GET https://www.orulo.com.br/api/v2/buildings/{name}/search
Authorization: Bearer {token}
```

### 4.2 Imagens do Empreendimento

```http
GET https://www.orulo.com.br/api/v2/buildings/{buildingId}/images
Authorization: Bearer {token}
```

Suporta parametro `dimensions[]` para solicitar tamanhos especificos:
- `200x140` (thumbnail)
- `520x280` (medio)
- `1024x1024` (alta resolucao)

### 4.3 Arquivos do Empreendimento

```http
GET https://www.orulo.com.br/api/v2/buildings/{buildingId}/files/{fileId}
Authorization: Bearer {token}
```

Permite baixar plantas, tabelas de precos, materiais de venda, etc.

### 4.4 Parceiros (Incorporadoras)

```http
GET https://www.orulo.com.br/api/v2/partners
GET https://www.orulo.com.br/api/v2/partners/{partnerId}
GET https://www.orulo.com.br/api/v2/partners/{name}/search
Authorization: Bearer {token}
```

### 4.5 Estados (Enderecos)

```http
GET https://www.orulo.com.br/api/v2/addresses/states
Authorization: Bearer {token}
```

### 4.6 Links de Publicacao

```http
PUT https://www.orulo.com.br/api/v2/buildings/{buildingId}/publication_links
Authorization: Bearer {client_token}
```

Permite informar a Orulo onde o empreendimento foi publicado (link no site da imobiliaria).

---

## 5. Dados Disponiveis para Importacao

Baseado na documentacao e integradores existentes, a Orulo fornece:

| Dado | Descricao |
|---|---|
| **Dados do empreendimento** | Nome, descricao, status, previsao de entrega |
| **Localizacao completa** | Endereco, bairro, cidade, UF, CEP, lat/long |
| **Tipologias** | Tipos de unidades (1 quarto, 2 quartos, etc.) com areas e faixas de preco |
| **Tabela de disponibilidade** | Unidades disponiveis, vendidas, reservadas |
| **Tabela de valores** | Precos por unidade/tipologia |
| **Comissionamento** | Percentual de comissao para a imobiliaria |
| **Fotos** | Perspectivas, decorados, implantacao (multiplas resolucoes) |
| **Plantas** | Plantas baixas das unidades |
| **Videos** | Links de video do empreendimento |
| **Localizacao Google Maps** | Coordenadas para mapa |
| **Arquivos** | Materiais de venda, tabelas, books |
| **Dados da incorporadora** | Nome, contato comercial |
| **Link do imovel na Orulo** | URL do anuncio na plataforma |

---

## 6. Fluxo de Integracao para o ZmobCRM

### 6.1 Fluxo de Sincronizacao

```
1. ZmobCRM obtem access_token via OAuth (client_credentials)
2. ZmobCRM chama GET /api/v2/buildings (lista empreendimentos)
3. Para cada empreendimento novo/atualizado:
   a. GET /api/v2/buildings/{id} (detalhes completos)
   b. GET /api/v2/buildings/{id}/images (fotos)
   c. GET /api/v2/buildings/{id}/files (arquivos/plantas)
4. ZmobCRM salva/atualiza no Supabase (tabela properties ou buildings)
5. ZmobCRM envia publication_links de volta a Orulo (opcional)
6. Repetir diariamente (sync automatico)
```

### 6.2 Arquitetura Proposta

```
Orulo API (REST v2)
     |
     |  OAuth 2.0 + GET /api/v2/buildings
     v
Orulo Sync Service (ZmobCRM)
     |
     |---> Mapear tipologias → Properties no Supabase
     |---> Baixar imagens → CDN/Storage do ZmobCRM
     |---> Armazenar arquivos → Supabase Storage
     |---> Rastrear sync status → orulo_sync_log
     |
     +---> PUT publication_links → Informar Orulo onde publicou
```

### 6.3 Componentes Necessarios

| Componente | Descricao |
|---|---|
| **Orulo Auth Client** | Gerencia OAuth tokens (obter, renovar, cache) |
| **Orulo API Client** | Wrapper para todos os endpoints da API v2 |
| **Orulo Sync Service** | Job agendado (cron/serverless) para sync diario |
| **Property Mapper** | Mapeia dados Orulo → modelo de imovel do ZmobCRM |
| **Orulo Sync Log** | Tabela para rastrear ultima sync, status, erros |
| **Configuracao de Regioes** | UI para selecionar regioes de interesse (evitar custos desnecessarios) |

---

## 7. Comparativo: Orulo vs Outros Portais

| Aspecto | ZAP/VivaReal | OLX | Chaves na Mao | **Orulo** |
|---|---|---|---|---|
| **Direcao** | Push (publicar) | Push (publicar) | Push (publicar) | **Pull (importar)** |
| **Formato** | XML (VRSync) | JSON (REST) | XML (CNM) | **JSON (REST v2)** |
| **Autenticacao** | URL publica | OAuth 2.0 | Contrato + email | **OAuth 2.0 (client_credentials)** |
| **Tipo de imovel** | Qualquer | Qualquer | Qualquer | **Lancamentos (primarios)** |
| **Custo** | Plano do portal | Plano do portal | Plano do portal | **R$ 0,39/empreendimento/mes** |
| **Sync** | Portal puxa 12h | CRM envia real-time | Portal puxa diario | **CRM puxa (agendado)** |

---

## 8. Mapeamento de Dados Orulo → ZmobCRM

| Campo Orulo | Campo ZmobCRM (Properties) | Notas |
|---|---|---|
| `id` | `orulo_id` | ID externo para rastreamento |
| `name` | `title` | Nome do empreendimento |
| `description` | `description` | Descricao |
| `address` | `address` | Endereco |
| `neighborhood` | `neighborhood` | Bairro |
| `city` | `city` | Cidade |
| `state` | `state` | UF |
| `postal_code` | `zip_code` | CEP |
| `latitude` | `latitude` | Coordenada |
| `longitude` | `longitude` | Coordenada |
| `typologies[].bedrooms` | `bedrooms` | Por tipologia → gerar 1 property por tipo |
| `typologies[].suites` | `suites` | Suites |
| `typologies[].bathrooms` | `bathrooms` | Banheiros |
| `typologies[].parking_spots` | `garage` | Vagas |
| `typologies[].living_area` | `living_area` | Area util |
| `typologies[].total_area` | `total_area` | Area total |
| `typologies[].min_price` | `sale_price` | Usar min_price ou faixa |
| `developer.name` | `developer_name` | Novo campo |
| `delivery_date` | `delivery_date` | Novo campo |
| `status` | `building_status` | Novo campo (launching, under_construction, ready) |
| `images` | `photos` | URLs das imagens |
| `amenities` | `features` | Comodidades |

### 8.1 Novos Campos Necessarios no Property Model

| Campo | Tipo | Descricao |
|---|---|---|
| **orulo_id** | Integer | ID do empreendimento na Orulo |
| **source** | Enum | Origem do imovel: "manual", "orulo", etc. |
| **developer_name** | String | Nome da incorporadora |
| **delivery_date** | Date | Previsao de entrega |
| **building_status** | Enum | Status: lancamento, em obra, pronto |
| **commission_rate** | Float | Percentual de comissao |
| **building_name** | String | Nome do edificio/empreendimento |
| **min_price** | Float | Preco minimo da tipologia |
| **max_price** | Float | Preco maximo da tipologia |
| **orulo_last_sync** | Timestamp | Ultima sincronizacao com Orulo |
| **orulo_url** | URL | Link do imovel na Orulo |

---

## 9. Consideracoes de Implementacao

### 9.1 Estrategia de Sync

- **Sync incremental:** Usar `updated_at` para puxar apenas empreendimentos alterados
- **Frequencia:** Diario (recomendado) — alinhado com pratica dos CRMs integrados
- **Primeira carga:** Pode levar ate 48h (conforme documentacao de integradores)
- **Regioes:** Configurar filtro por estado/cidade para evitar custos desnecessarios

### 9.2 Tipologias vs Properties

Um empreendimento na Orulo pode ter multiplas tipologias (1 quarto, 2 quartos, etc.). Duas estrategias:

| Estrategia | Prós | Contras |
|---|---|---|
| **1 property por tipologia** | Cada tipo vira um anuncio separado | Multiplica registros |
| **1 property por empreendimento** | Um registro com tipologias como JSON | Menos granular para buscas |

**Recomendacao:** 1 property por tipologia, pois permite publicar nos outros portais (ZAP, OLX) individualmente.

### 9.3 Tratamento de Imagens

- Orulo suporta multiplas resolucoes via parametro `dimensions[]`
- Baixar em resolucao alta (1024x1024) e armazenar no Supabase Storage
- Gerar thumbnails localmente para performance

### 9.4 Rate Limiting

- Documentacao oficial nao especifica limites claros
- Recomendacao: implementar backoff exponencial e respeitar headers de rate limit
- Nao fazer mais de 60 requests/minuto como medida preventiva

---

## 10. Proximos Passos

1. **Solicitar credenciais:** Contatar Orulo para obter `client_id` e `client_secret`
2. **Implementar Orulo Auth Client:** Modulo OAuth com cache de token
3. **Implementar Orulo API Client:** Wrapper TypeScript para endpoints v2
4. **Criar Orulo Sync Service:** Job agendado (Next.js API Route ou Supabase Edge Function)
5. **Adicionar campos ao Property Model:** `orulo_id`, `source`, `developer_name`, etc.
6. **Criar UI de configuracao:** Selecao de regioes, frequencia de sync, status
7. **Implementar Property Mapper:** Conversao Orulo → ZmobCRM com suporte a tipologias
8. **Testar integracao:** Validar sync com empreendimentos reais

---

## 11. Fontes

**Orulo - Oficial:**
- [Orulo - Plataforma](https://www.orulo.com.br/)
- [Orulo - Documentacao API](https://documento.orulo.com.br/)
- [Orulo - Integracoes](https://www.orulo.com.br/integracoes)
- [Fluxo de Integracao de Catalogo](https://movidesk.orulo.com.br/kb/pt-br/article/189733/fluxo-da-integracao-de-catalogo-de-imoveis-da-orulo-em-sistemas-)
- [Fluxo de Integracao via API - Inteligencia de Mercado](https://orulo.movidesk.com/kb/pt-br/article/460395/fluxo-de-integracao-via-api-para-o-inteligencio-de-mercada-de-im)
- [Extrair dados - Acesso via API](https://movidesk.orulo.com.br/kb/pt-br/article/519340/extrair-dados-acesso-via-api)

**SDK e Codigo-Fonte (referencia tecnica):**
- [Orulo SDK PHP (nao-oficial)](https://github.com/leonnleite/orulo-sdk) — Endpoints e autenticacao confirmados via codigo-fonte

**Integradores (referencia de implementacao):**
- [Integracao Orulo - Imobzi](https://help.imobzi.com/pt-br/article/como-funciona-a-integracao-com-a-orulo-15hb8ix/)
- [Integracao Orulo - Universal Software](https://www.universalsoftware.com.br/integracao-orulo)

---

*Gerado por Atlas (Analyst Agent) — Synkra AIOS*
