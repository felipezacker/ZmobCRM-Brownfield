# Story CP-7.4: Resumo Pos-Sessao com Acoes

## Metadata
- **Story ID:** CP-7.4
- **Epic:** CP-7 (Prospeccao — Produtividade & Conversao do Corretor)
- **Status:** Done
- **Priority:** P1
- **Estimated Points:** 5 (S-M)
- **Wave:** 2
- **Assigned Agent:** @dev
- **Dependencies:** CP-7.1 (botao "Nao ligar mais" reutilizado)

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @qa
- **quality_gate_tools:** [code_review, component_test, visual_qa]

## Story

**As a** corretor usando o PowerDialer do ZmobCRM,
**I want** ver um resumo pos-sessao com pendencias acionaveis (contatos conectados sem deal, retornos agendados, tentativas esgotadas),
**so that** eu resolva follow-ups antes de fechar e nenhuma oportunidade se perca.

## Descricao

Hoje o `SessionSummary` exibe apenas contadores agregados (total, conectadas, nao atendeu, etc.) e tempo de sessao. O corretor fecha o resumo e precisa lembrar de cabeca quais contatos precisa acompanhar. Nao ha acoes acionaveis — e apenas um dashboard de numeros.

**Resultado atual:** Resumo com 7 metricas numericas + tempo. Nenhuma pendencia listada, nenhuma acao disponivel.

**Resultado esperado:** Resumo enriquecido com 3 blocos acionaveis abaixo das metricas:

1. **Atenderam sem deal:** Contatos com outcome=connected na sessao que nao tem deal aberto. Cada item com botao `[+ Criar Deal]`.
2. **Retornos agendados:** Retornos agendados para hoje a partir da sessao. Exibe nome + horario + "em Xh" ou "Atrasado".
3. **Tentativas esgotadas:** Contatos com 3+ tentativas sem sucesso. Botao `[WhatsApp]` (wa.me link) ou `[Nao ligar mais]` (5+ tentativas).

Cada bloco so aparece se tem itens. Se nenhuma pendencia: "Sessao impecavel — sem pendencias!".

## Acceptance Criteria

- [x] AC1: SessionSummary exibe bloco "Atenderam sem deal" listando contatos com outcome=connected na sessao que NAO tem deal aberto, cada um com botao `[+ Criar Deal]`
- [x] AC2: SessionSummary exibe bloco "Retornos agendados" listando retornos agendados para hoje (activities com `type='CALL'`, `metadata->>scheduled_return = 'true'`, `completed=false`, e `date` entre inicio e fim de hoje), com nome, horario, e indicador relativo ("em 2h" ou "Atrasado")
- [x] AC3: SessionSummary exibe bloco "Tentativas esgotadas" listando contatos com 3+ tentativas CALL sem sucesso na sessao, com botao `[WhatsApp]` (link wa.me/{phone}) e botao `[Nao ligar mais]` (para 5+ tentativas)
- [x] AC4: Cada bloco so aparece se tem pelo menos 1 item. Blocos vazios nao sao renderizados
- [x] AC5: Se nenhum dos 3 blocos tem itens, exibe mensagem "Sessao impecavel — sem pendencias!"
- [x] AC6: `SessionStats` expandido (ou prop complementar) para incluir array de `{ contactId, contactName, contactPhone, outcome }` dos contatos processados na sessao
- [x] AC7: Botao `[+ Criar Deal]` abre `CreateDealModal` pre-preenchido com contactId
- [x] AC8: Botao `[WhatsApp]` abre link `https://wa.me/55{phone}` em nova aba (target=_blank)
- [x] AC9: Botao `[Nao ligar mais]` reutiliza o modal de confirmacao de CP-7.1 (mesmo componente)
- [x] AC10: Dark mode validado em todos os blocos acionaveis
- [x] AC11: Blocos nao quebram layout do SessionSummary existente — adicionados abaixo das metricas

## Scope

