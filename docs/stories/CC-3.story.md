# Story CC-3: PDF Export Unificado + Integracao Menu

## Metadata
- **Story ID:** CC-3
- **Epic:** CC (Central de Comando — Dashboard Executivo Unificado)
- **Status:** Ready for Review
- **Priority:** P1
- **Estimated Points:** 5 (S)
- **Wave:** 3
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, integration_test, pdf_output_validation]

## Story
**As a** diretor/admin do ZmobCRM,
**I want** exportar um PDF unificado da Central de Comando e acessa-la diretamente pelo menu lateral,
**so that** eu possa compartilhar o relatorio executivo com stakeholders e navegar rapidamente para a visao consolidada.

## Descricao

A Central de Comando (CC-1 + CC-2) entrega os 7 blocos de dados executivos, mas faltam dois elementos de completude: (1) a exportacao PDF que consolida todos os blocos em um unico documento para compartilhamento offline com diretores e investidores, e (2) o item de menu no sidebar que permite acesso direto a `/command-center` sem precisar digitar a URL.

Esta story fecha o epic CC adicionando o botao PDF funcional ao header da Central de Comando e inserindo o item de navegacao no `AppSidebar.tsx`. Ambas as mudancas sao de baixo risco e nao alteram nenhum componente existente alem do sidebar.

**Contexto:** Depende de CC-2 (pagina completa com 7 blocos e hook `useCommandCenterMetrics` disponivel). O botao PDF no header ja existe como placeholder desde CC-2 — esta story o conecta a funcao real.

## Acceptance Criteria

- [ ] Botao PDF no header gera documento com todos os 7 blocos
- [ ] PDF inclui: header com periodo/pipeline, 8 KPI cards, forecast bar, funil horizontal, ranking tabela, carteira + prospeccao, alertas
- [ ] Reutiliza patterns de `generateReportPDF.ts` e `generateMetricsPDF.ts` (lazy load jsPDF)
- [ ] PDF respeita RBAC: diretor ve todos os corretores, corretor ve apenas seus dados
- [ ] Item "Central de Comando" adicionado ao `AppSidebar.tsx` (abaixo de Dashboard ou como primeiro item)
- [ ] Icone adequado (LayoutDashboard ou similar do Lucide) — usar `Command` ou `LayoutGrid` (nao `LayoutDashboard` que ja e usado por "Visao Geral")
- [ ] Item ativo quando na rota `/command-center`
- [ ] Teste de geracao PDF (snapshot do output ou teste de nao-throw)

## Escopo

### IN
- `features/command-center/utils/generateCommandCenterPDF.ts` — funcao principal de geracao PDF
- Conexao do botao PDF placeholder (CC-2) com a funcao real via handler em `CommandCenterPage.tsx`
- Adicao do item "Central de Comando" ao array `NAV_ITEMS` em `AppSidebar.tsx`
- Adicao da entrada `'command-center'` ao objeto `routeImports` em `lib/prefetch.ts` (necessario para o tipo `RouteName`)
- Teste unitario para a funcao `generateCommandCenterPDF`

### OUT
- Alteracoes no layout ou conteudo dos 7 blocos (escopo de CC-2)
- Estilizacao CSS customizada no PDF alem do color palette hardcoded
- Geracao de graficos vetoriais no PDF (funil e tendencia renderizados como tabelas de dados, nao SVG)
- Impressao direta (somente exportacao para arquivo via `doc.save()`)
- Alteracoes nos dashboards existentes (/dashboard, /reports, /contacts/metrics)

## Dependencies

