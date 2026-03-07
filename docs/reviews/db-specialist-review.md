# Database Specialist Review

**Reviewer:** @data-engineer (Dara)
**Data:** 2026-03-06
**DRAFT Version:** v2
**Documento revisado:** `docs/prd/technical-debt-DRAFT.md` (Secao 2: Database, Secao 6: Perguntas)
**Fontes de verificacao:** `supabase/migrations/` (52 arquivos), `supabase/docs/SCHEMA.md`, `supabase/docs/DB-AUDIT.md`

---

## Metodologia

Cada debito foi verificado contra os arquivos de migration reais em `supabase/migrations/`, cruzando com o schema documentado em `supabase/docs/SCHEMA.md` e a auditoria original em `supabase/docs/DB-AUDIT.md`. As horas estimadas incluem desenvolvimento, testes em staging, aplicacao em producao e documentacao de rollback.

---

## Debitos Validados

| ID | Debito | Severidade Original | Severidade Ajustada | Horas | Complexidade | Notas |
|----|--------|---------------------|---------------------|-------|--------------|-------|
| DB-001 | `system_notifications` RLS permissiva | HIGH | **REMOVIDO** | 0 | -- | Ja corrigido em `20260223100000_rls_remaining_tables.sql` (linhas 482-505). Politicas org-scoped para SELECT/UPDATE/DELETE ja aplicadas. |
| DB-002 | `activities.client_company_id` orfao | HIGH | **REMOVIDO** | 0 | -- | Ja removido em `20260220100000_remove_companies_and_roles.sql` (linha 109): `ALTER TABLE activities DROP COLUMN IF EXISTS client_company_id`. FK, index e coluna foram dropados. |
| DB-003 | `deals.contact_id` nullable | HIGH | HIGH | 6h | Media | Validado. A coluna e nullable e o trigger `check_deal_duplicate` faz `IF NEW.contact_id IS NULL THEN RETURN NEW`. Requer analise de negocio antes de alterar. |
| DB-004 | RLS subqueries em profiles | HIGH | HIGH | 20h | Complexa | Validado. Padrao `(SELECT organization_id FROM profiles WHERE id = auth.uid())` usado em dezenas de policies. Funcao `get_user_organization_id()` mitiga parcialmente (usada em profiles/organizations), mas demais tabelas ainda usam subquery direta. |
| DB-005 | `lifecycle_stages` FK verificar | HIGH | **REMOVIDO** | 0 | -- | Ja aplicada em `20260224000006_db015_fk_contacts_stage.sql`. A migration inclui verificacao de existencia e limpeza de orfaos antes de criar o constraint `fk_contacts_stage_lifecycle_stages`. |
| DB-006 | `merge_contacts()` SECURITY DEFINER sem org check | HIGH | **CRITICAL** | 3h | Simples | Validado e ELEVADO. A funcao obtem `v_org_id` do loser mas NAO verifica se caller pertence a essa org nem se winner pertence a mesma org. Sendo SECURITY DEFINER, bypassa RLS completamente. Qualquer usuario com UUIDs validos pode mesclar contatos cross-tenant. |
| DB-007 | `rate_limits` RLS permissiva | MEDIUM | MEDIUM | 2h | Simples | Validado. A tabela `rate_limits` NUNCA foi incluida no security sprint (`20260223*`). Permanece com `USING(true)` do schema_init (linha 1654). A tabela nao tem `organization_id`, e uma tabela de infraestrutura. |
| DB-008 | FK orfao `activities.client_company_id` | MEDIUM | **REMOVIDO** | 0 | -- | Duplicata de DB-002. Ja removido pela mesma migration. |
| DB-009 | `get_dashboard_stats()` 6 counts | MEDIUM | MEDIUM | 6h | Media | Validado. Funcao executa 6 subqueries separadas dentro de `jsonb_build_object()`. O Postgres pode otimizar internamente, mas 4 das 6 queries escaneiam `deals` com filtros diferentes, o que significa multiplos index scans na mesma tabela. |
| DB-010 | `system_notifications` sem index org | MEDIUM | **REMOVIDO** | 0 | -- | Ja criado em `20260223100000_rls_remaining_tables.sql` (linha 33): `CREATE INDEX IF NOT EXISTS idx_system_notifications_organization_id`. |
| DB-011 | `deals.status` legado vs `is_won`/`is_lost` | MEDIUM | LOW | 2h | Simples | Validado. Busca no codebase por `deals.status` retorna 0 resultados em arquivos `.ts`. A coluna nao e usada pela aplicacao. Rebaixado para LOW pois nao causa impacto funcional. |
| DB-012 | `updated_at` trigger ausente em tabelas principais | MEDIUM | MEDIUM | 2h | Simples | Validado. Confirmei 16+ ocorrencias de `updated_at: new Date().toISOString()` no codigo TypeScript. Triggers existem apenas em `deal_notes`, `quick_scripts`, `contact_phones`, `contact_preferences`. |
| DB-013 | Soft delete sem index `deleted_at` | MEDIUM | LOW | 1h | Simples | Parcialmente mitigado. O index `idx_deals_open` ja filtra `WHERE is_won = false AND is_lost = false` (que implicitamente cobre deals ativos). Indexes parciais dedicados para `deleted_at IS NULL` tem beneficio marginal. |
| DB-014 | `increment/decrement_contact_ltv()` sem org check | MEDIUM | HIGH | 1h | Simples | ELEVADO. Funcoes SECURITY DEFINER que atualizam `contacts.total_value` sem verificar se `p_contact_id` pertence a org do caller. Mesmo padrao de risco que DB-006. |
| DB-015 | `contacts.phone` legado vs `contact_phones` | MEDIUM | MEDIUM | 4h | Media | Validado. Codigo em `contacts.ts:837` faz sync manual: `.update({ phone: primaryNumber })`. Trigger de sync seria mais robusto. |
| DB-016 | Tabelas sem `updated_at` | MEDIUM | LOW | 2h | Simples | Validado. `notifications` tem `is_read` mutavel, `board_stages` pode ser reordenado. Impacto real e baixo, pois essas tabelas nao tem auditoria ativa. |
| DB-017 | Ausencia de rollback scripts | MEDIUM | MEDIUM | 6h | Media | Validado. Nenhuma das 52 migrations tem rollback. Para novas migrations a partir de agora, recomendo incluir bloco comentado de rollback. |
| DB-018 | Schema init monolitico (1900+ linhas) | MEDIUM | LOW | 0h | -- | Rebaixado. O schema init e historico e nao deve ser refatorado. Documentar (ja feito em SCHEMA.md) e suficiente. Esforco = 0 (nao agir). |
| DB-019 | `check_deal_duplicate()` sem indice otimizado | MEDIUM | MEDIUM | 1h | Simples | Validado. A query filtra `contact_id + stage_id + deleted_at IS NULL + is_won = FALSE + is_lost = FALSE`. O index `idx_deals_open` cobre `(board_id, stage_id) WHERE is_won = false AND is_lost = false`, mas NAO inclui `contact_id`. Index dedicado melhoraria a performance. |
| DB-020 | VARCHAR vs TEXT inconsistencia | LOW | LOW | 1h | Simples | Validado. Apenas `security_alerts` usa VARCHAR. Sem impacto funcional no PostgreSQL. |
| DB-021 | N+1 em useDealsQuery (1+1) | LOW | LOW | 2h | Simples | Validado. Pattern 1+1 (nao N+1 classico). Resolvivel com PostgREST embedded select. |