### IN
- Expandir `SessionStats` ou criar prop complementar com dados por contato da sessao
- Bloco 1: "Atenderam sem deal" com cruzamento de sessao + deals
- Bloco 2: "Retornos agendados" com query de activities scheduled_return
- Bloco 3: "Tentativas esgotadas" com contagem de calls
- Reutilizar `CreateDealModal` e modal de opt-out de CP-7.1
- Link direto WhatsApp via wa.me
- Mensagem "Sessao impecavel" quando nao ha pendencias

### OUT
- Notificacoes push/email sobre pendencias
- Persistencia das pendencias alem do resumo (apenas exibicao)
- Acoes em batch (criar deal para todos de uma vez)
- Edicao de retornos agendados

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| SessionStats nao tem dados por contato — precisa expandir | Certo | Medio | Expandir `SessionStats` ou passar prop complementar — epic ja documenta isso |
| Cruzamento de dados (sessao + deals + tentativas) pode ser complexo | Baixa | Medio | Dados da sessao ja estao em memoria — queries leves |
| WhatsApp link com formato incorreto de telefone | Baixa | Baixo | Sanitizar phone: remover caracteres nao numericos, adicionar 55 se necessario |

## Business Value

- **Zero follow-ups perdidos:** corretor resolve pendencias antes de fechar
- **Conversao:** contatos conectados sem deal recebem deal imediatamente
- **Produtividade:** acoes diretas no resumo sem precisar navegar

## Criteria of Done

- [x] Bloco "Atenderam sem deal" funciona com botao criar deal
- [x] Bloco "Retornos agendados" exibe retornos de hoje com indicador temporal
- [x] Bloco "Tentativas esgotadas" funciona com WhatsApp e opt-out
- [x] Blocos vazios nao aparecem
- [x] "Sessao impecavel" aparece quando nao ha pendencias
- [x] SessionStats expandido com dados por contato
- [x] Dark mode validado
- [x] Testes unitarios cobrindo: cada bloco com dados, blocos vazios, sessao impecavel
- [x] Lint e typecheck passando
- [x] Nenhuma regressao no SessionSummary existente

## Tasks

- [x] Task 1: Expandir dados da sessao com lista de contatos (AC: 6)
  - [x] Subtask 1.1: Identificar onde `SessionStats` e populado — `useProspectingPageState.ts`
  - [x] Subtask 1.2: Criar tipo `SessionContact = { contactId: string, contactName: string, contactPhone: string, outcome: string }`
  - [x] Subtask 1.3: Acumular array de `SessionContact[]` conforme contatos sao processados (em `handleCallComplete` e `handleSkip`)
  - [x] Subtask 1.4: Passar `sessionContacts` como prop adicional para `SessionSummary` (nao alterar `SessionStats` — usar prop separada para nao quebrar usos existentes)

- [x] Task 2: Bloco "Atenderam sem deal" (AC: 1, 7)
  - [x] Subtask 2.1: Filtrar `sessionContacts` por `outcome === 'connected'`
  - [x] Subtask 2.2: Para cada contato conectado, verificar se tem deal aberto via `getOpenDealsByContact(contactId)` — fazer batch em paralelo com `Promise.all`
  - [x] Subtask 2.3: Listar contatos conectados SEM deal: nome, telefone, botao `[+ Criar Deal]`
  - [x] Subtask 2.4: Botao `[+ Criar Deal]` abre `CreateDealModal` com `initialContactId`
  - [x] Subtask 2.5: Apos criar deal, remover contato da lista (update state local)

- [x] Task 3: Bloco "Retornos agendados" (AC: 2)
  - [x] Subtask 3.1: Query em `activities` filtrada por: `type='CALL'`, `metadata->>scheduled_return = 'true'`, `completed = false`, `date` entre hoje 00:00 e hoje 23:59, e `contact_id` IN contatos da sessao
  - [x] Subtask 3.2: A data/hora de retorno esta no campo `date` da activity (NAO em metadata). Exibir cada retorno: nome do contato, horario do campo `date`, indicador relativo
  - [x] Subtask 3.3: Indicador relativo: se horario > agora → "em Xh", se horario < agora → "Atrasado" (vermelho)
  - [x] Subtask 3.4: Ordenar por horario `date` (mais proximo primeiro)

