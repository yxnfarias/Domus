-- =====================================================================
-- DOMUS · Migration 003 — Track who made each sale
-- =====================================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS sold_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_sold_by ON properties(sold_by);
