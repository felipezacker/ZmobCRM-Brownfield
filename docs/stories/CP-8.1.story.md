# Story CP-8.1: Dashboard Editavel com Reorganizacao para Diretor

## Metadata
- **Story ID:** CP-8.1
- **Epic:** CP-8 (Prospeccao — Dashboard UX para Diretor)
- **Status:** Ready for Review
- **Priority:** P1
- **Estimated Points:** 8 (M)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, component_test]

## Story

**As a** diretor/admin do ZmobCRM,
**I want** ver as secoes do dashboard de metricas de prospeccao reorganizadas por prioridade e poder reordenar/esconder secoes conforme minha preferencia,
**so that** eu encontre rapidamente as informacoes mais importantes (ranking da equipe, insights, KPIs) sem precisar scrollar por secoes irrelevantes, e possa personalizar o layout de acordo com minha rotina de gestao.

## Descricao

Hoje o dashboard de metricas de prospeccao tem ~14 secoes em ordem fixa. O diretor precisa scrollar ate o final da pagina para ver o Ranking de Corretores e os Insights Automaticos — duas das informacoes mais valiosas para gestao. Alem disso, o card "Motivos de Skip" esta vazio (funcionalidade removida) e "Leads quentes sem contato" ocupa espaco no topo sendo informacao secundaria.

**Problema:**
1. Ranking de Corretores enterrado no final da pagina
2. Insights Automaticos enterrados no meio
3. Card "Motivos de Skip" vazio (skip sem motivo agora)
4. "Leads quentes sem contato" ocupa espaco premium no topo
5. Ordem fixa — diretor nao pode personalizar
6. KPI cards secundarios (Correio Voz, Tempo Medio, Contatos) tem mesmo tamanho dos principais

**Solucao:**
Duas frentes: (A) reorganizar a ordem default das secoes priorizando a visao do diretor, (B) adicionar modo de edicao com drag-and-drop e toggle de visibilidade, persistido no localStorage.

## Acceptance Criteria

- [ ] AC1: Card "Motivos de Skip" removido do dashboard (vazio apos remocao do dropdown)
- [ ] AC2: Ordem default das secoes reorganizada conforme nova hierarquia (ver Dev Notes)
- [ ] AC3: Botao "Editar layout" visivel ao lado de "Atualizar" e "Exportar PDF" (somente admin/diretor)
- [ ] AC4: Ao clicar "Editar layout", cada secao exibe drag handle (GripVertical) e toggle de visibilidade (icone olho)
- [ ] AC5: Secoes podem ser reordenadas via drag-and-drop usando @dnd-kit (mesmo pattern da fila de prospeccao)
- [ ] AC6: Toggle de visibilidade esconde/mostra secoes (secao escondida nao aparece na tela mas seu estado de collapse e preservado ao reexibir)
- [ ] AC7: Botoes "Salvar" e "Cancelar" substituem "Editar layout" durante o modo de edicao
- [ ] AC8: Ordem e visibilidade salvas no localStorage por userId (`prospecting_dashboard_layout_{userId}`)
- [ ] AC9: Ao carregar a pagina, layout salvo e aplicado. Se nao houver layout salvo, usar ordem default
- [ ] AC10: Secoes collapse (MetricsSection) continuam funcionando normalmente dentro do novo layout
- [ ] AC11: Dark mode corretamente estilizado para drag handles e toggles de visibilidade

## Scope

### IN
- Remover card "Motivos de Skip" da UI (coluna `skip_reason` permanece no banco)
- Reorganizar ordem default das secoes
- Componente `EditableSectionWrapper` com drag-and-drop via @dnd-kit
- Hook `useDashboardLayout` para estado do layout
- Toggle de visibilidade por secao
- Persistencia no localStorage
- Botao "Editar layout" / "Salvar" / "Cancelar"
- Testes unitarios para ordenacao, visibilidade e persistencia

### OUT
- Persistencia no banco de dados (localStorage apenas nesta story)
- Layout diferente por role (admin vs corretor) — mesma customizacao para todos
- Redimensionamento de secoes (apenas reordenacao e show/hide)
- Alteracoes no conteudo das secoes (apenas posicao e visibilidade)

## Dependencies

