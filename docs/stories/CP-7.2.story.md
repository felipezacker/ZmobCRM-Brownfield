# Story CP-7.2: Contador de Tentativas no PowerDialer

## Metadata
- **Story ID:** CP-7.2
- **Epic:** CP-7 (Prospeccao — Produtividade & Conversao do Corretor)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 3 (S)
- **Wave:** 1
- **Assigned Agent:** @dev
- **Dependencies:** Nenhuma (Wave 1 — paralelizavel com CP-7.1)

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, component_test]

## Story

**As a** corretor usando o PowerDialer do ZmobCRM,
**I want** ver quantas ligacoes ja fiz para o contato atual e quando foi a ultima tentativa,
**so that** eu decida se insisto na ligacao ou mudo de canal (WhatsApp, email), evitando ligar excessivamente para quem nao atende.

## Descricao

O corretor nao tem visibilidade sobre quantas vezes ja ligou para um contato. Ele pode estar na 5a tentativa sem saber, desperdicando tempo em contatos que provavelmente nao vao atender. A informacao existe no banco — `activities` com `type='CALL'` e `contact_id` — mas nao chega ao PowerDialer.

**Resultado atual:** Corretor liga sem saber que ja tentou 5 vezes. Nenhuma indicacao visual de tentativas anteriores.

**Resultado esperado:** Badge abaixo do nome/telefone no card do PowerDialer mostrando: "3a tentativa — ultima: ontem 15h (nao atendeu)" com codificacao visual por cor:
- 1-2 tentativas: neutro (cinza)
- 3-4 tentativas: amarelo (atencao)
- 5+ tentativas: vermelho (considerar outro canal)

## Acceptance Criteria

- [ ] AC1: PowerDialer exibe badge de tentativas abaixo do nome/telefone do contato, mostrando o numero da tentativa atual (ex: "3a tentativa")
- [ ] AC2: Badge inclui data/hora da ultima tentativa e outcome (ex: "ultima: ontem 15h (nao atendeu)")
- [ ] AC3: Regras visuais por cor: 1-2 tentativas cinza/neutro, 3-4 amarelo (`text-amber-600`), 5+ vermelho (`text-destructive`)
- [ ] AC4: Contador baseado em `activities` com `type='CALL'` e `contact_id` do contato atual
- [ ] AC5: Hook `useContactAttempts(contactId)` criado para encapsular a query e logica de contagem
- [ ] AC6: Quando nao ha tentativas anteriores (primeira ligacao), badge nao e exibido
- [ ] AC7: Data da ultima tentativa formatada de forma relativa ("hoje 10h", "ontem 15h", "12/03 9h")
- [ ] AC8: Dark mode validado no badge de tentativas

## Scope

### IN
- Hook `useContactAttempts(contactId)` que retorna `{ count, lastAttempt, lastOutcome, isLoading }`
- Badge de tentativas no card do contato no PowerDialer
- Codificacao visual por cor (neutro/amarelo/vermelho)
- Formatacao de data relativa para ultima tentativa

### OUT
- Historico detalhado de todas as tentativas (ja existe no ContactHistory)
- Sugestao automatica de "melhor horario para ligar"
- Bloqueio automatico apos N tentativas (decisao do corretor, nao do sistema)
- Alteracoes na tabela activities ou migrations

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Query em activities pode ser lenta com muitos registros | Baixa | Baixo | Query filtrada por contact_id (indexado) + type='CALL', LIMIT nao necessario pois contagem |
| Contagem inclui ligacoes de outros corretores | Baixa | Medio | Filtrar por `contact_id` apenas — todas as tentativas sao relevantes independente de quem ligou |

## Business Value

- **Decisao informada:** corretor sabe quando parar de insistir e mudar de canal
- **Produtividade:** evita tentativas excessivas em contatos que nao atendem
- **Indicador visual:** cor vermelha sinaliza claramente que e hora de tentar outro canal

## Criteria of Done

- [x] Badge de tentativas visivel no PowerDialer com contagem correta
- [x] Cores corretas por faixa de tentativas (neutro/amarelo/vermelho)
- [x] Data relativa da ultima tentativa formatada corretamente
- [x] Badge nao aparece na primeira ligacao (0 tentativas anteriores)
- [x] Dark mode validado
- [x] Testes unitarios cobrindo: contagem, cores, data relativa, estado vazio
- [x] Lint e typecheck passando
- [x] Nenhuma regressao no PowerDialer

## Tasks

- [x] Task 1: Hook useContactAttempts (AC: 4, 5)
  - [x] Subtask 1.1: Criar hook `useContactAttempts(contactId: string)` em `features/prospecting/hooks/useContactAttempts.ts`
  - [x] Subtask 1.2: Query em `activities` filtrada por `contact_id` e `type='CALL'`, ordenada por `date DESC`
  - [x] Subtask 1.3: Retornar `{ count: number, lastAttempt: { date: string, outcome: string } | null, isLoading: boolean }`
  - [x] Subtask 1.4: Outcome da ultima tentativa extraido de `metadata.outcome` (campo JSONB da activity — valores: connected, no_answer, voicemail, busy)

