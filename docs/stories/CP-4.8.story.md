# Story CP-4.8: Deteccao e Cleanup de Multiplas Sessoes Ativas

## Metadata
- **Story ID:** CP-4.8
- **Epic:** CP-4 (Prospeccao — Filas & Sessao UX)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 3 (S)
- **Wave:** 3
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, schema_validation]

## Story

**As a** corretor usando a Central de Prospeccao,
**I want** que o sistema detecte todas as sessoes ativas simultaneas e me ofeca opcoes claras para resolver cada uma,
**so that** eu nao fique preso com sessoes orfas acumuladas que bloqueiam o inicio de uma nova sessao limpa.

## Descricao

Hoje, `getActiveSessions()` em `lib/supabase/prospecting-sessions.ts` usa `.limit(1)`, retornando apenas a **primeira** sessao ativa encontrada. Quando ha 2 ou mais sessoes abertas (orfas, por exemplo, de abas ou dispositivos diferentes), o banner amarelo de "sessao ativa" mostra apenas uma, sem dar visibilidade do cenario real.

**Problema concreto:**
- Usuario abre a Central em dois dispositivos/abas, inicia sessoes sem encerrar
- Fecha o browser sem encerrar — sessoes ficam abertas no banco
- Proxima visita: `getActiveSessions()` retorna apenas 1 sessao (limit(1)), as demais ficam invisivel
- Banner mostra uma opcao de retomar, mas ha 2+ sessoes orfas consumindo recursos e gerando inconsistencia de estado

**Comportamento esperado apos a story:**
- `getActiveSessions()` retorna **todas** as sessoes ativas (sem limit)
- Se ha 2+ sessoes, o banner exibe contagem ("2 sessoes ativas encontradas")
- Usuario pode encerrar todas de uma vez ("Encerrar todas") ou retomar apenas a mais recente ("Retomar mais recente"), com as demais sendo encerradas automaticamente
- Apos qualquer acao de resolucao, o banner desaparece normalmente

**Nota:** Esta story e pre-requisito para CP-4.9 (Resume com Continuidade de Stats) — resolver sessoes orfas antes de trabalhar na logica de retomada de stats.

## Acceptance Criteria

- [x] AC1: `getActiveSessions()` em `lib/supabase/prospecting-sessions.ts` retorna todas as sessoes ativas do usuario — remover `.limit(1)` da query
- [x] AC2: Se ha 2 ou mais sessoes ativas, o banner de sessao ativa em `useProspectingPageState` exibe a contagem total (ex: "2 sessoes ativas encontradas")
- [x] AC3: Opcao "Encerrar todas" fecha todas as sessoes ativas com `endProspectingSession(id, stats_zerados)` para cada uma
- [x] AC4: Opcao "Retomar mais recente" retoma a sessao com o `startedAt` mais recente (primeiro item do array, ja ordenado por `started_at DESC`) e encerra todas as demais com stats zerados
- [x] AC5: Apos executar qualquer acao de resolucao (AC3 ou AC4), o banner desaparece e `pendingActiveSession` e limpo normalmente

## Scope

### IN
- Remover `.limit(1)` de `getActiveSessions()` em `lib/supabase/prospecting-sessions.ts`
- Ajustar `useProspectingPageState.ts` para lidar com array de multiplas sessoes (atualmente usa `sessions[0]` apenas)
- Atualizar banner de sessao ativa para exibir contagem quando ha 2+ sessoes
- Implementar logica "Encerrar todas" (encerra cada sessao com stats zerados)
- Implementar logica "Retomar mais recente" (retoma sessions[0] — ja e o mais recente pela ordenacao, encerra as demais)
- Testes unitarios cobrindo os 5 ACs

### OUT
- Alteracoes de schema ou migrations (nenhuma mudanca necessaria — tabela `prospecting_sessions` ja tem todos os campos)
- Mudancas no visual do banner alem da contagem (redesign completo de UI fora do escopo)
- Logica de resume com carregamento de stats do DB (escopo de CP-4.9)
- Deteccao de sessoes ativas de outros usuarios (apenas do proprio corretor)
- Notificacao push ou email sobre sessoes orfas

