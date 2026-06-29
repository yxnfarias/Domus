'use client'

import { useState, useEffect, useCallback } from 'react'
import { KPICards } from '@/components/dashboard/KPICards'
import { LeadsTable } from '@/components/dashboard/LeadsTable'
import { LeadModal } from '@/components/dashboard/LeadModal'
import type { Lead, LeadStatus } from '@/lib/types'
import { Plus, RefreshCw, Copy, Check, LayoutGrid, List, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { readCache, writeCache } from '@/lib/route-cache'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDateOnly, followUpStatus } from '@/lib/utils'
import { useCompany } from '@/lib/company-context'

// ─── Kanban column config ─────────────────────────────────────────────────────
const KANBAN_COLS: { status: LeadStatus; label: string; color: string; bg: string }[] = [
  { status: 'Pendente',             label: 'Pendente',     color: 'var(--domus-text-muted)', bg: 'var(--domus-ink-100)' },
  { status: 'Em Análise',           label: 'Em Análise',   color: 'var(--domus-warning)',    bg: 'var(--domus-warning-bg)' },
  { status: 'Crédito Pré-Aprovado', label: 'Pré-Aprovado', color: 'var(--domus-success)',    bg: 'var(--domus-success-bg)' },
  { status: 'Recusado',             label: 'Recusado',     color: 'var(--domus-danger)',     bg: 'var(--domus-danger-bg)' },
]

function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? (p[0][0] ?? '?').toUpperCase() : ((p[0][0] ?? '') + (p[p.length-1][0] ?? '')).toUpperCase()
}

// ─── Kanban card ──────────────────────────────────────────────────────────────
function KanbanCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const nextFollowUp = (lead.follow_ups ?? [])
    .filter(f => !f.done)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null

  return (
    <div
      className="domus-card domus-card--interactive"
      onClick={onClick}
      style={{ padding: '14px 16px', cursor: 'pointer', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--domus-green-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--domus-font-display)', fontSize: 10, fontWeight: 600, color: 'var(--domus-brand)',
        }}>
          {initials(lead.name).slice(0, 2)}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--domus-text)' }}>
            {lead.name}
          </p>
          <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
            {lead.region ?? 'Sem região'}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--domus-font-mono)', color: 'var(--domus-text-secondary)' }}>
          {formatCurrency(lead.income)}/mês
        </span>
        {lead.credit_score !== null && (
          <span style={{
            fontSize: 10, fontFamily: 'var(--domus-font-mono)', fontWeight: 600, padding: '2px 6px',
            borderRadius: 99, background: 'var(--domus-green-50)', color: 'var(--domus-brand)',
          }}>
            {lead.credit_score}
          </span>
        )}
      </div>
      {nextFollowUp && (
        <div style={{
          marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--domus-border)',
          fontSize: 10, color: followUpStatus(nextFollowUp.date) !== 'upcoming' ? 'var(--domus-danger)' : 'var(--domus-warning)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          Follow-up: {formatDateOnly(nextFollowUp.date)}
        </div>
      )}
    </div>
  )
}

