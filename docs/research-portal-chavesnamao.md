# Pesquisa: API do Portal Chaves na Mao

> **Data:** 2026-02-19
> **Autor:** Atlas (Analyst Agent)
> **Objetivo:** Mapear requisitos tecnicos para integracao do ZmobCRM com o portal Chaves na Mao

---

## 1. Resumo Executivo

| Aspecto | Detalhe |
|---|---|
| **Portal** | Chaves na Mao (chavesnamao.com.br) |
| **Metodo de Integracao** | Feed XML (URL hospedada) |
| **Formato** | XML proprietario (formato CNM) |
| **Frequencia** | Leitura diaria (processamento noturno, seg-sex) |
| **Autenticacao** | Contrato + envio de URL por email |
| **Suporte** | atendimento@chavesnamao.com.br / (41) 3092-1001 |
| **Documentacao oficial** | https://tecnologiacnm.github.io/cnm-xml-documentation/ |

**Descoberta chave:** Integracao e baseada em XML com formato proprietario (diferente do VRSync usado por ZAP/VivaReal). Todas as tags devem estar presentes no XML, mesmo as opcionais (deixar conteudo vazio). Tags sao case-sensitive.

---

## 2. Visao Geral da Integracao

### 2.1 Processo de Integracao

1. Contratar plano com Chaves na Mao
2. Receber instrucoes de integracao por email
3. Gerar XML no formato CNM e hospedar em URL publica
4. Enviar email para `atendimento@chavesnamao.com.br` com:
   - URL do XML de imoveis
   - URL de integracao de leads (para receber leads do portal)
   - Autorizacao da integracao
5. Portal le o XML automaticamente toda noite (seg-sex)
6. Alteracoes feitas durante o dia refletem no portal no dia seguinte (ate 24h uteis)

### 2.2 Requisitos do Arquivo XML

- **Encoding:** UTF-8
- **Todas as tags devem estar presentes** (mesmo opcionais, deixar vazio)
- **Case-sensitive:** Tags devem ter exatamente os caracteres corretos
- Arquivo de exemplo disponivel: `chavesnamao.xml` na documentacao oficial

---

## 3. Formato XML CNM - Estrutura Completa

### 3.1 Exemplo de Estrutura XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<imoveis>
  <imovel>
    <!-- Identificacao -->
    <referencia>ZMOB-001</referencia>
    <codigo_cliente>CLI-001</codigo_cliente>
    <link_cliente>http://www.imobiliaria.com.br/imovel/001</link_cliente>
    <titulo>Apartamento 2 quartos em Consolacao</titulo>

    <!-- Classificacao -->
    <transacao>V</transacao>
    <transacao2></transacao2>
    <finalidade>RE</finalidade>
    <finalidade2></finalidade2>
    <tipo>Apartamento</tipo>
    <tipo2></tipo2>
    <destaque>0</destaque>

    <!-- Valores -->
    <valor>860000.00</valor>
    <valor_locacao></valor_locacao>
    <valor_iptu>2400.00</valor_iptu>
    <valor_condominio>800.00</valor_condominio>

    <!-- Localizacao -->
    <estado>SP</estado>
    <cidade>Sao Paulo</cidade>
    <bairro>Consolacao</bairro>
    <cep>01415-000</cep>
    <endereco>Rua Example</endereco>
    <numero>123</numero>
    <complemento>Apto 42</complemento>
    <latitude>-23.5531</latitude>
    <longitude>-46.6599</longitude>

    <!-- Areas -->
    <area_total>90</area_total>
    <area_util>80</area_util>

    <!-- Comodos -->
    <quartos>2</quartos>
    <suites>1</suites>
    <banheiro>2</banheiro>
    <garagem>2</garagem>
    <salas>1</salas>
    <closet>0</closet>
    <despensa>0</despensa>
    <bar>0</bar>
    <cozinha>1</cozinha>
    <quarto_empregada>0</quarto_empregada>
    <escritorio>0</escritorio>
    <area_servico>1</area_servico>
    <lareira>0</lareira>
    <varanda>1</varanda>
    <lavanderia>0</lavanderia>

    <!-- Descricao -->
    <descritivo>Apartamento de 80m2 na Consolacao com 2 quartos, sendo 1 suite...</descritivo>

    <!-- Politicas -->
    <aceita_troca>0</aceita_troca>
    <aceita_pet>1</aceita_pet>
    <esconder_endereco_imovel>0</esconder_endereco_imovel>

    <!-- Locacao -->
    <periodo_locacao></periodo_locacao>

    <!-- Midia -->
    <fotos_imovel>
      <foto>
        <url>http://cdn.zmob.com.br/img01.jpg</url>
      </foto>
      <foto>
        <url>http://cdn.zmob.com.br/img02.jpg</url>
      </foto>
    </fotos_imovel>
    <video></video>
    <tour_360></tour_360>

    <!-- Amenidades -->
    <area_comum>
      <!-- Tags de amenidades da area comum -->
    </area_comum>
    <area_privativa>
      <!-- Tags de amenidades da area privativa -->
    </area_privativa>

    <!-- Metadata -->
    <data_atualizacao>2026-02-19 17:00:00</data_atualizacao>
  </imovel>
