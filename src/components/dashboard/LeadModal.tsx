'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lead, LeadStatus, LeadEvent, LeadFollowUp, Property, CompanyUser } from '@/lib/types'
import { formatCurrency, formatDate, whatsappLink, formatDateOnly, followUpStatus } from '@/lib/utils'
import { X, BrainCircuit, MessageCircle, Download, FileDown, User, FileText, CreditCard, AlertTriangle, CheckCircle2, XCircle, Clock, Building2, ChevronDown, CalendarCheck, ClipboardList, MapPin, Sparkles, Info, Plus, Trash2, RotateCcw } from 'lucide-react'
import { analyzeCreditEligibility, compareMultibank, type BankSimulation } from '@/lib/credit-engine'
import { cn } from '@/lib/utils'
import { useCompany } from '@/lib/company-context'
import { ConfirmDialog } from './ConfirmDialog'

// company_id for property matching is passed via the standard auth'd API (no header needed)

interface Props {
  lead: Lead
  onClose: () => void
  onUpdate: (lead: Lead) => void
}

type Tab = 'profile' | 'documents' | 'credit' | 'matching' | 'followup'

const statusConfig: Record<LeadStatus, { label: string; cls: string }> = {
  'Pendente': { label: 'Pendente', cls: 'domus-badge--ink' },
  'Em Análise': { label: 'Em Análise', cls: 'domus-badge--warn' },
  'Crédito Pré-Aprovado': { label: 'Pré-Aprovado', cls: 'domus-badge--ok' },
  'Recusado': { label: 'Recusado', cls: 'domus-badge--danger' },
}

const DOC_LABELS: Record<string, string> = {
  residence: 'Comprovante de Residência',
  income_payslip: 'Holerite',
  income_statement: 'Declaração de Renda',
  rg: 'RG',
  cpf: 'CPF',
}

function deriveCredit(lead: Lead) {
  return analyzeCreditEligibility({
    income: lead.income,
    work_regime: lead.work_regime,
    birth_date: lead.birth_date || '1990-01-01',
    property_value: lead.property_value,
    fgts: lead.fgts,
    down_payment: lead.down_payment,
    spouse_income: lead.spouse?.income ?? 0,
    ocr_income: null,
  })
}

function deriveBankComparison(lead: Lead) {
  return compareMultibank({
    income: lead.income,
    work_regime: lead.work_regime,
    birth_date: lead.birth_date || '1990-01-01',
    property_value: lead.property_value,
    fgts: lead.fgts,
    down_payment: lead.down_payment,
    spouse_income: lead.spouse?.income ?? 0,
    ocr_income: null,
  })
}

function getScoreFactors(lead: Lead) {
  const totalIncome = lead.income + (lead.spouse?.income ?? 0)
  const ratio = lead.property_value > 0 ? (totalIncome * 12) / lead.property_value : 0
  const age = new Date().getFullYear() - new Date(lead.birth_date || '1990-01-01').getFullYear()
  const downPct = lead.property_value > 0
    ? ((lead.down_payment ?? 0) + (lead.fgts ?? 0)) / lead.property_value
    : 0
  const regimeBonus: Record<string, number> = {
    'CLT': 60, 'Servidor Público': 80, 'Liberal': 20, 'Empresário': 10, 'Autônomo': 0,
  }

  return [
    {
      label: 'Renda × valor do imóvel',
      delta: ratio >= 0.12 ? +80 : ratio >= 0.08 ? +40 : -80,
      detail: ratio >= 0.12
        ? `Renda anual cobre ≥ 12% do imóvel (${Math.round(ratio * 100)}%) — ótima proporção`
        : ratio >= 0.08
          ? `Renda anual cobre ${Math.round(ratio * 100)}% do imóvel — proporção razoável`
          : `Renda anual cobre apenas ${Math.round(ratio * 100)}% do imóvel — proporção baixa`,
    },
    {
      label: 'Estabilidade do vínculo',
      delta: regimeBonus[lead.work_regime] ?? 0,
      detail: {
        'CLT': 'CLT garante renda comprovada e segurança jurídica',
        'Servidor Público': 'Servidor público tem máxima estabilidade',
        'Liberal': 'Profissional liberal tem renda variável',
        'Empresário': 'Empresário tem renda sujeita a variações',
        'Autônomo': 'Autônomo tem maior risco de irregularidade de renda',
      }[lead.work_regime] ?? lead.work_regime,
    },
    {
      label: 'Faixa etária',
      delta: age < 40 ? +30 : age > 65 ? -60 : 0,
      detail: age < 40
        ? `${age} anos — prazo longo disponível para financiamento`
        : age > 65
          ? `${age} anos — prazo máximo de financiamento reduzido`
          : `${age} anos — faixa etária neutra`,
    },
    {
      label: 'Entrada + FGTS',
      delta: downPct >= 0.3 ? +80 : downPct >= 0.2 ? +40 : 0,
      detail: downPct >= 0.3
        ? `${Math.round(downPct * 100)}% do imóvel como entrada — reduz risco significativamente`
        : downPct >= 0.2
          ? `${Math.round(downPct * 100)}% do imóvel como entrada — entrada adequada`
          : downPct > 0
            ? `${Math.round(downPct * 100)}% de entrada — abaixo de 20%, sem bônus`
            : 'Nenhuma entrada informada',
    },
  ]
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--domus-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--domus-text)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function CreditMeter({ score }: { score: number }) {
  const pct = Math.min(score / 1000, 1)
  const color = score >= 700 ? 'var(--domus-success)' : score >= 500 ? 'var(--domus-warning)' : 'var(--domus-danger)'
  const label = score >= 700 ? 'Excelente' : score >= 500 ? 'Regular' : 'Baixo'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 36, fontWeight: 400, color: 'var(--domus-text)', letterSpacing: '-0.02em' }}>
          {score}
        </span>
        <span style={{ fontSize: 13, color, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ height: 6, background: 'var(--domus-ink-100)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 600ms cubic-bezier(0.2,0,0.1,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--domus-text-muted)', fontFamily: 'var(--domus-font-mono)' }}>
        <span>0 — Baixo</span>
        <span>500 — Médio</span>
        <span>1000 — Ótimo</span>
      </div>
    </div>
  )
}

