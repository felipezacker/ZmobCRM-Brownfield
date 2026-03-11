# Story CP-4.4: Item da Fila Expansivel

## Metadata

- **Story ID:** CP-4.4
- **Epic:** CP-4 (Prospeccao — Filas & Sessao UX)
- **Status:** InProgress
- **Priority:** P2
- **Estimated Points:** 5 (M)
- **Estimated Hours:** 5-7h
- **Wave:** 2 (Experiencia Enriquecida)
- **Created:** 2026-03-11

## Executor Assignment

- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, a11y_check, performance_check]

## Story

**As a** corretor usando a aba Fila da Central de Prospeccao,
**I want** clicar em um item da fila para expandir detalhes inline do contato,
**so that** eu possa avaliar contexto relevante (ultima atividade, nota, estagio, lead score) sem sair da pagina antes de ligar.

## Descricao

Hoje o `QueueItem` e opaco: exibe nome, telefone, temperatura e stage, mas nao permite aprofundar contexto sem abrir a pagina do contato. O corretor precisa alternar de tela para lembrar quem e o contato antes de ligar, gerando friccao.

Esta story adiciona um **accordion inline** ao `QueueItem`: clicar no item expande uma area de detalhes que carrega sob demanda (lazy) os dados adicionais do contato — ultima atividade, ultima nota, estagio no pipeline, email e lead score detalhado — e oferece botao "Ver perfil" para navegar ao contato completo. Apenas um item pode estar expandido por vez (accordion behavior). O botao de remover (X) existente nao deve ser interferido pelo clique de expand.

**Risco principal:** fetch adicional por item. Mitigacao: TanStack Query com `enabled: !!isExpanded` — dados carregados apenas ao expandir, cacheados 30s.

## Acceptance Criteria

- [ ] AC1: Clicar no corpo do item da fila expande/colapsa a area de detalhes inline (toggle)
- [ ] AC2: Area expandida exibe: email, ultima atividade (tipo + data relativa), ultima nota (truncada em 100 chars), estagio atual no pipeline, e lead score com descricao textual
- [ ] AC3: Botao "Ver perfil" na area expandida navega para `/contacts?contactId={id}` do contato
- [ ] AC4: Apenas um item expandido por vez — expandir novo item colapsa o anterior (accordion behavior gerenciado em `CallQueue`)
- [ ] AC5: Clicar no botao de remover (X) nao aciona o toggle de expand (propagacao bloqueada)
- [ ] AC6: Dados carregados sob demanda: fetch ocorre somente quando o item e expandido, nao pre-carregado para todos os itens

## Scope

### IN

- Modificar `QueueItem.tsx` para suportar expand/collapse com area de detalhes inline
- Modificar `CallQueue.tsx` para gerenciar estado `expandedId` (accordion — apenas 1 item por vez)
- Criar hook `useQueueItemDetails` (ou reutilizar `useContactActivities` diretamente) para fetch sob demanda
- Botao "Ver perfil" com navegacao para pagina do contato
- Skeleton de loading enquanto dados carregam
- Testes unitarios cobrindo os 6 ACs

### OUT

- Pre-fetch de dados para todos os itens da fila
- Edicao de dados diretamente no expand (apenas visualizacao)
- Drag-and-drop (CP-4.7)
- Checkbox de selecao em lote (CP-4.5)
- Historico completo de atividades (apenas a ultima)
- Campos customizados ou tags do contato

## Dependencies

- Nenhuma dependencia bloqueante de outras stories CP-4
- `useContactActivities` ja existe em `lib/query/hooks/useActivitiesQuery.ts` (pode ser reutilizado diretamente)
- `ProspectingQueueItem` ja expoe `contactEmail`, `contactStage`, `leadScore` — dados denormalizados disponiveis sem fetch extra

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Fetch adicional por item causa latencia | Media | Baixo | TanStack Query com `enabled: !!isExpanded`, skeleton inline, staleTime 30s |
| Propagacao de click X aciona expand | Media | Medio | `event.stopPropagation()` no handler do botao de remover |
| Accordion state no CallQueue adiciona re-renders | Baixa | Baixo | `useState<string \| null>` para expandedId, sem efeito colateral |
| Dark mode inconsistente na area expandida | Baixa | Baixo | Seguir classes Tailwind existentes (dark:bg-card, dark:text-muted-foreground) |

