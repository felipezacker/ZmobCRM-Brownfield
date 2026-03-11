# Story CP-3.5: Infraestrutura — Metricas Server-Side + Constantes + Cleanup + Error Boundaries

## Metadata
- **Story ID:** CP-3.5
- **Epic:** CP-3 (Prospeccao com IA + Melhorias da Central)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 13 (L)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** administrador/diretor do ZmobCRM com equipe de corretores,
**I want** que as metricas de prospeccao nao sejam truncadas em 5000 registros, que magic numbers sejam centralizados, que items exauridos sejam limpos automaticamente, e que erros nao derrubem a pagina inteira,
**so that** tenha dados completos, configuracao consistente, banco limpo e experiencia resiliente.

## Descricao

4 problemas de infraestrutura que limitam escalabilidade e resiliencia da Central de Prospeccao:

1. **Metricas truncadas**: `useProspectingMetrics` faz query com LIMIT 5000 e agrega client-side. Orgs com muita atividade perdem dados. Solucao: RPC server-side que agrega no Supabase.
2. **Magic numbers**: `QUEUE_LIMIT=100`, `MIN_CALLS=50`, `RETRY_INTERVAL=3` espalhados inline nos componentes/hooks. Centralizar em `prospecting-config.ts`.
3. **Items exauridos**: Contatos com `status=exhausted` acumulam na tabela `prospecting_queues` indefinidamente. Cleanup automatico >30 dias.
4. **Sem error boundaries**: Erro em um componente (ex: MetricsChart) derruba a pagina inteira. Envolver secoes independentes com error boundaries.

## Acceptance Criteria

### Metricas server-side
- [ ] AC1: Given uma org com >5000 atividades de call, when metricas carregam, then exibe dados completos sem truncacao
- [ ] AC2: Given a RPC `get_prospecting_metrics_aggregated`, when chamada com periodo 30d, then retorna total_calls, connected, no_answer, voicemail, busy, avg_duration, unique_contacts, by_day[] e by_broker[]
- [ ] AC3: Given o hook `useProspectingMetrics`, when atualizado, then usa RPC em vez de query + client-side aggregation
- [ ] AC4: Given o warning de "dados truncados", when RPC ativa, then warning nao aparece mais

### Constantes centralizadas
- [ ] AC5: Given o arquivo `prospecting-config.ts`, when criado, then contem todas as constantes da Central: QUEUE_MAX_CONTACTS, HEATMAP_MIN_CALLS, MAX_RETRY_COUNT, DEFAULT_RETRY_INTERVAL_DAYS, SESSION_HISTORY_LIMIT
- [ ] AC6: Given componentes/hooks que usam magic numbers, when refatorados, then importam de `prospecting-config.ts`

### Cleanup de exauridos
- [ ] AC7: Given a RPC `cleanup_exhausted_queue_items(30)`, when executada, then deleta items com status='exhausted' e updated_at mais antigo que 30 dias
- [ ] AC8: Given o carregamento da pagina de prospeccao, when `activateReadyRetries` roda, then tambem chama cleanup de exauridos

### Error boundaries
- [ ] AC9: Given um erro no componente MetricsChart, when renderizado, then exibe fallback "Erro ao carregar metricas" com botao "Tentar novamente" em vez de derrubar a pagina
- [ ] AC10: Given error boundaries nas 4 secoes (queue, metrics, dialer, heatmap), when erro em uma secao, then as outras continuam funcionando

### Heatmap threshold
- [ ] AC11: Given o ConnectionHeatmap com MIN_CALLS reduzido de 50 para 10, when celula tem <10 chamadas, then exibe tooltip "dados insuficientes" em vez de vazio
- [ ] AC12: Given o ConnectionHeatmap com celula com >=10 e <50 chamadas, when renderizada, then exibe dados normalmente (antes nao exibiria por MIN_CALLS=50)

## Scope

### IN
- RPC `get_prospecting_metrics_aggregated` no Supabase
- Atualizar `useProspectingMetrics` para usar RPC
- Arquivo `features/prospecting/prospecting-config.ts` com constantes
- Substituir magic numbers em todos os componentes/hooks
- RPC `cleanup_exhausted_queue_items`
- Chamar cleanup no load da pagina
- `ProspectingErrorBoundary` wrapper para 4 secoes
- Heatmap: MIN_CALLS de 50 → 10 + tooltip "dados insuficientes"
- Testes unitarios
- 1 migration (2 RPCs)

