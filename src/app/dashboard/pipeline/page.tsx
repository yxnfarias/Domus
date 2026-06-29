'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ChevronRight, ChevronLeft, X, RefreshCw,
  Handshake, Check, Archive, TrendingUp, DollarSign, User, Trash2,
} from 'lucide-react'
import type { Deal, DealStage, DealEvent, Lead, Property } from '@/lib/types'
import { useCompany } from '@/lib/company-context'

// ─── Stage config ─────────────────────────────────────────────────────────────
const STAGE_CFG: {
  key: DealStage; label: string; color: string; bg: string; terminal?: true
}[] = [
  { key: 'interest',        label: 'Interesse',        color: 'var(--domus-text-muted)', bg: 'var(--domus-ink-100)' },
  { key: 'visit_scheduled', label: 'Visita Agendada',  color: 'var(--domus-warning)',    bg: 'var(--domus-warning-bg)' },
  { key: 'proposal_sent',   label: 'Proposta Enviada', color: 'var(--domus-brand)',      bg: 'var(--domus-green-50)' },
  { key: 'negotiation',     label: 'Em Negociação',    color: '#7C3AED',                 bg: '#F3EFFF' },
  { key: 'closed',          label: 'Fechado',          color: 'var(--domus-success)',    bg: 'var(--domus-success-bg)', terminal: true },
  { key: 'lost',            label: 'Perdido',          color: 'var(--domus-danger)',     bg: 'var(--domus-danger-bg)', terminal: true },
]

const ACTIVE_COLS: DealStage[] = ['interest', 'visit_scheduled', 'proposal_sent', 'negotiation', 'closed']

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

function stageCfg(key: DealStage) { return STAGE_CFG.find(s => s.key === key) ?? STAGE_CFG[0] }
function stageIdx(key: DealStage) { return STAGE_CFG.findIndex(s => s.key === key) }

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="domus-card" style={{ padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 22, fontWeight: 400, margin: '0 0 4px', color: 'var(--domus-text)', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0 }}>{label}</p>
    </div>
  )
}