---

## Debitos Removidos / Rebaixados

### Removidos (ja corrigidos)

| ID | Debito | Justificativa |
|----|--------|---------------|
| **DB-001** | `system_notifications` RLS permissiva | **Ja corrigido** na migration `20260223100000_rls_remaining_tables.sql` (linhas 482-505). Politicas org-scoped para SELECT/UPDATE/DELETE foram aplicadas. O DRAFT original (DB-AUDIT.md) documentou corretamente o debito no schema_init, mas nao verificou que a correcao ja foi aplicada em migration posterior. |
| **DB-002** | `activities.client_company_id` orfao | **Ja removido** na migration `20260220100000_remove_companies_and_roles.sql` (linha 109). A FK, o index e a coluna foram todos dropados explicitamente. |
| **DB-005** | `lifecycle_stages` FK verificar | **Ja aplicada** na migration `20260224000006_db015_fk_contacts_stage.sql`. Constraint `fk_contacts_stage_lifecycle_stages` criada com tratamento de orfaos. |
| **DB-008** | FK orfao `client_company_id` | **Duplicata** de DB-002. Mesmo item visto de perspectivas diferentes (SEC-03 e INT-01 no DB-AUDIT). |
| **DB-010** | `system_notifications` sem index org | **Ja criado** na migration `20260223100000_rls_remaining_tables.sql` (linha 33): `idx_system_notifications_organization_id`. |

