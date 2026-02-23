# Database Specialist Review

**Revisor:** @data-engineer (Dara)
**Data:** 2026-02-23
**Fase:** Brownfield Discovery - Phase 5
**Documento Revisado:** `docs/prd/technical-debt-DRAFT.md` (Secao 2 - Debitos de Database)
**Fontes:** `supabase/docs/DB-AUDIT.md`, `supabase/docs/SCHEMA.md`, migrations em `supabase/migrations/`

---

## 1. Debitos Validados

Todos os debitos listados no DRAFT foram verificados contra os arquivos de migration reais. Abaixo, a validacao com ajustes de severidade e estimativas refinadas de horas.

| ID | Debito | Severidade Original | Severidade Ajustada | Horas Est. | Prioridade | Notas |
|---|---|---|---|---|---|---|
| DB-001 | RLS permissiva em `audit_logs` | CRITICO | **CRITICO** | 4h | P0 | Confirmado. `FOR ALL USING (true)` no schema_init. Qualquer usuario pode DELETAR logs. Impacto direto em compliance LGPD. |
| DB-002 | RLS permissiva em `security_alerts` | CRITICO | **CRITICO** | 4h | P0 | Confirmado. Mesmo padrao. Ocultacao de incidentes e vetor real. |
| DB-003 | RLS permissiva em `user_consents` | CRITICO | **CRITICO** | 4h | P0 | Confirmado. Violacao LGPD direta -- consentimentos de terceiros podem ser alterados/revogados. |
| DB-004 | RLS permissiva em `ai_conversations` | CRITICO | **CRITICO** | 3h | P0 | Confirmado. Conversas de IA contem contexto de negocios sensiveis. |
| DB-005 | RLS permissiva em `ai_decisions`/`ai_audio_notes` | CRITICO | **CRITICO** | 5h | P0 | Confirmado. Sao 2 tabelas distintas -- estimo 2.5h cada pois ambas precisam de politica owner-based + admin/diretor view. |
| DB-006 | RLS permissiva em `leads` | CRITICO | **CRITICO** | 4h | P0 | Confirmado. Em CRM imobiliario, leads sao ativos de alto valor. Corretor mal-intencionado pode roubar leads de colegas. |
| DB-007 | Funcoes SECURITY DEFINER sem validacao | ALTO | **CRITICO** | 8h | P0 | **Severidade elevada.** Verifiquei no schema_init: `mark_deal_won`, `mark_deal_lost` e `reopen_deal` sao SECURITY DEFINER e fazem UPDATE direto sem nenhum check de ownership ou org. Como sao DEFINER, bypassam RLS completamente. Qualquer usuario autenticado pode marcar QUALQUER deal como ganho/perdido. Isso e um vetor de ataque concreto. |
| DB-008 | Falta indice composto `profiles(org_id, role)` | ALTO | **ALTO** | 1h | P0 (pre-requisito) | Confirmado. Esse indice e PRE-REQUISITO para qualquer nova politica RLS. Sem ele, as subqueries `SELECT id FROM profiles WHERE organization_id = X AND role IN (...)` fazem seq scan por row. Deve ser a PRIMEIRA coisa implementada. |
| DB-009 | Falta indices `owner_id` e `organization_id` | ALTO | **ALTO** | 3h | P1 | Confirmado. Verifiquei migration `20260205000000`: nao ha indices para `owner_id` em nenhuma tabela, nem para `organization_id`. Os indices existentes cobrem `board_id`, `stage_id`, `contact_id`, `deal_id` -- colunas de JOIN, nao de filtro RLS. |
| DB-010 | RLS permissiva em boards/board_stages/activities + 21 tabelas total | ALTO | **ALTO** | 20h | P1 | Confirmado. As 21 tabelas permissivas incluem: boards, board_stages, lifecycle_stages, products, deal_items, activities, tags, custom_field_definitions, leads (ja contado em DB-006), ai_conversations/decisions/audio_notes (ja contados), ai_suggestion_interactions, system_notifications, rate_limits, user_consents (ja contado), audit_logs/security_alerts (ja contados), deal_notes, deal_files. Descontando os ja tratados em P0, restam ~12 tabelas para P1. |
| DB-011 | API keys em texto plano no banco | MEDIO | **ALTO** | 16h | P1 | **Severidade elevada.** Verificando o schema: `user_settings` tem 4 campos de API key (ai_api_key, ai_google_key, ai_openai_key, ai_anthropic_key), `organization_settings` tem 3, e `integration_*_sources/endpoints` tem campo `secret`. Sao chaves de terceiros (OpenAI, Google, Anthropic) que dao acesso direto as contas dos clientes. Um dump de banco expoe TODAS as chaves. RLS de user_settings isola por usuario, mas admin tem acesso via service role. |
| DB-012 | Campos TEXT sem CHECK constraints | MEDIO | **MEDIO** | 6h | P2 | Confirmado. `deals.probability` e INTEGER sem CHECK (0-100), `deals.value` NUMERIC sem CHECK (>=0), `products.price` NUMERIC sem CHECK, `deal_items.quantity/price` sem CHECK, `contacts.email` sem validacao. `ai_decisions.confidence_score` e NUMERIC(3,2) mas aceita valores fora de 0-1. |
| DB-013 | Sem archiving para audit_logs/webhook_events | MEDIO | **MEDIO** | 12h | P2 | Confirmado. `cleanup_rate_limits` existe mas sem cron. `audit_logs` e `webhook_events_*` nao tem nenhuma estrategia. |
| DB-014 | Colunas duplicadas em profiles | MEDIO | **MEDIO** | 6h | P2 | Confirmado. `avatar` vs `avatar_url`, `name` vs `first_name`+`last_name`. O trigger `handle_new_user` popula apenas `name` e `avatar`. |
| DB-015 | `contacts.stage` sem FK para `lifecycle_stages` | MEDIO | **MEDIO** | 4h | P2 | Confirmado. `contacts.stage` e TEXT com default 'LEAD', `board_stages.linked_lifecycle_stage` e TEXT, `boards.linked_lifecycle_stage` e TEXT. Nenhum referencia `lifecycle_stages.id`. |
| DB-016 | Migration monolitica (~2250 linhas) | MEDIO | **BAIXO** | 0h | P3 | **Severidade reduzida.** A migration init ja foi aplicada. Refatora-la nao agrega valor -- o importante e garantir que novas migrations sigam boas praticas (o que ja esta acontecendo nas migrations 3-6). Zero horas pois recomendo NAO mexer. |
| DB-017 | Trigger `notify_deal_stage_changed` nao filtrado | MEDIO | **MEDIO** | 1h | P2 | Confirmado. O trigger dispara em EVERY UPDATE, mas a funcao verifica `IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN RETURN`. A correcao e trivial: `AFTER UPDATE OF stage_id ON deals`. |
| DB-018 | Storage policies permissivas | MEDIO | **ALTO** | 6h | P1 | **Severidade elevada.** `deal-files` permite qualquer autenticado acessar/deletar arquivos de qualquer deal. Em CRM imobiliario, arquivos de deals podem conter contratos, documentos pessoais, procuracoes. Isso e um risco de seguranca real. |
| DB-019 | `deals.status` ambiguo com `is_won`/`is_lost` | MEDIO | **MEDIO** | 4h | P2 | **Parcialmente confirmado.** Verifiquei o codigo: `deals.status` E usado no codigo da IA (`lib/ai/crmAgent.ts`, `lib/ai/tasksClient.ts`, `lib/ai/actionsClient.ts`). NAO pode ser removido sem migrar esses consumidores. |
| DB-020 | Seed data misturado com DDL | MEDIO | **BAIXO** | 0h | P3 | **Severidade reduzida.** Similar a DB-016 -- o seed ja foi aplicado. Para novos seeds, criar migrations separadas. Zero horas pois recomendo NAO refatorar o passado. |

