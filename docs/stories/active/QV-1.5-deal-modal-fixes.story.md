# Story QV-1.5: Deal Modal — Edicao + Navegacao + Produto

## Metadata
- **Story ID:** QV-1.5
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

**As a** usuario do ZmobCRM,
**I want** que o modal do deal permita editar campos, navegar para deals vinculados e criar produtos inline,
**so that** possa gerenciar deals completamente sem sair do modal.

## Descricao

**Bug #2 (MEDIUM):** No modal do deal, o nome do contato vinculado e exibido como texto estatico (nao editavel). O telefone pode ou nao ser editavel dependendo de qual modal esta ativo — verificar. O valor do deal tambem pode nao ser editavel inline. Nao e possivel criar produto inexistente inline (diferente do DealCard que ja permite).

**Bug #4 (HIGH):** Deal criado via botao "+" na linha de contatos aparece no board e na aba deals do modal do contato, mas ao clicar para navegar ao deal da erro.

**Bug #11 UI (HIGH):** Deal criado pela IA aparece no board mas nao abre ao clicar (mesmo sintoma do Bug #4 — provavel mesmo root cause).

## Acceptance Criteria

- [ ] AC1: Given o modal do deal aberto, when edito o nome do contato vinculado, then a edicao e salva (onBlur) e persiste apos fechar o modal
- [ ] AC2: Given o modal do deal aberto, when edito telefone e valor do deal, then as edicoes sao salvas (onBlur) e persistem
- [ ] AC3: Given o modal do deal aberto e a aba de produtos, when digito um produto que nao existe e seleciono "Criar produto", then o produto e criado inline sem sair do modal (comportamento equivalente ao DealCard)
- [ ] AC4: Given um deal criado via "+" no contato, when clico no deal na aba deals do modal do contato, then o DealDetailModal daquele deal e aberto (nao navegar ao board — abrir modal filho)
- [ ] AC5: Given um deal recem-criado (via UI, via "+", ou via IA), when clico nele no board, then o modal do deal abre normalmente sem erro

## Scope

### IN
- Tornar nome do contato editavel no DealDetailModal (atualmente texto estatico)
- Verificar e corrigir editabilidade de telefone e valor do deal no DealDetailModal ativo
- Adicionar opcao de criar produto inline no modal do deal (replicar comportamento do DealCard)
- Fix de navegacao: aba deals do modal do contato deve abrir DealDetailModal filho
- Fix de deal recem-criado que nao abre ao clicar no board

### OUT
- Redesign do modal do deal
- Novas funcionalidades no modal alem das correcoes listadas

## Dependencies

- **QV-1.1** (realtime payload): pode resolver parcialmente o AC5 (deal recem-criado que nao abre). QV-1.1 esta em status Ready (nao implementada ainda em 2026-03-09). O @dev deve verificar se QV-1.1 foi implementada antes de abordar o AC5, para evitar trabalho duplicado.

## Risks

- **Risco 1 (ALTO):** Existem dois DealDetailModal.tsx no codebase (ver Dev Notes — FIX-1.5.1). O @dev pode modificar o arquivo errado. Mitigacao: identificar qual e importado no board antes de qualquer mudanca.
- **Risco 2 (MEDIO):** O nome do contato e editavel via contactId — a edicao pode atualizar o registro do contato globalmente, nao apenas o vinculo do deal. Verificar scope da mutacao.
- **Risco 3 (BAIXO):** AC5 pode ser resolvido inteiramente pela QV-1.1 (sem codigo adicional nesta story). Documentar como won-by-dependency se for o caso.

## Business Value

Usuarios nao conseguem editar informacoes basicas do deal sem fechar o modal e navegar a outras telas. Isso gera friccao operacional e retrabalho. Corrigir esses bugs elimina interrupcoes no fluxo de gestao de deals, aumentando a produtividade do time comercial.

## Criteria of Done

- [ ] AC1 verificado manualmente: nome do contato editavel e persistido
- [ ] AC2 verificado manualmente: telefone e valor editaveis e persistidos
- [ ] AC3 verificado manualmente: produto inexistente criado inline no modal
- [ ] AC4 verificado manualmente: clicar no deal na aba deals abre DealDetailModal filho
- [ ] AC5 verificado manualmente: deal recem-criado abre ao clicar no board
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] Apenas o DealDetailModal ativo (confirmado no board) foi modificado

