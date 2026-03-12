# Story CP-5.1: Vinculacao de Ligacoes a Deals e Notas Visiveis

## Metadata
- **Story ID:** CP-5.1
- **Epic:** CP-5 (Prospeccao — Rastreabilidade & Vinculacao)
- **Status:** Ready
- **Priority:** P1
- **Estimated Points:** 8 (M-L)
- **Wave:** 1
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, pattern_validation]

## Story

**As a** gestor/corretor do ZmobCRM,
**I want** que ligacoes feitas na Central de Prospeccao sejam automaticamente vinculadas aos deals abertos do contato e que as notas escritas durante a ligacao sejam visiveis no dashboard e no historico,
**so that** eu consiga rastrear o impacto da prospeccao nos negocios e nao perca contexto ao navegar entre prospeccao, contatos e pipeline.

## Descricao

Hoje a Central de Prospeccao opera como uma ilha de dados. Quando um corretor liga para um contato e registra notas no CallModal, a activity e criada com `contact_id` mas sem `deal_id`, e as notas ficam salvas no campo `description` sem serem exibidas de forma util na interface.

**Problemas identificados:**

1. **Sem vinculacao a deals:** `PowerDialer.handleCallSave()` (linha 131-148) cria a activity com `dealTitle: ''` e sem `dealId`. O service `activitiesService.create()` aceita `dealId` — o campo simplesmente nao e enviado.

2. **Notas invisiveis no dashboard:** `CallDetailsTable.tsx` mostra 5 colunas (Data, Corretor, Contato, Status, Duracao) mas nao tem coluna de notas. As notas estao no campo `description` da activity mas nao sao exibidas.

3. **Notas truncadas no historico:** `ContactHistory.tsx` (linha 63) exibe `description` com `line-clamp-1` — maximo 1 linha, sem opcao de expandir.

**Consequencias:**
- Na timeline do deal: ligacoes de prospeccao NAO aparecem (filtro `useActivitiesByDeal` depende de `dealId`)
- Gestores nao sabem quais ligacoes contribuiram para negocios
- Corretores perdem contexto ao revisitar contatos

**Solucao proposta:**

A) Ao salvar a ligacao no PowerDialer, buscar deals abertos do contato e vincular automaticamente ao deal mais recente. Se nao houver deals, activity fica sem dealId (comportamento atual).

B) Adicionar coluna de notas expandivel na CallDetailsTable.

C) Permitir expand/collapse de notas no ContactHistory.

## Acceptance Criteria

- [ ] AC1: Ao salvar uma ligacao no PowerDialer, se o contato tem deals abertos (nao won/lost), o `deal_id` do deal mais recente e automaticamente vinculado a activity criada
- [ ] AC2: Se o contato nao tem deals abertos, a activity e criada sem `deal_id` (comportamento atual preservado, sem erro)
- [ ] AC3: A `CallDetailsTable` exibe uma coluna "Notas" que mostra o texto truncado da `description` da activity, com opcao de expandir ao clicar
- [ ] AC4: O `ContactHistory` permite expandir/colapsar notas longas — ao clicar na nota truncada, exibe o texto completo
- [ ] AC5: Ligacoes de prospeccao vinculadas a um deal aparecem na timeline do deal (via `useActivitiesByDeal` existente — nenhuma alteracao no hook necessaria, apenas o dealId correto na activity)
- [ ] AC6: Quando um deal e criado via QuickActionsPanel apos uma ligacao, a activity da ligacao que acabou de ser feita e atualizada com o `deal_id` do novo deal

## Scope

### IN
- Buscar deals abertos do contato ao salvar ligacao no PowerDialer
- Vincular `deal_id` automaticamente (deal mais recente aberto)
- Adicionar coluna de notas na `CallDetailsTable` com expand/collapse
- Implementar expand/collapse de notas no `ContactHistory`
- Atualizar activity com `deal_id` quando deal e criado via QuickActionsPanel
- Testes unitarios para vinculacao e para componentes de UI

### OUT
- Seletor manual de deal no CallModal (over-engineering para MVP — auto-vinculacao e suficiente)
- Mudancas de schema/banco de dados (campo `deal_id` ja existe em `activities`)
- Mudancas no CallModal (inputs ja sao suficientes)
- Alteracoes em `activitiesService` (ja aceita `dealId`)
- Criacao automatica de deals
- Metricas de conversao prospeccao→deal (story futura CP-5.3)

## Dependencies

