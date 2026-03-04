# Recomendacoes para o ZmobCRM

**Data:** 2026-03-03
**Contexto:** Integracao com dados de empreendimentos de incorporadoras (Melnick e outras)

---

## Resumo Executivo

A integracao direta com o Beotto nao e viavel a curto prazo (sistema fechado, sem API publica). A **rota recomendada** e integrar o ZmobCRM com o **Orulo**, que funciona como hub centralizado de dados de incorporadoras com API REST documentada e 39+ CRMs ja integrados.

---

## Opcao 1: Integracao com Orulo (RECOMENDADA)

### Por que

- API REST publica e documentada
- OAuth2 para autenticacao
- Webhooks para atualizacoes em tempo real
- 39+ CRMs ja integram (validacao do modelo)
- Cobertura nacional (8 estados, centenas de incorporadoras)
- Gratis para corretores/imobiliarias
- Contato direto disponivel: parcerias@orulo.com.br

### O que o ZmobCRM ganharia

1. **Catalogo de empreendimentos** -- dados completos de centenas de incorporadoras
2. **Disponibilidade e precos** -- atualizados via webhook
3. **Materiais de venda** -- fotos, plantas, videos, 360
4. **Contato comercial** -- dados da equipe de vendas de cada incorporadora
5. **Tipologias e unidades** -- detalhamento por empreendimento

### Fluxo de Integracao Proposto

```
ORULO API                          ZMOB CRM
   |                                   |
   |<-- GET /config -------------------|  (verificar integracao ativa)
   |                                   |
   |<-- GET /buildings?include[]= -----|  (listar empreendimentos)
   |--- Lista de empreendimentos ----->|
   |                                   |-- Salvar em tabela `empreendimentos`
   |                                   |
   |<-- GET /buildings/{id} -----------|  (detalhe por empreendimento)
   |--- Dados completos -------------->|
   |                                   |-- Salvar detalhes + fotos + plantas
   |                                   |
   |<-- GET /{id}/typologies/{id}/units|  (unidades por tipologia)
   |--- Unidades + status + preco ---->|
   |                                   |-- Salvar em tabela `unidades`
   |                                   |
   |--- WEBHOOK: preco/estoque mudou ->|  (notificacao push)
   |                                   |-- Atualizar dados locais
```

### Proximos Passos (para @pm/@dev)

1. Solicitar acesso a API: parcerias@orulo.com.br ou WhatsApp +55 11 4872-8277
2. Receber Client ID + Secret
3. Estudar documentacao em documento.orulo.com.br
4. Modelar tabelas no Supabase (empreendimentos, tipologias, unidades)
5. Implementar sync diario + webhooks
6. Criar tela de catalogo de empreendimentos no ZmobCRM

### Esforco Estimado

| Fase | Esforco | Dependencia |
|------|---------|-------------|
| Contato e acesso a API | 1-2 semanas | Comercial |
| Modelagem de dados | 1-2 dias | Nenhuma |
| Implementacao sync | 3-5 dias | Acesso a API |
| Implementacao webhooks | 2-3 dias | URL publica |
| UI catalogo | 3-5 dias | Dados disponiveis |
| **Total** | **~2-3 semanas** | |

---

## Opcao 2: Parceria Comercial com Beotto/Melnick (LONGO PRAZO)

### Por que considerar

- Acesso direto a dados da Melnick (principal incorporadora do RS)
- Espelho de vendas em tempo real
- Propostas digitais integradas
- Dados mais ricos que o Orulo (jornada de vendas, status da proposta)

### Desafios

1. **Sem API publica** -- precisaria de acordo comercial
2. **Empresa captiva** -- Melnick e socia, pode nao ter interesse em abrir para CRMs externos
3. **Escopo limitado** -- so teria dados da Melnick (e possivelmente poucas outras)
4. **Empresa pequena** (11-50 pessoas) -- pode nao ter bandwidth para parcerias
5. **Concorrencia potencial** -- o Beotto ja faz gestao de carteira de clientes

### Abordagem Sugerida

1. Estabelecer relacionamento com a MEV (Melnick Vendas)
2. Demonstrar valor do ZmobCRM como complemento (nao substituto) do Beotto
3. Propor integracao de dados unidirecional: Beotto -> ZmobCRM
4. Negociar acesso a API (se existir)

### Esforco Estimado

| Fase | Esforco | Dependencia |
|------|---------|-------------|
| Contato comercial | 2-4 semanas | Nenhuma |
| Negociacao | 4-8 semanas | Interesse da Melnick |
| Especificacao tecnica | 1-2 semanas | Acesso a docs |
| Implementacao | 2-4 semanas | Especificacao |
| **Total** | **2-4 meses** | |

---

## Opcao 3: Integracao com CV CRM / Construtor de Vendas (ALTERNATIVA)

### Por que

- CV CRM e o principal CRM para incorporadoras no Brasil
- 50+ integracoes
- Se a Melnick usar o CV como ERP/CRM interno, os dados poderiam fluir por ali
- API documentada

### Limitacao

- Nao ha confirmacao de que a Melnick use o CV CRM
- Integracao mais complexa (CRM-to-CRM)

---

## Decisao Recomendada

```
CURTO PRAZO (agora):     Integrar com Orulo
                          -> Catalogo de empreendimentos de centenas de incorporadoras
                          -> API documentada, processo conhecido
                          -> Custo baixo, retorno imediato

MEDIO PRAZO (3-6 meses): Abordar Beotto/Melnick para parceria
                          -> Se Orulo nao cobrir Melnick, buscar acesso direto
                          -> Usar traction do ZmobCRM como argumento

LONGO PRAZO (6-12 meses): Avaliar CV CRM e outras integracoes
                           -> Ampliar ecossistema de dados
```

---

## Nota sobre Risco Estrategico

O Beotto, como plataforma proprietaria da Melnick, pode ter **interesse em manter corretores dentro do seu ecossistema** (carteira de clientes, propostas, jornada de vendas). Integrar com o Beotto pode significar competir por funcionalidades que o proprio Beotto ja oferece. A abordagem via **Orulo como camada intermediaria** mitiga esse risco, pois o Orulo e neutro e focado em catalogo/dados, nao em CRM.

---

## Proximo Passo Imediato

Encaminhar este relatorio para @pm para decisao de priorizacao. Se aprovado, o primeiro passo tecnico seria solicitar acesso a API do Orulo e criar uma story para modelagem de dados no Supabase.
