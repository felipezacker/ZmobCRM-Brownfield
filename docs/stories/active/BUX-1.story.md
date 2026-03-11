# Story BUX-1: Quick Wins — Card Improvements

## Metadata
- **Story ID:** BUX-1
- **Epic:** BUX (Board UX & Filtros Gerenciais)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 5 (S)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, pattern_validation, a11y_check]

## Story

**As a** gestor/corretor do ZmobCRM usando o board Kanban,
**I want** que o card exiba informacoes criticas ausentes (proxima atividade, tempo no estagio), que o valor da coluna use "R$" em vez de "$", que tags tenham mais espaco para leitura, e que o botao de adicionar deal funcione em touch,
**so that** tenha visao rapida do status de cada deal sem precisar abrir detalhes, com valores formatados corretamente e usabilidade em dispositivos moveis.

## Descricao

5 correcoes rapidas no DealCard e KanbanBoard que melhoram a experiencia imediata sem mudanca de layout:

1. **Prefixo de moeda errado**: Header da coluna usa template literal `` `$${stageValue}` `` que renderiza "$1,234" em vez de "R$". Trocar para `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
2. **Proxima atividade ausente no card**: `deal.nextActivity` existe no tipo `DealView` (type, date, isOverdue) mas nao e exibido no card. Adicionar row mostrando tipo + data relativa ("Ligacao amanha", "Reuniao 15/03").
3. **Botao + invisivel em touch**: O botao de novo deal no header da coluna usa `md:opacity-0 group-hover:opacity-100`, tornando-o inacessivel em dispositivos touch.
4. **Sem indicador de tempo no estagio**: `deal.lastStageChangeDate` existe mas nao e exibido. Mostrar "ha Xd" no card para o gestor identificar deals parados rapidamente.
5. **Tags truncadas demais**: Tags truncam em 60px, cortando nomes curtos. Aumentar para 80px.

## Acceptance Criteria

- [ ] AC1: Given uma coluna do Kanban com deals, when renderizada, then o header exibe o valor total formatado como "R$ X.XXX,XX" (nao "$X,XXX")
- [ ] AC2: Given um deal com `nextActivity` preenchido, when renderizado no card, then exibe o tipo da atividade (icone) e data relativa (ex: "Amanha", "15/03") em uma row dedicada
- [ ] AC3: Given um deal sem `nextActivity`, when renderizado no card, then a row de proxima atividade nao aparece (nao mostrar "Sem atividade")
- [ ] AC4: Given o board em dispositivo touch, when usuario toca no header da coluna, then o botao "+" de novo deal esta sempre visivel (sem depender de hover)
- [ ] AC5: Given um deal com `lastStageChangeDate` preenchido, when renderizado no card, then exibe "ha Xd" (ex: "ha 3d", "ha 15d") com cor de alerta para >10 dias
- [ ] AC6: Given um deal sem `lastStageChangeDate`, when renderizado no card, then nao exibe indicador de tempo no estagio
- [ ] AC7: Given um contato com tags, when renderizado no card, then cada tag exibe ate 80px de largura antes de truncar (era 60px)

## Scope

### IN
- Corrigir formatacao de moeda no header da coluna (KanbanBoard.tsx)
- Adicionar row de proxima atividade no DealCard
- Remover `md:opacity-0` condicional do botao + no header da coluna
- Adicionar indicador "ha Xd" no DealCard usando `lastStageChangeDate`
- Aumentar max-width de tags de 60px para 80px

### OUT
- Mudancas no schema/banco de dados
- Mudancas na API / backend / queries
- Novos componentes (apenas modificar existentes)
- Mudancas no menu de acoes (ActivityStatusIcon) — isso e BUX-3/BUX-4
- Summary bar ou filtros novos — isso e BUX-2/BUX-5

## Tasks

### Task 1 — Corrigir prefixo de moeda no header da coluna (AC1)
- [x] Task 1.1: Em `KanbanBoard.tsx` linha 344, substituir `${stageValue.toLocaleString()}` por `BRL_CURRENCY.format(stageValue)`
  - Criar instancia `const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` no topo do arquivo (mesmo padrao de `DealCard.tsx:62`)
  - Remover o prefixo "$" hardcoded do label "Total:" (linha ~342-344)

### Task 2 — Proxima atividade no card (AC2, AC3)
- [x] Task 2.1: Em `DealCard.tsx`, adicionar row entre Row 3 (Owner) e Row 4 (Tags/Date/Activity) para exibir `deal.nextActivity`
  - Condicional: so renderizar se `deal.nextActivity` existir
  - Layout: icone do tipo (Phone/Calendar/Mail) + texto da data relativa
  - Reutilizar o mapeamento de icones de `ActivityStatusIcon.tsx:51` (CALL→Phone, EMAIL→Mail, MEETING→Calendar)
- [x] Task 2.2: Criar helper `formatRelativeActivityDate(dateStr: string): string` em `boardUtils.ts`
  - "Hoje" se mesma data
  - "Amanha" se proximo dia
  - "DD/MM" para datas futuras
  - "Atrasada X dias" se passado (com cor vermelha)
- [x] Task 2.3: Estilizar a row: texto pequeno (text-xs), cor muted para futuro, vermelha para atrasada, verde para hoje
- [x] Task 2.4: Testes unitarios para `formatRelativeActivityDate` em `boardUtils.test.ts` — cenarios: hoje, amanha, data futura, data passada (atrasada)

### Task 3 — Botao + visivel em touch (AC4)
- [x] Task 3.1: Em `KanbanBoard.tsx` linha 316, o botao de novo deal tem classes `opacity-60 md:opacity-0 md:group-hover/col:opacity-100`
  - Estado atual: mobile = 60% opacidade (semi-visivel), desktop = invisivel ate hover
  - Fix: trocar `opacity-60 md:opacity-0` por `opacity-100 md:opacity-0` para manter totalmente visivel em mobile e hover-only em desktop
  - Alternativa: remover `md:opacity-0` para visibilidade permanente em todas as telas

### Task 4 — Indicador "ha Xd" no card (AC5, AC6)
- [x] Task 4.1: Criar helper `formatStageAge(lastStageChangeDate: string | null | undefined): string | null` em `boardUtils.ts`
  - Se null/undefined: retornar null
  - Calcular diferenca em dias: `Math.floor((now - date) / (1000 * 3600 * 24))`
  - Retornar: "ha 1d", "ha 5d", "ha 15d", etc.
- [x] Task 4.2: Em `DealCard.tsx`, adicionar badge "ha Xd" proximo ao nome do contato (Row 1) ou ao lado da data (Row 4)
  - Cor: `text-muted-foreground` para <=10 dias, `text-amber-500` para >10 dias (alinhado com rotting threshold de `boardUtils.ts:3-8`)
  - Nao exibir para deals fechados (isWon || isLost)
- [x] Task 4.3: Testes unitarios para `formatStageAge` em `boardUtils.test.ts` — cenarios: null, 0 dias, 5 dias, 10 dias (threshold), 30 dias

### Task 5 — Tags com max-width maior (AC7)
- [x] Task 5.1: Em `DealCardActions.tsx`, localizar a classe `max-w-[60px]` aplicada as tags (linhas ~51-56)
  - Substituir por `max-w-[80px]`
  - Verificar se o layout da Row 4 comporta a mudanca sem quebrar

### Task 6 — Quality Gate
- [x] Task 6.1: `npm run typecheck` passa sem erros
- [x] Task 6.2: `npm run lint` passa sem erros
- [x] Task 6.3: `npm test` passa sem regressoes (78 arquivos, 820 testes)
- [x] Task 6.4: Verificar acessibilidade: aria-labels atualizados para novos elementos (proxima atividade, tempo no estagio)

## Dev Notes

### Contexto Arquitetural Verificado

**DealCard.tsx (306 linhas):**
- Componente memoizado (`React.memo` linha 306) — novas props devem ser estáveis ou memoizadas
- 4 rows visuais: (1) Avatar+Nome+Valor, (2) Produto, (3) Dono, (4) Tags+Data+ActivityIcon
- BRL_CURRENCY ja existe na linha 62: `new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Tags: max 2 visiveis + badge `+N` para overflow (deals fechados mostram 1 tag)
- Badges absolutas (top-right): saving spinner, won trophy, lost X, rotting hourglass
- Aria label montado nas linhas 164-177 — atualizar para incluir proxima atividade e tempo no estagio
- Props inclui `deal: DealView` que contem `nextActivity?: { type, date, isOverdue }` e `lastStageChangeDate`