### Rebaixados

| ID | De | Para | Justificativa |
|----|-----|------|---------------|
| **DB-011** | MEDIUM | LOW | `deals.status` nao e usado em nenhum arquivo `.ts` da aplicacao. E dead column, nao um risco funcional. Pode ser dropada em qualquer momento sem impacto. |
| **DB-013** | MEDIUM | LOW | Index parcial `idx_deals_open` ja cobre o principal caso de uso. Indexes parciais adicionais para `deleted_at IS NULL` tem beneficio marginal no volume atual (<10K registros por org). |
| **DB-016** | MEDIUM | LOW | `notifications.is_read` e `board_stages` reorder sao operacoes simples sem necessidade real de auditoria via `updated_at`. |
| **DB-018** | MEDIUM | LOW (nao agir) | Schema init e artefato historico. SCHEMA.md ja documenta tudo. Refatorar o init nao traz valor e pode introduzir riscos. |

### Elevados

| ID | De | Para | Justificativa |
|----|-----|------|---------------|
| **DB-006** | HIGH | **CRITICAL** | `merge_contacts()` SECURITY DEFINER permite manipulacao cross-tenant. A funcao nao valida que auth.uid() pertence a organizacao dos contatos envolvidos. Sendo DEFINER, bypassa toda a RLS. Este e o UNICO debito que considero genuinamente CRITICAL no banco de dados. |
| **DB-014** | MEDIUM | HIGH | `increment/decrement_contact_ltv()` SECURITY DEFINER permite manipulacao de LTV cross-tenant. Mesmo padrao de risco que DB-006, embora o impacto seja menor (apenas campo numerico vs merge completo). |

---

## Debitos Adicionados

| ID | Debito | Severidade | Horas | Complexidade | Justificativa |
|----|--------|-----------|-------|--------------|---------------|
| **DB-022** | `get_dashboard_stats()` e SECURITY DEFINER sem necessidade | HIGH | 1h | Simples | A funcao `get_dashboard_stats(p_organization_id)` em `20260220100000` (linha 81) e `SECURITY DEFINER` desnecessariamente. Recebe `p_organization_id` como parametro sem validar que o caller pertence a essa org. Um usuario poderia chamar `get_dashboard_stats(uuid_de_outra_org)` e obter metricas de outra organizacao. Converter para SECURITY INVOKER + usar `get_user_organization_id()` internamente. |
| **DB-023** | `rate_limits` sem `organization_id` para isolamento | LOW | 2h | Simples | A tabela `rate_limits` usa `identifier` (IP/user) sem `organization_id`, o que significa que rate limits sao globais, nao por tenant. Se dois tenants usam o mesmo endpoint, seus limites se misturam. Impacto pratico baixo no cenario atual (single-tenant de fato), mas arquiteturalmente incorreto para multi-tenant. |
| **DB-024** | Politicas RLS de `system_notifications` nao incluem INSERT | MEDIUM | 0.5h | Simples | A migration `20260223100000` corrigiu SELECT/UPDATE/DELETE mas intencionalmente omitiu INSERT (comentario: "created server-side only"). Isso e aceitavel se INSERT e feito via service_role ou edge functions, mas deveria ter uma policy explicita que BLOQUEIE insert de authenticated users (deny by default com RLS) ou uma policy INSERT restritiva. Atualmente, RLS esta habilitada sem policy de INSERT, o que significa INSERT e NEGADO por padrao -- correto, mas nao explicito. Classifico como MEDIUM apenas para documentacao. |
| **DB-025** | `merge_contacts()` vulneravel a SQL injection via `p_field_updates` | HIGH | 2h | Media | A funcao usa `format('%I = %L', v_key, p_field_updates->>v_key)` com EXECUTE dinamico. Embora `%I` e `%L` sejam seguros contra injection classico, e o `v_allowed_fields` array limita as colunas, o padrao de `EXECUTE format(... || ...)` com concatenacao de set clauses e um anti-padrao. Recomendo reescrever para usar `jsonb_populate_record` ou UPDATE direto com campos especificos. |

