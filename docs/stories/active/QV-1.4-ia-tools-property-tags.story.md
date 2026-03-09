# Story QV-1.4: IA Tools — Property Ref Busca + Tags/Custom Fields

## Metadata
- **Story ID:** QV-1.4
- **Epic:** QV (Quality Validation)
- **Status:** Ready
- **Priority:** P1
- **Estimated Points:** 5
- **Assigned Agent:** @dev

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [typecheck, lint, test]

## Story

**As a** usuario do ZmobCRM usando o chat de IA,
**I want** que a IA consiga buscar deals por imovel/property_ref, encontrar contatos por tag e filtrar por custom fields,
**so that** possa usar linguagem natural para consultas avancadas no CRM.

## Descricao

4 bugs nas tools de IA identificados no Epic QV (post-TD validation checklist). A investigacao do codigo revelou que parte das tools ja recebe os parametros corretos (expostos no commit 4d0c884), mas a IA nao os usa — os root causes sao diferentes por bug:

**Bug #10 (HIGH):** Ao pedir "busque deals com imovel X", a IA busca pelo titulo do deal em vez de usar o campo `property_ref` para filtrar. Root cause: `searchDeals` nao tem parametro `property_ref` no schema — a tool literalmente nao suporta esse filtro.

**Bug #11 (HIGH):** Ao pedir "crie um deal com o contato Felipe e o imovel Shift", a IA nao vincula o property_ref ao deal. Root cause: `createDeal` JA persiste `property_ref` (linha 491 de deal-tools.ts). O problema e que a IA nao sabe que deve passar esse parametro. Bug #11 e parcialmente coberto por esta story (persistencia ja funciona); o bug de UI (deal nao abre ao clicar) sera tratado em QV-1.5.

**Bug #12 (MEDIUM):** Ao pedir "encontre contatos com tag VIP", a IA nao encontra mesmo existindo contatos com essa tag. Root cause: `searchContacts` JA TEM parametro `tag` com logica `.contains('tags', [tag])`, mas o parametro `query` e obrigatorio — quando a IA nao passa `query` junto com `tag`, a chamada pode falhar ou a IA nao sabe que pode usar esses filtros isoladamente.

**Bug #13 (MEDIUM):** Ao pedir "encontre contatos com campo origem = indicacao", a IA nao filtra por custom field. Root cause: igual ao Bug #12 — `searchContacts` JA TEM `customFieldKey` e `customFieldValue` com logica `.contains('custom_fields', {...})`, mas o `query` obrigatorio e/ou a documentacao no BASE_INSTRUCTIONS nao deixa claro que esses filtros existem.

## Acceptance Criteria

- [ ] AC1: Given o prompt "busque deals com imovel Shift", when executado, then a IA usa o campo property_ref para filtrar e retorna deals com esse imovel
- [ ] AC2: Given o prompt "crie um deal com o contato Felipe e o imovel Shift", when executado, then o deal e criado com property_ref preenchido
- [ ] AC3: Given o prompt "encontre contatos com tag VIP", when executado, then retorna contatos que possuem a tag VIP
- [ ] AC4: Given o prompt "encontre contatos com campo origem = indicacao", when executado, then retorna contatos que possuem esse custom field

## Scope