## Tasks

- [ ] Task 0 (Pre-requisito): Identificar qual DealDetailModal.tsx esta ativo no board
  - [ ] 0.1: Buscar importacoes no board/kanban para determinar qual arquivo e usado: `features/boards/components/Modals/DealDetailModal.tsx` OU `features/boards/components/deal-detail/DealDetailModal.tsx`
  - [ ] 0.2: Se ambos coexistirem e um for deprecated, documentar no Change Log qual e o ativo e qual o deprecated
  - [ ] 0.3: Todo trabalho das Tasks 1-4 deve acontecer SOMENTE no arquivo ativo

- [ ] Task 1 (AC1, AC2): Tornar campos editáveis no DealDetailModal ativo
  - [ ] 1.1: Tornar nome do contato editavel (atualmente texto estatico) — implementar input com onBlur save
  - [ ] 1.2: Verificar se telefone ja e editavel no modal ativo (Modals/DealDetailModal.tsx:688-722 ja tem phone/email com onBlur — confirmar se o modal ativo tem o mesmo comportamento)
  - [ ] 1.3: Verificar se valor do deal e editavel; se nao for, implementar input com onBlur save
  - [ ] 1.4: Garantir que mutacoes chamam React Query invalidation correta apos save

- [ ] Task 2 (AC3): Adicionar criacao de produto inline no modal
  - [ ] 2.1: Localizar a logica de criacao inline no DealCard (linhas 103-120, funcao `handleCreateProduct`)
  - [ ] 2.2: Extrair ou reutilizar a logica para o select de produtos no DealDetailModal
  - [ ] 2.3: Testar criacao inline com produto novo e com produto existente (nao deve duplicar)

- [ ] Task 3 (AC4): Corrigir navegacao da aba deals do modal do contato
  - [ ] 3.1: Localizar o componente que renderiza a aba deals no modal do contato
  - [ ] 3.2: Ao clicar num deal, chamar abertura do DealDetailModal com o dealId correto (nao navegar ao board)
  - [ ] 3.3: Verificar que o deal clicado tem ID valido (nao temporario)

- [ ] Task 4 (AC5): Investigar e corrigir deal recem-criado que nao abre
  - [ ] 4.1: Pre-condicao — verificar se QV-1.1 foi implementada; se sim, testar AC5 antes de codar (pode estar resolvido)
  - [ ] 4.2: Se AC5 ainda falha: investigar se o ID do deal no board e temporario (otimista) vs ID real do DB
  - [ ] 4.3: Verificar se o handler de click no DealCard busca o deal pelo ID e falha quando o ID nao existe ainda
  - [ ] 4.4: Implementar fix (aguardar ID real antes de tornar card clicavel, ou buscar deal com retry)

- [ ] Task 5: Quality gate
  - [ ] 5.1: `npm run typecheck` — zero erros
  - [ ] 5.2: `npm run lint` — zero warnings/errors
  - [ ] 5.3: Teste manual de todos os ACs no ambiente staging

## Dev Notes

**ATENCAO — FIX-1.5.1 (CRITICO):** Existem dois arquivos DealDetailModal.tsx no codebase:

1. `features/boards/components/Modals/DealDetailModal.tsx` — modal original (~1692 linhas)
2. `features/boards/components/deal-detail/DealDetailModal.tsx` — versao refatorada

O @dev DEVE identificar qual e importado pelo board/kanban antes de qualquer modificacao. Modificar o arquivo errado e retrabalho garantido. Se um e deprecated, documentar. Se ambos precisam de fix, listar ambos paths completos no File List.

**Sobre o AC2 — FIX-1.5.2:** O modal original em `features/boards/components/Modals/DealDetailModal.tsx` ja tem phone e email editaveis inline (linhas 688-722) com onBlur save. O @dev deve:
- (a) Verificar se o bug existe apenas no modal refatorado (`deal-detail/`)
- (b) Confirmar que o nome do contato (`contactName`) e de fato texto estatico no modal ativo — este provavelmente e o bug real do AC1
- (c) Confirmar que valor do deal nao e editavel — este e o bug real do AC2

**Sobre o AC4:** Ao clicar no deal na aba deals do modal do contato, o comportamento esperado e abrir o DealDetailModal do deal clicado (modal filho sobre o modal pai), nao navegar ao board. Verificar se o componente usa `router.push` (incorreto) ou abre modal (correto).