---

## 2. Debitos Adicionados

Achados adicionais identificados durante a revisao das migrations e do schema que nao constam no DRAFT.

### DB-021 | CRITICO | `get_dashboard_stats()` versao original sem filtro de org

**Descricao:** A versao original de `get_dashboard_stats()` (schema_init linha 784) NAO recebe `p_organization_id` e retorna dados de TODOS os tenants. Embora a migration `20260220100000` crie uma versao nova com parametro, a funcao antiga (sem parametro) continua existindo no banco como overload. Qualquer chamada sem argumento retorna dados globais.

**Impacto:** Vazamento de dados cross-tenant.
**Horas:** 2h (DROP da funcao antiga + verificar que nenhum codigo a chama sem parametro)
**Prioridade:** P0

### DB-022 | ALTO | `get_contact_stage_counts()` sem filtro de organizacao

**Descricao:** Verificado no schema_init: `get_contact_stage_counts()` e SECURITY DEFINER e retorna contagens de TODOS os contatos sem filtro de `organization_id`.

**Impacto:** Vazamento de metricas cross-tenant.
**Horas:** 2h
**Prioridade:** P1

### DB-023 | ALTO | `log_audit_event()` SECURITY DEFINER sem validacao de org

**Descricao:** A funcao `log_audit_event` e SECURITY DEFINER e e chamada por `authenticated`. Um usuario poderia potencialmente injetar logs de auditoria falsos em nome de outra organizacao, poluindo a trilha de auditoria.