### IN
- Adicionar parametro `propertyRef` em `searchDeals` em deal-tools.ts com filtro `.ilike('property_ref', ...)` (fix do Bug #10)
- Verificar e confirmar que `createDeal` persiste `property_ref` corretamente (Bug #11 — provavelmente apenas documentacao)
- Tornar parametro `query` opcional em `searchContacts` para que filtros de tag/custom_field funcionem sozinhos (fix dos Bugs #12 e #13)
- Melhorar descricao dos parametros `tag`, `customFieldKey`, `customFieldValue` no schema Zod de `searchContacts`
- Atualizar BASE_INSTRUCTIONS_FALLBACK em `lib/ai/crmAgent.ts` para documentar que searchDeals aceita propertyRef e que searchContacts aceita tag, customFieldKey, customFieldValue

### OUT
- Novas tools de IA
- Mudancas no frontend
- Bug de UI "deal nao abre ao clicar" (sera tratado em QV-1.5)
- Mudancas em `listContacts` se nao existir — verificar antes se ha tool separada

## Tasks

- [ ] Task 1 (AC1): Adicionar parametro `propertyRef` em `searchDeals` no schema Zod e na logica de query (filtro `.ilike('property_ref', ...)` paralelo ao filtro de titulo existente)
  - Subtask 1.1: Adicionar `propertyRef: z.string().optional()` no inputSchema de searchDeals
  - Subtask 1.2: Adicionar logica de filtro: `if (propertyRef) { queryBuilder = queryBuilder.ilike('property_ref', '%' + sanitizeFilterValue(propertyRef) + '%'); }` — usar sanitizacao para prevenir injection em LIKE pattern
  - Subtask 1.3: Atualizar description da tool para mencionar que busca tambem por imovel/property_ref

- [ ] Task 2 (AC2): Verificar createDeal — confirmar que property_ref ja e persistido (linha 491 deal-tools.ts). Se OK, apenas documentar no BASE_INSTRUCTIONS. Se nao OK, corrigir.
  - Subtask 2.1: Verificar codigo atual de createDeal (deal-tools.ts ~linha 491)
  - Subtask 2.2: Testar via chat "crie deal com Felipe e imovel Shift" e confirmar que property_ref aparece no banco
  - Subtask 2.3: Se bug confirmado, corrigir; se OK, registrar como verificado

- [ ] Task 3 (AC3): Investigar e corrigir por que IA nao usa filtro `tag` em searchContacts
  - Subtask 3.1: Verificar se `query` e obrigatorio no schema Zod de searchContacts — se sim, tornar `.optional()`
  - Subtask 3.2: Verificar se a logica de query sem `query` mas com `tag` funciona (o `if (query)` so executa se query nao for vazio)
  - Subtask 3.3: Melhorar a description do parametro `tag` no schema para ser mais explicita

- [ ] Task 4 (AC4): Investigar e corrigir por que IA nao usa filtros customFieldKey/customFieldValue em searchContacts
  - Subtask 4.1: Verificar comportamento quando `query` e vazio mas `customFieldKey`/`customFieldValue` sao informados
  - Subtask 4.2: Melhorar descriptions dos parametros `customFieldKey` e `customFieldValue` no schema Zod

- [ ] Task 5: Atualizar BASE_INSTRUCTIONS_FALLBACK em `lib/ai/crmAgent.ts` (linha ~420)
  - Subtask 5.1: Adicionar na secao FERRAMENTAS que searchDeals aceita `propertyRef` para busca por imovel
  - Subtask 5.2: Adicionar nota explicita que searchContacts aceita `tag`, `customFieldKey`, `customFieldValue` como filtros standalone (sem precisar de query)
  - Subtask 5.3: Adicionar exemplo de uso: "Para buscar por tag: passe tag='VIP' sem precisar preencher query"

- [ ] Task 6: Testar via chat de IA cada cenario dos ACs (staging)

- [ ] Task 7: Garantir que npm run typecheck, lint e test passam

## Dev Notes

### Contexto Arquitetural

**property_ref em deals:**
- Campo TEXT simples na tabela `deals` — armazena referencia a um imovel (codigo, endereco curto)
- NAO e FK para nenhuma tabela. NAO existe tabela `products` no schema do ZmobCRM.
- Adicionado via migration `supabase/migrations/20260303120000_add_property_ref_to_deals.sql`
- JA esta exposto em createDeal e updateDeal (commit 4d0c884)

**searchDeals (deal-tools.ts):**
- Nao tem parametro `propertyRef` — precisa ser adicionado (Task 1)
- Filtro atual: apenas `title.ilike`
- O filtro de `property_ref` deve ser INDEPENDENTE do filtro de titulo: se `propertyRef` for informado, aplicar `.ilike('property_ref', ...)` SEM combinar com OR do titulo. Se AMBOS `query` e `propertyRef` forem informados, aplicar ambos como AND (filtrar deals que matcham titulo E property_ref). Se apenas `propertyRef`, buscar apenas por property_ref

**searchContacts (contact-tools.ts):**
- JA tem `tag`, `customFieldKey`, `customFieldValue` com logica correta de filtro
- Problema: `query` e declarado como `z.string()` sem `.optional()` — verificar se isso causa erro quando omitido
- Logica atual usa `if (query)` entao se query for string vazia a busca funciona, mas se for `undefined` pode haver erro de TS

**BASE_INSTRUCTIONS_FALLBACK:**
- Localizado em `lib/ai/crmAgent.ts` linha 420 (NAO em lib/ai/base-instructions.ts — esse arquivo nao existe)
- O fallback e usado quando a tabela `ai_prompt_templates` esta indisponivel
- Tambem existe catalog no Supabase via `getResolvedPrompt()` que deve ser atualizado pelo admin separadamente

### Source Tree

**Arquivos a modificar:**
- `lib/ai/tools/deal-tools.ts` — Task 1: adicionar `propertyRef` como parametro e filtro em `searchDeals`
- `lib/ai/tools/contact-tools.ts` — Tasks 3/4: tornar `query` opcional, melhorar descriptions
- `lib/ai/crmAgent.ts` — Task 5: atualizar BASE_INSTRUCTIONS_FALLBACK (linha ~420)

**Arquivos de referencia (somente leitura):**
- `lib/ai/tools/activity-tools.ts` — padrao de como campos JSONB sao filtrados
- `supabase/migrations/20260303120000_add_property_ref_to_deals.sql` — schema do campo property_ref

### Testing

**Abordagem:** Manual (via chat IA no staging)
**Cenarios por AC:**
- AC1: Chat → "busque deals com imovel Shift" → retorna deals com property_ref contendo "Shift"
- AC2: Chat → "crie deal com contato Felipe e imovel Shift" → deal criado, property_ref = "Shift" no banco
- AC3: Chat → "encontre contatos com tag VIP" → retorna contatos com tag VIP (sem precisar de nome)
- AC4: Chat → "encontre contatos com campo origem = indicacao" → retorna contatos filtrados por custom field

**Testes existentes relevantes:**
- `lib/ai/__tests__/base-instructions-catalog.test.ts` — verificar se os novos campos precisam ser adicionados nos testes de alinhamento
- Nao ha testes automatizados para as tools de IA em si

**Dados de teste necessarios no staging:**
- Deals com `property_ref` preenchido (ex: "Shift", "Residencial Aurora")
- Contatos com `tags` = ["VIP"] e contatos com `custom_fields` = {"origem": "indicacao"}

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Backend
- Complexity: Medium
- Secondary Types: AI/Tools

**Specialized Agent Assignment:**
- Primary: @dev

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED
- [ ] Pre-PR review (@devops) — if PR created

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Zod schema: tornar `query` opcional sem quebrar tipagem TypeScript
- Supabase query builder: `.ilike('property_ref', ...)` pattern correto
- BASE_INSTRUCTIONS consistencia com capacidades reais das tools
- JSONB filter patterns para tags (`.contains('tags', [tag])`) e custom_fields (`.contains('custom_fields', {...})`)

## Risks

- **MEDIUM:** Tornar `query` opcional em searchContacts pode quebrar chamadas existentes que dependem de query obrigatorio — verificar todos os callers antes de alterar
- **LOW:** Adicionar filtro por propertyRef em searchDeals pode retornar resultados inesperados se logica de OR com titulo nao for bem definida
- **LOW:** BASE_INSTRUCTIONS_FALLBACK raramente e usado em producao (catalog do banco tem prioridade) — atualizacao tem baixo impacto imediato

## Dependencies

- Nenhuma story predecessora obrigatoria
- Commit 4d0c884 ja expoe `property_ref` em createDeal/updateDeal — esta story complementa adicionando filtro de busca
- Bug #11 de UI (deal nao abre ao clicar) sera tratado em QV-1.5

## Criteria of Done

- [ ] searchDeals aceita e usa parametro `propertyRef` para filtrar deals por imovel
- [ ] createDeal persiste property_ref corretamente (verificado, nao apenas assumido)
- [ ] searchContacts funciona com tag e/ou customFieldKey sem precisar preencher query
- [ ] BASE_INSTRUCTIONS_FALLBACK documenta os novos filtros disponiveis
- [ ] npm run typecheck passa sem erros
- [ ] npm run lint passa sem erros
- [ ] npm test passa (especialmente base-instructions-catalog.test.ts)
- [ ] Todos os 4 cenarios de chat testados manualmente no staging

## File List

_(a ser preenchido pelo @dev durante implementacao)_

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @sm | Rework completo: FIX-1.4.1 (property_ref e TEXT, nao FK), FIX-1.4.2 (BASE_INSTRUCTIONS em crmAgent.ts linha 420), FIX-1.4.3 (Tasks 3/4 reescritas: root cause e query obrigatorio + falta de documentacao, nao ausencia de parametros), FIX-1.4.4 (esclarecido que Bug #11 parcialmente coberto — UI fica para QV-1.5). Adicionadas secoes CodeRabbit Integration, Risks, Dependencies, Criteria of Done, Source Tree, Testing. |
| 2026-03-09 | @po | Validacao GO (10/10). Status Draft -> Ready. 0 critical issues, 2 should-fix (SF-1: pseudo-codigo deveria usar sanitizeFilterValue, SF-2: logica OR vs AND para property_ref+query nao totalmente definida). 13 anti-hallucination checks passaram. |
| 2026-03-09 | @sm | Fix SF-1: sanitizeFilterValue adicionado no pseudo-codigo. Fix SF-2: logica AND definida (query+propertyRef = ambos como AND). quality_gate corrigido de @qa para @architect |

---
*Story gerada por @sm (River) — Epic QV*