- **CC-2** (pagina completa com 7 blocos, hook `useCommandCenterMetrics`, botao PDF placeholder no header)
- `features/reports/utils/generateReportPDF.ts` (referencia de padrao — lazy load, color palette, estrutura)
- `features/prospecting/utils/generateMetricsPDF.ts` (referencia de padrao — interfaces, secoes, tabelas)
- `jspdf` + `jspdf-autotable` (ja no package.json)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| PDF com dados sensıveis de corretores visiveis para role incorreto | Baixa | Alto | Filtrar dados pelo `isAdminOrDirector` flag antes de passar para a funcao — mesma abordagem de `generateMetricsPDF.ts` |
| Funil e graficos nao exportaveis como imagem via jsPDF | Media | Baixo | Renderizar funil como tabela de dados (stage -> contagem) no PDF — aceitavel para documento executivo |
| RouteName type error se `lib/prefetch.ts` nao for atualizado antes de `AppSidebar.tsx` | Alta | Baixo | Task 2 deve atualizar `lib/prefetch.ts` ANTES de editar `AppSidebar.tsx` |
| Bundle size — jsPDF adicionado ao bundle inicial se import for estatico | Baixa | Medio | Usar dynamic import (lazy load) como em `generateReportPDF.ts` — carrega ~200KB apenas no clique |

## Business Value

O PDF unificado permite que o diretor exporte o "pulso do negocio" em um unico documento para reunioes de board, apresentacoes a investidores e analises offline. O item no menu elimina a fricao de acesso — a Central de Comando precisa estar a 1 clique de distancia para ser usada no dia a dia.

## Criteria of Done

- [ ] `generateCommandCenterPDF.ts` criado e exportando todos os 7 blocos em PDF
- [ ] Botao PDF no header de `CommandCenterPage.tsx` conectado e funcional
- [ ] `AppSidebar.tsx` com item "Central de Comando" ativo em `/command-center`
- [ ] `lib/prefetch.ts` com entrada `'command-center'` no `routeImports`
- [ ] Teste unitario de geracao PDF passando (`npm test`)
- [ ] TypeScript sem erros (`npm run typecheck`)
- [ ] ESLint sem erros (`npm run lint`)
- [ ] Verificar que `/dashboard`, `/reports`, `/contacts/metrics` continuam funcionando (regressao manual)

## Tasks

- [x] **Task 1: Criar `generateCommandCenterPDF.ts`** (AC: 1, 2, 3, 4)
  - [x] 1.1 Definir interface `CommandCenterPDFData` com os campos dos 7 blocos (dados vem de `useCommandCenterMetrics`)
  - [x] 1.2 Implementar funcao exportada `generateCommandCenterPDF(data, period, boardName, generatedBy, isAdminOrDirector)`
  - [x] 1.3 Lazy load de jsPDF: `const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])`
  - [x] 1.4 Copiar color palette de `generateReportPDF.ts` (COLORS object com tipos `[number, number, number]`)
  - [x] 1.5 Secao 1 — Header: logo Z, titulo "Central de Comando — ZmobCRM", subtitulo com periodo e pipeline, data/hora de geracao
  - [x] 1.6 Secao 2 — KPIs: grid de 8 cards (2 colunas x 4 linhas) com VGV, Comissao, Negocios V/L, Conversao, Contatos, Ligacoes/Conexao, Ciclo Medio, Saude Carteira
  - [x] 1.7 Secao 3 — Forecast: barra de progresso textual (Realizado: R$X / Meta: R$Y — XX%) usando retangulos e texto
  - [x] 1.8 Secao 4 — Funil: tabela com colunas Stage | Contatos | Taxa via `autoTable`
  - [x] 1.9 Secao 5 — Ranking Corretores: tabela com colunas # | Corretor | Negocios V/L | Comissao | Conversao | Ligacoes. Se `!isAdminOrDirector`, incluir apenas dados do proprio usuario
  - [x] 1.10 Secao 6 — Carteira + Prospeccao: dois blocos lado a lado — distribuicao carteira (Ativos/Inativos/Churn + HOT/WARM/COLD) e 4 metricas de prospeccao (Ligacoes, Conexao, Agendamentos, Propostas)
  - [x] 1.11 Secao 7 — Alertas: tabela com colunas Severidade | Descricao via `autoTable`. Se `!isAdminOrDirector`, filtrar alertas relevantes ao proprio usuario
  - [x] 1.12 Footer em cada pagina: "ZmobCRM — Confidencial | Gerado por {generatedBy}" com numero de pagina
  - [x] 1.13 `doc.save(`central-de-comando-${dateStr}.pdf`)` ao final