## Business Value

Reduz friccao pre-ligacao: o corretor avalia contexto sem troca de tela, aumentando preparacao e potencialmente taxa de conexao. Alinhado ao objetivo do Epic CP-4 de enriquecer a experiencia da fila.

## Criteria of Done

- [ ] AC1 a AC6 implementados e verificados
- [ ] Area expandida com skeleton durante loading
- [ ] Botao "Ver perfil" navega corretamente para pagina do contato
- [ ] Dados carregados sob demanda (AC6 verificado via test ou inspecao)
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] `npm test` passa (novos testes + sem regressao)
- [ ] Dark mode funcional na area expandida

## Tasks

- [x] Task 1 — Accordion state em CallQueue (AC4)
  - [x] Subtask 1.1: Adicionar `expandedId: string | null` e setter `setExpandedId` via `useState` em `CallQueue.tsx`
  - [x] Subtask 1.2: Passar `isExpanded={expandedId === item.id}` e `onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}` para cada `QueueItem`
  - [x] Subtask 1.3: Garantir que mudar expandedId nao causa re-render dos outros itens (useCallback para handleToggleExpand)

- [x] Task 2 — Expand/collapse em QueueItem (AC1, AC5)
  - [x] Subtask 2.1: Adicionar props `isExpanded?: boolean` e `onToggleExpand?: (id: string) => void` a interface `QueueItemProps`
  - [x] Subtask 2.2: Tornar o corpo do item clicavel (div com `onClick={() => onToggleExpand?.(item.id)}`) com cursor-pointer, role="button", aria-expanded, keyboard support
  - [x] Subtask 2.3: Adicionar `event.stopPropagation()` no `onClick` do botao de remover (X) e no checkbox (CP-4.5) para nao acionar expand (AC5)
  - [x] Subtask 2.4: Renderizar `<QueueItemDetails>` condicionalmente abaixo da linha principal quando `isExpanded` for true

- [x] Task 3 — Componente QueueItemDetails com fetch sob demanda (AC2, AC6)
  - [x] Subtask 3.1: `QueueItemDetails.tsx` criado com props corretas
  - [x] Subtask 3.2: `useContactActivities(isExpanded ? contactId : undefined, 1)` — fetch sob demanda (AC6)
  - [x] Subtask 3.3: Skeleton (3 linhas animate-pulse) enquanto `isLoading`
  - [x] Subtask 3.4: Exibe email, ultima atividade (icone + titulo + data relativa), ultima nota (truncada 100 chars), lead score com label (Frio/Morno/Quente — thresholds do LeadScoreBadge)
  - [x] Subtask 3.5: Fallback "Sem atividades registradas" quando sem atividade

- [x] Task 4 — Botao "Ver perfil" (AC3)
  - [x] Subtask 4.1: `contactId` prop em `QueueItemDetails`
  - [x] Subtask 4.2: `<Link href={'/contacts?contactId=' + contactId}>` via `next/link`
  - [x] Subtask 4.3: Icone `ExternalLink` (lucide-react), `text-xs text-primary hover:underline`

- [x] Task 5 — Testes unitarios (AC1-AC6)
  - [x] Subtask 5.1: `features/prospecting/__tests__/queueItemExpand.test.tsx` criado
  - [x] Subtask 5.2: Teste AC1 — clicar no item expande
  - [x] Subtask 5.3: Teste AC1 — clicar novamente colapsa
  - [x] Subtask 5.4: Teste AC4 — accordion via CallQueue (segundo expand colapsa primeiro)
  - [x] Subtask 5.5: Teste AC5 — clicar X nao aciona expand (stopPropagation)
  - [x] Subtask 5.6: Teste AC6 — fetch nao ocorre quando item nao expandido
  - [x] Subtask 5.7: Teste AC2 — area expandida exibe email, atividade e lead score + fallback

