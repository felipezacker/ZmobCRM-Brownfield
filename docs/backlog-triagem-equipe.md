# Triagem de Melhorias e Correções — Feedback da Equipe

> **Data:** 2026-02-28
> **Origem:** Feedback da equipe de uso do sistema
> **Total de itens:** 29 (9 bugs, 11 melhorias UX, 8 features novas, 1 já feito)
> **Última revisão:** 2026-03-02 (@po Pax — análise de implementação)

---

## Progresso Geral

| Epic | Progresso | Status |
|------|-----------|--------|
| Epic 1: Bugs & Estabilidade | 9/9 | ✅ COMPLETO |
| Epic 2: RBAC & Hierarquia | 1/3 parcial | 🟡 Fundação existe, PRD necessário |
| Epic 3: Melhorias Contatos | 3/5 | 🟡 60% |
| Epic 4: Melhorias Board/Deals | 2/2 | ✅ COMPLETO |
| Epic 5: Melhorias Atividades | ~0.5/4 | 🔴 Pendente |
| Epic 6: Dashboard | 1/3 + 1 parcial | 🟡 Parcial |
| Epic 7: Cockpit & Prospecção | ~0.5/2 | 🟡 MVPs básicos, PRD necessário |
| Epic 8: Imóveis | 0/1 parcial | 🟡 Preferências captadas, sem match |
| Epic 9: IA | 1/1 | ✅ COMPLETO |

---

## Epic 1: Bugs & Estabilidade `P0 — COMPLETO ✅`

> ~~Corrigir antes de qualquer feature nova~~ Todos os bugs corrigidos.

| # | Item | Severidade | Área | Status |
|---|------|-----------|------|--------|
| ~~1~~ | ~~Recarregar página para ver alterações (reactivity)~~ | ~~CRITICAL~~ | ~~Global~~ | ✅ Fallback 3s invalidation + Realtime (`6e72702`) |
| ~~2~~ | ~~Deal some ao atualizar página~~ | ~~HIGH~~ | ~~Board~~ | ✅ Optimistic enrichment com contact data (`6e72702`, `ceeb0cd`) |
| ~~3~~ | ~~Deal sobe pro board sem informações corretas~~ | ~~HIGH~~ | ~~Board~~ | ✅ Contact data enrichment completo (`6e72702`) |
| ~~4~~ | ~~Número do cliente não sobe ao criar negócio~~ | ~~HIGH~~ | ~~Board~~ | ✅ contactPhone adicionado ao enrichment (`6e72702`) |
| ~~5~~ | ~~Inbox atividades não abre nem edita~~ | ~~HIGH~~ | ~~Inbox~~ | ✅ URL-based edit navigation (`6e72702`) |
| ~~6~~ | ~~Inbox lista agendada não aparece de imediato~~ | ~~MEDIUM~~ | ~~Inbox~~ | ✅ defaultOpen={true} em upcoming (`6e72702`) |
| ~~7~~ | ~~Cockpit sem cabeçalho (modo claro)~~ | ~~MEDIUM~~ | ~~Cockpit~~ | ✅ Light/dark theme support (`0ef52d3`, `c31fb58`) |
| ~~8~~ | ~~Cockpit nota grande — overflow horizontal~~ | ~~MEDIUM~~ | ~~Cockpit~~ | ✅ whitespace-pre-wrap + line-clamp (`6e72702`) |
| ~~9~~ | ~~Selecionar todas — clique só funciona no texto/caixa~~ | ~~LOW~~ | ~~Atividades~~ | ✅ Click area expandida com label full-width (`6e72702`) |

---

## Epic 2: RBAC & Hierarquia `P1 — FUNDACIONAL` 🟡

> Base para dashboard por nível, atividades filtradas, etc. **PRECISA DE PRD.**
> Fundação existe: 3-tier roles (admin > diretor > corretor), RLS policies, user management básico.

| # | Item | Tipo | Status |
|---|------|------|--------|
| 1 | Personalizar nível de acesso de corretores | Feature | ❌ Não feito — roles fixos, sem permissões granulares |
| 2 | Diretor gerencia seus corretores (adicionar, retirar, editar acessos, ver tudo) | Feature | 🟡 Parcial — pode add/remove corretores, mas sem editar acessos granulares |
| 3 | Cadeia de diretores e corretores (departamentos) | Feature | ❌ Não feito — hierarquia flat, sem teams/departments |

**O que já existe:** Migration `20260220000000_rbac_corretor_diretor.sql`, RLS por org, `hasMinRole()`, UsersPage com invite/delete.
**O que falta:** Permissões granulares por corretor, campo `diretor_id`/`team_id`, tabela departments, UI de gestão de equipes.
**Dependentes:** Epic 5 (Atividades filtro hierárquico), Epic 6 (Dashboard por nível)
**Próximo passo:** PRD com `@pm` — definir modelo de permissões, herança, granularidade

---

## Epic 3: Melhorias Contatos `P2` 🟡

| # | Item | Tipo | Status |
|---|------|------|--------|
| 1 | Listas para organizar leads | Feature | ❌ Pendente — existe filtro por stage, mas não listas customizáveis |
| ~~2~~ | ~~Todas as colunas ordenáveis com clique~~ | ~~UX~~ | ✅ SortableHeader em todas as colunas (`f488d46`) |
| ~~3~~ | ~~Status abre dropdown em vez de mudar a cada clique~~ | ~~UX~~ | ✅ StatusDropdown com popover 3 opções (`42810c7`) |
| ~~4~~ | ~~Layout modal mais interativo, detalhista e robusto~~ | ~~UX~~ | ✅ ContactDetailModal completo com Timeline/Deals/Score (`ddeb977`, `08c4ab8`) |
| 5 | IA no interesse do contato (campo input → perfil automático) | Feature | ❌ Pendente — **Precisa PRD** |

