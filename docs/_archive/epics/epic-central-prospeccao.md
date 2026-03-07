# Epic: Central de Prospecção — ZmobCRM

## Metadata
- **Epic ID:** CP
- **Status:** Complete
- **Owner:** @pm
- **Created:** 2026-03-03
- **Priority:** P2
- **Source:** Backlog Epic 7 (Cockpit & Prospecção) + elicitação PM

---

## Objetivo

Criar uma Central de Prospecção dedicada no ZmobCRM que permita corretores realizarem ligações em sequência (power dialer via tel://), com scripts guiados durante a chamada, filtros para prospecção em massa, e métricas de produtividade. Diretor vê métricas da equipe, admin vê tudo. MVP sem VoIP/WebRTC — usa discador nativo do dispositivo.

---

## Escopo

### IN
- Nova página `/prospecting` com entrada no menu lateral (PRIMARY_NAV)
- **Call Queue / Power Dialer**: fila de contatos para ligar em sequência via `tel://`
- **Script Guiado**: guia interativo de script durante a chamada (evolução do ScriptEditorModal)
- **Prospecção em Massa**: filtrar contatos por critérios e adicionar à fila de ligações
- **Métricas de Produtividade**: ligações/hora, taxa de conexão, tempo médio, outcomes
- **RBAC**: corretor usa, diretor administra + vê métricas equipe, admin vê tudo

### OUT
- VoIP/WebRTC (chamada dentro do CRM) — futuro
- Integração com provedores SIP/Twilio — futuro
- Discador automático (auto-dial sem ação do usuário) — futuro
- Gravação de chamadas — requer VoIP
- WhatsApp/SMS integration — escopo separado

---

## Contexto Existente

### Componentes reutilizáveis
| Componente | Path | O que aproveitar |
|-----------|------|-----------------|
| `CallModal` | `features/inbox/components/CallModal.tsx` | 4 outcomes, timer, tel://, notes — **base do log de ligação** |
| `ScriptEditorModal` | `features/inbox/components/ScriptEditorModal.tsx` | CRUD scripts com variáveis ({nome}, {empresa}) — **base do script guiado** |
| `TemplatePickerModal` | `features/deals/cockpit/TemplatePickerModal.tsx` | Picker com categoria PROSPECTING |
| `FocusContextPanel` | `features/inbox/components/FocusContextPanel.tsx` | Painel de contexto lateral |

### Navegação
- **Config:** `components/navigation/navConfig.ts`
- **Tipos:** `PrimaryNavId` (adicionar `'prospecting'`)
- **Item:** `{ id: 'prospecting', label: 'Prospecção', href: '/prospecting', icon: PhoneOutgoing }`
- **Layout:** `components/Layout.tsx`

### Schema DB (relevante)
- `contacts` — tabela principal com `stage` (LEAD, MQL, PROSPECT, CUSTOMER), `temperature` (HOT, WARM, COLD), `classification`, `source`, `owner_id`
- `activities` — type `'CALL'` com `deal_id`, `contact_id`, `owner_id`, `organization_id`
- `contact_phones` — múltiplos telefones por contato
- RLS por `organization_id` em todas as tabelas
- RBAC existente: admin > diretor > corretor

### O que falta no DB (nova tabela ou campos) — DECISOES TOMADAS
- **Tabela `prospecting_queues`**: persistencia da fila de ligacoes (necessario para cross-user assignment pelo diretor)
  - Schema: `id, contact_id, owner_id, organization_id, status, position, session_id, assigned_by, created_at`
  - RLS por organization_id, indexes por (owner_id, session_id, status)
- **Coluna `metadata JSONB` em `activities`**: salvar outcome e duration de forma estruturada
  - Formato: `{ outcome: 'connected'|'no_answer'|'voicemail'|'busy', duration_seconds: number }`
  - Resolve: outcome atualmente salvo como texto livre no campo `description` — impossivel de agregar
- **Métricas agregadas**: computadas via queries em `activities` usando `metadata->>'outcome'`

---

## Stories

### CP-1: Página Central de Prospecção + Call Queue

**Descrição:** Criar a página `/prospecting` com navegação, fila de contatos (call queue), e fluxo de power dialer usando `tel://`. O corretor seleciona/importa contatos para a fila, clica "Próximo" e liga em sequência. Cada ligação abre o CallModal adaptado com contexto do contato.

**Escopo:**
- Rota `/prospecting` + page + layout
- Novo item no `PRIMARY_NAV` (navConfig.ts)
- Componente da fila (lista de contatos com status: pendente, em andamento, concluído, pulado)
- Fluxo power dialer: próximo contato → abrir CallModal → registrar outcome → avançar
- Persistência da fila via tabela DB `prospecting_queues`
- Migration: coluna `metadata JSONB` em `activities` para outcome estruturado
- Responsivo (mobile: bottom nav com ícone)

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[code_review, pattern_validation, accessibility_check]`

---

### CP-2: Script Guiado Durante Chamada

**Descrição:** Evoluir o ScriptEditorModal para exibir um guia interativo DURANTE a chamada. Quando o CallModal está aberto no fluxo de prospecção, o corretor vê o script com variáveis substituídas, pode avançar entre seções, e marcar objeções/respostas.

**Escopo:**
- Componente `ProspectingScriptGuide` — exibe script com variáveis preenchidas do contato atual
- Seções navegáveis (intro → qualificação → objeções → fechamento)
- Quick-actions: marcar objeção ouvida, pular seção, copiar trecho
- Integração com CallModal no fluxo de prospecção
- Seleção de script antes de iniciar a sessão de prospecção

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[code_review, ux_validation, pattern_validation]`

---

### CP-3: Prospecção em Massa — Filtros e Importação para Fila

**Descrição:** Permitir ao corretor filtrar contatos por critérios (stage, temperature, classification, source, tags, owner, último contato) e importá-los em lote para a fila de prospecção. Diretor pode criar filas para seus corretores.

**Escopo:**
- Painel de filtros (reutilizar padrões existentes de ContactsPage)
- Filtros: stage, temperature, classification, source, tags, owner, "sem atividade há X dias"
- Seleção em lote (checkbox all / individual)
- Ação "Adicionar à fila" com preview de quantidade
- Diretor: filtro por corretor, pode criar fila e atribuir
- Paginação e performance (índices existentes cobrem os filtros)

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[code_review, performance_check, rls_validation]`

---

### CP-4: Métricas de Produtividade + RBAC

**Descrição:** Dashboard de métricas de prospecção com visão por role. Computar métricas a partir de `activities` (type='CALL'). Corretor vê suas métricas, diretor vê equipe, admin vê tudo.

**Escopo:**
- Cards de métricas: ligações hoje/semana, taxa de conexão, tempo médio, outcomes breakdown
- Gráfico de evolução (últimos 7/30 dias)
- Filtros de período
- RBAC:
  - Corretor: só seus dados (`owner_id = auth.uid()`)
  - Diretor: dados dos corretores da sua equipe
  - Admin: todos os dados
- Ranking de corretores (diretor/admin)
- Queries otimizadas (materializar ou cache se necessário)

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[code_review, rls_validation, performance_check]`

---

## Dependências

| Story | Depende de | Tipo |
|-------|-----------|------|
| CP-2 | CP-1 | CallModal no fluxo de prospecção |
| CP-3 | CP-1 | Fila para importar contatos |
| CP-4 | CP-1 | Dados de ligações registradas |

**Sequência recomendada:**
```
CP-1 (página + fila + dialer) → CP-2 (script) + CP-3 (filtros/massa) em paralelo → CP-4 (métricas)
```

---

## Compatibilidade

- [x] APIs existentes permanecem inalteradas
- [x] Schema DB: apenas adições (tabela `prospecting_queues` + coluna `metadata JSONB` em activities)
- [x] UI segue padrões existentes (dark mode, responsivo, Lucide icons)
- [x] RLS por organization_id em qualquer tabela nova
- [x] Performance: queries usam índices existentes em `activities`

---

## Riscos e Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Timer impreciso sem WebRTC | Médio | Manter abordagem atual (timer desde abertura do discador), documentar limitação |
| Fila grande degrada UX | Baixo | Paginação + limite de 100 contatos por sessão |
| Contato sem telefone na fila | Baixo | Filtrar automaticamente, mostrar badge "sem telefone" |
| RBAC da fila (diretor cria para corretor) | Médio | Reutilizar RBAC existente, testar com dados reais |

**Rollback:** Remover entrada do navConfig + rota `/prospecting`. Sem impacto no sistema existente.

---

## Definition of Done

- [x] Página `/prospecting` acessível no menu lateral
- [x] Call queue funcional com fluxo próximo/pular/concluir
- [x] Script guiado exibido durante chamada com variáveis substituídas
- [x] Filtros de prospecção em massa com importação para fila
- [x] Dashboard de métricas com visão por role (corretor/diretor/admin)
- [x] Responsivo (desktop + mobile)
- [x] RLS validado em todas as queries
- [x] Testes cobrindo fluxos críticos
- [x] Sem regressão nas funcionalidades existentes

---

## Evolução: Epic CP-2 (Prospecção Inteligente) — COMPLETE

CP-1 e CP-2 estão 100% completos (8 stories Done no total).

**Stories CP-2 (todas Done):**
- ✅ CP-2.1: Auto-Retry de Contatos + Histórico no PowerDialer
- ✅ CP-2.2: Quick Actions Pós-Chamada + Templates de Notas
- ✅ CP-2.3: Metas Diárias + Heatmap de Melhor Horário
- ✅ CP-2.4: Filas Salvas + Export de Relatório PDF

Ver detalhes: `docs/stories/epics/epic-prospeccao-inteligente.md`

---

## Handoff para Story Manager

> **Para @sm:** Desenvolver stories detalhadas para este epic brownfield. Considerações:
> - Sistema existente: React/TypeScript + Supabase + RLS + RBAC
> - Componentes base: CallModal, ScriptEditorModal (reutilizar, não recriar)
> - Navegação: `navConfig.ts` (PRIMARY_NAV) — adicionar item `prospecting`
> - Padrões existentes: dark mode, Lucide icons, Tailwind, responsivo mobile-first
> - Cada story deve verificar que funcionalidades existentes permanecem intactas
> - RBAC: corretor usa, diretor administra + métricas equipe, admin tudo