- [x] **Task 2: Atualizar `lib/prefetch.ts`** (AC: 7 — necessario para TypeScript)
  - [x] 2.1 Adicionar entrada ao `routeImports`: `'command-center': () => import('@/features/command-center/CommandCenterPage')`
  - [x] 2.2 O tipo `RouteName` e derivado automaticamente de `keyof typeof routeImports` — sem alteracao necessaria no tipo

- [x] **Task 3: Atualizar `AppSidebar.tsx`** (AC: 5, 6, 7)
  - [x] 3.1 Importar icone `Command` de `lucide-react` (adicionar ao import existente). Alternativa: `LayoutGrid` se `Command` visualmente inadequado. NAO usar `LayoutDashboard` (ja utilizado por "Visao Geral")
  - [x] 3.2 Adicionar item ao `NAV_ITEMS` logo apos o item de Dashboard (`{ to: '/dashboard', ... }`):
    ```typescript
    { to: '/command-center', icon: Command, label: 'Central de Comando', prefetch: 'command-center' }
    ```
  - [x] 3.3 Verificar que o item ativa corretamente: a logica existente usa `pathname === item.to` — `/command-center` e rota exata, sem subrotas em CC-2

- [x] **Task 4: Conectar botao PDF em `CommandCenterPage.tsx`** (AC: 1)
  - [x] 4.1 Importar `generateCommandCenterPDF` de `@/features/command-center/utils/generateCommandCenterPDF`
  - [x] 4.2 Adicionar estado `isPDFGenerating: boolean` para feedback visual no botao
  - [x] 4.3 Criar handler `handleExportPDF` que chama `generateCommandCenterPDF` com dados do hook e trata erros com `try/catch`
  - [x] 4.4 Conectar handler ao botao PDF placeholder existente no header. Mostrar spinner/texto "Gerando..." durante geracao

- [x] **Task 5: Testes** (AC: 8)
  - [x] 5.1 Criar `features/command-center/__tests__/generateCommandCenterPDF.test.ts`
  - [x] 5.2 Mock de `jspdf` e `jspdf-autotable` (mesma abordagem dos testes existentes)
  - [x] 5.3 Teste de nao-throw: funcao chamada com dados validos nao lanca excecao
  - [x] 5.4 Teste de RBAC: com `isAdminOrDirector=false`, ranking contem apenas dados do proprio usuario; alertas filtrados
  - [x] 5.5 Teste de dados vazios/null: funcao deve degradar gracefully (ex: ranking vazio = secao com "Sem dados")
  - [x] 5.6 Rodar `npm test` e confirmar que todos os testes passam

## Dev Notes

### Padrao de PDF Export — Referencia Completa

**Arquivo de referencia 1:** `features/reports/utils/generateReportPDF.ts`

Este e o padrao canônico a seguir para `generateCommandCenterPDF.ts`:

```typescript
// Lazy load — nao inclui jsPDF no bundle inicial (~200KB economizados)
const [{ jsPDF }, autoTableModule] = await Promise.all([
  import('jspdf'),
  import('jspdf-autotable')
]);
const autoTable = autoTableModule.default;

const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.width;
const pageHeight = doc.internal.pageSize.height;
const margin = 15;
const contentWidth = pageWidth - margin * 2;
```

**Color palette hardcoded (nao usa CSS vars — jsPDF nao acessa CSS):**
```typescript
// Copiar exatamente de generateReportPDF.ts
const COLORS = {
  primary: [15, 23, 42] as [number, number, number],      // slate-900
  secondary: [100, 116, 139] as [number, number, number], // slate-500
  blue: [59, 130, 246] as [number, number, number],       // blue-500
  emerald: [16, 185, 129] as [number, number, number],    // emerald-500
  purple: [139, 92, 246] as [number, number, number],     // violet-500
  orange: [249, 115, 22] as [number, number, number],     // orange-500
  red: [239, 68, 68] as [number, number, number],         // red-500
  bgLight: [248, 250, 252] as [number, number, number],   // slate-50
  border: [226, 232, 240] as [number, number, number],    // slate-200
  white: [255, 255, 255] as [number, number, number],
};
```

