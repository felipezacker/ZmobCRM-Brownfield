# Triagem de Melhorias e Correções — Feedback da Equipe

> **Data:** 2026-02-28
> **Origem:** Feedback da equipe de uso do sistema
> **Total de itens:** 29 (9 bugs, 11 melhorias UX, 8 features novas, 1 já feito)

---

## Epic 1: Bugs & Estabilidade `P0 — URGENTE`

> Corrigir antes de qualquer feature nova

| # | Item | Severidade | Área |
|---|------|-----------|------|
| 1 | Recarregar página para ver alterações (reactivity) | **CRITICAL** | Global |
| 2 | Deal some ao atualizar página | **HIGH** | Board |
| 3 | Deal sobe pro board sem informações corretas | **HIGH** | Board |
| 4 | Número do cliente não sobe ao criar negócio | **HIGH** | Board |
| 5 | Inbox atividades não abre nem edita | **HIGH** | Inbox |
| 6 | Inbox lista agendada não aparece de imediato | **MEDIUM** | Inbox |
| 7 | Cockpit sem cabeçalho (modo claro) | **MEDIUM** | Cockpit |
| 8 | Cockpit nota grande — overflow horizontal | **MEDIUM** | Cockpit |
| 9 | Selecionar todas — clique só funciona no texto/caixa | **LOW** | Atividades |

**Status:** Vai direto para stories → `@dev` YOLO mode

---

## Epic 2: RBAC & Hierarquia `P1 — FUNDACIONAL`

> Base para dashboard por nível, atividades filtradas, etc. **PRECISA DE PRD.**

| # | Item | Tipo |
|---|------|------|
| 1 | Personalizar nível de acesso de corretores | Feature |
| 2 | Diretor gerencia seus corretores (adicionar, retirar, editar acessos, ver tudo) | Feature |
| 3 | Cadeia de diretores e corretores (departamentos) | Feature |

**Dependentes:** Epic 5 (Atividades filtro hierárquico), Epic 6 (Dashboard por nível)
**Próximo passo:** PRD com `@pm` — definir modelo de permissões, herança, granularidade

---

## Epic 3: Melhorias Contatos `P2`

| # | Item | Tipo | PRD? |
|---|------|------|------|
| 1 | Listas para organizar leads | Feature | Não |
| 2 | Todas as colunas ordenáveis com clique | UX | Não |
| 3 | Status abre dropdown em vez de mudar a cada clique | UX | Não |
| 4 | Layout modal mais interativo, detalhista e robusto | UX | Não |
| 5 | IA no interesse do contato (campo input → perfil automático) | Feature | **Sim** |

---

## Epic 4: Melhorias Board/Deals `P2`

| # | Item | Tipo | PRD? |
|---|------|------|------|
| 1 | Ações rápidas de edição nos deals (estilo DataCrazy) | UX | Não |
| 2 | Layout card negócios e modal melhorado | UX | Não |

---

## Epic 5: Melhorias Atividades `P2`

| # | Item | Tipo | PRD? |
|---|------|------|------|
| 1 | Filtro por hierarquia (adm/diretor/corretor) | Feature | Não *(depende Epic 2)* |
| 2 | Clicar em qualquer área abre edição | UX | Não |
| 3 | Trocar "reunião" por "visita" e "apresentação online" | UX | Não |
| 4 | Escolher duração da atividade | Feature | Não |
| ~~5~~ | ~~Não obrigar negócio vinculado~~ | ~~✅ Já feito~~ | — |

---

## Epic 6: Dashboard `P3`

> **PRECISA DE PRD.**

| # | Item | Tipo |
|---|------|------|
| 1 | Dashboard com dados focados na imobiliária | Feature |
| 2 | Métricas editáveis | Feature |
| 3 | Cada nível com suas métricas (corretor, diretor, master) | Feature *(depende Epic 2)* |

**Próximo passo:** PRD com `@pm` — definir KPIs, customização, métricas por nível

---

## Epic 7: Cockpit & Prospecção `P3`

| # | Item | Tipo | PRD? |
|---|------|------|------|
| 1 | Script de ligação dentro do cockpit | Feature | Não |
| 2 | Painel de ligação de prospecção | Feature | **Sim** |

---

## Epic 8: Imóveis `P3`

> **PRECISA DE PRD.**

| # | Item | Tipo |
|---|------|------|
| 1 | Match imóveis e leads | Feature |

**Próximo passo:** PRD com `@pm` — definir critérios de match, score, notificações

---

## Epic 9: IA `P4`

| # | Item | Tipo | PRD? |
|---|------|------|------|
| 1 | Acesso ao histórico de conversas com IA | Feature | Não |

---

## Grafo de Dependências

```
Epic 1 (Bugs) ← PRIMEIRO, sempre
    ↓
Epic 2 (RBAC) ← FUNDACIONAL
    ↓
    ├── Epic 5 (Atividades — filtro hierárquico)
    ├── Epic 6 (Dashboard — métricas por nível)
    │
Epic 3 (Contatos) ← independente
Epic 4 (Board/Deals) ← independente
Epic 7 (Cockpit) ← independente
Epic 8 (Imóveis) ← independente
Epic 9 (IA) ← independente
```

---

## Itens que Precisam de PRD

| Ordem | PRD | Motivo |
|-------|-----|--------|
| **1º** | RBAC & Hierarquia | Bloqueia Dashboard e filtro de Atividades |
| **2º** | Dashboard | Depende do RBAC para métricas por nível |
| **3º** | IA Interesse + Match Imóveis | Se complementam, podem ser 1 PRD |
| **4º** | Painel Prospecção | Independente, pode esperar |

---

## Itens que Vão Direto para Stories

- Todos os 9 bugs do Epic 1
- Colunas ordenáveis, dropdown de status, layout de modal (Contatos)
- Ações rápidas no board, layout de cards (Board/Deals)
- Duração de atividade, trocar "reunião" por "visita" (Atividades)
- Clicar na atividade abre edição (Atividades)
- Histórico de conversas com IA
- Script de ligação no cockpit
