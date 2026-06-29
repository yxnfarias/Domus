'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Lead, Property } from '@/lib/types'
import { Download, TrendingUp, Building2, Users, CheckCircle, ArrowRight, FileSpreadsheet } from 'lucide-react'
import { useCompany } from '@/lib/company-context'

interface BrokerSale {
  broker_id: string
  name: string
  count: number
  revenue: number
}

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_LONG  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`
  return String(v)
}

// ─── Vertical Bar Chart ───────────────────────────────────────────────────────
function VBarChart({ bars, fmtVal }: { bars: { label: string; value: number }[]; fmtVal?: (v: number) => string }) {
  const max = Math.max(...bars.map(b => b.value), 1)
  const CHART_H = 110
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: CHART_H + 36 }}>
      {bars.map((b, i) => {
        const h = b.value > 0 ? Math.max(Math.round((b.value / max) * CHART_H), 4) : 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {b.value > 0 ? (
              <span style={{ fontSize: 8, color: 'var(--domus-text-muted)', fontFamily: 'var(--domus-font-mono)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {fmtVal ? fmtVal(b.value) : b.value}
              </span>
            ) : <span style={{ fontSize: 8 }}>&nbsp;</span>}
            <div style={{ width: '100%', height: h || 2, background: b.value > 0 ? 'var(--domus-brand)' : 'var(--domus-ink-100)', borderRadius: '4px 4px 0 0' }} />
            <span style={{ fontSize: 9, color: 'var(--domus-text-muted)', fontFamily: 'var(--domus-font-mono)' }}>{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────
function HBarChart({ items, color = 'var(--domus-brand)' }: { items: { label: string; value: number; sub?: string }[]; color?: string }) {
  const max = Math.max(...items.map(i => i.value), 1)
  if (items.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', textAlign: 'center', padding: '24px 0', margin: 0 }}>Sem dados no período</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--domus-text)' }}>{item.label}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--domus-font-mono)', color: 'var(--domus-text-muted)' }}>
              {item.sub !== undefined ? item.sub : item.value}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--domus-ink-100)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max((item.value / max) * 100, item.value > 0 ? 3 : 0)}%`, background: color, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const cx = 56, cy = 56, r = 40, strokeW = 13
  const circ = 2 * Math.PI * r
  let accumulated = 0

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <svg width="112" height="112" viewBox="0 0 112 112" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4DED1" strokeWidth={strokeW} />
        {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
          const len = (seg.value / total) * circ
          const rot = -90 + (accumulated / circ) * 360
          accumulated += len
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={strokeW}
              strokeDasharray={`${len} ${circ - len}`}
              style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px` }}
            />
          )
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 18, fontWeight: 700, fontFamily: 'sans-serif', fill: '#14241C' }}>
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          style={{ fontSize: 7, fontFamily: 'monospace', letterSpacing: '0.1em', fill: '#5A6660' }}>
          LEADS
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minWidth: 0 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--domus-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--domus-font-mono)', color: 'var(--domus-text-muted)', flexShrink: 0 }}>
              {s.value}{total > 0 ? ` (${Math.round((s.value / total) * 100)}%)` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Conversion Funnel ────────────────────────────────────────────────────────
function FunnelChart({ stages }: { stages: { label: string; count: number; color: string; pct?: number }[] }) {
  const max = Math.max(...stages.map(s => s.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {stages.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 120, fontSize: 11, color: 'var(--domus-text-muted)', textAlign: 'right', flexShrink: 0 }}>{s.label}</div>
          <div style={{ flex: 1, position: 'relative', height: 28, background: 'var(--domus-ink-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${Math.max((s.count / max) * 100, s.count > 0 ? 3 : 0)}%`,
              background: s.color, borderRadius: 4,
              transition: 'width 0.5s var(--domus-ease-standard)',
            }} />
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 11, fontFamily: 'var(--domus-font-mono)', fontWeight: 600,
              color: s.count > 0 ? '#fff' : 'var(--domus-text-muted)',
              mixBlendMode: 'screen',
            }}>
              {s.count}
            </span>
          </div>
          <div style={{ width: 44, textAlign: 'right', fontSize: 11, fontFamily: 'var(--domus-font-mono)', color: 'var(--domus-text-muted)', flexShrink: 0 }}>
            {s.pct !== undefined ? `${s.pct}%` : ''}
          </div>
          <ArrowRight size={11} style={{ color: 'var(--domus-ink-200)', flexShrink: 0, visibility: i < stages.length - 1 ? 'visible' : 'hidden' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { companyId: COMPANY_ID, role, primaryColor } = useCompany()
  const isAdmin = role === 'admin' || role === 'super_admin'
  const now = new Date()
  const [leads, setLeads]           = useState<Lead[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [teamSales, setTeamSales]     = useState<BrokerSale[]>([])
  const [memberNames, setMemberNames] = useState<Map<string, string>>(new Map())
  const [companyName, setCompanyName] = useState<string>('Domus')
  const [selMonth, setSelMonth]     = useState(now.getMonth())
  const [selYear, setSelYear]       = useState(now.getFullYear())
  const [exporting, setExporting]   = useState(false)
  const [dealStats, setDealStats]   = useState({ active: 0, closed: 0, lost: 0 })

  const fetchData = useCallback(async () => {
    if (!COMPANY_ID) { setLoading(false); return }
    setLoading(true)
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/leads'),
        fetch('/api/properties'),
        fetch('/api/users'),
        fetch('/api/me'),
      ]
      if (isAdmin) requests.push(fetch('/api/reports/team-sales'))

      const [lr, pr, ur, mr, sr] = await Promise.all(requests)
      if (lr.ok) { const { leads: d }      = await lr.json(); setLeads(d ?? []) }
      if (pr.ok) { const { properties: d } = await pr.json(); setProperties(d ?? []) }
      if (ur.ok) {
        const { users: members } = await ur.json()
        setMemberNames(new Map((members ?? []).map((m: { id: string; name?: string; email: string }) => [m.id, m.name || m.email])))
      }
      if (mr.ok) { const me = await mr.json(); if (me.company_name) setCompanyName(me.company_name) }
      if (sr?.ok) { const { ranking } = await sr.json(); setTeamSales(ranking ?? []) }
      fetch('/api/deals').then(r => r.ok ? r.json() : null).then(d => {
        if (!d?.deals) return
        const ds = d.deals as { stage: string; closed_at: string | null }[]
        setDealStats({
          active: ds.filter(x => x.stage !== 'closed' && x.stage !== 'lost').length,
          closed: ds.filter(x => x.stage === 'closed').length,
          lost:   ds.filter(x => x.stage === 'lost').length,
        })
      }).catch(() => {})
    } finally { setLoading(false) }
  }, [COMPANY_ID, isAdmin])

  useEffect(() => { if (COMPANY_ID) fetchData() }, [COMPANY_ID, fetchData])

  // ── Period filter ──────────────────────────────────────────────────────────
  const soldInPeriod = properties.filter(p => {
    if (p.status !== 'sold' || !p.sold_at) return false
    const d = new Date(p.sold_at)
    if (selMonth === -1) return d.getFullYear() === selYear
    return d.getFullYear() === selYear && d.getMonth() === selMonth
  })

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const revenue      = soldInPeriod.reduce((s, p) => s + (p.value ?? 0), 0)
  const avgTicket    = soldInPeriod.length > 0 ? revenue / soldInPeriod.length : 0
  const approvalRate = leads.length > 0
    ? (leads.filter(l => l.status === 'Crédito Pré-Aprovado').length / leads.length) * 100
    : 0

  // ── 6-month trend (always last 6 months for context) ──────────────────────
  const monthBars = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const y = d.getFullYear(), m = d.getMonth()
    const rev = properties
      .filter(p => p.status === 'sold' && p.sold_at)
      .filter(p => { const pd = new Date(p.sold_at!); return pd.getFullYear() === y && pd.getMonth() === m })
      .reduce((s, p) => s + (p.value ?? 0), 0)
    return { label: MONTHS_SHORT[m], value: rev }
  })

  // ── Lead regions ──────────────────────────────────────────────────────────
  const leadRegionMap: Record<string, number> = {}
  leads.forEach(l => { if (l.region) leadRegionMap[l.region] = (leadRegionMap[l.region] ?? 0) + 1 })
  const leadRegions = Object.entries(leadRegionMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([label, value]) => ({ label, value }))

  // ── Sold regions ──────────────────────────────────────────────────────────
  const soldRegionMap: Record<string, number> = {}
  soldInPeriod.forEach(p => { if (p.region) soldRegionMap[p.region] = (soldRegionMap[p.region] ?? 0) + 1 })
  const soldRegions = Object.entries(soldRegionMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([label, value]) => ({ label, value }))

  // ── Lead status donut ─────────────────────────────────────────────────────
  const statusSegments = [
    { label: 'Pré-Aprovado',  value: leads.filter(l => l.status === 'Crédito Pré-Aprovado').length, color: '#0F3D2E' },
    { label: 'Em Análise',    value: leads.filter(l => l.status === 'Em Análise').length,           color: '#C68A2E' },
    { label: 'Pendente',      value: leads.filter(l => l.status === 'Pendente').length,             color: '#98A19B' },
    { label: 'Recusado',      value: leads.filter(l => l.status === 'Recusado').length,             color: '#B23A2A' },
  ]

  const periodLabel = selMonth === -1
    ? String(selYear)
    : `${MONTHS_LONG[selMonth]} ${selYear}`

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, M = 18, CW = W - M * 2
      let y = 0
      const pageH = 297

      const hexToRgb = (hex: string | null): [number, number, number] => {
        const h = (hex ?? '#0F3D2E').replace('#', '')
        if (h.length !== 6) return [15, 61, 46]
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
      }
      const G  = hexToRgb(primaryColor)
      const GL: [number, number, number] = [
        Math.min(255, Math.round(G[0] * 2)),
        Math.min(255, Math.round(G[1] * 1.8)),
        Math.min(255, Math.round(G[2] * 1.8)),
      ]

      // ── Helpers ──────────────────────────────────────────────────────────
      const checkPage = (needed: number) => {
        if (y + needed > pageH - 16) {
          addFooter()
          doc.addPage()
          y = M
        }
      }

      const sectionTitle = (title: string) => {
        checkPage(14)
        doc.setFillColor(...G)
        doc.rect(M, y, 2.5, 7, 'F')
        doc.setTextColor(...G); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
        doc.text(title, M + 5, y + 5)
        y += 11
      }

      const tableHeader = (cols: { label: string; x: number; align?: 'left' | 'right' }[]) => {
        doc.setFillColor(232, 228, 218); doc.rect(M, y, CW, 7, 'F')
        doc.setTextColor(80, 90, 85); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
        cols.forEach(c => {
          if (c.align === 'right') doc.text(c.label, M + c.x, y + 4.7, { align: 'right' })
          else doc.text(c.label, M + c.x, y + 4.7)
        })
        y += 7
      }

      const tableRow = (cells: { text: string; x: number; align?: 'left' | 'right' }[], idx: number) => {
        checkPage(7)
        if (idx % 2 === 0) { doc.setFillColor(251, 249, 245); doc.rect(M, y, CW, 7, 'F') }
        doc.setDrawColor(225, 218, 206); doc.line(M, y + 7, M + CW, y + 7)
        doc.setTextColor(20, 36, 28); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
        cells.forEach(c => {
          if (c.align === 'right') doc.text(c.text, M + c.x, y + 4.7, { align: 'right' })
          else doc.text(c.text, M + c.x, y + 4.7)
        })
        y += 7
      }

      const addFooter = () => {
        doc.setFontSize(6.5); doc.setTextColor(180, 175, 168); doc.setFont('helvetica', 'normal')
        doc.text(`${companyName} · Relatório gerado por Domus em ${new Date().toLocaleDateString('pt-BR')}`, W / 2, pageH - 8, { align: 'center' })
        doc.setDrawColor(220, 215, 205); doc.line(M, pageH - 11, W - M, pageH - 11)
      }

      // ── HEADER ────────────────────────────────────────────────────────────
      // Dark green band
      doc.setFillColor(...G)
      doc.rect(0, 0, W, 36, 'F')
      // Subtle pattern strip
      doc.setFillColor(...GL)
      doc.rect(0, 28, W, 8, 'F')

      // Company name (large)
      doc.setTextColor(250, 247, 242)
      doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text(companyName, M, 15)

      // Subtitle
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.setTextColor(160, 200, 175)
      doc.text('Relatório Financeiro', M, 23)

      // Right side: period + date
      doc.setTextColor(250, 247, 242)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text(periodLabel, W - M, 15, { align: 'right' })
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
      doc.setTextColor(160, 200, 175)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, W - M, 23, { align: 'right' })

      // "Domus" watermark bottom-right of header
      doc.setFontSize(6); doc.setTextColor(40, 90, 65)
      doc.text('DOMUS', W - M, 32, { align: 'right' })

      y = 46

      // ── KPI CARDS ─────────────────────────────────────────────────────────
      const kpis = [
        { label: 'Imóveis Vendidos', value: String(soldInPeriod.length), accent: G },
        { label: 'Receita Bruta',    value: fmtBRL(revenue),             accent: G },
        { label: 'Ticket Médio',     value: avgTicket > 0 ? fmtBRL(avgTicket) : '—', accent: GL },
        { label: 'Taxa Pré-aprov.',  value: `${approvalRate.toFixed(1)}%`,            accent: GL },
      ]
      const kw = (CW - 9) / 4
      kpis.forEach((k, i) => {
        const bx = M + i * (kw + 3)
        doc.setFillColor(250, 248, 244); doc.setDrawColor(225, 218, 206)
        doc.roundedRect(bx, y, kw, 22, 2, 2, 'FD')
        // Accent top bar
        doc.setFillColor(...k.accent)
        doc.roundedRect(bx, y, kw, 2, 1, 1, 'F')
        doc.setTextColor(100, 112, 106); doc.setFontSize(6); doc.setFont('helvetica', 'normal')
        doc.text(k.label, bx + 3, y + 9)
        doc.setTextColor(...k.accent); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
        doc.text(k.value, bx + 3, y + 18)
      })
      y += 30

      // ── FUNIL DE CONVERSÃO ─────────────────────────────────────────────────
      sectionTitle('FUNIL DE CONVERSÃO')
      const funnelData = [
        { label: 'Total de leads',    count: leads.length,                                                           pct: '100%' },
        { label: 'Em análise',        count: leads.filter(l => l.status === 'Em Análise').length,                    pct: leads.length > 0 ? `${Math.round(leads.filter(l => l.status === 'Em Análise').length / leads.length * 100)}%` : '0%' },
        { label: 'Crédito pré-aprov.',count: leads.filter(l => l.status === 'Crédito Pré-Aprovado').length,          pct: leads.length > 0 ? `${Math.round(leads.filter(l => l.status === 'Crédito Pré-Aprovado').length / leads.length * 100)}%` : '0%' },
        { label: 'Imóveis vendidos',  count: properties.filter(p => p.status === 'sold').length,                     pct: '—' },
      ]
      tableHeader([{ label: 'ETAPA', x: 2 }, { label: 'QTDE', x: 100 }, { label: 'CONVERSÃO', x: 140 }])
      funnelData.forEach((r, idx) => {
        tableRow([{ text: r.label, x: 2 }, { text: String(r.count), x: 100 }, { text: r.pct, x: 140 }], idx)
      })
      y += 8

      // ── STATUS DOS LEADS ───────────────────────────────────────────────────
      checkPage(50)
      sectionTitle('STATUS DOS LEADS')
      const totalLeads = leads.length
      tableHeader([{ label: 'STATUS', x: 2 }, { label: 'QTD', x: 100 }, { label: '%', x: 140 }])
      statusSegments.forEach((s, idx) => {
        const pct = totalLeads > 0 ? `${Math.round((s.value / totalLeads) * 100)}%` : '0%'
        tableRow([{ text: s.label, x: 2 }, { text: String(s.value), x: 100 }, { text: pct, x: 140 }], idx)
      })
      y += 8

      // ── REGIÕES DE INTERESSE ───────────────────────────────────────────────
      if (leadRegions.length > 0) {
        checkPage(leadRegions.length * 7 + 20)
        sectionTitle('PRINCIPAIS REGIÕES DE INTERESSE')
        tableHeader([{ label: 'REGIÃO', x: 2 }, { label: 'LEADS', x: CW - 2, align: 'right' }])
        leadRegions.forEach((r, idx) => {
          tableRow([{ text: r.label, x: 2 }, { text: String(r.value), x: CW - 2, align: 'right' }], idx)
        })
        y += 8
      }

      // ── RECEITA POR MÊS ───────────────────────────────────────────────────
      checkPage(monthBars.filter(b => b.value > 0).length * 7 + 20)
      sectionTitle('RECEITA POR MÊS — ÚLTIMOS 6 MESES')
      tableHeader([{ label: 'MÊS', x: 2 }, { label: 'RECEITA', x: CW - 2, align: 'right' }])
      monthBars.forEach((b, idx) => {
        tableRow([{ text: b.label, x: 2 }, { text: b.value > 0 ? fmtBRL(b.value) : '—', x: CW - 2, align: 'right' }], idx)
      })
      y += 8

      // ── IMÓVEIS VENDIDOS ───────────────────────────────────────────────────
      if (soldInPeriod.length > 0) {
        checkPage(20)
        sectionTitle(`IMÓVEIS VENDIDOS — ${periodLabel.toUpperCase()}`)
        tableHeader([
          { label: 'TÍTULO', x: 2 }, { label: 'REGIÃO', x: 88 },
          { label: 'VALOR', x: 126 }, { label: 'DATA', x: 160 },
        ])
        soldInPeriod.slice(0, 50).forEach((p, idx) => {
          checkPage(7)
          const title = p.title.length > 40 ? p.title.slice(0, 38) + '…' : p.title
          tableRow([
            { text: title, x: 2 },
            { text: p.region ?? '—', x: 88 },
            { text: p.value ? fmtBRL(p.value) : '—', x: 126 },
            { text: p.sold_at ? new Date(p.sold_at).toLocaleDateString('pt-BR') : '—', x: 160 },
          ], idx)
        })
        // Subtotal row
        doc.setFillColor(232, 228, 218); doc.rect(M, y, CW, 8, 'F')
        doc.setTextColor(...G); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
        doc.text(`Total: ${soldInPeriod.length} venda${soldInPeriod.length !== 1 ? 's' : ''}`, M + 2, y + 5.2)
        doc.text(fmtBRL(revenue), M + CW - 2, y + 5.2, { align: 'right' })
        y += 16
      }

      // ── DESEMPENHO DA EQUIPE (admin only) ─────────────────────────────────
      if (isAdmin && teamSales.length > 0) {
        checkPage(20)
        sectionTitle('DESEMPENHO DE VENDAS — EQUIPE')
        tableHeader([
          { label: 'CORRETOR', x: 2 }, { label: 'VENDAS', x: 100 }, { label: 'RECEITA', x: CW - 2, align: 'right' },
        ])
        teamSales.forEach((b, idx) => {
          tableRow([
            { text: b.name.length > 40 ? b.name.slice(0, 38) + '…' : b.name, x: 2 },
            { text: String(b.count), x: 100 },
            { text: fmtBRL(b.revenue), x: CW - 2, align: 'right' },
          ], idx)
        })
        y += 8
      }

      // ── FOOTER (last page) ────────────────────────────────────────────────
      addFooter()

      doc.save(`relatorio-${companyName.toLowerCase().replace(/\s+/g, '-')}-${periodLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  // ── Conversion funnel ─────────────────────────────────────────────────────
  const total        = leads.length
  const inAnalysis   = leads.filter(l => l.status === 'Em Análise').length
  const preApproved  = leads.filter(l => l.status === 'Crédito Pré-Aprovado').length
  const soldCount    = properties.filter(p => p.status === 'sold').length

  const funnelStages = [
    { label: 'Entrada',     count: total,       color: 'var(--domus-brand)',   pct: 100 },
    { label: 'Em análise',  count: inAnalysis,  color: 'var(--domus-warning)', pct: total > 0 ? Math.round((inAnalysis  / total) * 100) : 0 },
    { label: 'Pré-aprovado',count: preApproved, color: 'var(--domus-success)', pct: total > 0 ? Math.round((preApproved / total) * 100) : 0 },
    { label: 'Vendas',      count: soldCount,   color: '#1E6B52',              pct: preApproved > 0 ? Math.round((soldCount / preApproved) * 100) : 0 },
  ]

  // ── Broker performance ────────────────────────────────────────────────────
  const brokerMap2: Record<string, { assigned: number; approved: number }> = {}
  leads.forEach(l => {
    if (!l.broker_id) return
    if (!brokerMap2[l.broker_id]) brokerMap2[l.broker_id] = { assigned: 0, approved: 0 }
    brokerMap2[l.broker_id].assigned++
    if (l.status === 'Crédito Pré-Aprovado') brokerMap2[l.broker_id].approved++
  })
  const brokerRows = Object.entries(brokerMap2)
    .sort((a, b) => b[1].approved - a[1].approved)
    .slice(0, 8)

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Nome', 'E-mail', 'WhatsApp', 'Status', 'Renda', 'Valor do Imóvel', 'Região', 'Score', 'Máx SAC', 'Máx PRICE', 'Entrada'],
      ...leads.map(l => [
        l.name, l.email, l.whatsapp, l.status,
        l.income, l.property_value, l.region ?? '',
        l.credit_score ?? '', l.max_financing_sac ?? '', l.max_financing_price ?? '',
        (l.down_payment ?? 0) + (l.fgts ?? 0),
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `leads-domus-${new Date().toISOString().slice(0,10)}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = [now.getFullYear() - 1, now.getFullYear()]

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Relatórios</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>Dashboard Financeiro</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={selMonth}
              onChange={e => setSelMonth(Number(e.target.value))}
              className="domus-input"
              style={{ height: 34, padding: '0 10px', fontSize: 12, cursor: 'pointer', width: 'auto' }}
            >
              <option value={-1}>Ano todo</option>
              {MONTHS_LONG.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={selYear}
              onChange={e => setSelYear(Number(e.target.value))}
              className="domus-input"
              style={{ height: 34, padding: '0 10px', fontSize: 12, cursor: 'pointer', width: 'auto' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={exportCSV}
              disabled={loading}
              className="domus-btn domus-btn--secondary domus-btn--sm"
            >
              <FileSpreadsheet size={13} />
              CSV
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting || loading}
              className="domus-btn domus-btn--primary domus-btn--sm"
            >
              <Download size={13} />
              {exporting ? 'Gerando...' : 'Exportar PDF'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Imóveis Vendidos',   value: loading ? '—' : String(soldInPeriod.length),               icon: Building2,   color: 'var(--domus-brand)' },
            { label: 'Receita Bruta',      value: loading ? '—' : fmtBRL(revenue),                           icon: TrendingUp,  color: 'var(--domus-brand)' },
            { label: 'Ticket Médio',       value: loading ? '—' : (avgTicket > 0 ? fmtBRL(avgTicket) : '—'), icon: TrendingUp,  color: 'var(--domus-success)' },
            { label: 'Taxa de Pré-aprov.', value: loading ? '—' : `${approvalRate.toFixed(1)}%`,             icon: CheckCircle, color: 'var(--domus-success)' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="domus-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--domus-green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 20, fontWeight: 500, margin: '0 0 4px', color: 'var(--domus-text)', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Receita por mês */}
          <div className="domus-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Receita por Mês
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>Últimos 6 meses · R$</p>
            <VBarChart bars={monthBars} fmtVal={fmtCompact} />
          </div>

          {/* Status dos leads */}
          <div className="domus-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Status dos Leads
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>Total de leads cadastrados</p>
            {loading
              ? <div style={{ height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
                </div>
              : <DonutChart segments={statusSegments} />
            }
          </div>

          {/* Regiões de interesse */}
          <div className="domus-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Regiões de Interesse
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>Onde os leads querem comprar</p>
            {loading
              ? <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
                </div>
              : <HBarChart items={leadRegions} />
            }
          </div>

          {/* Regiões mais vendidas */}
          <div className="domus-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Regiões mais Vendidas
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>{periodLabel}</p>
            {loading
              ? <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
                </div>
              : <HBarChart items={soldRegions} color="var(--domus-success)" />
            }
          </div>
        </div>

        {/* Conversion funnel + broker performance */}
        <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>

          {/* Funil de conversão */}
          <div className="domus-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Funil de Conversão
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>
              Jornada do lead até a venda
            </p>
            {loading
              ? <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
                </div>
              : <FunnelChart stages={funnelStages} />
            }
          </div>

          {/* Performance por corretor — visível somente para admin/super_admin */}
          {isAdmin && (
            <div className="domus-card" style={{ padding: '22px 24px' }}>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
                Performance por Corretor
              </p>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 16px' }}>
                Leads atribuídos × pré-aprovados
              </p>
              {loading ? (
                <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
                </div>
              ) : brokerRows.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', textAlign: 'center', padding: '24px 0', margin: 0 }}>
                  Nenhum lead atribuído a corretores ainda
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '6px 0', borderBottom: '1px solid var(--domus-border)', marginBottom: 4 }}>
                    {['Corretor', 'Leads', 'Aprovados'].map(h => (
                      <span key={h} style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--domus-text-muted)' }}>{h}</span>
                    ))}
                  </div>
                  {brokerRows.map(([brokerId, stats], i) => (
                    <div key={brokerId} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '8px 0', borderBottom: i < brokerRows.length - 1 ? '1px solid var(--domus-border)' : 'none', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--domus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {memberNames.get(brokerId) ?? brokerId.slice(0, 8)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--domus-text-muted)', fontFamily: 'var(--domus-font-mono)' }}>{stats.assigned}</span>
                      <span style={{ fontSize: 12, color: 'var(--domus-success)', fontFamily: 'var(--domus-font-mono)', fontWeight: 600 }}>{stats.approved}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Desempenho de vendas por corretor (admin only) ── */}
        {isAdmin && (
          <div className="domus-card" style={{ overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--domus-border)' }}>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0 }}>Desempenho de Vendas — Equipe</p>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>Imóveis vendidos e receita por corretor</p>
            </div>

            {loading ? (
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="domus-skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                    <div className="domus-skeleton" style={{ height: 11, flex: 1 }} />
                    <div className="domus-skeleton" style={{ width: 48, height: 11 }} />
                    <div className="domus-skeleton" style={{ width: 100, height: 11 }} />
                  </div>
                ))}
              </div>
            ) : teamSales.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0, padding: '24px' }}>
                Nenhuma venda atribuída a um corretor ainda. Ao marcar um imóvel como vendido estando logado, a venda será registrada no seu nome.
              </p>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 160px', gap: 16, padding: '10px 24px', background: 'var(--domus-surface)' }}>
                  {['Corretor', 'Vendas', 'Receita'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--domus-text-muted)' }}>{h}</span>
                  ))}
                </div>

                {teamSales.map((b, i) => {
                  const displayName = b.name
                  const initials = displayName.slice(0, 2).toUpperCase()
                  const hue = (displayName.charCodeAt(0) * 37) % 360
                  return (
                    <div key={b.broker_id} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 160px', gap: 16, padding: '14px 24px', borderTop: '1px solid var(--domus-border)', alignItems: 'center' }}>
                      {/* Broker */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: `hsl(${hue} 30% 88%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, color: `hsl(${hue} 40% 28%)`,
                          fontFamily: 'var(--domus-font-display)',
                        }}>
                          {initials}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--domus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                        </span>
                      </div>

                      {/* Sales count */}
                      <span style={{ fontSize: 13, color: 'var(--domus-text)', fontFamily: 'var(--domus-font-mono)' }}>
                        {b.count} {b.count === 1 ? 'venda' : 'vendas'}
                      </span>

                      {/* Revenue */}
                      <span style={{ fontSize: 13, color: 'var(--domus-success)', fontFamily: 'var(--domus-font-mono)', fontWeight: 500 }}>
                        {fmtBRL(b.revenue)}
                      </span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* Leads por valor de imóvel desejado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div className="domus-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Leads por Faixa de Renda
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>Distribuição por renda mensal declarada</p>
            <HBarChart
              items={loading ? [] : (() => {
                const faixas = [
                  { label: 'Até R$5k',       min: 0,     max: 5000 },
                  { label: 'R$5k – R$10k',   min: 5000,  max: 10000 },
                  { label: 'R$10k – R$20k',  min: 10000, max: 20000 },
                  { label: 'Acima de R$20k', min: 20000, max: Infinity },
                ]
                return faixas
                  .map(f => ({
                    label: f.label,
                    value: leads.filter(l => l.income >= f.min && l.income < f.max).length,
                  }))
                  .filter(f => f.value > 0)
              })()}
              color="var(--domus-brand)"
            />
          </div>

          <div className="domus-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Faixa de Imóvel Desejado
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 20px' }}>Valor do imóvel declarado pelos leads</p>
            <HBarChart
              items={loading ? [] : (() => {
                const faixas = [
                  { label: 'Até R$200k',          min: 0,       max: 200000 },
                  { label: 'R$200k – R$400k',     min: 200000,  max: 400000 },
                  { label: 'R$400k – R$700k',     min: 400000,  max: 700000 },
                  { label: 'Acima de R$700k',     min: 700000,  max: Infinity },
                ]
                return faixas
                  .map(f => ({
                    label: f.label,
                    value: leads.filter(l => l.property_value >= f.min && l.property_value < f.max).length,
                  }))
                  .filter(f => f.value > 0)
              })()}
              color="var(--domus-beige-600)"
            />
          </div>
        </div>

        {/* Pipeline — conversão de negócios */}
        {(dealStats.active > 0 || dealStats.closed > 0 || dealStats.lost > 0) && (
          <div className="domus-card" style={{ padding: '22px 24px', marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 2px' }}>
              Negócios — Conversão
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 18px' }}>Pipeline acumulado</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                { label: 'Em andamento',    value: dealStats.active,  color: 'var(--domus-brand)' },
                { label: 'Fechados',         value: dealStats.closed,  color: 'var(--domus-success)' },
                { label: 'Perdidos',         value: dealStats.lost,    color: 'var(--domus-danger)' },
                {
                  label: 'Taxa de conv.',
                  value: (dealStats.closed + dealStats.lost) > 0
                    ? `${Math.round((dealStats.closed / (dealStats.closed + dealStats.lost)) * 100)}%`
                    : '—',
                  color: 'var(--domus-warning)',
                },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--domus-surface)', borderRadius: 8 }}>
                  <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 22, fontWeight: 400, margin: '0 0 4px', color }}>{value}</p>
                  <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sold properties table */}
        <div className="domus-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0 }}>Imóveis vendidos</p>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
                {periodLabel} · {soldInPeriod.length} venda{soldInPeriod.length !== 1 ? 's' : ''}
              </p>
            </div>
            {soldInPeriod.length > 0 && (
              <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, color: 'var(--domus-success)' }}>
                {fmtBRL(revenue)}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '32px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
            </div>
          ) : soldInPeriod.length === 0 ? (
            <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Building2 size={28} style={{ color: 'var(--domus-text-muted)', opacity: 0.25 }} />
              <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhuma venda registrada no período.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 20px', background: 'var(--domus-surface)', borderBottom: '1px solid var(--domus-border)' }}>
                {['Imóvel', 'Região', 'Valor', 'Data de venda'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)' }}>{h}</span>
                ))}
              </div>
              {soldInPeriod.map((p, i) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: i < soldInPeriod.length - 1 ? '1px solid var(--domus-border)' : 'none', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    {p.address && <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</p>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>{p.region ?? '—'}</span>
                  <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, color: 'var(--domus-success)' }}>
                    {p.value ? fmtBRL(p.value) : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>
                    {p.sold_at ? new Date(p.sold_at).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