**Arquivo de referencia 2:** `features/prospecting/utils/generateMetricsPDF.ts`

Padrao para interface de opcoes de geracao:
```typescript
interface GenerateCommandCenterPDFOptions {
  kpis: { /* 8 valores KPI */ }
  pulse: PulseSemaphore[]        // dados de CC-1 pulse rules
  forecast: { actual: number; goal: number }
  funnelData: { name: string; count: number }[]
  ranking: BrokerRankingItem[]   // leaderboard enriquecido de CC-1
  walletHealth: WalletHealthData
  prospectingSummary: ProspectingSummaryData
  alerts: AlertItem[]
  period: string
  boardName?: string
  generatedBy?: string
  isAdminOrDirector: boolean     // controla visibilidade de dados de outros corretores
}
```

**Nota sobre graficos no PDF:** jsPDF nao consegue renderizar SVG/Canvas diretamente. Funil e graficos de tendencia devem ser representados como tabelas de dados tabulares via `autoTable`. Isso e aceitavel para documento executivo — nao tentar capturar screenshot do chart.

### AppSidebar.tsx — Estado Atual

**Arquivo:** `components/layout/AppSidebar.tsx`

O array `NAV_ITEMS` atual (em ordem):
1. `/inbox` — Inbox (Inbox icon)
2. `/dashboard` — Visao Geral (LayoutDashboard icon) ← inserir novo item APOS este
3. `/boards` — Boards (KanbanSquare icon)
4. `/contacts` — Contatos (Users icon)
5. `/activities` — Atividades (CheckSquare icon)
6. `/prospecting` — Prospeccao (PhoneOutgoing icon)
7. `/reports` — Relatorios (BarChart3 icon)
8. `/settings` — Configuracoes (Settings icon)

**Novo item a inserir** (posicao 3, logo apos Dashboard):
```typescript
{ to: '/command-center', icon: Command, label: 'Central de Comando', prefetch: 'command-center' }
```

**Logica de ativo existente (nao alterar):**
```typescript
const isActive = pathname === item.to || (item.to === '/boards' && pathname === '/pipeline');
```
Para `/command-center` a comparacao `pathname === item.to` e suficiente — nao ha subrotas.

**Icone:** Importar `Command` de `lucide-react`. O import atual e:
```typescript
import { LayoutDashboard, KanbanSquare, Users, Settings, BarChart3, Inbox, CheckSquare, PanelLeftClose, PanelLeftOpen, PhoneOutgoing } from 'lucide-react';
```
Adicionar `Command` (ou `LayoutGrid`) ao import existente.

**ATENCAO:** O tipo `RouteName` em `lib/prefetch.ts` e:
```typescript
export type RouteName = keyof typeof routeImports;
```
O `NAV_ITEMS` array tem `prefetch: RouteName` — se `'command-center'` nao estiver em `routeImports`, TypeScript vai reclamar. Por isso `lib/prefetch.ts` DEVE ser atualizado ANTES de editar `AppSidebar.tsx`.

### lib/prefetch.ts — Adicao Necessaria

**Arquivo:** `lib/prefetch.ts`

O objeto `routeImports` atual nao contem `command-center`. Adicionar:
```typescript
const routeImports = {
  dashboard: () => import('@/features/dashboard/DashboardPage'),
  inbox: () => import('@/features/inbox/InboxPage'),
  boards: () => import('@/features/boards/BoardsPage'),
  contacts: () => import('@/features/contacts/ContactsPage'),
  settings: () => import('@/features/settings/SettingsPage'),
  activities: () => import('@/features/activities/ActivitiesPage'),
  reports: () => import('@/features/reports/ReportsPage'),
  notifications: () => import('@/features/notifications/NotificationsPage'),
  prospecting: () => import('@/features/prospecting/ProspectingPage'),
  'command-center': () => import('@/features/command-center/CommandCenterPage'), // ADICIONAR
} as const;
```