## Dependencies

Nenhuma. CP-4.8 e a primeira story da Onda 3 e nao depende de outras stories do epic para ser implementada.

**Nota:** CP-4.9 (Resume com Continuidade de Stats) depende de CP-4.8, pois e necessario resolver as sessoes orfas antes de implementar a logica de retomada com stats persistidos.

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Encerrar sessoes em paralelo gera race condition no DB | Baixa | Baixo | `Promise.allSettled` executa todas as chamadas em paralelo e aguarda todas completarem — race condition improvavel pois cada sessao tem ID distinto; falhas parciais sao toleradas (sessao com falha permanece aberta mas nao bloqueia as demais) |
| Remover limit(1) retorna muitas sessoes em casos extremos | Muito baixa | Baixo | Cenario de producao tem no maximo 2-3 sessoes orfas; query e filtrada por `owner_id` + `ended_at IS NULL` |
| `sessions[0]` pode ser a sessao errada se ordenacao mudar | Baixa | Medio | Ordenacao e `started_at DESC` (fixada na query) — sessions[0] e sempre a mais recente |

## Business Value

Sessoes orfas acumuladas causam confusao no corretor e inconsistencia de dados (multiplas sessoes "abertas" para o mesmo usuario no banco). O cleanup correto evita que stats de sessoes parciais se percam e garante que o fluxo de retomada (CP-4.9) funcione sobre uma base limpa. E uma correcao de robustez essencial para o Epic CP-4.

## Criteria of Done

- [ ] `getActiveSessions()` retorna todas as sessoes ativas sem limite
- [ ] Banner exibe contagem quando ha 2+ sessoes ativas
- [ ] "Encerrar todas" fecha todas as sessoes com stats zerados
- [ ] "Retomar mais recente" retoma sessions[0] e encerra as demais
- [ ] Apos resolucao, banner desaparece e estado e limpo
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] `npm test` passa (novos testes + regressao)

## Tasks

- [x] Task 1: Remover `.limit(1)` de `getActiveSessions()` (AC1)
  - [x] Task 1.1: Abrir `lib/supabase/prospecting-sessions.ts` linha 77
  - [x] Task 1.2: Remover a linha `.limit(1)` da query — funcao ja retorna array, apenas o resultado muda de 1 para N

- [x] Task 2: Ajustar `useProspectingPageState.ts` para multiplas sessoes (AC2, AC3, AC4, AC5)
  - [x] Task 2.1: Ampliar o tipo `PendingActiveSession` (ou criar novo estado) para suportar array de sessoes, nao apenas uma
    - Alternativa mais simples: manter `pendingActiveSession` como antes para a sessao a retomar e adicionar `allActiveSessions: ProspectingSession[]` para guardar a lista completa
  - [x] Task 2.2: No `useEffect` de montagem (linha 107-118), ao receber o array de `getActiveSessions()`, guardar todas as sessoes em `allActiveSessions` e usar `sessions[0]` (a mais recente) para `pendingActiveSession`
  - [x] Task 2.3: Expor `allActiveSessions.length` para o componente de banner via retorno do hook
  - [x] Task 2.4: Implementar `handleDismissAllSessions`: itera sobre `allActiveSessions` e chama `endProspectingSession(id, stats_zerados)` para cada uma via `Promise.allSettled`, depois limpa estado
  - [x] Task 2.5: Ajustar `handleResumeSession` para, alem de retomar `pendingActiveSession`, encerrar todas as sessoes em `allActiveSessions` exceto a que esta sendo retomada

- [x] Task 3: Atualizar o banner de sessao ativa na UI (AC2)
  - [x] Task 3.1: Localizar onde o banner de "sessao ativa" e renderizado em `ProspectingPage.tsx` (buscar por `pendingActiveSession`)
  - [x] Task 3.2: Quando `allActiveSessions.length >= 2`, exibir mensagem com contagem ("2 sessoes ativas encontradas") em vez da mensagem generica atual
  - [x] Task 3.3: Adicionar botao "Encerrar todas" (aciona `handleDismissAllSessions`)
  - [x] Task 3.4: Manter botao "Retomar" (aciona `handleResumeSession`, que agora encerra as demais automaticamente)

