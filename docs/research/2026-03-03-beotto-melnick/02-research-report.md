# Relatorio de Pesquisa: Beotto (Otto)

**Data:** 2026-03-03
**Confidencia:** MEDIA-ALTA

---

## 1. O Que E o Beotto

### Identidade Corporativa

| Campo | Valor |
|-------|-------|
| **Razao Social** | Otto Tecnologia e Desenvolvimento de Software LTDA |
| **CNPJ** | 34.433.851/0001-40 |
| **Fundacao** | 05/08/2019 |
| **Sede** | Av. Carlos Gomes 111, Andar 11, Auxiliadora, Porto Alegre/RS |
| **Atividade** | 62.04-0-00 - Consultoria em tecnologia da informacao |
| **Porte** | 11-50 funcionarios |
| **Site** | https://beotto.com |
| **App** | "Be Otto" (iOS + Android) |

### DESCOBERTA CRITICA: Relacao Societaria com Melnick

A Otto **nao e apenas um fornecedor** da Melnick. Dados do registro empresarial confirmam:

**Quadro Societario:**
- **Melnick Desenvolvimento Imobiliario S.A.** (CNPJ: 12.181.987/0001-77) -- SOCIA
- **Juliano Melnick** -- Administrador (representante da Melnick S.A.)
- **Leandro Melnick** -- Administrador
- **Joao Rubem Piccoli Filho** -- Administrador
- **Joelson Barbosa Boeira** -- Administrador
- **Marcelo Guedes** -- Administrador

**Implicacao:** O Beotto e uma **startup captiva** da Melnick, criada para ser a plataforma digital de vendas do grupo. Isso explica por que a URL principal do app e `app.beotto.com/melnick` e por que nao ha documentacao publica de API -- a plataforma foi construida "de dentro para fora".

### Classificacao da Plataforma

O Beotto **nao e um CRM** e **nao e um portal publico de imoveis**. E uma **plataforma de vendas B2B** (incorporadora-para-corretor) com as seguintes caracteristicas:

| Aspecto | Classificacao |
|---------|---------------|
| **Tipo** | Plataforma de vendas imobiliarias (Sales Enablement) |
| **Modelo** | B2B -- incorporadora fornece dados, corretor consome |
| **Publico** | Corretores, imobiliarias parceiras, equipe interna |
| **Escopo** | Visualizacao + proposta + gestao de carteira |
| **Nao e** | CRM completo, portal publico, marketplace |

---

## 2. Como Funciona Para Corretores

### Acesso

Os corretores acessam o Beotto por:
1. **App mobile** "Be Otto" (iOS 14+ / Android) -- principal canal
2. **Web app** em `app.beotto.com/{incorporadora}` (ex: `app.beotto.com/melnick`)
3. Requer **cadastro com CPF** (obrigatorio desde v3.0.1, Jan/2026)

### Experiencia de Uso (baseada na descricao do App Store)

O fluxo tipico do corretor no Beotto:

1. **Login** no app com credenciais (CPF obrigatorio)
2. **Busca de empreendimentos:**
   - Busca aberta por texto
   - Filtros parametrizados: preco, localizacao, metragem, status da obra
3. **Visualizacao do empreendimento:**
   - Informacoes completas e atualizadas
   - Fotos, plantas, materiais comerciais
   - Tabela de precos
   - Espelho de vendas em tempo real
4. **Compartilhamento com cliente:**
   - WhatsApp, Telegram, e-mail
   - Materiais formatados para envio
5. **Gestao de carteira:**
   - Pasta de clientes (PF e PJ)
   - Documentos do conjuge (para cadastro individual)
   - Multiplos compradores por proposta
6. **Criacao de proposta:**
   - Multiplos modelos de proposta disponiveis
   - Envio direto para a incorporadora
7. **Jornada de vendas:**
   - Acompanhamento do ciclo completo
   - Agendamento de visitas com anotacoes personalizadas

### Proposta de Valor Principal

O slogan e "o corretor consegue vender um imovel apenas com seu celular em menos de trinta minutos". A plataforma foca em **desburocratizar** o processo de venda, eliminando a necessidade de ligar para a incorporadora para verificar disponibilidade ou solicitar materiais.

---

## 3. Features Principais

### Features Confirmadas (fonte: App Store + site oficial)