---

## Respostas ao Architect

### Pergunta 1: Alem de `system_notifications` e `rate_limits`, ha outra tabela com RLS `USING(true)` nao identificada?

**Resposta:** Nao ha tabelas com RLS permissiva ALEM de `rate_limits`.

A migration `20260223100000_rls_remaining_tables.sql` corrigiu `system_notifications` (linhas 482-505), `lifecycle_stages` (510-549, SELECT USING(true) intencional para tabela de referencia global), e todas as demais tabelas do schema_init que ainda tinham USING(true).

`rate_limits` e a UNICA tabela que permanece com `USING(true)` sem correcao posterior. Isso ocorreu porque `rate_limits` nao foi incluida na migration de seguranca (nao aparece em nenhum dos arquivos `20260223*`).

`lifecycle_stages` tem `USING(true)` apenas para SELECT (intencional -- tabela de referencia global, nao tem dados sensiveis). INSERT/UPDATE/DELETE sao restritos a admin.

### Pergunta 2: JWT custom claims para `organization_id` e viavel? Impacto? Cache stale?

**Resposta:** E viavel no Supabase Cloud, mas requer cuidado.

**Viabilidade:** Supabase suporta custom claims via `auth.jwt() ->> 'organization_id'`. Pode ser implementado via:
1. **Hook `auth.token`** (Supabase Edge Functions): Intercepta token issuance e adiciona `organization_id` ao JWT. Este e o metodo recomendado.
2. **Custom claims via `auth.users.raw_user_meta_data`**: Menos elegante, requer manter `raw_user_meta_data` sincronizado.

**Impacto nas policies:** Todas as 30+ policies que fazem `(SELECT organization_id FROM profiles WHERE id = auth.uid())` precisariam ser reescritas para `(auth.jwt() ->> 'organization_id')::uuid`. Isso e uma migration massiva (50+ CREATE POLICY statements), mas mecanica e baixo risco.

**Cache stale:** O JWT e valido por 1 hora (default Supabase). Se o usuario trocar de organizacao (cenario raro no ZmobCRM, que e single-org), o JWT antigo continuaria com o org_id anterior ate expirar. Mitigacao: forcar refresh token apos troca de org (`supabase.auth.refreshSession()`).

**Risco:** O ZmobCRM opera como single-org (um usuario pertence a uma organizacao). Troca de org nao e um cenario suportado. Portanto, cache stale nao e um risco pratico.

**Recomendacao:** Implementar em 2 fases:
1. Criar auth hook que adiciona `organization_id` ao JWT (1-2h)
2. Migrar policies progressivamente (por tabela, com testes) (16-20h)

Beneficio: eliminaria a subquery em profiles para cada row evaluation, reduzindo custo de RLS de O(n * subquery) para O(n * claim_lookup).

### Pergunta 3: Deals sem contato sao validos no dominio imobiliario?

**Resposta:** Sim, existem cenarios legitimos.

No dominio imobiliario brasileiro, deals sem contato associado podem ocorrer em:
1. **Lead anonimo via portal:** Interesse registrado antes de ter dados do contato (ex: formulario parcial, visita a imovel sem cadastro).
2. **Deal de parceiro/imobiliaria:** Negocio referenciado por outra imobiliaria onde o contato e gerenciado pelo parceiro.
3. **Importacao em massa:** Deals importados de planilha sem contatos correspondentes (cenario de migracao).

