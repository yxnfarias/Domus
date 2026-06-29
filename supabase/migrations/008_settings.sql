-- =====================================================================
-- DOMUS · Migration 008 — Settings module
-- =====================================================================

-- ── Company: lead distribution mode ──────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS lead_distribution TEXT DEFAULT 'manual'
    CHECK (lead_distribution IN ('manual', 'round_robin'));

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS last_assigned_broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
