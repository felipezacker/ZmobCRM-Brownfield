-- RT-4.2: Add row-level locking to batch_update_queue_positions
-- Prevents race conditions when concurrent moveToTop/reorderQueue operations
-- target the same rows for the same owner_id.
--
-- Change: SELECT ... FOR UPDATE before the UPDATE loop locks all target rows,
-- ensuring one transaction completes before another can modify the same rows.
--
-- Advisory locks evaluation (AC4):
--   pg_advisory_xact_lock(hashtext(v_user_id::text)) was evaluated as alternative.
--   Decision: FOR UPDATE is sufficient. Both moveToTop and reorderQueue use this
--   same RPC and touch the same rows per owner_id. FOR UPDATE serializes access
--   to exactly those rows without blocking unrelated operations for the same user.
--   Advisory lock would serialize ALL queue operations per user (including reads),
--   adding unnecessary contention. Advisory locks would only be justified if there
--   were concurrent operations outside this RPC (direct INSERTs/DELETEs racing
--   with reordering), which is not the current case.

CREATE OR REPLACE FUNCTION batch_update_queue_positions(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Auth guard: verify all queue items belong to the current user
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_updates) u
    LEFT JOIN prospecting_queues pq ON pq.id = (u->>'id')::uuid
    WHERE pq.owner_id IS DISTINCT FROM v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: queue items do not belong to current user';
  END IF;

  -- Lock all target rows before the update loop (RT-4.2)
  -- This prevents concurrent transactions from modifying these rows
  -- until this transaction commits
  PERFORM id FROM prospecting_queues
  WHERE id IN (
    SELECT (u->>'id')::uuid FROM jsonb_array_elements(p_updates) u
  )
  AND owner_id = v_user_id
  FOR UPDATE;

  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE prospecting_queues
    SET position = (item->>'position')::int,
        updated_at = now()
    WHERE id = (item->>'id')::uuid
      AND owner_id = v_user_id;
  END LOOP;
END;
$$;

-- GRANT already applied in 20260311100000_batch_update_queue_positions.sql
-- CREATE OR REPLACE preserves existing grants; no re-grant needed.
