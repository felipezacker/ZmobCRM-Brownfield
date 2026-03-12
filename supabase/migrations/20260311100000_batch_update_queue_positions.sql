-- CP-4.7 optimization: single RPC for batch position updates
-- Replaces N parallel updates with one function call

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

-- Grant execute to authenticated users (RLS on table still applies for reads)
GRANT EXECUTE ON FUNCTION batch_update_queue_positions(jsonb) TO authenticated;
