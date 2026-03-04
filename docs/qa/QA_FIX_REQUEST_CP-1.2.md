# QA Fix Request — CP-1.2: Script Guiado Interativo

**Story:** CP-1.2
**QA Verdict:** PASS (com 3 issues LOW para polimento)
**Gerado por:** @qa (Quinn)
**Data:** 2026-03-03
**Prioridade:** LOW — Nenhum fix é bloqueante. Todos são polimento de UX.

---

## FIX-1: Variáveis não-resolvidas ficam visíveis como `{empresa}` no texto

**Severidade:** LOW
**Categoria:** UX / Requirements
**Arquivo:** `features/prospecting/utils/scriptParser.ts`

### Problema

`buildContactVariables` retorna string vazia para `empresa`, `valor`, `produto` porque o modelo `ProspectingQueueItem` não possui esses campos. O resultado é que se o template do script contém `{empresa}`, o texto renderizado mostra `{empresa}` literal — confuso para o corretor.

### Fix esperado

Adicionar uma função `cleanUnresolvedVariables` em `scriptParser.ts` que remove ou substitui variáveis `{...}` não-resolvidas após a substituição.

**Comportamento:** Variáveis não-resolvidas → substituir por string vazia (remover silenciosamente). Uma variável como `"da {empresa}"` viraria `"da "` — aceitável porque o corretor sabe que o dado não existe.

### Implementação

```typescript
// scriptParser.ts — adicionar APÓS substituteVariables

/**
 * Remove variáveis de template não-resolvidas (ex: {empresa} → "").
 * Roda APÓS substituteVariables para limpar sobras.
 */
export function cleanUnresolvedVariables(text: string): string {
  return text.replace(/\{[a-zA-Z_]+\}/g, '')
}
```

**Alterar em `ProspectingScriptGuide.tsx`** (linha ~40):

```typescript
// ANTES:
const processed = substituteVariables(script.template, variables)

// DEPOIS:
const processed = cleanUnresolvedVariables(substituteVariables(script.template, variables))
```

### Testes a adicionar (scriptParser.test.ts)

```typescript
describe('cleanUnresolvedVariables', () => {
  it('removes unresolved variables', () => {
    expect(cleanUnresolvedVariables('Olá {nome}, da {empresa}!')).toBe('Olá {nome}, da !')
    // Nota: {nome} só fica se não foi substituído antes — no fluxo real, roda APÓS substituteVariables
  })

  it('leaves text without variables unchanged', () => {
    expect(cleanUnresolvedVariables('Texto normal')).toBe('Texto normal')
  })

  it('removes multiple unresolved variables', () => {
    expect(cleanUnresolvedVariables('{a} e {b} e {c}')).toBe(' e  e ')
  })
})
```

### DoD

- [ ] `cleanUnresolvedVariables` exportada de `scriptParser.ts`
- [ ] Chamada no fluxo de `ProspectingScriptGuide` após `substituteVariables`
- [ ] 3 testes unitários passando
- [ ] Nenhum `{variavel}` visível no texto renderizado quando a variável não tem valor

---

## FIX-2: Objeções hardcoded — tornar context-aware por categoria do script

**Severidade:** LOW
**Categoria:** Code / UX
**Arquivo:** `features/prospecting/components/ProspectingScriptGuide.tsx`

### Problema

`COMMON_OBJECTIONS` é um array fixo de 8 objeções. Todas aparecem independente da categoria do script (`intro`, `followup`, `closing`, etc.). Objeções como "Preço alto" fazem mais sentido em `closing`, e "Já tem corretor" em `intro`.

### Fix esperado

Criar um mapa de objeções por categoria. Usar a categoria do script para mostrar objeções relevantes primeiro, seguidas das genéricas.

### Implementação

