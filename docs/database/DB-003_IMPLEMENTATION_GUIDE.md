# DB-003: Orphan Deals Implementation Guide

Quick reference for implementing orphan deals functionality in the frontend and backend.

---

## Supabase Client Usage

### 1. Get Orphan Deal Count (AC13)

For admin dashboard widget:

```typescript
// lib/supabase/orphan-deals.ts

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getOrphanDealsCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_orphan_deals_count');

  if (error) {
    console.error('Failed to fetch orphan deals count:', error);
    throw error;
  }

  return data ?? 0;
}
```

**Usage in React Component:**

```tsx
import { getOrphanDealsCount } from '@/lib/supabase/orphan-deals';

export function AdminDashboard() {
  const [orphanCount, setOrphanCount] = useState<number | null>(null);

  useEffect(() => {
    getOrphanDealsCount().then(setOrphanCount);
  }, []);

  return (
    <div className="dashboard">
      <div className="card alert">
        <h3>Orphan Deals</h3>
        <p className="count">{orphanCount ?? 'Loading...'}</p>
        {orphanCount! > 0 && (
          <p className="warning">There are unassigned deals in your pipeline</p>
        )}
      </div>
    </div>
  );
}
```

---

### 2. List Orphan Deals (AC13 - Detail View)

For orphan deals management UI:

```typescript
// lib/supabase/orphan-deals.ts (continued)

export interface OrphanDeal {
  id: string;
  title: string;
  value: number;
  status: string | null;
  board_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listOrphanDeals(
  limit: number = 50,
  offset: number = 0
): Promise<OrphanDeal[]> {
  const { data, error } = await supabase.rpc('list_orphan_deals', {
    p_limit: limit,
    p_offset: offset
  });

  if (error) {
    console.error('Failed to fetch orphan deals:', error);
    throw error;
  }

  return data ?? [];
}
```

**Usage in Orphan Deals List Component:**

```tsx
import { listOrphanDeals, OrphanDeal } from '@/lib/supabase/orphan-deals';
import { useState, useEffect } from 'react';

export function OrphanDealsList() {
  const [deals, setDeals] = useState<OrphanDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    setLoading(true);
    listOrphanDeals(pageSize, page * pageSize)
      .then(setDeals)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h2>Orphan Deals Management</h2>
      {loading ? (
        <p>Loading...</p>
      ) : deals.length === 0 ? (
        <p className="empty">No orphan deals found</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Value</th>
                <th>Status</th>
                <th>Board</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.title}</td>
                  <td>${deal.value?.toLocaleString()}</td>
                  <td>{deal.status}</td>
                  <td>{deal.board_id?.substring(0, 8)}...</td>
                  <td>{new Date(deal.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              disabled={deals.length < pageSize}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### 3. Assign Orphan Deals to Contact (AC14 - Action 1)

For bulk assignment UI:

```typescript
// lib/supabase/orphan-deals.ts (continued)

export async function assignOrphanDealsToContact(
  dealIds: string[],
  contactId: string
): Promise<number> {
  if (dealIds.length === 0) {
    throw new Error('No deals selected for assignment');
  }

  const { data, error } = await supabase.rpc(
    'assign_orphan_deals_to_contact',
    {
      p_deal_ids: dealIds,
      p_contact_id: contactId
    }
  );

  if (error) {
    console.error('Failed to assign orphan deals:', error);
    throw error;
  }

  return data ?? 0;
}
```

**Usage in Assignment Modal:**

```tsx
import { assignOrphanDealsToContact } from '@/lib/supabase/orphan-deals';
import { useState } from 'react';

export function AssignOrphanDealsModal({ deals, onClose }: Props) {
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string }>({
    success: false
  });

  const handleAssign = async () => {
    if (!selectedContactId) {
      setResult({ success: false, error: 'Please select a contact' });
      return;
    }

    setAssigning(true);
    try {
      const count = await assignOrphanDealsToContact(
        deals.map((d) => d.id),
        selectedContactId
      );
      setResult({
        success: true,
        count
      });
      // Reload deals list after 1 second
      setTimeout(onClose, 1000);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Assignment failed'
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal">
      <h3>Assign {deals.length} Orphan Deals</h3>

      <div className="form-group">
        <label>Contact</label>
        <ContactSelector
          value={selectedContactId}
          onChange={setSelectedContactId}
        />
      </div>

      {result.success && (
        <div className="success">
          Successfully assigned {result.count} deal(s)
        </div>
      )}
      {!result.success && result.error && (
        <div className="error">{result.error}</div>
      )}

      <div className="actions">
        <button onClick={onClose} disabled={assigning}>
          Cancel
        </button>
        <button
          onClick={handleAssign}
          disabled={!selectedContactId || assigning}
        >
          {assigning ? 'Assigning...' : 'Assign'}
        </button>
      </div>
    </div>
  );
}
```

---

### 4. Delete Orphan Deals (AC14 - Action 2)

For bulk deletion/archival:

```typescript
// lib/supabase/orphan-deals.ts (continued)