// ─── Deal Card ────────────────────────────────────────────────────────────────
function DealCard({
  deal, brokerName, onOpen, onAdvance,
}: { deal: Deal; brokerName?: string; onOpen: () => void; onAdvance: () => void }) {
  const days = daysAgo(deal.updated_at)
  const idx  = stageIdx(deal.stage)
  const canAdvance = idx >= 0 && idx <= 3

  return (
    <div
      className="domus-card domus-card--interactive"
      onClick={onOpen}
      style={{ padding: '14px 16px', cursor: 'pointer', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {deal.lead?.name ?? '—'}
        </p>
        <span style={{ fontSize: 9, color: 'var(--domus-text-muted)', flexShrink: 0, marginLeft: 6, fontFamily: 'var(--domus-font-mono)' }}>
          {days === 0 ? 'hoje' : `${days}d`}
        </span>
      </div>

      {brokerName && (
        <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
          <User size={9} /> {brokerName}
        </p>
      )}

      {deal.property && (
        <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deal.property.title}
        </p>
      )}

      {deal.property?.value != null && (
        <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, color: 'var(--domus-brand)', margin: '0 0 10px' }}>
          {fmtBRL(deal.property.value)}
        </p>
      )}

      {canAdvance && (
        <button
          onClick={e => { e.stopPropagation(); idx === 3 ? onOpen() : onAdvance() }}
          className="domus-btn domus-btn--secondary domus-btn--sm"
          style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
        >
          {idx === 3 ? 'Fechar negócio' : 'Avançar'} <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({
  leads, properties, onClose, onCreated,
}: { leads: Lead[]; properties: Property[]; onClose: () => void; onCreated: () => void }) {
  const [leadId,     setLeadId]     = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const inp: React.CSSProperties = {
    fontFamily: 'var(--domus-font-ui)', fontSize: 13,
    background: 'var(--domus-white)', border: '1px solid var(--domus-border)',
    borderRadius: 'var(--domus-radius-sm)', padding: '9px 11px',
    color: 'var(--domus-text)', width: '100%', outline: 'none',
  }

  const handleCreate = async () => {
    if (!leadId) { setError('Selecione um lead.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, property_id: propertyId || null, notes: notes || null }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erro')
      onCreated(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar negociação')
    } finally { setSaving(false) }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,32,24,0.55)', backdropFilter: 'blur(4px)' }} />
      <div className="domus-card" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, fontWeight: 500, margin: 0 }}>Nova negociação</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} style={{ color: 'var(--domus-text-muted)' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="domus-label">Lead *</label>
            <select value={leadId} onChange={e => setLeadId(e.target.value)} style={{ ...inp, appearance: 'auto', cursor: 'pointer' }}>
              <option value="">Selecione um lead...</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div>
            <label className="domus-label">Imóvel</label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ ...inp, appearance: 'auto', cursor: 'pointer' }}>
              <option value="">Sem imóvel associado</option>
              {properties.filter(p => p.status === 'available' || p.status === 'reserved').map(p => (
                <option key={p.id} value={p.id}>{p.title}{p.value ? ` · ${fmtBRL(p.value)}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="domus-label">Observação inicial</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Informações relevantes sobre o interesse..."
              style={{ ...inp, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} className="domus-btn domus-btn--secondary domus-btn--sm">Cancelar</button>
          <button onClick={handleCreate} disabled={saving} className="domus-btn domus-btn--primary domus-btn--sm">
            {saving ? 'Criando...' : 'Criar negociação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  dealId, brokerMap, onClose, onUpdated,
}: { dealId: string; brokerMap: Record<string, string>; onClose: () => void; onUpdated: () => void }) {
  const [deal,          setDeal]          = useState<Deal | null>(null)
  const [events,        setEvents]        = useState<DealEvent[]>([])
  const [noteText,      setNoteText]      = useState('')
  const [saving,        setSaving]        = useState(false)
  const [closeMode,     setCloseMode]     = useState(false)
  const [closeProp,     setCloseProp]     = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [loading,       setLoading]       = useState(true)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/deals/${dealId}`)
    if (res.ok) {
      const d = await res.json()
      setDeal(d.deal); setEvents(d.events ?? [])
    }
    setLoading(false)
  }, [dealId])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true)
    const res = await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) { await fetchDetail(); onUpdated() }
    setSaving(false)
  }

  const advance = () => {
    if (!deal) return
    const idx  = stageIdx(deal.stage)
    const next = STAGE_CFG[idx + 1]
    if (!next) return
    if (next.terminal) { setCloseMode(true); return }
    patch({ stage: next.key })
  }

  const retreat = () => {
    if (!deal) return
    const idx  = stageIdx(deal.stage)
    const prev = STAGE_CFG[idx - 1]
    if (!prev) return
    patch({ stage: prev.key })
  }

  const saveNote = async () => {
    if (!noteText.trim()) return
    await patch({ note: noteText.trim() })
    setNoteText('')
  }

  const handleDelete = async () => {
    setSaving(true)
    const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
    if (res.ok) { onUpdated(); onClose() }
    setSaving(false)
  }

  const handleClose = async (asLost: boolean) => {
    await patch({
      stage:         asLost ? 'lost' : 'closed',
      close_property: !asLost && closeProp,
      note:          asLost ? 'Negociação marcada como perdida' : 'Negociação fechada',
    })
    setCloseMode(false)
    onClose()
    onUpdated()
  }

  const sc   = deal ? stageCfg(deal.stage) : null
  const idx  = deal ? stageIdx(deal.stage) : -1
  const canAdvance = idx >= 0 && idx <= 3
  const canRetreat = idx > 0 && deal?.stage !== 'closed' && deal?.stage !== 'lost'
  const isTerminal = deal?.stage === 'closed' || deal?.stage === 'lost'

  const fmtEvtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,32,24,0.55)', backdropFilter: 'blur(4px)' }} />
      <div className="domus-card" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Negociação</p>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, fontWeight: 500, margin: 0 }}>
              {loading ? '...' : (deal?.lead?.name ?? '—')}
            </h2>
            {deal?.property && (
              <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: '3px 0 0' }}>{deal.property.title}</p>
            )}
            {deal?.lead?.broker_id && brokerMap[deal.lead.broker_id] && (
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={10} /> {brokerMap[deal.lead.broker_id]}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, marginTop: 2 }}>
            <X size={15} style={{ color: 'var(--domus-text-muted)' }} />
          </button>
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--domus-text-muted)', fontSize: 13 }}>Carregando...</div>
          ) : !deal ? (
            <p style={{ color: 'var(--domus-danger)', fontSize: 13 }}>Negociação não encontrada.</p>
          ) : (
            <>
              {/* Stage badge */}
              {sc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 'var(--domus-radius-pill)',
                    fontSize: 11, fontWeight: 500,
                    background: sc.bg, color: sc.color,
                    border: `1px solid ${sc.color}33`,
                  }}>
                    {sc.label}
                  </span>
                  {deal.property?.value && (
                    <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, color: 'var(--domus-brand)' }}>
                      {fmtBRL(deal.property.value)}
                    </span>
                  )}
                  {deal.stage === 'closed' && (
                    <button
                      onClick={() => setDeleteConfirm(v => !v)}
                      title="Excluir negócio"
                      style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-danger)', opacity: deleteConfirm ? 1 : 0.6 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Stage navigation */}
              {!isTerminal && !closeMode && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <button
                    onClick={retreat}
                    disabled={!canRetreat || saving}
                    className="domus-btn domus-btn--secondary domus-btn--sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <ChevronLeft size={13} /> Recuar
                  </button>
                  <button
                    onClick={advance}
                    disabled={!canAdvance || saving}
                    className="domus-btn domus-btn--primary domus-btn--sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Avançar <ChevronRight size={13} />
                  </button>
                  <button
                    onClick={() => setCloseMode(true)}
                    className="domus-btn domus-btn--secondary domus-btn--sm"
                    title="Encerrar negociação"
                  >
                    <Archive size={13} />
                  </button>
                </div>
              )}

              {/* Close/Lost mode */}
              {!isTerminal && closeMode && (
                <div style={{ marginBottom: 18, padding: '14px 16px', background: 'var(--domus-surface-sunken)', borderRadius: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: '0 0 12px', color: 'var(--domus-text)' }}>Encerrar negociação</p>
                  {deal.property_id && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--domus-text)', marginBottom: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={closeProp}
                        onChange={e => setCloseProp(e.target.checked)}
                        style={{ width: 14, height: 14, cursor: 'pointer' }}
                      />
                      Marcar imóvel como vendido
                    </label>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setCloseMode(false)}
                      className="domus-btn domus-btn--secondary domus-btn--sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleClose(true)}
                      disabled={saving}
                      className="domus-btn domus-btn--sm"
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--domus-danger-bg)', color: 'var(--domus-danger)', border: '1px solid var(--domus-danger)33' }}
                    >
                      Marcar como Perdido
                    </button>
                    <button
                      onClick={() => handleClose(false)}
                      disabled={saving}
                      className="domus-btn domus-btn--primary domus-btn--sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Check size={13} /> Fechar negócio
                    </button>
                  </div>
                </div>
              )}

              {/* Add note */}
              {!isTerminal && (
                <div style={{ marginBottom: 20 }}>
                  <label className="domus-label">Adicionar nota</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      rows={2}
                      placeholder="Registre uma observação..."
                      style={{
                        flex: 1, fontFamily: 'var(--domus-font-ui)', fontSize: 12,
                        background: 'var(--domus-white)', border: '1px solid var(--domus-border)',
                        borderRadius: 'var(--domus-radius-sm)', padding: '8px 10px',
                        color: 'var(--domus-text)', outline: 'none', resize: 'none', lineHeight: 1.5,
                      }}
                    />
                    <button
                      onClick={saveNote}
                      disabled={saving || !noteText.trim()}
                      className="domus-btn domus-btn--primary domus-btn--sm"
                      style={{ alignSelf: 'flex-end' }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              {/* Delete confirmation */}
              {deal.stage === 'closed' && deleteConfirm && (
                <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--domus-danger-bg)', borderRadius: 8, border: '1px solid var(--domus-danger)33' }}>
                  <p style={{ fontSize: 12, color: 'var(--domus-danger)', margin: '0 0 10px', fontWeight: 500 }}>Excluir permanentemente este negócio?</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setDeleteConfirm(false)} className="domus-btn domus-btn--secondary domus-btn--sm" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                    <button onClick={handleDelete} disabled={saving} className="domus-btn domus-btn--sm" style={{ flex: 1, justifyContent: 'center', background: 'var(--domus-danger)', color: '#fff', border: 'none' }}>Excluir</button>
                  </div>
                </div>
              )}

              {/* Event history */}
              {events.length > 0 && (
                <div>
                  <p className="domus-eyebrow" style={{ fontSize: 9, marginBottom: 10 }}>Histórico</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...events].reverse().map(ev => {
                      const from = ev.from_stage ? stageCfg(ev.from_stage) : null
                      const to   = stageCfg(ev.to_stage)
                      const isStageChange = ev.from_stage !== null && ev.from_stage !== ev.to_stage
                      return (
                        <div key={ev.id} style={{ padding: '10px 12px', background: 'var(--domus-surface)', borderRadius: 8, fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: ev.note ? 5 : 0 }}>
                            {isStageChange && from ? (
                              <>
                                <span style={{ color: from.color, fontWeight: 500 }}>{from.label}</span>
                                <ChevronRight size={10} style={{ color: 'var(--domus-text-muted)', flexShrink: 0 }} />
                                <span style={{ color: to.color, fontWeight: 500 }}>{to.label}</span>
                              </>
                            ) : (
                              <span style={{ color: 'var(--domus-text-muted)' }}>Nota</span>
                            )}
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--domus-text-muted)', fontFamily: 'var(--domus-font-mono)', flexShrink: 0 }}>
                              {fmtEvtDate(ev.created_at)}
                            </span>
                          </div>
                          {ev.note && (
                            <p style={{ margin: 0, color: 'var(--domus-text-secondary)', lineHeight: 1.5 }}>{ev.note}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { companyId } = useCompany()
  const [deals,       setDeals]       = useState<Deal[]>([])
  const [leads,       setLeads]       = useState<Lead[]>([])
  const [properties,  setProperties]  = useState<Property[]>([])
  const [brokerMap,   setBrokerMap]   = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(true)
  const [archived,    setArchived]    = useState(false)
  const [showCreate,  setShowCreate]  = useState(false)
  const [detailId,    setDetailId]    = useState<string | null>(null)
  const [refreshing,  setRefreshing]  = useState(false)

  const fetchDeals = useCallback(async () => {
    if (!companyId) return
    const res = await fetch(`/api/deals${archived ? '?archived=true' : ''}`)
    if (res.ok) { const { deals: d } = await res.json(); setDeals(d ?? []) }
  }, [companyId, archived])

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    const init = async () => {
      setLoading(true)
      const [dr, lr, pr, ur] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/leads'),
        fetch('/api/properties'),
        fetch('/api/users'),
      ])
      if (dr.ok) { const { deals: d }      = await dr.json(); setDeals(d ?? []) }
      if (lr.ok) { const { leads: d }      = await lr.json(); setLeads(d ?? []) }
      if (pr.ok) { const { properties: d } = await pr.json(); setProperties(d ?? []) }
      if (ur.ok) {
        const { users } = await ur.json()
        const map: Record<string, string> = {}
        for (const u of (users ?? [])) map[u.id] = u.name || u.email
        setBrokerMap(map)
      }
      setLoading(false)
    }
    init()
  }, [companyId])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDeals()
    setRefreshing(false)
  }

  const quickAdvance = async (deal: Deal) => {
    const idx  = stageIdx(deal.stage)
    const next = STAGE_CFG[idx + 1]
    if (!next || next.terminal) return
    await fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: next.key }),
    })
    await fetchDeals()
  }

  // KPIs
  const now       = new Date()
  const mStart    = new Date(now.getFullYear(), now.getMonth(), 1)
  const active    = deals.filter(d => d.stage !== 'closed' && d.stage !== 'lost').length
  const closedMo  = deals.filter(d => d.stage === 'closed' && d.closed_at && new Date(d.closed_at) >= mStart).length
  const closedAll = deals.filter(d => d.stage === 'closed').length
  const lostAll   = deals.filter(d => d.stage === 'lost').length
  const convRate  = (closedAll + lostAll) > 0 ? Math.round((closedAll / (closedAll + lostAll)) * 100) : 0
  const ticketAvg = (() => {
    const closed = deals.filter(d => d.stage === 'closed' && d.property?.value)
    return closed.length > 0 ? closed.reduce((s, d) => s + (d.property?.value ?? 0), 0) / closed.length : 0
  })()

  const cols = archived ? ['lost' as DealStage] : ACTIVE_COLS

  return (
    <div>
      <style>{`@keyframes pl-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Pipeline</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>Pipeline de Negócios</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', border: '1px solid var(--domus-border)', borderRadius: 6, overflow: 'hidden' }}>
              {([
                { key: false, label: 'Ativas' },
                { key: true,  label: 'Arquivadas' },
              ] as const).map(({ key, label }) => (
                <button
                  key={String(key)}
                  onClick={() => setArchived(key)}
                  style={{
                    padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12,
                    background: archived === key ? 'var(--domus-brand)' : 'transparent',
                    color: archived === key ? '#fff' : 'var(--domus-text-muted)',
                    transition: 'background 140ms, color 140ms',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className="domus-btn domus-btn--secondary domus-btn--sm">
              <RefreshCw size={13} style={{ animation: refreshing ? 'pl-spin 1s linear infinite' : 'none' }} />
              Atualizar
            </button>
            <button onClick={() => setShowCreate(true)} className="domus-btn domus-btn--primary domus-btn--sm">
              <Plus size={13} /> Nova negociação
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 40px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          <KPI label="Negociações ativas"     value={active}                                       accent="var(--domus-brand)" />
          <KPI label="Fechadas este mês"      value={closedMo}                                     accent="var(--domus-success)" />
          <KPI label="Taxa de conversão"      value={`${convRate}%`}                               accent="var(--domus-warning)" />
          <KPI label="Ticket médio fechado"   value={ticketAvg > 0 ? fmtBRL(ticketAvg) : '—'}     accent="var(--domus-text-muted)" />
        </div>

        {/* Kanban */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--domus-text-muted)' }}>
            <span style={{ width: 24, height: 24, border: '2px solid var(--domus-border)', borderTopColor: 'var(--domus-brand)', borderRadius: '50%', display: 'inline-block', animation: 'pl-spin 0.8s linear infinite', marginRight: 12 }} />
            Carregando...
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
            {cols.map(stageKey => {
              const cfg    = stageCfg(stageKey)
              const colDeals = deals.filter(d => d.stage === stageKey)
              return (
                <div key={stageKey} style={{ minWidth: 220, width: 220, flexShrink: 0 }}>
                  {/* Column header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px', borderRadius: 8,
                    background: cfg.bg, marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--domus-font-mono)',
                      background: 'rgba(255,255,255,0.55)', color: cfg.color,
                      padding: '1px 7px', borderRadius: 99,
                    }}>
                      {colDeals.length}
                    </span>
                  </div>

                  {/* Cards */}
                  {colDeals.length === 0 ? (
                    <div style={{
                      padding: '24px 0', textAlign: 'center',
                      border: '1.5px dashed var(--domus-border)', borderRadius: 8,
                      fontSize: 11, color: 'var(--domus-text-muted)',
                    }}>
                      Sem negociações
                    </div>
                  ) : (
                    colDeals.map(d => (
                      <DealCard
                        key={d.id}
                        deal={d}
                        brokerName={d.lead?.broker_id ? brokerMap[d.lead.broker_id] : undefined}
                        onOpen={() => setDetailId(d.id)}
                        onAdvance={() => quickAdvance(d)}
                      />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {deals.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0 40px' }}>
            <Handshake size={36} style={{ color: 'var(--domus-text-muted)', opacity: 0.25, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: 'var(--domus-text-muted)', margin: '0 0 16px' }}>
              {archived ? 'Nenhuma negociação arquivada.' : 'Nenhuma negociação ativa. Crie a primeira para começar.'}
            </p>
            {!archived && (
              <button onClick={() => setShowCreate(true)} className="domus-btn domus-btn--primary domus-btn--sm">
                <Plus size={13} /> Nova negociação
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          leads={leads}
          properties={properties}
          onClose={() => setShowCreate(false)}
          onCreated={fetchDeals}
        />
      )}

      {detailId && (
        <DetailModal
          dealId={detailId}
          brokerMap={brokerMap}
          onClose={() => setDetailId(null)}
          onUpdated={fetchDeals}
        />
      )}
    </div>
  )
}