[AUTO-DECISION] Enforcar NOT NULL em `deals.contact_id`? -> NAO (razao: existem cenarios validos de deal sem contato no dominio imobiliario. Enforcar NOT NULL quebraria fluxos de importacao e leads anonimos).

**Recomendacao alternativa:** Em vez de NOT NULL, criar uma view ou query que identifique deals "orfaos" (sem contato e com mais de X dias) para limpeza periodica. Adicionar alerta no dashboard para deals sem contato.

### Pergunta 4: FK `contacts.stage -> lifecycle_stages` foi validada em producao?

**Resposta:** A migration `20260224000006_db015_fk_contacts_stage.sql` foi escrita com verificacao robusta:
- Verifica existencia das tabelas
- Verifica se o constraint ja existe
- Limpa valores orfaos antes de criar a FK
- Usa `IF NOT EXISTS` pattern

A migration consta na lista de 52 migrations em `supabase/migrations/`. Dado que `supabase db push` foi executado para staging (confirmado pelo deploy flow documentado), a FK deve estar aplicada em staging. Para producao, deve-se verificar com:

```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'contacts'::regclass AND confrelid = 'lifecycle_stages'::regclass;
```

[AUTO-DECISION] Posso confirmar em producao agora? -> NAO (razao: nao tenho acesso direto a producao neste contexto. O DRAFT deve registrar isso como item de verificacao para a proxima sessao com acesso ao banco de producao).

### Pergunta 5: App depende de `updated_at` ser setado manualmente? Trigger causa conflito?

**Resposta:** A aplicacao faz `updated_at: new Date().toISOString()` em pelo menos 16 locais no codigo TypeScript (verificado via grep em `lib/`). Isso inclui:
- `lib/supabase/contacts.ts` (linhas 541, 760, 837)
- `lib/supabase/deals.ts` (linhas 487, 625, 646, 688)
- `lib/ai/tools/deal-tools.ts` (linhas 394, 514, 608, 655, 701, 776)
- `lib/supabase/prospecting-goals.ts` (linha 72)

**Conflito com trigger:** NAO havera conflito. O trigger `update_updated_at_column()` (definido no schema_init) faz:

```sql
NEW.updated_at = NOW();
RETURN NEW;
```

Quando o app envia `updated_at = '2026-03-06T...'`, o trigger SOBRESCREVE com `NOW()`. O resultado e funcionalmente correto (timestamp do banco, que e mais preciso e confiavel que o timestamp do client). O app continuara funcionando normalmente -- o campo enviado sera simplesmente ignorado em favor do trigger.

**Recomendacao:** Aplicar os triggers E, opcionalmente, remover os `updated_at: new Date().toISOString()` do codigo TypeScript (refatoracao de limpeza, nao urgente, pois o trigger os sobrescreve anyway).

### Pergunta 6: Estrategia para `contacts.phone` vs `contact_phones`?

**Resposta:** Recomendo opcao (a): sync via trigger.

**Analise das opcoes:**
- **(a) Sync via trigger (RECOMENDADO):** `contacts.phone` e automaticamente mantido como o `contact_phones` marcado como `is_primary = true`. Isso preserva compatibilidade com queries simples (`SELECT phone FROM contacts`) e garante consistencia.
- **(b) Deprecar `contacts.phone`:** Quebraria todas as queries que referenciam `contacts.phone` diretamente (incluindo AI tools, busca, etc.). Alto risco de regressao.
- **(c) Manter ambos com documentacao:** Atual situacao. O sync manual em `contacts.ts:837` ja faz isso parcialmente.

**Implementacao do trigger:**

```sql
CREATE OR REPLACE FUNCTION sync_contact_primary_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.is_primary THEN
      UPDATE contacts SET phone = NEW.phone_number, updated_at = NOW()
      WHERE id = NEW.contact_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE TRIGGER sync_primary_phone_trigger
AFTER INSERT OR UPDATE ON contact_phones
FOR EACH ROW EXECUTE FUNCTION sync_contact_primary_phone();
```

