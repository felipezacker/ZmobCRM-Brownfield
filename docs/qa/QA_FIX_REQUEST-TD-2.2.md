# QA Fix Request — TD-2.2

## Metadata
- **Story:** TD-2.2 (IA -- BASE_INSTRUCTIONS + Prospecting Tools + Exposure Gaps)
- **Gate Verdict:** PASS (com observacoes)
- **Requested by:** @qa (Quinn)
- **Date:** 2026-03-07
- **Priority:** MEDIUM
- **Blocking:** NO (merge permitido, corrigir em story futura ou wave seguinte)

---

## Issue 1: `quick_scripts` sem `organization_id` — multi-tenancy incompleta

### Severidade: MEDIUM

### Descricao

A tabela `quick_scripts` nao possui coluna `organization_id`. O scoping e feito apenas por `user_id` via RLS (`is_system = true OR user_id = auth.uid()`).

Quando o AI agent usa o admin client (fallback quando `supabaseClient` nao e passado — contextos MCP/externos), RLS e bypassado e `listQuickScripts` pode retornar scripts de **todos os usuarios de todas as organizacoes**.

### Risco

Baixo em producao (chat normal usa supabaseClient com sessao do user). Medio em contextos MCP/API onde admin client e usado.

### Fix esperado

1. **Migration:** Adicionar coluna `organization_id` a `quick_scripts`:

```sql
-- Migration: add organization_id to quick_scripts
ALTER TABLE public.quick_scripts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill: derivar org_id do user_id via profiles
UPDATE public.quick_scripts qs
SET organization_id = p.organization_id
FROM public.profiles p
WHERE qs.user_id = p.id
  AND qs.organization_id IS NULL;

-- System scripts (user_id IS NULL): atribuir a todas as orgs ou manter NULL
-- Decisao de negocio: se scripts do sistema sao globais, manter NULL e ajustar RLS

-- Tornar NOT NULL apos backfill (exceto system scripts)
-- ALTER TABLE public.quick_scripts ALTER COLUMN organization_id SET NOT NULL;
-- Apenas se decidir que system scripts tambem precisam de org_id

CREATE INDEX IF NOT EXISTS idx_quick_scripts_org ON public.quick_scripts(organization_id);
```

2. **RLS:** Atualizar policies para incluir `organization_id`:

```sql
DROP POLICY IF EXISTS "quick_scripts_select" ON public.quick_scripts;
CREATE POLICY "quick_scripts_select" ON public.quick_scripts
    FOR SELECT TO authenticated
    USING (
        is_system = true
        OR (
            user_id = auth.uid()
            AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );
```

3. **Tool code:** Adicionar filtro em `prospecting-tools.ts`:

```typescript
// listQuickScripts — adicionar filtro org_id
let q = supabase
    .from('quick_scripts')
    .select('id, title, category, template, icon, is_system, created_at')
    .eq('organization_id', organizationId)  // <-- ADICIONAR
    .order('created_at', { ascending: false })
    .limit(limit);

// createQuickScript e generateAndSaveScript — adicionar org_id no insert
const { data, error } = await supabase
    .from('quick_scripts')
    .insert({
        title,
        category,
        template,
        icon: 'MessageSquare',
        is_system: false,
        user_id: userId,
        organization_id: organizationId,  // <-- ADICIONAR
    })
```

### Arquivos para modificar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/YYYYMMDD_add_org_id_to_quick_scripts.sql` | Nova migration |
| `lib/ai/tools/prospecting-tools.ts` | Adicionar `organization_id` em queries e inserts |

### Validacao

- `supabase db push` sem erros
- `npm run typecheck` passando
- `listQuickScripts` com admin client retorna apenas scripts da org do user
- Scripts de sistema (`is_system = true`) continuam visiveis para todos

---

## Issue 2: `generateAndSaveScript` — nome e comportamento desalinhados

### Severidade: LOW

### Descricao