| Feature | Descricao | Confidencia |
|---------|-----------|-------------|
| **Busca de empreendimentos** | Busca aberta + filtros (preco, local, m2, status obra) | ALTA |
| **Espelho de vendas em tempo real** | Mapa visual de unidades com status (disponivel/reservado/vendido) | ALTA |
| **Tabela de precos** | Consulta de precos por unidade/tipologia | ALTA |
| **Informacoes do empreendimento** | Dados completos e atualizados | ALTA |
| **Compartilhamento multicanal** | WhatsApp, Telegram, e-mail | ALTA |
| **Carteira de clientes** | Gestao de clientes PF e PJ | ALTA |
| **Proposta digital** | Multiplos modelos, envio direto a incorporadora | ALTA |
| **Agendamento de visitas** | Com anotacoes personalizadas | ALTA |
| **Jornada de vendas** | Tracking do ciclo de venda | ALTA |
| **Gestao de documentos** | Upload/visualizacao de PDFs, docs do conjuge | ALTA |
| **Visualizacao de plantas** | Plantas dos empreendimentos | MEDIA |

### Features Provaveis (nao confirmadas explicitamente)

| Feature | Evidencia | Confidencia |
|---------|-----------|-------------|
| **Fotos/galeria** | Mencionado como "informacoes completas" | MEDIA |
| **Materiais de venda** | Mencionado no contexto de compartilhamento | MEDIA |
| **Notificacoes push** | App coleta dados de interacao | MEDIA |
| **Tours virtuais / 360** | Nao mencionado -- possivelmente nao tem | BAIXA |
| **Simulador de financiamento** | Nao mencionado em nenhuma fonte | BAIXA |
| **Chat com incorporadora** | Nao mencionado | BAIXA |

### Dados Coletados pelo App (Privacy Policy - App Store)

| Tipo | Vinculado a identidade? |
|------|------------------------|
| IDs de usuario | Sim |
| Historico de buscas | Sim |
| IDs de dispositivo | Nao |
| Localizacao (precisa e aproximada) | Nao |
| Interacoes de uso | Nao |
| Dados de crash/performance | Nao |

---

## 4. Fluxo de Venda

### Fluxo Reconstruido (baseado em features confirmadas)

```
CORRETOR                          BEOTTO                        INCORPORADORA
   |                                |                                |
   |-- Busca empreendimentos ------>|                                |
   |<- Lista filtrada --------------|                                |
   |                                |                                |
   |-- Seleciona empreendimento --->|                                |
   |<- Detalhes + espelho vendas ---|                                |
   |                                |                                |
   |-- Verifica disponibilidade --->|<-- Dados em tempo real --------|
   |<- Unidade X disponivel --------|                                |
   |                                |                                |
   |-- Compartilha com cliente ---->| (WhatsApp/Telegram/email)      |
   |                                |                                |
   |-- Cadastra cliente (PF/PJ) -->|                                |
   |-- Anexa documentos ----------->|                                |
   |                                |                                |
   |-- Cria proposta (modelo X) --->|                                |
   |                                |-- Envia proposta ------------->|
   |                                |                                |
   |-- Acompanha jornada ---------->|<-- Status atualizado ----------|
   |                                |                                |
   |-- Agenda visita -------------->|                                |
```

### Etapas do Fluxo

1. **Descoberta:** Corretor busca empreendimentos por filtros
2. **Qualificacao:** Verifica espelho de vendas, precos, disponibilidade em tempo real
3. **Apresentacao:** Compartilha materiais com o cliente via WhatsApp/Telegram
4. **Cadastro:** Registra cliente na carteira (PF ou PJ, com documentos)
5. **Proposta:** Cria proposta digital usando modelos pre-definidos pela incorporadora
6. **Envio:** Proposta enviada diretamente para a incorporadora via plataforma
7. **Acompanhamento:** Jornada de vendas permite tracking do status
8. **Visita:** Agendamento com anotacoes para acompanhamento

### Lacunas no Fluxo (nao confirmadas)

- **Reserva de unidade:** Nao esta claro se o corretor pode reservar uma unidade direto pelo app ou se precisa aguardar aprovacao da incorporadora
- **Fila de reserva:** Nao mencionado
- **Assinatura digital de contrato:** Nao mencionado
- **Pagamento/sinal:** Nao mencionado
- **Pos-venda:** Nao mencionado

---

## 5. Integracao com CRMs

### Situacao Atual do Beotto

**Nao ha evidencia publica de API aberta ou integracoes com CRMs externos.**

Razoes provaveis:
1. O Beotto e uma plataforma **captiva** da Melnick -- nao precisa integrar com o ecossistema externo da mesma forma que o Orulo
2. O Beotto funciona como um **sistema fechado** onde a incorporadora controla os dados e o corretor os consome
3. Com apenas 11-50 funcionarios, a empresa provavelmente prioriza features de venda sobre abertura de API

