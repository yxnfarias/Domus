export type LeadStatus = 'Pendente' | 'Em Análise' | 'Crédito Pré-Aprovado' | 'Recusado'
export type PropertyStatus = 'available' | 'reserved' | 'under_contract' | 'sold'
export type UserRole = 'admin' | 'broker' | 'super_admin'
export type CommissionStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled'
export type LeadEventType =
  | 'created' | 'status_changed' | 'broker_assigned'
  | 'follow_up_set' | 'follow_up_done_changed' | 'note_added' | 'document_added'
  | 'credit_analyzed' | 'property_matched'
export type WorkRegime = 'CLT' | 'Autônomo' | 'Liberal' | 'Empresário' | 'Servidor Público'
export type MaritalStatus = 'Solteiro' | 'Casado' | 'União Estável' | 'Divorciado' | 'Viúvo'

export interface SpouseData {
  name: string
  cpf: string
  income: number
}

export interface LeadFollowUp {
  id: string
  lead_id: string
  company_id: string
  date: string
  note: string | null
  done: boolean
  created_by: string | null
  created_at: string
}

export interface Lead {
  id: string
  company_id: string
  name: string
  email: string
  whatsapp: string
  cpf: string
  rg: string
  rg_organ: string
  birth_date: string
  marital_status: MaritalStatus
  income: number
  work_regime: WorkRegime
  property_value: number
  region: string
  fgts: number
  down_payment: number
  status: LeadStatus
  credit_score: number | null
  max_financing_sac: number | null
  max_financing_price: number | null
  pdf_url: string | null
  broker_id: string | null
  created_at: string
  spouse?: SpouseData | null
  documents?: LeadDocument[]
  follow_ups?: LeadFollowUp[]
}

export interface LeadEvent {
  id: string
  lead_id: string
  company_id: string
  user_id: string | null
  event_type: LeadEventType
  note: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LeadDocument {
  id: string
  lead_id: string
  type: 'residence' | 'income_payslip' | 'income_statement' | 'rg' | 'cpf'
  file_url: string
  file_name: string
  created_at: string
}

export interface Property {
  id: string
  company_id: string
  title: string
  description: string | null
  address: string | null
  area_m2: number | null
  rooms: number
  bedrooms: number
  bathrooms: number
  parking_spots: number
  value: number | null
  region: string | null
  status: PropertyStatus
  sold_at: string | null
  sold_by: string | null
  photo_urls: string[]
  created_at: string
  updated_at: string
}

export interface Commission {
  id: string
  company_id: string
  lead_id: string | null
  property_id: string | null
  broker_id: string | null
  commission_type: 'direta' | 'parceiro'
  description: string | null
  partner_name: string | null
  sale_value: number
  commission_pct: number
  commission_amt: number
  partner_pct: number | null
  status: CommissionStatus
  notes: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  // joined fields
  lead_name?: string
  property_title?: string
  broker_email?: string
}

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  theme_config: {
    primary: string
    secondary: string
    accent: string
    border_radius: string
    font_heading: string
    font_body: string
  }
}

export interface CreditAnalysis {
  score: number
  can_finance: boolean
  max_installment: number
  max_financing_sac: number
  max_financing_price: number
  income_ratio: number
  restrictions: string[]
  ocr_income_validated: boolean
  declared_income: number
  verified_income: number | null
}

export interface CompanyUser {
  id: string
  email: string
  name?: string
  role: 'admin' | 'broker'
  joined_at: string
}

export interface Invitation {
  id: string
  company_id: string
  email: string
  role: 'admin' | 'broker'
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface CurrentUser {
  user_id: string
  email: string
  role: UserRole
  company_id: string | null
  is_super_admin: boolean
}

export type DealStage =
  | 'interest'
  | 'visit_scheduled'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed'
  | 'lost'

export interface Deal {
  id:          string
  company_id:  string
  lead_id:     string
  property_id: string | null
  stage:       DealStage
  notes:       string | null
  created_at:  string
  updated_at:  string
  closed_at:   string | null
  lead?:       { id: string; name: string; status: string; broker_id: string | null } | null
  property?:   { id: string; title: string; value: number | null } | null
}

export interface DealEvent {
  id:         string
  deal_id:    string
  from_stage: DealStage | null
  to_stage:   DealStage
  note:       string | null
  created_at: string
}

export interface FormData {
  // Step 1: Identification
  name: string
  email: string
  whatsapp: string
  // Step 2: Civil data
  cpf: string
  rg: string
  rg_organ: string
  birth_date: string
  // Step 3: Financial
  marital_status: MaritalStatus | ''
  income: string
  work_regime: WorkRegime | ''
  spouse_name: string
  spouse_cpf: string
  spouse_income: string
  // Step 4: Documents
  residence_proof: File | null
  income_docs: File[]
  // Step 5: Purchase intent
  property_value: string
  region: string
  fgts: string
  down_payment: string
}