// ─── Kanban board ─────────────────────────────────────────────────────────────
function KanbanBoard({ leads, onSelect }: { leads: Lead[]; onSelect: (l: Lead) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
      {KANBAN_COLS.map(col => {
        const colLeads = leads.filter(l => l.status === col.status)
        return (
          <div key={col.status}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: col.bg, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</span>
              <span style={{
                fontSize: 11, fontFamily: 'var(--domus-font-mono)',
                background: 'rgba(255,255,255,0.55)', color: col.color,
                padding: '1px 7px', borderRadius: 99,
              }}>
                {colLeads.length}
              </span>
            </div>
            {/* Cards */}
            <div>
              {colLeads.length === 0 ? (
                <div style={{
                  padding: '20px 0', textAlign: 'center',
                  border: '1.5px dashed var(--domus-border)',
                  borderRadius: 8, fontSize: 11, color: 'var(--domus-text-muted)',
                }}>
                  Sem leads
                </div>
              ) : (
                colLeads.map(l => (
                  <KanbanCard key={l.id} lead={l} onClick={() => onSelect(l)} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { companyId: COMPANY_ID } = useCompany()
  const [leads, setLeads]           = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [loading, setLoading]       = useState(true)
  const [copied, setCopied]         = useState(false)
  const [view, setView]             = useState<'table' | 'kanban'>('table')

  const companySlug = 'renovar'
  const formPath    = `/form/${companySlug}`

  const fetchLeads = useCallback(async () => {
    if (!COMPANY_ID) { setLoading(false); return }
    const cached = readCache<Lead[]>('leads')
    if (cached) { setLeads(cached); setLoading(false) }
    else setLoading(true)
    try {
      const res = await fetch('/api/leads')
      if (res.ok) { const { leads: data } = await res.json(); setLeads(data ?? []); writeCache('leads', data ?? []) }
    } finally { setLoading(false) }
  }, [COMPANY_ID])

  useEffect(() => { if (COMPANY_ID) fetchLeads() }, [COMPANY_ID, fetchLeads])


  const copyFormLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${formPath}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeadUpdate = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelectedLead(updated)
  }

  const exportCSV = () => {
    const rows = [
      ['Nome', 'E-mail', 'WhatsApp', 'CPF', 'Nascimento', 'Estado Civil', 'Regime', 'Renda', 'Valor Imóvel', 'Região', 'FGTS', 'Entrada', 'Status', 'Score', 'Máx SAC', 'Máx PRICE', 'Follow-up'],
      ...leads.map(l => {
        const nextFollowUp = (l.follow_ups ?? [])
          .filter(f => !f.done)
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
        return [
          l.name, l.email, l.whatsapp, l.cpf, l.birth_date, l.marital_status, l.work_regime,
          l.income, l.property_value, l.region ?? '', l.fgts ?? 0, l.down_payment ?? 0,
          l.status, l.credit_score ?? '', l.max_financing_sac ?? '', l.max_financing_price ?? '',
          nextFollowUp?.date ?? '',
        ]
      }),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `leads-${new Date().toISOString().slice(0,10)}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = {
    total:     leads.length,
    approved:  leads.filter(l => l.status === 'Crédito Pré-Aprovado').length,
    pending:   leads.filter(l => l.status === 'Pendente').length,
    analyzing: leads.filter(l => l.status === 'Em Análise').length,
  }

  return (
    <div>
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Leads</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>Gestão de Leads</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--domus-border)', borderRadius: 6, overflow: 'hidden' }}>
              {([
                { key: 'table',  Icon: List,       title: 'Visualização em tabela' },
                { key: 'kanban', Icon: LayoutGrid, title: 'Visualização kanban'    },
              ] as const).map(({ key, Icon, title }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  title={title}
                  aria-label={title}
                  style={{
                    width: 32, height: 32, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: view === key ? 'var(--domus-brand)' : 'transparent',
                    color: view === key ? '#fff' : 'var(--domus-text-muted)',
                    transition: 'background 140ms, color 140ms',
                  }}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>

            <button onClick={exportCSV} disabled={loading || leads.length === 0} className="domus-btn domus-btn--secondary domus-btn--sm">
              <FileSpreadsheet size={13} /> CSV
            </button>
            <button onClick={fetchLeads} disabled={loading} className="domus-btn domus-btn--secondary domus-btn--sm">
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Carregando...' : 'Atualizar'}
            </button>
            <button onClick={copyFormLink} className="domus-btn domus-btn--secondary domus-btn--sm">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Link do form'}
            </button>
            <Link href={formPath} target="_blank" className="domus-btn domus-btn--primary domus-btn--sm">
              <Plus size={13} /> Formulário
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
        <KPICards stats={stats} />

        <div style={{ marginTop: 32 }}>
          {loading ? (
            <div className="domus-card" style={{ overflow: 'hidden' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '16px 20px', borderBottom: i < 3 ? '1px solid var(--domus-border)' : 'none', alignItems: 'center', gap: 16 }}>
                  {[180,90,80,80,70].map((w, j) => (
                    <div key={j} className="domus-skeleton" style={{ height: 12, width: w }} />
                  ))}
                </div>
              ))}
            </div>
          ) : view === 'table' ? (
            <LeadsTable leads={leads} onSelect={setSelectedLead} selectedId={selectedLead?.id} />
          ) : (
            <KanbanBoard leads={leads} onSelect={setSelectedLead} />
          )}
        </div>
      </div>

      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={handleLeadUpdate} />
      )}
    </div>
  )
}