### OUT
- Graficos novos de metricas
- Dashboard de analytics
- Cron job de cleanup (cleanup on-demand no load e suficiente)
- Metricas em tempo real (realtime subscription nas metricas — overkill)

## Tasks

### Task 1 — Migration com RPCs (AC1, AC2, AC7)
- [x] Task 1.1: Criar migration `{timestamp}_prospecting_rpcs.sql`
  ```sql
  -- RPC: Metricas agregadas server-side
  CREATE OR REPLACE FUNCTION get_prospecting_metrics_aggregated(
    p_owner_id UUID DEFAULT NULL,
    p_org_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    result JSONB;
  BEGIN
    -- Validar que user pertence a org
    IF p_org_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
      'total_calls', COUNT(*),
      'connected', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'connected'),
      'no_answer', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'no_answer'),
      'voicemail', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'voicemail'),
      'busy', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'busy'),
      'avg_duration', COALESCE(AVG((metadata->>'duration')::numeric), 0),
      'unique_contacts', COUNT(DISTINCT contact_id),
      'by_day', (
        SELECT jsonb_agg(day_row ORDER BY day_row->>'date')
        FROM (
          SELECT jsonb_build_object(
            'date', date_trunc('day', created_at)::date,
            'total', COUNT(*),
            'connected', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'connected'),
            'no_answer', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'no_answer'),
            'voicemail', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'voicemail'),
            'busy', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'busy')
          ) AS day_row
          FROM activities
          WHERE type = 'CALL'
            AND metadata IS NOT NULL
            AND created_at >= p_start_date
            AND created_at <= p_end_date + INTERVAL '1 day'
            AND (p_owner_id IS NULL OR owner_id = p_owner_id)
            AND organization_id = COALESCE(p_org_id, (SELECT organization_id FROM profiles WHERE id = auth.uid()))
          GROUP BY date_trunc('day', created_at)::date
        ) sub
      ),
      'by_broker', (
        SELECT jsonb_agg(broker_row)
        FROM (
          SELECT jsonb_build_object(
            'owner_id', a.owner_id,
            'owner_name', COALESCE(p.full_name, p.email),
            'total_calls', COUNT(*),
            'connected', COUNT(*) FILTER (WHERE a.metadata->>'outcome' = 'connected'),
            'connection_rate', ROUND(
              COUNT(*) FILTER (WHERE a.metadata->>'outcome' = 'connected')::numeric / NULLIF(COUNT(*), 0) * 100, 1
            ),
            'avg_duration', COALESCE(AVG((a.metadata->>'duration')::numeric), 0),
            'unique_contacts', COUNT(DISTINCT a.contact_id)
          ) AS broker_row
          FROM activities a
          JOIN profiles p ON p.id = a.owner_id
          WHERE a.type = 'CALL'
            AND a.metadata IS NOT NULL
            AND a.created_at >= p_start_date
            AND a.created_at <= p_end_date + INTERVAL '1 day'
            AND a.organization_id = COALESCE(p_org_id, (SELECT organization_id FROM profiles WHERE id = auth.uid()))
          GROUP BY a.owner_id, p.full_name, p.email
        ) sub
      )
    ) INTO result
    FROM activities
    WHERE type = 'CALL'
      AND metadata IS NOT NULL
      AND created_at >= p_start_date
      AND created_at <= p_end_date + INTERVAL '1 day'
      AND (p_owner_id IS NULL OR owner_id = p_owner_id)
      AND organization_id = COALESCE(p_org_id, (SELECT organization_id FROM profiles WHERE id = auth.uid()));

    RETURN result;
  END;
  $$;

  -- RPC: Cleanup de items exauridos
  CREATE OR REPLACE FUNCTION cleanup_exhausted_queue_items(
    p_days_old INTEGER DEFAULT 30
  )
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    deleted_count INTEGER;
  BEGIN
    DELETE FROM prospecting_queues
    WHERE status = 'exhausted'
      AND updated_at < NOW() - (p_days_old || ' days')::INTERVAL
      AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    RETURNING 1;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
  END;
  $$;
  ```
