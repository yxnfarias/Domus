-- =====================================================================
-- DOMUS · Migration 007 — Follow-up history (multiple scheduled follow-ups per lead)
-- Replaces the single follow_up_date/follow_up_note/follow_up_done fields
-- on `leads` with a proper list, so brokers can schedule several follow-ups
-- (e.g. day 10, 15, 20) and mark each one as done independently.
-- =====================================================================

CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id)     ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  note        TEXT,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead    ON lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_pending ON lead_follow_ups(company_id, date) WHERE done = FALSE;

ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lfu_select ON lead_follow_ups;
DROP POLICY IF EXISTS lfu_insert ON lead_follow_ups;
DROP POLICY IF EXISTS lfu_update ON lead_follow_ups;
DROP POLICY IF EXISTS lfu_delete ON lead_follow_ups;

CREATE POLICY lfu_select ON lead_follow_ups
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY lfu_insert ON lead_follow_ups
  FOR INSERT WITH CHECK (company_id = auth_company_id());

CREATE POLICY lfu_update ON lead_follow_ups
  FOR UPDATE USING (company_id = auth_company_id());

CREATE POLICY lfu_delete ON lead_follow_ups
  FOR DELETE USING (company_id = auth_company_id());

-- Coluna usada pelos lembretes de follow-up para deduplicar notificações por follow-up específico
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Migra o follow-up único existente de cada lead para a nova tabela
-- (só executa se a coluna ainda existir — migration pode ter rodado parcialmente antes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'follow_up_date'
  ) THEN
    INSERT INTO lead_follow_ups (lead_id, company_id, date, note, done)
    SELECT id, company_id, follow_up_date, follow_up_note, FALSE
    FROM leads
    WHERE follow_up_date IS NOT NULL;

    ALTER TABLE leads
      DROP COLUMN IF EXISTS follow_up_date,
      DROP COLUMN IF EXISTS follow_up_note;
  END IF;
END $$;

-- Remove follow_up_done se ainda existir (adicionado por migration anterior descartada)
ALTER TABLE leads DROP COLUMN IF EXISTS follow_up_done;
