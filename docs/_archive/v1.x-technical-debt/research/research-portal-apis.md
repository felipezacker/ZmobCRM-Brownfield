# Pesquisa: APIs dos Portais Imobiliarios (ZAP, VivaReal, OLX)

> **Data:** 2026-02-19
> **Autor:** Atlas (Analyst Agent)
> **Objetivo:** Mapear requisitos tecnicos para integracao do ZmobCRM com os principais portais imobiliarios do Brasil

---

## 1. Resumo Executivo

Os tres portais (ZAP, VivaReal e OLX) pertencem ao **mesmo grupo (Grupo OLX/ZAP)**, o que simplifica a integracao:

| Portal | Metodo de Integracao | Formato | Frequencia |
|---|---|---|---|
| **ZAP Imoveis** | Feed XML (URL hospedada) | VRSync (obrigatorio) | Leitura a cada 12h |
| **VivaReal** | Feed XML (URL hospedada) | VRSync (obrigatorio) | Leitura a cada 12h |
| **OLX** | REST API (JSON) | JSON via PUT | Tempo real (com rate limit) |

**Descoberta chave:** ZAP e VivaReal usam o MESMO feed XML. Uma unica integracao publica nos dois portais simultaneamente.

---

## 2. ZAP Imoveis + VivaReal (Grupo ZAP)

### 2.1 Visao Geral

- **Portal de desenvolvedores:** https://developers.grupozap.com/
- **Metodo:** Feed XML hospedado em URL publica
- **Formato obrigatorio:** VRSync (formato ZAP antigo esta DESCONTINUADO)
- **Frequencia:** Portal le o XML a cada 12 horas
- **Cobertura:** Um unico XML publica em ZAP E VivaReal simultaneamente

### 2.2 Tipos de Integracao Disponivel

| Tipo | Descricao |
|---|---|
| **Feeds** | Publicacao de anuncios via XML |
| **Webhooks** | Notificacoes de eventos |
| **Lead Manager** | Captura de leads dos portais |
| **Aluguel Digital** | Integracao de locacao (Beta) |

### 2.3 Formato VRSync - Estrutura XML Completa

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync
                 http://xml.vivareal.com/vrsync.xsd">
  <Header>
    <Provider>ZmobCRM</Provider>
    <Email>contato@zmob.com.br</Email>
    <ContactName>Nome do Cliente</ContactName>
    <PublishDate>2026-02-19T17:00:00</PublishDate>
    <Telephone>11-0000-0000</Telephone>
  </Header>
  <Listings>
    <Listing>
      <ListingID>ZMOB-001</ListingID>
      <Title>Apartamento 2 quartos em Consolacao</Title>
      <TransactionType>For Sale</TransactionType>
      <PublicationType>STANDARD</PublicationType>
      <DetailViewUrl>http://www.imobiliaria.com.br/imovel/001</DetailViewUrl>
      <Media>
        <Item medium="image" caption="Fachada" primary="true">
          http://cdn.zmob.com.br/img01.jpg
        </Item>
        <Item medium="image" caption="Sala">
          http://cdn.zmob.com.br/img02.jpg
        </Item>
      </Media>
      <Details>
        <UsageType>Residential</UsageType>
        <PropertyType>Residential / Apartment</PropertyType>
        <Description><![CDATA[Apartamento de 80m2 na Consolacao...]]></Description>
        <ListPrice currency="BRL">860000</ListPrice>
        <LivingArea unit="square metres">80</LivingArea>
        <Bedrooms>2</Bedrooms>
        <Bathrooms>1</Bathrooms>
        <Garage type="Parking Space">2</Garage>
      </Details>
      <Location displayAddress="Street">
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="SP">Sao Paulo</State>
        <City>Sao Paulo</City>
        <Neighborhood>Consolacao</Neighborhood>
        <Address>Rua Example</Address>
        <StreetNumber>123</StreetNumber>
        <PostalCode>01415-000</PostalCode>
        <Latitude>-23.5531</Latitude>
        <Longitude>-46.6599</Longitude>
      </Location>
      <ContactInfo>
        <Name>Imobiliaria Exemplo</Name>
        <Email>contato@imobiliaria.com.br</Email>
        <Telephone>(11) 3150-4646</Telephone>
      </ContactInfo>
    </Listing>
  </Listings>