Esforco: 2h (trigger + testes + migration).

### Pergunta 7: SECURITY DEFINER vs SECURITY INVOKER para `merge_contacts()` e LTV RPCs?

**Resposta:** Depende da funcao.

**`merge_contacts()`:** Manter como SECURITY DEFINER, MAS adicionar validacao de org internamente.

Justificativa: A funcao faz UPDATE em multiplas tabelas (`contacts`, `deals`, `contact_phones`, `contact_preferences`, `activities`) e precisa bypassar RLS para operar atomicamente. Se fosse INVOKER, o RLS de cada tabela filtraria independentemente, e um deal de outra org nao seria visivel para transfer -- o que na verdade seria uma PROTECAO (nao um problema). Porem, o INSERT em `activities` para audit log precisa DEFINER para funcionar (o owner_id pode ser diferente do auth.uid() em cenarios de merge por admin).

**Fix concreto para `merge_contacts()`:**
```sql
-- Adicionar no inicio da funcao, apos obter v_org_id:
IF v_org_id != (SELECT organization_id FROM contacts WHERE id = p_winner_id AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Cannot merge contacts from different organizations';
END IF;
IF v_org_id != public.get_user_organization_id() THEN
  RAISE EXCEPTION 'Unauthorized: contacts do not belong to your organization';
END IF;
```

**`increment/decrement_contact_ltv()`:** Converter para SECURITY INVOKER.

Justificativa: Essas funcoes fazem UPDATE simples em uma unica tabela (`contacts`). RLS ja protege `contacts` com filtro de org. Se convertermos para INVOKER, a RLS automaticamente rejeita updates em contacts de outra org. Nao ha necessidade de DEFINER.

```sql
CREATE OR REPLACE FUNCTION increment_contact_ltv(p_contact_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE contacts SET total_value = COALESCE(total_value, 0) + p_amount, updated_at = NOW()
  WHERE id = p_contact_id;
END;
$$;
```

---

## Dependencias Tecnicas

### Grafo de Resolucao (ordem do banco de dados)

```
FASE 1 - SEGURANCA CRITICA (bloqueador, resolver imediatamente)
  DB-006 (merge_contacts org validation)     [CRITICAL, 3h]
  DB-022 (get_dashboard_stats DEFINER->INVOKER) [HIGH, 1h]
  DB-014 (LTV RPCs DEFINER->INVOKER)          [HIGH, 1h]
  DB-025 (merge_contacts SQL injection risk)   [HIGH, 2h]
  => Todos independentes entre si, podem ser feitos em paralelo
  => Resultado: TODAS as funcoes SECURITY DEFINER com risco estao mitigadas

FASE 2 - INTEGRIDADE (desejavel, sem bloqueadores)
  DB-012 (updated_at triggers em tabelas principais) [MEDIUM, 2h]
    => Pre-requisito para: nada, mas facilita auditoria futura
  DB-019 (idx_deals_contact_stage_active)            [MEDIUM, 1h]
    => Independente
  DB-007 (rate_limits RLS)                           [MEDIUM, 2h]
    => Independente

FASE 3 - DESIGN (planejamento necessario)
  DB-003 (deals.contact_id nullable)     [HIGH, 6h]
    => Requer decisao de negocio (minha recomendacao: manter nullable)
  DB-015 (contacts.phone sync trigger)   [MEDIUM, 4h]
    => Depende de: DB-012 (ter trigger de updated_at primeiro e melhor)
  DB-009 (get_dashboard_stats otimizar)  [MEDIUM, 6h]
    => Depende de: DB-022 (converter para INVOKER primeiro)

FASE 4 - PERFORMANCE AT SCALE (longo prazo)
  DB-004 (JWT custom claims para org_id) [HIGH, 20h]
    => Depende de: auth hook setup, testes extensivos
    => Bloqueado por: nada, mas deve ser a ULTIMA coisa a migrar
  DB-017 (estabelecer padrao de rollback) [MEDIUM, 6h]
    => Independente, pode ser feito a qualquer momento

BACKLOG (quando conveniente)
  DB-011 (dropar deals.status)        [LOW, 2h]
  DB-013 (index parcial deleted_at)   [LOW, 1h]
  DB-016 (updated_at em notifications/board_stages) [LOW, 2h]
  DB-020 (VARCHAR->TEXT em security_alerts) [LOW, 1h]
  DB-021 (N+1 useDealsQuery)          [LOW, 2h]
  DB-023 (rate_limits sem org_id)     [LOW, 2h]
  DB-024 (system_notifications INSERT policy) [MEDIUM, 0.5h]
```

