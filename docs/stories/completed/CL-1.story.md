# Story CL-1: Listas de Contatos

## Metadata
- **Story ID:** CL-1
- **Epic:** CL (Contact Lists)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 13 (L)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, pattern_validation, migration_review]

## Story

**As a** corretor/gestor do ZmobCRM que importa leads de diferentes fontes,
**I want** criar listas nomeadas (ex: "Lista XP", "Lista Medicos", "Lista Execute") e organizar contatos nessas listas,
**so that** possa segmentar minha base por origem/perfil e trabalhar cada grupo de forma direcionada.

## Descricao

Hoje o CRM possui filtros avancados (classificacao, temperatura, source, etc.) mas nao tem listas customizaveis persistentes. O usuario importa CSVs de diferentes fontes (XP, medicos, executivos) e perde a organizacao por origem apos o import.

**Pesquisa de mercado (Atlas - 2026-03-11):** Benchmark de 8 CRMs (HubSpot, Pipedrive, Salesforce, Kommo, Close, RD Station, Agendor, Bitrix24). Padrao recomendado: listas estaticas nomeadas com sidebar na pagina de contatos (modelo HubSpot simplificado). Relatorio completo em `docs/research/2026-03-11-contact-lists-crm-benchmark/`.

**Decisoes de produto:**
- Listas sao **estaticas** (curadas manualmente, sem query builder dinamico)
- Um contato pode pertencer a **multiplas listas**
- Listas sao **compartilhadas** com toda a equipe (org-level)
- CRUD manual + vinculacao no import CSV
- Sidebar na ContactsPage como ponto de acesso principal

## Acceptance Criteria

- [x] AC1: Given a pagina de contatos, when carregada, then sidebar esquerda exibe lista de listas com nome e contagem de membros
- [x] AC2: Given a sidebar, when usuario clica em "Nova Lista", then modal abre para criar lista com nome (obrigatorio) e cor (opcional, default cinza)
- [x] AC3: Given uma lista existente, when usuario clica no nome na sidebar, then a tabela de contatos filtra para mostrar apenas membros daquela lista
- [x] AC4: Given contatos selecionados na tabela (bulk selection), when usuario clica "Adicionar a Lista", then dropdown mostra listas disponiveis e adiciona contatos selecionados a lista escolhida
- [x] AC5: Given um contato membro de uma lista, when usuario remove da lista (via bulk action ou dentro da lista), then contato e removido da lista mas NAO deletado do sistema
- [x] AC6: Given o wizard de import CSV, when usuario esta no step de upload/confirmacao, then pode selecionar ou criar uma lista para vincular todos os contatos importados
- [x] AC7: Given uma lista na sidebar, when usuario clica no icone de editar, then pode renomear, mudar cor ou excluir a lista (excluir remove associacoes, NAO contatos)
- [x] AC8: Given a sidebar com filtro "Todas" selecionado (default), when pagina carregada, then mostra todos os contatos normalmente (comportamento atual preservado)
- [x] AC9: Given a sidebar, when exibida, then mostra opcao "Sem Lista" que filtra contatos que nao pertencem a nenhuma lista

## Scope

### IN
- Migration: tabelas `contact_lists` e `contact_list_members` com RLS
- Sidebar de listas na ContactsPage (layout com sidebar + tabela)
- CRUD de listas (criar, renomear, mudar cor, excluir)
- Adicionar/remover contatos de listas (individual e bulk)
- Filtro da tabela por lista selecionada
- Integracao com import CSV (vincular a lista no wizard)
- Contagem de membros por lista

### OUT
- Listas dinamicas (baseadas em filtros automaticos) — futuro
- Tags como mecanismo complementar — futuro
- Drag-and-drop de contatos entre listas
- Compartilhamento seletivo de listas (por usuario) — todas sao org-level
- Integracao com IA tools (nesta story)
- Export de lista especifica (usa export existente com filtro ativo)

## Tasks

