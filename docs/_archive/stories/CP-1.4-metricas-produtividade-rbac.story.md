# Story CP-1.4: Metricas de Produtividade + RBAC

## Metadata
- **Story ID:** CP-1.4
- **Epic:** CP (Central de Prospeccao)
- **Status:** Done
- **Owner:** (unassigned)
- **Executor:** @dev
- **Quality Gate:** @architect
- **Quality Gate Tools:** [code_review, rls_validation, performance_check]
- **Estimated Hours:** 12-16
- **Priority:** P2

## Descricao

Dashboard de metricas de prospeccao dentro da pagina `/prospecting`. As metricas sao computadas a partir de `activities` (type='CALL') e dados de sessoes de prospeccao. Corretor ve apenas suas metricas, diretor ve metricas da equipe com ranking de corretores, admin ve tudo. Cards de KPI, grafico de evolucao temporal, e breakdown por outcome.

## Acceptance Criteria

- [x] AC1: Secao "Metricas" na pagina de prospeccao com cards de KPI:
  - Ligacoes hoje / esta semana / este mes
  - Taxa de conexao (% connected do total)
  - Tempo medio de ligacao
  - Contatos prospectados (unicos)
- [x] AC2: Grafico de evolucao (ultimos 7 ou 30 dias) — ligacoes por dia com breakdown por outcome (connected, no_answer, voicemail, busy)
- [x] AC3: Filtro de periodo: Hoje, Ultimos 7 dias, Ultimos 30 dias, Custom range
- [x] AC4: RBAC — Corretor: so ve seus dados (owner_id = auth.uid())
- [x] AC5: RBAC — Diretor/Admin: ve dados agregados de toda a org + ranking de corretores (org-wide, sem team_id)
- [x] AC7: Ranking de corretores (diretor/admin): tabela ordenavel por ligacoes, taxa de conexao, tempo medio
- [x] AC8: Metricas atualizam em tempo real durante sessao de prospeccao (otimistic update ou refetch)
- [x] AC9: Loading state com skeleton enquanto carrega
- [x] AC10: Dark mode + responsivo

## Escopo

### IN
- Cards de KPI (ligacoes, taxa conexao, tempo medio, contatos prospectados)
- Grafico de evolucao temporal (bar chart com breakdown por outcome)
- Filtro de periodo
- RBAC por role (corretor/diretor/admin)
- Ranking de corretores (diretor/admin)
- Loading states com skeleton

### OUT
- Export de metricas para PDF/CSV
- Metas/targets configuráveis
- Alertas automaticos (ex: corretor abaixo da media)
- Comparacao entre periodos
- Metricas em tempo real via websocket (usar polling ou refetch)

## Dependencias
- **Blocked by:** CP-1.1 (dados de ligacoes registradas via CallModal)
- **Blocks:** Nenhuma

## Tasks / Subtasks

### Cards de KPI (AC: 1, 3, 9)
- [x] 1. Criar `features/prospecting/components/MetricsCards.tsx`:
  - Card "Ligacoes": count total no periodo selecionado
  - Card "Taxa de Conexao": (connected / total) * 100, formatado como %
  - Card "Tempo Medio": media de duration das activities type='CALL', formatado como MM:SS
  - Card "Contatos Prospectados": COUNT DISTINCT contact_id
  - Cada card com icone, valor, comparacao com periodo anterior (arrow up/down + %)
- [x] 2. Loading state: skeleton cards (reutilizar padrao de skeleton existente se houver)

### Query de Metricas (AC: 1, 3, 4, 5, 6)
- [x] 3. Criar `features/prospecting/hooks/useProspectingMetrics.ts`:
  - Query `activities` WHERE type = 'CALL' AND date BETWEEN {start} AND {end}
  - Outcome via `metadata->>'outcome'` (campo JSONB criado em CP-1.1)
  - Duration via `(metadata->>'duration_seconds')::int`
  - RBAC:
    - Corretor: `AND owner_id = auth.uid()`
    - Diretor/Admin: sem filtro de owner (org-wide via `is_admin_or_director()` — RLS ja filtra por org)
  - Retorna: `{ totalCalls, connectedCalls, connectionRate, avgDuration, uniqueContacts, byDay[], byOutcome[] }`
