-- CP-3.4: Prospecting sessions persistence
-- Tracks call sessions with start/end times and outcome stats

CREATE TABLE prospecting_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prospecting_sessions_owner ON prospecting_sessions(owner_id, started_at DESC);
CREATE INDEX idx_prospecting_sessions_org ON prospecting_sessions(organization_id, started_at DESC);

-- RLS
ALTER TABLE prospecting_sessions ENABLE ROW LEVEL SECURITY;

-- Owner can view own sessions
CREATE POLICY "Users can view own sessions"
  ON prospecting_sessions FOR SELECT
  USING (owner_id = auth.uid());

-- Admin/director can view all org sessions
CREATE POLICY "Admins can view org sessions"
  ON prospecting_sessions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'director')
    )
  );

-- Owner can insert own sessions
CREATE POLICY "Users can insert own sessions"
  ON prospecting_sessions FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owner can update own sessions
CREATE POLICY "Users can update own sessions"
  ON prospecting_sessions FOR UPDATE
  USING (owner_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE prospecting_sessions;