### Task 1 — Migration: Tabelas contact_lists e contact_list_members (AC1-AC9)
- [x] Task 1.1: Criar migration com tabela `contact_lists`:
  ```sql
  CREATE TABLE contact_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [x] Task 1.2: Criar tabela `contact_list_members`:
  ```sql
  CREATE TABLE contact_list_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    added_by UUID REFERENCES profiles(id),
    UNIQUE(list_id, contact_id)
  );
  ```
- [x] Task 1.3: RLS policies (org-level visibility, mesma politica de contacts)
- [x] Task 1.4: Indexes: `(organization_id)` em contact_lists, `(list_id)`, `(contact_id)` em contact_list_members
- [x] Task 1.5: Trigger `updated_at` em contact_lists

### Task 2 — Service Layer: Supabase CRUD (AC1-AC7)
- [x] Task 2.1: Criar `lib/supabase/contact-lists.ts` com funcoes:
  - `fetchContactLists(orgId)` — retorna listas com contagem de membros
  - `createContactList({ name, color, description })` — cria lista
  - `updateContactList(id, { name, color, description })` — atualiza
  - `deleteContactList(id)` — deleta lista (CASCADE remove membros)
  - `addContactsToList(listId, contactIds[])` — adiciona membros (upsert)
  - `removeContactsFromList(listId, contactIds[])` — remove membros
  - `fetchContactsByList(listId)` — retorna IDs de contatos da lista
  - `fetchContactsWithoutList(orgId)` — retorna contatos sem nenhuma lista
- [x] Task 2.2: Criar React Query hooks em `lib/query/hooks/useContactListsQuery.ts`

### Task 3 — Types (AC1-AC9)
- [x] Task 3.1: Adicionar interfaces em `types/types.ts`:
  ```typescript
  export interface ContactList {
    id: string;
    organizationId: string;
    name: string;
    color: string;
    description?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt?: string;
    memberCount?: number; // Computed, nao na tabela
  }
  ```

### Task 4 — Sidebar de Listas na ContactsPage (AC1, AC3, AC8, AC9)
- [x] Task 4.1: Criar componente `features/contacts/components/ContactListsSidebar.tsx`:
  - Header "Listas" com botao "+" para criar
  - Item "Todas" (default, sem filtro) com contagem total
  - Item "Sem Lista" com contagem de orfaos
  - Lista de listas com nome, cor (bolinha), contagem de membros
  - Item ativo com highlight visual
  - Icone de editar (hover) em cada lista
- [x] Task 4.2: Ajustar layout da ContactsPage para sidebar + tabela (flex row)
- [x] Task 4.3: Adicionar state `selectedListId` no controller (null = Todas)
- [x] Task 4.4: Filtrar contatos pela lista selecionada

### Task 5 — Modal CRUD de Lista (AC2, AC7)
- [x] Task 5.1: Criar `features/contacts/components/ContactListModal.tsx`:
  - Modo criar: campo nome (obrigatorio) + seletor de cor (palette de 8-10 cores)
  - Modo editar: mesmos campos preenchidos + botao excluir
  - Confirmacao ao excluir ("Remover lista X? Contatos NAO serao excluidos")
- [x] Task 5.2: Integrar modal com sidebar (botao + e icone editar)

### Task 6 — Bulk Actions: Adicionar/Remover de Lista (AC4, AC5)
- [x] Task 6.1: Adicionar botao "Adicionar a Lista" na BulkActionsToolbar existente
- [x] Task 6.2: Dropdown com listas disponiveis ao clicar
- [x] Task 6.3: Adicionar opcao "Remover da Lista" (visivel apenas quando filtrando por lista)
- [x] Task 6.4: Feedback via toast apos operacao

### Task 7 — Integracao com Import CSV (AC6)
- [x] Task 7.1: Adicionar step ou opcao no wizard de import (ContactsImportExportModal):
  - Dropdown "Vincular a lista" no step de confirmacao
  - Opcao "Criar nova lista" inline
  - Default: nenhuma lista (comportamento atual)
- [x] Task 7.2: Apos import, adicionar contatos importados a lista selecionada

### Task 8 — Quality Gate
- [x] Task 8.1: `npm run typecheck` passa sem erros
- [x] Task 8.2: `npm run lint` passa sem erros
- [x] Task 8.3: `npm test` passa sem regressoes (4 falhas pre-existentes em realtime tests)
- [x] Task 8.4: Migration aplicada no staging (`supabase db push`)

## Dev Notes

### Modelo de Dados
- Relacao N:N entre contacts e contact_lists via contact_list_members
- RLS org-level: mesma politica de contacts (usuario ve listas da sua org)
- CASCADE em contact_lists: deletar lista remove membros automaticamente
- CASCADE em contacts: deletar contato remove de todas as listas automaticamente
- UNIQUE(list_id, contact_id): previne duplicatas

### Contagem de Membros
- Usar subquery ou LEFT JOIN com COUNT no fetch de listas
- NAO armazenar contagem como campo (evita inconsistencia)

### Layout da ContactsPage
- Sidebar colapsavel (mobile: drawer ou hidden)
- Desktop: sidebar fixa ~240px + tabela flex-1
- Sidebar NAO substitui os filtros existentes — complementa

### Cores Sugeridas (Palette)
```
#6B7280 (cinza, default), #EF4444 (vermelho), #F59E0B (amarelo),
#10B981 (verde), #3B82F6 (azul), #8B5CF6 (roxo),
#EC4899 (rosa), #F97316 (laranja)
```

### Integracao com Import
- O wizard atual tem steps: upload → mapping → deal_mapping → confirm
- Adicionar seletor de lista no step "confirm" (antes de importar)
- Usar `addContactsToList()` apos batch insert dos contatos

### Referencia de Pesquisa
- `docs/research/2026-03-11-contact-lists-crm-benchmark/02-research-report.md`
- `docs/research/2026-03-11-contact-lists-crm-benchmark/03-recommendations.md`

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Full-Stack (migration + service + UI)
- Complexity: Medium (2 tabelas, CRUD, sidebar, integracao import)
- Secondary Types: Database, Frontend

**Specialized Agent Assignment:**
- Primary: @dev
- Supporting: @data-engineer (migration review), @qa (quality gate)

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 30 min
- Severity filter: [CRITICAL, HIGH]
- Behavior: CRITICAL -> auto_fix, HIGH -> auto_fix (iter < 2) else document_as_debt

**Focus Areas:**
- RLS policies: devem espelhar contacts (org-level)
- CASCADE behavior: deletar lista NAO deleta contatos
- Unique constraint: prevenir duplicatas em contact_list_members
- Import integration: nao quebrar fluxo existente
- Sidebar layout: nao quebrar responsividade existente

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Layout quebrar em mobile com sidebar | Media | Medio | Sidebar colapsavel/hidden em mobile |
| Performance com muitas listas | Baixa | Baixo | Listas sao org-level, volume pequeno (~50 max) |
| Import lento ao vincular lista | Baixa | Baixo | Batch insert de membros apos import |
| Filtro por lista + filtros avancados confusos | Media | Medio | Lista filtra primeiro, filtros avancados atuam sobre o resultado |

## Dependencies

- **Nenhuma dependencia de outras stories** — CL-1 e independente
- **Requer:** Schema de contacts existente (Epic 3 completo)
- **Requer:** Import CSV wizard existente (Story 3.5)
- **Requer:** BulkActionsToolbar existente (Story 3.5)

## Criteria of Done

- [x] Tabelas contact_lists e contact_list_members criadas com RLS
- [x] Sidebar de listas visivel na ContactsPage com contagem de membros
- [x] CRUD de listas funcional (criar, renomear, cor, excluir)
- [x] Adicionar/remover contatos de listas via bulk action
- [x] Filtro por lista funcional (clicar na sidebar filtra tabela)
- [x] Import CSV permite vincular contatos a uma lista
- [x] Filtro "Sem Lista" funcional
- [x] `npm run typecheck` passa
- [x] `npm run lint` passa
- [x] `npm test` passa sem regressoes
- [x] Migration testada localmente

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| supabase/migrations/20260313140000_create_contact_lists.sql | Created | Tabelas contact_lists e contact_list_members com RLS, indexes, trigger |
| supabase/migrations/20260314100000_cl1_qa_fixes.sql | Created | UNIQUE constraint (org_id, name), RPC count_contacts_without_list |
| lib/supabase/contact-lists.ts | Created | Service layer CRUD (fetchAll, create, update, delete, addContacts, removeContacts, fetchContactIdsByList, fetchContactIdsWithoutList, countContactsWithoutList) |
| lib/query/hooks/useContactListsQuery.ts | Created | React Query hooks (useContactLists, useContactListMembers, useCreateContactList, useUpdateContactList, useDeleteContactList, useAddContactsToList, useRemoveContactsFromList) |
| lib/query/hooks/index.ts | Modified | Export dos hooks de contact lists |
| types/types.ts | Modified | Interface ContactList + campos contactListId/noList em ContactsServerFilters |
| lib/supabase/contacts.ts | Modified | Filtros contactListId e noList em getAllPaginated |
| features/contacts/components/ContactListsSidebar.tsx | Created | Sidebar de listas com "Todas", "Sem Lista", listas nomeadas |
| features/contacts/components/ContactListModal.tsx | Created | Modal criar/editar/excluir lista com color picker |
| features/contacts/ContactsPage.tsx | Modified | Layout sidebar + tabela, integracao com list CRUD e bulk actions |
| features/contacts/hooks/useContactsController.ts | Modified | State selectedListId, contactLists, integra useContactLists |
| features/contacts/hooks/useContactSearch.ts | Modified | selectedListId param, contactListId/noList nos server filters |
| features/contacts/components/BulkActionsToolbar.tsx | Modified | Botao "Adicionar a Lista" com dropdown + "Remover da Lista" |
| features/contacts/components/ContactsImportExportModal.tsx | Modified | Seletor de lista no step confirm |
| features/contacts/hooks/useContactImportWizard.ts | Modified | importListId, availableLists, newListName + vincula lista apos import |

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-11 | @pm (Morgan) | Story criada com base em pesquisa de mercado (Atlas) e requisitos do usuario |
| 2026-03-11 | @po (Pax) | Validacao GO 10/10. Status Draft -> Ready. 3 obs LOW (RLS detail, mobile sidebar, lista+filtros interacao) |
| 2026-03-13 | @dev (Dex) | Implementacao Tasks 1-8: migration, service layer, types, sidebar, modal CRUD, bulk actions, import CSV. Typecheck + lint limpos. Testes sem regressao (4 falhas pre-existentes em realtime). Migration aplicada no staging. |
| 2026-03-14 | @po (Pax) | Verificacao PO: todos os 9 ACs cobertos pela implementacao. CONCERNS — documentacao desatualizada (ACs/CoD nao marcados, File List incompleta, Change Log inconsistente). |
| 2026-03-14 | @dev (Dex) | Correcoes de documentacao: ACs marcados [x], CoD marcados [x], File List atualizada (migration QA fixes), Change Log corrigido. Status InProgress -> InReview. |
| 2026-03-14 | @po (Pax) | Story fechada. Status InReview -> Done. Todos os ACs validados, implementacao completa. |

---
*Story gerada por @pm (Morgan) — Epic CL (Contact Lists)*
