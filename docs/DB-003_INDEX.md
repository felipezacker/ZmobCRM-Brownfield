# DB-003 Complete Index

**Task:** Create Supabase migration for orphan deals visibility (AC13 + AC14)
**Status:** COMPLETE - Ready for deployment
**Created:** 2026-03-08
**Migration ID:** 20260308100001

---

## Table of Contents

### 1. Migration File (the code)
- **Location:** `/supabase/migrations/20260308100001_db003_orphan_deals_visibility.sql`
- **Size:** 186 lines, 5.8 KB
- **Purpose:** Creates 4 RPC functions + grants permissions
- **Status:** Ready to apply

### 2. Documentation Files (the guides)

| File | Purpose | Audience | Read Time |
|------|---------|----------|-----------|
| **DB-003_QUICK_REFERENCE.md** | Quick lookup card for all 4 functions | Everyone | 3 min |
| **DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md** | Detailed function documentation & testing | DBAs, QA | 15 min |
| **DB-003_IMPLEMENTATION_GUIDE.md** | Complete code examples for frontend | Frontend devs | 20 min |
| **DB-003_DEPLOYMENT_CHECKLIST.md** | Step-by-step deployment procedure | DevOps, QA | 10 min |
| **DB-003_INDEX.md** | This file - navigation guide | Everyone | 5 min |

### 3. Key Information

**Functions Created:**

```
get_orphan_deals_count()                      → INTEGER
list_orphan_deals(limit, offset)              → TABLE
assign_orphan_deals_to_contact(ids[], contact) → INTEGER
delete_orphan_deals(ids[])                    → INTEGER
```

**Requirements Met:**
- AC13: Admin dashboard orphan deal count ✓
- AC14: Mechanism to clean up / assign orphans ✓

**Security:**
- All functions SECURITY INVOKER (respects RLS)
- All functions org-scoped via `get_user_organization_id()`
- Proper validation in assign_orphan_deals_to_contact()
- Soft delete pattern (not hard delete)

---

## Getting Started Guide

### I just need to understand what was created (5 min)
1. Read: **DB-003_QUICK_REFERENCE.md**
2. Skim: Function signatures table
3. Done: You now know all 4 functions

### I need to deploy this migration (@devops, 10 min)
1. Read: **DB-003_DEPLOYMENT_CHECKLIST.md** (start to "Step 2")
2. Run: `supabase db push`
3. Verify: Run SQL test queries in step 2
4. Done: Functions are live in staging

### I need to implement the frontend (@dev, 30 min)
1. Read: **DB-003_IMPLEMENTATION_GUIDE.md**
2. Copy: Code examples to `lib/supabase/orphan-deals.ts`
3. Build: Dashboard widget, list view, assign modal, delete button
4. Test: Against staging DB
5. Done: Frontend implementation complete

### I need deep technical understanding (DBA, 30 min)
1. Read: **DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md**
2. Read: Migration file itself (`20260308100001_*.sql`)
3. Review: RLS patterns section
4. Done: Full context of design decisions

### I need to verify everything works (@qa, 15 min)
1. Read: **DB-003_DEPLOYMENT_CHECKLIST.md** (step 2 verification)
2. Run: SQL test queries
3. Read: Frontend implementation guide code
4. Done: Know what to test

---

## File Directory Map

```
ZmobCRM-Brownfield/
├── supabase/
│   └── migrations/
│       └── 20260308100001_db003_orphan_deals_visibility.sql ← THE CODE
│
└── docs/
    ├── DB-003_INDEX.md ← YOU ARE HERE
    ├── DB-003_QUICK_REFERENCE.md ← START HERE
    ├── DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md ← Technical deep dive
    ├── DB-003_IMPLEMENTATION_GUIDE.md ← Frontend code examples
    └── DB-003_DEPLOYMENT_CHECKLIST.md ← Deployment steps
```

---

## Quick Function Reference

### Count Orphans
```sql
SELECT public.get_orphan_deals_count();
-- Returns: integer (0 or more)
-- AC13: Shows count for admin dashboard
```

**JavaScript:**
```typescript
const { data: count } = await supabase.rpc('get_orphan_deals_count');
```

### List Orphans
```sql
SELECT * FROM public.list_orphan_deals(50, 0);
-- Returns: table with id, title, value, status, board_id, created_at, updated_at
-- AC13: Detail view, show which deals are orphans
-- AC14: Identify deals needing cleanup
```

**JavaScript:**
```typescript
const { data: deals } = await supabase.rpc('list_orphan_deals', {
  p_limit: 50,
  p_offset: 0
});
```

### Assign Orphans to Contact
```sql
SELECT public.assign_orphan_deals_to_contact(
  ARRAY['deal-1', 'deal-2']::uuid[],
  'contact-uuid'::uuid
);
-- Returns: integer count of updated deals
-- AC14: Assign orphans to correct contact
-- Validates contact exists in same org
```

**JavaScript:**
```typescript
const { data: updated } = await supabase.rpc(
  'assign_orphan_deals_to_contact',
  {
    p_deal_ids: ['deal-1', 'deal-2'],
    p_contact_id: 'contact-uuid'
  }
);
```