---

## Epic 4: Melhorias Board/Deals `P2 — COMPLETO ✅`

| # | Item | Tipo | Status |
|---|------|------|--------|
| ~~1~~ | ~~Ações rápidas de edição nos deals (estilo DataCrazy)~~ | ~~UX~~ | ✅ Menu Win/Loss/Delete em DealCard (`1d8124d`, `160b1b2`) |
| ~~2~~ | ~~Layout card negócios e modal melhorado~~ | ~~UX~~ | ✅ Card 3-row compacto + inline product picker (`a2989a0`, `79664f5`) |

---

## Epic 5: Melhorias Atividades `P2` 🔴

| # | Item | Tipo | Status |
|---|------|------|--------|
| 1 | Filtro por hierarquia (adm/diretor/corretor) | Feature | ❌ Pendente *(depende Epic 2)* |
| 2 | Clicar em qualquer área abre edição | UX | 🟡 Parcial — funciona, mas UX depende de hover para mostrar botões |
| 3 | Trocar "reunião" por "visita" e "apresentação online" | UX | ❌ Pendente — tipos fixos: CALL/MEETING/EMAIL/TASK |
| 4 | Escolher duração da atividade | Feature | ❌ Pendente — sem campo duration no form/type |
| ~~5~~ | ~~Não obrigar negócio vinculado~~ | ~~✅ Já feito~~ | ✅ |

---

## Epic 6: Dashboard `P3` 🟡

| # | Item | Tipo | Status |
|---|------|------|--------|
| ~~1~~ | ~~Dashboard com dados focados na imobiliária~~ | ~~Feature~~ | ✅ DashboardPage com KPIs, funil, LTV, saúde carteira |
| 2 | Métricas editáveis | Feature | ❌ Pendente — métricas computadas, sem customização |
| 3 | Cada nível com suas métricas (corretor, diretor, master) | Feature | 🟡 Parcial — RBAC existe mas dashboard não diferencia por role *(depende Epic 2)* |

**Próximo passo:** PRD com `@pm` — definir customização de métricas + diferenciação por nível

---

## Epic 7: Cockpit & Prospecção `P3` 🟡

> MVPs básicos existem, mas longe do escopo esperado. **PRD necessário para completar.**

| # | Item | Tipo | Status |
|---|------|------|--------|
| 1 | Script de ligação dentro do cockpit | Feature | 🟡 Parcial (~40%) — Editor de templates + copiar, mas não guia interativo durante chamada |
| 2 | Painel de ligação de prospecção | Feature | 🟡 Parcial (~20%) — CallModal com log simples, sem power dialer/VoIP/fila. **Precisa PRD** |

**O que existe:** ScriptEditorModal (templates com variáveis), CallModal (4 outcomes + timer + tel:// discador nativo).
**O que falta:** Guia interativo de script durante chamada, WebRTC/SIP, call queue, métricas de produtividade, prospecção em massa.

---

## Epic 8: Imóveis `P3` 🟡

> **PRECISA DE PRD** para matching. Preferências já são captadas.

| # | Item | Tipo | Status |
|---|------|------|--------|
| 1 | Match imóveis e leads | Feature | 🟡 Parcial — ContactPreferencesSection captura tipo/preço/região/quartos/finalidade, mas sem catálogo de imóveis nem algoritmo de match |

**Próximo passo:** PRD com `@pm` — definir catálogo de imóveis, critérios de match, score, notificações

---

## Epic 9: IA `P4 — COMPLETO ✅`

| # | Item | Tipo | Status |
|---|------|------|--------|
| ~~1~~ | ~~Acesso ao histórico de conversas com IA~~ | ~~Feature~~ | ✅ AIHubPage com chat, histórico, multi-provider (Gemini/OpenAI/Anthropic) |

---

## Grafo de Dependências (atualizado)

```
Epic 1 (Bugs) ✅ COMPLETO
    ↓
Epic 2 (RBAC) 🟡 FUNDAÇÃO — precisa PRD para completar
    ↓
    ├── Epic 5 (Atividades — filtro hierárquico) 🔴 PENDENTE
    ├── Epic 6 (Dashboard — métricas por nível) 🟡 PARCIAL
    │
Epic 3 (Contatos) 🟡 60% — 2 itens pendentes
Epic 4 (Board/Deals) ✅ COMPLETO
Epic 7 (Cockpit) 🟡 PARCIAL — MVPs básicos, precisa PRD
Epic 8 (Imóveis) 🟡 PARCIAL — precisa PRD para match
Epic 9 (IA) ✅ COMPLETO
```

---

## Itens que Ainda Precisam de PRD

| Ordem | PRD | Motivo | Status |
|-------|-----|--------|--------|
| **1º** | RBAC & Hierarquia (completar) | Bloqueia Dashboard completo e filtro Atividades | Fundação pronta, PRD para granularidade |
| **2º** | Dashboard (customização) | Métricas editáveis + por nível | Dashboard básico pronto |
| **3º** | IA Interesse + Match Imóveis | Se complementam, podem ser 1 PRD | Preferências captadas |
| **4º** | Painel Prospecção (completar) | Power dialer, VoIP, fila de chamadas | MVP básico existe |

---

## Itens Pendentes que Vão Direto para Stories

- Listas customizáveis para organizar leads (Contatos)
- Trocar "reunião" por "visita" e "apresentação online" (Atividades)
- Escolher duração da atividade (Atividades)
- Melhorar UX de clique em atividade — não depender de hover (Atividades)