```typescript
// ProspectingScriptGuide.tsx — substituir COMMON_OBJECTIONS

const OBJECTIONS_BY_CATEGORY: Record<string, string[]> = {
  intro: ['Sem interesse', 'Já tem corretor', 'Não é o momento', 'Ligar depois'],
  followup: ['Sem interesse', 'Precisa pensar', 'Ligar depois', 'Precisa falar com cônjuge'],
  closing: ['Preço alto', 'Sem orçamento', 'Precisa pensar', 'Precisa falar com cônjuge'],
  objection: ['Preço alto', 'Já tem corretor', 'Sem orçamento', 'Não é o momento'],
  rescue: ['Sem interesse', 'Não é o momento', 'Ligar depois', 'Já tem corretor'],
  other: ['Sem interesse', 'Não é o momento', 'Precisa pensar', 'Ligar depois'],
}

const ALL_OBJECTIONS = [
  'Sem interesse',
  'Já tem corretor',
  'Preço alto',
  'Não é o momento',
  'Precisa pensar',
  'Ligar depois',
  'Sem orçamento',
  'Precisa falar com cônjuge',
] as const
```

**No componente**, usar `script.category` para ordenar:

```typescript
const objections = useMemo(() => {
  const prioritized = OBJECTIONS_BY_CATEGORY[script.category] || []
  const remaining = ALL_OBJECTIONS.filter(o => !prioritized.includes(o))
  return [...prioritized, ...remaining]
}, [script.category])
```

Renderizar `objections` em vez de `COMMON_OBJECTIONS`. As priorizadas podem ter um estilo diferente (ex: border mais visível) para indicar relevância.

### Testes a adicionar (scriptGuide.test.tsx)

```typescript
it('shows category-relevant objections first for intro script', () => {
  render(
    <ProspectingScriptGuide
      script={{ ...mockScripts[0], category: 'intro' }}
      contact={makeContact()}
      markedObjections={[]}
      onObjectionsChange={vi.fn()}
    />
  )
  const buttons = screen.getAllByRole('button').filter(b =>
    ALL_OBJECTIONS.some(o => b.textContent?.includes(o))
  )
  // First objection shown should be from intro category
  expect(buttons[0].textContent).toContain('Sem interesse')
})
```

### DoD

- [ ] `OBJECTIONS_BY_CATEGORY` mapeando categorias → objeções priorizadas
- [ ] `useMemo` com `script.category` para ordenar objeções
- [ ] Todas as 8 objeções continuam disponíveis (nenhuma removida)
- [ ] 1 teste confirmando ordenação por categoria
- [ ] Testes existentes de toggle continuam passando

---

## FIX-3: Clipboard falha silenciosamente — adicionar feedback visual

**Severidade:** LOW
**Categoria:** UX
**Arquivo:** `features/prospecting/components/ProspectingScriptGuide.tsx`

### Problema

O `handleCopySection` tem um `catch` vazio. Se a Clipboard API falhar (ex: HTTP sem HTTPS, iframe com permissões restritas), o usuário clica "Copiar" e nada acontece — sem feedback.

### Fix esperado

Usar o `useToast` já existente no projeto (`@/context/ToastContext`, já usado em `useProspectingQueue.ts`) para dar feedback de sucesso e erro.

### Implementação

```typescript
// ProspectingScriptGuide.tsx

import { useToast } from '@/context/ToastContext'

// Dentro do componente:
const { addToast, showToast } = useToast()
const toast = addToast || showToast

// Substituir handleCopySection:
const handleCopySection = useCallback(async (section: ScriptSection) => {
  try {
    await navigator.clipboard.writeText(section.content)
    setCopiedSection(section.id)
    setTimeout(() => setCopiedSection(null), 1500)
  } catch {
    toast('Não foi possível copiar o texto', 'error')
  }
}, [toast])
```

### Testes

Não precisa de teste novo — o mock do toast já existe no padrão do projeto. Os testes existentes de `ProspectingScriptGuide` não testam clipboard diretamente (jsdom não suporta), então não há regressão.

### DoD

- [ ] `useToast` importado e usado no `ProspectingScriptGuide`
- [ ] Toast de erro no catch do clipboard
- [ ] Testes existentes continuam passando (24/24)

---

## Resumo

| Fix | Arquivo principal | Complexidade | Testes novos |
|-----|-------------------|-------------|--------------|
| FIX-1 | `scriptParser.ts` + `ProspectingScriptGuide.tsx` | Trivial | +3 |
| FIX-2 | `ProspectingScriptGuide.tsx` | Baixa | +1 |
| FIX-3 | `ProspectingScriptGuide.tsx` | Trivial | 0 |

**Estimativa total:** ~30 min

**Validação pós-fix:**
```bash
npx vitest run features/prospecting/__tests__/ --reporter=verbose
npx tsc --noEmit
npx eslint features/prospecting/
```