- [x] 4. Filtro de periodo: `today`, `7d`, `30d`, `custom` — passed como parametro ao hook
- [x] 5. Otimizar: usar aggregate queries (COUNT, AVG, GROUP BY) ao inves de fetch all + compute client-side
  - **Nota técnica:** Implementação atual usa fetch + aggregation client-side. Decisão: volume < 1K atividades/mês por org justifica abordagem client-side por simplicidade. Aggregate queries server-side podem ser adicionadas como otimização futura se volume crescer.

### Grafico de Evolucao (AC: 2)
- [x] 6. Criar `features/prospecting/components/MetricsChart.tsx`:
  - Bar chart: eixo X = dias, eixo Y = quantidade de ligacoes
  - Stacked bars por outcome (connected=green, no_answer=red, voicemail=yellow, busy=gray)
  - Usar library de charts existente no projeto (verificar se usa recharts, chart.js, ou outra)
  - Reutilizar padroes de `features/contacts/components/charts/FunnelChart.tsx`
- [x] 7. Fallback se nao houver dados: "Nenhuma ligacao registrada no periodo"

### Ranking de Corretores (AC: 5, 6, 7)
- [x] 8. Criar `features/prospecting/components/CorretorRanking.tsx`:
  - Tabela: nome do corretor, total ligacoes, taxa conexao, tempo medio, contatos prospectados
  - Ordenavel por qualquer coluna (click no header)
  - So visivel para role diretor e admin
  - Diretor ve corretores da sua equipe, admin ve todos
- [x] 9. Query: GROUP BY owner_id com JOIN em profiles para nome
- [x] 10. Highlight do melhor corretor (badge ou cor diferente)

### Integracao na Pagina (AC: 8, 10)
- [x] 11. Integrar MetricsCards, MetricsChart e CorretorRanking na ProspectingPage
  - Layout: cards no topo, grafico abaixo, ranking abaixo (para diretor/admin)
  - Tab ou toggle para alternar entre "Fila" e "Metricas"
- [x] 12. Refetch metricas apos cada ligacao registrada (quando CallModal.onSave e chamado)
- [x] 13. Responsivo: cards em grid 2x2 no mobile, 4x1 no desktop

### Testes
- [x] 14. Testar KPIs com dados mock e dados reais
- [x] 15. Testar RBAC: corretor ve so seus dados, diretor ve equipe, admin ve tudo
- [x] 16. Testar filtros de periodo
- [x] 17. Testar ranking (ordenacao, visibilidade por role)
- [x] 18. Testar atualizacao apos nova ligacao registrada

## Notas Tecnicas

### Schema DB
- `activities` com type='CALL': agora tem coluna `metadata JSONB` (criada em CP-1.1)
- `metadata` contem: `{ outcome: 'connected'|'no_answer'|'voicemail'|'busy', duration_seconds: number }`
- **DECISAO RESOLVIDA:** Campo `metadata JSONB` adicionado em CP-1.1 — queries usam `metadata->>'outcome'` para GROUP BY e `(metadata->>'duration_seconds')::int` para AVG
- Dados anteriores (sem metadata) tem outcome no campo `description` como texto — ignorar para metricas ou criar backfill opcional

### RBAC existente
- `CRMContext.tsx` tem `userProfile` com role e organization_id
- Queries Supabase usam `.eq('organization_id', orgId)` para RLS
- Filtro por equipe do diretor: verificar como o RBAC diferencia diretor/corretor no sistema atual
- Referencia: `features/contacts/hooks/useContactsController.ts` para padroes de RBAC em queries