### Como os Dados Provavelmente Fluem

```
MELNICK (ERP/Sistema interno)
    |
    |-- Feed de empreendimentos
    |-- Espelho de vendas
    |-- Tabelas de precos
    |-- Materiais
    v
BEOTTO (plataforma)
    |
    |-- Exibicao para corretores (app/web)
    |-- Recebimento de propostas
    |-- Dados de carteira de clientes
    |
    [BARREIRA -- sem API publica]
    |
    X-- CRMs externos nao recebem dados diretamente
```

### Implicacao para o ZmobCRM

A integracao direta ZmobCRM <-> Beotto **nao e viavel hoje** por meios publicos. Seria necessario:
1. **Parceria comercial** direta com a Otto/Melnick
2. **Acesso a API privada** (se existir)
3. **Ou** usar uma rota alternativa via Orulo (se a Melnick publicar dados no Orulo)

---

## 6. Comparacao Beotto vs Orulo

### Tabela Comparativa

| Aspecto | Beotto (Otto) | Orulo |
|---------|--------------|-------|
| **Tipo** | Plataforma de vendas proprietaria | Marketplace/hub de dados aberto |
| **Modelo** | Captivo (1 incorporadora = 1 instancia) | Multi-incorporadora (hub centralizado) |
| **Fundacao** | 2019 | ~2016 |
| **Sede** | Porto Alegre/RS | Sao Paulo/SP |
| **Abrangencia** | Regional (RS, possivelmente Sul) | Nacional (8 estados: RS, SC, PR, SP, RJ, GO, PE, PB) |
| **Incorporadoras** | Melnick (socia) + possivelmente outras | Centenas de incorporadoras |
| **API publica** | Nao | Sim (documentada, com webhooks) |
| **Integracoes CRM** | Nao documentada | 39+ CRMs integrados |
| **App mobile** | Sim (iOS + Android) | Sim (iOS + Android) |
| **Proposta digital** | Sim (multiplos modelos) | Nao (apenas catalogo + contato) |
| **Espelho de vendas** | Sim (tempo real) | Sim (via incorporadora) |
| **Jornada de vendas** | Sim | Nao |
| **Carteira de clientes** | Sim | Nao |
| **Preco para corretor** | Gratis (via incorporadora) | Gratis |
| **Preco para incorporadora** | Proprietario (sao donos) | Gratis (basico) / Pago (premium) |

### Posicionamento

- **Beotto** = Ferramenta de vendas **completa mas fechada** (da proposta ao acompanhamento)
- **Orulo** = Hub de **informacao aberto** (catalogo + distribuicao + API)

### Sao Complementares?

**Sim, na teoria.** Uma incorporadora poderia usar:
- **Beotto** como seu sistema interno de vendas (propostas, espelho, jornada)
- **Orulo** como canal de distribuicao de catalogo para o mercado amplo

Na pratica, nao ha evidencia de que a Melnick use o Orulo. A Melnick tem seu proprio ecossistema (Beotto + MEV/Melnick Vendas + Mel/avatar AI).

---

## 7. Dados Disponiveis Para Integracao

### Via Beotto (Acesso Restrito)

Se uma parceria comercial fosse estabelecida, os dados potenciais seriam:

| Dado | Tipo | Disponibilidade |
|------|------|----------------|
| Empreendimentos | Lista com filtros | Dentro do app/web |
| Unidades | Por tipologia, com status | Espelho de vendas |
| Precos | Tabela por unidade | Consulta no app |
| Disponibilidade | Tempo real | Espelho de vendas |
| Plantas | Imagens | No empreendimento |
| Fotos | Galeria | No empreendimento |
| Materiais de venda | PDFs, docs | Compartilhamento |
| Status da obra | Percentual/fase | Filtro de busca |

**Problema:** Nenhum desses dados esta acessivel via API publica.

### Via Orulo (Acesso Aberto -- API Documentada)

O Orulo oferece API REST com OAuth2, incluindo:

| Endpoint | Dados | Detalhes |
|----------|-------|---------|
| `/buildings` | Lista de empreendimentos | Com filtro `include[]=not_available` |
| `/buildings/{id}` | Detalhes do empreendimento | Fotos, plantas, videos, endereco, Google Maps |
| `/buildings/{id}/typologies/{id}/units` | Unidades por tipologia | Status, preco, disponibilidade |
| `/config` | Status da integracao | Verificacao de conectividade |
| **Webhooks** | Notificacoes de mudanca | Preco, estoque, plantas, imagens atualizados |

