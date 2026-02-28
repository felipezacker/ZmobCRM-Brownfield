-- Lead Score History: track score changes for timeline display
CREATE TABLE lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  change INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_score_history_contact ON lead_score_history(contact_id, created_at DESC);

-- RLS
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view score history of their org" ON lead_score_history
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "System can insert score history" ON lead_score_history
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