</ListingDataFeed>
```

### 2.4 Campos Obrigatorios (VRSync)

| Campo | Tipo | Regras |
|---|---|---|
| **ListingID** | String | Codigo unico do imovel |
| **Title** | String | Titulo do anuncio |
| **TransactionType** | Enum | "For Sale", "For Rent", "Sale/Rent" |
| **PropertyType** | Enum | "Residential / Apartment", "Residential / Home", "Commercial / Office", etc. |
| **Description** | String (CDATA) | 50 a 3.000 caracteres, sem HTML (usar HTML entities) |
| **LivingArea** | Integer | Obrigatorio para maioria dos tipos (unit="square metres") |
| **Bedrooms** | Integer | Obrigatorio para residencial (min 1 para Studio, 0 para Kitnet) |
| **Bathrooms** | Integer | Obrigatorio para apartamentos, casas, escritorios (1 a 20) |
| **Location** | Nested | Country, State, City, Neighborhood obrigatorios |
| **Media** | Array | Minimo 1 imagem, primeira com primary="true" |

### 2.5 Campos Opcionais (VRSync)

| Campo | Tipo | Notas |
|---|---|---|
| **ListPrice** | Integer | Preco de venda (currency="BRL", sem decimais) |
| **RentalPrice** | Integer | Preco de aluguel (period="Monthly"/"Daily"/"Weekly") |
| **PropertyAdministrationFee** | Integer | Condominio (0 = isento) |
| **Iptu** | Integer | IPTU (period="Yearly" ou "Monthly") |
| **LotArea** | Integer | Area do terreno (obrigatorio para terrenos) |
| **Garage** | Integer | Vagas de garagem |
| **Suites** | Integer | Numero de suites |
| **Floors** | Integer | Andares do predio |
| **UnitFloor** | Integer | Andar da unidade |
| **YearBuilt** | Integer (4 digitos) | Ano de construcao |
| **UsageType** | Enum | "Residential", "Commercial", "Residential / Commercial" |
| **Features** | Array de Strings | 100+ opcoes: "Pool", "Elevator", "Gym", "Pets Allowed", etc. |
| **Warranties** | Array de Enums | SECURITY_DEPOSIT, GUARANTOR, INSURANCE_GUARANTEE, etc. |

### 2.6 Regras de Validacao

- Valores monetarios: apenas inteiros (sem decimais, simbolos, pontos ou virgulas)
- Atributo currency="BRL" obrigatorio em todos os campos monetarios
- Atributo unit="square metres" obrigatorio em campos de area
- Descricao usa HTML entities e NAO tags HTML reais
- Quartos: 0-1 para terrenos, 1-40 para casas/apartamentos
- Banheiros: 1-20

---

## 3. OLX

### 3.1 Visao Geral

- **Portal de desenvolvedores:** https://developers.olx.com.br/
- **Metodo:** REST API (JSON via PUT)
- **Autenticacao:** OAuth 2.0 (client_id + client_secret)
- **Frequencia:** Tempo real (com rate limit)
- **Suporte:** suporteintegrador@olxbr.com

### 3.2 Autenticacao

```
1. Registrar como integrador na OLX
2. Receber client_id e client_secret
3. Usuario autoriza via OAuth (scope: autoupload)
4. Usar access_token nas requisicoes
```

### 3.3 Endpoint de Importacao

```
PUT https://apps.olx.com.br/autoupload/import
Content-Type: application/json
Encoding: UTF-8
Payload maximo: 1 MB
```

### 3.4 Estrutura JSON

```json
{
  "access_token": "TOKEN_OAUTH",
  "ad_list": [
    {
      "id": "ZMOB-001",
      "operation": "insert",
      "category": 1020,
      "Subject": "Apartamento 2 quartos em Consolacao",
      "Body": "Apartamento de 80m2 na Consolacao com 2 quartos...",
      "Phone": "11999990000",
      "type": "s",
      "price": 860000,
      "zipcode": "01415000",
      "images": [
        "http://cdn.zmob.com.br/img01.jpg",
        "http://cdn.zmob.com.br/img02.jpg"
      ],
      "params": {
        "rooms": "2",
        "bathrooms": "1",
        "garage_spaces": "2",
        "size": "80",
        "iptu": "2400"
      }
    }
  ]
}
```

### 3.5 Categorias Imobiliarias OLX

| Codigo | Tipo |
|---|---|
| 1020 | Apartamentos |
| 1040 | Casas |
| 1060 | Aluguel de quartos |
| 1080 | Temporada |
| 1100 | Terrenos, sitios e fazendas |
| 1120 | Comercio e industria |

### 3.6 Campos Obrigatorios (OLX)

| Campo | Tipo | Regras |
|---|---|---|
| **id** | String | 1-19 chars alfanumericos |
| **operation** | Enum | "insert" ou "delete" |
| **category** | Integer | Codigo da subcategoria (1020, 1040, etc.) |
| **Subject** | String | Titulo (2-90 caracteres) |
| **Body** | String | Descricao (2-6.000 caracteres) |
| **Phone** | String | Telefone (10-11 digitos, sem caracteres especiais) |
| **type** | Enum | "s" (venda) ou "u" (aluguel) |
| **price** | Integer | Preco (sem centavos) |
| **zipcode** | String | CEP (apenas numeros) |
| **images** | Array de URLs | Min 1, max 20 (primeira = principal) |

### 3.7 Codigos de Resposta

| Codigo | Status |
|---|---|
| 0 | Anuncios importados, aguardando processamento |
| -1 | Erro inesperado |
| -2 | Bloqueado por excesso de requisicoes (rate limit) |
| -3 | Nenhum anuncio para importar |
| -4 | Validacao do anuncio falhou |
| -5 | Servico de importacao indisponivel |
| -6 | Permissoes insuficientes |
| -7 | Slots de anuncio insuficientes |
| -8 | Importacao parcial (limite excedido) |

### 3.8 Requisitos para Integradores

- Necessario registro como integrador homologado na OLX
- Plano Empresas obrigatorio (nao funciona com plano individual)
- Integradores homologados atuais: Imobex, Imovelpro, Tecimob, Microsistec, Izzi
- Novas empresas podem se cadastrar continuamente

---

## 4. Comparativo de Integracao

| Aspecto | ZAP + VivaReal | OLX |
|---|---|---|
| **Formato** | XML (VRSync) | JSON (REST API) |
| **Metodo** | Feed hospedado (pull) | API direta (push) |
| **Autenticacao** | URL publica com XML | OAuth 2.0 |
| **Frequencia** | A cada 12h (portal le) | Tempo real |
| **Payload** | Sem limite documentado | 1 MB max |
| **Imagens** | Min 1, primary obrigatorio | Min 1, max 20 |
| **Homologacao** | Nao documentada | Registro como integrador |
| **Complexidade** | Media (gerar XML valido) | Media (OAuth + JSON) |

---

## 5. Impacto no Design do Cadastro de Imoveis do ZmobCRM

### 5.1 Campos Minimos para o Model de Imovel

Baseado nos requisitos de TODOS os portais, o cadastro de imoveis precisa incluir:

**Identificacao:**
- Codigo interno (ListingID / id)
- Titulo (Title / Subject)
- Descricao (Description / Body) — min 50 chars para ZAP, min 2 para OLX

**Classificacao:**
- Tipo de transacao: Venda, Aluguel, Venda/Aluguel
- Tipo de imovel: Apartamento, Casa, Terreno, Comercial, etc.
- Tipo de uso: Residencial, Comercial, Misto

**Valores:**
- Preco de venda (inteiro, BRL)
- Preco de aluguel (inteiro, BRL, com periodo)
- Condominio (inteiro, BRL)
- IPTU (inteiro, BRL, anual ou mensal)

**Caracteristicas:**
- Quartos (0-40)
- Banheiros (1-20)
- Suites
- Vagas de garagem
- Area util (m2, inteiro)
- Area do terreno (m2, inteiro)
- Andar da unidade
- Andares do predio
- Ano de construcao

**Localizacao:**
- Pais (BR)
- Estado (UF)
- Cidade
- Bairro
- Endereco
- Numero
- CEP
- Latitude / Longitude

**Midia:**
- Fotos (URLs, min 1, primeira = principal)
- Video (URL YouTube, opcional)

**Contato:**
- Nome do responsavel
- Email
- Telefone

**Extras:**
- Features/Comodidades (array de strings: Piscina, Elevador, Academia, etc.)
- Garantias para locacao (Caucao, Fiador, Seguro, etc.)

### 5.2 Mapeamento de Tipos de Imovel

| ZmobCRM | VRSync (ZAP/VivaReal) | OLX (category) |
|---|---|---|
| Apartamento | Residential / Apartment | 1020 |
| Casa | Residential / Home | 1040 |
| Kitnet/Studio | Residential / Kitnet ou Studio | 1020 |
| Terreno | Land / Lot | 1100 |
| Sitio/Fazenda | Land / Farm | 1100 |
| Sala Comercial | Commercial / Office | 1120 |
| Loja | Commercial / Store | 1120 |
| Galpao | Commercial / Warehouse | 1120 |
| Temporada | - | 1080 |
| Quarto | - | 1060 |

### 5.3 Arquitetura Sugerida

```
ZmobCRM Property Model (Supabase)
        |
        |---> VRSync XML Generator ---> URL publica ---> ZAP + VivaReal (pull 12h)
        |
        +---> OLX JSON Adapter ---> OAuth + PUT ---> OLX (push tempo real)
        |
        +---> Lead Receiver <--- Webhooks/Lead Manager <--- ZAP/VivaReal/OLX
