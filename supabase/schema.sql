-- =====================================================================
-- DOMUS · Supabase Database Schema
-- Multi-tenant Real Estate SaaS with Row Level Security
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- COMPANIES (Tenants)
-- =====================================================================
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  theme_config  JSONB DEFAULT '{
    "primary": "#0F3D2E",
    "secondary": "#D5C2A1",
    "accent": "#FAF7F2",
    "border_radius": "6px",
    "font_heading": "Unbounded",
    "font_body": "DM Sans"
  }',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- COMPANY_USERS (Brokers / Admins)
-- =====================================================================
CREATE TABLE company_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'broker' CHECK (role IN ('admin', 'broker')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- =====================================================================
-- LEADS
-- =====================================================================
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  whatsapp              TEXT NOT NULL,

  -- Civil data
  cpf                   TEXT NOT NULL,
  rg                    TEXT,
  rg_organ              TEXT,
  birth_date            DATE NOT NULL,

  -- Financial profile
  marital_status        TEXT NOT NULL,
  income                NUMERIC(12,2) NOT NULL,
  work_regime           TEXT NOT NULL,

  -- Purchase intent
  property_value        NUMERIC(14,2) NOT NULL,
  region                TEXT,
  fgts                  NUMERIC(12,2) DEFAULT 0,
  down_payment          NUMERIC(12,2) DEFAULT 0,

  -- Credit analysis results
  status                TEXT NOT NULL DEFAULT 'Pendente'
                          CHECK (status IN ('Pendente', 'Em Análise', 'Crédito Pré-Aprovado', 'Recusado')),
  credit_score          INTEGER,
  max_financing_sac     NUMERIC(14,2),
  max_financing_price   NUMERIC(14,2),
  pdf_url               TEXT,

  -- Metadata
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- SPOUSE_DATA
-- =====================================================================
CREATE TABLE spouse_data (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  cpf           TEXT,
  income        NUMERIC(12,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- LEAD_DOCUMENTS
-- =====================================================================
CREATE TABLE lead_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('residence', 'income_payslip', 'income_statement', 'rg', 'cpf')),
  file_url      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- WEBHOOK_CONFIGS
-- =====================================================================
CREATE TABLE webhook_configs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  secret        TEXT,
  events        TEXT[] DEFAULT ARRAY['lead.created', 'credit.analyzed'],
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- INDEXES
-- =====================================================================
CREATE INDEX idx_leads_company_id     ON leads(company_id);
CREATE INDEX idx_leads_status         ON leads(status);
CREATE INDEX idx_leads_created_at     ON leads(created_at DESC);
CREATE INDEX idx_lead_docs_lead_id    ON lead_documents(lead_id);
CREATE INDEX idx_company_users_user   ON company_users(user_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

-- Helper function: get company_id for the current authenticated user
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT company_id
  FROM company_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ---- LEADS ----
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select ON leads
  FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY leads_insert ON leads
  FOR INSERT
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY leads_update ON leads
  FOR UPDATE
  USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

-- ---- SPOUSE_DATA ----
ALTER TABLE spouse_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY spouse_select ON spouse_data
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE company_id = auth_company_id()
    )
  );

CREATE POLICY spouse_insert ON spouse_data
  FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE company_id = auth_company_id()
    )
  );

-- ---- LEAD_DOCUMENTS ----
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY docs_select ON lead_documents
  FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY docs_insert ON lead_documents
  FOR INSERT
  WITH CHECK (company_id = auth_company_id());

-- ---- COMPANY_USERS ----
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY cu_select ON company_users
  FOR SELECT
  USING (user_id = auth.uid());

-- ---- WEBHOOK_CONFIGS ----
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY wh_all ON webhook_configs
  FOR ALL
  USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

-- =====================================================================
-- PUBLIC INSERT POLICY FOR LEAD FORM
-- Leads can be submitted without authentication via the public form.
-- We validate company ownership at the application layer.
-- =====================================================================
CREATE POLICY leads_public_insert ON leads
  FOR INSERT
  WITH CHECK (true);  -- validated via company slug in API route

-- =====================================================================
-- UPDATED_AT TRIGGER
-- =====================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_updated_at    BEFORE UPDATE ON leads    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- PROPERTIES
-- =====================================================================
CREATE TABLE IF NOT EXISTS properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  address       VARCHAR(300),
  area_m2       DECIMAL(10,2),
  rooms         INTEGER DEFAULT 0,
  bedrooms      INTEGER DEFAULT 0,
  bathrooms     INTEGER DEFAULT 0,
  parking_spots INTEGER DEFAULT 0,
  value         DECIMAL(14,2),
  status        VARCHAR(20) DEFAULT 'available',
  sold_at       TIMESTAMPTZ,
  photo_urls    TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company owns property" ON properties
  FOR ALL USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- CALENDAR TOKENS (Google Calendar per company)
-- =====================================================================
CREATE TABLE IF NOT EXISTS calendar_tokens (
  company_id    UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company owns token" ON calendar_tokens FOR ALL USING (company_id = auth_company_id());

CREATE TRIGGER calendar_tokens_updated_at
  BEFORE UPDATE ON calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- SEED: Demo company
-- =====================================================================
INSERT INTO companies (name, slug) VALUES ('Renovar Imóveis', 'renovar');

-- =====================================================================
-- RBAC EXTENSIONS  (run as a new migration after the base schema)
-- =====================================================================

-- BROKER_ID on leads (attribution to the employee who processed the lead)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_broker_id ON leads(broker_id);

-- REGION on properties (was missing from base schema)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS region VARCHAR(200);

-- =====================================================================
-- SUPER_ADMINS  (platform level — not tied to any company)
-- =====================================================================
CREATE TABLE IF NOT EXISTS super_admins (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- Allow each super_admin to confirm their own status (used by middleware with anon key)
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_self_select ON super_admins
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================================
-- SUBSCRIPTIONS  (one per company)
-- =====================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan                 TEXT NOT NULL DEFAULT 'starter'
                         CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status               TEXT NOT NULL DEFAULT 'trial'
                         CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at        TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  current_period_end   TIMESTAMPTZ,
  max_users            INTEGER NOT NULL DEFAULT 5,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_select ON subscriptions
  FOR SELECT USING (company_id = auth_company_id());

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- INVITATIONS  (email invites to join a company)
-- =====================================================================
CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'broker' CHECK (role IN ('admin', 'broker')),
  invited_by  UUID NOT NULL REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_company ON invitations
  FOR ALL
  USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());
