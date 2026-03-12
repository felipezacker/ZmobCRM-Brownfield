# Story CP-5.7: Links Acionaveis no Drill-down Modal

## Metadata
- **Story ID:** CP-5.7
- **Epic:** CP-5 (Prospeccao — Rastreabilidade & Visao Gerencial)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 3 (S)
- **Wave:** 3
- **Assigned Agent:** @dev
- **Dependencies:** CP-5.4 (Done) — modal drill-down deve existir e estar funcional

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, pattern_validation, test_coverage]

## Story

**As a** diretor/admin do ZmobCRM,
**I want** clicar no nome do contato ou no badge de deal dentro do drill-down modal e ser levado diretamente ao detalhe,
**so that** eu consiga agir imediatamente sobre o que identifiquei na analise — sem precisar sair, navegar manualmente ate contatos ou pipeline, e procurar o registro.

## Descricao

O MetricsDrilldownModal (CP-5.4) e read-only. O diretor ve "Maria — Atendeu — Deal Vinculado" mas nao consegue clicar para ir ate a Maria ou ate o deal. Precisa fechar o modal, ir ate /contacts, buscar Maria, abrir o detalhe — friccao desnecessaria.

**Solucao:** Transformar nome do contato e badge de deal em links que abrem em nova aba.

| Elemento | Acao ao clicar | Rota |
|----------|---------------|------|
| Nome do contato | Abre ficha do contato em nova aba | `/contacts?cockpit={contact_id}` |
| Badge "Vinculado" (deal) | Abre cockpit do deal em nova aba | `/deals/{deal_id}/cockpit` |

**Infraestrutura existente:**
- `/contacts?cockpit={id}` — ja funciona. `useContactsController` le `searchParams.get('cockpit')` e abre `ContactDetailModal` automaticamente.
- `/deals/{dealId}/cockpit` — rota existente com pagina individual.

## Acceptance Criteria

- [ ] AC1: Nome do contato nas linhas da tabela do modal e um link clicavel (cursor pointer, hover underline)
- [ ] AC2: Clicar no nome do contato abre `/contacts?cockpit={contact_id}` em nova aba (target="_blank")
- [ ] AC3: Na view "Contatos Prospectados" (uniqueContacts), o nome do contato tambem e link clicavel com mesmo comportamento
- [ ] AC4: Badge "Vinculado" na coluna Deal e um link clicavel
- [ ] AC5: Clicar no badge "Vinculado" abre `/deals/{deal_id}/cockpit` em nova aba
- [ ] AC6: Contatos sem contact_id (null/unknown) NAO exibem link — mostram texto simples
- [ ] AC7: Activities/contatos sem deal_id continuam mostrando "—" (sem mudanca)
- [ ] AC8: Links incluem `rel="noopener"` por seguranca
- [ ] AC9: Testes unitarios cobrem: renderizacao dos links, href correto, target="_blank", casos null

## Scope

### IN
- Transformar nome do contato em `<a>` com href para `/contacts?cockpit={id}` e target="_blank"
- Transformar badge "Vinculado" em `<a>` com href para `/deals/{id}/cockpit` e target="_blank"
- Aplicar em ambas as views (tabela normal e tabela de contatos agrupados)
- Testes unitarios

### OUT
- Alterar comportamento do modal (continua aberto ao clicar — link abre em nova aba)
- Criar novas rotas ou paginas
- Adicionar preview/tooltip do contato ou deal
- Exportacao CSV (story separada)
- Busca/filtro dentro do modal (story separada)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| contact_id null em activities antigas | Media | Baixo | AC6: fallback para texto simples sem link |
| Rota /contacts?cockpit nao funcionar em nova aba | Baixa | Baixo | Rota ja testada — useContactsController le searchParams no mount |

## Business Value

- **Acao imediata:** Diretor identifica contato no drill-down e age com 1 clique
- **Reduz friccao:** Elimina navegacao manual ate /contacts ou /pipeline
- **Fluxo natural:** Analise (modal) → Acao (ficha do contato / deal cockpit) sem perder contexto (nova aba)

## Criteria of Done

- [x] Nome do contato e link clicavel em ambas as views do modal
- [x] Badge "Vinculado" e link clicavel para o deal cockpit
- [x] Links abrem em nova aba (target="_blank", rel="noopener")
- [x] Casos null tratados (sem link quando contact_id ou deal_id ausente)
- [x] Testes unitarios cobrindo links, hrefs, e casos null
- [x] Lint e typecheck passando
- [x] Nenhuma regressao no dashboard de prospeccao

## Tasks

- [x] Task 1: Links de contato na tabela padrao (AC: 1, 2, 6, 8)
  - [x] Subtask 1.1: Em `MetricsDrilldownModal.tsx`, transformar `getContactName(activity)` em `<a>` com `href="/contacts?cockpit={contact_id}"`, `target="_blank"`, `rel="noopener"`
  - [x] Subtask 1.2: Quando `contact_id` e null/undefined, manter texto simples sem link
  - [x] Subtask 1.3: Estilo: `hover:underline text-primary` para indicar que e clicavel