### Cadeias de Bloqueio

1. **DB-022 -> DB-009:** Converter `get_dashboard_stats` para INVOKER ANTES de otimizar seus counts. Se otimizar primeiro, a funcao permanece como DEFINER com risco.

2. **DB-012 -> DB-015:** Aplicar triggers de `updated_at` em tabelas principais ANTES de criar o trigger de sync de phone. O trigger de sync faz `UPDATE contacts SET phone = ..., updated_at = NOW()`, e o trigger de updated_at faria o mesmo. Ter ambos ativos nao causa conflito (o trigger de updated_at sobrescreve), mas e mais limpo aplicar na ordem certa.

---

## Recomendacoes

### Resumo Quantitativo Ajustado

| Severidade | DRAFT v2 | Apos Revisao | Diferenca |
|-----------|----------|-------------|-----------|
| CRITICAL | 0 | **1** (DB-006) | +1 |
| HIGH | 6 | **4** (DB-003, DB-004, DB-014, DB-022) + DB-025 | -1 (removidos) +2 (elevados/novos) |
| MEDIUM | 13 | **8** (DB-007, DB-009, DB-012, DB-015, DB-017, DB-019, DB-024, DB-025) | -5 (removidos/rebaixados) |
| LOW | 2 | **7** (DB-011, DB-013, DB-016, DB-018, DB-020, DB-021, DB-023) | +5 (rebaixados) |
| **REMOVIDOS** | -- | **5** (DB-001, DB-002, DB-005, DB-008, DB-010) | -- |
| **Total ativo** | **21** | **20** | -1 |

### Esforco Total Ajustado

| Fase | Horas | Debitos |
|------|-------|---------|
| Fase 1 - Seguranca | 7h | DB-006, DB-014, DB-022, DB-025 |
| Fase 2 - Integridade | 5h | DB-007, DB-012, DB-019 |
| Fase 3 - Design | 16h | DB-003, DB-009, DB-015 |
| Fase 4 - Performance | 26h | DB-004, DB-017 |
| Backlog | 10h | DB-011, DB-013, DB-016, DB-020, DB-021, DB-023, DB-024 |
| **Total** | **~64h** | **20 debitos** |

Nota: O DRAFT v2 estimava 60-95h para database. Minha estimativa ajustada e **~64h** (considerando que 5 debitos ja foram resolvidos e nao requerem esforco).

### Estrategia de Migracao

1. **Uma migration por fase**, nao por debito. Agrupar debitos relacionados na mesma migration para reduzir overhead de deployment.

2. **Cada migration deve incluir rollback comentado** (comecando a cumprir DB-017).

3. **Testar em staging ANTES de producao.** Usar `supabase db push` (que vai para staging por padrao).

4. **Para DB-004 (JWT custom claims):** NAO incluir na migration normal. Este e um projeto separado que requer:
   - Auth hook em Edge Function
   - Reescrita de todas as policies (50+ statements)
   - Testes extensivos de cada tabela
   - Rollback plan (reverter policies para subquery se hook falhar)
   - Timeline: 2-3 semanas dedicadas

### Mitigacao de Risco

