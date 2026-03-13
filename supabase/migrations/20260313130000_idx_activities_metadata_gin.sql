-- #18: Add GIN index on activities.metadata for @> containment queries
-- useProspectingImpact uses .contains('metadata', '{"source":"prospecting"}')
-- which maps to: WHERE metadata @> '{"source":"prospecting"}'::jsonb
-- Without this index, every such query does a seq scan on the JSONB column.
-- jsonb_path_ops is ~60% smaller than default GIN and optimized for @> operator.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_metadata_gin
  ON public.activities USING gin(metadata jsonb_path_ops);
