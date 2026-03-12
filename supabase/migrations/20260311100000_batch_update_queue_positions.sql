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
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE prospecting_queues
    SET position = (item->>'position')::int,
        updated_at = now()
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (RLS on table still applies for reads)
GRANT EXECUTE ON FUNCTION batch_update_queue_positions(jsonb) TO authenticated;