- Nenhuma story anterior bloqueia esta — CP-4 (epic anterior) esta Done
- `activitiesService.create()` ja aceita `dealId` (campo `deal_id` no banco)
- `useActivitiesByDeal` ja filtra por `dealId` — vinculacao faz as ligacoes aparecerem automaticamente

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Contato com muitos deals abertos — qual vincular? | Media | Baixo | Vincular ao deal mais recente (por `created_at`). Futuro: permitir escolha manual |
| Query extra ao salvar (buscar deals) pode atrasar o save | Baixa | Baixo | Query simples com indice em `contact_id`. Fire-and-forget se falhar (vinculacao e best-effort) |
| Activity ja salva quando deal e criado via QuickActionsPanel — update pode falhar | Baixa | Medio | Usar `updateActivity` existente. Se falhar, deal criado mas activity sem vinculo (aceitavel) |
| Notas muito longas podem quebrar layout da CallDetailsTable | Media | Baixo | `line-clamp-2` por padrao + expand onclick. Max-height com scroll se expandido |

## Business Value

- **Gestores** ganham visibilidade completa: quais ligacoes de prospeccao impactaram negocios
- **Corretores** nao perdem notas ao navegar entre prospeccao e pipeline
- **Conversao** pode ser rastreada: prospeccao → deal (base para metricas futuras)
- **Auditoria** de atividades fica completa: toda ligacao vinculada ao contato E ao negocio relevante

## Criteria of Done

- [ ] Ligacoes criadas no PowerDialer incluem `deal_id` quando contato tem deals abertos
- [ ] Ligacoes sem deals abertos continuam funcionando sem erro
- [ ] `CallDetailsTable` mostra notas com expand/collapse
- [ ] `ContactHistory` permite ver nota completa ao clicar
- [ ] Ligacoes de prospeccao aparecem na timeline do deal
- [ ] QuickActionsPanel atualiza activity com `deal_id` do deal recem-criado
- [ ] Testes unitarios cobrem: (a) vinculacao com deal, (b) sem deal, (c) expand/collapse UI
- [ ] Lint e typecheck passando (`npm run lint && npm run typecheck`)
- [ ] Nenhuma regressao no fluxo de prospeccao existente

## Tasks

- [x] Task 1: Buscar deals abertos do contato ao salvar ligacao (AC: 1, 2)
  - [x] Subtask 1.1: Criar funcao `getOpenDealsByContact(contactId)` em `lib/supabase/deals.ts` — query `deals` WHERE `contact_id = $1 AND is_won = false AND is_lost = false` ORDER BY `created_at DESC` LIMIT 1
  - [x] Subtask 1.2: Em `PowerDialer.handleCallSave()`, chamar `getOpenDealsByContact(contact.contactId)` antes de `createActivity.mutate()`
  - [x] Subtask 1.3: Se retornar deal, passar `dealId: deal.id` e `dealTitle: deal.title` ao criar activity
  - [x] Subtask 1.4: Se nao retornar deal ou query falhar, manter comportamento atual (`dealId` undefined, `dealTitle: ''`) — vinculacao e best-effort
  - [x] Subtask 1.5: Testes: mock `getOpenDealsByContact` retornando deal, retornando vazio, e retornando erro

- [x] Task 2: Atualizar activity quando deal e criado via QuickActionsPanel (AC: 6)
  - [x] Subtask 2.1: No `PowerDialer`, ao salvar ligacao, guardar o `activityId` retornado pela mutation em state (ref ou state)
  - [x] Subtask 2.2: Passar `lastActivityId` como prop para `QuickActionsPanel`
  - [x] Subtask 2.3: Em `QuickActionsPanel`, atualizar `handleDealCreated` para aceitar `dealId: string` do callback `onCreated` (ja passa `result.id`), e chamar `updateActivity(lastActivityId, { dealId })` para vincular a ligacao ao deal recem-criado
  - [x] Subtask 2.4: Tratar erro graciosamente — se update falhar, deal foi criado mas activity nao vinculada (toast de warning, nao de erro)

- [x] Task 3: Adicionar coluna de notas na CallDetailsTable (AC: 3)
  - [x] Subtask 3.1: Adicionar coluna "Notas" apos coluna "Status" no `<thead>`
  - [x] Subtask 3.2: No `<tbody>`, renderizar `activity.description` com `line-clamp-2` e `max-w-[250px]`
  - [x] Subtask 3.3: Ao clicar na celula de nota, alternar entre truncado e expandido (state local por row)
  - [x] Subtask 3.4: Se `description` for vazio/undefined, mostrar `—`
  - [x] Subtask 3.5: Garantir que `CallActivity` type (de `useProspectingMetrics`) inclui campo `description`

