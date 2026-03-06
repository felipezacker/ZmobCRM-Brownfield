# Story CP-2.4: Filas Salvas + Export de Relatório PDF

## Metadata
- **Story ID:** CP-2.4
- **Epic:** CP-2 (Prospecção Inteligente)
- **Status:** InReview
- **Owner:** (unassigned)
- **Executor:** @dev
- **Quality Gate:** @architect
- **Quality Gate Tools:** [code_review, pattern_validation, performance_check]
- **Estimated Hours:** 10-14
- **Priority:** P2

## Descrição

Corretor pode salvar configurações de filtro como "filas favoritas" reutilizáveis (ex: "Leads frios sem contato há 30 dias", "MQLs quentes da minha carteira"). Ao carregar uma fila salva, os filtros são aplicados automaticamente e o corretor pode importar os resultados para a call queue. Além disso, o dashboard de métricas oferece export em PDF com métricas resumidas, ranking de corretores e insights do período selecionado, para uso em reuniões de gestão.

## Story

As a corretor, I want salvar configurações de filtro como filas favoritas e exportar relatórios em PDF, so that eu reutilize filtros e apresente resultados em reuniões.

## Acceptance Criteria

- [ ] AC1: Botão "Salvar Fila" no painel de filtros (aba Queue, após aplicar filtros)
- [ ] AC2: Ao clicar, modal pede nome da fila (ex: "Leads frios 30 dias") e salva filtros atuais
- [ ] AC3: Lista de filas salvas acessível via dropdown/botão "Minhas Filas" no header da aba Queue
- [ ] AC4: Ao selecionar fila salva, filtros são aplicados automaticamente e resultados carregados
- [ ] AC5: Opção de "Excluir" fila salva (com confirmação)
- [ ] AC6: Diretor/admin pode marcar fila como "compartilhada" — visível para todos os corretores da org
- [ ] AC7: Filas salvas persistem na tabela `prospecting_saved_queues` com RLS por organization_id
- [ ] AC8: Botão "Exportar PDF" no dashboard de métricas (aba Metrics)
- [ ] AC9: PDF contém: período selecionado, KPIs resumidos, gráfico de chamadas, ranking de corretores (se diretor/admin), insights gerados
- [ ] AC10: PDF gerado client-side (sem dependência de servidor)
- [ ] AC11: PDF inclui header com nome da organização e data de geração
- [ ] AC12: Dark mode + responsivo
- [ ] AC13: Sem regressão nas funcionalidades do CP-1

## Escopo

### IN
- Migration: criar tabela `prospecting_saved_queues` (id, name, filters JSONB, owner_id, organization_id, is_shared BOOLEAN, created_at)
- RLS policies para `prospecting_saved_queues`
- Componente `SaveQueueModal` — modal para nomear e salvar filtros
- Componente `SavedQueuesList` — dropdown com filas salvas
- Hook `useSavedQueues` — CRUD de filas salvas
- Botão "Exportar PDF" no dashboard de métricas
- Geração de PDF client-side (html2canvas + jsPDF ou alternativa leve)
- Template do PDF com header, KPIs, chart, ranking, insights
- Testes unitários

### OUT
- Export em Excel/CSV (apenas PDF nesta story)
- Agendamento automático de export (relatório semanal por email)
- Filas salvas com auto-refresh (não atualizam automaticamente)
- Customização visual do template do PDF

## CodeRabbit Integration

- **Story Type Analysis:**
  - Primary Type: Frontend (componentes React — SaveQueueModal, SavedQueuesList, PDF export)
  - Secondary: Database (migration tabela prospecting_saved_queues)
  - Complexity: Medium

- **Specialized Agents:**
  - Primary Agent: @dev (sempre obrigatório)
  - Supporting: @db-sage (migration e RLS para prospecting_saved_queues)