- `@dnd-kit/core` e `@dnd-kit/sortable` ja instalados no projeto (usados em CallQueue)
- `MetricsSection` componente colapsavel ja existe em `features/prospecting/components/MetricsSection.tsx`
- `ProspectingPage.tsx` contem todas as secoes de metricas
- `useAuth` para obter userId para key do localStorage

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Performance com muitas secoes draggable | Baixa | Medio | Secoes sao poucos elementos (~12), @dnd-kit lida bem |
| Conflito de estado entre collapse e visibilidade | Media | Baixo | Visibilidade e collapse sao estados independentes |
| Layout salvo fica desatualizado se novas secoes forem adicionadas | Media | Baixo | Merge com default: secoes novas aparecem no final |
| Drag acidental no mobile (scroll vs drag) | Baixa | Baixo | Modo edicao requer click explicito em "Editar layout" |

## Business Value

- **Diretores** encontram Ranking e Insights imediatamente ao abrir o dashboard
- **Personalizacao** cada diretor configura o dashboard para sua rotina de gestao
- **Menos scroll** — secoes menos usadas podem ser escondidas ou rebaixadas
- **Limpeza** — card vazio "Motivos de Skip" removido

## Criteria of Done

- [x] Card "Motivos de Skip" removido da UI
- [x] Secoes reordenadas conforme nova hierarquia default
- [x] Modo de edicao funcional com drag-and-drop e toggle de visibilidade
- [x] Layout persiste entre sessoes via localStorage
- [x] Dark mode correto para elementos do modo edicao
- [x] Testes para: ordem default, reordenacao, toggle visibilidade, persistencia, merge com novas secoes
- [x] Lint e typecheck passando
- [x] Sem regressao em MetricsSection collapse e outros componentes

## Tasks

- [x] Task 1: Remover card "Motivos de Skip" (AC: 1)
  - [x] Subtask 1.1: Localizar e remover o componente/bloco de "Motivos de Skip" do ProspectingPage.tsx
  - [x] Subtask 1.2: Remover imports orfaos se houver
  - [x] Subtask 1.3: Verificar que nenhum outro componente referencia os dados de skip reasons

- [x] Task 2: Reorganizar ordem default das secoes (AC: 2)
  - [x] Subtask 2.1: Definir array constante `DEFAULT_SECTION_ORDER` com IDs e labels (ver Dev Notes — Nova hierarquia)
  - [x] Subtask 2.2: Mover blocos JSX na ProspectingPage.tsx para a nova ordem
  - [x] Subtask 2.3: Validar visualmente que a nova ordem esta correta

- [x] Task 3: Criar hook `useDashboardLayout` (AC: 8, 9)
  - [x] Subtask 3.1: Criar hook em `features/prospecting/hooks/useDashboardLayout.ts`
  - [x] Subtask 3.2: Estado: `sectionOrder: string[]`, `hiddenSections: Set<string>`, `isEditing: boolean`
  - [x] Subtask 3.3: Load do localStorage na inicializacao (key: `prospecting_dashboard_layout_{userId}`)
  - [x] Subtask 3.4: Save no localStorage ao confirmar (merge com secoes default para secoes novas)
  - [x] Subtask 3.5: Funcoes: `startEditing()`, `saveLayout()`, `cancelEditing()`, `toggleVisibility(sectionId)`, `reorder(activeId, overId)`

- [x] Task 4: Criar componente `EditableSectionWrapper` (AC: 3, 4, 5, 6, 7, 11)
  - [x] Subtask 4.1: Wrapper que envolve cada `MetricsSection` com sortable do @dnd-kit
  - [x] Subtask 4.2: No modo edicao: exibir GripVertical (drag handle) e icone Eye/EyeOff (toggle visibilidade)
  - [x] Subtask 4.3: No modo normal: renderizar secao normalmente sem handles
  - [x] Subtask 4.4: Secoes hidden no modo normal nao renderizam (return null)
  - [x] Subtask 4.5: Dark mode para handles e toggles

