# DB-AUDIT.md - Auditoria do Banco de Dados

> **Projeto:** ZmobCRM (CRMIA)
> **Gerado em:** 2026-02-23
> **Fase:** Brownfield Discovery - Phase 2 (@data-engineer)
> **Banco:** Supabase (PostgreSQL)

---

## Sumario Executivo

O banco possui **35 tabelas ativas** (1 removida por migration). A maior vulnerabilidade e a presenca de **~21 tabelas com politicas RLS totalmente permissivas** (`USING (true)`), permitindo que qualquer usuario autenticado leia, altere e delete todos os registros. Apenas 6 tabelas possuem RBAC adequado apos as migrations recentes.

### Classificacao de Risco Geral: **ALTO**

---

## 1. Analise de Cobertura RLS

### 1.1 Tabelas com RBAC Adequado (6 tabelas)

| Tabela | Modelo | Implementado em |
|--------|--------|-----------------|
| `deals` | owner-based (corretor) + admin/diretor full | Migration 20260220000000 + 20260220100001 |
| `contacts` | owner-based (corretor) + admin/diretor full | Migration 20260220000000 + 20260220100001 |
| `organization_invites` | admin/diretor management + member view | Migration 20260220000000 |
| `organization_settings` | admin management + member view | Schema init |
| `api_keys` | admin-only | Schema init |
| `ai_prompt_templates` | admin management + member view | Schema init |

### 1.2 Tabelas com Politicas Corretas por Usuario (3 tabelas)

| Tabela | Modelo |
|--------|--------|
| `profiles` | SELECT: todos; UPDATE: apenas proprio |
| `user_settings` | ALL: apenas proprio (user_id = auth.uid()) |
| `quick_scripts` | Sistema visivel a todos; CRUD apenas proprios |

### 1.3 Tabelas com Admin-Only Adequado (5 tabelas de integracao)

| Tabela | Modelo |
|--------|--------|
| `ai_feature_flags` | admin management + member view |
| `integration_inbound_sources` | admin-only |
| `integration_outbound_endpoints` | admin-only |
| `webhook_events_in` | admin view-only |
| `webhook_events_out` | admin view-only |
| `webhook_deliveries` | admin view-only |

### 1.4 CRITICO: Tabelas com Politicas Permissivas (21 tabelas)

Todas usam `FOR ALL TO authenticated USING (true)` -- qualquer usuario autenticado pode ler, alterar e deletar TODOS os registros.

#### Risco CRITICO (dados sensiveis expostos)

| Tabela | Risco | Impacto |
|--------|-------|---------|
| **`audit_logs`** | Qualquer usuario pode LER e DELETAR logs de auditoria | Destruicao de trilha de auditoria, compliance LGPD comprometida |
| **`security_alerts`** | Qualquer usuario pode LER e DELETAR alertas de seguranca | Ocultacao de incidentes de seguranca |
| **`user_consents`** | Qualquer usuario pode LER e ALTERAR consentimentos de outros | Violacao direta de LGPD |
| **`ai_conversations`** | Qualquer usuario pode LER conversas de IA de outros | Vazamento de dados de negociacao |
| **`ai_decisions`** | Qualquer usuario pode LER decisoes de IA de outros | Exposicao de estrategia comercial |
| **`ai_audio_notes`** | Qualquer usuario pode LER transcricoes de audio de outros | Vazamento de informacoes confidenciais |

#### Risco ALTO (dados de negocio sem isolamento)

| Tabela | Risco |
|--------|-------|
| **`leads`** | Corretor pode ver/editar/deletar leads de outros corretores |
| **`activities`** | Sem isolamento por owner; qualquer usuario pode alterar atividades de outros |
| **`deal_notes`** | Notas de negociacao acessiveis a todos |
| **`deal_files`** | Arquivos de deals acessiveis a todos |
| **`products`** | Menor risco, mas permite delecao por qualquer usuario |

#### Risco MEDIO (dados compartilhados mas sem protecao de escrita)

| Tabela | Risco |
|--------|-------|
| **`boards`** | Qualquer usuario pode deletar pipelines |
| **`board_stages`** | Qualquer usuario pode alterar estagios de pipelines |
| **`lifecycle_stages`** | Dados globais/seed sem protecao de escrita |
| **`tags`** | Qualquer usuario pode deletar tags |
| **`custom_field_definitions`** | Qualquer usuario pode alterar campos custom |
| **`deal_items`** | Sem isolamento |
| **`system_notifications`** | Qualquer usuario pode deletar notificacoes |
| **`rate_limits`** | Qualquer usuario pode manipular rate limiting |
| **`ai_suggestion_interactions`** | Sem isolamento por usuario |

---

## 2. Indices Ausentes

### 2.1 Indices Recomendados

