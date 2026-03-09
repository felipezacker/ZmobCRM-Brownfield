# Epic: Prospecção Inteligente — ZmobCRM

## Metadata
- **Epic ID:** CP-2
- **Status:** Done
- **Owner:** @pm
- **Created:** 2026-03-04
- **Priority:** P2
- **Source:** Análise PM+PO sobre Central de Prospecção (CP-1 completo)
- **Depends on:** Epic CP (Central de Prospecção) — todas as 4 stories Done

---

## Objetivo

Evoluir a Central de Prospecção de um power dialer funcional para uma ferramenta de prospecção inteligente. Foco em três pilares: (1) continuidade — auto-retry de contatos não atendidos e histórico visível, (2) conversão — ações rápidas pós-chamada que conectam prospecção ao pipeline, (3) produtividade — metas diárias, heatmap de melhor horário, e filas reutilizáveis.

---

## Escopo

### IN
- **Auto-retry**: contatos com outcome `no_answer` voltam à fila automaticamente após X dias configurável
- **Histórico do contato no PowerDialer**: últimas interações visíveis durante a chamada
- **Quick actions pós-chamada**: criar negócio, agendar retorno, mover stage — direto do outcome
- **Templates de notas**: notas rápidas predefinidas por outcome
- **Metas diárias**: configuração de meta (ligações/dia, % conexão) com barra de progresso
- **Heatmap de melhor horário**: análise de connection rate por dia/hora
- **Filas salvas**: salvar configurações de filtro como "fila favorita" reutilizável
- **Export de relatório**: PDF com métricas do período para reuniões