export async function deleteOrphanDeals(dealIds: string[]): Promise<number> {
  if (dealIds.length === 0) {
    throw new Error('No deals selected for deletion');
  }

  const { data, error } = await supabase.rpc('delete_orphan_deals', {
    p_deal_ids: dealIds
  });

  if (error) {
    console.error('Failed to delete orphan deals:', error);
    throw error;
  }

  return data ?? 0;
}
```

**Usage in Delete Action:**

```tsx
import { deleteOrphanDeals } from '@/lib/supabase/orphan-deals';

export function DeleteOrphanDealsButton({ deals, onComplete }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${deals.length} deal(s)? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const count = await deleteOrphanDeals(deals.map((d) => d.id));
      toast.success(`Deleted ${count} deal(s)`);
      onComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete deals'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting || deals.length === 0}
      className="btn-danger"
    >
      {deleting ? 'Deleting...' : 'Delete Selected'}
    </button>
  );
}
```

---

## Integration Checklist

- [ ] **Migration Applied:** Run `supabase db push` to apply migration to staging/production
- [ ] **Functions Verified:** Confirm functions exist in Supabase SQL Editor
- [ ] **Client Library:** Create `lib/supabase/orphan-deals.ts` with above functions
- [ ] **Admin Dashboard:** Add orphan deal count widget to dashboard
- [ ] **List View:** Create orphan deals list/table component
- [ ] **Assign Modal:** Implement bulk assign functionality
- [ ] **Delete Action:** Add delete/archive functionality
- [ ] **Realtime Updates:** Add subscription to deals table for real-time count updates (optional)
- [ ] **Tests:** Add unit tests for each RPC function call
- [ ] **Documentation:** Update API docs for admin features

---

## Advanced: Realtime Subscription (Optional)

For real-time count updates:

```typescript
// lib/supabase/orphan-deals.ts (continued)

export function subscribeToOrphanDealsChanges(
  onUpdate: (count: number) => void
): () => void {
  const channel = supabase
    .channel('orphan_deals_changes')
    .on('postgres_changes', {
      event: '*', // Listen to INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'deals',
      filter: 'contact_id=is.null'
    }, async () => {
      // Re-fetch count on any change
      const count = await getOrphanDealsCount();
      onUpdate(count);
    })
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
```

---

## Error Handling Best Practices

```typescript
// Generic error handler for orphan deal operations
async function handleOrphanDealError(error: any): Promise<void> {
  if (error.code === 'PGRST116') {
    // 416 Range Not Satisfiable — invalid offset/limit
    throw new Error('Invalid pagination parameters');
  }

  if (error.message.includes('does not exist in your organization')) {
    // From assign_orphan_deals_to_contact validation
    throw new Error('Contact not found or belongs to different organization');
  }

  if (error.message.includes('contact_id')) {
    // Foreign key or constraint error
    throw new Error('Cannot assign: contact validation failed');
  }

  throw error; // Re-throw unknown errors
}
```

---

## Performance Considerations

1. **Count-only queries** (get_orphan_deals_count) are very fast — can call frequently
2. **List queries** use pagination (limit 50 default) — use offset for navigation
3. **Assign/Delete operations** are bulk — pass array of IDs, not individual calls
4. **No N+1 queries** — all functions are single SQL statements, not loops

---

## Related Tasks

- **AC13 Implementation:** Add dashboard widget showing count + link to detail view
- **AC14 Implementation (Part A):** Add assign modal with contact selector
- **AC14 Implementation (Part B):** Add delete/archive action with confirmation
- **Testing:** Create story for QA testing of orphan deal workflow
- **Backlog Cleanup:** Audit existing deals for orphans in production

---

## References

- Migration: `/supabase/migrations/20260308100001_db003_orphan_deals_visibility.sql`
- Summary: `/docs/DB-003_ORPHAN_DEALS_MIGRATION_SUMMARY.md`
