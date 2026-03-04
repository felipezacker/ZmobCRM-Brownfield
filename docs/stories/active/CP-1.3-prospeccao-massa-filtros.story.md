# Story CP-1.3: Prospeccao em Massa — Filtros e Importacao para Fila

## Metadata
- **Story ID:** CP-1.3
- **Epic:** CP (Central de Prospeccao)
- **Status:** Ready for Review
- **Owner:** (unassigned)
- **Executor:** @dev
- **Quality Gate:** @architect
- **Quality Gate Tools:** [code_review, performance_check, rls_validation]
- **Estimated Hours:** 12-16
- **Priority:** P2

## Descricao

Permitir ao corretor filtrar contatos por criterios avancados (stage, temperature, classificacao, fonte, tags, owner, ultimo contato) e importa-los em lote para a fila de prospeccao. A funcionalidade reutiliza padroes de filtros existentes na ContactsPage. Diretor pode criar filas para seus corretores. Limite de 100 contatos por sessao para performance.

## Acceptance Criteria

- [ ] AC1: Painel de filtros na pagina de prospeccao com os criterios: stage, temperature, classification, source, tags, last_activity_date
- [ ] AC2: Filtro "Sem atividade ha X dias" — contatos que nao tem activity registrada nos ultimos X dias (default 30)
- [ ] AC3: Filtro por owner_id (diretor/admin podem filtrar por corretor especifico)
- [ ] AC4: Resultado dos filtros exibe lista de contatos com preview (nome, telefone, stage, temperature, dias desde ultimo contato)
- [ ] AC5: Checkbox individual e "Selecionar todos" para selecao em lote
- [ ] AC6: Botao "Adicionar a Fila (N contatos)" com preview de quantidade
- [ ] AC7: Ao adicionar, contatos vao para a CallQueue existente (CP-1.1) sem duplicatas
- [ ] AC8: Limite de 100 contatos por sessao — ao exceder, mostrar aviso e permitir selecao parcial
- [ ] AC9: Diretor pode criar fila e atribuir a um corretor especifico da org (org-wide, sem team_id)
- [ ] AC10: Contatos sem telefone sao exibidos com badge "Sem telefone" e desabilitados para selecao
- [ ] AC11: Filtros persistem durante a sessao (nao resetam ao navegar)
- [ ] AC12: Performance: query com filtros retorna em < 2s para 10.000 contatos

## Escopo

### IN
- Painel de filtros (reutilizar padroes da ContactsPage)
- Filtros: stage, temperature, classification, source, tags, owner, dias sem atividade
- Selecao em lote (checkbox all/individual)
- Acao "Adicionar a Fila" com validacao de duplicatas e limite
- Diretor: filtro por corretor, atribuicao de fila
- Badge "Sem telefone" para contatos sem phone

### OUT
- Filtros salvos/favoritos
- Import de CSV/planilha
- Filtros por campos customizados
- Segmentacao automatica por IA

## Dependencias
- **Blocked by:** CP-1.1 (call queue para receber os contatos)
- **Blocks:** Nenhuma

## Tasks / Subtasks

### Painel de Filtros (AC: 1, 2, 3, 11)
- [x] 1. Criar `features/prospecting/components/ProspectingFilters.tsx`:
  - Dropdown: stage (LEAD, MQL, PROSPECT, CUSTOMER) — multi-select
  - Dropdown: temperature (HOT, WARM, COLD) — multi-select
  - Dropdown: classification (COMPRADOR, VENDEDOR, etc.) — multi-select
  - Dropdown: source (WEBSITE, LINKEDIN, REFERRAL, MANUAL) — multi-select
  - Input: tags (autocomplete com tags existentes)
  - Dropdown: owner (so para diretor/admin) — lista de corretores da org
  - Input numerico: "Sem atividade ha X dias" (default 30)
  - Botao "Aplicar Filtros" e "Limpar"
- [x] 2. Reutilizar constants de `features/contacts/constants.ts`: `CLASSIFICATION_LABELS`, `SOURCE_LABELS`, `TEMPERATURE_CONFIG`, `STAGE_LABELS`
- [x] 3. Persistir filtros em state (nao resetar ao navegar)

### Query de Contatos com Filtros (AC: 4, 10, 12)
- [x] 4. Criar `features/prospecting/hooks/useProspectingFilteredContacts.ts`:
  - Query Supabase com filtros dinamicos
  - Join com `contact_phones` para telefone principal
  - Left join com `activities` para calcular dias desde ultimo contato
  - Filtro "sem atividade ha X dias": `WHERE NOT EXISTS (SELECT 1 FROM activities WHERE contact_id = c.id AND date > now() - interval 'X days')`
  - RBAC: corretor (owner_id = auth.uid()), diretor/admin (org-wide via `is_admin_or_director()`)
  - Paginacao: 50 por pagina
  - Marcar contatos sem telefone (`has_phone: boolean`)
- [x] 5. Otimizar query — usar indexes existentes:
  - `idx_contacts_org_owner` (organization_id, owner_id)
  - `idx_activities_contact_id` (contact_id)
  - `idx_activities_date` (date DESC)