- [x] Task 4: Expand/collapse de notas no ContactHistory (AC: 4)
  - [x] Subtask 4.1: Remover `line-clamp-1` do `<p>` de description (linha 63 de `ContactHistory.tsx`)
  - [x] Subtask 4.2: Adicionar state `expandedId` (string | null) ao componente
  - [x] Subtask 4.3: Ao clicar no item, alternar `expandedId === activity.id`
  - [x] Subtask 4.4: Quando expandido, mostrar texto completo sem truncamento. Quando colapsado, manter `line-clamp-2`
  - [x] Subtask 4.5: Adicionar indicador visual sutil ("ver mais" / "ver menos") apenas para notas com mais de 2 linhas

- [x] Task 5: Garantir que CallActivity inclui description para metricas (AC: 3, 5)
  - [x] Subtask 5.1: Verificar que o tipo `CallActivity` em `useProspectingMetrics.ts` inclui `description`
  - [x] Subtask 5.2: Se nao incluir, adicionar campo opcional `description?: string`
  - [x] Subtask 5.3: Verificar que a query que popula `CallActivity` ja faz SELECT * (confirmar que `description` vem do banco)

- [x] Task 6: Testes (AC: 1, 2, 3, 4, 6)
  - [x] Subtask 6.1: Teste de `getOpenDealsByContact` — retorna deal aberto, retorna vazio quando so tem deals won/lost, trata erro
  - [x] Subtask 6.2: Teste de `handleCallSave` com deal vinculado vs sem deal
  - [x] Subtask 6.3: Teste de `CallDetailsTable` — coluna de notas renderiza, expand/collapse funciona
  - [x] Subtask 6.4: Teste de `ContactHistory` — expand/collapse de notas longas

- [ ] Task 7: Validacao de integracao (AC: 1, 3, 4, 5)
  - [ ] Subtask 7.1: Testar em staging com contato que tem deal aberto — verificar que ligacao aparece na timeline do deal
  - [ ] Subtask 7.2: Testar com contato sem deals — verificar que fluxo nao quebra
  - [ ] Subtask 7.3: Verificar CallDetailsTable com notas longas e curtas
  - [ ] Subtask 7.4: Verificar ContactHistory expand/collapse

## Dev Notes

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| PowerDialer | `features/prospecting/components/PowerDialer.tsx` | Modificar `handleCallSave` para buscar deal e vincular |
| QuickActionsPanel | `features/prospecting/components/QuickActionsPanel.tsx` | Receber `lastActivityId`, vincular deal ao activity |
| CallDetailsTable | `features/prospecting/components/CallDetailsTable.tsx` | Adicionar coluna de notas com expand |
| ContactHistory | `features/prospecting/components/ContactHistory.tsx` | Expand/collapse de notas |
| Deals service | `lib/supabase/deals.ts` | Adicionar `getOpenDealsByContact()` |
| Metrics hook | `features/prospecting/hooks/useProspectingMetrics.ts` | Verificar que CallActivity inclui description |

### Ponto de vinculacao — PowerDialer.handleCallSave (linhas 130-154)

```typescript
// ATUAL — sem dealId
const handleCallSave = useCallback((data: CallLogData) => {
  createActivity.mutate({
    activity: {
      title: data.title,
      description: data.notes || undefined,
      type: 'CALL',
      date: new Date().toISOString(),
      completed: true,
      contactId: contact.contactId,
      dealTitle: '',                  // <- SEMPRE vazio
      user: { name: 'Voce', avatar: '' },
      metadata: { outcome: data.outcome, duration_seconds: data.duration, source: 'prospecting' },
    },
  })
}, [contact.contactId, createActivity, markedObjections])
```

```typescript
// PROPOSTO — com deal auto-vinculado
const handleCallSave = useCallback(async (data: CallLogData) => {
  // Best-effort: buscar deal aberto do contato
  let linkedDealId: string | undefined
  let linkedDealTitle = ''
  try {
    const deal = await getOpenDealsByContact(contact.contactId)
    if (deal) {
      linkedDealId = deal.id
      linkedDealTitle = deal.title
    }
  } catch {
    // Vinculacao e best-effort — se falhar, cria activity sem deal
  }

  const result = await createActivity.mutateAsync({
    activity: {
      title: data.title,
      description: data.notes || undefined,
      type: 'CALL',
      date: new Date().toISOString(),
      completed: true,
      contactId: contact.contactId,
      dealId: linkedDealId,
      dealTitle: linkedDealTitle,
      user: { name: 'Voce', avatar: '' },
      metadata: { outcome: data.outcome, duration_seconds: data.duration, source: 'prospecting' },
    },
  })

  // Guardar activityId para vinculacao posterior via QuickActionsPanel
  lastActivityIdRef.current = result.id
}, [contact.contactId, createActivity, markedObjections])
```