### Delete Orphans
```sql
SELECT public.delete_orphan_deals(ARRAY['deal-1']::uuid[]);
-- Returns: integer count of deleted deals
-- AC14: Clean up unwanted orphan deals
-- Soft delete (sets deleted_at = NOW())
```

**JavaScript:**
```typescript
const { data: deleted } = await supabase.rpc('delete_orphan_deals', {
  p_deal_ids: ['deal-1']
});
```

---

## Deployment Path

```
1. Staging Deployment ← START HERE
   supabase db push
   ↓
2. Verification (Step-by-step in DB-003_DEPLOYMENT_CHECKLIST.md)
   - Function exists check
   - RPC call test
   - Permission verification
   ↓
3. Frontend Implementation (Code in DB-003_IMPLEMENTATION_GUIDE.md)
   - Create lib/supabase/orphan-deals.ts
   - Build dashboard widget (AC13)
   - Build list + modal (AC14)
   - Add tests
   ↓
4. Integration Testing
   - Widget shows correct count
   - Assign works correctly
   - Delete soft-deletes properly
   ↓
5. Production Deployment
   supabase db push --db-url "postgresql://..."
   ↓
6. Production Verification
   - Functions exist
   - Tests pass
   - Metrics look good
   ↓
7. Go Live
   Merge PR, monitor, ready for QA testing
```

---

## Key Design Decisions

### Why SECURITY INVOKER?
All functions use `SECURITY INVOKER` so they respect the caller's RLS context. This prevents privilege escalation and ensures a corretor can only see their own org's orphan deals.

### Why `get_user_organization_id()`?
This helper (from DB-004) automatically scopes all functions to the user's organization. No need to pass org_id explicitly.

### Why Soft Delete?
`deleted_at = NOW()` instead of hard delete means:
- Data is recoverable if accidentally deleted
- Matches the pattern used throughout the codebase
- Triggers can still fire (maintain referential integrity)

### Why Pagination?
`list_orphan_deals(limit, offset)` supports pagination to:
- Handle large result sets efficiently
- Allow UI to implement "load more" or pagination controls
- Default limit=50 is safe for most dashboards

### Why Array Input for Assign/Delete?
Both take `uuid[]` to:
- Support bulk operations (more efficient than individual calls)
- Reduce round-trip latency
- Allow atomic transaction (all succeed or all fail)

---

## Acceptance Criteria Mapped

| AC | Function(s) | Evidence |
|----|------------|----------|
| AC13 | `get_orphan_deals_count()` `list_orphan_deals()` | Migration file lines 15-75; Implementation guide dashboard widget code |
| AC14 | `list_orphan_deals()` `assign_orphan_deals_to_contact()` `delete_orphan_deals()` | Migration file lines 77-180; Implementation guide modal + delete button code |

---

## Common Questions

**Q: When do I deploy this migration?**
A: After @qa approves this task. Deploy to staging first with `supabase db push`, verify functions work, then frontend can implement UI. Deploy to production after frontend is tested.

**Q: Can I modify the functions?**
A: No. These are released as-is. If you need changes, create a new migration with modified function definitions.

**Q: What if I need to rollback?**
A: See "Rollback Procedure" in DB-003_DEPLOYMENT_CHECKLIST.md. Simply drop the 4 functions.

**Q: How do I test these functions?**
A: See "Testing the Migration" in DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md. Also in SQL editor, see step 2 of deployment checklist.

**Q: Can I call these from a service role?**
A: Yes. The functions work with any authenticated user, including service_role. However, they respect RLS, so service_role will see all org's orphans (no filtering).

**Q: What's the performance impact?**
A: Minimal. `get_orphan_deals_count()` is a single COUNT(*) query. `list_orphan_deals()` is a single SELECT with pagination. assign/delete are single UPDATE statements. All use standard indexes.

---

## Support & Escalation

**For SQL/Migration Questions:**
See DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md (section 7: Testing) or ask @data-engineer

**For Frontend Implementation Questions:**
See DB-003_IMPLEMENTATION_GUIDE.md or ask @dev

**For Deployment Issues:**
See DB-003_DEPLOYMENT_CHECKLIST.md (Rollback section) or ask @devops

**For Design Questions:**
See DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md (section 8: Integration) or ask DB Sage

---

## Additional Resources

- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Function Docs:** https://www.postgresql.org/docs/17/sql-createfunction.html
- **Project Schema:** `supabase/docs/SCHEMA.md` (deals table definition)
- **RLS Patterns:** `supabase/migrations/20260223000000_security_rls_critical.sql`

---

## Summary Table

| Component | Status | Location |
|-----------|--------|----------|
| Migration Code | Complete | `/supabase/migrations/20260308100001_*.sql` |
| Quick Reference | Complete | `/docs/DB-003_QUICK_REFERENCE.md` |
| Technical Summary | Complete | `/docs/DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md` |
| Implementation Guide | Complete | `/docs/DB-003_IMPLEMENTATION_GUIDE.md` |
| Deployment Guide | Complete | `/docs/DB-003_DEPLOYMENT_CHECKLIST.md` |
| Agent Memory | Updated | `/.claude/agent-memory/db-sage/MEMORY.md` |
| **OVERALL** | **✓ READY FOR DEPLOYMENT** | |

---

**Created by:** DB Sage
**Date:** 2026-03-08
**Next action:** @devops to deploy migration to staging