**Dados disponiveis via Orulo:**
- Dados completos do empreendimento
- Tabelas de disponibilidade e precos
- Comissoes
- Contato comercial
- Tipologias disponiveis
- Endereco completo
- Fotos, plantas, videos
- Localizacao Google Maps
- Arquivos do empreendimento
- Dados da incorporadora
- Links do empreendimento

**Autenticacao:** OAuth2 (Client ID + Secret via oruloClientAuth)
**Sync recomendado:** 1x/dia, comparando `updated_at`
**Contato para API:** parcerias@orulo.com.br ou WhatsApp +55 11 4872-8277

---

## 8. Outras Incorporadoras que Usam o Beotto

### Confirmado

| Incorporadora | Evidencia | Confidencia |
|---------------|-----------|-------------|
| **Melnick** | Socia da empresa, URL `app.beotto.com/melnick` | ALTA |

### Nao Confirmado

Nao foi possivel identificar outras incorporadoras clientes do Beotto. Razoes:
1. O site do Beotto nao lista clientes/logos
2. O LinkedIn tem apenas 140 seguidores (empresa pequena)
3. O Instagram @_beotto tem 600 seguidores
4. A plataforma parece ter sido criada inicialmente como ferramenta interna da Melnick

**Hipotese:** E possivel que o Beotto atenda outras incorporadoras do mercado gaucho, mas nao ha evidencia publica. O modelo `app.beotto.com/{incorporadora}` sugere multi-tenancy, indicando que *poderia* atender outros clientes.

---

## 9. Ecossistema Digital da Melnick

A Melnick nao depende apenas do Beotto. Possui um ecossistema completo:

| Sistema | Funcao | Status |
|---------|--------|--------|
| **Beotto (Be Otto)** | Plataforma de vendas para corretores | Ativo |
| **MEV (Melnick Vendas)** | Gestao de vendas de imobiliarias parceiras (mevnet.com.br) | Ativo |
| **Mel (Avatar AI)** | Guia virtual com IA generativa (Euvatar.ai) para clientes | Ativo |
| **Portal do Cliente** | Area logada para compradores | Ativo |
| **Melnick Day** | Evento anual de vendas com descontos especiais | Anual |
| **melnick.com.br/mpartners** | Portal para parceiros (imobiliarias) | Ativo |

---

## 10. Mapa Competitivo -- Plataformas de Vendas Imobiliarias

| Plataforma | Tipo | Foco | API | Integracao CRM |
|-----------|------|------|-----|---------------|
| **Beotto** | Vendas proprietario | Incorporadora unica | Nao | Nao |
| **Orulo** | Hub de catalogo | Multi-incorporadora | Sim | 39+ CRMs |
| **CV CRM (Construtor de Vendas)** | CRM para incorporadoras | Gestao de vendas completa | Sim | 50+ integracoes |
| **Facilita** | App de vendas | Incorporadoras | Sim | Algumas |
| **Jetimob** | Sistema para imobiliarias | Gestao + site | Sim | Orulo integrado |
| **Loft (Vista)** | CRM imobiliario | Imobiliarias | Sim | Orulo integrado |
| **Hiperdados** | ERP para incorporadoras | Gestao empresarial | Sim | Algumas |

---

## Fontes

- [Beotto - Site Oficial](https://beotto.com/)
- [Be Otto - App Store](https://apps.apple.com/br/app/be-otto/id1500091408)
- [Be Otto - Google Play](https://play.google.com/store/apps/details?id=com.beotto.corretor)
- [Otto - LinkedIn](https://br.linkedin.com/company/beotto)
- [Otto - Instagram @_beotto](https://www.instagram.com/_beotto/)
- [CNPJ 34.433.851/0001-40](https://cnpj.biz/34433851000140)
- [Melnick - Site Oficial](https://www.melnick.com.br/)
- [Melnick - Mpartners](https://www.melnick.com.br/mpartners/)
- [app.beotto.com/melnick](https://app.beotto.com/melnick)
- [Orulo - Incorporadoras](https://www.orulo.com.br/incorporadoras)
- [Orulo - Corretores](https://www.orulo.com.br/corretores)
- [Orulo - Integracoes](https://www.orulo.com.br/integracoes)
- [Orulo - API Documentacao](https://documento.orulo.com.br/)
- [Orulo - Fluxo Integracao CRM](https://movidesk.orulo.com.br/kb/pt-br/article/189733/fluxo-da-integracao-de-catalogo-de-imoveis-da-orulo-em-sistemas-)
- [Orulo - API Acesso](https://movidesk.orulo.com.br/kb/pt-br/article/519340/extrair-dados-acesso-via-api)
