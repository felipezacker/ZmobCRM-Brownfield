# Recommendations for ZmobCRM - Property Management Features

## Priority Matrix

Based on the competitive analysis, here are the features organized by implementation priority for ZmobCRM.

---

## P0 - Critical (Must-Have for Market Parity)

### 1. Property Registration with Rich Fields

**What:** Complete property registration form with all standard real estate fields.

**Key Fields (minimum viable):**
- Tipo do imovel (dropdown: casa, apartamento, terreno, sala, loja, galpao, sitio, fazenda)
- Finalidade (venda, locacao, temporada, venda + locacao)
- Endereco completo com CEP + autopreenchimento via API (Google Maps ou ViaCEP)
- Preco (com toggle "mostrar/ocultar no site")
- Area total + area construida (m2)
- Quartos, suites, banheiros, vagas
- IPTU mensal
- Valor condominio
- Andar (para apartamentos)
- Status (ativo, inativo, vendido, alugado, reservado)

**Campos secundarios:**
- Posicao do sol
- Mobiliado (sim/parcial/nao)
- Aceita permuta (sim/nao + descricao)
- Aceita financiamento
- Documentacao OK
- Observacoes internas (dados privativos - nao visivel ao cliente)

**Referencia:** Tecimob tem wizard de 25 passos (complexo demais para v1), Jetimob tem form mais simples.
**Recomendacao:** Form em abas (Basico > Caracteristicas > Midia > Localizacao > Publicacao) em vez de wizard linear.

### 2. Photo Management

**What:** Upload, organizacao e exibicao de fotos dos imoveis.

**Funcionalidades minimas:**
- Upload em lote (multiple file select)
- Drag-and-drop para reordenar fotos
- Primeira foto = capa automatica (com opcao de mudar)
- Legenda por foto
- 2 categorias: Imovel + Planta baixa
- Preview/lightbox para visualizacao

**Funcionalidades desejadas:**
- Fotos privativas (so equipe interna ve)
- Marca d'agua automatica
- Redimensionamento automatico para otimizar performance

**Referencia:** Tecimob tem 3 categorias (imovel, planta, privativas) + marca d'agua automatica.

### 3. Property-Contact Matching (Radar de Oportunidades)

**What:** Cruzamento automatico entre perfil de busca do contato e imoveis do catalogo.

**Implementacao sugerida:**
1. No contato/lead, campo "Perfil de busca" com:
   - Tipo imovel desejado
   - Faixa de preco (min-max)
   - Bairros/regioes de interesse
   - Quartos minimos
   - Area minima
   - Finalidade (compra/aluguel)

2. Trigger automatico:
   - Ao cadastrar novo imovel: lista contatos compativeis
   - Ao criar perfil de busca: lista imoveis compativeis
   - Notificacao na dashboard/inbox do corretor

3. Acoes rapidas:
   - Enviar imovel via WhatsApp
   - Enviar por email
   - Descartar match
   - Vincular a deal existente

**Referencia:** Tecimob chama de "Radar de Oportunidades", Jetimob gera "lista de imoveis compativeis" na oportunidade.

### 4. Property Linked to Deals

**What:** Vincular imoveis especificos aos deals no pipeline.

**Como implementar:**
- No deal (card do kanban), campo multi-select de imoveis vinculados
- Imovel pode estar em multiplos deals simultaneamente
- Status visual no imovel: "Em negociacao" com badge de quantos deals ativos
- Ao fechar deal: opcao de marcar imovel como "vendido/alugado"

**Referencia:** Jetimob faz isso via "Oportunidades" no funil, ZmobCRM ja tem boards/kanban.

---

## P1 - High Priority (Competitive Advantage)

### 5. AI-Generated Property Description

**What:** Botao para gerar descricao do imovel usando IA baseado nos dados cadastrados.

**Implementacao:**
- Botao "Gerar descricao" no form de cadastro
- Prompt contextualizado com: tipo, localizacao, quartos, area, caracteristicas, condominio
- Resultado editavel pelo usuario
- Pode usar OpenAI API ou similar

