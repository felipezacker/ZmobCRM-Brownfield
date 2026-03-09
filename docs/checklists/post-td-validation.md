# Checklist: Validacao Pos-Epic TD (Technical Debt Resolution)

- **Data:** 2026-03-09
- **Branch:** develop
- **Staging URL:** (preencher apos deploy)
- **Testador:** Felipe

---

## 1. Validacao Automatica (Local)

```bash
npm run typecheck && npm run lint && npm test
```

- [x] `npm run typecheck` — 0 errors
- [x] `npm run lint` — 0 errors (warnings pre-existentes ok)
- [x] `npm test` — 733 tests pass, 2 skipped, 0 fail

---

## 2. Validacao Funcional (Staging)

### 2.1 Auth & Roles

- [x] Login como **admin** — acessa dashboard
- [x] Login como **diretor** — acessa dashboard
- [x] Login como **corretor** — acessa dashboard
- [x] Logout + login novamente — sessao funciona

### 2.2 Deals Board

- [x] Criar deal novo
- [x] Mover deal entre stages (drag & drop) — **PASS (QV-1.1): fix optimistic update + realtime sync**
- [ ] Editar deal (nome, valor, property_ref) — **FAIL: não edita nome do contato no deal, telefone, valor. Modal do deal não permite criar produto inexistente (diferente do dealcard)**
- [x] Adicionar nota ao deal
- [x] Deletar deal — **ConfirmModal aparece**
- [x] Empty state visivel quando stage vazio

### 2.3 Contacts

- [x] Criar contato novo — **OBS: modal fica em "criando" mais tempo que necessário**
- [x] Editar contato (nome, telefone, email)
- [x] Adicionar tags ao contato — **OBS: delay ao adicionar/remover tag**
- [ ] Adicionar custom fields ao contato — **FAIL: input de campo personalizado não aceita adicionar no modal completo**
- [ ] Vincular contato a deal — **FAIL: deal criado via "+" aparece no board e na aba deals do modal, mas ao clicar para ir ao deal dá erro**
- [x] Deletar contato — **OBS: modal completo não tem opção de excluir contato (só na lista)**

### 2.4 Activities

- [x] Criar atividade tipo CALL — **OBS: sem deal selecionado não cria mas não mostra mensagem de erro**
- [x] Criar atividade tipo MEETING — **OBS: mesmo problema sem deal**
- [x] Criar atividade tipo EMAIL — **OBS: mesmo problema sem deal**
- [ ] Criar atividade tipo WHATSAPP — **FAIL: tipo WHATSAPP não disponível no formulário**
- [x] Completar atividade
- [x] Reagendar atividade
- [x] Empty state visivel quando sem atividades

### 2.5 Prospecting

**Fila de Contatos:**
- [x] Filtrar contatos por stage, temperatura, tags, fonte — **OBS: ajustar alinhamento de origem e tags**
- [x] Adicionar contatos filtrados à fila (lote) — **OBS: contatos só aparecem na fila após delay, toast já sumiu**
- [x] Buscar e adicionar contato individual à fila
- [x] Remover contato da fila
- [ ] Limite de 100 contatos na fila respeitado — **FAIL: adição individual não respeita o limite de 100**
- [ ] Duplicatas na fila são prevenidas — **FAIL: adição individual permite duplicatas**

**Filas Salvas:**
- [x] Salvar fila com nome e filtros — **OBS: botão só aparece com filtros em massa ativo, não quando tem contatos na fila**
- [ ] Carregar fila salva — restaura filtros e contatos — **FAIL: não restaura fila, apenas reabre painel de filtros em massa**
- [x] Deletar fila salva — **OBS: sem ConfirmModal antes de excluir**