A tool `generateAndSaveScript` tem description dizendo "Gera um script de vendas usando IA e salva automaticamente", mas internamente **nao gera conteudo** — ela espera que o LLM componha o texto e passe no parametro `context`.

Quando `baseScriptId` nao e fornecido e `context` e vago (ex: "deal de alto valor"), o script salvo sera apenas essa string crua, sem formatacao nem qualidade de script real.

Trecho atual (`prospecting-tools.ts:288-290`):
```typescript
const template = baseTemplate
    ? `[Baseado em script existente]\n${baseTemplate}\n\n[Contexto: ${scriptContext || 'nenhum'}]`
    : scriptContext || title;
```

### Fix esperado

**Opcao A (recomendada): Renomear e ajustar description**

Renomear para `saveScript` ou manter `generateAndSaveScript` mas ajustar a description para ser precisa:

```typescript
generateAndSaveScript: tool({
    description: 'Salva um script de vendas na tabela quick_scripts. O conteudo do script deve ser composto por voce (LLM) e passado no campo "template". Use "context" apenas como referencia para composicao.',
    inputSchema: z.object({
        title: z.string().min(1).describe('Titulo do script'),
        category: z.enum([...]).describe('Categoria'),
        template: z.string().min(1).describe('Conteudo completo do script (composto pelo LLM)'),
        context: z.string().optional().describe('Contexto de referencia (deal, contato, situacao)'),
        baseScriptId: z.string().optional().describe('ID de script existente para usar como base'),
    }),
```

Mudanca principal: adicionar `template` como campo obrigatorio com o conteudo ja composto, em vez de depender de `context`.

**Opcao B: Implementar geracao interna**

Chamar a API de IA internamente para gerar o script. Mais complexo e adiciona latencia/custo. Nao recomendado neste momento.

### Arquivos para modificar

| Arquivo | Acao |
|---------|------|
| `lib/ai/tools/prospecting-tools.ts` | Ajustar description e inputSchema de `generateAndSaveScript` |
| `lib/ai/prompts/catalog.ts` | Atualizar notes se necessario |
| `lib/ai/__tests__/prospecting-tools.test.ts` | Atualizar teste se schema mudar |

### Validacao

- Testar via chat: "gere um script de closing para o deal X e salve" — script salvo deve ter conteudo formatado, nao string crua
- `npm run typecheck` passando
- Testes atualizados passando

---

## Issue 3: Contagem de tools inconsistente na story

### Severidade: LOW

### Descricao

A story TD-2.2 menciona "27 tools" na descricao e em varios ACs (ex: AC3 "menciona todas as 27 tools"), mas o sistema real tem **36 tools**. O prompt (tanto fallback quanto catalog) ja diz corretamente "36 disponiveiss".

A inconsistencia existe porque a story foi escrita quando havia 27 tools, mas 9 tools adicionais foram criadas antes/durante a implementacao.

### Fix esperado

Atualizar os textos da story para refletir a contagem real:

```markdown
## Descricao
- "conhece apenas 15 das 36 ferramentas disponiveis" (era 27)

## AC3
- "then menciona todas as 36 tools disponiveis (nao apenas 15)" (era 27)
```

### Arquivos para modificar

| Arquivo | Acao |
|---------|------|
| `docs/stories/active/TD-2.2-ai-agent-alignment.story.md` | Corrigir "27" para "36" na descricao e AC3 |

### Validacao

- Grep por "27 tools" no arquivo retorna 0

---

## Resumo de prioridades

| Issue | Severidade | Esforco | Recomendacao |
|-------|-----------|---------|--------------|
| 1. `quick_scripts` sem org_id | MEDIUM | ~2h (migration + code + teste) | Corrigir em proxima wave de TD |
| 2. `generateAndSaveScript` naming | LOW | ~30min | Corrigir junto com issue 1 |
| 3. Contagem "27" na story | LOW | ~5min | Corrigir agora (cosmético) |