**KanbanBoard.tsx (430 linhas):**
- BUG na linha 344: `${stageValue.toLocaleString()}` renderiza "$1,234" em vez de "R$ 1.234,00"
- Estrutura do header da coluna (linhas 301-346): color stripe, stage label, count badge, automation indicator, total value
- Empty state (linhas 355-364): "Sem negocios" quando vazio + "Solte aqui!" durante drag
- Performance patterns: `dealsByStageId` (useMemo), `dealsById` (Map), callbacks estáveis por deal.id
- Botao + de novo deal no header usa classes de hover-only (md:opacity-0 group-hover)

**DealCardActions.tsx (77 linhas):**
- Row 4 do card: tags + data + ActivityStatusIcon
- Tags com `max-w-[60px]` truncate (linhas ~51-56)
- Data formatada: `toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })` → "10/03/2026"

**ActivityStatusIcon.tsx (228 linhas):**
- Mapeamento de icones: CALL→Phone, EMAIL→Mail, MEETING→Calendar, default→ChevronRight (linha 51)
- Suporta 4 status: green (hoje), red (atrasada), yellow (sem atividade), gray (futura)
- Menu via Portal com 3 secoes: Resultado (win/lose), Agendar (ligar/reuniao amanha), Acoes Rapidas (mover/excluir)