**Power Dialer (Sessão de Ligações):**
- [x] Iniciar sessão de ligações
- [x] Registrar resultado de chamada (conectado, sem resposta, caixa postal, ocupado)
- [x] Visualizar script de venda durante ligação
- [x] Marcar objeções durante script
- [x] Ações rápidas pós-ligação (criar deal, agendar retorno) — **OBS: "mover stage" aparece sucesso mesmo sem deal vinculado (noop silencioso)**
- [x] Navegar entre contatos na fila (próximo/pular) — **OBS: sem opção de voltar ao contato anterior**
- [x] Ver histórico do contato durante sessão
- [x] Encerrar sessão — resumo aparece com estatísticas
- [x] Atalhos de teclado funcionam (L=ligar, P=pular, E=encerrar, S=scripts)

**Métricas:**
- [x] KPIs visíveis (ligações, atendidas, taxa de conexão, tempo médio)
- [x] Filtrar por período (hoje, 7 dias, 30 dias, custom) — **OBS: inputs de data custom não preenchem automaticamente ao selecionar preset (7d, 30d)**
- [x] Funil de conversão visível
- [x] Heatmap de conexões (melhor hora/dia) — dados insuficientes para validar visual
- [ ] Meta diária configurável e visível — **FAIL: ao configurar meta individual (ex: Gustavo), visualização não atualiza para o corretor selecionado, fica na visão "todos"**
- [x] Ranking de corretores visível (admin/diretor)
- [x] Exportar PDF com métricas

### 2.6 Chat IA

**Basico:**
- [x] Abrir chat e perguntar "quais sao meus deals?"
- [x] Pedir "crie um contato chamado Teste"
- [x] Trocar provider de IA (Settings) e testar novamente

**Gap 1-2-3: Prompt dinamico + 36 tools visiveis:**
- [x] Editar prompt no admin (ai_prompt_templates) — agente reflete mudanca no proximo request
- [x] Perguntar "quais tools voce tem?" — deve listar/reconhecer 36 tools

**Gap 4-5: Quick scripts:**
- [x] Pedir "liste meus scripts de followup" — retorna da tabela quick_scripts
- [x] Pedir "gere um script de introducao e salve" — persiste na tabela (nao texto solto)
- [x] Pedir "liste meus scripts de objection" — filtra por categoria

**Gap 6: Property ref em deals:**
- [ ] Pedir "busque deals com imovel X" — property_ref aparece no resultado — **FAIL: IA busca por título do deal, não reconhece imóvel/produto como property_ref**
- [ ] Criar deal com property_ref via IA — campo salvo corretamente — **FAIL: não vincula produto ao deal. Deal criado pela IA aparece no board mas não abre ao clicar (outros deals abrem normalmente)**

**Gap 7: Metadata JSONB em activities:**
- [x] Pedir "mostre minhas atividades de hoje" — metadata (outcomes) aparece no resultado
- [x] Criar atividade tipo CALL — metadata de ligacao acessivel

**Gap 8: Tags e custom fields em contacts:**
- [ ] Pedir "encontre contatos com tag VIP" — filtra por tag — **FAIL: IA não encontra contatos por tag mesmo existindo**
- [ ] Pedir "encontre contatos com campo origem = indicacao" — filtra por custom field — **FAIL: IA não filtra por custom field**

**Gap 9: WHATSAPP:**
- [ ] Pedir "crie uma atividade de whatsapp" — tipo WHATSAPP aceito — **FAIL: criou como CALL pois tipo WHATSAPP não existe no formulário/enum do frontend**

**Gap 10: Objecoes de ligacao:**
- [x] Pedir "mostre resultados da ultima ligacao para contato X" — retorna metadata com objecoes

**Gap 11: Lead score:**
- [x] Pedir "qual o lead score do contato X?" — usa tool getLeadScore proativamente

**Prospeccao via IA (Gap 1):**
- [x] Pedir "mostre minhas filas de prospeccao" — retorna filas ativas
- [x] Pedir "quais sao minhas metas de hoje?" — retorna metas e progresso
- [x] Pedir "quais sao minhas metricas de prospeccao?" — retorna conversao, ligacoes, cadencias

### 2.7 Settings

