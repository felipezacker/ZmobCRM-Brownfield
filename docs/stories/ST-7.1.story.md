# Story ST-7.1: UX da Pagina de Permissoes

## Metadata
- **Story ID:** ST-7.1
- **Epic:** ST (Settings Overhaul)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 3 (S)
- **Wave:** 7
- **Assigned Agent:** @dev
- **Dependencies:** ST-6.2 (Permissoes Granulares por Role)

## Executor Assignment
- **executor:** @dev
- **quality_gate:** @architect
- **quality_gate_tools:** [code_review, accessibility_check]

## Story

**As a** administrador do ZmobCRM,
**I want** entender claramente o que cada permissao faz, ver o que estou mudando antes de salvar, e saber quantos usuarios serao afetados,
**so that** eu configure permissoes com confianca, sem medo de quebrar algo ou afetar usuarios sem querer.

## Descricao

A pagina de permissoes (ST-6.2) funciona corretamente mas a UX pode melhorar em 3 pontos concretos:

1. **Descricoes ausentes** — Cada toggle mostra apenas o label ("Ver Relatorios") sem explicar o que realmente muda. O admin precisa adivinhar o impacto.

2. **Sem feedback visual de mudancas** — Ao alterar toggles, nao ha indicacao visual de quais foram modificados. O botao "Salvar" aparece mas nao mostra o que vai mudar. Risco de salvar alteracoes nao intencionais.

3. **Sem preview de impacto** — O admin nao sabe quantos usuarios serao afetados por uma mudanca de role. Alterar "Corretor" sem saber que 15 pessoas usam esse role gera inseguranca.

**Decisao arquitetural (@architect):** Escopo limitado a estas 3 melhorias de UX. Sem mudanca de schema, sem novas tabelas, sem novas permissoes. Agrupamento por categoria, presets e permissao por usuario ficam pra demanda futura.

## Acceptance Criteria

- [ ] AC1: Given admin na pagina de permissoes, When visualiza qualquer permissao, Then ve o label E uma descricao explicativa abaixo (ex: "Ver Relatorios" + "Acesso ao dashboard de metricas e relatorios de vendas")
- [ ] AC2: Given admin altera um toggle, When a permissao muda do estado salvo, Then o toggle recebe indicacao visual diferenciada (borda ou dot colorido) mostrando que foi alterado
- [ ] AC3: Given admin tem alteracoes nao salvas, When olha o header, Then ve contador de alteracoes (ex: "3 alteracoes nao salvas")
- [ ] AC4: Given admin clica "Salvar" com alteracoes pendentes, When modal de confirmacao aparece, Then lista exatamente quais permissoes mudaram, para qual role, e de qual valor para qual (ex: "Corretor: Ver Relatorios OFF → ON")
- [ ] AC5: Given admin na pagina de permissoes, When visualiza o header de cada coluna de role, Then ve a quantidade de usuarios ativos com aquele role (ex: "Corretor (8 usuarios)")
- [ ] AC6: Given nenhuma alteracao feita, When admin nao mexeu em nada, Then botao "Salvar" permanece desabilitado e nao ha indicadores de mudanca

## Scope

### IN
- Objeto `PERMISSION_DESCRIPTIONS` em `lib/auth/roles.ts` com descricao de cada permissao
- Renderizacao de descricao abaixo de cada label de permissao no `PermissionsPage.tsx`
- Indicador visual (borda amarela ou dot) em toggles alterados vs estado salvo
- Contador de alteracoes no header ("X alteracoes nao salvas")
- Modal de confirmacao no save listando diff exato das mudancas
- Campo `usersPerRole` na response do GET `/api/admin/users` (ou endpoint de permissoes)
- Contagem de usuarios ativos por role no header de cada coluna

### OUT
- Novas permissoes (manter as 6 existentes)
- Agrupamento por categoria (futuro, quando houver 15+ permissoes)
- Presets por cargo (desnecessario com 6 permissoes)
- Permissao por usuario individual (complexidade alta, sem demanda)
- Mudancas no schema do banco de dados
- Novas tabelas ou migrations

## Dev Notes

### Arquivos a modificar
- `lib/auth/roles.ts` — adicionar `PERMISSION_DESCRIPTIONS: Record<PermissionKey, string>`
- `features/settings/PermissionsPage.tsx` — descricoes, diff visual, contador, modal de confirmacao
- `app/api/admin/users/route.ts` (ou endpoint de permissoes) — adicionar `usersPerRole` na response

### Descricoes sugeridas
```typescript
export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  ver_relatorios: 'Acesso ao dashboard de metricas e relatorios de vendas',
  editar_pipeline: 'Criar/editar boards, mover deals entre estagios, configurar lifecycle',
  gerenciar_equipe: 'Convidar, desativar e alterar cargo de membros da equipe',
  exportar_dados: 'Baixar contatos, deals e relatorios em CSV/Excel',
  acessar_ia: 'Chat com IA, scripts automaticos, insights de prospeccao',
  ver_todos_contatos: 'Ver contatos de toda a organizacao (sem isso, ve apenas os proprios)',
};
```

### usersPerRole
Adicionar ao response existente (GET `/api/admin/users` ou criar query separada):
```typescript
const usersPerRole = {
  admin: profiles.filter(p => p.role === 'admin' && p.is_active !== false).length,
  diretor: profiles.filter(p => p.role === 'diretor' && p.is_active !== false).length,
  corretor: profiles.filter(p => p.role === 'corretor' && p.is_active !== false).length,
};
```

### Diff visual
O estado para comparacao ja existe no componente:
- `localState` = estado atual dos toggles (editavel)
- `currentPermissions` = estado salvo no servidor
- Comparacao: `localState[role][perm] !== currentPermissions[role][perm]`