| Tabela | Coluna(s) | Justificativa |
|--------|-----------|---------------|
| `deals` | `organization_id` | Filtro de org presente em todas as queries RBAC; full scan na subquery de profiles |
| `deals` | `owner_id` | Usado em TODAS as policies RLS; sem indice, cada check faz seq scan |
| `contacts` | `organization_id` | Mesmo motivo que deals |
| `contacts` | `owner_id` | Usado em TODAS as policies RLS |
| `activities` | `organization_id` | Filtro de tenant |
| `activities` | `owner_id` | Futuro RBAC |
| `leads` | `organization_id` | Filtro de tenant |
| `leads` | `owner_id` | Futuro RBAC |
| `profiles` | `organization_id, role` | Composto; usado em TODAS as subqueries de RLS (alta frequencia) |
| `audit_logs` | `organization_id` | Filtro de tenant |
| `audit_logs` | `created_at DESC` | Ordenacao cronologica |
| `ai_decisions` | `user_id, status` | Filtro de decisoes pendentes por usuario |
| `ai_conversations` | `user_id` | FK sem indice |
| `ai_audio_notes` | `user_id` | FK sem indice |
| `ai_audio_notes` | `deal_id` | FK sem indice |
| `deal_items` | `product_id` | FK sem indice |
| `organization_invites` | `token` | Lookup por token no fluxo de convite |
| `organization_invites` | `organization_id` | Filtro de tenant |
| `system_notifications` | `organization_id` | Filtro de tenant |
| `user_consents` | `user_id` | FK sem indice |

### 2.2 Impacto de Performance

As subqueries de RLS (`SELECT id FROM profiles WHERE organization_id = X AND role IN (...)`) sao executadas em **cada linha retornada**. Sem indice composto em `profiles(organization_id, role)`, isso e um **seq scan por row** -- degradacao severa em tabelas com mais de 1000 registros.

---

## 3. Problemas de Normalizacao

### 3.1 Campos de Status como TEXT sem Enum/FK

| Tabela | Coluna | Valores Observados | Recomendacao |
|--------|--------|-------------------|--------------|
| `contacts.status` | TEXT | 'ACTIVE' (default) | Criar CHECK ou enum |
| `contacts.stage` | TEXT | 'LEAD' (default) | Deveria referenciar lifecycle_stages(id) via FK |
| `deals.status` | TEXT | - | Ambiguo com is_won/is_lost; campo parece nao-utilizado |
| `deals.priority` | TEXT | 'medium' (default) | Criar CHECK |
| `leads.status` | TEXT | 'NEW' (default) | Criar CHECK |
| `ai_decisions.status` | TEXT | 'pending' (default) | Criar CHECK |
| `ai_decisions.priority` | TEXT | 'medium' (default) | Criar CHECK |

### 3.2 Duplicacao de Dados

- **`profiles.avatar` vs `profiles.avatar_url`:** Duas colunas para a mesma finalidade. Consolidar em uma.
- **`profiles.name` vs `profiles.first_name` + `profiles.last_name`:** Redundancia. O trigger `handle_new_user` so popula `name`.
- **`deals.status` vs `deals.is_won`/`deals.is_lost`:** O campo `status` parece legado/nao-utilizado. As flags booleanas sao o mecanismo real.

### 3.3 Colunas Orphans

- **`contacts.stage`** (TEXT) nao tem FK para `lifecycle_stages.id`, mesmo sendo claramente o mesmo conceito.
- **`board_stages.linked_lifecycle_stage`** (TEXT) tambem nao tem FK para `lifecycle_stages.id`.
- **`boards.linked_lifecycle_stage`** (TEXT) idem.

---

## 4. Constraints Ausentes

| Tabela | Constraint Ausente | Risco |
|--------|-------------------|-------|
| `deals.probability` | Sem CHECK (0-100) | Valores invalidos possiveis |
| `deals.value` | Sem CHECK (>= 0) | Valores negativos possiveis |
| `products.price` | Sem CHECK (>= 0) | Valores negativos possiveis |
| `deal_items.quantity` | Sem CHECK (> 0) | Zero ou negativo possivel |
| `deal_items.price` | Sem CHECK (>= 0) | Valores negativos possiveis |
| `contacts.email` | Sem CHECK de formato | Qualquer texto aceito |
| `boards.type` | Sem CHECK | Apenas 'SALES' como default, mas sem restricao |
| `activities.type` | Sem CHECK | Qualquer texto aceito |
| `ai_decisions.confidence_score` | NUMERIC(3,2) mas sem CHECK (0.00-1.00) | Valores fora de faixa |

---

## 5. Vulnerabilidades de Seguranca

### 5.1 CRITICO: RLS Permissivas

