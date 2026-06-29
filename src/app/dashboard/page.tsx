'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Lead, Property } from '@/lib/types'
import { readCache, writeCache } from '@/lib/route-cache'
import {
  Building2, Users, CheckCircle, XCircle, TrendingUp,
  ChevronLeft, ChevronRight, Calendar, ArrowRight, Handshake,
} from 'lucide-react'
import Link from 'next/link'
import { useCompany } from '@/lib/company-context'
import { localDateStr } from '@/lib/utils'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_HEADER = ['D','S','T','Q','Q','S','S']

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60)    return 'agora'
  if (s < 3600)  return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  const d = Math.round(s / 86400)
  return `${d}d`
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({
  year, month, eventDays, onMonthChange,
}: {
  year: number
  month: number
  eventDays: Set<number>
  onMonthChange: (y: number, m: number) => void
}) {
  const today       = new Date()
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const prev = () => { const d = new Date(year, month - 1, 1); onMonthChange(d.getFullYear(), d.getMonth()) }
  const next = () => { const d = new Date(year, month + 1, 1); onMonthChange(d.getFullYear(), d.getMonth()) }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prev} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-text-muted)', display: 'flex', borderRadius: 4, transition: 'color 140ms' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 11, fontFamily: 'var(--domus-font-display)', fontWeight: 500, color: 'var(--domus-text)' }}>
          {MONTHS_LONG[month]} {year}
        </span>
        <button onClick={next} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-text-muted)', display: 'flex', borderRadius: 4, transition: 'color 140ms' }}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAYS_HEADER.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.08em', color: 'var(--domus-text-muted)', paddingBottom: 4 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const todayCell = isToday(day)
          const hasEvent  = eventDays.has(day)
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 28, borderRadius: 6, fontSize: 11,
                fontWeight: todayCell ? 700 : 400,
                background: todayCell
                  ? 'var(--domus-green-700)'
                  : hasEvent
                    ? 'var(--domus-green-50)'
                    : 'transparent',
                color: todayCell ? '#fff' : hasEvent ? 'var(--domus-brand)' : 'var(--domus-text)',
                boxShadow: todayCell ? '0 2px 8px -2px rgba(15,61,46,.40)' : 'none',
              }}
            >
              {day}
              {hasEvent && !todayCell && (
                <span style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 3, height: 3, borderRadius: '50%', background: 'var(--domus-success)',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {eventDays.size > 0 && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--domus-success)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>
            {eventDays.size} dia{eventDays.size !== 1 ? 's' : ''} com visitas
          </span>
        </div>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({
  label, value, icon: Icon, color, bg, href, sub, dark,
}: {
  label: string; value: number | string; icon: React.ElementType
  color: string; bg: string; href?: string; sub?: string; dark?: boolean
}) {
  const inner = (
    <div
      className={`domus-card domus-card--interactive${dark ? ' domus-card--dark' : ''}`}
      style={{ padding: '22px', height: '100%', minHeight: 120 }}
    >
      {/* Label + Icon row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{
          fontFamily: 'var(--domus-font-mono)',
          fontSize: 10,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: dark ? 'rgba(250,247,242,0.55)' : 'var(--domus-text-muted)',
          margin: 0,
          lineHeight: 1.3,
          maxWidth: '80%',
        }}>
          {label}
        </p>
        <div style={{
          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
          background: dark ? 'rgba(250,247,242,0.10)' : bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} style={{ color: dark ? 'rgba(250,247,242,0.65)' : color }} />
        </div>
      </div>

      {/* Value */}
      <p style={{
        fontFamily: 'var(--domus-font-display)',
        fontSize: 30,
        fontWeight: 400,
        letterSpacing: '-0.02em',
        color: dark ? 'var(--domus-beige-500)' : 'var(--domus-text)',
        margin: 0,
        lineHeight: 1,
      }}>
        {value}
      </p>

      {/* Sub text */}
      {sub && (
        <p style={{
          fontSize: 11,
          margin: '8px 0 0',
          color: dark ? 'rgba(250,247,242,0.45)' : color,
          fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {sub}
        </p>
      )}

      {href && (
        <ArrowRight size={10} style={{
          position: 'absolute', bottom: 16, right: 16,
          color: dark ? 'rgba(250,247,242,0.22)' : 'var(--domus-ink-200)',
        }} />
      )}
    </div>
  )

  return href
    ? <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%', position: 'relative' }}>{inner}</Link>
    : <div style={{ position: 'relative' }}>{inner}</div>
}

// ─── Funnel Bar ───────────────────────────────────────────────────────────────
function FunnelBar({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null

  const segments = [
    { label: 'Aprovados',  count: leads.filter(l => l.status === 'Crédito Pré-Aprovado').length, color: 'var(--domus-success)' },
    { label: 'Em análise', count: leads.filter(l => l.status === 'Em Análise').length,            color: 'var(--domus-warning)' },
    { label: 'Pendentes',  count: leads.filter(l => l.status === 'Pendente').length,               color: 'var(--domus-ink-200)' },
    { label: 'Recusados',  count: leads.filter(l => l.status === 'Recusado').length,               color: 'var(--domus-danger)' },
  ].filter(s => s.count > 0)

  const total = segments.reduce((s, seg) => s + seg.count, 0)

  return (
    <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--domus-border)' }}>
      {/* Bar */}
      <div style={{ display: 'flex', height: 4, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{
            flex: seg.count / total,
            background: seg.color,
            opacity: 0.75,
            borderRadius: 4,
            transition: 'flex 0.4s var(--domus-ease-standard)',
          }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 9, flexWrap: 'wrap' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: seg.color, flexShrink: 0, opacity: 0.8 }} />
            <span style={{ fontSize: 10, color: 'var(--domus-text-muted)', whiteSpace: 'nowrap' }}>
              {seg.label}{' '}
              <strong style={{ color: 'var(--domus-text-secondary)', fontWeight: 600 }}>{seg.count}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lead Row ─────────────────────────────────────────────────────────────────
const LEAD_STATUS: Record<string, { bg: string; color: string; label: string; avatarBg: string }> = {
  'Crédito Pré-Aprovado': { bg: 'var(--domus-success-bg)', color: 'var(--domus-success)',   label: 'Aprovado', avatarBg: '#d4ede2' },
  'Em Análise':           { bg: 'var(--domus-warning-bg)', color: 'var(--domus-warning)',    label: 'Análise',  avatarBg: '#f6e9cc' },
  'Pendente':             { bg: 'var(--domus-ink-100)',    color: 'var(--domus-text-muted)', label: 'Pendente', avatarBg: '#e4ded1' },
  'Recusado':             { bg: 'var(--domus-danger-bg)',  color: 'var(--domus-danger)',     label: 'Recusado', avatarBg: '#f2dad5' },
}

function LeadRow({ lead }: { lead: Lead }) {
  const sc  = LEAD_STATUS[lead.status] ?? LEAD_STATUS['Pendente']
  const ini = initials(lead.name)

  return (
    <div className="domus-list-row domus-list-row--interactive">
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: sc.avatarBg, color: sc.color,
        fontFamily: 'var(--domus-font-display)', fontSize: 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        letterSpacing: '0.02em',
      }}>
        {ini.slice(0, 2)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
          {fmtBRL(lead.income)}/mês{lead.region ? ` · ${lead.region}` : ''}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.04em',
          padding: '3px 8px', borderRadius: 'var(--domus-radius-pill)',
          background: sc.bg, color: sc.color,
        }}>
          {sc.label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>{relTime(lead.created_at)}</span>
      </div>
    </div>
  )
}

// ─── Sold Row ─────────────────────────────────────────────────────────────────
function SoldRow({ property }: { property: Property }) {
  const soldLabel = property.sold_at
    ? new Date(property.sold_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  return (
    <div className="domus-list-row domus-list-row--interactive">
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--domus-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Building2 size={14} style={{ color: 'var(--domus-success)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {property.title}
        </p>
        {property.address && (
          <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {property.address}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 14, color: 'var(--domus-success)', fontWeight: 400 }}>
          {property.value ? fmtBRL(property.value) : '—'}
        </span>
        {soldLabel && <span style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>{soldLabel}</span>}
      </div>
    </div>
  )
}

// ─── Skeleton shimmer row ─────────────────────────────────────────────────────
function SkeletonRow({ circle }: { circle?: boolean }) {
  return (
    <div className="domus-list-row">
      <div className="domus-skeleton" style={{ width: 36, height: 36, borderRadius: circle ? '50%' : 8, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="domus-skeleton" style={{ height: 12, width: '52%' }} />
        <div className="domus-skeleton" style={{ height: 10, width: '34%', opacity: 0.6 }} />
      </div>
      <div className="domus-skeleton" style={{ width: 54, height: 20, borderRadius: 'var(--domus-radius-pill)' }} />
    </div>
  )
}

// ─── Panel Header ─────────────────────────────────────────────────────────────
function PanelHeader({
  eyebrow, title, count, href, hrefLabel, accentColor,
}: {
  eyebrow: string
  title: string
  count?: number
  href?: string
  hrefLabel?: string
  accentColor?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
            background: accentColor ?? 'var(--domus-brand)',
          }} />
          <p className="domus-eyebrow" style={{ fontSize: 9, margin: 0 }}>{eyebrow}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 14, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
            {title}
          </h2>
          {count !== undefined && count > 0 && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--domus-font-mono)',
              padding: '2px 7px', borderRadius: 'var(--domus-radius-pill)',
              background: 'var(--domus-ink-100)', color: 'var(--domus-text-muted)',
              lineHeight: 1.6,
            }}>
              {count}
            </span>
          )}
        </div>
      </div>
      {href && (
        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--domus-brand)', textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
          {hrefLabel ?? 'Ver todos'} <ArrowRight size={11} />
        </Link>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { companyId: COMPANY_ID } = useCompany()
  const now_ = new Date()
  const [leads,       setLeads]       = useState<Lead[]>([])
  const [properties,  setProperties]  = useState<Property[]>([])
  const [eventDays,   setEventDays]   = useState<Set<number>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [activeDeals, setActiveDeals] = useState(0)
  const [calYear,    setCalYear]    = useState(now_.getFullYear())
  const [calMonth,   setCalMonth]   = useState(now_.getMonth())

  const fetchCalEvents = useCallback(async (y: number, m: number) => {
    if (!COMPANY_ID) return
    const start = new Date(y, m, 1).toISOString()
    const end   = new Date(y, m + 1, 0, 23, 59, 59).toISOString()
    try {
      const res = await fetch(
        `/api/calendar/events?company_id=${COMPANY_ID}&timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}`
      )
      if (res.ok) {
        const { events } = await res.json()
        const days = new Set<number>(
          (events ?? []).flatMap((ev: { start?: { dateTime?: string; date?: string } }) => {
            const dt = ev.start?.dateTime ?? ev.start?.date
            return dt ? [new Date(dt).getDate()] : []
          })
        )
        setEventDays(days)
      }
    } catch { /* Calendar not configured */ }
  }, [COMPANY_ID])

  const fetchCoreData = useCallback(async () => {
    if (!COMPANY_ID) { setLoading(false); return }
    const cachedLeads = readCache<Lead[]>('leads')
    const cachedProps = readCache<Property[]>('properties')
    if (cachedLeads) setLeads(cachedLeads)
    if (cachedProps) setProperties(cachedProps)
    if (cachedLeads && cachedProps) setLoading(false)
    else setLoading(true)
    try {
      const [leadsRes, propsRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/properties'),
      ])
      if (leadsRes.ok) { const { leads: d }      = await leadsRes.json(); setLeads(d ?? []); writeCache('leads', d ?? []) }
      if (propsRes.ok) { const { properties: d } = await propsRes.json(); setProperties(d ?? []); writeCache('properties', d ?? []) }
      fetch('/api/deals').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.deals) setActiveDeals((d.deals as { stage: string }[]).filter(x => x.stage !== 'closed' && x.stage !== 'lost').length)
      }).catch(() => {})
    } finally { setLoading(false) }
  }, [COMPANY_ID])

  useEffect(() => {
    if (!COMPANY_ID) return
    const y = new Date().getFullYear()
    const m = new Date().getMonth()
    fetchCoreData()
    fetchCalEvents(y, m)
    fetch('/api/notifications/reminders', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.created > 0) window.dispatchEvent(new Event('domus:notifications-refresh'))
      })
      .catch(() => {})
  }, [COMPANY_ID, fetchCoreData, fetchCalEvents])

  const handleMonthChange = (y: number, m: number) => {
    setCalYear(y)
    setCalMonth(m)
    fetchCalEvents(y, m)
  }

  const handleRefresh = () => {
    fetchCoreData()
    fetchCalEvents(calYear, calMonth)
  }

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const todayStr   = localDateStr(now)
  const available  = properties.filter(p => p.status === 'available').length
  const active     = leads.filter(l => l.status === 'Pendente' || l.status === 'Em Análise').length
  const approved   = leads.filter(l => l.status === 'Crédito Pré-Aprovado').length
  const rejected   = leads.filter(l => l.status === 'Recusado').length
  const soldThisMo = properties.filter(p => p.status === 'sold' && p.sold_at && new Date(p.sold_at) >= monthStart)
  const revenue    = soldThisMo.reduce((s, p) => s + (p.value ?? 0), 0)
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Follow-ups due today or overdue (excludes ones já marcados como realizados)
  const pendingFollowUps = leads
    .flatMap(l => (l.follow_ups ?? [])
      .filter(f => !f.done && f.date <= todayStr)
      .map(f => ({ lead: l, followUp: f })))
    .sort((a, b) => a.followUp.date.localeCompare(b.followUp.date))
  const overdueFollowUps = pendingFollowUps.filter(({ followUp }) => followUp.date < todayStr)
  const todayFollowUps   = pendingFollowUps.filter(({ followUp }) => followUp.date === todayStr)
  const followUps = pendingFollowUps
  const followUpsLabel = overdueFollowUps.length > 0 && todayFollowUps.length > 0
    ? `${overdueFollowUps.length} follow-up${overdueFollowUps.length > 1 ? 's' : ''} atrasado${overdueFollowUps.length > 1 ? 's' : ''} · ${todayFollowUps.length} para hoje`
    : overdueFollowUps.length > 0
      ? `${overdueFollowUps.length} follow-up${overdueFollowUps.length > 1 ? 's' : ''} atrasado${overdueFollowUps.length > 1 ? 's' : ''}`
      : `${todayFollowUps.length} follow-up${todayFollowUps.length > 1 ? 's' : ''} para hoje`

  // Formatted today date for header
  const todayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10, marginBottom: 2 }}>Domus · Visão geral</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 11, color: 'var(--domus-text-muted)', fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.04em' }}>
              {todayLabel}
            </span>
            <button onClick={handleRefresh} disabled={loading} className="domus-btn domus-btn--secondary domus-btn--sm">
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>

        {/* ── Follow-up alerts ── */}
        {!loading && followUps.length > 0 && (
          <div style={{
            marginBottom: 16, padding: '12px 18px',
            background: overdueFollowUps.length > 0 ? 'var(--domus-danger-bg)' : 'var(--domus-warning-bg)',
            border: overdueFollowUps.length > 0 ? '1px solid rgba(178,58,42,0.18)' : '1px solid rgba(198,138,46,0.25)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Calendar size={16} style={{ color: overdueFollowUps.length > 0 ? 'var(--domus-danger)' : 'var(--domus-warning)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
                {followUpsLabel}
              </p>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {followUps.slice(0, 3).map(({ lead }) => lead.name).join(' · ')}{followUps.length > 3 ? ` + ${followUps.length - 3}` : ''}
              </p>
            </div>
            <Link href="/dashboard/leads" style={{ fontSize: 12, color: overdueFollowUps.length > 0 ? 'var(--domus-danger)' : 'var(--domus-warning)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              Ver leads <ArrowRight size={11} />
            </Link>
          </div>
        )}

        {/* ── KPI row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="domus-card" style={{ padding: '22px', minHeight: 120 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div className="domus-skeleton" style={{ height: 10, width: '60%' }} />
                  <div className="domus-skeleton" style={{ width: 30, height: 30, borderRadius: 7 }} />
                </div>
                <div className="domus-skeleton" style={{ height: 30, width: '45%' }} />
              </div>
            ))
          ) : (
            <>
              <KPI label="Imóveis disponíveis" value={available}       icon={Building2}   color="var(--domus-brand)"   bg="var(--domus-green-50)"   href="/dashboard/imoveis" />
              <KPI label="Leads ativos"        value={active}          icon={Users}       color="var(--domus-warning)" bg="var(--domus-warning-bg)" href="/dashboard/leads" />
              <KPI label="Pré-aprovados"       value={approved}        icon={CheckCircle} color="var(--domus-success)" bg="var(--domus-success-bg)" href="/dashboard/leads" />
              <KPI label="Negociações ativas"  value={activeDeals}     icon={Handshake}   color="var(--domus-brand)"   bg="var(--domus-green-50)"   href="/dashboard/pipeline" />
              <KPI label="Reprovados"          value={rejected}        icon={XCircle}     color="var(--domus-danger)"  bg="var(--domus-danger-bg)"  href="/dashboard/leads" />
              <KPI
                label="Receita do mês"
                value={fmtBRL(revenue)}
                icon={TrendingUp}
                color="var(--domus-brand)"
                bg="var(--domus-beige-100)"
                sub={soldThisMo.length > 0 ? `${soldThisMo.length} venda${soldThisMo.length > 1 ? 's' : ''} este mês` : 'Nenhuma venda ainda'}
                dark
              />
            </>
          )}
        </div>

        {/* ── Bottom grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>

          {/* Left: leads + sales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Recent leads */}
            <div className="domus-card" style={{ padding: '22px 24px' }}>
              <PanelHeader
                eyebrow="Atividade"
                title="Leads recentes"
                count={loading ? undefined : leads.length}
                href="/dashboard/leads"
              />

              {!loading && leads.length > 0 && <FunnelBar leads={leads} />}

              <div>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} circle />)
                  : recentLeads.length === 0
                    ? (
                      <div style={{ padding: '32px 0', textAlign: 'center' }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12, background: 'var(--domus-green-50)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 12px',
                        }}>
                          <Users size={20} style={{ color: 'var(--domus-brand)', opacity: 0.5 }} />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 4px' }}>
                          Nenhum lead ainda
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>
                          Adicione seu primeiro lead para começar.
                        </p>
                        <Link href="/dashboard/leads" className="domus-btn domus-btn--primary domus-btn--sm" style={{ marginTop: 16, display: 'inline-flex' }}>
                          Adicionar lead
                        </Link>
                      </div>
                    )
                    : recentLeads.map(l => <LeadRow key={l.id} lead={l} />)
                }
              </div>
            </div>

            {/* Monthly sales */}
            <div className="domus-card" style={{ padding: '22px 24px' }}>
              <PanelHeader
                eyebrow="Imóveis"
                title="Vendas do mês"
                accentColor="var(--domus-success)"
                href="/dashboard/imoveis"
                hrefLabel="Ver imóveis"
              />

              {!loading && soldThisMo.length > 0 && (
                <div style={{ marginBottom: 12, paddingBottom: 14, borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Total do mês</span>
                  <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 20, color: 'var(--domus-success)', fontWeight: 400, letterSpacing: '-0.01em' }}>
                    {fmtBRL(revenue)}
                  </span>
                </div>
              )}

              <div>
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />)
                  : soldThisMo.length === 0
                    ? (
                      <div style={{ padding: '32px 0', textAlign: 'center' }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12, background: 'var(--domus-success-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 12px',
                        }}>
                          <Building2 size={20} style={{ color: 'var(--domus-success)', opacity: 0.55 }} />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--domus-text)', margin: '0 0 4px' }}>
                          Sem vendas este mês
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>
                          Marque um imóvel como vendido para ver aqui.
                        </p>
                        <Link href="/dashboard/imoveis" className="domus-btn domus-btn--secondary domus-btn--sm" style={{ marginTop: 16, display: 'inline-flex' }}>
                          Gerenciar imóveis
                        </Link>
                      </div>
                    )
                    : soldThisMo.map(p => <SoldRow key={p.id} property={p} />)
                }
              </div>
            </div>
          </div>

          {/* Right: calendar */}
          <div className="domus-card" style={{ padding: '22px', alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 7,
                background: 'var(--domus-green-50)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Calendar size={13} style={{ color: 'var(--domus-brand)' }} />
              </div>
              <div>
                <p className="domus-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>Google Calendar</p>
                <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
                  Visitas
                </h2>
              </div>
            </div>

            <MiniCalendar
              year={calYear}
              month={calMonth}
              eventDays={eventDays}
              onMonthChange={handleMonthChange}
            />

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--domus-border)' }}>
              <Link href="/dashboard/visistar" className="domus-btn domus-btn--secondary domus-btn--sm" style={{ width: '100%', justifyContent: 'center' }}>
                <Calendar size={11} /> Gerenciar visitas
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
