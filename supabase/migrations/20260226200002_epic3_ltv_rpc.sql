-- Story 3.10: Atomic RPC functions for LTV (total_value) increment/decrement
-- Prevents race conditions when multiple deals for the same contact are updated concurrently

-- Increment contact LTV atomically
CREATE OR REPLACE FUNCTION increment_contact_ltv(p_contact_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contacts
  SET total_value = COALESCE(total_value, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_contact_id;
END;
$$;

-- Decrement contact LTV atomically (floor at 0)
CREATE OR REPLACE FUNCTION decrement_contact_ltv(p_contact_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contacts
  SET total_value = GREATEST(COALESCE(total_value, 0) - p_amount, 0),
      updated_at = NOW()
  WHERE id = p_contact_id;
END;
$$;