- [ ] Editar produto — salva corretamente — **FAIL: não salva na primeira tentativa, precisa atualizar a página ou refazer**
- [x] Deletar produto — **ConfirmModal aparece**
- [ ] Editar tag — salva corretamente — **FAIL: tag não tem opção de edição**
- [x] Deletar tag — **ConfirmModal aparece**
- [x] Editar custom field — salva corretamente
- [x] Deletar custom field — **ConfirmModal aparece**
- [x] Trocar provider/modelo de IA

### 2.8 Realtime Sync

- [x] Abrir 2 abas do CRM (mesmo usuario)
- [x] Criar deal na aba 1 — aparece na aba 2 — **PASS (QV-1.1): cross-tab INSERT com refetch completo**
- [x] Mover deal na aba 1 — atualiza na aba 2 — **PASS (QV-1.1): cross-tab UPDATE com stale detection**
- [x] Editar contato na aba 1 — atualiza na aba 2 — **PASS (QV-1.1): contacts adicionado ao kanban subscription**

### 2.9 Error Pages (TD-2.1)

- [ ] Navegar para rota invalida — **404 customizada** com branding ZmobCRM (nao Next.js default) — **FAIL: página branca com "404 This page could not be found." (Next.js default, sem branding)**
- [ ] Forcar erro em pagina (ex: deal inexistente) — **error page customizada** aparece com opcao de voltar — **NÃO TESTADO**
- [ ] Error page exibe em `/dashboard` — **FAIL: mesma 404 default**
- [ ] Error page exibe em `/pipeline` — **FAIL: mesma 404 default**
- [ ] Error page exibe em `/contacts` — **FAIL: mesma 404 default**
- [ ] Error page exibe em `/activities` — **FAIL: mesma 404 default**
- [ ] Error page exibe em `/prospecting` — **FAIL: mesma 404 default**

### 2.10 Skeletons (TD-3.1)

- [x] Dashboard — skeleton com estrutura de cards/graficos ao carregar
- [x] Pipeline — skeleton com estrutura de board ao carregar
- [x] Contacts — skeleton com estrutura de lista ao carregar
- [x] Activities — skeleton com estrutura de lista ao carregar
- [x] Prospecting — skeleton ao carregar
- [x] Settings — skeleton ao carregar
- [x] Nenhuma pagina mostra tela branca durante carregamento

### 2.11 Dark Mode (TD-5.1)

- [x] Ativar dark mode — todas as paginas adaptam cores
- [x] Dashboard graficos legiveis em dark mode
- [x] Pipeline board legivel em dark mode
- [x] Modais legiveis em dark mode
- [x] Sidebar e header adaptam ao dark mode
- [x] Nenhum texto invisivel (texto claro em fundo claro ou escuro em fundo escuro)

### 2.12 Optimistic Updates (TD-5.2)

- [x] Criar contato — aparece na lista **instantaneamente** (sem esperar servidor)
- [x] Editar contato — atualiza na lista instantaneamente
- [x] Deletar contato — some da lista instantaneamente
- [x] Criar atividade — aparece instantaneamente
- [x] Completar atividade — marca instantaneamente
- [x] Simular falha (offline/throttle) — UI reverte automaticamente com toast de erro

### 2.13 Overlays & Modais (TD-2.1)

- [x] Abrir modal sobre modal — z-index correto (novo modal na frente)
- [ ] Toast aparece acima de modais — **FAIL: toast fica por baixo do desfoque do modal, não visível**
- [x] Popover/dropdown nao fica atras de modal
- [x] Overlay escurece fundo ao abrir modal — **OBS: sidebar não escurece junto**
- [ ] Fechar modal com ESC funciona — **FAIL: ESC fecha o modal pai (deal) em vez do modal filho (confirm) quando há modal sobre modal**
- [x] Fechar modal clicando no overlay funciona — **OBS: clicar na sidebar com modal do deal aberto não fecha o modal**

### 2.14 Layout & Design (Desktop)

- [x] Sidebar abre e fecha
- [x] Header exibe usuario logado — **OBS: info do usuário fica no canto inferior esquerdo (sidebar), não no header**
- [x] Navegacao entre paginas funciona
- [x] Scrollbar consistente entre paginas

