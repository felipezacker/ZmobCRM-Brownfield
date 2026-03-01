-- Add index on organization_id for org-scoped queries on lead_score_history
CREATE INDEX IF NOT EXISTS idx_lead_score_history_org ON lead_score_history(organization_id);