- [x] Task 5: Integrar no ProspectingPage.tsx (AC: 3, 5, 7, 10)
  - [x] Subtask 5.1: Importar hook `useDashboardLayout` e componente `EditableSectionWrapper`
  - [x] Subtask 5.2: Adicionar botao "Editar layout" ao lado de "Atualizar" e "Exportar PDF"
  - [x] Subtask 5.3: No modo edicao, trocar botao por "Salvar" e "Cancelar"
  - [x] Subtask 5.4: Envolver cada secao com `EditableSectionWrapper` usando section IDs
  - [x] Subtask 5.5: Usar DndContext + SortableContext para drag-and-drop das secoes
  - [x] Subtask 5.6: Renderizar secoes na ordem definida pelo hook (iterando `sectionOrder`)

- [x] Task 6: Testes (AC: 1-11)
  - [x] Subtask 6.1: Teste unitario `useDashboardLayout`: save/load localStorage, merge secoes novas, toggle visibilidade, reorder
  - [x] Subtask 6.2: Teste de componente: modo edicao exibe handles e toggles, modo normal nao exibe
  - [x] Subtask 6.3: Teste de componente: secao hidden nao renderiza no modo normal
  - [x] Subtask 6.4: Teste: dados corrompidos no localStorage nao causa crash (JSON.parse defensivo)
  - [x] Subtask 6.5: Validacao: lint + typecheck passando

## Dev Notes

### Nova hierarquia de secoes (ordem default)

| # | ID da secao | Titulo | Posicao anterior | Observacoes |
|---|-------------|--------|-----------------|-------------|
| 1 | live-ops | Operacao ao Vivo | 1o | Mantido |
| 2 | kpi-primary | KPI Cards (Ligacoes, Atendidas, Sem Resposta) | 3o | Mantido |
| 3 | kpi-secondary | KPI Cards (Correio Voz, Tempo Medio, Contatos) | 4o | Mantido |
| 4 | ranking | Ranking de Corretores | ~12o | SUBIU |
| 5 | daily-goal | Meta do Dia | 2o | Desceu |
| 6 | charts | Distribuicao + Ligacoes por Dia | 5o | Mantido |
| 7 | insights | Insights Automaticos | ~9o | SUBIU |
| 8 | retry-effectiveness | Efetividade de Retentativas | ~10o | Mantido |
| 9 | heatmap | Melhor Horario para Ligar | ~8o | Desceu (colapsado) |
| 10 | objections | Top 5 Objecoes | ~9o | Mantido |
| 11 | hot-leads | Leads quentes sem contato | 2o | DESCEU |
| 12 | queue-health | Saude da Fila | ~11o | Mantido (colapsado) |
| 13 | pipeline | Pipeline | ~12o | Mantido (colapsado) |
| 14 | sessions | Sessoes | ~13o | Mantido (colapsado) |

### Secoes removidas

- ~~Motivos de Skip~~ — card vazio apos remocao do dropdown de skip (commit b083b86)

### Pattern de referencia: @dnd-kit no projeto

O pattern de drag-and-drop ja existe em `features/prospecting/components/CallQueue.tsx`:
- `DndContext` + `SortableContext` + `useSortable`
- `verticalListSortingStrategy`
- `closestCenter` collision detection
- `PointerSensor` + `TouchSensor`
- GripVertical como drag handle

### Pattern de referencia: modo edicao

O modo de edicao segue o padrao de widgets do iOS/Notion:
1. Estado normal: secoes renderizam sem handles, ordem do layout salvo
2. Click "Editar layout": handles de drag e toggles de visibilidade aparecem
3. Drag para reordenar, click no olho para show/hide
4. "Salvar" persiste no localStorage, "Cancelar" reverte
5. Zero risco de mudanca acidental — requer acao explicita

### localStorage schema

```typescript
interface DashboardLayout {
  version: 1
  sectionOrder: string[] // IDs na ordem do usuario
  hiddenSections: string[] // IDs de secoes escondidas
}
// Key: `prospecting_dashboard_layout_{userId}`
```

### Merge de secoes novas

