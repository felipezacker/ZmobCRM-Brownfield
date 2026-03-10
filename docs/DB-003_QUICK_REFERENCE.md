# DB-003 Quick Reference Card

## Migration File
`supabase/migrations/20260308100001_db003_orphan_deals_visibility.sql` (186 lines)

## Functions Summary

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `get_orphan_deals_count()` | None | INTEGER | Count of orphan deals in org |
| `list_orphan_deals(limit, offset)` | Integer, Integer | TABLE (7 cols) | Paginated orphan deal list |
| `assign_orphan_deals_to_contact(ids[], contact)` | UUID[], UUID | INTEGER | Assign orphans to contact |
| `delete_orphan_deals(ids[])` | UUID[] | INTEGER | Soft-delete orphans |

## SQL Quick Test

```sql
-- Count
SELECT public.get_orphan_deals_count();

-- List top 10
SELECT * FROM public.list_orphan_deals(10, 0);

-- Assign (if orphans exist)
SELECT public.assign_orphan_deals_to_contact(
  ARRAY['deal-uuid-1', 'deal-uuid-2']::uuid[],
  'contact-uuid'::uuid
);

-- Delete
SELECT public.delete_orphan_deals(ARRAY['deal-uuid-1']::uuid[]);
```

## JavaScript Quick Usage

```typescript
// Count
const { data: count } = await supabase.rpc('get_orphan_deals_count');

// List
const { data: deals } = await supabase.rpc('list_orphan_deals', {
  p_limit: 50,
  p_offset: 0
});

// Assign
const { data: updated } = await supabase.rpc('assign_orphan_deals_to_contact', {
  p_deal_ids: ['uuid1', 'uuid2'],
  p_contact_id: 'contact-uuid'
});

// Delete
const { data: deleted } = await supabase.rpc('delete_orphan_deals', {
  p_deal_ids: ['uuid1']
});
```

## Key Properties

- **Scoping:** All functions org-scoped via `get_user_organization_id()`
- **Security:** SECURITY INVOKER respects RLS
- **Orphan Definition:** `contact_id IS NULL AND deleted_at IS NULL`
- **Delete Type:** Soft delete (not hard delete, sets `deleted_at = NOW()`)
- **Permissions:** All functions GRANT to authenticated role

## Requirements Mapped

| AC | Function(s) |
|----|------------|
| AC13 | `get_orphan_deals_count()`, `list_orphan_deals()` |
| AC14 | `list_orphan_deals()`, `assign_orphan_deals_to_contact()`, `delete_orphan_deals()` |

## Deployment

```bash
# Staging
supabase db push

# Production (explicit URL required)
supabase db push --db-url "postgresql://..."
```

## Docs

- **Summary:** `docs/DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md`
- **Implementation:** `docs/DB-003_IMPLEMENTATION_GUIDE.md`
- **Checklist:** `docs/DB-003_DEPLOYMENT_CHECKLIST.md`
- **This card:** `docs/DB-003_QUICK_REFERENCE.md`

## Next Step

Frontend: Create `lib/supabase/orphan-deals.ts` with RPC wrappers (see Implementation Guide).
