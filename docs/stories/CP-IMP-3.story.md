# Story CP-IMP-3: Auto-split de arquivos grandes na importacao

## Metadata
- **Story ID:** CP-IMP-3
- **Epic:** Avulsa (Central de Prospeccao)
- **Status:** Done
- **Priority:** P2
- **Estimated Points:** 3 (M)
- **Assigned Agent:** @dev
- **Dependencies:** CP-IMP-1, CP-IMP-2 (concluidas)

## Story

**As a** corretor ou diretor do ZmobCRM,
**I want** importar listas com mais de 500 contatos sem precisar dividir manualmente,
**so that** eu consiga prospectar listas grandes (eventos, compras de leads) de uma vez.

## Acceptance Criteria

- AC1: Arquivos com ate 5000 linhas sao aceitos (limite anterior: 500)
- AC2: O hook divide automaticamente em chunks de 500 linhas e envia cada chunk sequencialmente a API
- AC3: Progress bar reflete o progresso total (ex: "Importando 750/2000 contatos...")
- AC4: Resumo agrega totais de todos os chunks (criados, reutilizados, ignorados, erros)
- AC5: Se um chunk falhar, os anteriores ja processados sao preservados e o erro e reportado
- AC6: Tag automatica (CP-IMP-2) e a mesma para todos os chunks do lote
- AC7: Limite de 5MB de arquivo permanece inalterado

## Scope

### IN
- Aumentar MAX_ROWS de 500 para 5000
- Auto-split em chunks de 500 no hook
- Progress acumulado entre chunks
- Resumo agregado

### OUT
- Upload de multiplos arquivos simultaneos
- Background processing (worker/queue)
- Streaming upload

## Tasks / Subtasks

### Task 1: Auto-split no hook (AC1-AC6)
- [x] Aumentar MAX_ROWS para 5000
- [x] Loop sobre chunks de CHUNK_SIZE (500) com progress acumulado
- [x] Agregar totais e IDs de todos os chunks
- [x] Se chunk falhar, parar e reportar com totais parciais (AC5)
- [x] Tag automatica (CP-IMP-2) mesma para todos os chunks (AC6)

### Task 2: Testes
- [x] Teste unitario: CHUNK_SIZE exportado e igual a 500
- [x] Lint + typecheck passando

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-12 | @pm (Morgan) | Story criada |
| 2026-03-12 | @po (Pax) | Validacao: GO — status Ready |
| 2026-03-12 | @dev (Dex) | Implementacao: MAX_ROWS 5000, CHUNK_SIZE 500, loop com progress, 15/15 testes OK |
| 2026-03-13 | @po (Pax) | Auditoria de status: implementacao confirmada (commit 52db237), tasks [x]. Status Ready → Done. |

## File List

| Arquivo | Acao |
|---------|------|
| `features/prospecting/hooks/useImportToQueue.ts` | Modificado — MAX_ROWS 5000, CHUNK_SIZE, loop de chunks |
| `features/prospecting/__tests__/importTagTraceability.test.ts` | Modificado — teste CHUNK_SIZE |
| `docs/stories/CP-IMP-3.story.md` | Novo — story |
