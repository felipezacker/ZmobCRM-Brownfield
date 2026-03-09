# Migration Rollback Pattern

Padrao documentado para rollback de migrations no Supabase/ZmobCRM.

## Contexto

O Supabase CLI (`supabase migration`) nao suporta down migrations nativamente.
Este documento define o padrao a ser seguido para garantir reversibilidade.

## Padrao: Rollback Script Pareado

Para cada migration critica (alteracao de schema, RLS, dados), crie um script
de rollback correspondente no mesmo diretorio.

### Estrutura de Arquivos

```
supabase/migrations/
  20260308120000_add_feature_x.sql          # Migration UP
  20260308120000_add_feature_x.rollback.sql  # Rollback DOWN (convencao)
```

### Convencoes

1. **Nomenclatura**: `{timestamp}_{description}.rollback.sql`
2. **Pareamento**: Cada `.sql` critico DEVE ter um `.rollback.sql` correspondente
3. **Idem-potencia**: Rollbacks devem ser seguros para executar multiplas vezes

### Exemplo Completo

**Migration UP** (`20260308120000_add_property_ref.sql`):
```sql
-- UP: Add property_ref column to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS property_ref TEXT;

-- Create index for search
CREATE INDEX IF NOT EXISTS idx_deals_property_ref ON public.deals (property_ref);
```

**Rollback DOWN** (`20260308120000_add_property_ref.rollback.sql`):
```sql
-- DOWN: Remove property_ref column from deals
-- Safe: IF EXISTS prevents errors if already rolled back
DROP INDEX IF EXISTS idx_deals_property_ref;
ALTER TABLE public.deals DROP COLUMN IF EXISTS property_ref;
```

## Quando Criar Rollback

| Tipo de Alteracao | Rollback Obrigatorio? |
|---|---|
| ADD COLUMN | Sim |
| DROP COLUMN | Sim (backup de dados antes) |
| ALTER COLUMN type | Sim |
| CREATE TABLE | Sim |
| CREATE INDEX | Opcional (baixo risco) |
| ALTER RLS policies | Sim |
| INSERT/UPDATE dados | Sim (com backup) |
| CREATE FUNCTION | Sim |

## Como Executar Rollback

### Via Supabase CLI (staging)
```bash
# Aplicar rollback diretamente no staging
supabase db execute --file supabase/migrations/20260308120000_add_feature_x.rollback.sql
```

### Via conexao direta (producao)
```bash
# CUIDADO: Producao requer --db-url explicito
psql "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  -f supabase/migrations/20260308120000_add_feature_x.rollback.sql
```

### Via Supabase Dashboard
1. Abrir SQL Editor no dashboard
2. Colar conteudo do rollback script
3. Executar e verificar resultado

## Checklist Pre-Rollback

- [ ] Backup dos dados afetados (se aplicavel)
- [ ] Testar rollback em staging primeiro
- [ ] Verificar dependencias (outras migrations que dependem desta)
- [ ] Notificar equipe sobre o rollback
- [ ] Verificar que nenhuma feature em producao depende da migration

## Boas Praticas

1. **Escreva o rollback junto com a migration** — nunca deixe para depois
2. **Teste ambas direcoes** — UP e DOWN devem funcionar em staging
3. **Dados sao irreversiveis** — DROP COLUMN perde dados; faca backup antes
4. **Sequencia importa** — rollback multiplas migrations na ordem inversa
5. **RLS rollback** — sempre restaure as policies anteriores, nunca deixe sem RLS