```

**Componentes necessarios:**
1. **Property Model** — Tabela `properties` no Supabase com todos os campos
2. **VRSync XML Generator** — Endpoint Next.js API que gera XML VRSync
3. **OLX API Client** — Servico OAuth + PUT para sync com OLX
4. **Portal Sync Manager** — Gerencia status de publicacao por portal
5. **Lead Receiver** — Webhook para capturar leads vindos dos portais

---

## 6. Proximos Passos

1. Definir schema da tabela `properties` no Supabase (baseado nos campos da secao 5.1)
2. Implementar VRSync XML generator como endpoint `/api/portals/vrsync.xml`
3. Registrar como integrador OLX para obter client_id/client_secret
4. Implementar Lead Manager para capturar leads de ZAP/VivaReal/OLX
5. Criar UI de publicacao para selecionar em quais portais publicar cada imovel
6. Implementar IA para geracao automatica de descricoes de imoveis (diferencial competitivo)

---

## 7. Fontes

**Grupo ZAP (ZAP Imoveis + VivaReal):**
- [Portal de Integracao Grupo OLX](https://developers.grupozap.com/)
- [Formatos XML](https://developers.grupozap.com/feeds/xml-formats/)
- [VRSync Details](https://developers.grupozap.com/feeds/vrsync/elements/details.html)
- [VRSync Examples](https://developers.grupozap.com/feeds/vrsync/examples.html)
- [ZAP - Como fazer integracao](https://ajuda.zapimoveis.com.br/s/article/como-ativar-a-integracao-de-imoveis)
- [ZAP - O que e integracao](https://ajuda.zapimoveis.com.br/s/article/o-que-e-integracao)

**OLX:**
- [Portal de Integracao OLX](https://developers.olx.com.br/)
- [Documentacao API de Anuncios](https://developers.olx.com.br/anuncio/api/home.html)
- [Importacao de Anuncios](https://developers.olx.com.br/anuncio/api/import.html)
- [Categoria de Imoveis](https://developers.olx.com.br/anuncio/api/real_estate/home.html)
- [Imoveis JSON](https://developers.olx.com.br/anuncio/json/real_estate.html)
- [OLX - Integradores e importacao](https://ajuda.olx.com.br/s/article/integradores-e-importacao-de-anuncios)

---

*Gerado por Atlas (Analyst Agent) — Synkra AIOS*