- [x] Task 4: Bloco "Tentativas esgotadas" (AC: 3, 8, 9)
  - [x] Subtask 4.1: Para cada contato da sessao com outcome != connected, contar tentativas totais (query `activities` type=CALL)
  - [x] Subtask 4.2: Filtrar contatos com 3+ tentativas
  - [x] Subtask 4.3: Exibir: nome, phone, total de tentativas, botao `[WhatsApp]`
  - [x] Subtask 4.4: Botao `[WhatsApp]`: `<a href="https://wa.me/55${phone.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer">`
  - [x] Subtask 4.5: Para contatos com 5+ tentativas, adicionar botao `[Nao ligar mais]` que reutiliza modal de CP-7.1

- [x] Task 5: Estado vazio e layout (AC: 4, 5, 10, 11)
  - [x] Subtask 5.1: Cada bloco renderiza apenas se `items.length > 0`
  - [x] Subtask 5.2: Se nenhum bloco tem items, exibir: icone de check + "Sessao impecavel — sem pendencias!" com styling positivo (verde)
  - [x] Subtask 5.3: Blocos posicionados abaixo das metricas existentes, separados por border-t
  - [x] Subtask 5.4: Dark mode: usar design tokens, validar todos os blocos

- [x] Task 6: Testes unitarios (AC: 1-11)
  - [x] Subtask 6.1: Teste: bloco "Atenderam sem deal" exibe contatos conectados sem deal
  - [x] Subtask 6.2: Teste: bloco nao exibe quando todos os conectados tem deal
  - [x] Subtask 6.3: Teste: bloco "Retornos agendados" exibe retornos de hoje
  - [x] Subtask 6.4: Teste: indicador "Atrasado" quando horario passou
  - [x] Subtask 6.5: Teste: bloco "Tentativas esgotadas" exibe contatos com 3+ tentativas
  - [x] Subtask 6.6: Teste: botao WhatsApp gera link correto
  - [x] Subtask 6.7: Teste: "Sessao impecavel" quando nao ha pendencias
  - [x] Subtask 6.8: Teste: blocos vazios nao renderizam

## Dev Notes

### Source Tree

| Arquivo | Path | Alteracao |
|---------|------|-----------|
| useProspectingPageState | `features/prospecting/hooks/useProspectingPageState.ts` | Adicionado `SessionContact` type, `sessionContacts` state, acumulacao em `handleCallComplete`, reset em `handleStartSession`, export. `QueueDeps.queue` expandido com `contactName?`/`contactPhone?` |
| SessionSummary | `features/prospecting/components/SessionSummary.tsx` | Reescrito — 3 blocos acionaveis (Atenderam sem deal, Retornos agendados, Tentativas esgotadas), estado vazio "Sessao impecavel", CreateDealModal/DoNotContactModal integrados, dark mode |
| ProspectingPage | `features/prospecting/ProspectingPage.tsx` | Passa `sessionContacts` como prop para SessionSummary, re-exporta `SessionContact` type |
| Test file | `features/prospecting/__tests__/sessionSummary.test.tsx` | NOVO — 12 testes cobrindo todos os blocos, estados vazios, WhatsApp link, "Nao ligar" |

### SessionSummary — estado atual

`SessionSummary.tsx` (113 linhas):
```typescript
interface SessionSummaryProps {
  stats: SessionStats
  startTime: Date | null
  onClose: () => void
}
```

Exibe 7 stats items (total, connected, noAnswer, voicemail, busy, skipped, tempo). Os blocos acionaveis devem ser adicionados ABAIXO dos stats items, separados por um `Separator`.

### SessionStats — nao alterar tipo existente

`SessionStats` e usado em multiplos locais. Para nao quebrar, criar prop separada:
```typescript
interface SessionSummaryProps {
  stats: SessionStats
  startTime: Date | null
  onClose: () => void
  sessionContacts?: SessionContact[]  // NOVO — prop opcional
}

type SessionContact = {
  contactId: string
  contactName: string
  contactPhone: string
  outcome: string
}
```