</imoveis>
```

### 3.2 Campos Obrigatorios

| Campo | Tipo | Regras |
|---|---|---|
| **referencia** | String | Codigo unico do imovel no sistema |
| **transacao** | Char(1) | `V` = Venda, `L` = Locacao |
| **finalidade** | Char(2) | `RE` = Residencial, `CO` = Comercial, `RU` = Rural |
| **destaque** | Integer(1) | `0` = Nao, `1` = Sim (destaque no portal) |
| **tipo** | String | Tipo do imovel (deve corresponder a finalidade) |
| **valor** | Float | Valor do imovel (decimal com ponto `.`) |
| **estado** | Char(2) | UF (SP, RJ, MG, etc.) |
| **cidade** | String | Nome da cidade |
| **bairro** | String | Nome do bairro |
| **descritivo** | Text | Descricao do imovel (max 3.000 caracteres) |

### 3.3 Campos Opcionais

| Campo | Tipo | Regras |
|---|---|---|
| **codigo_cliente** | String | Codigo do cliente/imobiliaria |
| **link_cliente** | URL | Link do imovel no site do cliente |
| **titulo** | String | Titulo do anuncio |
| **transacao2** | Char(1) | Transacao secundaria (V/L) |
| **finalidade2** | Char(2) | Finalidade secundaria (RE/CO/RU) |
| **tipo2** | String | Tipo secundario |
| **valor_locacao** | Float | Valor de locacao |
| **valor_iptu** | Float | Valor do IPTU |
| **valor_condominio** | Float | Valor do condominio |
| **area_total** | Float | Area total em m2 |
| **area_util** | Float | Area util em m2 |
| **cep** | String | CEP (max 9 chars) |
| **endereco** | String | Endereco (max 200 chars) |
| **numero** | String | Numero (max 10 chars) |
| **complemento** | String | Complemento (max 20 chars) |
| **latitude** | Float | Latitude (padrao Google) |
| **longitude** | Float | Longitude (padrao Google) |
| **data_atualizacao** | Datetime | Formato: AAAA-MM-DD HH:MM:SS |
| **aceita_troca** | Integer(1) | `0` = Nao, `1` = Sim |
| **aceita_pet** | Integer(1) | `0` = Nao, `1` = Sim |
| **esconder_endereco_imovel** | Integer(1) | `0` = Mostrar, `1` = Esconder |
| **periodo_locacao** | Integer(1) | `1`=Mensal, `2`=Diaria, `3`=Anual, `4`=Semanal |
| **video** | URL | Link do YouTube (sem embed) |
| **tour_360** | URL | Link do tour 360 |

### 3.4 Campos de Comodos (todos opcionais, Integer)

| Campo | Descricao |
|---|---|
| **quartos** | Numero de quartos |
| **suites** | Numero de suites |
| **banheiro** | Numero de banheiros |
| **garagem** | Vagas de garagem |
| **salas** | Numero de salas |
| **closet** | Numero de closets |
| **despensa** | Numero de despensas |
| **bar** | Numero de bares |
| **cozinha** | Numero de cozinhas |
| **quarto_empregada** | Quarto de empregada |
| **escritorio** | Numero de escritorios |
| **area_servico** | Area de servico |
| **lareira** | Numero de lareiras |
| **varanda** | Numero de varandas |
| **lavanderia** | Numero de lavanderias |

### 3.5 Tipos de Imovel por Finalidade

**Residencial (RE):**
- Apartamento, Casa, Sobrado, Kitnet/Studio, Cobertura, Flat, Loft, Terreno, Chacara, Sitio, Fazenda

**Comercial (CO):**
- Sala Comercial, Loja, Galpao, Predio Comercial, Ponto Comercial, Terreno Comercial, Armazem

**Rural (RU):**
- Sitio, Fazenda, Chacara, Terreno Rural, Haras

### 3.6 Midia - Tag `fotos_imovel`

```xml
<fotos_imovel>
  <foto>
    <url>https://cdn.example.com/foto1.jpg</url>
  </foto>
  <foto>
    <url>https://cdn.example.com/foto2.jpg</url>
  </foto>