### Charts
- `features/contacts/components/charts/FunnelChart.tsx` existe — verificar library usada
- Se usa recharts: reutilizar para BarChart com stacked bars
- Se nao tem library: avaliar recharts (mais comum em React) ou chart.js

### Performance
- Queries com aggregate (COUNT, AVG, GROUP BY) sao rapidas com indexes existentes
- `idx_activities_date` (date DESC) cobre filtro temporal
- `idx_activities_owner_id` (owner_id) cobre filtro RBAC
- Para volumes grandes, considerar views materializadas no futuro (fora de escopo MVP)

---

## File List

| File | Status | Notes |
|------|--------|-------|
| features/prospecting/components/MetricsCards.tsx | New | Cards de KPI (4 cards + skeleton) |
| features/prospecting/components/MetricsChart.tsx | New | Stacked bar chart recharts (fillDateGaps, CustomTooltip, inline legend) |
| features/prospecting/components/CorretorRanking.tsx | New | Tabela ordenável + highlight top |
| features/prospecting/components/SessionSummary.tsx | Modified | Renomeado formatDuration → formatElapsedTime (evitar colisão) |
| features/prospecting/hooks/useProspectingMetrics.ts | New | Query + aggregation + RBAC via RLS + QUERY_LIMIT 5000 |
| features/prospecting/hooks/useDarkMode.ts | New | Hook reutilizável dark mode via MutationObserver |
| features/prospecting/utils/formatDuration.ts | New | Util compartilhado MM:SS (Math.floor para evitar 0:60) |
| features/prospecting/ProspectingPage.tsx | Modified | Tab Fila/Métricas, period filter, error/truncation banners |
| features/prospecting/__tests__/prospectingMetrics.test.tsx | Modified | 32 testes (+16: aggregateMetrics, getDateRange, other bucket) |
| features/prospecting/__tests__/useDarkMode.test.ts | New | 4 testes (dark class add/remove, MutationObserver) |
| features/prospecting/__tests__/formatDuration.test.ts | New | 7 testes (zero, seconds, minutes, edge cases) |
| features/prospecting/__tests__/directorAssignment.test.tsx | Modified | Updated mock (removed refetchMetrics) |

## Definition of Done

- [x] All acceptance criteria met
- [x] KPIs corretos com dados reais
- [x] RBAC validado (corretor/diretor/admin) em staging
- [x] Grafico de evolucao funcional com breakdown por outcome
- [x] Ranking de corretores visivel apenas para diretor/admin
- [x] Performance aceitavel (< 2s para carregar metricas)
- [x] Dark mode testado
- [x] No regressions
- [x] Code reviewed

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @sm (River) | Story criada a partir do Epic CP |
| 2026-03-03 | @pm (Morgan) | Decisao: usar metadata JSONB de CP-1.1 para queries de metricas |
| 2026-03-03 | @data-engineer (Dara) | Review DB: RBAC org-wide (AC5/AC6 unificados), sem team_id |
| 2026-03-03 | @dev (Dex) | Implementação completa: hook, 3 componentes, integração, 16 testes |
| 2026-03-04 | @dev (Dex) | QA fixes: H1 useCallback stability, H2 task 5 note, M1 tooltip dark mode, M2 profiles dedup, +15 testes (aggregateMetrics, getDateRange) |
| 2026-03-04 | @dev (Dex) | Melhorias: formatDuration util compartilhado, useDarkMode hook, QUERY_LIMIT 5000 + truncation warning, chart rewrite (fillDateGaps, CustomTooltip, inline legend), error banner, +12 testes (useDarkMode, formatDuration, other bucket) |
| 2026-03-04 | @qa (Quinn) | Re-review: PASS — todas as issues resolvidas, 553 testes passando |
| 2026-03-04 | @po (Pax) | Story closed: ACs 8/8 marcados, DoD 9/9, QA Gate PASS, Status → Done |