| Risco | Mitigacao |
|-------|-----------|
| DB-006 explorado antes do fix | **URGENTE:** Aplicar validacao de org em `merge_contacts()` imediatamente. Migration de 10 linhas. |
| JWT custom claims falham | Manter `get_user_organization_id()` como fallback. Implementar feature flag que permite trocar entre JWT claim e subquery. |
| Trigger de `updated_at` causa regressao | O trigger sobrescreve o `updated_at` do app -- NAO causa regressao funcional, apenas temporal (timestamp do banco vs timestamp do app, diferenca de milissegundos). |
| `deals.status` dropada quebra algo | Fazer `SELECT deals.status` em staging primeiro. Se retorna dados, verificar qual codigo os leu. Grep por `status` em `deals.ts` retorna 0 matches no codebase. |

---

## Impacto em Debitos de Outras Areas

### Debitos de Sistema (SYS-*) que requerem mudancas no DB

| SYS-ID | Debito | Mudanca DB Necessaria |
|--------|--------|----------------------|
| **SYS-002** | BASE_INSTRUCTIONS hardcoded | Nenhuma mudanca DB. A tabela `ai_prompt_templates` ja existe e ja tem dados. O fix e puramente no codigo TypeScript (`crmAgent.ts`). |
| **SYS-004** | Prospeccao invisivel para IA | Nenhuma mudanca DB. As tabelas `prospecting_queues`, `saved_queues`, `daily_goals` ja existem com RLS e indexes. O fix e criar novas tools em `lib/ai/tools/prospecting-tools.ts`. |
| **SYS-005** | `property_ref` e `metadata` invisiveis | Nenhuma mudanca DB. Colunas `deals.property_ref` e `activities.metadata` ja existem (migrations `20260303120000` e `20260303130000`). Fix e expor nos tools de IA. |
| **SYS-007** | Rate limiter in-memory | **POSSIVEL mudanca DB.** Se migrar para rate limiting via banco (usando `rate_limits` table), precisaria adicionar `organization_id` a tabela e corrigir RLS (DB-007 + DB-023). Alternativa: usar Redis/Upstash (sem mudanca DB). |
| **SYS-011** | WHATSAPP faltando em Activity Tools | **Nenhuma mudanca DB.** Verificado: `activities.type` e TEXT sem CHECK constraint. A coluna aceita qualquer valor. O fix e puramente no enum do TypeScript em `activity-tools.ts`. |
| **SYS-017** | CSP headers ausentes | Nenhuma mudanca DB. |
| **SYS-018** | API keys sem encriptacao | **MUDANCA DB SIGNIFICATIVA.** Se implementar encriptacao at-rest para keys em `organization_settings`, requer: nova coluna `encrypted_key`, funcao de encrypt/decrypt via pgcrypto, migration de dados existentes. Estimativa: 8-12h (DB portion). |

### Debitos de UX (UX-*) que requerem mudancas no DB

Nenhum debito UX requer mudanca de banco de dados. Todos sao puramente frontend (componentes, estilos, hooks).

---

## Autocritica do DB-AUDIT.md

O DB-AUDIT.md produzido na Phase 2 continha **5 debitos ja resolvidos** que foram listados como pendentes:
- DB-001 (system_notifications RLS) -- corrigido em `20260223100000`
- DB-002/DB-008 (client_company_id) -- corrigido em `20260220100000`
- DB-005 (lifecycle_stages FK) -- corrigido em `20260224000006`
- DB-010 (system_notifications index) -- corrigido em `20260223100000`

Isso ocorreu porque a analise original focou no schema_init (`20251201000000`) onde esses debitos existiam, mas nao fez cross-reference completa com as migrations posteriores que os corrigiram. Para proximas auditorias, recomendo executar a analise sobre o **estado final acumulado** das migrations, nao sobre migrations individuais.

Adicionalmente, a auditoria nao identificou:
- DB-022 (`get_dashboard_stats` SECURITY DEFINER desnecessario)
- DB-025 (padrao de EXECUTE com concatenacao em `merge_contacts`)
- DB-024 (ausencia de policy INSERT explicita em `system_notifications`)

---

*Documento gerado por @data-engineer (Dara) - Brownfield Discovery Phase 5*
*Ultima atualizacao: 2026-03-06*