### Modal de confirmacao
Gerar lista de mudancas antes de salvar:
```typescript
const changes = ROLES.flatMap(({ key: role }) =>
  PERMISSIONS
    .filter(perm => localState[role][perm] !== currentPermissions[role][perm])
    .map(perm => ({
      role,
      permission: PERMISSION_LABELS[perm],
      from: currentPermissions[role][perm],
      to: localState[role][perm],
    }))
);
```

## Source Tree

| Arquivo | Acao | Path |
|---------|------|------|
| roles.ts | Modificar | `lib/auth/roles.ts` |
| PermissionsPage.tsx | Modificar | `features/settings/PermissionsPage.tsx` |
| route.ts (users) | Modificar | `app/api/admin/users/route.ts` |

## Tasks

### Task 1: Descricoes de permissoes
- [x] Subtask 1.1: Adicionar `PERMISSION_DESCRIPTIONS` em `lib/auth/roles.ts`
- [x] Subtask 1.2: Renderizar descricao como `<p>` abaixo de cada label de permissao no grid
- [x] Subtask 1.3: Garantir que descricao respeita dark mode e nao quebra layout mobile

### Task 2: Visual de diff e contador
- [x] Subtask 2.1: Adicionar indicador visual (borda amarela/dot) nos toggles alterados vs estado salvo
- [x] Subtask 2.2: Adicionar contador "X alteracoes nao salvas" no header ao lado dos botoes
- [x] Subtask 2.3: Garantir que indicadores limpam ao salvar ou descartar

### Task 3: Modal de confirmacao no save
- [x] Subtask 3.1: Criar modal de confirmacao que lista as mudancas exatas (role, permissao, de→para)
- [x] Subtask 3.2: Botao "Salvar" abre o modal em vez de salvar direto (quando ha alteracoes)
- [x] Subtask 3.3: Botao "Confirmar" no modal executa o save existente

### Task 4: Preview de impacto (usuarios por role)
- [x] Subtask 4.1: Adicionar `usersPerRole` na response do GET (contar usuarios ativos por role)
- [x] Subtask 4.2: Exibir contagem no header de cada coluna de role ("Corretor (8 usuarios)")
- [x] Subtask 4.3: Fetch da contagem no PermissionsPage (reusar dados existentes ou novo fetch)

### Task 5: Testes
- [x] Subtask 5.1: Testar renderizacao de descricoes para todas as 6 permissoes
- [x] Subtask 5.2: Testar indicador visual aparece/desaparece ao alterar/descartar toggle
- [x] Subtask 5.3: Testar modal de confirmacao lista mudancas corretas
- [x] Subtask 5.4: Testar contagem de usuarios por role no header

## Testing

### Validacoes
```bash
npm run lint
npm run typecheck
npm test -- --testPathPattern="permissions"
```

### Cobertura esperada
- Descricoes renderizadas para todas as permissoes
- Indicadores visuais de alteracao (toggle, contador)
- Modal de confirmacao com diff correto
- Contagem de usuarios por role

## Criteria of Done
- [x] Todas as tasks e subtasks marcadas [x]
- [x] Testes passando para cada funcionalidade
- [x] Lint e typecheck sem erros
- [x] Dark mode consistente
- [x] Nenhuma regressao na funcionalidade existente de permissoes

## CodeRabbit Integration
- [ ] Pre-Commit (@dev): `coderabbit --prompt-only -t uncommitted`
- [ ] Pre-PR (@devops): `coderabbit --prompt-only --base main`

## Dev Agent Record

### Agent Model Used
- Claude Opus 4.6 (1M context)

### Debug Log References
- Lint: 0 errors, 0 warnings
- Typecheck: 0 errors
- Tests: 8 testes (5 originais + 3 novos ST-7.1), passam individualmente. Worker hang pre-existente no afterAll do setup global (Supabase cleanup)

### Completion Notes
- PERMISSION_DESCRIPTIONS adicionado com 6 descricoes em roles.ts
- PermissionsPage reescrito com: descricoes, ring indicator amarelo, dot indicator, contador de alteracoes, modal de confirmacao com diff exato, contagem de usuarios por role
- API /api/admin/users retorna usersPerRole no response
- Testes cobrem descricoes, indicadores visuais, modal de confirmacao, contagem de usuarios

### File List
| Arquivo | Status | Path |
|---------|--------|------|
| roles.ts | Modificado | `lib/auth/roles.ts` |
| PermissionsPage.tsx | Modificado | `features/settings/PermissionsPage.tsx` |
| route.ts | Modificado | `app/api/admin/users/route.ts` |
| permissionsPage.test.tsx | Modificado | `features/settings/__tests__/permissionsPage.test.tsx` |

## Change Log
| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-03-15 | 1.0 | Story criada com 3 melhorias de UX aprovadas por @architect | @sm (River) |
| 2026-03-15 | 1.1 | Validacao GO (9/10). SF-1: sem secao de Riscos (risco minimo, pure UX). Status Draft → Ready | @po (Pax) |
| 2026-03-15 | 2.0 | Implementacao completa: descricoes, diff visual, contador, modal, usersPerRole. Lint/typecheck OK. | @dev (Dex) |
| 2026-03-15 | 2.1 | QA Review: CONCERNS (modal sem a11y). Fix aplicado: role=dialog, aria-modal, Escape, aria-label. | @qa (Quinn) + @dev (Dex) |
| 2026-03-15 | 2.2 | QA Re-review: PASS. Todos ACs atendidos, concern resolvida. Pronta para merge. | @qa (Quinn) |
