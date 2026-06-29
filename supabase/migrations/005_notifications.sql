-- =====================================================================
-- DOMUS · Migration 005 — Persistent notifications
-- =====================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('new_lead','status_changed','follow_up_set','broker_assigned')),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  href       TEXT        NOT NULL DEFAULT '/dashboard/leads',
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_company_date
  ON notifications(company_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select_notifications" ON notifications
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members_update_notifications" ON notifications
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
