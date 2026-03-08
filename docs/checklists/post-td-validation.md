# Checklist: Validacao Pos-Epic TD (Technical Debt Resolution)

- **Data:** 2026-03-08
- **Branch:** develop
- **Staging URL:** (preencher apos deploy)
- **Testador:** Felipe

---

## 1. Validacao Automatica (Local)

```bash
npm run typecheck && npm run lint && npm test
```

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors (warnings pre-existentes ok)
- [ ] `npm test` — 733+ tests pass, 0 fail

---

## 2. Validacao Funcional (Staging)

### 2.1 Auth & Roles

- [ ] Login como **admin** — acessa dashboard
- [ ] Login como **diretor** — acessa dashboard
- [ ] Login como **corretor** — acessa dashboard
- [ ] Logout + login novamente — sessao funciona

### 2.2 Deals Board

- [ ] Criar deal novo
- [ ] Mover deal entre stages (drag & drop)
- [ ] Editar deal (nome, valor, property_ref)
- [ ] Adicionar nota ao deal
- [ ] Deletar deal — **ConfirmModal aparece**
- [ ] Empty state visivel quando stage vazio

### 2.3 Contacts

- [ ] Criar contato novo
- [ ] Editar contato (nome, telefone, email)
- [ ] Adicionar tags ao contato
- [ ] Adicionar custom fields ao contato
- [ ] Vincular contato a deal
- [ ] Deletar contato — **ConfirmModal aparece**

### 2.4 Activities

- [ ] Criar atividade tipo CALL
- [ ] Criar atividade tipo MEETING
- [ ] Criar atividade tipo EMAIL
- [ ] Criar atividade tipo WHATSAPP
- [ ] Completar atividade
- [ ] Reagendar atividade
- [ ] Empty state visivel quando sem atividades

### 2.5 Prospecting

- [ ] Abrir fila de prospeccao
- [ ] Visualizar scripts de venda
- [ ] Marcar objecoes durante script
- [ ] Navegar entre contatos na fila

### 2.6 Chat IA

**Basico:**
- [ ] Abrir chat e perguntar "quais sao meus deals?"
- [ ] Pedir "crie um contato chamado Teste"
- [ ] Trocar provider de IA (Settings) e testar novamente

**Gap 1-2-3: Prompt dinamico + 36 tools visiveis:**
- [ ] Editar prompt no admin (ai_prompt_templates) — agente reflete mudanca no proximo request
- [ ] Perguntar "quais tools voce tem?" — deve listar/reconhecer 36 tools

**Gap 4-5: Quick scripts:**
- [ ] Pedir "liste meus scripts de followup" — retorna da tabela quick_scripts
- [ ] Pedir "gere um script de introducao e salve" — persiste na tabela (nao texto solto)
- [ ] Pedir "liste meus scripts de objection" — filtra por categoria

**Gap 6: Property ref em deals:**
- [ ] Pedir "busque deals com imovel X" — property_ref aparece no resultado
- [ ] Criar deal com property_ref via IA — campo salvo corretamente

**Gap 7: Metadata JSONB em activities:**
- [ ] Pedir "mostre minhas atividades de hoje" — metadata (outcomes) aparece no resultado
- [ ] Criar atividade tipo CALL — metadata de ligacao acessivel

**Gap 8: Tags e custom fields em contacts:**
- [ ] Pedir "encontre contatos com tag VIP" — filtra por tag
- [ ] Pedir "encontre contatos com campo origem = indicacao" — filtra por custom field

**Gap 9: WHATSAPP:**
- [ ] Pedir "crie uma atividade de whatsapp" — tipo WHATSAPP aceito (nao apenas CALL/MEETING/EMAIL/TASK)

**Gap 10: Objecoes de ligacao:**
- [ ] Pedir "mostre resultados da ultima ligacao para contato X" — retorna metadata com objecoes

**Gap 11: Lead score:**
- [ ] Pedir "qual o lead score do contato X?" — usa tool getLeadScore proativamente

**Prospeccao via IA (Gap 1):**
- [ ] Pedir "mostre minhas filas de prospeccao" — retorna filas ativas
- [ ] Pedir "quais sao minhas metas de hoje?" — retorna metas e progresso
- [ ] Pedir "quais sao minhas metricas de prospeccao?" — retorna conversao, ligacoes, cadencias

### 2.7 Settings

- [ ] Editar produto — salva corretamente
- [ ] Deletar produto — **ConfirmModal aparece**
- [ ] Editar tag — salva corretamente
- [ ] Deletar tag — **ConfirmModal aparece**
- [ ] Editar custom field — salva corretamente
- [ ] Deletar custom field — **ConfirmModal aparece**
- [ ] Trocar provider/modelo de IA

### 2.8 Realtime Sync

- [ ] Abrir 2 abas do CRM (mesmo usuario)
- [ ] Criar deal na aba 1 — aparece na aba 2
- [ ] Mover deal na aba 1 — atualiza na aba 2
- [ ] Editar contato na aba 1 — atualiza na aba 2

### 2.9 Error Pages (TD-2.1)

- [ ] Navegar para rota invalida — **404 customizada** com branding ZmobCRM (nao Next.js default)
- [ ] Forcar erro em pagina (ex: deal inexistente) — **error page customizada** aparece com opcao de voltar
- [ ] Error page exibe em `/dashboard`
- [ ] Error page exibe em `/pipeline`
- [ ] Error page exibe em `/contacts`
- [ ] Error page exibe em `/activities`
- [ ] Error page exibe em `/prospecting`