- [x] Task 1.2: Testar RPCs em staging

### Task 2 — Atualizar useProspectingMetrics (AC1, AC3, AC4)
- [x] Task 2.1: Refatorar `useProspectingMetrics.ts`
  - Substituir query direta + aggregateMetrics() por chamada RPC
  - `supabase.rpc('get_prospecting_metrics_aggregated', { p_owner_id, p_org_id, p_start_date, p_end_date })`
  - Manter interface de retorno (`ProspectingMetrics`) identica
  - Remover `isDataTruncated` flag e warning de truncacao
- [x] Task 2.2: Manter fallback para query antiga se RPC falhar (graceful degradation)

### Task 3 — Constantes centralizadas (AC5, AC6)
- [x] Task 3.1: Criar `features/prospecting/prospecting-config.ts`
  ```typescript
  export const PROSPECTING_CONFIG = {
    QUEUE_MAX_CONTACTS: 100,
    HEATMAP_MIN_CALLS: 10,       // reduzido de 50
    MAX_RETRY_COUNT: 3,
    DEFAULT_RETRY_INTERVAL_DAYS: 3,
    SESSION_HISTORY_LIMIT: 20,
    METRICS_MAX_RECORDS: 5000,    // legacy fallback
    EXHAUSTED_CLEANUP_DAYS: 30,
    HEATMAP_TIME_SLOTS: ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20'],
  } as const;
  ```
- [x] Task 3.2: Substituir magic numbers em:
  - `useProspectingQueue.ts`: QUEUE_LIMIT → QUEUE_MAX_CONTACTS, retry interval → DEFAULT_RETRY_INTERVAL_DAYS
  - `useProspectingMetrics.ts`: 5000 → METRICS_MAX_RECORDS (fallback)
  - `ConnectionHeatmap.tsx`: MIN_CALLS → HEATMAP_MIN_CALLS
  - `SessionHistory.tsx` (CP-3.4): limit → SESSION_HISTORY_LIMIT
  - Demais componentes com valores inline

### Task 4 — Cleanup de exauridos (AC7, AC8)
- [x] Task 4.1: Chamar RPC `cleanup_exhausted_queue_items` no load da pagina
  - Integrar em `activateReadyRetries` ou similar hook de inicializacao
  - Fire-and-forget (nao bloquear rendering)
  - Log resultado: "Cleanup: {N} items exauridos removidos"
- [x] Task 4.2: Testes

### Task 5 — Error boundaries (AC9, AC10)
- [x] Task 5.1: Criar `features/prospecting/components/ProspectingErrorBoundary.tsx`
  - Wrapper com `ErrorBoundary` (React class component ou react-error-boundary)
  - Props: `section: string` (para log), `children`
  - Fallback: card com icone de erro, mensagem "Erro ao carregar {section}", botao "Tentar novamente" (resetErrorBoundary)
  - Logar erro via console.error
- [x] Task 5.2: Envolver secoes em `ProspectingPage.tsx`:
  - `<ProspectingErrorBoundary section="Fila">` → CallQueue
  - `<ProspectingErrorBoundary section="Métricas">` → MetricsCards + MetricsChart
  - `<ProspectingErrorBoundary section="Power Dialer">` → PowerDialer
  - `<ProspectingErrorBoundary section="Heatmap">` → ConnectionHeatmap

### Task 6 — Heatmap threshold (AC11, AC12)
- [x] Task 6.1: Modificar `ConnectionHeatmap.tsx`
  - Importar `HEATMAP_MIN_CALLS` de `prospecting-config.ts`
  - Celulas com <MIN_CALLS: cor cinza clara, tooltip "Dados insuficientes ({N}/{MIN_CALLS} chamadas)"
  - Celulas com >=MIN_CALLS: comportamento normal (cores por connectionRate)

### Task 7 — Quality Gate
- [x] Task 7.1: `npm run typecheck` passa
- [x] Task 7.2: `npm run lint` passa
- [x] Task 7.3: `npm test` passa

## Dev Notes

### Contexto Arquitetural

**useProspectingMetrics.ts (273 linhas):**
- Query: `activities WHERE type='CALL' AND metadata NOT NULL` com LIMIT 5000
- Aggregacao client-side: `aggregateMetrics()` calcula totals, byDay, byOutcome, byBroker
- `isDataTruncated`: true se resultado >= 5000
- Filtros: period (today/7d/30d/custom), filterOwnerId