- [x] Task 4: Testes unitarios (AC1–AC5)
  - [x] Task 4.1: Teste AC1 — `getActiveSessions()` retorna todas as sessoes sem limite (mock supabase retornando 3 sessoes)
  - [x] Task 4.2: Teste AC2 — hook expoe contagem correta quando ha 2+ sessoes
  - [x] Task 4.3: Teste AC3 — `handleDismissAllSessions` chama `endProspectingSession` para cada sessao ativa
  - [x] Task 4.4: Teste AC4 — `handleResumeSession` retoma sessions[0] e encerra as demais
  - [x] Task 4.5: Teste AC5 — apos resolucao, estado e limpo (`pendingActiveSession === null`, `allActiveSessions === []`)

- [x] Task 5: Quality Gate
  - [x] Task 5.1: `npm run typecheck` passa
  - [x] Task 5.2: `npm run lint` passa
  - [x] Task 5.3: `npm test` passa (novos testes + suite completa sem regressao — 86 files, 932 tests)

## Dev Notes

### Codigo Exato das Funcoes Afetadas

**`lib/supabase/prospecting-sessions.ts` — `getActiveSessions()` linhas 69-80 (ARQUIVO PRINCIPAL):**

```typescript
export async function getActiveSessions(ownerId: string): Promise<ProspectingSession[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('prospecting_sessions')
    .select('*')
    .eq('owner_id', ownerId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)  // <- REMOVER esta linha
  if (error) throw error
  return (data || []).map(transformSession)
}
```

**Modificacao necessaria:** Remover apenas a linha `.limit(1)`. A funcao ja retorna `ProspectingSession[]` — o tipo de retorno nao muda. A query ja ordena por `started_at DESC`, entao `sessions[0]` sempre sera a sessao mais recente.

---

**`features/prospecting/hooks/useProspectingPageState.ts` — useEffect de deteccao de sessoes ativas, linhas 107-118:**

```typescript
useEffect(() => {
  if (!userId || hasCheckedActive.current) return
  hasCheckedActive.current = true
  getActiveSessions(userId).then(sessions => {
    if (sessions.length > 0) {
      setPendingActiveSession({
        id: sessions[0].id,          // usa apenas a primeira
        startedAt: sessions[0].startedAt,
      })
    }
  }).catch(() => {})
}, [userId])
```

**Modificacao necessaria:** Guardar o array completo em novo estado `allActiveSessions` e usar `sessions[0]` para `pendingActiveSession` (comportamento de retomada mantido). Expor `allActiveSessions.length` para o componente de banner.

---

**`features/prospecting/hooks/useProspectingPageState.ts` — `handleResumeSession()` linhas 307-324 (AJUSTAR):**

```typescript
const handleResumeSession = useCallback(async () => {
  if (!pendingActiveSession) return
  const deps = depsRef.current
  if (!deps) return
  setDbSessionId(pendingActiveSession.id)
  setSessionStartTime(new Date(pendingActiveSession.startedAt))
  setPendingActiveSession(null)
  await deps.queueDeps.startSession()
  setSessionStats({
    total: deps.queueDeps.queue.length,
    completed: 0,
    skipped: 0,
    connected: 0,
    noAnswer: 0,
    voicemail: 0,
    busy: 0,
  })
}, [pendingActiveSession])
```

**Modificacao necessaria:** Antes de limpar `setPendingActiveSession(null)`, encerrar todas as sessoes em `allActiveSessions` exceto `pendingActiveSession.id`. Usar `Promise.allSettled` para nao bloquear em caso de falha parcial.

---

**`features/prospecting/hooks/useProspectingPageState.ts` — `handleDismissActiveSession()` linhas 327-334 (AJUSTAR):**

```typescript
const handleDismissActiveSession = useCallback(async () => {
  if (!pendingActiveSession) return
  endProspectingSession(pendingActiveSession.id, {
    total: 0, completed: 0, skipped: 0, connected: 0,
    noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
  }).catch(() => {})
  setPendingActiveSession(null)
}, [pendingActiveSession])
```

