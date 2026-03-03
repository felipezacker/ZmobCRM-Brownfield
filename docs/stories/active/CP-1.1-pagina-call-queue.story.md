# Story CP-1.1: Pagina Central de Prospeccao + Call Queue / Power Dialer

## Metadata
- **Story ID:** CP-1.1
- **Epic:** CP (Central de Prospeccao)
- **Status:** InProgress
- **Owner:** (unassigned)
- **Executor:** @dev
- **Quality Gate:** @architect
- **Quality Gate Tools:** [code_review, pattern_validation, accessibility_check]
- **Estimated Hours:** 16-24
- **Priority:** P2

## Descricao

Criar uma nova pagina `/prospecting` dedicada no ZmobCRM com entrada no menu lateral (PRIMARY_NAV). A pagina implementa um sistema de Call Queue (fila de ligacoes) que permite ao corretor ligar para contatos em sequencia usando o discador nativo do dispositivo (`tel://`). Cada ligacao abre o CallModal adaptado com contexto do contato (nome, empresa, telefone, stage, temperature, ultimo contato). O corretor pode avancar (proximo), pular, ou encerrar a sessao.

Esta e a story fundacional do Epic CP — todas as outras stories dependem dela.

## Acceptance Criteria

- [ ] AC1: Rota `/prospecting` existe e renderiza a pagina ProspectingPage
- [ ] AC2: Item "Prospeccao" aparece no PRIMARY_NAV com icone `PhoneOutgoing` (Lucide), entre "Atividades" e "Mais"
- [ ] AC3: Navigation responsiva: desktop sidebar, tablet rail, mobile bottom nav
- [ ] AC4: Pagina exibe uma fila de contatos (call queue) com: nome, telefone principal, stage, temperature, status na fila (pendente/em andamento/concluido/pulado)
- [ ] AC5: Botao "Iniciar Sessao" ativa o modo power dialer — exibe o primeiro contato da fila e abre o CallModal
- [ ] AC6: Apos registrar outcome no CallModal, o sistema avanca automaticamente para o proximo contato da fila
- [ ] AC7: Botoes "Pular" (marca como pulado, avanca) e "Encerrar Sessao" (para a fila, mostra resumo)
- [ ] AC8: Resumo da sessao ao encerrar: total de ligacoes, conectadas, nao atendeu, puladas, tempo total
- [ ] AC9: Fila persiste entre navegacoes via tabela `prospecting_queues` no Supabase (RLS por organization_id)
- [ ] AC10: Adicionar contatos a fila manualmente (busca por nome/telefone, adiciona individual)
- [ ] AC11: RLS respeitado — corretor so ve seus contatos, diretor/admin ve todos da org (via `is_admin_or_director()`)
- [ ] AC12: Dark mode + responsivo (mobile-first)

## Escopo

### IN
- Rota `/prospecting` com page.tsx e layout
- Novo item no PRIMARY_NAV (`navConfig.ts`)
- Tipo `PrimaryNavId` atualizado
- Componentes: `ProspectingPage`, `CallQueue`, `QueueItem`, `SessionSummary`
- Adaptacao do `CallModal` para receber contexto de prospeccao
- Adicionar contatos a fila manualmente
- Persistencia da fila via tabela DB
- RBAC na query de contatos
- Migration: criar tabela `prospecting_queues` no Supabase com RLS
- Migration: adicionar coluna `metadata JSONB` na tabela `activities` (para outcome estruturado)

### OUT
- Filtros avancados para prospeccao em massa (CP-1.3)
- Script guiado durante chamada (CP-1.2)
- Metricas de produtividade (CP-1.4)

## Dependencias
- **Blocked by:** Nenhuma
- **Blocks:** CP-1.2 (Script Guiado), CP-1.3 (Prospeccao em Massa), CP-1.4 (Metricas)

## Tasks / Subtasks

### Setup da Pagina (AC: 1, 2, 3)
- [x] 1. Criar `app/(protected)/prospecting/page.tsx` com componente ProspectingPage
- [x] 2. Criar `features/prospecting/ProspectingPage.tsx` (feature module)
- [x] 3. Atualizar `components/navigation/navConfig.ts`:
  - Adicionar `'prospecting'` ao type `PrimaryNavId`
  - Adicionar item: `{ id: 'prospecting', label: 'Prospeccao', href: '/prospecting', icon: PhoneOutgoing }`
  - Posicionar entre 'activities' e 'more'
- [x] 4. Import `PhoneOutgoing` do lucide-react no navConfig
- [x] 5. Verificar `NavigationRail.tsx`, `BottomNav.tsx`, `Layout.tsx` — confirmar que renderizam o novo item automaticamente
- [ ] 6. Testar navegacao em desktop, tablet e mobile