### Query de deals abertos — proposta

```typescript
// lib/supabase/deals.ts
export async function getOpenDealsByContact(contactId: string): Promise<{ id: string; title: string } | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('deals')
    .select('id, title')
    .eq('contact_id', contactId)
    .eq('is_won', false)
    .eq('is_lost', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return { id: data.id, title: data.title }
}
```

### Expand/collapse na CallDetailsTable — proposta

Adicionar state `expandedRows: Set<string>` e coluna de notas:
```tsx
<td className="py-2.5 px-2 max-w-[250px]">
  {activity.description ? (
    <button
      onClick={() => toggleExpand(activity.id)}
      className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className={expandedRows.has(activity.id) ? '' : 'line-clamp-2'}>
        {activity.description}
      </span>
    </button>
  ) : '—'}
</td>
```

### QuickActionsPanel — vinculacao retroativa

Quando o corretor cria um deal via QuickActionsPanel apos uma ligacao, a activity recem-criada deve ser atualizada com o `deal_id` do novo deal. O `CreateDealModal` ja recebe `initialContactId` e chama `onCreated()` ao concluir. O fluxo seria:

1. `PowerDialer` guarda `lastActivityIdRef` apos `handleCallSave`
2. Passa `lastActivityId={lastActivityIdRef.current}` para `QuickActionsPanel`
3. `QuickActionsPanel.handleDealCreated()` recebe o deal criado e faz `updateActivity(lastActivityId, { dealId: newDeal.id })`

**Nota:** `CreateDealModal.onCreated` ja recebe `dealId: string` como argumento (`onCreated(result.id)` — linha 181 de CreateDealModal.tsx). O `QuickActionsPanel.handleDealCreated()` atualmente ignora o argumento — basta atualizar a assinatura do callback para `(dealId: string) => void` e usar o `dealId` recebido.

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (componentes + hooks)
- **Secondary Type(s):** Service layer (nova query de deals)
- **Complexity:** Medium — modificacoes em 4-5 componentes + 1 service + testes

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main`

**Self-Healing Configuration:**
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 20 minutos
- Severity Filter: CRITICAL, HIGH

**CodeRabbit Focus Areas:**

Primary Focus:
- Error handling: `getOpenDealsByContact` deve ser fire-and-forget (nao bloquear save se falhar)
- Race conditions: `lastActivityIdRef` deve ser atualizado antes de mostrar QuickActionsPanel
- Type safety: `CallActivity` deve incluir `description` sem quebrar consumers existentes

Secondary Focus:
- Performance: query de deals nao deve atrasar o save perceptivelmente
- Acessibilidade: botoes de expand/collapse devem ter aria-labels

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/supabase/deals.ts` | Modificado | Adicionada `getOpenDealsByContact()` |
| `features/prospecting/components/PowerDialer.tsx` | Modificado | `handleCallSave` busca deal e usa `mutateAsync`, armazena `lastActivityIdRef` |
| `features/prospecting/components/QuickActionsPanel.tsx` | Modificado | Aceita `lastActivityId`, vincula activity ao deal recem-criado |
| `features/prospecting/components/CallDetailsTable.tsx` | Modificado | Adicionada coluna "Notas" com expand/collapse |
| `features/prospecting/components/ContactHistory.tsx` | Modificado | Expand/collapse de notas com "ver mais"/"ver menos" |
| `features/prospecting/hooks/useProspectingMetrics.ts` | Modificado | `CallActivity` inclui `description`, queries incluem campo |
| `features/prospecting/__tests__/dealLinking.test.tsx` | Criado | 14 testes para vinculacao, notas expand/collapse |
| `features/prospecting/__tests__/powerDialer.test.tsx` | Modificado | Mock atualizado para `mutateAsync` + mock de `getOpenDealsByContact` |
| `features/prospecting/__tests__/quickActionsPanel.test.tsx` | Modificado | Mock de `useUpdateActivity` adicionado |

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-11 | 1.0 | Story criada | @pm (Morgan) |
| 2026-03-11 | 1.1 | Validacao GO (10/10) — SF-1 corrigido (CreateDealModal.onCreated ja passa dealId). Status Draft -> Ready. | @po (Pax) |
| 2026-03-11 | 1.2 | Tasks 1-6 implementadas. Auto-vinculacao deal, notas expand/collapse, 14 testes novos. Lint+typecheck OK. | @dev (Dex) |

---

*Story gerada por @pm (Morgan) — Epic CP-5*