**Impacto:** Poluicao/falsificacao de trilha de auditoria.
**Horas:** 3h
**Prioridade:** P1

### DB-024 | MEDIO | `handle_new_user()` permite injecao de role via metadata

**Descricao:** O trigger `handle_new_user` usa `COALESCE(new.raw_user_meta_data->>'role', 'corretor')`. Se o fluxo de signup permitir que o usuario envie metadata customizada, um usuario poderia se auto-promover a 'admin' ou 'diretor'.

**Impacto:** Escalacao de privilegios.
**Horas:** 2h (forcar `'corretor'` sempre, exceto quando criado via invite com role explicito)
**Prioridade:** P1

### DB-025 | MEDIO | Falta de indice em `deal_notes(deal_id)` e `deal_files(deal_id)` compostos com org

**Descricao:** `deal_notes` e `deal_files` tem indices para `deal_id` mas nao para filtragem por organizacao quando RLS for implementada. Sera necessario ao implementar RLS nessas tabelas.

**Impacto:** Performance ao implementar RLS.
**Horas:** 1h
**Prioridade:** P2 (implementar junto com RLS de deal_notes/deal_files)

### DB-026 | BAIXO | `check_deal_duplicate` SECURITY DEFINER desnecessario

**Descricao:** O trigger de verificacao de duplicidade de deals e SECURITY DEFINER quando poderia ser INVOKER, ja que opera na mesma tabela do INSERT/UPDATE.

**Impacto:** Superficie de ataque desnecessariamente ampliada.
**Horas:** 1h
**Prioridade:** P3

### DB-027 | MEDIO | `organizations` RLS permite qualquer autenticado criar organizacao

**Descricao:** A politica de `organizations` e `FOR ALL USING (deleted_at IS NULL) WITH CHECK (true)`. O `WITH CHECK (true)` permite que qualquer autenticado faca INSERT de nova organizacao. Isso pode nao ser intencional em producao.

**Impacto:** Criacao nao-autorizada de organizacoes.
**Horas:** 2h
**Prioridade:** P2

---

## 3. Respostas ao Architect

### Pergunta 1: RLS P0 -- Ordem de implementacao e estrategia de migration

**Resposta:** Recomendo a seguinte ordem e estrategia:

**Passo 0 (pre-requisito):** Uma unica migration para criar o indice `profiles(organization_id, role)` e os indices de `owner_id`/`organization_id` nas tabelas que receberao novas politicas. Isso DEVE ser feito antes de qualquer nova politica RLS.