</fotos_imovel>
```

- Primeira foto e usada como imagem principal do anuncio
- URLs devem ser acessiveis publicamente
- Formatos aceitos: JPG, PNG
- Video: link direto do YouTube (nao embed/iframe)
- Tour 360: link direto do tour virtual

---

## 4. Diferencas em Relacao aos Outros Portais

| Aspecto | ZAP + VivaReal | OLX | **Chaves na Mao** |
|---|---|---|---|
| **Formato** | XML (VRSync) | JSON (REST API) | **XML (formato CNM)** |
| **Metodo** | Feed hospedado (pull) | API direta (push) | **Feed hospedado (pull)** |
| **Autenticacao** | URL publica | OAuth 2.0 | **Contrato + email** |
| **Frequencia** | A cada 12h | Tempo real | **Diaria (noturno, seg-sex)** |
| **Valores** | Inteiro (sem decimais) | Inteiro | **Float (com decimais)** |
| **Tags vazias** | Omitir opcionais | Omitir opcionais | **Incluir TODAS (vazio)** |
| **Case-sensitive** | Sim | N/A | **Sim** |
| **Comodos detalhados** | Basico (quartos, banheiros, suites, garagem) | Basico | **Extenso (15+ campos)** |
| **Politicas** | Garantias de locacao | - | **aceita_troca, aceita_pet** |
| **Tour 360** | - | - | **Suportado** |
| **Destaque** | Via PublicationType | - | **Tag `destaque`** |

---

## 5. Impacto no Design do ZmobCRM

### 5.1 Novos Campos Necessarios no Property Model

Campos que o Chaves na Mao exige e que NAO existem nos portais ja mapeados (ZAP/VivaReal/OLX):

| Campo CNM | Tipo | Notas |
|---|---|---|
| **destaque** | Boolean | Destacar anuncio no portal |
| **closet** | Integer | Numero de closets |
| **salas** | Integer | Numero de salas |
| **despensa** | Integer | Numero de despensas |
| **bar** | Integer | Numero de bares |
| **cozinha** | Integer | Numero de cozinhas |
| **quarto_empregada** | Integer | Quarto de empregada |
| **escritorio** | Integer | Numero de escritorios |
| **area_servico** | Integer | Area de servico |
| **lareira** | Integer | Numero de lareiras |
| **varanda** | Integer | Numero de varandas |
| **lavanderia** | Integer | Numero de lavanderias |
| **aceita_troca** | Boolean | Aceita permuta |
| **aceita_pet** | Boolean | Aceita animais |
| **tour_360** | URL | Link tour virtual 360 |
| **area_total** | Float | Area total (m2) |
| **area_comum** | JSON/Array | Amenidades area comum |
| **area_privativa** | JSON/Array | Amenidades area privativa |
| **periodo_locacao** | Enum | Mensal/Diaria/Anual/Semanal |

### 5.2 Mapeamento de Tipos de Imovel

| ZmobCRM | VRSync (ZAP/VivaReal) | OLX (category) | **CNM (Chaves na Mao)** |
|---|---|---|---|
| Apartamento | Residential / Apartment | 1020 | **RE / Apartamento** |
| Casa | Residential / Home | 1040 | **RE / Casa** |
| Sobrado | Residential / Home | 1040 | **RE / Sobrado** |
| Kitnet/Studio | Residential / Kitnet | 1020 | **RE / Kitnet** |
| Cobertura | Residential / Penthouse | 1020 | **RE / Cobertura** |
| Flat | Residential / Flat | 1020 | **RE / Flat** |
| Terreno | Land / Lot | 1100 | **RE / Terreno** |
| Sitio | Land / Farm | 1100 | **RU / Sitio** |
| Fazenda | Land / Farm | 1100 | **RU / Fazenda** |
| Chacara | - | 1100 | **RU / Chacara** |
| Sala Comercial | Commercial / Office | 1120 | **CO / Sala Comercial** |
| Loja | Commercial / Store | 1120 | **CO / Loja** |
| Galpao | Commercial / Warehouse | 1120 | **CO / Galpao** |
| Ponto Comercial | Commercial / Store | 1120 | **CO / Ponto Comercial** |

### 5.3 Mapeamento de Transacao

| ZmobCRM | VRSync | OLX (type) | **CNM (transacao)** |
|---|---|---|---|
| Venda | For Sale | s | **V** |
| Aluguel | For Rent | u | **L** |
| Venda + Aluguel | Sale/Rent | - | **V + transacao2=L** |

### 5.4 Arquitetura Atualizada

```
ZmobCRM Property Model (Supabase)
        |
        |---> VRSync XML Generator ---> URL publica ---> ZAP + VivaReal (pull 12h)
        |
        |---> OLX JSON Adapter ---> OAuth + PUT ---> OLX (push tempo real)
        |
        +---> CNM XML Generator ---> URL publica ---> Chaves na Mao (pull diario)
        |
        +---> Lead Receiver <--- Webhooks/Leads <--- Todos os portais
