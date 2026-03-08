# DB-003: Orphan Deals Visibility — Migration Summary

**Migration File:** `supabase/migrations/20260308100001_db003_orphan_deals_visibility.sql`
**Status:** Created and ready for deployment
**Date:** 2026-03-08

## Purpose

Implements RPC functions for identifying, listing, and managing orphan deals (deals without a contact_id) in the ZmobCRM database.

**AC13:** Admin dashboard shows count of deals with `contact_id IS NULL` (orphans)
**AC14:** Mechanism to clean up or assign orphan deals

---

## Functions Created

### 1. `get_orphan_deals_count()` → INTEGER

**Signature:**
```sql
FUNCTION public.get_orphan_deals_count()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY INVOKER
```

**Purpose:** Returns the count of orphan deals in the user's organization.

**Scope:**
- Only returns deals where `contact_id IS NULL` AND `deleted_at IS NULL`
- Automatically scoped to user's organization via `get_user_organization_id()`
- SECURITY INVOKER respects caller's RLS context

**Usage (SQL):**
```sql
SELECT public.get_orphan_deals_count();
-- Returns: 42 (example)
```

**Usage (PostgreSQL client):**
```javascript
const { data: count, error } = await supabase
  .rpc('get_orphan_deals_count');
```

---

### 2. `list_orphan_deals(p_limit, p_offset)` → TABLE

**Signature:**
```sql
FUNCTION public.list_orphan_deals(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  value numeric,
  status text,
  board_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER
```

**Purpose:** Returns paginated list of orphan deals ordered by most recently updated first.

**Parameters:**
- `p_limit` (default 50): Maximum number of results per page
- `p_offset` (default 0): Pagination offset

**Returns:** Columns from deals table for each orphan deal.

**Scope:**
- Only returns deals where `contact_id IS NULL` AND `deleted_at IS NULL`
- Automatically scoped to user's organization
- Ordered by `updated_at DESC` (most recent first)

**Usage (SQL):**
```sql
SELECT * FROM public.list_orphan_deals(50, 0);
-- Returns first 50 orphan deals
```

**Usage (PostgreSQL client):**
```javascript
const { data: orphans, error } = await supabase
  .rpc('list_orphan_deals', { p_limit: 50, p_offset: 0 });
```

---

### 3. `assign_orphan_deals_to_contact(p_deal_ids, p_contact_id)` → INTEGER

**Signature:**
```sql
FUNCTION public.assign_orphan_deals_to_contact(
  p_deal_ids uuid[],
  p_contact_id uuid
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY INVOKER
```

**Purpose:** Assigns orphan deals to a specific contact.

**Parameters:**
- `p_deal_ids`: Array of deal IDs to assign (e.g., `'{uuid1, uuid2, uuid3}'::uuid[]`)
- `p_contact_id`: UUID of the contact to assign deals to

**Returns:** Integer count of successfully updated deals

**Validation:**
- Contact must exist in the user's organization
- Contact must not be soft-deleted (`deleted_at IS NULL`)
- Only updates deals that are currently orphans (`contact_id IS NULL`)
- Automatically scoped to user's organization

**Behavior:**
- Sets `contact_id` and updates `updated_at` on each matched deal
- Raises exception if contact doesn't exist or is in different organization
- Silently ignores deals that are already assigned (not orphans)

**Usage (SQL):**
```sql
SELECT public.assign_orphan_deals_to_contact(
  ARRAY['deal-uuid-1', 'deal-uuid-2']::uuid[],
  'contact-uuid'::uuid
);
-- Returns: 2 (if both deals were orphans and updated)
```

**Usage (PostgreSQL client):**
```javascript
const { data: count, error } = await supabase
  .rpc('assign_orphan_deals_to_contact', {
    p_deal_ids: ['deal-uuid-1', 'deal-uuid-2'],
    p_contact_id: 'contact-uuid'
  });
```

---

### 4. `delete_orphan_deals(p_deal_ids)` → INTEGER

**Signature:**
```sql
FUNCTION public.delete_orphan_deals(p_deal_ids uuid[])
RETURNS INTEGER
LANGUAGE plpgsql SECURITY INVOKER
```

**Purpose:** Soft-deletes (archives) orphan deals.

**Parameters:**
- `p_deal_ids`: Array of deal IDs to soft-delete

**Returns:** Integer count of successfully deleted deals

**Behavior:**
- Sets `deleted_at = NOW()` and updates `updated_at` on matched deals
- Only affects deals that are actually orphans (`contact_id IS NULL` and `deleted_at IS NULL`)
- Automatically scoped to user's organization
- Soft delete pattern (not hard delete) — deals remain in DB with deletion timestamp

**Usage (SQL):**
```sql
SELECT public.delete_orphan_deals(
  ARRAY['deal-uuid-1', 'deal-uuid-2']::uuid[]
);
-- Returns: 2 (if both were orphans and soft-deleted)
```