- [x] Task 2: Links de contato na view agrupada (AC: 3, 6, 8)
  - [x] Subtask 2.1: Na tabela de `uniqueContacts`, transformar `group.name` em `<a>` com `href="/contacts?cockpit={contactId}"`, `target="_blank"`, `rel="noopener"`
  - [x] Subtask 2.2: Quando `contactId === 'unknown'`, manter texto simples sem link

- [x] Task 3: Link no badge de deal (AC: 4, 5, 7, 8)
  - [x] Subtask 3.1: Na coluna Deal da tabela padrao, quando `activity.deal_id` existe, transformar badge "Vinculado" em `<a>` com `href="/deals/{deal_id}/cockpit"`, `target="_blank"`, `rel="noopener"`
  - [x] Subtask 3.2: Na coluna Deal da tabela de contatos agrupados, mesmo tratamento (porém deal_id vem do grupo — precisa armazenar o deal_id no ContactGroup)
  - [x] Subtask 3.3: Adicionar `dealId: string | null` ao tipo `ContactGroup` para propagar o deal_id no agrupamento

- [x] Task 4: Testes (AC: 9)
  - [x] Subtask 4.1: Teste: link do contato tem href correto com contact_id
  - [x] Subtask 4.2: Teste: link do contato tem target="_blank" e rel="noopener"
  - [x] Subtask 4.3: Teste: contato sem contact_id renderiza texto sem link
  - [x] Subtask 4.4: Teste: badge deal tem href correto com deal_id
  - [x] Subtask 4.5: Teste: activity sem deal_id mostra "—"
  - [x] Subtask 4.6: Teste: view uniqueContacts com link no nome do contato

## Dev Notes

### Unico arquivo modificado

`features/prospecting/components/MetricsDrilldownModal.tsx` — todas as mudancas sao neste arquivo + testes.

### ContactGroup precisa de dealId

O tipo `ContactGroup` atual tem `dealLinked: boolean`. Para linkar ao deal, precisamos do ID real. Mudar para:

```typescript
interface ContactGroup {
  contactId: string
  name: string
  calls: number
  predominantOutcome: string
  dealLinked: boolean
  dealId: string | null  // NOVO — primeiro deal_id encontrado no grupo
}
```

No agrupamento, salvar o primeiro `deal_id` encontrado:
```typescript
if (act.deal_id && !existing.dealId) existing.dealId = act.deal_id
```

### Pattern de link

```tsx
{activity.contact_id && activity.contact_id !== 'unknown' ? (
  <a
    href={`/contacts?cockpit=${activity.contact_id}`}
    target="_blank"
    rel="noopener"
    className="hover:underline text-primary"
  >
    {getContactName(activity)}
  </a>
) : (
  <span className="text-secondary-foreground">{getContactName(activity)}</span>
)}
```

### Testing

- **Local dos testes:** `features/prospecting/__tests__/metricsDrilldown.test.tsx` (adicionar ao existente)
- **Estimativa:** ~8 testes adicionais
- **Verificar:** `getByRole('link')`, `getAttribute('href')`, `getAttribute('target')`

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (links + acessibilidade)
- **Complexity:** Low — 1 arquivo modificado, patterns simples

**CodeRabbit Focus Areas:**

Primary Focus:
- Seguranca: `rel="noopener"` em todos os links target="_blank"
- Acessibilidade: links devem ter texto descritivo (ja tem — nome do contato)

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-12 | 1.0 | Story criada | @pm (Morgan) |
| 2026-03-12 | 1.1 | Validacao GO (10/10). SF-1: multi-deal por contato captura apenas primeiro — aceitavel v1. Status Draft → Ready. | @po (Pax) |
| 2026-03-12 | 1.2 | Implementation complete. All tasks done, 8 tests added, 1079/1079 passing. Status Ready → Ready for Review. | @dev (Dex) |
| 2026-03-12 | 1.3 | QA PASS, PR #36 merged to main. Status Ready for Review → Done. | @po (Pax) |

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A — zero issues during implementation

### Completion Notes List
- All 4 tasks + 12 subtasks completed
- 8 new tests added (38 total in file), all passing
- 1079/1079 tests passing across 96 test files (zero regressions)
- Lint and typecheck clean
- ContactGroup type extended with `dealId: string | null`

### File List
| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/MetricsDrilldownModal.tsx` | Modificado | Links em nome contato + badge deal |
| `features/prospecting/__tests__/metricsDrilldown.test.tsx` | Modificado | Testes para links |

## QA Results

**Reviewer:** @qa (Quinn) | **Date:** 2026-03-12 | **Verdict:** PASS

**AC Traceability:** 9/9 PASS — all acceptance criteria verified in code and tests.

**Test Coverage:** 8 new tests (38 total in file), 1079/1079 suite-wide. Covers: link rendering, href correctness, target/rel attributes, null/unknown fallbacks for both views.

**Security:** `rel="noopener"` on all 4 link points. Same-origin URLs. No XSS vectors.

**Findings:**

| Severity | Description | Action |
|----------|-------------|--------|
| LOW | No dedicated test for `contactId === 'unknown'` in grouped view fallback | Acceptable v1 — indirectly covered |

**Regression:** Zero failures across 96 test files.

---

*Story gerada por @pm (Morgan) — Epic CP-5*