**Passo 1 (migration unica):** Tabelas de seguranca/compliance -- `audit_logs`, `security_alerts`, `user_consents`, `rate_limits`. Essas sao as mais criticas e mais simples (admin-only ou user-only, sem owner_id).

**Passo 2 (migration unica):** Tabelas de IA -- `ai_conversations`, `ai_decisions`, `ai_audio_notes`, `ai_suggestion_interactions`. Mesmo padrao: user_id-based + admin/diretor view.

**Passo 3 (migration unica):** `leads` -- owner-based, mesmo padrao de deals/contacts.

**Passo 4 (migration unica):** Tabelas de negocio restantes -- `activities`, `deal_notes`, `deal_files`, `boards`, `board_stages`, `products`, `deal_items`, `tags`, `custom_field_definitions`, `system_notifications`, `lifecycle_stages`.

**Justificativa:** Agrupar por dominio reduz risco de regressao e facilita teste. Cada migration deve ser transacional (BEGIN/COMMIT). NAO recomendo uma migration unica para tudo -- se falhar, nao ha como reverter parcialmente.

### Pergunta 2: Indice `profiles(org, role)` como maior gargalo

**Confirmado.** Esse indice e critico. Cada politica RLS de deals/contacts executa a subquery `SELECT id FROM profiles WHERE organization_id = X AND role IN (...)` por row. Sem indice composto, isso e um seq scan repetido. Com 100 usuarios e 10.000 deals, sao potencialmente 10.000 seq scans de 100 rows cada.

Nao temos metricas de query plan disponiveis (precisaria de `EXPLAIN ANALYZE` em producao), mas a analise teorica e suficiente para justificar. Adicionalmente, recomendo criar uma funcao helper `STABLE`:

```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_director(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND organization_id = p_org_id
      AND role IN ('admin', 'diretor')
  );
$$;
```

Isso permite ao PostgreSQL cachear o resultado durante a mesma statement, evitando a subquery repetida por row.

### Pergunta 3: Criptografia de API keys

**Recomendacao:** `vault` do Supabase.

Justificativa:
- **pgsodium:** Excelente para criptografia de colunas, mas requer gerenciamento manual de chaves e nao e nativamente integrado ao dashboard Supabase.
- **vault do Supabase:** Integrado nativamente, usa `pgsodium` por baixo mas com interface simplificada. Permite armazenar secrets que sao decriptados apenas em runtime dentro de funcoes SECURITY DEFINER. Latencia adicionada e minima (~1-2ms por lookup).
- **Criptografia em nivel de aplicacao:** Mais controle, mas requer gerenciamento de chaves na aplicacao, complica queries e aumenta complexidade. Nao recomendado dado que Supabase ja oferece vault.

**Impacto em latencia:** Negligivel para o caso de uso (API keys sao lidas uma vez por sessao de chat, nao por request).

**Plano:** Migrar para `vault.secrets` em 3 etapas: (1) criar secrets no vault, (2) criar funcao RPC que le o secret, (3) migrar codigo para usar RPC em vez de SELECT direto.

### Pergunta 4: Archiving para `audit_logs` e `webhook_events_*`

**Recomendacao:** Particao por data (range partitioning) + cron de cleanup.

**Estrategia detalhada:**
1. **Curto prazo (P2):** Implementar `pg_cron` para deletar registros com mais de 90 dias de `rate_limits` (ja tem funcao `cleanup_rate_limits`), e mais de 365 dias de `webhook_events_*`.
2. **Medio prazo:** Converter `audit_logs` para tabela particionada por mes (`PARTITION BY RANGE (created_at)`). Isso permite DROP de particoes antigas (instantaneo) em vez de DELETE (lento com muitos registros).
3. **audit_logs LGPD:** Manter por no minimo 5 anos para compliance. Particoes antigas podem ser movidas para storage frio (S3 via pg_dump seletivo).