### Call Queue / Power Dialer (AC: 4, 5, 6, 7, 8, 9, 10)
- [x] 7. Criar `features/prospecting/components/CallQueue.tsx` — lista de contatos na fila
- [x] 8. Criar `features/prospecting/components/QueueItem.tsx` — item individual com nome, telefone, stage badge, temperature badge, status
- [x] 9. Criar `features/prospecting/components/AddToQueueSearch.tsx` — busca de contatos para adicionar a fila
- [x] 10. Criar `features/prospecting/hooks/useProspectingQueue.ts` — state management da fila:
  - `queue: QueueContact[]` com status (pending, in_progress, completed, skipped)
  - `currentIndex: number`
  - `sessionActive: boolean`
  - `startSession()`, `next()`, `skip()`, `endSession()`
  - Persistencia via tabela `prospecting_queues` no Supabase (RLS por organization_id)
  - Schema: `{ id, contact_id, owner_id, organization_id, status, position, session_id, assigned_by, created_at, updated_at }`
- [x] 11. Criar `features/prospecting/components/PowerDialer.tsx` — view do modo sessao ativa:
  - Exibe contato atual (nome, telefone, empresa, stage, temperature, historico resumido)
  - Botoes: Ligar (abre CallModal), Pular, Encerrar
  - Progress bar da fila (3/15 contatos)
- [x] 12. Integrar `CallModal` existente (`features/inbox/components/CallModal.tsx`):
  - Passar contexto do contato atual
  - No `onSave`, registrar activity (type='CALL') com metadata JSONB `{ outcome, duration_seconds }` e avancar para proximo contato
- [x] 13. Criar `features/prospecting/components/SessionSummary.tsx` — resumo ao encerrar sessao

### Migrations (AC: 9, pre-req para CP-1.4)
- [x] 13b. Criar migration `add_metadata_to_activities.sql`: adicionar coluna `metadata JSONB DEFAULT '{}'::jsonb` na tabela `activities`
- [x] 13c. Criar migration `create_prospecting_queues.sql`: tabela `prospecting_queues` com RLS e indexes
- [x] 13d. Atualizar `lib/supabase/activities.ts` para salvar metadata `{ outcome, duration_seconds }` no create de activities type='CALL'
- [x] 13e. Atualizar `types/types.ts` interface Activity para incluir `metadata?: Record<string, unknown>` e tornar `dealId` opcional (prospeccao pode nao ter deal)

### RBAC e Queries (AC: 11)
- [x] 14. Criar `features/prospecting/hooks/useProspectingContacts.ts` — query de contatos respeitando RBAC:
  - Corretor: `owner_id = auth.uid()`
  - Diretor/Admin: todos da org (via `is_admin_or_director()` — org-wide, sem team_id por enquanto)
  - Reutilizar padroes de `useContactsController.ts`
- [x] 15. Join com `contact_phones` para telefone principal (campo `phone_number`, NOT `phone`)

### Testes (AC: todos)
- [ ] 16. Testar navegacao (rota existe, nav item aparece)
- [ ] 17. Testar fluxo da fila: adicionar contato, iniciar sessao, ligar, registrar outcome, avancar, encerrar
- [ ] 18. Testar persistencia da fila (reload da pagina mantem estado)
- [ ] 19. Testar RBAC (corretor vs diretor vs admin)

## Notas Tecnicas

### Navegacao
- `navConfig.ts` e a fonte de verdade para todos os menus (desktop sidebar, tablet rail, mobile bottom nav)
- `PrimaryNavId` e um union type — adicionar `'prospecting'`
- Os componentes NavigationRail e BottomNav iteram sobre `PRIMARY_NAV` automaticamente
- `MoreMenuSheet` usa `SECONDARY_NAV` — nao precisa de mudanca

### CallModal existente
- Path: `features/inbox/components/CallModal.tsx`
- Interface: `CallModalProps { isOpen, onClose, onSave, contactName, contactPhone, suggestedTitle }`
- Output: `CallLogData { outcome, duration, notes, title }`
- 4 outcomes: connected, no_answer, voicemail, busy
- Timer inicia quando abre o discador (`tel://`)
- **Reutilizar diretamente** — nao recriar

### Schema DB
- `contacts`: id, name, stage (LEAD/MQL/PROSPECT/CUSTOMER), temperature (HOT/WARM/COLD), classification, source, owner_id, organization_id
- `contact_phones`: contact_id, **phone_number** (NOT phone), phone_type (CELULAR/COMERCIAL/RESIDENCIAL), is_primary (unique per contact), is_whatsapp, organization_id
- `activities`: type='CALL', contact_id, deal_id, owner_id, organization_id, date, completed
  - **DECISAO:** Adicionar coluna `metadata JSONB` para salvar outcome estruturado: `{ outcome: 'connected'|'no_answer'|'voicemail'|'busy', duration_seconds: number }`
  - Atualmente o outcome e salvo como texto livre no campo `description` — inutilizavel para aggregation
- Indexes existentes cobrem queries por organization_id, owner_id, contact_id
- RLS por organization_id em todas as tabelas