- **Self-Healing Config:**
  - Agent: @dev
  - Mode: light
  - Max Iterations: 2
  - Timeout: 15 min
  - Severity Filter: CRITICAL only

- **Quality Gates:**
  - Pre-Commit (@dev): required
  - Pre-PR (@devops): required

- **Focus Areas:**
  - Frontend: accessibility, performance (html2canvas pode ser lento), responsive design, dark mode compliance
  - Database: RLS coverage, schema compliance (JSONB filters versioning)

## Dependências
- **Blocked by:** Nenhuma (CP-1.3 e CP-1.4 completos)
- **Blocks:** Nenhuma

## Tasks / Subtasks

### Migration DB (AC: 7)
- [x] 1. Criar migration para tabela `prospecting_saved_queues`
  - Schema: `id UUID PK, name TEXT NOT NULL, filters JSONB NOT NULL, owner_id UUID FK, organization_id UUID FK, is_shared BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()`
- [x] 2. Criar RLS policies:
  - SELECT: `owner_id = auth.uid() OR (is_shared = true AND organization_id = user_org_id()) OR is_admin_or_director(org_id)`
  - INSERT: `organization_id = user_org_id()`
  - UPDATE/DELETE: `owner_id = auth.uid() OR is_admin_or_director(org_id)`
- [x] 3. Criar index em `(owner_id, organization_id)`

### Filas Salvas (AC: 1, 2, 3, 4, 5, 6)
- [x] 4. Criar `features/prospecting/components/SaveQueueModal.tsx` — modal com input de nome + toggle "compartilhar"
- [x] 5. Criar `features/prospecting/components/SavedQueuesList.tsx` — dropdown com filas salvas, botão carregar/excluir
- [x] 6. Criar `features/prospecting/hooks/useSavedQueues.ts` — CRUD (list, create, delete)
- [x] 7. Criar service `lib/supabase/prospecting-saved-queues.ts` — operações Supabase
- [x] 8. Botão "Salvar Fila" no `ProspectingFilters` (aparece após aplicar filtros)
- [x] 9. Integrar carregamento de fila salva → aplicar filtros no `useProspectingFilteredContacts`
- [x] 10. Confirmação de exclusão (dialog "Tem certeza?")
- [x] 11. Toggle "Compartilhar com equipe" para diretor/admin

### Export PDF (AC: 8, 9, 10, 11)
- [x] 12. Instalar dependência de geração PDF (avaliar: jsPDF + html2canvas vs @react-pdf/renderer)
  - jsPDF + jspdf-autotable já instalados no projeto; geração programática (sem html2canvas)
- [x] 13. Criar `features/prospecting/utils/generateMetricsPDF.ts` — função de geração
- [x] 14. Template do PDF:
  - Header: nome da org, "Relatório de Prospecção", período, data de geração
  - Seção KPIs: 6 métricas em grid 2×3
  - Seção Tabela diária: ligações por dia com breakdown por outcome
  - Seção Ranking: tabela de corretores (se diretor/admin)
  - Seção Insights: lista de insights gerados
  - Footer: "Gerado pelo ZmobCRM" + paginação
- [x] 15. Botão "Exportar PDF" no header do dashboard de métricas
- [x] 16. Loading state durante geração

### Testes (AC: 12, 13)
- [x] 17. Testes do SaveQueueModal (render, save, validação nome vazio)
- [x] 18. Testes do SavedQueuesList (render, carregar, excluir)
- [x] 19. Testes do useSavedQueues (CRUD operations)
- [x] 20. Testes de regressão — filtros CP-1.3 e métricas CP-1.4 funcionam sem alterações
- [x] 21. Lint + typecheck passing

## Dev Notes

### Source Tree Relevante