### Lista de Resultados com Selecao (AC: 4, 5, 6, 7, 8, 10)
- [x] 6. Criar `features/prospecting/components/FilteredContactsList.tsx`:
  - Lista de contatos com: checkbox, nome, telefone, stage badge, temperature badge, dias desde ultimo contato
  - Badge "Sem telefone" com checkbox desabilitado
  - Header com "Selecionar todos" (so contatos com telefone)
  - Counter: "N selecionados de M contatos"
- [x] 7. Botao "Adicionar a Fila (N)" — integra com `useProspectingQueue` de CP-1.1:
  - Verifica duplicatas (nao adicionar contato ja na fila)
  - Verifica limite de 100: se exceder, mostrar dialog "Limite de 100 contatos. Selecione menos ou remova contatos da fila atual."
  - Toast de confirmacao: "N contatos adicionados a fila"

### Atribuicao pelo Diretor (AC: 9)
- [x] 8. Quando role = diretor/admin, exibir dropdown "Atribuir fila para:" com lista de corretores da org
- [x] 9. Ao atribuir, inserir contatos na tabela `prospecting_queues` com `owner_id` do corretor e `assigned_by` do diretor
- [x] 10. Notificacao ao corretor quando recebe fila atribuida (pode ser via polling ou banner na pagina de prospeccao)

### Testes
- [x] 11. Testar filtros individuais e combinados
- [x] 12. Testar "sem atividade ha X dias"
- [x] 13. Testar selecao em lote e limite de 100
- [x] 14. Testar duplicatas (adicionar contato ja na fila)
- [x] 15. Testar RBAC dos filtros (corretor vs diretor)
- [x] 16. Testar badge "sem telefone"
- [ ] 17. Testar performance com volume (usar staging com dados reais)

## Notas Tecnicas

### Padroes existentes
- `features/contacts/ContactsPage.tsx` tem filtros similares — reutilizar padroes visuais
- `features/contacts/hooks/useContactsController.ts` tem logica de query com filtros — referencia
- `features/contacts/constants.ts` tem labels para stage, temperature, classification, source — **importar diretamente**
- `features/contacts/components/ContactsStageTabs.tsx` tem stage filters — referencia

### Schema DB
- `contacts` com indexes: `idx_contacts_org_owner`, `idx_contacts_lead_score_org`
- `contact_phones` com FK `contact_id` e campo `is_primary`
- `activities` com indexes: `idx_activities_contact_id`, `idx_activities_date`
- Query "sem atividade ha X dias" usa NOT EXISTS subquery (performante com index)

### Performance
- Paginacao server-side (50 por pagina)
- Filtros aplicados na query Supabase (nao client-side)
- Indexes existentes cobrem os filtros principais
- Limite de 100 contatos na fila previne problemas de memoria

---

## File List

| File | Status | Notes |
|------|--------|-------|
| features/prospecting/components/ProspectingFilters.tsx | New | Painel de filtros com multi-select |
| features/prospecting/components/FilteredContactsList.tsx | New | Lista com selecao em lote e limite 100 |
| features/prospecting/hooks/useProspectingFilteredContacts.ts | New | Hook com TanStack Query |
| features/prospecting/ProspectingPage.tsx | Modified | Integrar filtros + atribuicao diretor |
| lib/supabase/prospecting-filtered-contacts.ts | New | Service Supabase para RPC filtrada |
| lib/supabase/prospecting-queues.ts | Modified | addBatchToQueue + getQueueContactIds |
| lib/query/hooks/useProspectingQueueQuery.ts | Modified | useAddBatchToProspectingQueue + useQueueContactIds |
| supabase/migrations/20260303210000_rpc_prospecting_filtered_contacts.sql | New | RPC com RBAC e filtros server-side |
| features/prospecting/__tests__/prospectingFilters.test.tsx | New | 19 testes de filtros |
| features/prospecting/__tests__/filteredContactsList.test.tsx | New | 18 testes de lista/selecao |
| features/prospecting/__tests__/useProspectingFilteredContacts.test.ts | New | 10 testes do hook |

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Filtros funcionais com todos os criterios
- [ ] Selecao em lote com validacao de duplicatas e limite
- [ ] RBAC validado (corretor/diretor/admin)
- [ ] Performance < 2s com dados reais
- [ ] Dark mode testado
- [ ] No regressions
- [ ] Code reviewed

## Change Log

| Data | Autor | Mudanca |
|------|-------|---------|
| 2026-03-03 | @sm (River) | Story criada a partir do Epic CP |
| 2026-03-03 | @pm (Morgan) | Decisao: tabela DB `prospecting_queues` para atribuicao cross-user |
| 2026-03-03 | @data-engineer (Dara) | Review DB: RBAC org-wide (sem team_id), corrigir referências "equipe" para "org" |
| 2026-03-03 | @dev (Dex) | Implementação completa: 8 arquivos novos/modificados, 44 testes, RPC com RBAC |
| 2026-03-03 | @dev (Dex) | UX melhorias: ordenação phone-first, filtro "Só com telefone", select-all cross-page, 97 testes total |
| 2026-03-03 | @dev (Dex) | Status → Ready for Review |
