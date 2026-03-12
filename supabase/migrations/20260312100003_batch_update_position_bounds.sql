-- Fix: add position bounds checking to batch_update_queue_positions
-- Prevents corrupt queue ordering from out-of-range position values

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

GRANT EXECUTE ON FUNCTION batch_update_queue_positions(jsonb) TO authenticated;