### 2.15 Mobile (testar em 375px ou dispositivo real)

**Layout & Navegacao:**
- [x] Sidebar colapsa/abre via hamburger menu — **OBS: vira menu horizontal fixo na parte inferior**
- [x] Header nao transborda (sem scroll horizontal)
- [x] Navegacao entre paginas funciona via menu mobile
- [x] Conteudo nao fica cortado ou escondido atras da sidebar

**Pipeline Board:**
- [x] Board de deals permite scroll horizontal entre stages
- [x] Cards de deal legiveis (texto nao cortado)
- [x] Drag & drop funciona com touch (ou alternativa mobile)

**Listas & Tabelas:**
- [x] Lista de contatos legivel (colunas nao sobrepoem)
- [x] Lista de atividades legivel
- [x] Tabelas com scroll horizontal quando necessario

**Modais & Overlays:**
- [x] ConfirmModal cabe na tela (nao corta botoes)
- [x] Modal de criar deal cabe na tela e permite scroll interno
- [x] Modal de editar contato cabe na tela
- [x] Overlay cobre tela inteira ao abrir modal
- [x] Fechar modal tocando no overlay funciona

**Skeletons & Loading:**
- [x] Skeletons adaptam ao viewport mobile (nao quebram layout)
- [x] PageLoader visivel e centralizado

**Dark Mode Mobile:**
- [x] Dark mode funciona corretamente no mobile
- [x] Texto legivel em todas as paginas (sem texto invisivel)

**Inputs & Interacao:**
- [x] Campos de formulario acessiveis (teclado virtual nao cobre input)
- [x] Botoes com area de toque adequada (min 44x44px)
- [x] Toast/notificacoes visiveis e nao bloqueiam interacao

**Chat IA:**
- [ ] Chat abre e ocupa tela adequadamente — **FAIL: chat fica maior que a tela verticalmente**
- [ ] Input de mensagem acessivel com teclado virtual — **FAIL: input inacessível pois chat ultrapassa tela e menu inferior cobre o input**
- [x] Respostas da IA legiveis (nao transbordam)

---

## 3. Validacao de Seguranca (Staging)

### 3.1 Isolamento Cross-Tenant (como corretor)

- [x] Corretor ve APENAS seus proprios deals
- [x] Corretor ve APENAS seus proprios contatos
- [x] Corretor ve APENAS suas proprias atividades
- [x] Corretor NAO ve dados de outro corretor

### 3.2 Isolamento Cross-Org

- [x] Dados de outra organizacao NAO aparecem — single tenant por enquanto
- [x] API routes retornam 401 sem token — **N/A: RLS ativo, single tenant**
- [x] API routes retornam 403 para recurso de outra org — **N/A: single tenant**

### 3.3 Acoes Destrutivas Protegidas

- [x] Toda exclusao exige confirmacao via ConfirmModal — **OBS: fila salva exclui sem confirmação (reportado em 2.5)**
- [x] Nenhum `window.confirm()` nativo restante
- [x] Cancel no ConfirmModal cancela a acao

---

## 4. Resultado Final

| Camada | Pass | Fail | Total | Notas |
|--------|------|------|-------|-------|
| Automatica | 3 | 0 | 3 | |
| Funcional | 108 | 22 | 130 | QV-1.1 resolveu #1, #17, #18, #19 |
| Seguranca | 11 | 0 | 11 | 2 N/A (single tenant) |
| **TOTAL** | **122** | **22** | **144** | **84.7% pass rate** |

### Veredicto

- [ ] **APROVADO** — Tudo ok, pronto para PR main
- [x] **COM RESSALVAS** — Issues documentados abaixo
- [ ] **REPROVADO** — Issues criticos encontrados

### Issues Encontrados — FAILS (26)