### RBAC no PDF

O RBAC da Central de Comando e herdado do Supabase RLS (org_id + owner). No contexto do PDF:
- `isAdminOrDirector: boolean` — disponivel no hook de auth ou passado via props de `CommandCenterPage.tsx`
- Se `isAdminOrDirector = false` (corretor): ranking exibe apenas linha do proprio corretor; alertas filtrados para apenas os que pertencem ao usuario logado
- Se `isAdminOrDirector = true` (diretor/admin): todos os dados sao exibidos
- Os dados ja chegam filtrados pelo RLS do Supabase — o filtro adicional no PDF e uma camada de UI para garantir que corretores nao vejam dados uns dos outros mesmo se obtiverem acesso ao objeto de dados

### Dados Disponıveis para o PDF (de `useCommandCenterMetrics`)

Os dados que a funcao de PDF precisa renderizar (vem do hook CC-1):
- `kpis.vgvPipeline` — VGV total em pipeline
- `kpis.commission` — Comissao gerada (`sum(wonDeals.value * commission_rate)`)
- `kpis.dealsWon` e `kpis.dealsSplit` — Negocios V/L
- `kpis.conversionRate` — Taxa de conversao
- `kpis.newContacts` — Contatos novos no periodo
- `kpis.callConnectionRate` — Ligacoes / Taxa de conexao
- `kpis.avgSalesCycle` — Ciclo medio em dias
- `kpis.walletHealth` — Saude da carteira (%)
- `pulse` — Array de semaforos por KPI (verde/amarelo/vermelho)
- `forecast` — `{ actual, goal }` para barra de progresso
- `funnelData` — Array de `{ name: string; count: number }` por stage
- `leaderboard` — Array de corretores com ligacoes enriquecidas
- `walletDistribution` — Distribuicao ativos/inativos/churn + HOT/WARM/COLD
- `prospectingSummary` — Total ligacoes, taxa conexao, agendamentos, propostas enviadas
- `alerts` — Lista de alertas com severidade e descricao

### Estrutura de Arquivos

```
features/command-center/
  utils/
    generateCommandCenterPDF.ts   ← CRIAR (esta story)
    pulse-rules.ts                ← ja existe (CC-1)
    alert-rules.ts                ← ja existe (CC-1)
  __tests__/
    generateCommandCenterPDF.test.ts  ← CRIAR (esta story)
    useCommandCenterMetrics.test.ts   ← ja existe (CC-1)

components/layout/
  AppSidebar.tsx                  ← EDITAR (adicionar item de menu)

lib/
  prefetch.ts                     ← EDITAR (adicionar 'command-center')
```

### Testing

**Framework:** Vitest + Testing Library (padrao do projeto)

**Localizacao dos testes:** `features/command-center/__tests__/`

**Mock de jsPDF:**
```typescript
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { width: 210, height: 297 } },
    setFillColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    roundedRect: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage: vi.fn(),
  }))
}));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
```

**Cenarios de teste obrigatorios:**
1. Funcao nao lanca excecao com dados validos completos
2. `isAdminOrDirector=false`: ranking filtrado + alertas filtrados
3. Dados vazios (ranking vazio, sem alertas): secoes renderizadas com mensagem "Sem dados"
4. `doc.save()` chamado com nome de arquivo correto

**Comandos:**
```bash
npm test                   # todos os testes
npm run typecheck          # verificar tipos
npm run lint               # ESLint
```

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend + Integration
- **Secondary Type(s):** — (sem mudancas de schema ou API)
- **Complexity:** Low-Medium (2 arquivos novos, 2 arquivos editados, escopo bem definido)

**Specialized Agent Assignment:**