**boardUtils.ts (17 linhas):**
- `isDealRotting(deal)`: >10 dias desde lastStageChangeDate ou updatedAt
- `getActivityStatus(deal)`: retorna 'yellow'|'red'|'green'|'gray'
- Arquivo pequeno — ideal para adicionar helpers `formatRelativeActivityDate` e `formatStageAge`

**DealView Interface (types.ts linhas 247-296):**
- `nextActivity?: { type: string; date: string; isOverdue: boolean }`
- `lastStageChangeDate: string` (ISO date)
- `priority: 'low' | 'medium' | 'high'`
- `contactTags: string[]`
- `isWon: boolean`, `isLost: boolean`

### Padroes a Seguir

- **Currency:** Reutilizar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` — instancia no topo do arquivo (mesmo padrao de DealCard.tsx:62 e DealCardPopovers.tsx:9)
- **Date:** `toLocaleDateString('pt-BR', ...)` — padrao existente em DealCardActions.tsx:5-10
- **Memoizacao:** Componente DealCard usa React.memo — qualquer nova prop deve ser referência estavel
- **Icones:** Lucide React (Phone, Calendar, Mail, ChevronRight) — padrao existente em ActivityStatusIcon.tsx
- **Acessibilidade:** aria-labels em portugues, keyboard navigation via useKanbanKeyboard.ts

### Soft Dependencies

- **BUX-8** (Contagem/Valor Header) toca no mesmo header da coluna (linhas 301-346). BUX-1 deve ser feito primeiro para evitar conflito de merge.
- **BUX-4** (3 Dots Menu) depende do layout do card estar finalizado.

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: Low (5 quick fixes, 3 arquivos principais)
- Secondary Types: nenhum

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @qa (quality gate)

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
- Currency formatting: BRL_CURRENCY.format() em vez de toLocaleString()
- Acessibilidade: aria-labels atualizados para novos elementos
- Performance: nao quebrar React.memo do DealCard (props estaveis)
- Layout: novas rows nao devem quebrar o card em telas pequenas

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Nova row de atividade aumenta altura do card | Baixa | Baixo | Usar text-xs compacto, condicional (so aparece se nextActivity existe) |
| React.memo invalidado por novas props | Baixa | Medio | Nao adicionar novas props — usar dados ja disponiveis em `deal: DealView` |
| max-w-[80px] em tags quebra layout da Row 4 | Baixa | Baixo | Testar com tags longas + muitas tags, ajustar gap se necessario |

## Dependencies

- **Nenhuma dependencia de outras stories** — BUX-1 e independente
- **Nenhuma migration necessaria** — todos os campos ja existem no tipo DealView
- **Nenhuma mudanca de API** — dados ja disponiveis client-side

## Criteria of Done

- [ ] Header da coluna exibe "R$ X.XXX,XX" em vez de "$X,XXX"
- [ ] Card exibe proxima atividade (tipo + data relativa) quando disponivel
- [ ] Botao + visivel em dispositivos touch (sem hover dependency)
- [ ] Card exibe "ha Xd" com cor de alerta para deals parados >10 dias
- [ ] Tags exibem ate 80px antes de truncar
- [ ] Aria-labels atualizados para novos elementos
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] `npm test` passa sem regressoes

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| features/boards/components/Kanban/KanbanBoard.tsx | Modificado | BRL_CURRENCY formatter, opacity-100 touch fix |
| features/boards/components/Kanban/DealCard.tsx | Modificado | Row 3.5 proxima atividade, badge "ha Xd", aria-labels |
| features/boards/components/Kanban/DealCardActions.tsx | Modificado | max-w-[60px] → max-w-[80px] tags |
| features/boards/hooks/boardUtils.ts | Modificado | +formatRelativeActivityDate, +formatStageAge |
| features/boards/hooks/boardUtils.test.ts | Criado | 15 testes unitarios para novos helpers |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-10 | @sm | Story criada a partir do Epic BUX |
| 2026-03-10 | @po | Validacao GO (9/10). Fix I1: adicionadas Tasks 2.4 e 4.3 (testes unitarios para novos helpers). Fix I2: Task 3.1 corrigida com classes exatas (linha 316, opacity-60). Status Draft → Ready. |
| 2026-03-10 | @dev | Implementacao completa: 5 fixes + 12 testes unitarios. typecheck/lint/test OK (820 testes). Status Ready → InReview. |
| 2026-03-10 | @qa | Review PASS. 3 issues (I1 dead import, I2 cor verde, I3 edge cases) corrigidos pelo @dev. Re-review aprovado. |
| 2026-03-10 | @dev | QA fixes aplicados: +3 testes (15 total), Math.max clamp, cor verde Hoje. 823 testes OK. Status InReview → Done. |

---
*Story gerada por @sm (River) — Epic BUX (Board UX & Filtros Gerenciais)*
