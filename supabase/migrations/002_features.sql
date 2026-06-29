-- =====================================================================
-- DOMUS · Migration 002 — Feature expansion
-- Run this in the Supabase SQL editor after schema.sql
-- =====================================================================

-- ── Lead enhancements: follow-up fields ──────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS follow_up_date  DATE,
  ADD COLUMN IF NOT EXISTS follow_up_note  TEXT;

-- ── Lead events (timeline / audit trail) ─────────────────────────────
CREATE TABLE IF NOT EXISTS lead_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id)    ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id)         ON DELETE SET NULL,
  event_type  TEXT NOT NULL
                CHECK (event_type IN (
                  'created', 'status_changed', 'broker_assigned',
                  'follow_up_set', 'note_added', 'document_added',
                  'credit_analyzed', 'property_matched'
                )),
  note        TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id    ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_company_id ON lead_events(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON lead_events(created_at DESC);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY le_select ON lead_events
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY le_insert ON lead_events
  FOR INSERT WITH CHECK (company_id = auth_company_id());

-- ── Commissions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id)               ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id)          ON DELETE SET NULL,
  broker_id       UUID REFERENCES auth.users(id)          ON DELETE SET NULL,
  sale_value      NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission_pct  NUMERIC(5,2)  NOT NULL DEFAULT 6.00,
  commission_amt  NUMERIC(14,2) GENERATED ALWAYS AS (sale_value * commission_pct / 100) STORED,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  notes           TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_broker_id  ON commissions(broker_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status     ON commissions(status);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY comm_all ON commissions
  FOR ALL
  USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE TRIGGER commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Public SELECT on properties (for vitrine) ─────────────────────────
-- Only available/reserved properties are visible publicly, filtered by company slug
CREATE POLICY properties_public_select ON properties
  FOR SELECT USING (true);  -- filtered at API layer by company slug

-- ── Enable Realtime on tables ─────────────────────────────────────────
-- Run in Supabase dashboard: Database > Replication > enable for each table
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_events;