Primary Agents:
- @dev (implementacao e pre-commit reviews)
- @ux-expert (validar icone e posicao do item no menu — UX consistency)

Supporting Agents:
- @qa (pdf_output_validation, integration_test)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): Rodar antes de marcar story completa — `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): Rodar antes de criar pull request — `coderabbit --prompt-only --base main`

**Self-Healing Configuration:**

Expected Self-Healing:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutos
- Severity Filter: CRITICAL only

Predicted Behavior:
- CRITICAL issues: auto_fix (ate 2 iteracoes)
- HIGH issues: document_only (anotado em Dev Notes)
- MEDIUM: ignore
- LOW: ignore

**CodeRabbit Focus Areas:**

Primary Focus:
- Lazy load correto de jsPDF (sem import estatico que inflaria o bundle)
- RBAC filtering no PDF: verificar que `isAdminOrDirector=false` remove dados de outros corretores
- TypeScript sem erros na edicao do `NAV_ITEMS` (RouteName type constraint)

Secondary Focus:
- Acessibilidade do item de menu (aria-label, focus-visible-ring — ja presentes no padrao NavItem)
- Cobertura de testes para cenarios de dados vazios e RBAC

## File List

> Preenchido pelo @dev durante implementacao

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/command-center/utils/generateCommandCenterPDF.ts` | CRIADO | Funcao principal de geracao PDF com 7 secoes, RBAC, lazy load jsPDF |
| `features/command-center/__tests__/generateCommandCenterPDF.test.ts` | CRIADO | 6 testes: no-throw, save filename, RBAC ranking, RBAC alerts, empty data, admin visibility |
| `components/layout/AppSidebar.tsx` | EDITADO | Importado `Command` icon, adicionado item "Central de Comando" apos Dashboard |
| `lib/prefetch.ts` | EDITADO | Adicionado `'command-center'` ao routeImports |
| `features/command-center/CommandCenterPage.tsx` | EDITADO | Importado generateCommandCenterPDF + useAuth, adicionado isPDFGenerating state + handleExportPDF handler, conectado ao botao |

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-15 | 1.0 | Story criada a partir do Epic CC | @sm (River) |
| 2026-03-15 | 1.1 | PO review fixes: `jest.mock` → `vi.mock` (Vitest), sidebar/prefetch confirmado como escopo exclusivo de CC-3 (removido de CC-2 AC-13) | @sm (River) |
| 2026-03-15 | 1.2 | PO re-validação: 10/10 GO — Status Draft → Ready | @po (Pax) |
| 2026-03-15 | 2.0 | Implementation complete — all 5 tasks done, 6/6 tests passing | @dev (Dex) |

---

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- jsPDF mock required class syntax (arrow fn fails with `new`) — fixed in test

### Completion Notes List
- `generateCommandCenterPDF.ts`: 7 secoes (Header, KPIs 2x4, Forecast bar, Funnel table, Ranking table, Wallet+Prospecting cards, Alerts table) + footer all pages
- Lazy load via `Promise.all([import('jspdf'), import('jspdf-autotable')])` — zero bundle impact
- RBAC: non-admin sees only 1 leaderboard row + `underperforming_brokers` alerts filtered
- `AppSidebar.tsx`: `Command` icon, positioned after Dashboard, uses existing `isActive` logic
- `lib/prefetch.ts`: `'command-center'` entry added, `RouteName` type auto-derived
- `CommandCenterPage.tsx`: `handleExportPDF` with `isPDFGenerating` state, `useAuth` for RBAC + generatedBy
- 6 tests passing: no-throw, save filename, RBAC ranking filter, RBAC alert filter, empty data graceful, admin full visibility
- Pre-existing failures: `directorAssignment.test.tsx` (5 tests, unrelated to CC-3)
- Typecheck: 0 errors in CC-3 files (pre-existing `.next/types` duplicate errors only)
- ESLint: 0 errors, 1 pre-existing warning (funnelData in useCallback deps)

### QA Results
_A preencher pelo @qa_