**Volume esperado:** Em CRM imobiliario com ~50 usuarios ativos, estimo ~500-1000 audit_logs/dia e ~100-200 webhook_events/dia. Em 1 ano, ~365K audit_logs e ~73K webhook_events. Nao e critico agora, mas se tornara problema em 2-3 anos sem archiving.

### Pergunta 5: Migration monolitica -- vale refatorar?

**NAO.** A migration init ja foi aplicada. Refatora-la significaria recriar o historico de migrations do zero, o que e arriscado e sem valor pratico. O importante e:
1. Novas migrations continuem seguindo o padrao das migrations 3-6 (transacionais, focadas, com comentarios).
2. Adicionar down migrations APENAS para novas migrations (nao retroativamente).
3. Documentar que a migration 1 e o "big bang" historico e nao deve ser alterada.

### Pergunta 6: `contacts.stage` sem FK -- intencional ou descuido?

**Descuido.** Evidencia: `lifecycle_stages.id` e TEXT (ex: 'LEAD', 'MQL', 'PROSPECT', 'CUSTOMER', 'OTHER') e `contacts.stage` tem default 'LEAD'. O conceito e claramente o mesmo. A ausencia de FK permite valores invalidos em `contacts.stage`.

**Risco de adicionar FK agora:** BAIXO, desde que:
1. Primeiro, rode um SELECT para verificar se ha valores em `contacts.stage` que nao existem em `lifecycle_stages.id`.
2. Se houver, normalize antes de adicionar a FK.
3. A FK deve ser `ON DELETE SET DEFAULT` ou `ON DELETE RESTRICT` (nao CASCADE).

Mesmo raciocinio para `board_stages.linked_lifecycle_stage` e `boards.linked_lifecycle_stage`. Esses podem conter NULLs (que sao validos com FK), entao o risco e menor.

### Pergunta 7: `deals.status` pode ser removido?

**NAO -- pelo menos nao agora.** Verifiquei o codigo e encontrei 5 referencias ativas:
- `lib/ai/crmAgent.ts:35` -- usa `deal.status` para contexto do agente IA
- `lib/ai/tasksClient.ts:76,101` -- inclui `status` em objetos de deal
- `lib/ai/actionsClient.ts:50,117` -- inclui `status` em acoes

O campo parece servir como um resumo textual do estado do deal (ex: "Em negociacao", "Proposta enviada") que complementa os flags booleanos `is_won`/`is_lost`. **Recomendo:**
1. Documentar claramente o proposito de `status` vs `is_won`/`is_lost`.
2. Se realmente for legado, migrar os consumidores de IA para derivar o status de `is_won`/`is_lost` + `stage_id`.
3. Somente apos migrar os consumidores, deprecar a coluna.

### Pergunta 8: Funcoes SECURITY DEFINER -- validacao interna ou SECURITY INVOKER?

**Recomendacao: Migrar para SECURITY INVOKER + RLS.**

Justificativa:
- `mark_deal_won/lost` e `reopen_deal` fazem UPDATE em `deals`. Se usarem SECURITY INVOKER, as politicas RLS de deals (que ja existem e sao boas) serao aplicadas automaticamente. Um corretor so conseguiria marcar seus proprios deals, e admin/diretor qualquer deal da org.
- Isso e mais simples, mais seguro e mais facil de manter do que adicionar validacao manual dentro de funcoes DEFINER.
- A funcao `reassign_contact_with_deals` (migration 6) ja usa SECURITY INVOKER -- esse e o padrao correto a seguir.

**Excecao:** Funcoes que PRECISAM bypassar RLS (como `handle_new_user`, `log_audit_event`, funcoes de API key) devem permanecer DEFINER, mas com validacao interna robusta.

---

## 4. Plano de Resolucao Recomendado

### Sprint 1 (Semana 1-2) -- SEGURANCA CRITICA

