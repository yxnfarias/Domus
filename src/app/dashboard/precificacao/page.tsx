'use client'

import { useState, useCallback } from 'react'
import {
  Calculator, MapPin, ChevronRight, ChevronLeft,
  Info, X, ArrowLeft, TrendingUp, Home, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { PricingResult, ZoneType } from '@/lib/pricing-model'

// ── Types ─────────────────────────────────────────────────────────────────────

type HouseType    = 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'PENTHOUSE' | 'CONDO_HOUSE'
type Relationship = 'OWNER' | 'BROKER' | 'INTERESTED' | 'OTHER'
type Availability =
  | 'AVAILABLE_WITHIN_ONE_MONTH'
  | 'AVAILABLE_WITHIN_THREE_MONTHS'
  | 'AVAILABLE_WITHIN_SIX_MONTHS'
  | 'AVAILABLE_WITHIN_ONE_YEAR_OR_MORE'

interface AddrData {
  cep: string; address: string; number: string; complement: string
  neighborhood: string; city: string; state: string; country: string
}
interface S1Data {
  houseType: HouseType; zone: ZoneType; floor: string; totalArea: string
  relationship: Relationship | ''; houseAvailability: Availability | ''
}

const ZONES: { value: ZoneType; label: string; desc: string }[] = [
  { value: 'premium',    label: 'Nobre',         desc: 'Alto padrão, área valorizada' },
  { value: 'high',       label: 'Valorizado',    desc: 'Boa localização e infraestrutura' },
  { value: 'standard',   label: 'Intermediário', desc: 'Bairro típico, boa moradia' },
  { value: 'affordable', label: 'Periférico',    desc: 'Distante do centro, acesso em desenvolvimento' },
]
interface S2Data { bathroomCount: number; bedroomCount: number; suitesCount: number; parkingSlots: number }
interface S3Data { condominiumPerMonth: string; hasIptu: boolean; iptuPerYear: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const HOUSE_TYPES: { label: string; value: HouseType }[] = [
  { label: 'Apartamento',        value: 'APARTMENT'   },
  { label: 'Casa',               value: 'HOUSE'       },
  { label: 'Studio',             value: 'STUDIO'      },
  { label: 'Cobertura',          value: 'PENTHOUSE'   },
  { label: 'Casa de condomínio', value: 'CONDO_HOUSE' },
]

const HOUSE_TYPE_LABEL: Record<HouseType, string> = {
  APARTMENT: 'Apartamento', HOUSE: 'Casa', STUDIO: 'Studio',
  PENTHOUSE: 'Cobertura',   CONDO_HOUSE: 'Casa de condomínio',
}

const RELATIONSHIPS: { label: string; value: Relationship }[] = [
  { label: 'Proprietário',             value: 'OWNER'      },
  { label: 'Corretor / Representante', value: 'BROKER'     },
  { label: 'Interessado',              value: 'INTERESTED' },
  { label: 'Outro',                    value: 'OTHER'      },
]

const AVAILABILITIES: { label: string; value: Availability }[] = [
  { label: 'Em até 1 mês',   value: 'AVAILABLE_WITHIN_ONE_MONTH'        },
  { label: 'Em até 3 meses', value: 'AVAILABLE_WITHIN_THREE_MONTHS'     },
  { label: 'Em até 6 meses', value: 'AVAILABLE_WITHIN_SIX_MONTHS'       },
  { label: 'Um ano ou mais', value: 'AVAILABLE_WITHIN_ONE_YEAR_OR_MORE' },
]

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
                   'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
                   'SP','SE','TO']

const STEP_LABELS = ['Localização', 'Informações', 'Detalhes', 'Custos']

const CONFIDENCE_CFG = {
  high:   { label: 'Alta confiança',   dot: '#1E6B52', text: '#0F3D2E', bg: 'rgba(30,107,82,0.10)' },
  medium: { label: 'Média confiança',  dot: '#C08A00', text: '#7A5500', bg: '#FFF8E0'              },
  low:    { label: 'Estimativa geral', dot: '#98A19B', text: '#5A6660', bg: '#EAE7DF'              },
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function parseCurrency(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0
}

function formatCurrency(val: string): string {
  const digits = val.replace(/\D/g, '')
  if (!digits) return ''
  const n = parseInt(digits, 10) / 100
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtPct(n: number): string {
  return (n * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

// ── NumStepper ────────────────────────────────────────────────────────────────

function NumStepper({ label, sublabel, value, onChange, min = 0, max }: {
  label: string; sublabel?: string; value: number
  onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--domus-border)' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>{label}</p>
        {sublabel && <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', marginTop: 2 }}>{sublabel}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--domus-border)', background: value <= min ? 'var(--domus-surface-sunken)' : 'var(--domus-white)', cursor: value <= min ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, color: value <= min ? 'var(--domus-text-muted)' : 'var(--domus-text)' }}>
          −
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, minWidth: 24, textAlign: 'center', color: 'var(--domus-text)' }}>{value}</span>
        <button type="button" onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)} disabled={max !== undefined && value >= max}
          style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--domus-border)', background: 'var(--domus-white)', cursor: max !== undefined && value >= max ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, color: 'var(--domus-text)' }}>
          +
        </button>
      </div>
    </div>
  )
}