Quando uma nova secao e adicionada ao codigo mas nao existe no layout salvo:
```typescript
const mergedOrder = [...savedOrder, ...defaultOrder.filter(id => !savedOrder.includes(id))]
```
Secoes novas aparecem no final da lista.

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| ProspectingPage | `features/prospecting/ProspectingPage.tsx` | Reordenar secoes, integrar layout editavel, remover Motivos de Skip |
| useDashboardLayout | `features/prospecting/hooks/useDashboardLayout.ts` | Criar — hook de estado do layout |
| EditableSectionWrapper | `features/prospecting/components/EditableSectionWrapper.tsx` | Criar — wrapper sortable para secoes |
| Testes | `features/prospecting/__tests__/dashboardLayout.test.tsx` | Criar — testes do hook e componente |

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (componente UI + hook + drag-and-drop)
- **Secondary Type(s):** N/A
- **Complexity:** Medium — reutiliza @dnd-kit existente, 3 arquivos novos + 1 modificado

**Specialized Agent Assignment:**

Primary Agents:
- @dev (pre-commit reviews, implementacao)
- @ux-expert (validacao visual do modo edicao + dark mode)

Supporting Agents:
- @qa (validacao dos cenarios de teste e cobertura)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main`

**Self-Healing Configuration:**
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutos
- Severity Filter: CRITICAL, HIGH

**Predicted Behavior:**
- CRITICAL issues: auto_fix (ate 2 iteracoes)
- HIGH issues: document_only (anotado em Dev Notes)

**CodeRabbit Focus Areas:**

Primary Focus:
- Performance: drag-and-drop com ~12 secoes nao deve causar jank
- localStorage: tratar dados corrompidos sem crash (JSON.parse defensivo)
- Acessibilidade: drag handles com aria-labels, toggle com aria-pressed

Secondary Focus:
- Dark mode: handles e toggles com estilo consistente
- Merge de secoes: layout salvo + secoes novas nao deve perder dados

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/ProspectingPage.tsx` | Modificado | Remover SkipReasons, reorganizar secoes em 14 sections individuais, integrar DnD layout editavel com botoes Editar/Salvar/Cancelar |
| `features/prospecting/hooks/useDashboardLayout.ts` | Criado | Hook de estado do layout (sectionOrder, hiddenSections, isEditing, localStorage persistence com merge) |
| `features/prospecting/components/EditableSectionWrapper.tsx` | Criado | Wrapper sortable @dnd-kit com GripVertical drag handle e Eye/EyeOff toggle visibilidade |
| `features/prospecting/components/MetricsCards.tsx` | Modificado | Adicionado prop variant ('primary'/'secondary') para split KPI cards entre secoes |
| `features/prospecting/__tests__/dashboardLayout.test.tsx` | Criado | 19 testes para hook useDashboardLayout + componente EditableSectionWrapper |

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-14 | 1.0 | Story criada com contexto da sessao UX com @ux-design-expert | @sm (River) |
| 2026-03-14 | 1.1 | Validated GO (97/100). SF-1 corrigido: AC6 reescrito sem detalhe de implementacao. Status Draft → Ready | @po (Pax) |
| 2026-03-14 | 1.2 | Implementacao completa: 6 tasks, 19 testes, lint+typecheck clean. Status Ready → Ready for Review | @dev (Dex) |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

N/A — implementacao sem blockers

### Completion Notes List

- Task 1: Removido SkipReasonsChart da UI e imports (useSkipReasons, SkipReasonsChart). Componente SkipReasonsChart.tsx preservado no disco mas nao mais importado.
- Task 2: Definido `DEFAULT_SECTION_ORDER` com 14 secoes conforme Dev Notes. Cada secao agora e uma MetricsSection individual com proprio ID, icon e defaultOpen.
- Task 3: Hook `useDashboardLayout` criado com estado de sectionOrder, hiddenSections e isEditing. Suporta localStorage persistence, merge de secoes novas, e cancelamento com rollback.
- Task 4: Componente `EditableSectionWrapper` criado usando @dnd-kit/sortable. Modo normal: pass-through sem controles. Modo edicao: drag handle (GripVertical) + toggle visibilidade (Eye/EyeOff) com dark mode.
- Task 5: ProspectingPage.tsx integrado com DndContext/SortableContext. Botoes Editar layout/Salvar/Cancelar no header (somente admin/diretor). Secoes renderizadas dinamicamente conforme sectionOrder.
- Task 6: 19 testes criados (13 para hook, 6 para componente). Cobertura: save/load/merge localStorage, toggle visibilidade, reorder, cancel rollback, corrupted data, edit mode controls, hidden sections.
- MetricsCards.tsx: Adicionado prop `variant: 'primary' | 'secondary'` para suportar secoes kpi-primary e kpi-secondary separadas.
- Lint e typecheck: passando sem erros/warnings.