**Modificacao necessaria (novo `handleDismissAllSessions`):** Encerrar TODAS as sessoes em `allActiveSessions` com stats zerados, nao apenas `pendingActiveSession`. Limpar ambos os estados ao final.

> **Nota sobre coexistencia dos handlers:** `handleDismissActiveSession` (existente, linha 327) permanece no codigo — ele encerra apenas `pendingActiveSession` (caso de 1 sessao ativa, comportamento original). `handleDismissAllSessions` e um novo handler adicionado para o cenario de 2+ sessoes; encerra todas as sessoes em `allActiveSessions` via `Promise.allSettled` e limpa tanto `pendingActiveSession` quanto `allActiveSessions`. Os dois handlers coexistem: o banner usa `handleDismissActiveSession` quando `allActiveSessions.length === 1` e `handleDismissAllSessions` quando `allActiveSessions.length >= 2`.

---

### Tipos Relevantes

**`lib/supabase/prospecting-sessions.ts` — interfaces exportadas:**

```typescript
export interface ProspectingSessionStats {
  total: number
  completed: number
  skipped: number
  connected: number
  noAnswer: number
  voicemail: number
  busy: number
  duration_seconds: number
}

export interface ProspectingSession {
  id: string
  ownerId: string
  organizationId: string
  startedAt: string
  endedAt: string | null
  stats: ProspectingSessionStats | Record<string, never>
  createdAt: string
}
```

**`type PendingActiveSession`** — definida em `useProspectingPageState.ts` (buscar pela definicao local). E um objeto `{ id: string, startedAt: string }` — nao precisa ser alterada.

### Padrao de Stats Zerados

Para encerrar sessoes orfas, usar stats zerados (mesmo padrao de `handleDismissActiveSession`):

```typescript
const ZERO_STATS: ProspectingSessionStats = {
  total: 0, completed: 0, skipped: 0, connected: 0,
  noAnswer: 0, voicemail: 0, busy: 0, duration_seconds: 0,
}
```

### Ordenacao Garantida

A query de `getActiveSessions()` ordena por `started_at DESC`. Portanto:
- `sessions[0]` = sessao mais recente (a ser retomada)
- `sessions[1], sessions[2]...` = sessoes mais antigas (a serem encerradas)

Esta garantia elimina a necessidade de ordenar no hook.