**ConnectionHeatmap.tsx (~100 linhas):**
- `MIN_CALLS = 50` hardcoded
- Grid: 7 dias × 6 slots de 2 horas (08-20)
- Cores: >=40% green, >=30% orange, >=20% amber, >=10% light amber, <10% gray

**Padrao de RPC existente:**
- `SECURITY DEFINER` com `SET search_path = public`
- Validacao de org via `profiles.organization_id`
- Retorno JSONB

**Magic numbers encontrados:**
- `useProspectingQueue.ts`: `100` (queue limit), `3` (retry interval days)
- `useProspectingMetrics.ts`: `5000` (query limit)
- `ConnectionHeatmap.tsx`: `50` (min calls)
- Slots de hora: `['08-10', '10-12', '12-14', '14-16', '16-18', '18-20']`

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/{ts}_prospecting_rpcs.sql` | Created | 2 RPCs |
| `features/prospecting/prospecting-config.ts` | Created | Constantes centralizadas |
| `features/prospecting/hooks/useProspectingMetrics.ts` | Modified | Usar RPC |
| `features/prospecting/hooks/useProspectingQueue.ts` | Modified | Importar constantes |
| `features/prospecting/components/ConnectionHeatmap.tsx` | Modified | MIN_CALLS + tooltip |
| `features/prospecting/components/ProspectingErrorBoundary.tsx` | Created | Error boundary |
| `features/prospecting/ProspectingPage.tsx` | Modified | Envolver secoes com boundary |

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Database + Frontend
- Complexity: High (RPC complexa + refactor hooks + error boundaries)
- Secondary Types: Infrastructure

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED
- [ ] Pre-PR review (@devops) — if PR created

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- RPC: SECURITY DEFINER, validacao de org, performance com EXPLAIN ANALYZE
- Constantes: nenhum magic number restante apos refactor
- Error boundaries: nao esconder erros (logar sempre)
- Heatmap: tooltip correto para dados insuficientes

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| RPC de metricas lenta em orgs grandes | Media | Alto | EXPLAIN ANALYZE antes de deploy, indexes em activities |
| Cleanup deleta items que nao deveria | Baixa | Medio | WHERE status='exhausted' AND updated_at < N dias — seguro |
| Error boundary esconde bugs reais | Baixa | Baixo | console.error + botao "reportar problema" no fallback |
| Refactor de constantes quebra imports | Baixa | Baixo | Buscar todos os usos antes de substituir |

## Dependencies

- **CP-3.1:** Done (base)
- **Independente de CP-3.2 e CP-3.3** (pode rodar em paralelo na Wave 1)
- **1 migration necessaria** (2 RPCs)
- **CP-3.6 tem dependencia soft** (funciona sem, mas melhor com constantes)

## Criteria of Done

- [ ] RPC `get_prospecting_metrics_aggregated` funcional
- [ ] Metricas sem limite de 5000 registros
- [ ] `prospecting-config.ts` com todas as constantes
- [ ] Magic numbers substituidos em todos os componentes/hooks
- [ ] Cleanup automatico de items exhausted >30 dias
- [ ] Error boundaries em queue, metrics, dialer, heatmap
- [ ] Heatmap com threshold reduzido + tooltip "dados insuficientes"
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] `npm test` passa
- [ ] Testes cobrindo RPC, cleanup, error boundary

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/20260310100000_cp35_prospecting_rpcs.sql` | Created | 2 RPCs: get_prospecting_metrics_aggregated + cleanup_exhausted_queue_items |
| `features/prospecting/prospecting-config.ts` | Created | Constantes centralizadas da Central de Prospeccao |
| `features/prospecting/components/ProspectingErrorBoundary.tsx` | Created | Error boundary para secoes independentes |
| `features/prospecting/hooks/useProspectingMetrics.ts` | Modified | RPC server-side com fallback + heatmap query separada |
| `features/prospecting/hooks/useProspectingQueue.ts` | Modified | Constantes centralizadas + cleanup fire-and-forget |
| `features/prospecting/components/ConnectionHeatmap.tsx` | Modified | MIN_CALLS=10, tooltip per-cell "dados insuficientes" |
| `features/prospecting/ProspectingPage.tsx` | Modified | Error boundaries em 4 secoes |
| `features/prospecting/__tests__/connectionHeatmap.test.tsx` | Modified | Testes atualizados para MIN_CALLS=10 + per-cell behavior |
| `features/prospecting/__tests__/directorAssignment.test.tsx` | Modified | Mock corrigido: activities/range/isDataTruncated |
| `features/settings/components/ApiKeysSection.tsx` | Modified | Fix lint warning (pre-existente): useEffect deps |

