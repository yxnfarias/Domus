/**
 * Domus Credit Engine
 * Implements SFH (Sistema Financeiro da Habitação) rules:
 *  - Max 30% of gross income committed to mortgage installments
 *  - SAC and PRICE amortization tables
 *  - Score-based viability check
 */

export interface CreditInput {
  income: number
  work_regime: string
  birth_date: string
  property_value: number
  fgts?: number
  down_payment?: number
  spouse_income?: number
  ocr_income?: number | null
}

export interface CreditResult {
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

const ANNUAL_RATE = 0.0762
const MONTHLY_RATE = ANNUAL_RATE / 12
const MAX_TERM_MONTHS = 360

function calcMaxFinancingSAC(maxInstallment: number, n: number, i: number): number {
  // For SAC first installment = PV/n + PV*i  =>  PV = maxInstallment / (1/n + i)
  return maxInstallment / (1 / n + i)
}

function calcMaxFinancingPRICE(maxInstallment: number, n: number, i: number): number {
  // PRICE: PMT = PV * [i*(1+i)^n] / [(1+i)^n - 1]  => PV = PMT / factor
  const factor = (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
  return maxInstallment / factor
}

function simulateScore(input: CreditInput): number {
  // Simplified scoring model (0–1000)
  let score = 600

  const totalIncome = input.income + (input.spouse_income ?? 0)

  // Income-to-property ratio
  const ratio = (totalIncome * 12) / input.property_value
  if (ratio >= 0.12) score += 80
  else if (ratio >= 0.08) score += 40
  else score -= 80

  // Work regime stability
  const regimeBonus: Record<string, number> = {
    'CLT': 60,
    'Servidor Público': 80,
    'Liberal': 20,
    'Empresário': 10,
    'Autônomo': 0,
  }
  score += regimeBonus[input.work_regime] ?? 0

  // Age factor
  const age = new Date().getFullYear() - new Date(input.birth_date).getFullYear()
  if (age < 40) score += 30
  else if (age > 65) score -= 60

  // Down payment factor
  const downPaymentRatio = ((input.down_payment ?? 0) + (input.fgts ?? 0)) / input.property_value
  if (downPaymentRatio >= 0.3) score += 80
  else if (downPaymentRatio >= 0.2) score += 40

  // OCR validation
  if (input.ocr_income !== null && input.ocr_income !== undefined) {
    const variance = Math.abs(input.ocr_income - input.income) / input.income
    if (variance > 0.2) score -= 120  // declared income diverges >20% from documents
    else score += 20
  }

  return Math.max(0, Math.min(1000, Math.round(score)))
}

export function analyzeCreditEligibility(input: CreditInput): CreditResult {
  const totalIncome = input.income + (input.spouse_income ?? 0)
  const maxInstallment = totalIncome * 0.30

  const age = new Date().getFullYear() - new Date(input.birth_date).getFullYear()
  const termMonths = Math.min(MAX_TERM_MONTHS, (80 - age) * 12)

  const sacFinancing = Math.max(0, calcMaxFinancingSAC(maxInstallment, termMonths, MONTHLY_RATE))
  const priceFinancing = Math.max(0, calcMaxFinancingPRICE(maxInstallment, termMonths, MONTHLY_RATE))

  const score = simulateScore(input)
  const restrictions: string[] = []

  if (score < 400) restrictions.push('Score abaixo do mínimo exigido pelos bancos (400)')
  if (age > 75) restrictions.push('Idade avançada pode limitar o prazo de financiamento')
  if (input.property_value > sacFinancing * 1.8) restrictions.push('Valor do imóvel supera significativamente a capacidade de financiamento')

  const can_finance = score >= 400 && restrictions.length === 0

  return {
    score,
    can_finance,
    max_installment: Math.round(maxInstallment),
    max_financing_sac: Math.round(sacFinancing),
    max_financing_price: Math.round(priceFinancing),
    income_ratio: Math.round((maxInstallment / totalIncome) * 100) / 100,
    restrictions,
    ocr_income_validated: input.ocr_income !== null && input.ocr_income !== undefined,
    declared_income: totalIncome,
    verified_income: input.ocr_income ?? null,
  }
}

/* ───────────────────────── Multibank Comparator ───────────────────────── */

export interface BankSimulation {
  id: string
  bank: string
  product: string
  annual_rate: number
  ltv_sac: number
  ltv_price: number
  max_financing_sac: number
  max_financing_price: number
  first_installment_sac: number
  first_installment_price: number
  mip_monthly: number
  dfi_monthly: number
  total_first_installment_sac: number
  total_first_installment_price: number
  income_commitment_pct: number
  eligible: boolean
  notes: string[]
}

interface BankConfig {
  id: string
  name: string
  product: string
  annualRate: number
  ltvSac: number
  ltvPrice: number
  mcmv?: boolean
}

const BANKS: BankConfig[] = [
  { id: 'caixa_sbpe', name: 'Caixa Econômica Federal', product: 'SBPE',                  annualRate: 0.0900, ltvSac: 0.80, ltvPrice: 0.70 },
  { id: 'caixa_mcmv', name: 'Caixa Econômica Federal', product: 'Minha Casa Minha Vida', annualRate: 0.0425, ltvSac: 0.90, ltvPrice: 0.80, mcmv: true },
  { id: 'itau',       name: 'Itaú',                    product: 'Crédito Imobiliário',   annualRate: 0.1049, ltvSac: 0.82, ltvPrice: 0.82 },
  { id: 'bradesco',   name: 'Bradesco',                product: 'Crédito Imobiliário',   annualRate: 0.1050, ltvSac: 0.80, ltvPrice: 0.80 },
  { id: 'santander',  name: 'Santander',               product: 'Crédito Imobiliário',   annualRate: 0.1099, ltvSac: 0.80, ltvPrice: 0.80 },
]

/** MCMV rate brackets by gross monthly household income (faixas 1–3, valores de referência) */
function mcmvBracket(monthlyIncome: number): { rate: number; eligible: boolean; bracket: string } {
  if (monthlyIncome <= 2640) return { rate: 0.0425, eligible: true,  bracket: 'Faixa 1' }
  if (monthlyIncome <= 4400) return { rate: 0.0500, eligible: true,  bracket: 'Faixa 2' }
  if (monthlyIncome <= 8000) return { rate: 0.0816, eligible: true,  bracket: 'Faixa 3' }
  return { rate: 0.0816, eligible: false, bracket: 'Acima do teto do programa' }
}

function installmentSAC(pv: number, n: number, i: number): number {
  return pv / n + pv * i
}

function installmentPRICE(pv: number, n: number, i: number): number {
  const factor = (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
  return pv * factor
}

/** MIP (Morte e Invalidez Permanente) — percentual mensal sobre o saldo devedor, crescente com a idade */
function calcMIP(balance: number, age: number): number {
  if (balance <= 0) return 0
  const monthlyRate =
    age < 30 ? 0.00018 :
    age < 40 ? 0.00025 :
    age < 50 ? 0.00038 :
    age < 60 ? 0.00065 : 0.00098
  return balance * monthlyRate
}

/** DFI (Danos Físicos ao Imóvel) — percentual mensal fixo sobre o valor do imóvel */
function calcDFI(propertyValue: number): number {
  return propertyValue * 0.00012
}

/**
 * Resolves the financeable PV for one amortization system, bounded by LTV and by the
 * income-commitment ceiling. MIP+DFI are estimated on the LTV/income-derived PV first,
 * then — if they push the installment past the ceiling — the PV is re-derived from a
 * budget that already reserves room for the insurance, instead of layering insurance
 * on top of an installment that alone already consumes the full 30%.
 */
function resolveBankFinancing(
  ltvCap: number,
  incomeMaxInstallment: number,
  termMonths: number,
  monthlyRate: number,
  age: number,
  propertyValue: number,
  calcMaxFinancing: (maxInstallment: number, n: number, i: number) => number,
  installmentOf: (pv: number, n: number, i: number) => number,
) {
  const dfi = calcDFI(propertyValue)
  let pv = Math.min(ltvCap, Math.max(0, calcMaxFinancing(incomeMaxInstallment, termMonths, monthlyRate)))
  let principal = pv > 0 ? installmentOf(pv, termMonths, monthlyRate) : 0
  let mip = calcMIP(pv, age)

  if (pv > 0 && principal + mip + dfi > incomeMaxInstallment) {
    const adjustedBudget = Math.max(0, incomeMaxInstallment - mip - dfi)
    pv = Math.min(pv, Math.max(0, calcMaxFinancing(adjustedBudget, termMonths, monthlyRate)))
    principal = pv > 0 ? installmentOf(pv, termMonths, monthlyRate) : 0
    mip = calcMIP(pv, age)
  }

  return { pv, principal, mip, dfi, total: principal + mip + dfi }
}

/**
 * Simulates the same applicant profile across partner banks, applying each
 * institution's own rate, LTV limits and (for Caixa MCMV) income-bracket rules.
 * `analyzeCreditEligibility` remains the canonical score/eligibility source that
 * gets persisted to `leads` — this is a display-only comparison layer on top of it.
 */
export function compareMultibank(input: CreditInput): BankSimulation[] {
  const totalIncome = input.income + (input.spouse_income ?? 0)
  const age = new Date().getFullYear() - new Date(input.birth_date).getFullYear()
  const termMonths = Math.max(12, Math.min(MAX_TERM_MONTHS, (80 - age) * 12))
  const downPayment = (input.down_payment ?? 0) + (input.fgts ?? 0)
  const incomeMaxInstallment = totalIncome * 0.30

  return BANKS.map(bank => {
    const notes: string[] = []
    let annualRate = bank.annualRate

    if (bank.mcmv) {
      const { rate, eligible, bracket } = mcmvBracket(totalIncome)
      annualRate = rate
      notes.push(`Enquadramento MCMV: ${bracket}`)
      if (!eligible) notes.push('Renda familiar acima do teto do programa MCMV — sujeita a reenquadramento na linha SBPE')
    }

    const monthlyRate = annualRate / 12
    const ltvCapSac   = Math.max(0, input.property_value * bank.ltvSac   - downPayment)
    const ltvCapPrice = Math.max(0, input.property_value * bank.ltvPrice - downPayment)

    const sac   = resolveBankFinancing(ltvCapSac,   incomeMaxInstallment, termMonths, monthlyRate, age, input.property_value, calcMaxFinancingSAC,   installmentSAC)
    const price = resolveBankFinancing(ltvCapPrice, incomeMaxInstallment, termMonths, monthlyRate, age, input.property_value, calcMaxFinancingPRICE, installmentPRICE)

    const commitmentPct = totalIncome > 0 ? (sac.total / totalIncome) * 100 : 0
    if (commitmentPct > 30) notes.push('Comprometimento de renda acima de 30% mesmo após o ajuste — sujeito a reanálise manual')

    const eligible = sac.pv > 0 && commitmentPct <= 30.05 && (!bank.mcmv || mcmvBracket(totalIncome).eligible)

    return {
      id: bank.id,
      bank: bank.name,
      product: bank.product,
      annual_rate: annualRate,
      ltv_sac: bank.ltvSac,
      ltv_price: bank.ltvPrice,
      max_financing_sac: Math.round(sac.pv),
      max_financing_price: Math.round(price.pv),
      first_installment_sac: Math.round(sac.principal),
      first_installment_price: Math.round(price.principal),
      mip_monthly: Math.round(sac.mip),
      dfi_monthly: Math.round(sac.dfi),
      total_first_installment_sac: Math.round(sac.total),
      total_first_installment_price: Math.round(price.total),
      income_commitment_pct: Math.round(commitmentPct * 10) / 10,
      eligible,
      notes,
    }
  })
}

/** Stub OCR extraction — in production, call Mindee/Tesseract */
export async function extractIncomeFromDocument(fileBuffer: Buffer, mimeType: string): Promise<number | null> {
  // Production: POST to Mindee API or run Tesseract
  // Returns extracted net income value or null if not found
  return null
}