// ── Breakdown row ─────────────────────────────────────────────────────────────

function BRow({ label, value, highlight, negative }: { label: string; value: number; highlight?: boolean; negative?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--domus-border)' }}>
      <span style={{ fontSize: 12, color: highlight ? 'var(--domus-text)' : 'var(--domus-text-muted)', fontWeight: highlight ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: highlight ? 700 : 500, color: negative ? 'var(--domus-danger)' : highlight ? 'var(--domus-green-700)' : 'var(--domus-text)', fontFamily: highlight ? 'var(--domus-font-display)' : undefined }}>
        {negative && value > 0 ? '− ' : ''}{fmtBRL(value)}
      </span>
    </div>
  )
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({
  result, onReset, addr, s1, s2, s3,
}: {
  result: PricingResult
  onReset: () => void
  addr: AddrData; s1: S1Data; s2: S2Data; s3: S3Data
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const cfg = CONFIDENCE_CFG[result.confidence]

  const range     = result.maxSaleValue - result.minSaleValue
  const markerPct = range > 0
    ? Math.round(((result.estimatedSaleValue - result.minSaleValue) / range) * 100)
    : 50

  const condoVal = parseCurrency(s3.condominiumPerMonth)
  const iptuVal  = s3.hasIptu ? parseCurrency(s3.iptuPerYear) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--domus-surface)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(250,247,242,0.96)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, var(--domus-green-500), var(--domus-green-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calculator size={17} color="rgba(250,247,242,0.95)" />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 14, fontWeight: 600, color: 'var(--domus-text)', lineHeight: 1.2 }}>Calculadora de Precificação</p>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', lineHeight: 1 }}>Resultado da estimativa</p>
            </div>
          </div>
          <button type="button" onClick={onReset}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1.5px solid var(--domus-border)', background: 'var(--domus-white)', color: 'var(--domus-text)', cursor: 'pointer' }}>
            <ArrowLeft size={13} />
            Nova consulta
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ── Card principal: Estimativa de Venda ── */}
        <div className="domus-card" style={{ padding: '28px 32px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--domus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Estimativa de Venda
          </p>

          {/* Valor principal */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 4 }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 38, fontWeight: 700, color: 'var(--domus-text)', lineHeight: 1 }}>
              {fmtBRL(result.estimatedSaleValue)}
            </p>
          </div>
          <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', marginBottom: 28 }}>
            {fmtBRL(result.pricePerM2)}/m²
          </p>

          {/* Slider de posicionamento */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'linear-gradient(to right, #0F3D2E, #1E6B52, #5EA87B, #F5C842, #E07B39, #B23A2A)', marginBottom: 8 }}>
              {/* Marcador */}
              <div style={{
                position: 'absolute', top: '50%', left: `${markerPct}%`,
                transform: 'translate(-50%, -50%)',
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--domus-white)',
                border: '3px solid var(--domus-green-500)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>Mínimo</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--domus-text)' }}>{fmtBRL(result.minSaleValue)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>Estimado</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--domus-green-700)' }}>{fmtBRL(result.estimatedSaleValue)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>Máximo</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--domus-text)' }}>{fmtBRL(result.maxSaleValue)}</p>
              </div>
            </div>
          </div>

          {/* Badge de confiança */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: cfg.bg, marginTop: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: cfg.text }}>
              {cfg.label} — baseado em {result.baseCity}
            </span>
          </div>
        </div>

        {/* ── Estimativa de Locação ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="domus-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Home size={14} color="var(--domus-text-muted)" />
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--domus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Aluguel estimado
              </p>
            </div>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--domus-text)', lineHeight: 1 }}>
              {fmtBRL(result.estimatedRentalMonth)}
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', marginTop: 4 }}>por mês</p>
          </div>

          <div className="domus-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <TrendingUp size={14} color="var(--domus-text-muted)" />
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--domus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Yield de mercado
              </p>
            </div>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--domus-text)', lineHeight: 1 }}>
              {fmtPct(result.rentalYield)}
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', marginTop: 4 }}>ao mês (bruto)</p>
          </div>
        </div>

        {/* ── Detalhamento do Cálculo (expansível) ── */}
        <div className="domus-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowBreakdown(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--domus-text)' }}>Detalhamento do cálculo</span>
            {showBreakdown ? <ChevronUp size={16} color="var(--domus-text-muted)" /> : <ChevronDown size={16} color="var(--domus-text-muted)" />}
          </button>

          {showBreakdown && (
            <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--domus-border)' }}>
              <div style={{ paddingTop: 12 }}>
                <BRow label={`Preço base — ${result.baseCity} (zona intermediária)`} value={result.breakdown.basePricePerM2}     />
                <BRow label={`Fator de zona: ${result.zoneLabel} (×${result.breakdown.zoneFactor.toFixed(2)})`} value={Math.round(result.breakdown.basePricePerM2 * result.breakdown.zoneFactor)} />
                <BRow label="Preço/m² ajustado (características)"    value={result.breakdown.adjustedPricePerM2} />
                <BRow label={`Valor pela área (${s1.totalArea} m²)`} value={result.breakdown.areaValue}          />
                {result.breakdown.parkingValue > 0 && (
                  <BRow label={`Vagas de garagem (${s2.parkingSlots})`} value={result.breakdown.parkingValue} />
                )}
                <BRow label="Valor bruto"                            value={result.breakdown.grossValue}      highlight />
                {result.breakdown.condoDiscount > 0 && (
                  <BRow label="Desconto — condomínio"               value={result.breakdown.condoDiscount}   negative />
                )}
                {result.breakdown.iptuDiscount > 0 && (
                  <BRow label="Desconto — IPTU"                     value={result.breakdown.iptuDiscount}    negative />
                )}
                <BRow label="Valor líquido estimado"                value={result.breakdown.netValue}        highlight />
              </div>

              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', marginTop: 14, lineHeight: 1.5 }}>
                Preços/m² baseados no Índice FIPE ZAP 2024/2025. Os descontos de condomínio e IPTU
                refletem a capitalização desses custos no valor de mercado (metodologia ABNT NBR 14653 simplificada).
              </p>
            </div>
          )}
        </div>

        {/* ── Resumo do imóvel consultado ── */}
        <div className="domus-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--domus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Imóvel consultado
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Tipo</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>{HOUSE_TYPE_LABEL[s1.houseType]} · {s1.totalArea} m²</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Localização</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>{addr.neighborhood || addr.city}, {addr.city} - {addr.state}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Características</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>
                {s2.bedroomCount}q {s2.suitesCount > 0 ? `(${s2.suitesCount} suíte${s2.suitesCount > 1 ? 's' : ''})` : ''} · {s2.bathroomCount}b · {s2.parkingSlots} vaga{s2.parkingSlots !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Custos mensais</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>
                Cond. {fmtBRL(condoVal)}/mês
                {iptuVal > 0 ? ` · IPTU ${fmtBRL(iptuVal)}/ano` : ''}
              </p>
            </div>
            {s1.floor && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Andar</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>{s1.floor}º andar</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Aviso legal ── */}
        <div style={{ padding: '16px 20px', borderRadius: 10, background: '#FFF8E0', border: '1px solid #F0D060' }}>
          <p style={{ fontSize: 12, color: '#7A5500', lineHeight: 1.6 }}>
            <strong>Aviso:</strong> Esta é uma estimativa orientativa baseada em médias de mercado (Índice FIPE ZAP 2024/2025)
            e coeficientes técnicos. Não substitui laudo de avaliação formal (ABNT NBR 14653) para fins jurídicos,
            financiamentos ou transações imobiliárias. A margem de variação é de ±{result.cityFound ? '15' : '20'}%.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Page principal ────────────────────────────────────────────────────────────

export default function PrecificacaoPage() {
  const [step, setStep]               = useState<0 | 1 | 2 | 3>(0)
  const [cepLoading, setCepLoading]   = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [showCondoInfo, setShowCondoInfo] = useState(false)
  const [result, setResult]           = useState<PricingResult | null>(null)
  const [estimating, setEstimating]   = useState(false)
  const [apiError, setApiError]       = useState<string | null>(null)

  const [addr, setAddr] = useState<AddrData>({
    cep: '', address: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', country: 'Brasil',
  })
  const [s1, setS1] = useState<S1Data>({
    houseType: 'APARTMENT', zone: 'standard', floor: '', totalArea: '', relationship: '', houseAvailability: '',
  })
  const [s2, setS2] = useState<S2Data>({ bathroomCount: 1, bedroomCount: 1, suitesCount: 0, parkingSlots: 0 })
  const [s3, setS3] = useState<S3Data>({ condominiumPerMonth: '', hasIptu: false, iptuPerYear: '' })

  const lookupCep = useCallback(async (raw: string) => {
    const cep = raw.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (!r.ok) return
      const d = await r.json()
      if (d.erro) return
      setAddr(a => ({
        ...a, cep: raw,
        address:      d.logradouro ?? a.address,
        neighborhood: d.bairro     ?? a.neighborhood,
        city:         d.localidade ?? a.city,
        state:        d.uf         ?? a.state,
      }))
    } catch { /* ignore */ }
    finally { setCepLoading(false) }
  }, [])

  function validateAddr() {
    const e: Record<string, string> = {}
    if (!/^\d{8}$/.test(addr.cep.replace(/\D/g, ''))) e.cep = 'CEP inválido'
    if (!addr.address.trim())      e.address      = 'Campo obrigatório'
    if (!addr.neighborhood.trim()) e.neighborhood = 'Campo obrigatório'
    if (!addr.city.trim())         e.city         = 'Campo obrigatório'
    if (!addr.state)               e.state        = 'Campo obrigatório'
    setErrors(e); return Object.keys(e).length === 0
  }

  function validateS1() {
    const e: Record<string, string> = {}
    if (!s1.totalArea || parseFloat(s1.totalArea) <= 0) e.totalArea         = 'Campo obrigatório'
    if (!s1.relationship)                               e.relationship      = 'Campo obrigatório'
    if (!s1.houseAvailability)                          e.houseAvailability = 'Campo obrigatório'
    setErrors(e); return Object.keys(e).length === 0
  }

  function validateS3() {
    const e: Record<string, string> = {}
    if (!s3.condominiumPerMonth.trim()) e.condo = 'Campo obrigatório'
    if (s3.hasIptu && !s3.iptuPerYear.trim()) e.iptu = 'Campo obrigatório'
    setErrors(e); return Object.keys(e).length === 0
  }

  async function handleNext() {
    if (step === 0) {
      if (!validateAddr()) return
      setErrors({}); setStep(1)
    } else if (step === 1) {
      if (!validateS1()) return
      setErrors({}); setStep(2)
    } else if (step === 2) {
      setErrors({}); setStep(3)
    } else {
      if (!validateS3()) return
      setEstimating(true); setApiError(null)
      try {
        const res = await fetch('/api/pricing/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city:                addr.city,
            state:               addr.state,
            zone:                s1.zone,
            houseType:           s1.houseType,
            floor:               s1.floor ? parseInt(s1.floor, 10) : 0,
            totalArea:           parseFloat(s1.totalArea),
            bedroomCount:        s2.bedroomCount,
            bathroomCount:       s2.bathroomCount,
            suitesCount:         s2.suitesCount,
            parkingSlots:        s2.parkingSlots,
            condominiumPerMonth: parseCurrency(s3.condominiumPerMonth),
            hasIptu:             s3.hasIptu,
            iptuPerYear:         s3.hasIptu ? parseCurrency(s3.iptuPerYear) : 0,
          }),
        })
        if (!res.ok) throw new Error('Erro ao calcular estimativa')
        setResult(await res.json())
      } catch (e) {
        setApiError(e instanceof Error ? e.message : 'Erro desconhecido')
      } finally {
        setEstimating(false)
      }
    }
  }

  function goBack() {
    if (step === 0) return
    setErrors({}); setApiError(null)
    setStep((step - 1) as 0 | 1 | 2 | 3)
  }

  function handleReset() {
    setResult(null); setStep(0); setErrors({}); setApiError(null)
  }

  const showFloor = s1.houseType !== 'HOUSE' && s1.houseType !== 'CONDO_HOUSE'
  const progress  = (step / 3) * 100

  // ── Renderizar resultado ──────────────────────────────────────────────────
  if (result) {
    return <ResultView result={result} onReset={handleReset} addr={addr} s1={s1} s2={s2} s3={s3} />
  }

  // ── Renderizar wizard ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--domus-surface)' }}>

      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(250,247,242,0.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, var(--domus-green-500), var(--domus-green-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calculator size={17} color="rgba(250,247,242,0.95)" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 14, fontWeight: 600, color: 'var(--domus-text)', lineHeight: 1.2 }}>
              Calculadora de Precificação
            </h1>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', lineHeight: 1 }}>
              Estimativa de valor de venda e locação
            </p>
          </div>
        </div>
        <div style={{ height: 2, background: 'var(--domus-border)' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--domus-green-500)', transition: 'width 0.35s ease' }} />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 120px' }}>

        {/* Step pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28, flexWrap: 'wrap' }}>
          {STEP_LABELS.map((label, i) => {
            const active = i === step; const done = i < step
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: active ? 'var(--domus-green-500)' : done ? 'rgba(15,61,46,0.08)' : 'transparent', border: `1.5px solid ${active ? 'var(--domus-green-500)' : done ? 'transparent' : 'var(--domus-border)'}`, transition: 'all 0.2s' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? 'rgba(250,247,242,0.95)' : done ? 'var(--domus-green-600)' : 'var(--domus-text-muted)' }}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: active ? 'rgba(250,247,242,0.95)' : done ? 'var(--domus-green-700)' : 'var(--domus-text-muted)' }}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && <div style={{ width: 14, height: 1, background: 'var(--domus-border)' }} />}
              </div>
            )
          })}
        </div>

        {/* Card do formulário */}
        <div className="domus-card" style={{ padding: '28px 32px' }}>

          {/* STEP 0 — Localização */}
          {step === 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <MapPin size={18} color="var(--domus-green-500)" />
                <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 600, color: 'var(--domus-text)' }}>
                  Onde fica o imóvel?
                </h2>
              </div>
              <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', marginBottom: 28, lineHeight: 1.5 }}>
                Informe o endereço para obter a estimativa de preço de mercado.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>CEP</label>
                  <div style={{ position: 'relative' }}>
                    <input className={`domus-input w-full${errors.cep ? ' domus-input--error' : ''}`}
                      value={addr.cep}
                      onChange={e => { const v = e.target.value; setAddr(a => ({ ...a, cep: v })); if (v.replace(/\D/g,'').length === 8) lookupCep(v) }}
                      placeholder="00000-000" maxLength={9} />
                    {cepLoading && (
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                        <span style={{ width: 13, height: 13, border: '2px solid var(--domus-ink-100)', borderTopColor: 'var(--domus-green-500)', borderRadius: '50%', display: 'block', animation: 'qp-spin 0.7s linear infinite' }} />
                      </span>
                    )}
                  </div>
                  {errors.cep && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.cep}</p>}
                </div>
                <div>
                  <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>Logradouro</label>
                  <input className={`domus-input w-full${errors.address ? ' domus-input--error' : ''}`}
                    value={addr.address} onChange={e => setAddr(a => ({ ...a, address: e.target.value }))} placeholder="Ex: Rua das Flores" />
                  {errors.address && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.address}</p>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>Número</label>
                  <input className="domus-input w-full" value={addr.number} onChange={e => setAddr(a => ({ ...a, number: e.target.value }))} placeholder="Ex: 123" />
                </div>
                <div>
                  <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>Complemento</label>
                  <input className="domus-input w-full" value={addr.complement} onChange={e => setAddr(a => ({ ...a, complement: e.target.value }))} placeholder="Apto, Bloco... (opcional)" />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>Bairro</label>
                <input className={`domus-input w-full${errors.neighborhood ? ' domus-input--error' : ''}`}
                  value={addr.neighborhood} onChange={e => setAddr(a => ({ ...a, neighborhood: e.target.value }))} placeholder="Ex: Jardim América" />
                {errors.neighborhood && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.neighborhood}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                <div>
                  <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>Cidade</label>
                  <input className={`domus-input w-full${errors.city ? ' domus-input--error' : ''}`}
                    value={addr.city} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))} placeholder="Ex: São Paulo" />
                  {errors.city && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.city}</p>}
                </div>
                <div>
                  <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>Estado</label>
                  <select className={`domus-input w-full${errors.state ? ' domus-input--error' : ''}`}
                    value={addr.state} onChange={e => setAddr(a => ({ ...a, state: e.target.value }))}>
                    <option value="">UF</option>
                    {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.state}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — Informações */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 600, color: 'var(--domus-text)', marginBottom: 4 }}>
                Nos conte mais sobre esse imóvel
              </h2>
              <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', marginBottom: 28, lineHeight: 1.5 }}>
                Quanto mais informação, mais confiável será a estimativa.
              </p>

              <div style={{ marginBottom: 24 }}>
                <label className="domus-label" style={{ display: 'block', marginBottom: 10 }}>Tipo do imóvel</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {HOUSE_TYPES.map(({ label, value }) => (
                    <button key={value} type="button" onClick={() => setS1(s => ({ ...s, houseType: value }))}
                      style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${s1.houseType === value ? 'var(--domus-green-500)' : 'var(--domus-border)'}`, background: s1.houseType === value ? 'rgba(15,61,46,0.07)' : 'var(--domus-white)', color: s1.houseType === value ? 'var(--domus-green-700)' : 'var(--domus-text)', transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zona/Perfil do bairro */}
              <div style={{ marginBottom: 24 }}>
                <label className="domus-label" style={{ display: 'block', marginBottom: 4 }}>
                  Perfil do bairro
                </label>
                <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', marginBottom: 10 }}>
                  Selecione o perfil mais próximo do bairro onde o imóvel está localizado
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ZONES.map(({ value, label, desc }) => {
                    const active = s1.zone === value
                    return (
                      <button key={value} type="button" onClick={() => setS1(s => ({ ...s, zone: value }))}
                        style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${active ? 'var(--domus-green-500)' : 'var(--domus-border)'}`, background: active ? 'rgba(15,61,46,0.07)' : 'var(--domus-white)', transition: 'all 0.15s' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--domus-green-700)' : 'var(--domus-text)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 11, color: active ? 'var(--domus-green-600)' : 'var(--domus-text-muted)' }}>{desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {showFloor && (
                <div style={{ marginBottom: 20 }}>
                  <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>
                    Qual o andar?{' '}
                    <span style={{ fontWeight: 400, color: 'var(--domus-text-muted)' }}>Apenas o número</span>
                  </label>
                  <input className="domus-input" type="number" min="0" value={s1.floor}
                    onChange={e => setS1(s => ({ ...s, floor: e.target.value }))} placeholder="Ex: 5" style={{ width: 110 }} />
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>
                  Qual a área útil?{' '}
                  <span style={{ fontWeight: 400, color: 'var(--domus-text-muted)' }}>Valor aproximado se não souber</span>
                </label>
                <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                  <input className={`domus-input${errors.totalArea ? ' domus-input--error' : ''}`}
                    type="number" min="1" value={s1.totalArea}
                    onChange={e => setS1(s => ({ ...s, totalArea: e.target.value }))} placeholder="Ex: 80" style={{ width: 130, paddingRight: 34 }} />
                  <span style={{ position: 'absolute', right: 10, fontSize: 12, color: 'var(--domus-text-muted)', pointerEvents: 'none' }}>m²</span>
                </div>
                {errors.totalArea && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.totalArea}</p>}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>Qual sua relação com esse imóvel?</label>
                <select className={`domus-input${errors.relationship ? ' domus-input--error' : ''}`}
                  value={s1.relationship} onChange={e => setS1(s => ({ ...s, relationship: e.target.value as Relationship }))} style={{ maxWidth: 340 }}>
                  <option value="">Selecione...</option>
                  {RELATIONSHIPS.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errors.relationship && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.relationship}</p>}
              </div>

              <div>
                <label className="domus-label" style={{ display: 'block', marginBottom: 6 }}>E quando ele estará disponível?</label>
                <select className={`domus-input${errors.houseAvailability ? ' domus-input--error' : ''}`}
                  value={s1.houseAvailability} onChange={e => setS1(s => ({ ...s, houseAvailability: e.target.value as Availability }))} style={{ maxWidth: 340 }}>
                  <option value="">Selecione...</option>
                  {AVAILABILITIES.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errors.houseAvailability && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.houseAvailability}</p>}
              </div>
            </div>
          )}

          {/* STEP 2 — Detalhes */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 600, color: 'var(--domus-text)', marginBottom: 4 }}>
                Detalhes do imóvel
              </h2>
              <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                Informe as quantidades para uma estimativa mais precisa.
              </p>
              <NumStepper label="Banheiros" sublabel="Não incluir lavabo e serviço" value={s2.bathroomCount} min={1}
                onChange={v => setS2(s => ({ ...s, bathroomCount: v }))} />
              <NumStepper label="Quartos" sublabel="Incluindo suítes" value={s2.bedroomCount} min={0}
                onChange={v => setS2(s => ({ ...s, bedroomCount: v, suitesCount: Math.min(s.suitesCount, v) }))} />
              <NumStepper label="Suítes" value={s2.suitesCount} min={0} max={s2.bedroomCount}
                onChange={v => setS2(s => ({ ...s, suitesCount: v }))} />
              <NumStepper label="Vagas de garagem" value={s2.parkingSlots} min={0}
                onChange={v => setS2(s => ({ ...s, parkingSlots: v }))} />
            </div>
          )}

          {/* STEP 3 — Custos */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 600, color: 'var(--domus-text)', marginBottom: 4 }}>
                Custos do imóvel
              </h2>
              <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', marginBottom: 28, lineHeight: 1.5 }}>
                Os custos mensais afetam o valor de mercado do imóvel.
              </p>

              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <label className="domus-label">Valor mensal do condomínio</label>
                  <button type="button" onClick={() => setShowCondoInfo(true)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--domus-text-muted)', display: 'flex', alignItems: 'center' }}>
                    <Info size={14} />
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', marginBottom: 8 }}>
                  Não incluir despesas pontuais (salão de festas, churrasqueira, etc.)
                </p>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 11, fontSize: 12, color: 'var(--domus-text-muted)', pointerEvents: 'none', fontWeight: 500 }}>R$</span>
                  <input className={`domus-input${errors.condo ? ' domus-input--error' : ''}`}
                    value={s3.condominiumPerMonth}
                    onChange={e => setS3(s => ({ ...s, condominiumPerMonth: formatCurrency(e.target.value) }))}
                    placeholder="0,00" style={{ paddingLeft: 36, width: 200 }} />
                </div>
                {errors.condo && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.condo}</p>}
              </div>

              <div>
                <label className="domus-label" style={{ display: 'block', marginBottom: 10 }}>Você paga IPTU?</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: s3.hasIptu ? 20 : 0 }}>
                  {([false, true] as boolean[]).map(val => (
                    <button key={String(val)} type="button" onClick={() => setS3(s => ({ ...s, hasIptu: val }))}
                      style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${s3.hasIptu === val ? 'var(--domus-green-500)' : 'var(--domus-border)'}`, background: s3.hasIptu === val ? 'rgba(15,61,46,0.07)' : 'var(--domus-white)', color: s3.hasIptu === val ? 'var(--domus-green-700)' : 'var(--domus-text)', transition: 'all 0.15s' }}>
                      {val ? 'Sim' : 'Não'}
                    </button>
                  ))}
                </div>
                {s3.hasIptu && (
                  <div>
                    <label className="domus-label" style={{ display: 'block', marginBottom: 4 }}>Valor total anual do IPTU</label>
                    <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', marginBottom: 8 }}>
                      Considere custos adicionais (garagem, depósito, etc.)
                    </p>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: 11, fontSize: 12, color: 'var(--domus-text-muted)', pointerEvents: 'none', fontWeight: 500 }}>R$</span>
                      <input className={`domus-input${errors.iptu ? ' domus-input--error' : ''}`}
                        value={s3.iptuPerYear}
                        onChange={e => setS3(s => ({ ...s, iptuPerYear: formatCurrency(e.target.value) }))}
                        placeholder="0,00" style={{ paddingLeft: 36, width: 200 }} />
                    </div>
                    {errors.iptu && <p style={{ fontSize: 11, color: 'var(--domus-danger)', marginTop: 4 }}>{errors.iptu}</p>}
                  </div>
                )}
              </div>

              {apiError && (
                <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: 'var(--domus-danger-bg)', border: '1px solid var(--domus-danger)' }}>
                  <p style={{ fontSize: 12, color: 'var(--domus-danger)', fontWeight: 500 }}>{apiError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumo (step 3) */}
        {step === 3 && (
          <div className="domus-card" style={{ marginTop: 14, padding: '14px 20px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--domus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Imóvel</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>{HOUSE_TYPE_LABEL[s1.houseType]} · {s1.totalArea} m²</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--domus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Detalhes</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>{s2.bedroomCount}q · {s2.bathroomCount}b · {s2.parkingSlots} vaga{s2.parkingSlots !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--domus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Localização</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)' }}>{addr.neighborhood || addr.city}, {addr.city} - {addr.state}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'rgba(250,247,242,0.97)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--domus-border)', padding: '14px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={goBack}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1.5px solid var(--domus-border)', background: 'var(--domus-white)', color: 'var(--domus-text)', cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
            <ChevronLeft size={15} />
            Voltar
          </button>

          <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Passo {step + 1} de 4</span>

          <button type="button" onClick={handleNext} disabled={estimating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: 'linear-gradient(135deg, var(--domus-green-500), var(--domus-green-700))', color: 'rgba(250,247,242,0.95)', cursor: estimating ? 'wait' : 'pointer', opacity: estimating ? 0.82 : 1, boxShadow: '0 2px 10px -2px rgba(15,61,46,0.3)', transition: 'opacity 0.15s' }}>
            {estimating ? (
              <>
                <span style={{ width: 13, height: 13, border: '2px solid rgba(250,247,242,0.3)', borderTopColor: 'rgba(250,247,242,0.9)', borderRadius: '50%', display: 'inline-block', animation: 'qp-spin 0.7s linear infinite' }} />
                Calculando...
              </>
            ) : step === 3 ? (
              <>
                <Calculator size={14} />
                Calcular Estimativa
              </>
            ) : (
              <>
                Continuar
                <ChevronRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal: condomínio */}
      {showCondoInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}
          onClick={() => setShowCondoInfo(false)}>
          <div className="domus-card" style={{ maxWidth: 420, width: '100%', padding: '24px 28px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 14, fontWeight: 600, color: 'var(--domus-text)' }}>
                O que incluir no condomínio?
              </h3>
              <button type="button" onClick={() => setShowCondoInfo(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--domus-text-muted)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--domus-text)', lineHeight: 1.65 }}>
              Informe o valor do último boleto do condomínio, incluindo obras ou despesas extras.
              Considere só o que faz parte da cobrança mensal, sem incluir valores pontuais
              como aluguel de salão de festas e churrasqueira.
            </p>
            <button type="button" onClick={() => setShowCondoInfo(false)}
              style={{ marginTop: 20, width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--domus-green-500)', color: 'rgba(250,247,242,0.95)' }}>
              Entendi
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes qp-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