## QA Results

**Reviewer:** @qa (Quinn)
**Date:** 2026-03-10
**Verdict:** CONCERNS (aprovado com observacoes)

### Quality Gates

| Check | Status |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 warnings) |
| `npm test` | PASS (770/770 testes, 74 arquivos) |

### Acceptance Criteria Verification

| AC | Status | Evidencia |
|----|--------|-----------|
| AC1 | PASS | RPC sem LIMIT, server-side aggregation |
| AC2 | PASS | Todos os campos retornados: total_calls, connected, no_answer, voicemail, busy, avg_duration, unique_contacts, by_day[], by_broker[] |
| AC3 | PASS | rpcQuery primary (L276-292), fallbackQuery secondary (L295-315) |
| AC4 | PASS | isDataTruncated = false quando RPC ativo (L317-318) |
| AC5 | PASS | 8 constantes em prospecting-config.ts |
| AC6 | PASS | Nenhum magic number inline restante nos hooks |
| AC7 | PASS | RPC com WHERE status='exhausted' AND updated_at < N dias, org-scoped |
| AC8 | PASS | Fire-and-forget em useProspectingQueue.ts:97-112 |
| AC9 | PASS | AlertTriangle + "Erro ao carregar {section}" + botao "Tentar novamente" |
| AC10 | PASS | 4 secoes requeridas + 1 bonus (SessionHistory) |
| AC11 | PASS | Per-cell: isInsufficient = cell.total > 0 && cell.total < MIN_CALLS -> cinza + tooltip |
| AC12 | PASS | Per-cell logic: celulas >=10 exibem dados normalmente |

### Security Check

| Item | Status |
|------|--------|
| SECURITY DEFINER + search_path | OK |
| Validacao de org (auth.uid()) | OK |
| Sem SQL injection (parametrizado) | OK |
| RLS respeitada via auth context | OK |
| Cleanup scoped por org | OK |
| Sem secrets/credenciais expostas | OK |

### Observacoes (nao bloqueantes)

| # | Severidade | Descricao | Status |
|---|-----------|-----------|--------|
| 1 | ~~MEDIUM~~ | ~~heatmapQuery sem LIMIT~~ | RESOLVIDO — HEATMAP_MAX_RECORDS=10000 adicionado |
| 2 | ~~LOW~~ | ~~cleanup aceita p_days_old <= 0~~ | RESOLVIDO — guard IF p_days_old < 1 THEN RETURN 0 |
| 3 | ~~LOW~~ | ~~Sem teste para transformRpcResponse~~ | RESOLVIDO — 5 testes adicionados |

### Decisao

**Re-review: PASS** — Todas as 3 observacoes do review anterior foram corrigidas. 0 issues restantes.

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic CP-3 |
| 2026-03-10 | @po | Validacao GO (10/10). 0 issues. RPC detalhada com SECURITY DEFINER, constantes completas, error boundaries mapeadas. Status Draft → Ready. |
| 2026-03-10 | @dev | Implementacao completa: migration, RPC + fallback, constantes, cleanup, error boundaries, heatmap threshold. Typecheck/lint/test OK (757/757). |
| 2026-03-10 | @qa | Review CONCERNS (aprovado). 12/12 ACs PASS. Quality gates OK (770/770). 3 observacoes MEDIUM/LOW documentadas. Status → Done. |
| 2026-03-10 | @dev | Fix 3 observacoes QA: HEATMAP_MAX_RECORDS=10000, guard p_days_old<1, 5 testes transformRpcResponse. Typecheck/lint/test OK. |
| 2026-03-10 | @qa | Re-review PASS. 3/3 observacoes resolvidas. 0 issues restantes. |

---
*Story gerada por @sm (River) — Epic CP-3*