### useProspectingPageState — acumulacao de contatos

Em `handleCallComplete`, adicionar acumulacao:
```typescript
setSessionContacts(prev => [...prev, {
  contactId: currentContact.contactId,
  contactName: currentContact.contactName || '',
  contactPhone: currentContact.contactPhone || '',
  outcome
}])
```

### Retornos agendados — estrutura real (VERIFICADO)

Schedule Return em `QuickActionsPanel.tsx:93-117` cria activity com:
```typescript
type: 'CALL'                                      // tipo CALL, NAO TASK
metadata: { source: 'prospecting', scheduled_return: true }  // boolean flag
date: returnDateTime                               // data/hora de retorno AQUI
completed: false                                   // nao completado ainda
```

Query correta:
```typescript
const todayStart = new Date(); todayStart.setHours(0,0,0,0)
const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)

const { data } = await supabase
  .from('activities')
  .select('contact_id, date, metadata')
  .in('contact_id', sessionContactIds)
  .eq('type', 'CALL')
  .eq('metadata->>scheduled_return', 'true')
  .eq('completed', false)
  .gte('date', todayStart.toISOString())
  .lte('date', todayEnd.toISOString())
  .order('date', { ascending: true })
```

**Nota:** `metadata.scheduled_return` e boolean (`true`), nao uma data. A data de retorno esta no campo `date` da activity.

### WhatsApp link

```typescript
const formatWhatsAppLink = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  return `https://wa.me/${withCountry}`
}
```

### Dependencia CP-7.1 — modal "Nao ligar mais"

O bloco "Tentativas esgotadas" reutiliza o modal de confirmacao de CP-7.1 para a opcao "Nao ligar mais". Se CP-7.1 nao estiver pronto, o botao pode ser renderizado mas desabilitado com tooltip "Disponivel apos CP-7.1".

### Testing

- **Framework:** Vitest + React Testing Library
- **Mocks:** `vi.mock('@/lib/supabase/deals')`, `vi.mock('@/lib/supabase/contacts')`
- **Referencia:** seguir padrao de testes existentes em `features/prospecting/__tests__/`

## CodeRabbit Integration

**Story Type Analysis:**
- **Primary Type:** Frontend (componente + logica de cruzamento de dados)
- **Complexity:** Medium — 3 blocos com queries diferentes, mas dados da sessao ja em memoria

**Specialized Agent Assignment:**

Primary Agents:
- @dev (pre-commit reviews)
- @ux-expert (visual_qa — layout dos blocos, dark mode)

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
- Performance: Promise.all para batch de `getOpenDealsByContact` — nao fazer N queries sequenciais
- State management: sessionContacts acumulado corretamente durante sessao, nao resetado acidentalmente
- Layout: blocos nao quebram SessionSummary existente

Secondary Focus:
- Dark mode: design tokens em todos os blocos
- Acessibilidade: links WhatsApp com aria-label, botoes com labels descritivos
- Security: link WhatsApp com rel="noopener noreferrer"

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-14 | 1.0 | Story criada | @sm (River) |
| 2026-03-14 | 1.1 | Validacao GO. Correcao CRITICA: Schedule Return usa type='CALL' com metadata.scheduled_return=true (boolean) e data no campo `date`, NAO type='TASK' com data em metadata. Task 3, AC2 e Dev Notes corrigidos. Status Draft → Ready | @po (Pax) |
| 2026-03-14 | 2.0 | Implementacao completa: Tasks 1-6 done, 12 testes, lint+typecheck limpos, 727 testes no suite passando. Status Ready → InProgress | @dev (Dex) |
| 2026-03-14 | 2.1 | QA PASS — fixes aplicados (flash loading, non-null assertion). Pushed ae04795. Status Ready for Review → Done | @devops (Gage) |

---

*Story gerada por @sm (River) — Epic CP-7*
