-- CP-1.3: RPC for filtered prospecting contacts
-- Handles all filtering server-side for performance (< 2s on 10k contacts)

CREATE OR REPLACE FUNCTION public.get_prospecting_filtered_contacts(
  p_stages TEXT[] DEFAULT NULL,
  p_temperatures TEXT[] DEFAULT NULL,
  p_classifications TEXT[] DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_inactive_days INT DEFAULT NULL,
  p_only_with_phone BOOLEAN DEFAULT FALSE,
  p_page INT DEFAULT 0,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  stage TEXT,
  temperature TEXT,
  classification TEXT,
  source TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ,
  primary_phone TEXT,
  has_phone BOOLEAN,
  days_since_last_activity INT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  SELECT p.organization_id INTO v_org_id
  FROM profiles p WHERE p.id = v_user_id;

  v_is_admin := is_admin_or_director(v_org_id);

  RETURN QUERY
  WITH filtered AS (
    SELECT
      c.id,
      c.name,
      c.email,
      c.stage,
      c.temperature,
      c.classification,
      c.source,
      c.owner_id,
      c.created_at,
      COALESCE(
        (
          SELECT cp.phone_number
          FROM contact_phones cp
          WHERE cp.contact_id = c.id
          ORDER BY cp.is_primary DESC
          LIMIT 1
        ),
        c.phone
      ) AS primary_phone,
      (
        EXISTS (SELECT 1 FROM contact_phones cp WHERE cp.contact_id = c.id)
        OR c.phone IS NOT NULL AND c.phone <> ''
      ) AS has_phone,
      (
        SELECT EXTRACT(DAY FROM now() - MAX(a.date))::INT
        FROM activities a
        WHERE a.contact_id = c.id AND a.deleted_at IS NULL
      ) AS days_since_last_activity
    FROM contacts c
    WHERE c.organization_id = v_org_id
      AND c.status = 'ACTIVE'
      -- RBAC: corretor sees own only, admin/diretor sees all (optionally filtered)
      AND (v_is_admin OR c.owner_id = v_user_id)
      AND (p_stages IS NULL OR c.stage = ANY(p_stages))
      AND (p_temperatures IS NULL OR c.temperature = ANY(p_temperatures))
      AND (p_classifications IS NULL OR c.classification = ANY(p_classifications))
      AND (p_tags IS NULL OR c.tags && p_tags)
      AND (p_source IS NULL OR c.source = p_source)
      AND (p_owner_id IS NULL OR c.owner_id = p_owner_id)
  ),
  with_inactive_filter AS (
    SELECT f.*
    FROM filtered f
    WHERE (p_inactive_days IS NULL
      OR f.days_since_last_activity IS NULL
      OR f.days_since_last_activity >= p_inactive_days)
      AND (NOT p_only_with_phone OR f.has_phone)
  ),
  counted AS (
    SELECT w.*, COUNT(*) OVER() AS total_count
    FROM with_inactive_filter w
  )
  SELECT
    counted.id,
    counted.name,
    counted.email,
    counted.stage,
    counted.temperature,
    counted.classification,
    counted.source,
    counted.owner_id,
    counted.created_at,
    counted.primary_phone,
    counted.has_phone,
    counted.days_since_last_activity,
    counted.total_count
  FROM counted
  ORDER BY counted.has_phone DESC, counted.name ASC
  LIMIT p_page_size
  OFFSET p_page * p_page_size;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_prospecting_filtered_contacts TO authenticated;

-- CP-1.3: Light RPC returning only IDs for "select all" cross-page
CREATE OR REPLACE FUNCTION public.get_prospecting_filtered_contact_ids(
  p_stages TEXT[] DEFAULT NULL,
  p_temperatures TEXT[] DEFAULT NULL,
  p_classifications TEXT[] DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_inactive_days INT DEFAULT NULL,
  p_only_with_phone BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  SELECT p.organization_id INTO v_org_id FROM profiles p WHERE p.id = v_user_id;
  v_is_admin := is_admin_or_director(v_org_id);

  RETURN QUERY
  SELECT c.id
  FROM contacts c
  WHERE c.organization_id = v_org_id
    AND c.status = 'ACTIVE'
    AND (v_is_admin OR c.owner_id = v_user_id)
    AND (p_stages IS NULL OR c.stage = ANY(p_stages))
    AND (p_temperatures IS NULL OR c.temperature = ANY(p_temperatures))
    AND (p_classifications IS NULL OR c.classification = ANY(p_classifications))
    AND (p_tags IS NULL OR c.tags && p_tags)
    AND (p_source IS NULL OR c.source = p_source)
    AND (p_owner_id IS NULL OR c.owner_id = p_owner_id)
    AND (NOT p_only_with_phone OR (
      EXISTS (SELECT 1 FROM contact_phones cp WHERE cp.contact_id = c.id)
      OR c.phone IS NOT NULL AND c.phone <> ''
    ))
    AND (p_inactive_days IS NULL OR NOT EXISTS (
      SELECT 1 FROM activities a
      WHERE a.contact_id = c.id AND a.deleted_at IS NULL
        AND a.date > now() - (p_inactive_days * INTERVAL '1 day')
    ))
  LIMIT 5000;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospecting_filtered_contact_ids TO authenticated;