| # | Severidade | Seção | Descrição |
|---|-----------|-------|-----------|
| 1 | HIGH | 2.2 | Drag & drop: deal retorna ao stage anterior visualmente, só persiste com hard refresh |
| 2 | MEDIUM | 2.2 | Edição de deal: não edita nome/telefone/valor no modal, sem criar produto inline |
| 3 | MEDIUM | 2.3 | Custom fields: input não aceita adicionar no modal completo do contato |
| 4 | HIGH | 2.3 | Vincular contato a deal: deal criado via "+" dá erro ao clicar para navegar |
| 5 | MEDIUM | 2.4 | Tipo WHATSAPP não disponível no formulário de atividades |
| 6 | LOW | 2.5 | Fila: adição individual não respeita limite de 100 |
| 7 | LOW | 2.5 | Fila: adição individual permite duplicatas |
| 8 | MEDIUM | 2.5 | Filas salvas: carregar fila não restaura contatos, apenas reabre filtros |
| 9 | MEDIUM | 2.5 | Métricas: meta individual não atualiza visualização para corretor selecionado |
| 10 | HIGH | 2.6 | Gap 6: IA não busca deals por property_ref/imóvel |
| 11 | HIGH | 2.6 | Gap 6: IA não vincula produto ao criar deal + deal criado não abre ao clicar |
| 12 | MEDIUM | 2.6 | Gap 8: IA não encontra contatos por tag |
| 13 | MEDIUM | 2.6 | Gap 8: IA não filtra contatos por custom field |
| 14 | MEDIUM | 2.6 | Gap 9: WHATSAPP criado como CALL (tipo inexistente no frontend) |
| 15 | MEDIUM | 2.7 | Editar produto não salva na primeira tentativa |
| 16 | LOW | 2.7 | Tag não tem opção de edição |
| 17 | HIGH | 2.8 | Realtime: deal criado na aba 1 aparece sem dados na aba 2, não abre ao clicar |
| 18 | HIGH | 2.8 | Realtime: mover deal não sincroniza entre abas |
| 19 | MEDIUM | 2.8 | Realtime: editar contato não sincroniza entre abas |
| 20 | HIGH | 2.9 | Error pages: 404 customizada não implementada (usa Next.js default em todas as rotas) |
| 21 | MEDIUM | 2.13 | Toast fica por baixo do desfoque do modal |
| 22 | MEDIUM | 2.13 | ESC fecha modal pai em vez do filho quando há modal sobre modal |
| 23 | HIGH | 2.15 | Chat mobile: ultrapassa tela verticalmente |
| 24 | HIGH | 2.15 | Chat mobile: input inacessível (menu inferior cobre) |
| 25 | — | 2.9 | Error page para deal inexistente — NÃO TESTADO |
| 26 | — | 2.9 | Error pages em 5 rotas — mesmo root cause (item 20) |

### Observações (não bloqueantes, 15 total)

| # | Seção | Descrição |
|---|-------|-----------|
| 1 | 2.3 | Modal de criação de contato fica em "criando" mais tempo que necessário |
| 2 | 2.3 | Delay ao adicionar/remover tag |
| 3 | 2.3 | Modal completo não tem opção de excluir contato |
| 4 | 2.4 | Sem deal selecionado não cria atividade mas não mostra mensagem de erro |
| 5 | 2.5 | Alinhamento de origem e tags nos filtros |
| 6 | 2.5 | Contatos em lote só aparecem na fila após delay (toast já sumiu) |
| 7 | 2.5 | Botão salvar fila só aparece com filtros em massa ativo |
| 8 | 2.5 | Fila salva exclui sem ConfirmModal |
| 9 | 2.5 | "Mover stage" aparece sucesso mesmo sem deal vinculado |
| 10 | 2.5 | Sem opção de voltar ao contato anterior no Power Dialer |
| 11 | 2.5 | Inputs de data custom não preenchem ao selecionar preset |
| 12 | 2.13 | Sidebar não escurece com overlay do modal |
| 13 | 2.13 | Clicar na sidebar não fecha modal do deal |
| 14 | 2.14 | Info do usuário fica na sidebar, não no header |
| 15 | 2.15 | Sidebar vira menu horizontal fixo inferior no mobile |

---

*Checklist gerado por @po (Pax) — Epic TD Post-Validation*
