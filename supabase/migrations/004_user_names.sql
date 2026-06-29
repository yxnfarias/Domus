-- =====================================================================
-- DOMUS · Migration 004 — Add name to company_users
-- =====================================================================

ALTER TABLE company_users
  ADD COLUMN IF NOT EXISTS name TEXT;
