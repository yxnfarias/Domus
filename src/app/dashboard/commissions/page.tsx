'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Commission, CommissionStatus } from '@/lib/types'
import { DollarSign, Plus, X, Trash2, Users, ArrowRight, ChevronDown } from 'lucide-react'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendente',   color: 'var(--domus-warning)',    bg: 'var(--domus-warning-bg)' },
  confirmed: { label: 'Confirmada', color: 'var(--domus-brand)',      bg: 'var(--domus-green-50)'   },
  paid:      { label: 'Paga',       color: 'var(--domus-success)',    bg: 'var(--domus-success-bg)' },
  cancelled: { label: 'Cancelada',  color: 'var(--domus-text-muted)', bg: 'var(--domus-ink-100)'    },
}

// ─── Status Dropdown ─────────────────────────────────────────────────────────
function StatusDropdown({ status, onChange }: { status: CommissionStatus; onChange: (s: CommissionStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState<{ top: number; left: number } | null>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const sc = STATUS_CONFIG[status]

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const left = Math.min(r.left, window.innerWidth - 172)
      setPos({ top: r.bottom + 4, left })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current  && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 99,
          border: `1px solid ${sc.color}40`,
          backgroundColor: sc.bg, color: sc.color,
          cursor: 'pointer', fontSize: 11, fontWeight: 500,
          whiteSpace: 'nowrap', transition: 'opacity 120ms',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
        {sc.label}
        <ChevronDown size={10} style={{ opacity: 0.55, flexShrink: 0 }} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            background: 'var(--domus-white)',
            border: '1px solid var(--domus-border)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(8,32,24,0.14)',
            overflow: 'hidden',
            minWidth: 164,
            animation: 'slideUp 120ms var(--domus-ease-enter)',
          }}
        >
          {(Object.entries(STATUS_CONFIG) as [CommissionStatus, (typeof STATUS_CONFIG)[CommissionStatus]][]).map(([val, cfg]) => {
            const isCurrent = val === status
            return (
              <button
                key={val}
                onClick={() => { if (!isCurrent) { onChange(val); setOpen(false) } }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 14px', border: 'none',
                  cursor: isCurrent ? 'default' : 'pointer',
                  background: isCurrent ? cfg.bg : 'transparent',
                  fontSize: 12,
                  color: isCurrent ? cfg.color : 'var(--domus-text)',
                  fontWeight: isCurrent ? 600 : 400,
                  textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'var(--domus-surface)' }}
                onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                {cfg.label}
                {isCurrent && (
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: cfg.color, fontFamily: 'var(--domus-font-mono)', opacity: 0.7 }}>
                    atual
                  </span>
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function netAmt(c: Commission): number {
  if (c.commission_type === 'parceiro' && c.partner_pct) {
    return c.commission_amt - (c.commission_amt * c.partner_pct / 100)
  }
  return c.commission_amt
}

function partnerAmt(c: Commission): number {
  if (c.commission_type === 'parceiro' && c.partner_pct) {
    return c.commission_amt * c.partner_pct / 100
  }
  return 0
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<'direta' | 'parceiro'>('direta')
  const [form, setForm] = useState({
    description: '', sale_value: '', commission_pct: '6',
    partner_name: '', partner_pct: '20', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const saleVal  = parseFloat(form.sale_value)    || 0
  const myPct    = parseFloat(form.commission_pct) || 0
  const partPct  = parseFloat(form.partner_pct)    || 0
  const myBruta  = saleVal * myPct / 100
  const repasse  = type === 'parceiro' ? myBruta * partPct / 100 : 0
  const liquida  = myBruta - repasse

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.sale_value || !form.commission_pct) { setError('Valor e percentual são obrigatórios'); return }
    if (type === 'parceiro' && !form.partner_name.trim()) { setError('Nome do parceiro é obrigatório'); return }
    if (type === 'parceiro' && !form.partner_pct) { setError('Percentual do parceiro é obrigatório'); return }
    setLoading(true); setError(null)
    const res = await fetch('/api/commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commission_type: type,
        description:   form.description || null,
        partner_name:  type === 'parceiro' ? form.partner_name : null,
        partner_pct:   type === 'parceiro' ? partPct : null,
        sale_value:    saleVal,
        commission_pct: myPct,
        notes: form.notes || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Erro'); setLoading(false); return }
    onSaved(); onClose()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', fontSize: 13,
    border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-sm)',
    background: 'var(--domus-white)', color: 'var(--domus-text)', outline: 'none',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(8,32,24,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--domus-white)', borderRadius: 16, boxShadow: '0 24px 64px rgba(8,32,24,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--domus-border)' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10, marginBottom: 3 }}>Comissões</p>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0 }}>Registrar comissão</h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} style={{ color: 'var(--domus-text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Type selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['direta', 'parceiro'] as const).map(t => (
              <button
                key={t} type="button"
                onClick={() => setType(t)}
                style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${type === t ? 'var(--domus-brand)' : 'var(--domus-border)'}`,
                  background: type === t ? 'var(--domus-green-50)' : 'var(--domus-white)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 140ms',
                }}
              >
                {t === 'direta'
                  ? <DollarSign size={14} style={{ color: type === t ? 'var(--domus-brand)' : 'var(--domus-text-muted)' }} />
                  : <Users size={14} style={{ color: type === t ? 'var(--domus-brand)' : 'var(--domus-text-muted)' }} />
                }
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: 0, color: type === t ? 'var(--domus-brand)' : 'var(--domus-text)' }}>
                    {t === 'direta' ? 'Venda Direta' : 'Parceiro Corretor'}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: 0 }}>
                    {t === 'direta' ? 'Você vendeu diretamente' : 'Corretor parceiro vendeu'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>Descrição</label>
            <input style={inp} type="text" placeholder="Imóvel, cliente, empreendimento..." value={form.description} onChange={set('description')} />
          </div>

          {/* Partner name — only for parceiro */}
          {type === 'parceiro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>Nome do corretor parceiro *</label>
              <input style={inp} type="text" placeholder="Ex: João Silva" value={form.partner_name} onChange={set('partner_name')} />
            </div>
          )}

          {/* Value + commission % */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>Valor da venda (R$) *</label>
              <input style={inp} type="number" min="0" step="1000" placeholder="300000" value={form.sale_value} onChange={set('sale_value')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>
                {type === 'parceiro' ? 'Minha % (construtora)' : '% de comissão'} *
              </label>
              <input style={inp} type="number" min="0" max="30" step="0.5" value={form.commission_pct} onChange={set('commission_pct')} />
            </div>
          </div>

          {/* Partner % — only for parceiro */}
          {type === 'parceiro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>% do parceiro (sobre minha comissão) *</label>
              <input style={inp} type="number" min="0" max="100" step="1" value={form.partner_pct} onChange={set('partner_pct')} />
            </div>
          )}

          {/* Live preview */}
          {saleVal > 0 && myPct > 0 && (
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--domus-green-50)', border: '1px solid rgba(15,61,46,0.12)' }}>
              {type === 'direta' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Sua comissão</p>
                  <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 22, color: 'var(--domus-brand)', margin: 0, fontWeight: 400 }}>
                    {fmtBRL(myBruta)}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Minha comissão bruta</span>
                    <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 13, color: 'var(--domus-text)' }}>{fmtBRL(myBruta)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Repasse ao parceiro ({partPct}%)</span>
                    <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 13, color: 'var(--domus-danger)' }}>− {fmtBRL(repasse)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(15,61,46,0.12)', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--domus-brand)' }}>Minha comissão líquida</span>
                    <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 20, color: 'var(--domus-brand)', fontWeight: 400 }}>{fmtBRL(liquida)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>Observações</label>
            <textarea style={{ ...inp, resize: 'none', lineHeight: 1.5 }} rows={2} placeholder="Informações adicionais..." value={form.notes} onChange={set('notes')} />
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 2 }}>
            <button type="button" onClick={onClose} className="domus-btn domus-btn--secondary domus-btn--sm">Cancelar</button>
            <button type="submit" disabled={loading} className="domus-btn domus-btn--primary domus-btn--sm">
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading]         = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [filter, setFilter]           = useState<CommissionStatus | 'all'>('all')
  const [typeFilter, setTypeFilter]   = useState<'all' | 'direta' | 'parceiro'>('all')
  const [toast, setToast]             = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const showToast_ = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/commissions')
    if (res.ok) { const { commissions: d } = await res.json(); setCommissions(d ?? []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updateStatus = async (id: string, status: CommissionStatus) => {
    const res = await fetch(`/api/commissions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setCommissions(prev => prev.map(c => c.id === id
        ? { ...c, status, paid_at: status === 'paid' ? new Date().toISOString() : c.paid_at }
        : c
      ))
      showToast_('Status atualizado.')
    }
  }

  const deleteCommission = async (id: string) => {
    setConfirmDeleteId(null)
    await fetch(`/api/commissions/${id}`, { method: 'DELETE' })
    setCommissions(prev => prev.filter(c => c.id !== id))
    showToast_('Comissão removida.')
  }

  // Filtered list
  const filtered = commissions
    .filter(c => filter   === 'all' || c.status          === filter)
    .filter(c => typeFilter === 'all' || c.commission_type === typeFilter)

  // KPIs — using net amounts (after partner repasse)
  const active   = commissions.filter(c => c.status !== 'cancelled')
  const totalBruta    = active.reduce((s, c) => s + c.commission_amt, 0)
  const totalRepasse  = active.filter(c => c.commission_type === 'parceiro')
    .reduce((s, c) => s + partnerAmt(c), 0)
  const totalLiquida  = active.reduce((s, c) => s + netAmt(c), 0)
  const totalRecebido = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + netAmt(c), 0)

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200, padding: '12px 20px', borderRadius: 10, background: 'var(--domus-green-900)', color: '#FAF7F2', fontSize: 13, boxShadow: '0 8px 32px rgba(8,32,24,0.3)' }}>
          {toast}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={fetchData} />}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remover comissão"
        message="Tem certeza que deseja remover esta comissão? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        danger
        onConfirm={() => confirmDeleteId && deleteCommission(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Header */}
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Administração</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0 }}>Comissões</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="domus-btn domus-btn--primary domus-btn--sm">
            <Plus size={13} /> Registrar comissão
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Comissão bruta',      value: totalBruta,    color: 'var(--domus-brand)',   accent: 'var(--domus-brand)' },
            { label: 'Repassado parceiros', value: totalRepasse,  color: 'var(--domus-danger)',  accent: 'var(--domus-danger)' },
            { label: 'Minha líquida',       value: totalLiquida,  color: 'var(--domus-success)', accent: 'var(--domus-success)' },
            { label: 'Já recebido',         value: totalRecebido, color: 'var(--domus-warning)', accent: 'var(--domus-warning)' },
          ].map(({ label, value, color, accent }) => (
            <div key={label} className="domus-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />
              <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', margin: '0 0 8px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', color, margin: 0 }}>
                {fmtBRL(value)}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 4, padding: '3px', background: 'var(--domus-surface)', borderRadius: 8, border: '1px solid var(--domus-border)' }}>
            {([['all', 'Todas'], ['direta', 'Venda Direta'], ['parceiro', 'Parceiro']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTypeFilter(v)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: typeFilter === v ? 'var(--domus-white)' : 'transparent',
                  color: typeFilter === v ? 'var(--domus-text)' : 'var(--domus-text-muted)',
                  fontWeight: typeFilter === v ? 500 : 400,
                  boxShadow: typeFilter === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 120ms',
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([['all', 'Todos status'], ['pending', 'Pendentes'], ['confirmed', 'Confirmadas'], ['paid', 'Pagas'], ['cancelled', 'Canceladas']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`domus-btn domus-btn--sm ${filter === v ? 'domus-btn--primary' : 'domus-btn--secondary'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="domus-card" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.5fr 160px 40px', padding: '10px 20px', background: 'var(--domus-surface)', borderBottom: '1px solid var(--domus-border)' }}>
            {['Comissão', 'Venda', 'Valor', 'Status', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <DollarSign size={28} style={{ color: 'var(--domus-text-muted)', opacity: 0.2 }} />
              <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhuma comissão registrada.</p>
            </div>
          ) : filtered.map((c, i) => {
            const sc       = STATUS_CONFIG[c.status]
            const isDirect = c.commission_type === 'direta'
            const pAmt     = partnerAmt(c)
            const net      = netAmt(c)

            return (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.5fr 160px 40px', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--domus-border)' : 'none', alignItems: 'center', gap: 8 }}>

                {/* Details */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '2px 7px', borderRadius: 99,
                      background: isDirect ? 'var(--domus-green-50)' : 'rgba(198,138,46,0.1)',
                      color: isDirect ? 'var(--domus-brand)' : 'var(--domus-warning)',
                    }}>
                      {isDirect ? 'Direta' : 'Parceiro'}
                    </span>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.description ?? c.lead_name ?? c.property_title ?? 'Sem descrição'}
                    </p>
                  </div>
                  {!isDirect && c.partner_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={10} style={{ color: 'var(--domus-text-muted)' }} />
                      <span style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>{c.partner_name} · {c.partner_pct}% da minha comissão</span>
                    </div>
                  )}
                  {c.notes && <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</p>}
                </div>

                {/* Sale value */}
                <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 12, color: 'var(--domus-text-secondary)' }}>
                  {fmtBRL(c.sale_value)}
                </span>

                {/* Commission value */}
                <div>
                  {isDirect ? (
                    <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, color: 'var(--domus-success)', margin: 0, fontWeight: 400 }}>
                      {fmtBRL(c.commission_amt)}
                    </p>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 11, color: 'var(--domus-text-muted)', textDecoration: 'line-through' }}>{fmtBRL(c.commission_amt)}</span>
                        <ArrowRight size={10} style={{ color: 'var(--domus-text-muted)' }} />
                        <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 14, color: 'var(--domus-success)', fontWeight: 400 }}>{fmtBRL(net)}</span>
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--domus-danger)', margin: '2px 0 0', fontFamily: 'var(--domus-font-mono)' }}>
                        − {fmtBRL(pAmt)} parceiro
                      </p>
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>{c.commission_pct}%</p>
                </div>

                {/* Status dropdown */}
                <StatusDropdown status={c.status} onChange={s => updateStatus(c.id, s)} />

                {/* Delete */}
                <button onClick={() => setConfirmDeleteId(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-danger)', opacity: 0.4 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