- [x] Task 2: Badge de tentativas no PowerDialer (AC: 1, 2, 3, 6, 7, 8)
  - [x] Subtask 2.1: Chamar `useContactAttempts(contact.contactId)` no PowerDialer
  - [x] Subtask 2.2: Renderizar badge abaixo do nome/telefone (apos linha ~280 no card do contato)
  - [x] Subtask 2.3: Formato: "{N}a tentativa — ultima: {data relativa} ({outcome traduzido})"
  - [x] Subtask 2.4: Traducao de outcomes: connected="atendeu", no_answer="nao atendeu", voicemail="correio de voz", busy="ocupado"
  - [x] Subtask 2.5: Formatacao de data relativa: hoje → "hoje HHh", ontem → "ontem HHh", mais antigo → "DD/MM HHh"
  - [x] Subtask 2.6: Classe de cor baseada no count: `count <= 2 ? 'text-muted-foreground' : count <= 4 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'`
  - [x] Subtask 2.7: Quando `count === 0`, nao renderizar badge (AC6)
  - [x] Subtask 2.8: Icone `PhoneCall` (lucide-react) ao lado do texto para contexto visual

- [x] Task 3: Testes unitarios (AC: 1-8)
  - [x] Subtask 3.1: Teste: hook retorna count correto para 0, 1, 3, 5 activities
  - [x] Subtask 3.2: Teste: badge nao renderiza quando count=0
  - [x] Subtask 3.3: Teste: cor neutra para count=1 e count=2
  - [x] Subtask 3.4: Teste: cor amarela para count=3 e count=4
  - [x] Subtask 3.5: Teste: cor vermelha para count=5+
  - [x] Subtask 3.6: Teste: data formatada como "hoje", "ontem", "DD/MM"
  - [x] Subtask 3.7: Teste: outcome traduzido corretamente (connected→atendeu, etc.)

## Dev Notes

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| useContactAttempts | `features/prospecting/hooks/useContactAttempts.ts` | NOVO — hook de contagem de tentativas |
| PowerDialer | `features/prospecting/components/PowerDialer.tsx` | Adicionar badge de tentativas no card do contato (~linha 280) |
| Test file | `features/prospecting/__tests__/contactAttempts.test.tsx` | NOVO — testes do hook e badge |

### Activities — estrutura relevante

A tabela `activities` tem campos relevantes:
- `contact_id UUID` — FK para contacts
- `type TEXT` — enum incluindo 'CALL'
- `date TIMESTAMPTZ` — data da atividade
- `metadata JSONB` — contem `outcome` (connected/no_answer/voicemail/busy) para calls de prospeccao

Query do hook:
```typescript
const { data } = await supabase
  .from('activities')
  .select('date, metadata')
  .eq('contact_id', contactId)
  .eq('type', 'CALL')
  .order('date', { ascending: false })
```

### PowerDialer — local de insercao

O card do contato esta em `PowerDialer.tsx:260-300`. O badge deve ser inserido apos o bloco de nome/telefone/email e antes do script selector. Referencia visual: similar ao temperature badge (HOT/WARM/COLD) que ja existe na mesma area.

### Formatacao de data relativa

```typescript
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  const hours = date.getHours()

  if (diffDays === 0) return `hoje ${hours}h`
  if (diffDays === 1) return `ontem ${hours}h`
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${hours}h`
}
```

### Testing

- **Framework:** Vitest + React Testing Library
- **Mock:** `vi.mock('@/lib/supabase/client')` para mockar query em activities
- **Referencia:** seguir padrao de `dealLinking.test.tsx`

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (hook + componente visual)
- **Complexity:** Low — 1 hook novo, 1 badge em componente existente

**Specialized Agent Assignment:**

Primary Agents:
- @dev (pre-commit reviews)

Supporting Agents:
- @devops (pre-PR)

**Quality Gate Tasks:**
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main`

**Self-Healing Configuration:**
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutos
- Severity Filter: CRITICAL

**Predicted Behavior:**
- CRITICAL issues: auto_fix (ate 2 iteracoes)
- HIGH issues: document_only

**CodeRabbit Focus Areas:**

Primary Focus:
- Performance: query em activities nao deve ser N+1 — 1 query por contato, nao por render
- Type safety: metadata.outcome tipado corretamente (nao any)

Secondary Focus:
- Dark mode: cores amarela e vermelha com variantes dark
- Acessibilidade: badge com aria-label descritivo

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-14 | 1.0 | Story criada | @sm (River) |
| 2026-03-14 | 1.1 | Validacao GO (10/10). Story limpa, sem correcoes necessarias. Status Draft → Ready | @po (Pax) |
| 2026-03-14 | 2.0 | Implementacao completa: hook, badge, testes (19 novos + 37 regressao OK). Status Ready → Ready for Review | @dev (Dex) |
| 2026-03-14 | 2.1 | QA PASS. Concern C1 (query sem LIMIT) corrigida pelo @dev com count+limit | @qa (Quinn) |
| 2026-03-14 | 2.2 | QA re-review PASS. Push develop (9b36bec + 1f53d2c). Status Ready for Review → Done | @devops (Gage) |

## File List

| Arquivo | Alteracao |
|---------|-----------|
| `features/prospecting/hooks/useContactAttempts.ts` | NOVO — hook + formatRelativeDate + OUTCOME_LABELS + getAttemptColorClass |
| `features/prospecting/components/PowerDialer.tsx` | MODIFICADO — import hook + badge de tentativas no card do contato |
| `features/prospecting/__tests__/contactAttempts.test.tsx` | NOVO — 19 testes (formatacao, cores, badge rendering) |
| `features/prospecting/__tests__/powerDialer.test.tsx` | MODIFICADO — mock do useContactAttempts |
| `features/prospecting/__tests__/powerDialerGoal.test.tsx` | MODIFICADO — mock do useContactAttempts |

---

*Story gerada por @sm (River) — Epic CP-7*