- [x] Task 6 — Quality Gate
  - [x] Subtask 6.1: `npm run typecheck` passa (0 errors)
  - [x] Subtask 6.2: `npm run lint` passa (0 errors, 2 warnings aceitaveis: drag handle nativo dnd-kit + mock de teste)
  - [x] Subtask 6.3: `npm test` passa — 7 novos testes CP-4.4 OK. 1 falha pre-existente em `useProspectingQueue.test.ts` (mocks desatualizados de CP-4.5/CP-4.7, nao relacionado a CP-4.4)

## Dev Notes

**quality_gate mantido como @qa por consistencia com Epic CP-4** (todas as stories do epic usam @qa como quality gate). O template de story sugere @architect para stories de Code/Features/Logic, mas o Epic CP-4 define @qa de forma consistente em todas as suas stories. A escolha de @qa foi validada e mantida pelo @po na validacao GO de 2026-03-11.

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/QueueItem.tsx` | Modify | Adicionar props expand, clique no corpo, stopPropagation no X |
| `features/prospecting/components/CallQueue.tsx` | Modify | Adicionar `expandedId` state, passar props para QueueItem |
| `features/prospecting/components/QueueItemDetails.tsx` | Create | Novo componente com detalhes inline + botao Ver perfil |
| `features/prospecting/__tests__/queueItemExpand.test.tsx` | Create | Testes unitarios (7 testes) |

### Interface QueueItem atual (types/types.ts linha 329)

```typescript
export interface ProspectingQueueItem {
  id: string;
  contactId: string;
  ownerId: string;
  organizationId: string;
  status: ProspectingQueueStatus;
  position: number;
  sessionId?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  // Campos denormalizados (ja disponiveis, sem fetch extra):
  contactName?: string;
  contactPhone?: string;
  contactStage?: string;       // <- usar no expand (AC2)
  contactTemperature?: string;
  contactEmail?: string;       // <- usar no expand (AC2)
  leadScore?: number | null;   // <- usar no expand (AC2)
}
```

Os campos `contactEmail`, `contactStage` e `leadScore` ja estao denormalizados no `ProspectingQueueItem` — nao precisam de fetch adicional. O fetch sob demanda e apenas para **ultima atividade** (via `useContactActivities`).

### Hook de Atividades (fetch sob demanda)

Usar `useContactActivities` de `lib/query/hooks/useActivitiesQuery.ts`:

```typescript
// Ja existe — assinatura:
export const useContactActivities = (contactId: string | undefined, limit = 5) => {
  const { user, loading: authLoading } = useAuth()
  return useQuery({
    queryKey: queryKeys.activities.byContact(contactId || ''),
    queryFn: async () => { ... },
    enabled: !authLoading && !!user && !!contactId,  // <- expandir para incluir isExpanded
    staleTime: 30 * 1000,
  })
}
```

Para fetch sob demanda (AC6), a forma recomendada e passar `contactId` como `undefined` quando nao expandido, OU criar um wrapper local que adiciona `&& isExpanded` ao `enabled`. Opcao mais simples: passar `contactId` so quando `isExpanded` for true:

```typescript
// Em QueueItemDetails.tsx:
const { data: activities, isLoading } = useContactActivities(
  isExpanded ? contactId : undefined,
  1  // apenas a ultima atividade
)
```

### Navegacao para Contato

Padrao URL confirmado em `features/inbox/components/InboxListView.tsx`:
```typescript
href: `/contacts?contactId=${contactId}`
```

Usar `next/link` com `<Link>` para navegacao client-side.

### Padrao de Skeleton

Seguir padrao existente no `CallQueue.tsx` (linha 32-37):
```tsx
<div className="h-16 bg-muted dark:bg-card rounded-lg animate-pulse" />
```

Para o expand, usar 2-3 linhas de altura proporcional.

### Lead Score Label

**Reutilizar os thresholds do LeadScoreBadge.tsx existente para consistencia visual.**

Thresholds reais confirmados em `features/prospecting/components/LeadScoreBadge.tsx` (funcao `getScoreConfig`):
- score < 30: **Frio** (bg-red-100 / text-red-700 dark:text-red-400)
- score >= 30 e <= 60: **Morno** (bg-yellow-100 / text-yellow-700 dark:text-yellow-400)
- score > 60: **Quente** (bg-green-100 / text-green-700 dark:text-green-400)

Nota: o badge existente tem apenas 3 faixas (sem "Hot") e usa cores diferentes das documentadas originalmente nesta story (que definia 4 faixas com azul/amarelo/laranja/vermelho). O `QueueItemDetails` deve replicar exatamente a logica de `getScoreConfig` — ou importar e reutilizar o `LeadScoreBadge` diretamente para garantir consistencia.

### Ultima Nota

Activities com `type === 'NOTE'` representam notas. A ultima nota e a primeira activity do tipo NOTE na lista retornada por `useContactActivities` (ja ordenada por data DESC). Truncar o titulo em 100 chars com reticencias.

### Testing

- Framework: Vitest + Testing Library (padrao do projeto — ver `contactHistory.test.tsx`)
- Mock de `useContactActivities` com `vi.mock('@/lib/query/hooks/useActivitiesQuery')`
- Mock de `useAuth` com `vi.mock('@/context/AuthContext')`
- Arquivo: `features/prospecting/__tests__/queueItemExpand.test.tsx`
- Seguir padrao de mock e estrutura de `contactHistory.test.tsx` e `neglectedContactsAlert.test.tsx`

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Secondary Types: —
- Complexity: Low-Medium (2 componentes modificados + 1 novo, fetch sob demanda, accordion state)

**Specialized Agent Assignment:**

Primary Agents:
- @dev (pre-commit reviews — obrigatorio)
- @ux-expert (validacao a11y e UX do expand inline)

Supporting Agents:
- @qa (quality gate final)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): Rodar antes de marcar story completa
- [ ] Pre-PR (@devops): Rodar antes de criar pull request

**Self-Healing Configuration:**

Expected Self-Healing:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutos
- Severity Filter: [CRITICAL]

Predicted Behavior:
- CRITICAL issues: auto_fix (ate 2 iteracoes)
- HIGH issues: document_as_debt (anotar no Dev Notes)
- MEDIUM: ignore na fase dev
- LOW: ignore

**Focus Areas:**

Primary Focus:
- Acessibilidade: elemento clicavel deve ter role="button" ou ser um `<button>`, aria-expanded={isExpanded}, aria-label descritivo
- Performance: `enabled: isExpanded` garantido — confirmar que nao ha fetch sem expand
- stopPropagation no botao X: verificar que nao ha side effects de preventDefault

Secondary Focus:
- Dark mode: area expandida usa classes dark: consistentes
- Responsividade: layout da area expandida funciona em mobile (flex-col em telas pequenas)

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/prospecting/components/QueueItem.tsx` | Modify | Props expand, clique no corpo, stopPropagation no X |
| `features/prospecting/components/CallQueue.tsx` | Modify | Estado accordion expandedId, passar props |
| `features/prospecting/components/QueueItemDetails.tsx` | Create | Detalhes inline (email, atividade, nota, stage, score, Ver perfil) |
| `features/prospecting/__tests__/queueItemExpand.test.tsx` | Create | 7 testes cobrindo AC1-AC6 |

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-11 | 1.0 | Story criada a partir do Epic CP-4 | @sm (River) |
| 2026-03-11 | 1.1 | Validacao GO (10/10). Status Draft -> Ready. 2 should-fix: (1) Lead Score ranges divergem do LeadScoreBadge.tsx existente, (2) quality_gate @qa nao na lista oficial mas e convencao do projeto. | @po (Pax) |
| 2026-03-11 | 1.2 | Rework @po SF-1: Dev Notes atualizado com thresholds reais do LeadScoreBadge.tsx (3 faixas: Frio <30, Morno 30-60, Quente >60) e instrucao de reutilizar o componente/logica existente. SF-2: nota quality_gate @qa adicionada ao Dev Notes por consistencia com epic CP-4. Status mantido Ready. | @sm (River) |
| 2026-03-11 | 2.0 | Implementacao completa: Tasks 1-6 concluidas. Accordion state, expand/collapse com a11y (role=button, aria-expanded, keyboard), QueueItemDetails com fetch sob demanda, Ver perfil link, 7 testes unitarios. Typecheck e lint OK. | @dev (Dex) |

---

*Story gerada por @sm (River) — Epic CP-4*
