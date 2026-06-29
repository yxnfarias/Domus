-- =====================================================================
-- DOMUS · Migration 006 — Commissions table (creates or updates)
-- =====================================================================

CREATE TABLE IF NOT EXISTS commissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id         UUID        REFERENCES leads(id) ON DELETE SET NULL,
  property_id     UUID        REFERENCES properties(id) ON DELETE SET NULL,
  broker_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  commission_type TEXT        NOT NULL DEFAULT 'direta'
    CHECK (commission_type IN ('direta', 'parceiro')),
  description     TEXT,
  partner_name    TEXT,
  partner_pct     NUMERIC,

  sale_value      NUMERIC     NOT NULL,
  commission_pct  NUMERIC     NOT NULL,
  commission_amt  NUMERIC     GENERATED ALWAYS AS (sale_value * commission_pct / 100) STORED,

  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','paid','cancelled')),
  notes           TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If table already existed without the new columns, add them
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'direta'
    CHECK (commission_type IN ('direta', 'parceiro')),
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS partner_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_pct  NUMERIC;

CREATE INDEX IF NOT EXISTS idx_commissions_company   ON commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_broker    ON commissions(broker_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status    ON commissions(status);