```

**Novo componente necessario:**
- **CNM XML Generator** — Endpoint Next.js API que gera XML no formato CNM: `/api/portals/chavesnamao.xml`

### 5.5 Diferencas Criticas na Implementacao

1. **Valores com decimais:** CNM usa float (860000.00), enquanto ZAP/OLX usam inteiros (860000)
2. **Tags vazias obrigatorias:** O XML CNM exige TODAS as tags presentes, mesmo vazias
3. **Finalidade + Tipo:** CNM usa sistema duplo de classificacao (finalidade RE/CO/RU + tipo especifico)
4. **Comodos granulares:** 15+ campos de comodos vs. 4 basicos dos outros portais
5. **Sem homologacao tecnica:** Integracao e feita por contrato + envio de URL por email

---

## 6. Proximos Passos

1. Adicionar campos extras do CNM ao schema da tabela `properties` no Supabase (secao 5.1)
2. Implementar CNM XML generator como endpoint `/api/portals/chavesnamao.xml`
3. Criar adaptador de mapeamento ZmobCRM → formato CNM
4. Configurar integracao de leads do Chaves na Mao
5. Testar XML gerado contra validador do portal (se disponivel)
6. Enviar URL para `atendimento@chavesnamao.com.br` para ativar integracao

---

## 7. Fontes

**Chaves na Mao - Documentacao Oficial:**
- [Documentacao XML Chaves na Mao](https://tecnologiacnm.github.io/cnm-xml-documentation/)
- [Estrutura Arquivo XML](https://tecnologiacnm.github.io/cnm-xml-documentation/arquivo/estrutura.html)
- [Especificacoes Tags](https://tecnologiacnm.github.io/cnm-xml-documentation/arquivo/especificacoes/especificacoes-tags.html)

**Documentacao Historica:**
- [Documentacao Integracao 2019 (Scribd)](https://www.scribd.com/document/411615585/Documentacao-Integracao-Imoveis-CHAVES-NA-MAO-2019)

**Integradores e Ajuda:**
- [Central de Ajuda Chaves na Mao](https://help.chavesnamao.com.br/support/solutions/articles/72000638008-como-integrar-minha-base-de-im%C3%B3veis-ao-chaves-na-m%C3%A3o-)
- [Integracao via Microsistec](http://suporte.microsistec.digital/pt-BR/articles/5467839-integracao-com-o-portal-chaves-na-mao)
- [Integracao via ImobiBrasil](https://ajuda.imobibrasil.com.br/central-ajuda/integracao-com-chaves-na-mao/)
- [Integracao via Arbo Imoveis](https://ajuda.arboimoveis.com.br/hc/pt-br/articles/15550131012499-Chaves-na-m%C3%A3o-Realizando-a-integra%C3%A7%C3%A3o-de-im%C3%B3veis-e-leads-com-o-portal)

---

*Gerado por Atlas (Analyst Agent) — Synkra AIOS*