### Source Tree Relevante

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/supabase/prospecting-sessions.ts` | Modificar | `getActiveSessions()` linha 77 — remover `.limit(1)` |
| `features/prospecting/hooks/useProspectingPageState.ts` | Modificar | Adicionar `allActiveSessions` state, ajustar `handleResumeSession`, adicionar `handleDismissAllSessions` |
| `features/prospecting/ProspectingPage.tsx` | Modificar | Banner de sessao ativa — exibir contagem e novo botao "Encerrar todas" |

### Testing

**Framework:** Jest (padrao do projeto)
**Localizacao dos testes:** `lib/supabase/__tests__/` para o service layer, `features/prospecting/hooks/__tests__/` para o hook
**Mock necessario:** Mock do cliente Supabase (`supabase` de `lib/supabase/client.ts`) — seguir padrao dos outros testes de service do projeto

**Cenarios obrigatorios:**
1. `getActiveSessions()` com 1 sessao ativa — retorna array com 1 elemento (comportamento igual ao atual)
2. `getActiveSessions()` com 3 sessoes ativas — retorna array com 3 elementos (mudanca esperada)
3. `handleDismissAllSessions()` — verifica que `endProspectingSession` e chamado N vezes (uma por sessao)
4. `handleResumeSession()` com 3 sessoes — verifica que retoma sessions[0] e encerra sessions[1] e sessions[2]
5. Apos qualquer resolucao — `pendingActiveSession` e null, `allActiveSessions` e vazio

**Cobertura esperada:** 5-8 testes unitarios cobrindo todos os 5 ACs e os principais edge cases.

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend (hook + componente de banner)
- Secondary Type(s): API (ajuste no service layer)
- Complexity: Low (remocao de limit + ajuste de estado local — sem novos componentes complexos)

**Specialized Agent Assignment:**
- Primary Agents:
  - @dev (pre-commit reviews — obrigatorio)
- Supporting Agents:
  - @qa (validacao de schema e comportamento)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted` antes de marcar story completa
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main` antes de criar pull request

**Self-Healing Configuration:**
- Primary Agent: @dev (light mode)
- Max Iterations: 3
- Timeout: 30 minutos
- Severity Filter: CRITICAL, HIGH

**Predicted Behavior:**
- CRITICAL issues: auto_fix (ate 3 iteracoes)
- HIGH issues: auto_fix (ate 3 iteracoes); se persistir apos max iterations, document_as_debt em Dev Notes
- MEDIUM: document_as_debt
- LOW: ignorar

**CodeRabbit Focus Areas:**

Primary Focus:
- Error handling: `Promise.allSettled` em `handleDismissAllSessions` — nao deixar que uma falha de encerramento bloqueie a limpeza de estado
- Tipagem correta: `allActiveSessions` deve ser `ProspectingSession[]` (tipo exportado de `prospecting-sessions.ts`), nao `any`

Secondary Focus:
- Nao quebrar o contrato publico do hook — funcoes existentes (`handleResumeSession`, `handleDismissActiveSession`) devem manter a mesma assinatura
- Garantir que o banner com 1 sessao continua funcionando identicamente ao atual (sem regressao no caso base)

## File List

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/supabase/prospecting-sessions.ts` | Modificar | `getActiveSessions()` — removido `.limit(1)` |
| `features/prospecting/hooks/useProspectingPageState.ts` | Modificar | Adicionado `allActiveSessions` state, `handleDismissAllSessions`, ajustado `handleResumeSession` para encerrar outras sessoes |
| `features/prospecting/ProspectingPage.tsx` | Modificar | Banner — exibe contagem de sessoes e botao "Encerrar todas" quando 2+ sessoes |
| `lib/supabase/__tests__/prospecting-sessions.test.ts` | Modificar | Atualizado teste de `getActiveSessions` para `.order` terminal + teste AC1 (sem limit) |
| `features/prospecting/__tests__/multipleActiveSessions.test.ts` | Criar | 7 testes cobrindo AC1-AC5 (multiplas sessoes, dismiss all, resume most recent, cleanup) |

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-11 | 1.0 | Story criada a partir do Epic CP-4 (Onda 3) | @sm (River) |
| 2026-03-11 | 1.1 | Validacao GO (10/10). Status Draft -> Ready. 0 critical, 3 should-fix (nao bloqueantes). | @po (Pax) |
| 2026-03-11 | 1.2 | Should-fix aplicados: SF-1 CodeRabbit severity alinhado ao core-config (HIGH: auto_fix, MEDIUM: document_as_debt, max_iterations: 3), SF-2 nota de coexistencia handleDismiss adicionada em Dev Notes, SF-3 corrigido "sequencial" por "paralelo" em Risks. Status mantido Ready. | @sm (River) |
| 2026-03-11 | 2.0 | Implementacao completa: Tasks 1-5 concluidas. 5 arquivos modificados/criados, 15 novos testes (932 total, 0 regressao). typecheck + lint OK. Status Ready -> Ready for Review. | @dev (Dex) |
| 2026-03-11 | 2.1 | QA review: CONCERNS (3 medium). C1: testes AC5 inline, C2: CP-4.9 scope leak, C3: falhas silenciosas em Promise.allSettled. | @qa (Quinn) |
| 2026-03-11 | 2.2 | Fixes aplicados: C1 testes AC5 melhorados (2 testes com mock chain real), C3 toast warning para falhas parciais em handleDismissAllSessions e handleResumeSession. 944 testes, 0 regressao. | @dev (Dex) |
| 2026-03-11 | 2.3 | Re-review QA: PASS. Todas as concerns resolvidas. Status Ready for Review -> Done. | @qa (Quinn) |

---

*Story gerada por @sm (River) — Epic CP-4*
