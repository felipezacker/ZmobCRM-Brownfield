-- Story 3.9: Notificacoes Inteligentes
-- Tabela de notificacoes CRM (birthday, churn, deal stagnant, score drop)

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  type TEXT NOT NULL CHECK (type IN ('BIRTHDAY', 'CHURN_ALERT', 'DEAL_STAGNANT', 'SCORE_DROP')),
  title TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID REFERENCES profiles(id)
);

-- 2. Indexes for efficient queries
CREATE INDEX idx_notifications_org_unread
  ON notifications(organization_id, is_read)
  WHERE is_read = false;

CREATE INDEX idx_notifications_owner_unread
  ON notifications(owner_id, is_read, created_at DESC)
  WHERE is_read = false;

-- 3. RLS policies (org isolation)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_org"
  ON notifications FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "notifications_insert_org"
  ON notifications FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "notifications_update_org"
  ON notifications FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