**Sobre o AC5 e QV-1.1:** O bug de deal que nao abre ao clicar pode ter o mesmo root cause da QV-1.1 (realtime envia payload incompleto, gerando ID temporario no estado local sem correspondencia no DB). Se QV-1.1 estiver implementada, testar AC5 antes de qualquer codigo adicional.

**Padrao de produto inline no DealCard:** O DealCard (`features/boards/components/Kanban/DealCard.tsx`) ja implementa criacao de produto inline. Ver linhas 103-120 e a funcao `handleCreateProduct`. Reutilizar essa logica no DealDetailModal ao inves de reescrever.

### Source Tree

**Arquivos a modificar (definir qual DealDetailModal — ver FIX-1.5.1 acima):**
- `features/boards/components/Modals/DealDetailModal.tsx` (original, ~1300 linhas) — OU
- `features/boards/components/deal-detail/DealDetailModal.tsx` (refatorado)
- `features/boards/components/deal-detail/deal-detail-products.tsx` — tab de produtos (se existir)

**Arquivos de referencia (somente leitura):**
- `features/boards/components/Kanban/DealCard.tsx` — padrao de criar produto inline (linhas 103-122, `handleCreateProduct`)
- `components/ConfirmModal.tsx` — modal filho para referencia de padrao

### Testing

**Abordagem:** Manual (nao ha testes automatizados para DealDetailModal)

**Cenarios por AC:**
- AC1: Abrir modal de um deal com contato vinculado → clicar no nome do contato → editar → clicar fora (onBlur) → fechar modal → reabrir → verificar que nome persistiu
- AC2: No modal → editar telefone e valor do deal → onBlur → reabrir → verificar persistencia
- AC3: No modal → aba produtos → digitar nome de produto inexistente → acionar criacao inline → verificar que produto foi criado e vinculado ao deal
- AC4: Abrir modal do contato → aba deals → clicar em deal → DealDetailModal deve abrir como modal filho (nao redirecionar ao board)
- AC5: Criar deal via UI (botao "+"), via modal de contato, e via IA → clicar no deal no board imediatamente apos criacao → modal deve abrir sem erro

**Dados de teste necessarios:** Deal existente com contato vinculado; produto para teste inline; usuario com permissao de edicao (admin ou corretor no staging)

## CodeRabbit Integration

**Story Type Analysis:**
- Primary Type: Frontend
- Complexity: High
- Secondary Types: State Management, Cache

**Specialized Agent Assignment:**
- Primary: @dev

**Quality Gate Tasks:**
- [ ] Pre-Commit review (@dev) — REQUIRED
- [ ] Pre-PR review (@devops) — se PR for criado

**Self-Healing Configuration:**
- Mode: light
- Max iterations: 2
- Timeout: 15 min
- Severity filter: [CRITICAL]
- Behavior: CRITICAL -> auto_fix, HIGH -> document_as_debt

**Focus Areas:**
- Inline editing patterns (onBlur save, optimistic updates)
- React Query cache invalidation correctness
- Modal navigation patterns (modal sobre modal vs router.push)
- Component reuse entre DealCard e DealDetailModal
- State consistency apos operacoes de create/update

## File List

_(a ser preenchido pelo @dev durante implementacao)_

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-09 | @sm | Story criada a partir do checklist post-td-validation |
| 2026-03-09 | @sm | Rework completo: FIX-1.5.1 (dois DealDetailModal), FIX-1.5.2 (AC2 investigacao), FIX-1.5.3 (Task 1 decomposta), FIX-1.5.4 (pré-condicao QV-1.1), FIX-1.5.5 (AC4 comportamento definido); adicionadas secoes Risks, Dependencies, Business Value, Criteria of Done, CodeRabbit Integration, Source Tree, Testing |
| 2026-03-09 | @po | Validacao GO (9/10). Status Draft -> Ready. 0 issues criticas, 3 should-fix (AC2 parcialmente redundante, contagem de linhas imprecisa, QV-1.1 status nao documentado). Anti-hallucination: todos os file paths e claims verificados contra codebase real. |
| 2026-03-09 | @sm | Fix SF-2: contagem de linhas corrigida (1692, 103-122). Fix SF-3: status QV-1.1 (Ready, nao implementada) documentado em Dependencies. quality_gate corrigido de @qa para @architect |

---
*Story gerada por @sm (River) — Epic QV*