### Nova Tabela: `prospecting_queues`
- **DECISAO:** Usar tabela DB ao inves de localStorage (necessario para cross-user queue assignment em CP-1.3)
- Schema: `id UUID PK, contact_id UUID NOT NULL FK(contacts), owner_id UUID NOT NULL FK(profiles), organization_id UUID NOT NULL FK(organizations), status TEXT NOT NULL CHECK (pending/in_progress/completed/skipped), position INT NOT NULL DEFAULT 0, session_id UUID, assigned_by UUID FK(profiles), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ`
- RLS: `organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())` + `owner_id = auth.uid() OR is_admin_or_director(organization_id)` — **USAR PATTERN EXISTENTE, nao auth.jwt()**
- Index: `(owner_id, session_id, status)`, `(organization_id)`

### Migration necessaria
- `add_metadata_to_activities.sql`: `ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`
- `create_prospecting_queues.sql`: CREATE TABLE + RLS + indexes

### Layer Pattern (validado por @architect)
- O projeto segue um padrao de 3 camadas para data fetching:
  - `features/*/hooks/` — logica de UI e state management (chama lib/query/hooks)
  - `lib/query/hooks/` — wrappers TanStack Query (chama lib/supabase)
  - `lib/supabase/` — chamadas raw ao Supabase
- **SEGUIR ESTE PADRAO:** `useProspectingQueue.ts` (feature hook) → `useProspectingQueueQuery.ts` (TanStack) → `prospecting-queues.ts` (Supabase)
- **dealId:** Ao tornar opcional em `types/types.ts`, verificar consumidores existentes que assumem `activity.dealId` nao-null (ex: FocusContextPanel.tsx)

### Padroes existentes
- Feature modules em `features/{nome}/`
- Hooks customizados em `features/{nome}/hooks/`
- Componentes em `features/{nome}/components/`
- Dark mode: usar classes `dark:` do Tailwind
- Icons: Lucide React
- Constants: separar em `features/prospecting/constants.ts`

---

## File List

| File | Status | Notes |
|------|--------|-------|
| app/(protected)/prospecting/page.tsx | New | Rota da pagina |
| features/prospecting/ProspectingPage.tsx | New | Componente principal |
| features/prospecting/components/CallQueue.tsx | New | Lista da fila |
| features/prospecting/components/QueueItem.tsx | New | Item da fila |
| features/prospecting/components/PowerDialer.tsx | New | Modo sessao ativa |
| features/prospecting/components/SessionSummary.tsx | New | Resumo da sessao |
| features/prospecting/components/AddToQueueSearch.tsx | New | Busca para adicionar |
| features/prospecting/hooks/useProspectingQueue.ts | New | State da fila |
| features/prospecting/hooks/useProspectingContacts.ts | New | Query RBAC |
| lib/supabase/prospecting-queues.ts | New | Supabase raw calls (layer pattern) |
| lib/supabase/index.ts | Modified | Export prospectingQueuesService |
| lib/query/hooks/useProspectingQueueQuery.ts | New | TanStack Query wrapper (layer pattern) |
| lib/query/queryKeys.ts | Modified | prospectingQueue key adicionada |
| components/navigation/navConfig.ts | Modified | Novo item prospecting + PhoneOutgoing |
| supabase/migrations/20260303130000_add_metadata_to_activities.sql | New | Coluna metadata JSONB |
| supabase/migrations/20260303130001_create_prospecting_queues.sql | New | Tabela fila prospeccao |
| lib/supabase/activities.ts | Modified | Salvar metadata no create + transform |
| types/types.ts | Modified | Activity.dealId opcional, metadata, ProspectingQueueItem |
| features/activities/hooks/useActivitiesController.ts | Modified | Fix dealId fallback |
| features/boards/components/Modals/DealDetailModal.tsx | Modified | Fix dealId fallback |
| features/contacts/components/ContactDetailModal.tsx | Modified | Fix dealId fallback |
| features/dashboard/DashboardPage.tsx | Modified | Fix dealId fallback |

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Navegacao funcional em desktop, tablet e mobile
- [ ] Call queue com fluxo completo (add, start, call, next, skip, end)
- [ ] RBAC validado com dados reais em staging
- [ ] Dark mode testado
- [ ] No regressions nas paginas existentes
- [ ] Code reviewed

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @sm (River) | Story criada a partir do Epic CP |
| 2026-03-03 | @pm (Morgan) | Decisao: tabela DB ao inves de localStorage; metadata JSONB em activities |
| 2026-03-03 | @po (Pax) | Revalidacao pos-decisoes: 10/10 GO. Fix: migrations movidas de OUT para IN |
| 2026-03-03 | @data-engineer (Dara) | Review DB: fix RLS pattern (subquery, nao jwt), phone_number (nao phone), updated_at, dealId opcional, RBAC org-wide |
| 2026-03-03 | @architect (Aria) | Review arquitetura: layer pattern (lib/supabase + lib/query/hooks), alerta dealId consumidores, File List atualizado |
| 2026-03-03 | @dev (Dex) | Implementação: migrations, types, services, componentes, hooks, nav, RBAC. TypeScript + ESLint passando. |
