# Pre-PR Production Checklist

## Purpose

Checklist obrigatória antes de criar PR de `develop` para `main` (produção).
Garante que código, documentação e instruções ao usuário estejam alinhados.

---

## Checklist

### Quality Gates (Automatizado)

- [ ] `npm run lint` — ESLint passa com 0 warnings
- [ ] `npm run typecheck` — TypeScript compila sem erros
- [ ] `npm run test:run` — Todos os testes passam
- [ ] `npm run build` — Build de produção gera sem erros

**Atalho:** `npm run precheck` roda tudo acima em sequência.

### Documentação do Usuário

- [ ] **`*update-instructions`** — Página `/instructions` atualizada com novas features
  - Task: `.aios-core/development/tasks/update-instructions-page.md`
  - Todas as features visíveis ao usuário documentadas
  - Nenhuma feature inventada

### Changelog

- [ ] `CHANGELOG.md` atualizado com nova versão
  - Features adicionadas
  - Bug fixes relevantes
  - Breaking changes (se houver)

### Database

- [ ] Migrations alinhadas entre `develop` e `main`
- [ ] Se houver novas migrations: testadas em staging (`supabase db push`)
- [ ] RLS policies verificadas para novas tabelas/colunas

### Código

- [ ] Sem `console.log` de debug deixados no código
- [ ] Sem `any` TypeScript adicionados
- [ ] Imports absolutos (sem `../../../`)
- [ ] Sem credenciais ou secrets no código

### Git

- [ ] Branch `develop` up-to-date com `main` (rebase/merge)
- [ ] Commits seguem conventional commits
- [ ] Nenhum arquivo grande (>1MB) adicionado acidentalmente

---

## Como Usar

Antes de criar o PR:

```bash
# 1. Quality gates
npm run precheck

# 2. Atualizar instruções (via Claude Code)
# Invocar: *update-instructions

# 3. Atualizar CHANGELOG.md

# 4. Criar PR
gh pr create --base main --head develop
```

---

## Severity

| Item | Severidade | Bloqueante? |
|------|-----------|-------------|
| Quality Gates | CRITICAL | SIM |
| Update Instructions | HIGH | SIM (se features novas) |
| Changelog | HIGH | SIM |
| Database | CRITICAL | SIM (se migrations) |
| Código | MEDIUM | NÃO (warn) |
| Git | LOW | NÃO |