function FinancingTable({ sac, price }: { sac: number; price: number }) {
  const MAX_TERM = 360
  const RATE = 0.0762 / 12

  const calcSACInstallment = (pv: number, n: number, i: number) => pv / n + pv * i
  const calcPRICEInstallment = (pv: number, n: number, i: number) => {
    return pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
  }

  return (
    <div style={{ border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-md)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--domus-surface)' }}>
            {['Sistema', 'Valor máximo', '1ª Parcela (est.)', 'Prazo'].map(h => (
              <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', textAlign: 'left', borderBottom: '1px solid var(--domus-border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--domus-brand)' }}>SAC</td>
            <td style={{ padding: '12px 14px', fontFamily: 'var(--domus-font-mono)', fontSize: 13 }}>{formatCurrency(sac)}</td>
            <td style={{ padding: '12px 14px', fontFamily: 'var(--domus-font-mono)', fontSize: 13, color: 'var(--domus-text-secondary)' }}>
              {formatCurrency(calcSACInstallment(sac, MAX_TERM, RATE))}
            </td>
            <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--domus-text-muted)' }}>360 meses</td>
          </tr>
          <tr style={{ borderTop: '1px solid var(--domus-border)' }}>
            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--domus-brand)' }}>PRICE</td>
            <td style={{ padding: '12px 14px', fontFamily: 'var(--domus-font-mono)', fontSize: 13 }}>{formatCurrency(price)}</td>
            <td style={{ padding: '12px 14px', fontFamily: 'var(--domus-font-mono)', fontSize: 13, color: 'var(--domus-text-secondary)' }}>
              {formatCurrency(calcPRICEInstallment(price, MAX_TERM, RATE))}
            </td>
            <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--domus-text-muted)' }}>360 meses</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function BankComparisonGrid({ banks }: { banks: BankSimulation[] }) {
  const eligible = banks.filter(b => b.eligible)
  const bestId = eligible.length > 0
    ? eligible.reduce((best, b) => (b.total_first_installment_sac < best.total_first_installment_sac ? b : best)).id
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {banks.map(b => {
        const isBest = b.id === bestId
        const commitmentColor = b.income_commitment_pct <= 30 ? 'var(--domus-success)' : 'var(--domus-danger)'

        return (
          <div key={b.id} style={{
            border: `1px solid ${isBest ? 'var(--domus-success)' : 'var(--domus-border)'}`,
            borderRadius: 'var(--domus-radius-md)',
            padding: '14px 16px',
            background: isBest ? 'rgba(34,197,94,0.05)' : 'transparent',
            opacity: b.eligible ? 1 : 0.65,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--domus-text)' }}>{b.bank}</p>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--domus-surface)', color: 'var(--domus-text-muted)' }}>
                    {b.product}
                  </span>
                  {isBest && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(34,197,94,0.14)', color: 'var(--domus-success)' }}>
                      <Sparkles size={10} /> Melhor custo-benefício
                    </span>
                  )}
                  {!b.eligible && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: 'var(--domus-danger)' }}>
                      Não elegível
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '4px 0 0' }}>
                  {(b.annual_rate * 100).toFixed(2).replace('.', ',')}% a.a. + TR · LTV {Math.round(b.ltv_sac * 100)}% (SAC) / {Math.round(b.ltv_price * 100)}% (PRICE)
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--domus-text)' }}>
                  {formatCurrency(b.total_first_installment_sac)}
                </p>
                <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>1ª parcela total (SAC + seguros)</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Financiamento máx. (SAC)', value: formatCurrency(b.max_financing_sac) },
                { label: 'Parcela base (SAC)', value: formatCurrency(b.first_installment_sac) },
                { label: 'Seguros MIP + DFI', value: formatCurrency(b.mip_monthly + b.dfi_monthly) },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: '0 0 2px' }}>{item.label}</p>
                  <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 12, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>Comprometimento de renda (parcela + seguros)</span>
                <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 11, fontWeight: 600, color: commitmentColor }}>
                  {b.income_commitment_pct.toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--domus-ink-100)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (b.income_commitment_pct / 30) * 100)}%`, background: commitmentColor, borderRadius: 3 }} />
              </div>
            </div>

            {b.notes.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {b.notes.map(n => (
                  <p key={n} style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0, display: 'flex', gap: 6, alignItems: 'flex-start', lineHeight: 1.4 }}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--domus-text-muted)' }} /> {n}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  created: <User size={12} />,
  status_changed: <ClipboardList size={12} />,
  broker_assigned: <User size={12} />,
  follow_up_set: <CalendarCheck size={12} />,
  follow_up_done_changed: <CheckCircle2 size={12} />,
  note_added: <FileText size={12} />,
  credit_analyzed: <BrainCircuit size={12} />,
  property_matched: <Building2 size={12} />,
}

export function LeadModal({ lead, onClose, onUpdate }: Props) {
  const { role, primaryColor, companyName } = useCompany()
  const isAdmin = role === 'admin' || role === 'super_admin'
  const [tab, setTab] = useState<Tab>('profile')
  const [analyzing, setAnalyzing] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Timeline state
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [evLoading, setEvLoading] = useState(false)

  // Property matching state
  const [matchedProps, setMatchedProps] = useState<Property[]>([])
  const [matchLoading, setMatchLoading] = useState(false)

  // Broker assignment
  const [teamMembers, setTeamMembers] = useState<CompanyUser[]>([])
  const [saving, setSaving] = useState(false)

  // Follow-up local state
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [savingFollowUp, setSavingFollowUp] = useState(false)
  const [followUpError, setFollowUpError] = useState('')
  const [togglingFollowUpId, setTogglingFollowUpId] = useState<string | null>(null)
  const [deleteFollowUp, setDeleteFollowUp] = useState<LeadFollowUp | null>(null)

  const followUps = lead.follow_ups ?? []
  const pendingFollowUps = followUps.filter(f => !f.done).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  const doneFollowUps = followUps.filter(f => f.done).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
  const sortedFollowUps = [...pendingFollowUps, ...doneFollowUps]
  const nextFollowUp = pendingFollowUps[0] ?? null

  const loadEvents = useCallback(() => {
    setEvLoading(true)
    fetch(`/api/leads/${lead.id}/events`)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents(d.events ?? []))
      .finally(() => setEvLoading(false))
  }, [lead.id])

  useEffect(() => {
    if (tab !== 'followup') return
    loadEvents()
  }, [tab, loadEvents])

  // Load matching properties when tab opens (API derives company from session)
  useEffect(() => {
    if (tab !== 'matching') return
    setMatchLoading(true)
    fetch('/api/properties')
      .then(r => r.ok ? r.json() : { properties: [] })
      .then(d => {
        const props: Property[] = d.properties ?? []
        const budget = lead.property_value
        const region = lead.region?.toLowerCase()
        const matched = props.filter(p => {
          if (p.status !== 'available' && p.status !== 'reserved') return false
          const withinBudget = !p.value || p.value <= budget * 1.15
          const sameRegion = !region || !p.region || p.region.toLowerCase().includes(region) || region.includes(p.region.toLowerCase())
          return withinBudget || sameRegion
        }).slice(0, 8)
        setMatchedProps(matched)
      })
      .finally(() => setMatchLoading(false))
  }, [tab, lead.property_value, lead.region])

  // Load team members once
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => setTeamMembers(d.users ?? []))
      .catch(() => { })
  }, [])

  const patchLead = async (fields: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const { lead: updated } = await res.json()
      onUpdate({ ...lead, ...updated })
      return true
    }
    const err = await res.json().catch(() => ({}))
    console.error('[patchLead] erro', res.status, err)
    return false
  }

  const handleBrokerChange = async (brokerId: string | null) => {
    setSaving(true)
    await patchLead({ broker_id: brokerId || null })
    setSaving(false)
  }

  const reloadLead = async () => {
    const res = await fetch('/api/leads')
    if (!res.ok) return
    const { leads } = await res.json()
    const updated = (leads as Lead[]).find(l => l.id === lead.id)
    if (updated) onUpdate(updated)
  }

  const handleAddFollowUp = async () => {
    if (!followUpDate) return
    setFollowUpError('')
    setSavingFollowUp(true)
    const res = await fetch(`/api/leads/${lead.id}/follow-ups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: followUpDate, note: followUpNote || null }),
    })
    setSavingFollowUp(false)
    if (res.ok) {
      setFollowUpDate('')
      setFollowUpNote('')
      await reloadLead()
      loadEvents()
    } else {
      setFollowUpError('Erro ao salvar. Verifique o console (F12).')
    }
  }

  const handleToggleFollowUpDone = async (followUp: LeadFollowUp) => {
    setTogglingFollowUpId(followUp.id)
    const res = await fetch(`/api/leads/${lead.id}/follow-ups/${followUp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !followUp.done }),
    })
    setTogglingFollowUpId(null)
    if (res.ok) {
      await reloadLead()
      loadEvents()
    }
  }

  const handleDeleteFollowUp = async () => {
    if (!deleteFollowUp) return
    const target = deleteFollowUp
    setDeleteFollowUp(null)
    const res = await fetch(`/api/leads/${lead.id}/follow-ups/${target.id}`, { method: 'DELETE' })
    if (res.ok) {
      await reloadLead()
      loadEvents()
    }
  }

  const handleDownloadPDF = async () => {
    setExporting(true)
    try {
      const { downloadLeadPDF } = await import('@/lib/pdf-export')
      await downloadLeadPDF(lead, { companyName, primaryColor })
    } finally {
      setExporting(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          income: lead.income,
          work_regime: lead.work_regime,
          birth_date: lead.birth_date,
          property_value: lead.property_value,
          fgts: lead.fgts,
          down_payment: lead.down_payment,
          spouse_income: lead.spouse?.income ?? 0,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('[runAnalysis] API error:', data)
        return
      }

      onUpdate({
        ...lead,
        status: data.can_finance ? 'Crédito Pré-Aprovado' : 'Recusado',
        credit_score: data.score,
        max_financing_sac: data.max_financing_sac,
        max_financing_price: data.max_financing_price,
      })
      setTab('credit')
    } finally {
      setAnalyzing(false)
    }
  }

  const { label: statusLabel, cls: statusCls } = statusConfig[lead.status]

  const waMessage = `Olá ${lead.name.split(' ')[0]}, tudo bem? Sou corretor da Renovar Imóveis e recebi sua simulação de crédito. ${lead.credit_score ? `Sua análise está concluída — score ${lead.credit_score}, capacidade de financiamento de ${formatCurrency(lead.max_financing_sac ?? 0)} (SAC). ` : ''}Podemos conversar sobre as melhores opções para você?`

  return (
    <AnimatePresence>
      {/* Backdrop — click outside to close */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(8, 32, 24, 0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 1000,
        }}
      />

      {/* Centered floating modal */}
      <motion.aside
        key="modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0.1, 1] }}
        transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: 'min(680px, calc(100vw - 48px))',
          maxHeight: 'calc(100vh - 64px)',
          background: 'var(--domus-white)',
          border: '1px solid rgba(20, 36, 28, 0.08)',
          borderRadius: 'var(--domus-radius-lg)',
          boxShadow: '0 32px 80px rgba(8,32,24,0.28), 0 0 0 1px rgba(8,32,24,0.06)',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--domus-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="domus-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>Ficha do Lead</p>
              <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 18, fontWeight: 500, margin: 0 }}>
                {lead.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span className={cn('domus-badge', statusCls)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {statusLabel}
                </span>
                <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>
                  Entrada: {formatDate(lead.created_at)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32,
                border: '1px solid var(--domus-border)',
                borderRadius: 'var(--domus-radius-sm)',
                background: 'var(--domus-white)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--domus-text-muted)',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="domus-btn domus-btn--primary domus-btn--sm"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <BrainCircuit size={14} />
              {analyzing ? 'Analisando...' : 'Executar Análise de Crédito'}
            </button>
            <a
              href={whatsappLink(lead.whatsapp, waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="domus-btn domus-btn--secondary domus-btn--sm"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="domus-btn domus-btn--secondary domus-btn--sm"
            >
              <FileDown size={14} />
              {exporting ? 'Gerando...' : 'PDF'}
            </button>
            {lead.pdf_url && (
              <a
                href={lead.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="domus-btn domus-btn--secondary domus-btn--sm"
              >
                <Download size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Broker assignment */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--domus-text-muted)', flexShrink: 0 }}>Corretor:</span>
          {isAdmin ? (
            <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
              <select
                value={lead.broker_id ?? ''}
                onChange={e => handleBrokerChange(e.target.value || null)}
                disabled={saving}
                style={{
                  width: '100%', fontSize: 12, padding: '5px 28px 5px 10px',
                  border: '1px solid var(--domus-border)', borderRadius: 6,
                  background: 'var(--domus-white)', color: 'var(--domus-text)',
                  appearance: 'none', cursor: 'pointer',
                }}
              >
                <option value="">Sem corretor</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.email}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--domus-text-muted)' }} />
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--domus-text)' }}>
              {teamMembers.find(m => m.id === lead.broker_id)?.name
                ?? teamMembers.find(m => m.id === lead.broker_id)?.email
                ?? 'Sem corretor'}
            </span>
          )}

          {/* Follow-up badge — mostra o próximo follow-up pendente */}
          {nextFollowUp && (
            <span style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 99, flexShrink: 0,
              background: followUpStatus(nextFollowUp.date) !== 'upcoming' ? 'var(--domus-danger-bg)' : 'var(--domus-warning-bg)',
              color: followUpStatus(nextFollowUp.date) !== 'upcoming' ? 'var(--domus-danger)' : 'var(--domus-warning)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Clock size={9} />
              {formatDateOnly(nextFollowUp.date)}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--domus-border)', flexShrink: 0, padding: '0 24px', overflowX: 'auto' }}>
          {([
            { key: 'profile', label: 'Cadastro', icon: User },
            { key: 'documents', label: 'Documentos', icon: FileText },
            { key: 'credit', label: 'Crédito', icon: CreditCard },
            { key: 'matching', label: 'Imóveis', icon: Building2 },
            { key: 'followup', label: 'Follow-up', icon: CalendarCheck },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 0',
                marginRight: 24,
                fontSize: 13,
                fontWeight: tab === key ? 500 : 400,
                color: tab === key ? 'var(--domus-brand)' : 'var(--domus-text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === key ? 'var(--domus-brand)' : 'transparent'}`,
                transition: 'color 140ms, border-color 140ms',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content — single motion.div with key={tab} avoids AnimatePresence empty-key bug */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'profile' && (
                <>
                  <section style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 8 }}>
                      Identificação
                    </p>
                    <DataRow label="CPF" value={lead.cpf} />
                    <DataRow label="RG" value={`${lead.rg} ${lead.rg_organ ? `(${lead.rg_organ})` : ''}`} />
                    <DataRow label="Nascimento" value={formatDate(lead.birth_date)} />
                    <DataRow label="E-mail" value={lead.email} />
                    <DataRow label="WhatsApp" value={lead.whatsapp} />
                  </section>

                  <section style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 8 }}>
                      Perfil financeiro
                    </p>
                    <DataRow label="Estado civil" value={lead.marital_status} />
                    <DataRow label="Regime" value={lead.work_regime} />
                    <DataRow label="Renda mensal" value={formatCurrency(lead.income)} />
                  </section>

                  {lead.spouse && (
                    <section style={{ marginBottom: 24 }}>
                      <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 8 }}>
                        Cônjuge
                      </p>
                      <DataRow label="Nome" value={lead.spouse.name} />
                      <DataRow label="CPF" value={lead.spouse.cpf} />
                      <DataRow label="Renda" value={formatCurrency(lead.spouse.income)} />
                      <DataRow label="Renda combinada" value={formatCurrency(lead.income + lead.spouse.income)} />
                    </section>
                  )}

                  <section style={{ marginBottom: 24 }}>
                    <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 8 }}>
                      Intenção de compra
                    </p>
                    <DataRow label="Valor do imóvel" value={formatCurrency(lead.property_value)} />
                    <DataRow label="Região" value={lead.region} />
                    <DataRow label="FGTS" value={lead.fgts ? formatCurrency(lead.fgts) : '—'} />
                    <DataRow label="Entrada" value={lead.down_payment ? formatCurrency(lead.down_payment) : '—'} />
                  </section>

                </>
              )}

              {tab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {lead.documents && lead.documents.length > 0 ? (
                    lead.documents.map(doc => (
                      <div
                        key={doc.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px',
                          border: '1px solid var(--domus-border)',
                          borderRadius: 'var(--domus-radius-md)',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div
                            style={{
                              width: 36, height: 36, borderRadius: 'var(--domus-radius-sm)',
                              background: 'var(--domus-surface)',
                              border: '1px solid var(--domus-border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={16} style={{ color: 'var(--domus-brand)' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.file_name}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
                              {DOC_LABELS[doc.type] ?? doc.type}
                            </p>
                          </div>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="domus-btn domus-btn--secondary domus-btn--sm"
                          style={{ flexShrink: 0 }}
                        >
                          <Download size={13} />
                          Baixar
                        </a>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: 40, textAlign: 'center',
                        border: '1px dashed var(--domus-border)',
                        borderRadius: 'var(--domus-radius-md)',
                      }}
                    >
                      <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.35, color: 'var(--domus-text-muted)' }} />
                      <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', margin: 0 }}>
                        Nenhum documento enviado pelo lead
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'credit' && (
                <>
                  {lead.credit_score !== null ? (() => {
                    const credit = deriveCredit(lead)
                    const factors = getScoreFactors(lead)
                    const totalIncome = lead.income + (lead.spouse?.income ?? 0)
                    const maxInstallment = totalIncome * 0.30
                    const RATE = 0.0762 / 12
                    const age = new Date().getFullYear() - new Date(lead.birth_date || '1990-01-01').getFullYear()
                    const termMonths = Math.min(360, (80 - age) * 12)
                    const sacFirstInstallment = lead.property_value > 0
                      ? lead.property_value / termMonths + lead.property_value * RATE
                      : 0
                    const installmentGap = maxInstallment - sacFirstInstallment
                    const approved = credit.can_finance

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Decision banner */}
                        <div style={{
                          padding: '14px 18px',
                          borderRadius: 'var(--domus-radius-md)',
                          background: approved ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          border: `1px solid ${approved ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                        }}>
                          {approved
                            ? <CheckCircle2 size={18} style={{ color: 'var(--domus-success)', flexShrink: 0, marginTop: 1 }} />
                            : <XCircle size={18} style={{ color: 'var(--domus-danger)', flexShrink: 0, marginTop: 1 }} />
                          }
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: approved ? 'var(--domus-success)' : 'var(--domus-danger)' }}>
                              {approved ? 'Crédito pré-aprovado' : 'Crédito recusado'}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--domus-text-secondary)', margin: '3px 0 0', lineHeight: 1.5 }}>
                              {approved
                                ? `Score ${lead.credit_score} — perfil compatível com financiamento SFH. Capacidade máxima de ${formatCurrency(lead.max_financing_sac ?? 0)} pelo sistema SAC.`
                                : credit.restrictions.length > 0
                                  ? credit.restrictions[0]
                                  : `Score ${lead.credit_score} abaixo do mínimo exigido pelos bancos (400 pontos).`
                              }
                            </p>
                          </div>
                        </div>

                        {/* Score */}
                        <section>
                          <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 12 }}>
                            Score de crédito
                          </p>
                          <CreditMeter score={lead.credit_score} />
                        </section>

                        {/* Score factors */}
                        <section>
                          <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 10 }}>
                            Composição do score (base 600)
                          </p>
                          <div style={{ border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-md)', overflow: 'hidden' }}>
                            {factors.map((f, i) => (
                              <div key={f.label} style={{
                                display: 'grid', gridTemplateColumns: '1fr auto',
                                padding: '10px 14px', gap: 12, alignItems: 'center',
                                borderTop: i > 0 ? '1px solid var(--domus-border)' : undefined,
                                background: i % 2 === 0 ? 'transparent' : 'var(--domus-surface)',
                              }}>
                                <div>
                                  <p style={{ fontSize: 12, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>{f.label}</p>
                                  <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>{f.detail}</p>
                                </div>
                                <span style={{
                                  fontFamily: 'var(--domus-font-mono)', fontSize: 12, fontWeight: 600,
                                  color: f.delta > 0 ? 'var(--domus-success)' : f.delta < 0 ? 'var(--domus-danger)' : 'var(--domus-text-muted)',
                                  minWidth: 44, textAlign: 'right',
                                }}>
                                  {f.delta > 0 ? `+${f.delta}` : f.delta === 0 ? '±0' : f.delta}
                                </span>
                              </div>
                            ))}
                            <div style={{
                              display: 'grid', gridTemplateColumns: '1fr auto',
                              padding: '10px 14px', borderTop: '1px solid var(--domus-border)',
                              background: 'var(--domus-surface)',
                            }}>
                              <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: 'var(--domus-text)' }}>Score final</p>
                              <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--domus-text)' }}>
                                {lead.credit_score}
                              </span>
                            </div>
                          </div>
                        </section>

                        {/* Restrictions */}
                        {credit.restrictions.length > 0 && (
                          <section>
                            <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 10 }}>
                              Restrições identificadas
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {credit.restrictions.map(r => (
                                <div key={r} style={{
                                  display: 'flex', gap: 10, alignItems: 'flex-start',
                                  padding: '10px 14px',
                                  background: 'rgba(239,68,68,0.06)',
                                  border: '1px solid rgba(239,68,68,0.2)',
                                  borderRadius: 'var(--domus-radius-md)',
                                }}>
                                  <AlertTriangle size={14} style={{ color: 'var(--domus-danger)', flexShrink: 0, marginTop: 1 }} />
                                  <p style={{ fontSize: 12, color: 'var(--domus-text)', margin: 0, lineHeight: 1.5 }}>{r}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        )}

                        {/* Income commitment */}
                        <section>
                          <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 10 }}>
                            Comprometimento de renda — regra SFH (máx. 30%)
                          </p>
                          <div style={{ border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-md)', overflow: 'hidden' }}>
                            {([
                              { label: 'Renda bruta mensal', value: formatCurrency(totalIncome), sub: lead.spouse ? `Titular ${formatCurrency(lead.income)} + cônjuge ${formatCurrency(lead.spouse.income)}` : undefined, color: 'var(--domus-text)' },
                              { label: 'Teto de parcela (30%)', value: formatCurrency(maxInstallment), sub: 'Limite máximo pelo SFH', color: 'var(--domus-success)' },
                              { label: '1ª parcela SAC estimada', value: formatCurrency(sacFirstInstallment), sub: `Para o imóvel de ${formatCurrency(lead.property_value)} em ${termMonths} meses`, color: installmentGap >= 0 ? 'var(--domus-text)' : 'var(--domus-danger)' },
                              { label: installmentGap >= 0 ? 'Folga mensal' : 'Déficit mensal', value: formatCurrency(Math.abs(installmentGap)), sub: installmentGap >= 0 ? 'Margem disponível após a parcela' : 'Parcela supera o teto permitido pelo SFH', color: installmentGap >= 0 ? 'var(--domus-success)' : 'var(--domus-danger)' },
                            ] as { label: string; value: string; sub?: string; color: string }[]).map((row, i) => (
                              <div key={row.label} style={{
                                display: 'grid', gridTemplateColumns: '1fr auto',
                                padding: '10px 14px', gap: 12, alignItems: 'center',
                                borderTop: i > 0 ? '1px solid var(--domus-border)' : undefined,
                                background: i % 2 === 0 ? 'transparent' : 'var(--domus-surface)',
                              }}>
                                <div>
                                  <p style={{ fontSize: 12, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>{row.label}</p>
                                  {row.sub && <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>{row.sub}</p>}
                                </div>
                                <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 13, fontWeight: 600, color: row.color }}>
                                  {row.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Financing table */}
                        <section>
                          <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 12 }}>
                            Capacidade máxima de financiamento
                          </p>
                          {lead.max_financing_sac && lead.max_financing_price && (
                            <FinancingTable sac={lead.max_financing_sac} price={lead.max_financing_price} />
                          )}
                        </section>

                        {/* Multibank comparator */}
                        <section>
                          <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 4 }}>
                            Comparativo entre bancos parceiros
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                            Simulação com taxas, LTV e regras de cada instituição — já considerando seguros MIP e DFI somados à parcela e ao teto de 30% da renda.
                          </p>
                          <BankComparisonGrid banks={deriveBankComparison(lead)} />
                        </section>

                      </div>
                    )
                  })() : (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <BrainCircuit size={32} style={{ color: 'var(--domus-ink-200)', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 14, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>
                        Análise de crédito ainda não executada
                      </p>
                      <button
                        onClick={runAnalysis}
                        disabled={analyzing}
                        className="domus-btn domus-btn--primary"
                      >
                        <BrainCircuit size={16} />
                        {analyzing ? 'Analisando...' : 'Executar Análise Inteligente'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {tab === 'matching' && (
                <div>
                  <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 12 }}>
                    Imóveis compatíveis com este lead
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      { icon: MapPin, label: `Região: ${lead.region || 'Qualquer'}` },
                      { icon: Building2, label: `Até ${formatCurrency(lead.property_value * 1.15)}` },
                    ].map(({ icon: Icon, label }) => (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'var(--domus-green-50)', fontSize: 11, color: 'var(--domus-brand)' }}>
                        <Icon size={10} /> {label}
                      </span>
                    ))}
                  </div>

                  {matchLoading ? (
                    <div style={{ padding: '32px 0', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Buscando imóveis...</span>
                    </div>
                  ) : matchedProps.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', border: '1px dashed var(--domus-border)', borderRadius: 8 }}>
                      <Building2 size={24} style={{ color: 'var(--domus-text-muted)', opacity: 0.3, margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhum imóvel disponível compatível</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {matchedProps.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--domus-border)', borderRadius: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--domus-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 size={16} style={{ color: 'var(--domus-success)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
                              {p.region ?? '—'} · {p.bedrooms}q · {p.area_m2 ? `${p.area_m2}m²` : '—'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, color: 'var(--domus-brand)', margin: 0 }}>
                              {p.value ? formatCurrency(p.value) : '—'}
                            </p>
                            <span style={{
                              fontSize: 10, padding: '2px 6px', borderRadius: 99,
                              background: p.status === 'available' ? 'var(--domus-success-bg)' : 'var(--domus-warning-bg)',
                              color: p.status === 'available' ? 'var(--domus-success)' : 'var(--domus-warning)',
                            }}>
                              {p.status === 'available' ? 'Disponível' : 'Reservado'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'followup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Agendar novo follow-up */}
                  <section>
                    <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 10 }}>
                      Agendar follow-up
                    </p>
                    <div style={{ border: '1px solid var(--domus-border)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <label style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Data</label>
                          <input
                            type="date"
                            value={followUpDate}
                            onChange={e => setFollowUpDate(e.target.value)}
                            className="domus-input"
                            style={{ fontSize: 12, padding: '7px 10px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <label style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Observação</label>
                          <input
                            type="text"
                            placeholder="O que fazer nessa data?"
                            value={followUpNote}
                            onChange={e => setFollowUpNote(e.target.value)}
                            className="domus-input"
                            style={{ fontSize: 12, padding: '7px 10px' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleAddFollowUp}
                          disabled={savingFollowUp || !followUpDate}
                          className="domus-btn domus-btn--secondary domus-btn--sm"
                        >
                          <Plus size={12} />
                          {savingFollowUp ? 'Adicionando...' : 'Adicionar follow-up'}
                        </button>
                      </div>
                      {followUpError && (
                        <p style={{ fontSize: 11, color: 'var(--domus-danger)', margin: 0 }}>{followUpError}</p>
                      )}
                    </div>
                  </section>

                  {/* Lista de follow-ups agendados */}
                  <section>
                    <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 10 }}>
                      Follow-ups agendados
                    </p>
                    {sortedFollowUps.length === 0 ? (
                      <div style={{ padding: '24px 0', textAlign: 'center', border: '1px dashed var(--domus-border)', borderRadius: 8 }}>
                        <CalendarCheck size={20} style={{ color: 'var(--domus-text-muted)', opacity: 0.3, margin: '0 auto 8px' }} />
                        <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhum follow-up agendado ainda</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sortedFollowUps.map(f => {
                          const status = followUpStatus(f.date)
                          const color = f.done
                            ? 'var(--domus-success)'
                            : status !== 'upcoming' ? 'var(--domus-danger)' : 'var(--domus-warning)'
                          const bg = f.done
                            ? 'var(--domus-success-bg)'
                            : status !== 'upcoming' ? 'var(--domus-danger-bg)' : 'var(--domus-warning-bg)'
                          return (
                            <div key={f.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              border: '1px solid var(--domus-border)', borderRadius: 8, padding: '10px 12px',
                            }}>
                              <span style={{
                                fontSize: 10, padding: '3px 8px', borderRadius: 99, flexShrink: 0,
                                background: bg, color, display: 'flex', alignItems: 'center', gap: 4,
                              }}>
                                {f.done ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                {formatDateOnly(f.date)}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {f.note ? (
                                  <p style={{ fontSize: 12, color: 'var(--domus-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.note}
                                  </p>
                                ) : (
                                  <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Sem observação</p>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button
                                  onClick={() => handleToggleFollowUpDone(f)}
                                  disabled={togglingFollowUpId === f.id}
                                  className="domus-btn domus-btn--secondary domus-btn--sm"
                                  title={f.done ? 'Reabrir' : 'Marcar como realizado'}
                                >
                                  {f.done ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
                                  {f.done ? 'Reabrir' : 'Concluir'}
                                </button>
                                <button
                                  onClick={() => setDeleteFollowUp(f)}
                                  className="domus-btn domus-btn--secondary domus-btn--sm"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  {/* History — automatic events only */}
                  <section>
                    <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', marginBottom: 12 }}>
                      Histórico de atividades
                    </p>
                    {evLoading ? (
                      <div style={{ padding: '24px 0', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
                      </div>
                    ) : events.length === 0 ? (
                      <div style={{ padding: '32px 0', textAlign: 'center', border: '1px dashed var(--domus-border)', borderRadius: 8 }}>
                        <Clock size={24} style={{ color: 'var(--domus-text-muted)', opacity: 0.3, margin: '0 auto 8px' }} />
                        <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhuma atividade registrada ainda</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {events.map((ev, i) => (
                          <div key={ev.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
                            {i < events.length - 1 && (
                              <div style={{ position: 'absolute', left: 15, top: 28, bottom: 0, width: 1, background: 'var(--domus-border)' }} />
                            )}
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              background: 'var(--domus-green-50)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--domus-brand)', zIndex: 1,
                            }}>
                              {EVENT_ICONS[ev.event_type] ?? <ClipboardList size={12} />}
                            </div>
                            <div style={{ flex: 1, paddingTop: 5 }}>
                              <p style={{ fontSize: 13, color: 'var(--domus-text)', margin: '0 0 2px', lineHeight: 1.4 }}>
                                {ev.note ?? ev.event_type}
                              </p>
                              <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: 0 }}>
                                {new Date(ev.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>

      <ConfirmDialog
        open={!!deleteFollowUp}
        title="Excluir follow-up"
        message={deleteFollowUp ? `Remover o follow-up agendado para ${formatDateOnly(deleteFollowUp.date)}?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleDeleteFollowUp}
        onCancel={() => setDeleteFollowUp(null)}
      />
    </AnimatePresence>
  )
}
