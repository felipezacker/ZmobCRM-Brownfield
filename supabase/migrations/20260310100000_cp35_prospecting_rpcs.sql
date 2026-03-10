-- CP-3.5: Prospecting RPCs (metrics aggregation + exhausted cleanup)
-- Migration: 20260310100000_cp35_prospecting_rpcs.sql

-- RPC: Metricas agregadas server-side
-- Substitui query com LIMIT 5000 + client-side aggregation
CREATE OR REPLACE FUNCTION get_prospecting_metrics_aggregated(
  p_owner_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_org_id UUID;
BEGIN
  -- Resolve org_id: parameter or from current user profile
  v_org_id := COALESCE(p_org_id, (SELECT organization_id FROM profiles WHERE id = auth.uid()));

  -- Validar que user pertence a org
  IF v_org_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_calls', COUNT(*),
    'connected', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'connected'),
    'no_answer', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'no_answer'),
    'voicemail', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'voicemail'),
    'busy', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'busy'),
    'avg_duration', COALESCE(AVG((metadata->>'duration_seconds')::numeric), 0),
    'unique_contacts', COUNT(DISTINCT contact_id),
    'by_day', (
      SELECT COALESCE(jsonb_agg(day_row ORDER BY day_row->>'date'), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'date', date_trunc('day', date)::date,
          'total', COUNT(*),
          'connected', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'connected'),
          'no_answer', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'no_answer'),
          'voicemail', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'voicemail'),
          'busy', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'busy')
        ) AS day_row
        FROM activities
        WHERE type = 'CALL'
          AND metadata IS NOT NULL
          AND deleted_at IS NULL
          AND date >= p_start_date::timestamp
          AND date < (p_end_date + INTERVAL '1 day')::timestamp
          AND (p_owner_id IS NULL OR owner_id = p_owner_id)
          AND organization_id = v_org_id
        GROUP BY date_trunc('day', date)::date
      ) sub
    ),
    'by_broker', (
      SELECT COALESCE(jsonb_agg(broker_row), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'owner_id', a.owner_id,
          'owner_name', COALESCE(p.name, p.first_name, p.email),
          'total_calls', COUNT(*),
          'connected', COUNT(*) FILTER (WHERE a.metadata->>'outcome' = 'connected'),
          'connection_rate', ROUND(
            COUNT(*) FILTER (WHERE a.metadata->>'outcome' = 'connected')::numeric / NULLIF(COUNT(*), 0) * 100, 1
          ),
          'avg_duration', COALESCE(AVG((a.metadata->>'duration_seconds')::numeric), 0),
          'unique_contacts', COUNT(DISTINCT a.contact_id)
        ) AS broker_row
        FROM activities a
        JOIN profiles p ON p.id = a.owner_id
        WHERE a.type = 'CALL'
          AND a.metadata IS NOT NULL
          AND a.deleted_at IS NULL
          AND a.date >= p_start_date::timestamp
          AND a.date < (p_end_date + INTERVAL '1 day')::timestamp
          AND a.organization_id = v_org_id
        GROUP BY a.owner_id, p.name, p.first_name, p.email
      ) sub
    )
  ) INTO result
  FROM activities
  WHERE type = 'CALL'
    AND metadata IS NOT NULL
    AND deleted_at IS NULL
    AND date >= p_start_date::timestamp
    AND date < (p_end_date + INTERVAL '1 day')::timestamp
    AND (p_owner_id IS NULL OR owner_id = p_owner_id)
    AND organization_id = v_org_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- RPC: Cleanup de items exauridos (>N dias)
CREATE OR REPLACE FUNCTION cleanup_exhausted_queue_items(
  p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF p_days_old < 1 THEN
    RETURN 0;
  END IF;

  DELETE FROM prospecting_queues
  WHERE status = 'exhausted'
    AND updated_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
