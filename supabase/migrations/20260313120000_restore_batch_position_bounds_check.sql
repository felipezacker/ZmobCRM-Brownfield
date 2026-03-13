-- Fix: restore position bounds check lost in 20260313110000
-- The FOR UPDATE migration (RT-4.2) accidentally dropped the bounds guard
-- added in 20260312100003. This migration restores both:
--   1. FOR UPDATE row-level locking (RT-4.2)
--   2. Position bounds check (0-9999)

CREATE OR REPLACE FUNCTION batch_update_queue_positions(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_user_id UUID;
  v_position INT;
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

  -- Bounds guard: verify all positions are within valid range
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_updates) u
    WHERE (u->>'position')::int < 0 OR (u->>'position')::int > 9999
  ) THEN
    RAISE EXCEPTION 'Invalid position: must be between 0 and 9999';
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
    v_position := (item->>'position')::int;
    UPDATE prospecting_queues
    SET position = v_position,
        updated_at = now()
    WHERE id = (item->>'id')::uuid
      AND owner_id = v_user_id;
  END LOOP;
END;
$$;

-- GRANT already applied in 20260311100000_batch_update_queue_positions.sql
-- CREATE OR REPLACE preserves existing grants; no re-grant needed.