**Descricao:** 21 tabelas usam `FOR ALL TO authenticated USING (true)`, o que significa que **qualquer usuario autenticado pode ler, alterar e deletar qualquer registro** nessas tabelas.

**Vetores de Ataque:**
1. **Corretor mal-intencionado** pode deletar leads de colegas
2. **Qualquer usuario** pode ler/deletar audit_logs, eliminando evidencias
3. **Qualquer usuario** pode ler conversas de IA de outros usuarios (ai_conversations)
4. **Qualquer usuario** pode alterar consentimentos LGPD de outros (user_consents)
5. **Qualquer usuario** pode manipular rate_limits, bypassando protecao de brute force
6. **Qualquer usuario** pode deletar security_alerts, ocultando incidentes

**Recomendacao:** Implementar politicas RBAC para TODAS as tabelas com dados sensiveis, seguindo o padrao ja aplicado em `deals` e `contacts`.

### 5.2 ALTO: Funcoes SECURITY DEFINER sem Validacao

| Funcao | Problema |
|--------|----------|
| `mark_deal_won(deal_id)` | Nao verifica se usuario tem permissao no deal |
| `mark_deal_lost(deal_id, reason)` | Idem |
| `reopen_deal(deal_id)` | Idem |
| `get_dashboard_stats()` (versao original sem org_id) | Retorna dados de todos os tenants |

> A versao atualizada de `get_dashboard_stats` na migration `20260220100000` ja recebe `p_organization_id`, mas as funcoes `mark_deal_*` e `reopen_deal` continuam sem validacao.

### 5.3 ALTO: Chaves de API em Claro

- **`user_settings.ai_api_key`** (legado), **`ai_google_key`**, **`ai_openai_key`**, **`ai_anthropic_key`**: armazenadas como TEXT plano.
- **`organization_settings.ai_google_key`**, **`ai_openai_key`**, **`ai_anthropic_key`**: idem.
- **`integration_inbound_sources.secret`** e **`integration_outbound_endpoints.secret`**: idem.

**Recomendacao:** Usar `pgsodium` ou `vault` do Supabase para criptografia em repouso. No minimo, garantir que RLS impeca leitura por nao-admins (parcialmente feito para org_settings, mas nao para user_settings de outros usuarios -- embora user_settings tenha RLS por user_id).

### 5.4 MEDIO: Storage Policies Permissivas

- **deal-files:** Qualquer usuario autenticado pode fazer upload, ler e deletar arquivos de qualquer deal.
- **avatars:** Upload permitido para qualquer autenticado; leitura publica.

---

## 6. Preocupacoes de Performance

### 6.1 Subqueries de RLS em Cada Row

As politicas RBAC usam subqueries em `profiles`:
```sql
auth.uid() IN (
  SELECT id FROM public.profiles
  WHERE organization_id = deals.organization_id
    AND role IN ('admin', 'diretor')
)
```

**Problema:** Executada por row. Sem indice composto `profiles(organization_id, role)`, gera seq scans repetidos.

**Recomendacao:** Criar indice composto + considerar funcao helper com cache (`STABLE`):
```sql
CREATE INDEX idx_profiles_org_role ON profiles(organization_id, role);
```

### 6.2 Trigger `notify_deal_stage_changed`

- Executa em **CADA UPDATE** de deals (nao apenas mudanca de stage).
- A funcao tem verificacao interna (`IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN RETURN`), mas o trigger nao filtra por coluna.
- **Recomendacao:** Alterar trigger para `AFTER UPDATE OF stage_id ON deals`.

### 6.3 Trigger `check_deal_duplicate`

- Executa em **CADA INSERT OR UPDATE** de deals.
- Faz query com JOIN em board_stages.
- **Impacto:** Leve overhead em operacoes de drag-and-drop no kanban.

### 6.4 Tabelas sem Particao/Archiving

- **audit_logs** e **webhook_events_***: crescem indefinidamente sem estrategia de archiving ou particao por data.
- **rate_limits**: tem funcao `cleanup_rate_limits` mas sem cron automatico.

---

## 7. Avaliacao de Versionamento de Migrations

### 7.1 Historico

| # | Timestamp | Descricao | Transacional |
|---|-----------|-----------|--------------|
| 1 | 20251201000000 | Schema consolidado (1 arquivo gigante) | Nao (DDL misto) |
| 2 | 20260205000000 | Indices de performance | Nao (apenas CREATE INDEX) |
| 3 | 20260220000000 | RBAC 3 niveis | Sim (BEGIN/COMMIT) |
| 4 | 20260220100000 | Remove companies/roles | Sim (BEGIN/COMMIT) |
| 5 | 20260220100001 | Protecao owner_id | Sim (BEGIN/COMMIT) |
| 6 | 20260220200000 | RPC reassign | Sim (BEGIN/COMMIT) |