**Usage (PostgreSQL client):**
```javascript
const { data: count, error } = await supabase
  .rpc('delete_orphan_deals', {
    p_deal_ids: ['deal-uuid-1', 'deal-uuid-2']
  });
```

---

## Security Posture

### SECURITY INVOKER (Functions 1–4)
- All functions use `SECURITY INVOKER` to respect the caller's RLS context
- Functions inherit the user's row-level access restrictions
- No privilege escalation: a corretor cannot see orphan deals from other organizations

### Organization Scoping
- All functions use `get_user_organization_id()` (from migration 20260308100000)
- This helper checks both JWT claim (fast) and profiles table (fallback)
- No need to pass org_id explicitly—automatically scoped per user

### Data Validation
- `assign_orphan_deals_to_contact()` validates contact exists and belongs to same org
- All functions check that deals are actually orphans before mutating
- Soft-delete pattern prevents accidental data loss

### Permissions
- All functions granted to `authenticated` role (logged-in users)
- RLS policies on underlying tables (deals, contacts) are respected
- No special admin-only restrictions here—RLS handles access control

---

## Integration with Existing Schema

### Dependencies
- Requires table: `public.deals` (contact_id, deleted_at columns)
- Requires table: `public.contacts` (with deleted_at)
- Requires function: `public.get_user_organization_id()` (from DB-004)
- Requires function: `public.is_admin_or_director()` (from 20260223000000)

### No Breaking Changes
- Uses `CREATE OR REPLACE FUNCTION` (idempotent)
- No schema modifications to existing tables
- Pure addition of new functions

### Rollback
To rollback, simply drop the functions:
```sql
DROP FUNCTION IF EXISTS public.get_orphan_deals_count();
DROP FUNCTION IF EXISTS public.list_orphan_deals(integer, integer);
DROP FUNCTION IF EXISTS public.assign_orphan_deals_to_contact(uuid[], uuid);
DROP FUNCTION IF EXISTS public.delete_orphan_deals(uuid[]);
```

---

## Testing the Migration

### Dry Run (Staging)
```bash
cd /Users/felipezacker/Desktop/code/ZmobCRM-Brownfield
supabase db push --dry-run
```

### Apply to Staging
```bash
supabase db push
```

### Verify Functions Exist
```sql
-- Connect to Supabase staging DB
SELECT p.proname, p.prosecdef
FROM pg_proc p
WHERE p.proname LIKE 'get_orphan%'
  OR p.proname LIKE 'list_orphan%'
  OR p.proname LIKE 'assign_orphan%'
  OR p.proname LIKE 'delete_orphan%';
```

### Test Function Calls
```javascript
// Test 1: Count orphans
const { data: count } = await supabase.rpc('get_orphan_deals_count');
console.log('Orphan deals:', count);

// Test 2: List orphans
const { data: orphans } = await supabase
  .rpc('list_orphan_deals', { p_limit: 10 });
console.log('Sample orphan deals:', orphans);

// Test 3: Assign orphan
const { data: assigned } = await supabase
  .rpc('assign_orphan_deals_to_contact', {
    p_deal_ids: [/* orphan deal UUIDs */],
    p_contact_id: '...'
  });
console.log('Deals assigned:', assigned);

// Test 4: Delete orphans
const { data: deleted } = await supabase
  .rpc('delete_orphan_deals', {
    p_deal_ids: [/* orphan deal UUIDs */]
  });
console.log('Deals deleted:', deleted);
```

---

## Frontend Integration (Next Steps)

### Admin Dashboard Component
Once migration is deployed, the frontend can add:

1. **Orphan Deal Count Widget**
   ```typescript
   const { data: orphanCount } = await supabase.rpc('get_orphan_deals_count');
   ```

2. **Orphan Deal List View**
   ```typescript
   const { data: orphans } = await supabase
     .rpc('list_orphan_deals', { p_limit: 100, p_offset: 0 });
   ```

3. **Bulk Assign Modal**
   ```typescript
   await supabase.rpc('assign_orphan_deals_to_contact', {
     p_deal_ids: selectedDealIds,
     p_contact_id: targetContactId
   });
   ```

4. **Bulk Delete Action**
   ```typescript
   await supabase.rpc('delete_orphan_deals', {
     p_deal_ids: selectedDealIds
   });
   ```

---

## References

- **Schema:** `supabase/docs/SCHEMA.md` (section 2.10 deals)
- **Helper Functions:** `supabase/migrations/20260308100000_db004_jwt_custom_claims_rls.sql` (get_user_organization_id)
- **RLS Patterns:** `supabase/migrations/20260223000000_security_rls_critical.sql` (is_admin_or_director)
- **Soft Delete Pattern:** Used throughout contacts, deals, organizations, activities, leads, boards, activities