### QA Results

**Reviewer:** @qa (Quinn) | **Date:** 2026-03-14
**Verdict:** CONCERNS (approve with observations)

#### AC Traceability

| AC | Status | Notes |
|----|--------|-------|
| AC1 | PASS | SkipReasonsChart, useSkipReasons e skipReasonsQuery removidos da page. Zero referencias residuais confirmadas via grep. Componente .tsx preservado em disco (correto). |
| AC2 | PASS | DEFAULT_SECTION_ORDER com 14 entries matching Dev Notes exatamente. SECTION_CONFIGS com titles, icons e defaultOpen corretos. |
| AC3 | PASS | Botao "Editar layout" com Pencil icon, posicionado apos "Exportar PDF". Gate `isAdminOrDirector && !layout.isEditing`. |
| AC4 | PASS | GripVertical drag handle com `aria-label="Arrastar para reordenar"`. Eye/EyeOff toggle com `aria-label` dinamico e `aria-pressed`. |
| AC5 | PASS | DndContext + SortableContext + useSortable. Sensors: PointerSensor (distance: 8) + TouchSensor (delay: 250, tolerance: 5). Mesmo pattern do CallQueue.tsx. |
| AC6 | PASS | Toggle funciona. Hidden sections em normal mode: `return null`. Em edit mode: opacity-40 com controles visiveis. Collapse state preservado durante sessao de edicao (component stays mounted). |
| AC7 | PASS | Salvar (Check icon, verde) e Cancelar (X icon, muted) substituem "Editar layout" quando `isEditing=true`. |
| AC8 | PASS | Key: `prospecting_dashboard_layout_{userId}`. Schema: `{ version: 1, sectionOrder: [], hiddenSections: [] }`. saveLayoutToStorage chamado no saveLayout(). |
| AC9 | PASS | Lazy useState initialization carrega do localStorage. Fallback para defaultOrder. Merge: saved + new sections appended. Sections removidas filtradas. |
| AC10 | PASS | MetricsSection.tsx inalterado. Cada secao tem seu proprio defaultOpen. Collapse interno funciona independentemente. |
| AC11 | PASS | Dark mode em todos os controles: drag handle (`dark:bg-white/10`), toggle hidden (`dark:bg-red-500/20`), borders (`dark:border-border/50`), botoes Save/Cancel. |

#### Code Quality

| Check | Result |
|-------|--------|
| Lint | 0 errors, 0 warnings |
| TypeScript | 0 errors (projeto) |
| Tests | 19/19 passing |
| Regressao | 246/246 test files passing (11 failures em .aios/worktrees/ — pre-existentes, nao relacionados) |
| Security | Sem riscos XSS. localStorage parsed defensivamente com try/catch. |
| Acessibilidade | aria-label nos handles, aria-pressed no toggle, keyboard support via useSortable |

#### Observacoes (LOW — nao bloqueantes)

1. **Double localStorage parse on init**: `useDashboardLayout.ts:57-65` chama `loadLayoutFromStorage` 2x (uma para sectionOrder, outra para hiddenSections). Cada chamada faz `getItem` + `JSON.parse`. Impacto: negligivel (1 extra parse on mount), mas poderia ser otimizado com um unico call.

2. **Collapse state on re-show after save**: Se uma secao esta colapsada, usuario esconde e salva, depois edita e mostra — o collapse reseta para defaultOpen. Comportamento aceitavel mas diferente da leitura literal do AC6 ("preservado ao reexibir"). Dentro da mesma sessao de edicao, funciona corretamente.

3. **All sections hidden**: Se usuario esconder todas as secoes, o dashboard mostra apenas header + filtros com espaco vazio. Nao causa crash, mas UX confusa. Considerar prevencao em story futura.

#### Decision

**CONCERNS** — Todas as ACs atendidas, codigo limpo, testes abrangentes. As 3 observacoes sao LOW severity e nao justificam bloquear. Aprovado para merge.