**Referencia:** Tecimob usa ChatGPT integrado com botao "Gerar descricao". Jetimob tambem integra ChatGPT.

### 6. Private Data Section

**What:** Secao de informacoes internas do imovel que o cliente NUNCA ve.

**Campos sugeridos:**
- Descricao de mobilia detalhada
- Observacoes internas (problemas, negociacoes anteriores, etc.)
- Motivo da venda
- Informacoes do proprietario
- Comissao acordada
- Documentos internos

**Referencia:** Tecimob tem "Dados Privativos" como secao separada. Feature de alto valor para corretores.

### 7. Property History / Audit Trail

**What:** Historico completo de alteracoes no imovel (quem mudou o que e quando).

**Implementacao:**
- Log automatico de todas as mudancas (preco, status, fotos, etc.)
- Timeline visual na pagina do imovel
- Filtros por tipo de alteracao e data
- Inclui mudancas de status, preco, publicacao

**Referencia:** Jetimob destaca "Historico completo de alteracoes" como feature principal.

### 8. Owner Reports (Relatorio ao Proprietario)

**What:** Email automatico para o dono do imovel com resumo de atividade.

**Conteudo sugerido:**
- Quantidade de visualizacoes no site
- Leads gerados
- Visitas agendadas/realizadas
- Comparativo com periodo anterior
- Status atual do imovel

**Referencia:** Ambas plataformas oferecem. Tecimob tem "emails para proprietario" e "link do proprietario" (pagina com resumo).

### 9. Client-Specific Property Page (inspirado no JetPage)

**What:** Pagina ou link exclusivo por contato/deal com imoveis selecionados.

**Implementacao simplificada:**
- Ao vincular imoveis a um deal, gerar link publico compartilhavel
- Pagina mostra APENAS os imoveis selecionados
- Cliente pode: marcar interesse, descartar, solicitar visita
- Interacoes registradas automaticamente na timeline do deal

**Referencia:** JetPage da Jetimob e um diferencial forte. Versao simplificada seria viavel para v1.

---

## P2 - Medium Priority (Nice-to-Have)

### 10. Orulo Integration

**What:** Integrar com Orulo para receber imoveis de incorporadoras/loteadoras.

**Requisitos:**
- Autenticacao via Client ID + Client Secret (API Orulo)
- Sync automatico de imoveis de lancamento
- Configuracao de visibilidade (quais imoveis mostrar)
- Controle de nivel de detalhe de localizacao exibido

**Nota:** Orulo cobra separado no Tecimob (R$24,90/mes). Pode ser add-on no ZmobCRM tambem.

### 11. Portal Integration (Syndication)

**What:** Publicar imoveis automaticamente em portais (ZAP, OLX, VivaReal, ImovelWeb).

**Implementacao:**
- Integracao via XML feed ou API dos portais
- Seletor por imovel: quais portais publicar
- Sync automatico de dados e fotos
- Recebimento de leads dos portais no CRM

**Referencia:** Ambos oferecem. Jetimob anuncia 40+ portais.

### 12. Condominium as Separate Entity

**What:** Cadastro de condominios como entidade separada, reutilizavel entre imoveis.

**Beneficio:** Ao cadastrar 10 apartamentos do mesmo predio, os dados do condominio (amenidades, fotos, taxas) sao preenchidos uma unica vez.

**Referencia:** Jetimob trata condominio como entidade separada vinculada ao imovel.

### 13. Key Management (Controle de Chaves)

**What:** Rastreamento de chaves de imoveis.

**Campos:**
- Imovel vinculado
- Quem esta com a chave
- Data de retirada/devolucao
- Status (disponivel/emprestada)

### 14. Exclusivity Management

**What:** Gestao do contrato de exclusividade do imovel.

**Campos:**
- Data inicio/fim da exclusividade
- Tipo (com/sem exclusividade)
- Alertas de vencimento

---

## P3 - Low Priority (Future Roadmap)

### 15. Proposal Management (Gestao de Propostas)

**What:** Sistema formal de propostas vinculadas a imoveis e deals.