```
features/prospecting/
├── ProspectingPage.tsx                    # Main page (599 lines)
├── components/
│   ├── ProspectingFilters.tsx            # Adicionar botão "Salvar Fila"
│   ├── MetricsCards.tsx
│   ├── MetricsChart.tsx
│   ├── SaveQueueModal.tsx                # NOVO — modal para nomear e salvar filtros
│   └── SavedQueuesList.tsx              # NOVO — dropdown com filas salvas
├── hooks/
│   ├── useProspectingQueue.ts
│   └── useSavedQueues.ts                # NOVO — CRUD filas salvas
└── utils/
    ├── formatDuration.ts
    └── generateMetricsPDF.ts            # NOVO — função de geração PDF

lib/supabase/
├── prospecting-queues.ts
└── prospecting-saved-queues.ts          # NOVO — service layer

lib/query/hooks/
├── useProspectingQueueQuery.ts
└── useProspectingContactsQuery.ts
```

### Padrões CP-1 a seguir
- TanStack Query para todas as queries (invalidateQueries após mutações)
- Supabase service layer em `lib/supabase/` (sem chamadas diretas no componente)
- Hooks em 2 camadas: feature hook (`useSavedQueues`) + query hook
- Import pattern: absolutos com `@/`
- UI: Tailwind, Lucide icons, dark mode via classes `dark:`
- Filtros JSONB: versionar como `{ version: "v1", filters: {...} }` para compatibilidade futura

### Testing

- Framework: Jest + @testing-library/react
- Localização: `features/prospecting/__tests__/`
- Padrões: seguir os 29 arquivos e 150+ testes do CP-1 (mesma estrutura)
- Mocks: Supabase client mockado via `__mocks__`, TanStack Query com `QueryClientProvider` wrapper
- Cobertura: SaveQueueModal (render, save, validação nome vazio) + SavedQueuesList (render, carregar, excluir) + useSavedQueues (CRUD)

## Riscos
| Risco | Mitigação |
|-------|-----------|
| html2canvas lento com gráficos complexos | Loading state + otimizar tamanho do canvas |
| Filtros JSONB podem mudar de schema | Versionar formato dos filtros (v1) |
| PDF grande com muitos dados | Limitar período máximo a 90 dias |

## Definition of Done
- [ ] Todos os AC verificados
- [ ] Testes passando
- [ ] Lint + typecheck clean
- [ ] Dark mode OK
- [ ] Responsivo OK
- [ ] RLS validado
- [ ] Sem regressão CP-1

## File List
| Arquivo | Ação |
|---------|------|
| `supabase/migrations/20260306200000_create_prospecting_saved_queues.sql` | Criado |
| `lib/supabase/prospecting-saved-queues.ts` | Criado |
| `lib/query/queryKeys.ts` | Modificado (+ savedQueues key) |
| `features/prospecting/hooks/useSavedQueues.ts` | Criado |
| `features/prospecting/components/SaveQueueModal.tsx` | Criado |
| `features/prospecting/components/SavedQueuesList.tsx` | Criado |
| `features/prospecting/utils/generateMetricsPDF.ts` | Criado |
| `features/prospecting/ProspectingPage.tsx` | Modificado (integração saved queues + PDF export) |
| `features/prospecting/__tests__/saveQueueModal.test.tsx` | Criado |
| `features/prospecting/__tests__/savedQueuesList.test.tsx` | Criado |
| `features/prospecting/__tests__/useSavedQueues.test.ts` | Criado |
| `features/prospecting/__tests__/directorAssignment.test.tsx` | Modificado (+ mock useSavedQueues) |

## Change Log
| Data | Autor | Mudança |
|------|-------|---------|
| 2026-03-04 | @pm | Story criada |
| 2026-03-04 | @sm | Correções pós-validação PO (NO-GO → resubmissão) |
| 2026-03-04 | @po | Validação GO (10/10) — Status Draft → Ready |
| 2026-03-06 | @dev | Implementação completa — 21 tasks, 273 testes passando, lint+typecheck clean |
| 2026-03-06 | @po | Status InProgress → InReview — pronto para QA Gate |