### OUT
- Cadência multi-canal (WhatsApp, email, SMS) — epic separado futuro
- Lead scoring automático — epic separado futuro
- VoIP/WebRTC — mantém escopo original (tel://)
- Integração com ferramentas externas (Twilio, RD Station)
- Gamificação avançada (badges, streaks, conquistas)

---

## Contexto Existente (CP-1 Completo)

### Componentes reutilizáveis do CP-1
| Componente | Path | O que aproveitar |
|-----------|------|-----------------|
| `PowerDialer` | `features/prospecting/components/PowerDialer.tsx` | Adicionar painel de histórico e quick actions |
| `CallModal` | `features/inbox/components/CallModal.tsx` | Adicionar quick actions no pós-outcome |
| `MetricsCards` | `features/prospecting/components/MetricsCards.tsx` | Adicionar card de meta diária |
| `ProspectingFilters` | `features/prospecting/components/ProspectingFilters.tsx` | Base para filas salvas |
| `useProspectingQueue` | `features/prospecting/hooks/useProspectingQueue.ts` | Adicionar lógica de auto-retry |
| `useProspectingMetrics` | `features/prospecting/hooks/useProspectingMetrics.ts` | Adicionar heatmap e metas |

### Schema DB (existente)
- `prospecting_queues` — fila de ligações com status, position, session_id, assigned_by
- `activities` — type='CALL' com metadata JSONB (outcome, duration_seconds)
- `contacts` — stage, temperature, classification, source, owner_id
- RLS por organization_id em todas as tabelas

### O que falta no DB (decisões)
- **Tabela `prospecting_saved_queues`**: persistir filtros como filas reutilizáveis
  - Schema: `id, name, filters JSONB, owner_id, organization_id, created_at`
- **Tabela `prospecting_daily_goals`**: metas configuráveis por corretor
  - Schema: `id, owner_id, organization_id, calls_target, connection_rate_target, created_at, updated_at`
- **Campo `retry_at TIMESTAMPTZ` em `prospecting_queues`**: agendar retorno automático
- **Campo `retry_count INT` em `prospecting_queues`**: controlar número de retentativas

---

## Stories

### CP-2.1: Auto-Retry + Histórico do Contato no PowerDialer

**Descrição:** Contatos com outcome `no_answer` são automaticamente re-enfileirados após X dias (padrão: 3). O PowerDialer exibe as últimas 5 interações do contato (chamadas, atividades) para dar contexto ao corretor antes de ligar. Limite de 3 retries por contato por sessão.

**Escopo:**
- Lógica de auto-retry com delay configurável (3, 5, 7 dias)
- Campos `retry_at` e `retry_count` na tabela `prospecting_queues`
- Painel "Histórico" no PowerDialer com últimas 5 atividades do contato
- Badge visual indicando "retry #N" no QueueItem
- Limite de retries (max 3) — após o 3º, contato sai da fila
- Configuração do delay via settings da prospecção

**Executor:** @dev | **Quality Gate:** @qa

---

### CP-2.2: Quick Actions Pós-Chamada + Templates de Notas

**Descrição:** Após registrar o outcome da chamada, o corretor vê ações rápidas contextuais: "Criar Negócio" (abre criação de deal pré-preenchido), "Agendar Retorno" (cria atividade futura), "Mover Stage" (atualiza stage do contato). Templates de notas predefinidas por outcome para agilizar o registro.

**Escopo:**
- Painel de quick actions pós-outcome no CallModal (contexto prospecção)
- Ação "Criar Negócio": abre formulário pré-preenchido com dados do contato
- Ação "Agendar Retorno": cria atividade tipo CALL com data futura
- Ação "Mover Stage": dropdown para mudar stage (LEAD→MQL, MQL→PROSPECT, etc.)
- Templates de notas por outcome (conectado: "Interessado, agendar demo", "Não qualificado"; sem resposta: "Tentar novamente", "Número incorreto")
- Templates editáveis pelo diretor/admin

**Executor:** @dev | **Quality Gate:** @qa

---

### CP-2.3: Metas Diárias + Heatmap de Melhor Horário

**Descrição:** Corretor configura meta diária de ligações e taxa de conexão. Dashboard exibe barra de progresso em tempo real. Heatmap mostra taxa de conexão por dia da semana × hora do dia, baseado no histórico real de chamadas. Diretor pode definir metas para sua equipe.

**Escopo:**
- Tabela `prospecting_daily_goals` com metas por corretor
- Card de "Meta do Dia" no dashboard com barra de progresso circular
- Progresso atualizado em real-time (após cada chamada)
- Heatmap: grid 7×24 (dia × hora) com cores por connection rate
- Dados do heatmap calculados a partir de activities (últimos 30/60/90 dias)
- Diretor pode definir/editar metas dos corretores da equipe
- Notificação visual ao atingir meta (confetti ou badge)

**Executor:** @dev | **Quality Gate:** @qa

---

### CP-2.4: Filas Salvas + Export de Relatório

**Descrição:** Corretor pode salvar configurações de filtro como "fila favorita" para reutilizar (ex: "Leads frios sem contato há 30 dias"). Export de relatório em PDF com métricas do período selecionado para reuniões de gestão.

**Escopo:**
- Tabela `prospecting_saved_queues` para persistir filtros
- Botão "Salvar Fila" no painel de filtros com nome customizável
- Lista de filas salvas com "Carregar" e "Excluir"
- Compartilhamento: diretor pode criar filas visíveis para toda equipe
- Export PDF: métricas resumidas + ranking + insights do período
- Template do PDF com logo da organização
- Geração client-side (html2canvas + jsPDF ou react-pdf)

**Executor:** @dev | **Quality Gate:** @qa

---

## Dependências

| Story | Depende de | Tipo |
|-------|-----------|------|
| CP-2.1 | CP-1.1, CP-1.4 | Queue + metrics existentes |
| CP-2.2 | CP-1.1, CP-1.2 | CallModal + script flow |
| CP-2.3 | CP-1.4 | Metrics dashboard existente |
| CP-2.4 | CP-1.3, CP-1.4 | Filtros + métricas existentes |

**Sequência recomendada:**
```
CP-2.1 (auto-retry + histórico) → CP-2.2 (quick actions) → CP-2.3 (metas + heatmap) → CP-2.4 (filas salvas + export)
```

CP-2.1 e CP-2.2 podem rodar em paralelo se necessário. CP-2.3 e CP-2.4 também são independentes entre si.

---

## Compatibilidade

- [x] APIs existentes permanecem inalteradas
- [x] Schema DB: apenas adições (2 tabelas novas + 2 campos em prospecting_queues)
- [x] UI segue padrões existentes (dark mode, responsivo, Lucide icons)
- [x] RLS por organization_id em qualquer tabela nova
- [x] Componentes do CP-1 são estendidos, não substituídos

---

## Riscos e Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Auto-retry gera fila infinita | Médio | Limite de 3 retries por contato, cap de 100 na fila |
| Heatmap com poucos dados é inútil | Baixo | Exigir mínimo de 50 chamadas para mostrar, mensagem "dados insuficientes" |
| Export PDF pesado com muitos dados | Baixo | Limitar período máximo (90 dias), paginação no PDF |
| Quick actions complexificam o CallModal | Médio | Painel colapsável, só aparece em fluxo de prospecção |

**Rollback:** Cada story é independente. Remover feature flags individuais sem impacto nas demais.

---

## Definition of Done

- [x] Auto-retry de contatos não atendidos funcionando com delay configurável
- [x] Histórico do contato visível no PowerDialer durante sessão
- [x] Quick actions pós-chamada (criar deal, agendar retorno, mover stage)
- [x] Templates de notas por outcome funcionando
- [x] Metas diárias com barra de progresso em tempo real
- [x] Heatmap de melhor horário baseado em dados reais
- [x] Filas salvas com persistência e compartilhamento
- [x] Export PDF de relatório de métricas
- [x] Responsivo (desktop + mobile)
- [x] RLS validado em todas as queries novas
- [x] Testes cobrindo fluxos críticos
- [x] Sem regressão nas funcionalidades do CP-1

---

## Handoff para Story Manager

> **Para @sm:** Desenvolver stories detalhadas para este epic. Considerações:
> - CP-1 está 100% completo — todas as 4 stories Done
> - Componentes existentes devem ser ESTENDIDOS, não reescritos
> - Cada story deve ter testes que validem que CP-1 não regrediu
> - RBAC existente: corretor usa, diretor administra + vê equipe, admin vê tudo
> - Padrões: dark mode, Lucide icons, Tailwind, responsivo mobile-first
> - DB: novas tabelas seguem padrão de RLS por organization_id