### 2.10 Skeletons (TD-3.1)

- [ ] Dashboard — skeleton com estrutura de cards/graficos ao carregar
- [ ] Pipeline — skeleton com estrutura de board ao carregar
- [ ] Contacts — skeleton com estrutura de lista ao carregar
- [ ] Activities — skeleton com estrutura de lista ao carregar
- [ ] Prospecting — skeleton ao carregar
- [ ] Settings — skeleton ao carregar
- [ ] Nenhuma pagina mostra tela branca durante carregamento

### 2.11 Dark Mode (TD-5.1)

- [ ] Ativar dark mode — todas as paginas adaptam cores
- [ ] Dashboard graficos legiveis em dark mode
- [ ] Pipeline board legivel em dark mode
- [ ] Modais legiveis em dark mode
- [ ] Sidebar e header adaptam ao dark mode
- [ ] Nenhum texto invisivel (texto claro em fundo claro ou escuro em fundo escuro)

### 2.12 Optimistic Updates (TD-5.2)

- [ ] Criar contato — aparece na lista **instantaneamente** (sem esperar servidor)
- [ ] Editar contato — atualiza na lista instantaneamente
- [ ] Deletar contato — some da lista instantaneamente
- [ ] Criar atividade — aparece instantaneamente
- [ ] Completar atividade — marca instantaneamente
- [ ] Simular falha (offline/throttle) — UI reverte automaticamente com toast de erro

### 2.13 Overlays & Modais (TD-2.1)

- [ ] Abrir modal sobre modal — z-index correto (novo modal na frente)
- [ ] Toast aparece acima de modais
- [ ] Popover/dropdown nao fica atras de modal
- [ ] Overlay escurece fundo ao abrir modal
- [ ] Fechar modal com ESC funciona
- [ ] Fechar modal clicando no overlay funciona

### 2.14 Layout & Design (Desktop)

- [ ] Sidebar abre e fecha
- [ ] Header exibe usuario logado
- [ ] Navegacao entre paginas funciona
- [ ] Scrollbar consistente entre paginas

### 2.15 Mobile (testar em 375px ou dispositivo real)

**Layout & Navegacao:**
- [ ] Sidebar colapsa/abre via hamburger menu
- [ ] Header nao transborda (sem scroll horizontal)
- [ ] Navegacao entre paginas funciona via menu mobile
- [ ] Conteudo nao fica cortado ou escondido atras da sidebar

**Pipeline Board:**
- [ ] Board de deals permite scroll horizontal entre stages
- [ ] Cards de deal legiveis (texto nao cortado)
- [ ] Drag & drop funciona com touch (ou alternativa mobile)

**Listas & Tabelas:**
- [ ] Lista de contatos legivel (colunas nao sobrepoem)
- [ ] Lista de atividades legivel
- [ ] Tabelas com scroll horizontal quando necessario

**Modais & Overlays:**
- [ ] ConfirmModal cabe na tela (nao corta botoes)
- [ ] Modal de criar deal cabe na tela e permite scroll interno
- [ ] Modal de editar contato cabe na tela
- [ ] Overlay cobre tela inteira ao abrir modal
- [ ] Fechar modal tocando no overlay funciona

**Skeletons & Loading:**
- [ ] Skeletons adaptam ao viewport mobile (nao quebram layout)
- [ ] PageLoader visivel e centralizado

**Dark Mode Mobile:**
- [ ] Dark mode funciona corretamente no mobile
- [ ] Texto legivel em todas as paginas (sem texto invisivel)

**Inputs & Interacao:**
- [ ] Campos de formulario acessiveis (teclado virtual nao cobre input)
- [ ] Botoes com area de toque adequada (min 44x44px)
- [ ] Toast/notificacoes visiveis e nao bloqueiam interacao

**Chat IA:**
- [ ] Chat abre e ocupa tela adequadamente
- [ ] Input de mensagem acessivel com teclado virtual
- [ ] Respostas da IA legiveis (nao transbordam)

---

## 3. Validacao de Seguranca (Staging)

### 3.1 Isolamento Cross-Tenant (como corretor)

- [ ] Corretor ve APENAS seus proprios deals
- [ ] Corretor ve APENAS seus proprios contatos
- [ ] Corretor ve APENAS suas proprias atividades
- [ ] Corretor NAO ve dados de outro corretor

### 3.2 Isolamento Cross-Org

- [ ] Dados de outra organizacao NAO aparecem
- [ ] API routes retornam 401 sem token
- [ ] API routes retornam 403 para recurso de outra org

### 3.3 Acoes Destrutivas Protegidas

- [ ] Toda exclusao exige confirmacao via ConfirmModal
- [ ] Nenhum `window.confirm()` nativo restante
- [ ] Cancel no ConfirmModal cancela a acao

---

## 4. Resultado Final

| Camada | Pass | Fail | Notas |
|--------|------|------|-------|
| Automatica | /3 | /3 | |
| Funcional | /104 | /104 | |
| Seguranca | /10 | /10 | |
| **TOTAL** | **/117** | **/117** | |

### Veredicto

- [ ] **APROVADO** — Tudo ok, pronto para PR main
- [ ] **COM RESSALVAS** — Issues menores documentados abaixo
- [ ] **REPROVADO** — Issues criticos encontrados

### Issues Encontrados

| # | Severidade | Descricao | Acao |
|---|-----------|-----------|------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

*Checklist gerado por @po (Pax) — Epic TD Post-Validation*