| Ordem | ID(s) | Acao | Horas | Dependencia |
|---|---|---|---|---|
| 1 | DB-008 | Criar indice `profiles(organization_id, role)` | 1h | Nenhuma |
| 2 | DB-009 | Criar indices `owner_id` e `organization_id` em deals, contacts, activities, leads, audit_logs, ai_conversations, ai_decisions, ai_audio_notes | 3h | Nenhuma |
| 3 | DB-001, DB-002, DB-003 | RLS restritiva para audit_logs (admin read-only), security_alerts (admin), user_consents (user own + admin read) | 6h | DB-008 |
| 4 | DB-004, DB-005 | RLS user-based para ai_conversations, ai_decisions, ai_audio_notes | 6h | DB-008 |
| 5 | DB-006 | RLS owner-based para leads (padrao deals/contacts) | 4h | DB-008, DB-009 |
| 6 | DB-007 | Migrar mark_deal_won/lost/reopen_deal para SECURITY INVOKER | 4h | Nenhuma |
| 7 | DB-021 | DROP da versao antiga de get_dashboard_stats() sem parametro | 2h | Nenhuma |

**Total Sprint 1: ~26h**

### Sprint 2 (Semana 3-4) -- SEGURANCA ALTA

| Ordem | ID(s) | Acao | Horas | Dependencia |
|---|---|---|---|---|
| 8 | DB-010 (parcial) | RLS para boards (admin/diretor write, all read), board_stages (idem) | 4h | DB-008 |
| 9 | DB-010 (parcial) | RLS para activities (owner-based + admin view) | 3h | DB-009 |
| 10 | DB-010 (parcial) | RLS para deal_notes, deal_files (via deal ownership) | 4h | DB-009 |
| 11 | DB-010 (parcial) | RLS para products, deal_items, tags, custom_field_definitions, system_notifications, lifecycle_stages | 8h | DB-008 |
| 12 | DB-018 | Storage policies restritivas para deal-files (via deal ownership) | 6h | Nenhuma |
| 13 | DB-011 | Migrar API keys para vault do Supabase | 16h | Nenhuma |
| 14 | DB-022 | Corrigir get_contact_stage_counts() com filtro de org | 2h | Nenhuma |
| 15 | DB-023 | Corrigir log_audit_event() com validacao de org | 3h | Nenhuma |
| 16 | DB-024 | Corrigir handle_new_user() para nao aceitar role de metadata | 2h | Nenhuma |

**Total Sprint 2: ~48h**

### Sprint 3+ (Backlog priorizado)

| ID(s) | Acao | Horas | Prioridade |
|---|---|---|---|
| DB-012 | CHECK constraints em campos numericos e status | 6h | P2 |
| DB-017 | Otimizar trigger notify_deal_stage_changed | 1h | P2 |
| DB-014 | Consolidar colunas duplicadas em profiles | 6h | P2 |
| DB-015 | Adicionar FK contacts.stage -> lifecycle_stages.id | 4h | P2 |
| DB-019 | Documentar/migrar deals.status | 4h | P2 |
| DB-013 | Implementar pg_cron + archiving | 12h | P2 |
| DB-027 | Restringir INSERT em organizations | 2h | P2 |
| DB-025 | Indices compostos com org para deal_notes/deal_files | 1h | P2 |
| DB-026 | Converter check_deal_duplicate para INVOKER | 1h | P3 |

**Total Backlog: ~37h**

---

## 5. Recomendacoes de Seguranca

### 5.1 Acoes IMEDIATAS (antes de qualquer deploy)

1. **Indice profiles(organization_id, role):** Sem este indice, qualquer nova politica RLS causa degradacao severa. Deve ser a primeira migration executada.

2. **RLS de audit_logs e security_alerts:** Essas tabelas sao a "camera de seguranca" do sistema. Se um atacante pode deletar logs e alertas, pode cobrir seus rastros. Politica recomendada:
   ```sql
   -- audit_logs: admin read-only, nunca delete via app
   CREATE POLICY "admins_can_view_audit_logs" ON audit_logs
     FOR SELECT TO authenticated
     USING (auth.uid() IN (
       SELECT id FROM profiles WHERE organization_id = audit_logs.organization_id AND role = 'admin'
     ));
   -- INSERT via funcao log_audit_event (SECURITY DEFINER) -- nao precisa de policy
   -- DELETE/UPDATE: nenhuma policy = bloqueado
   ```