### 16. Electronic Signatures

**What:** Assinatura eletronica de contratos.

### 17. Commission Management

**What:** Calculo e divisao de comissoes entre corretores.

### 18. Financial Module (ERP)

**What:** Modulo financeiro completo (fluxo de caixa, cobrancas, etc.)

### 19. DIMOB Generation

**What:** Geracao automatica da declaracao fiscal DIMOB.

---

## UX Patterns to Adopt

### From Tecimob:
1. **Wizard com menu lateral** para cadastro (progressao visual clara)
2. **Toggle "mostrar preco no site"** - simples e essencial
3. **Marca d'agua automatica** - configuracao uma vez, aplica em todas as fotos
4. **Dados privativos** claramente separados da area publica
5. **Botao IA para descricao** - reduz atrito no cadastro

### From Jetimob:
1. **Pipeline Kanban** para deals (ZmobCRM ja tem)
2. **JetPage** - pagina exclusiva por cliente (diferencial forte)
3. **Etiquetas/tags** para organizacao flexivel de imoveis
4. **Historico de alteracoes** com timeline visual
5. **Propostas com fila de prioridade** quando multiplos interessados no mesmo imovel
6. **Funil personalizavel** (nomes de etapas, quantidade, etc.)

---

## Implementation Sequence Recommended

```
Phase 1 (MVP Property Management):
  -> Rich property registration form (abas: Basico, Caracteristicas, Midia, Localizacao)
  -> Photo management (upload lote, reorder, capa)
  -> Property linked to deals (campo no deal card)

Phase 2 (Matching + Intelligence):
  -> Contact interest profile
  -> Automatic property-contact matching (radar)
  -> AI-generated descriptions
  -> Private data section

Phase 3 (Advanced Features):
  -> Owner reports
  -> Client-specific property page
  -> Property history/audit trail
  -> Condominium entity

Phase 4 (Integrations):
  -> Orulo integration
  -> Portal syndication (XML feed)
  -> Key management
  -> Exclusivity management
```

---

## Sources

- [Tecimob - Site Oficial](https://tecimob.com.br/)
- [Tecimob - Planos](https://tecimob.com.br/planos/)
- [Tecimob - Cadastrar Imovel (Help)](https://ajuda.tecimob.com.br/hc/ajuda/articles/1761053209-cadastrar-imovel)
- [Tecimob - Ficha de Captacao](https://tecimob.com.br/blog/o-que-nao-pode-faltar-na-ficha-de-captacao-de-imoveis/)
- [Tecimob - Marca d'agua](https://tecimob.com.br/blog/a-importancia-do-uso-da-marca-dagua-nos-imoveis/)
- [Jetimob - Site Oficial](https://www.jetimob.com/)
- [Jetimob - Recursos](https://www.jetimob.com/recursos)
- [Jetimob - Gestao de Imoveis](https://www.jetimob.com/recursos/gestao-imoveis)
- [Jetimob - JetPage](https://www.jetimob.com/recursos/jetpage)
- [Jetimob - Gestao de Propostas](https://www.jetimob.com/recursos/gestao-propostas)
- [Jetimob - Integracao Orulo](https://www.jetimob.com/integracoes/orulo)
- [Jetimob - Integracoes](https://www.jetimob.com/integracoes)
- [Jetimob - Planos](https://www.jetimob.com/planos)
- [Jetimob - CRM para Imobiliaria](https://www.jetimob.com/crm-imobiliaria)
- [Jetimob - Sistema Gestao Vendas](https://www.jetimob.com/sistema-gestao-vendas-imoveis)
- [Jetimob - Portais](https://www.jetimob.com/recursos/portais)
- [B2B Stack - Tecimob vs Jetimob](https://www.b2bstack.com.br/compare/tecimob-vs-jetimob)
- [Orulo - Integracoes](https://www.orulo.com.br/integracoes)
- [ImobiBrasil - Melhores CRMs 2026](https://www.imobibrasil.com.br/blog/os-5-melhores-crms-imobiliarios-para-impulsionar-as-suas-vendas/)