### 7.2 Observacoes

**Positivo:**
- Migrations recentes (3-6) usam transacoes (BEGIN/COMMIT)
- Uso de `IF NOT EXISTS` / `IF EXISTS` para idempotencia
- Convencao de timestamp consistente

**Problemas:**
- **Migration 1 e muito grande** (~2250 linhas): consolida todo o schema historico em um unico arquivo. Dificulta rollback parcial.
- **Sem arquivos de rollback (down migrations):** Nenhuma migration tem script de reversao.
- **Timestamp colisao potencial:** Migrations 3, 4 e 5 compartilham data base (20260220) diferenciadas apenas pelo sufixo (000000, 100000, 100001). Funciona, mas e fragil.
- **Sem migration de seed separada:** Dados seed (lifecycle_stages, quick_scripts) estao misturados com DDL no schema init.

---

## 8. Recomendacoes Priorizadas

### P0 - CRITICO (Fazer Imediatamente)

1. **Implementar RLS RBAC para tabelas de seguranca:**
   - `audit_logs` -> admin read-only (nunca delete via app)
   - `security_alerts` -> admin management
   - `user_consents` -> proprio usuario read + admin read
   - `rate_limits` -> service role only (remover acesso authenticated)

2. **Implementar RLS por usuario para tabelas de IA:**
   - `ai_conversations` -> user_id = auth.uid()
   - `ai_decisions` -> user_id = auth.uid() + admin/diretor view
   - `ai_audio_notes` -> user_id = auth.uid() + admin/diretor view

3. **Implementar RLS owner-based para leads:**
   - Mesmo padrao de deals/contacts (owner_id + admin/diretor)

### P1 - ALTO (Proximas 2 Sprints)

4. **Criar indice composto** `profiles(organization_id, role)` -- impacto direto em performance de todas as queries com RBAC.

5. **Adicionar indices de `owner_id`** em deals, contacts, activities, leads.

6. **Adicionar indices de `organization_id`** em todas as tabelas que tem essa coluna e nao possuem indice.

7. **Implementar RLS para boards/board_stages/activities:**
   - Boards: admin/diretor write; all members read
   - Activities: owner-based + admin/diretor view

8. **Proteger funcoes SECURITY DEFINER:**
   - `mark_deal_won/lost`, `reopen_deal`: validar ownership ou role

### P2 - MEDIO (Backlog)

9. Adicionar CHECK constraints para campos de status, probability, value, price.
10. Consolidar colunas duplicadas em profiles (avatar/avatar_url, name/first_name+last_name).
11. Criar FK de `contacts.stage` para `lifecycle_stages.id`.
12. Implementar estrategia de archiving para audit_logs e webhook_events_*.
13. Separar seed data em migration dedicada.
14. Otimizar trigger `notify_deal_stage_changed` para filtrar por coluna `stage_id`.
15. Avaliar criptografia de API keys em repouso.
16. Adicionar down migrations para rollback.

---

## 9. Matriz de Risco Consolidada

| # | Achado | Severidade | Probabilidade | Impacto | Prioridade |
|---|--------|-----------|---------------|---------|------------|
| 1 | RLS permissiva em audit_logs | CRITICO | Alta | Destruicao de trilha de auditoria | P0 |
| 2 | RLS permissiva em security_alerts | CRITICO | Alta | Ocultacao de incidentes | P0 |
| 3 | RLS permissiva em user_consents | CRITICO | Media | Violacao LGPD | P0 |
| 4 | RLS permissiva em ai_conversations/decisions/audio | ALTO | Media | Vazamento de dados | P0 |
| 5 | RLS permissiva em leads | ALTO | Alta | Manipulacao de leads entre corretores | P0 |
| 6 | Funcoes SECURITY DEFINER sem auth check | ALTO | Media | Manipulacao de deals sem permissao | P1 |
| 7 | Falta de indice profiles(org, role) | ALTO | Alta | Degradacao de performance em todas queries RBAC | P1 |
| 8 | Falta de indices owner_id/organization_id | ALTO | Alta | Full scans em queries filtradas | P1 |
| 9 | RLS permissiva em boards/board_stages | MEDIO | Baixa | Delecao acidental de pipelines | P1 |
| 10 | API keys em texto plano | MEDIO | Baixa | Exposicao em caso de dump | P2 |
| 11 | Sem archiving para audit_logs | MEDIO | Media | Crescimento ilimitado de tabela | P2 |
| 12 | Colunas duplicadas em profiles | BAIXO | - | Confusao no desenvolvimento | P2 |
| 13 | Campos TEXT sem CHECK | BAIXO | Baixa | Dados inconsistentes | P2 |

---

*Documento gerado por @data-engineer (Dara) - Brownfield Discovery Phase 2*