3. **RLS de user_consents:** LGPD exige que apenas o proprio usuario e administradores autorizados acessem consentimentos:
   ```sql
   CREATE POLICY "user_can_view_own_consents" ON user_consents
     FOR SELECT TO authenticated
     USING (user_id = auth.uid());
   -- INSERT: apenas o proprio usuario
   CREATE POLICY "user_can_insert_own_consent" ON user_consents
     FOR INSERT TO authenticated
     WITH CHECK (user_id = auth.uid());
   -- UPDATE/DELETE: nenhuma policy = bloqueado (consentimentos sao imutaveis, revogacao e um novo registro com revoked_at)
   ```

4. **rate_limits:** Remover acesso de `authenticated` completamente. Essa tabela deve ser gerenciada apenas via service role:
   ```sql
   -- Revogar todas as policies existentes
   -- Nao criar novas -- apenas service_role deve acessar
   ```

### 5.2 Funcoes SECURITY DEFINER -- Revisao Completa

| Funcao | Risco | Acao |
|---|---|---|
| `mark_deal_won/lost`, `reopen_deal` | CRITICO -- bypassa RLS, sem auth check | Migrar para SECURITY INVOKER |
| `get_dashboard_stats()` (sem param) | ALTO -- retorna dados globais | DROP |
| `get_contact_stage_counts()` | ALTO -- retorna dados globais | Adicionar filtro de org |
| `log_audit_event()` | MEDIO -- pode injetar logs falsos | Adicionar validacao de org via auth.uid() |
| `handle_new_user()` | MEDIO -- aceita role de metadata | Forcar 'corretor' no INSERT |
| `check_deal_duplicate()` | BAIXO -- DEFINER desnecessario | Migrar para INVOKER |
| `is_instance_initialized()`, `get_singleton_organization_id()` | OK | Manter DEFINER (precisam de acesso irrestrito) |
| Funcoes de API key | OK | Manter DEFINER (tem validacao interna de admin + org) |
| `notify_deal_stage_changed()` | OK | Manter DEFINER (trigger precisa de acesso a webhooks) |
| `cleanup_rate_limits()` | OK | Manter DEFINER (operacao de manutencao) |

### 5.3 Padrao RLS Recomendado para Novas Politicas

Para manter consistencia, todas as novas politicas devem seguir este modelo hierarquico:

```
admin: CRUD completo na org
diretor: READ completo na org + CRUD nos proprios
corretor: CRUD apenas nos proprios
```

Usar a funcao helper `is_admin_or_director(p_org_id)` para evitar subqueries repetidas e melhorar performance.

### 5.4 Monitoramento Pos-Implementacao

Apos implementar as novas politicas RLS:
1. Testar com usuario de cada role (admin, diretor, corretor) em cada tabela.
2. Verificar performance com `EXPLAIN ANALYZE` nas queries mais frequentes.
3. Monitorar logs de "permission denied" no Supabase para detectar quebras.
4. Implementar testes automatizados de RLS (usando `supabase test db`).

---

## 6. Resumo de Estimativas

| Categoria | Horas |
|---|---|
| Sprint 1 (Seguranca Critica - P0) | ~26h |
| Sprint 2 (Seguranca Alta - P1) | ~48h |
| Backlog (P2/P3) | ~37h |
| **Total Database** | **~111h** |

Comparado com o DRAFT (que estimava 112-216h para debitos de DB), minhas estimativas sao mais precisas e no limite inferior. A diferenca e que (1) nao estou contando DB-016 e DB-020 (zero horas -- nao vale refatorar), (2) estou adicionando 6 novos debitos nao identificados, e (3) refinei as estimativas com base na analise real das migrations.

---

*Documento gerado por @data-engineer (Dara) - Brownfield Discovery Phase 5*
*Synkra AIOS v2.2.0*
