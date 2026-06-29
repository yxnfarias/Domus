'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CalendarCheck, CalendarPlus, Unlink, Clock, MapPin, User,
  RefreshCw, AlertCircle, ExternalLink, Copy, Check,
  ChevronLeft, ChevronRight, Pencil, Trash2, X,
} from 'lucide-react'
import type { Lead, Property } from '@/lib/types'
import { useCompany } from '@/lib/company-context'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'

const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_SHORT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

type GCalEvent = {
  id: string
  summary?: string | null
  description?: string | null
  location?: string | null
  start?: { dateTime?: string | null; date?: string | null } | null
  end?:   { dateTime?: string | null } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function eventDateKey(ev: GCalEvent): string | null {
  const dt = ev.start?.dateTime ?? ev.start?.date
  return dt ? dt.slice(0, 10) : null
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function buildCalDays(year: number, month: number): Date[] {
  const firstDow     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const days: Date[] = []
  for (let i = firstDow; i > 0; i--) days.push(new Date(year, month, 1 - i))
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
  const rem = (7 - (days.length % 7)) % 7
  for (let d = 1; d <= rem; d++) days.push(new Date(year, month + 1, d))
  return days
}

function addOneHour(dtLocal: string): string {
  const d = new Date(dtLocal + ':00')
  d.setHours(d.getHours() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Setup Guide ─────────────────────────────────────────────────────────────
function SetupGuide() {
  const [copied, setCopied] = useState<string | null>(null)
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/calendar/callback`
    : '/api/calendar/callback'
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }
  const steps = [
    { n: 1, title: 'Abra o Google Cloud Console', body: (
      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
        className="domus-btn domus-btn--secondary domus-btn--sm"
        style={{ textDecoration: 'none', marginTop: 8, display: 'inline-flex' }}>
        <ExternalLink size={13} /> Abrir Google Cloud Console
      </a>
    )},
    { n: 2, title: 'Crie credenciais OAuth 2.0', body: (
      <p style={{ fontSize: 13, color: 'var(--domus-text-secondary)', margin: 0, lineHeight: 1.6 }}>
        Em <strong>Credenciais</strong> → <strong>Criar credenciais</strong> → <strong>ID do cliente OAuth</strong><br />
        Tipo: <strong>Aplicativo da Web</strong>
      </p>
    )},
    { n: 3, title: 'Adicione a URI de redirecionamento autorizada', body: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <code style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 12, background: 'var(--domus-surface)', border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-sm)', padding: '6px 10px', color: 'var(--domus-brand)', flex: 1, wordBreak: 'break-all' }}>
          {redirectUri}
        </code>
        <button onClick={() => copy(redirectUri, 'uri')} className="domus-btn domus-btn--secondary domus-btn--sm" style={{ flexShrink: 0 }}>
          {copied === 'uri' ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    )},
    { n: 4, title: 'Cole as credenciais no .env.local', body: (
      <div style={{ position: 'relative', marginTop: 6 }}>
        <pre style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 11, background: 'var(--domus-surface)', border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-sm)', padding: '10px 12px', color: 'var(--domus-text)', margin: 0, lineHeight: 1.7, overflowX: 'auto' }}>
{`GOOGLE_CLIENT_ID=cole_aqui\nGOOGLE_CLIENT_SECRET=cole_aqui\nNEXT_PUBLIC_APP_URL=http://localhost:3000`}
        </pre>
        <button onClick={() => copy('GOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nNEXT_PUBLIC_APP_URL=http://localhost:3000', 'env')}
          className="domus-btn domus-btn--secondary domus-btn--sm"
          style={{ position: 'absolute', top: 8, right: 8 }}>
          {copied === 'env' ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    )},
    { n: 5, title: 'Reinicie o servidor e clique em Conectar', body: (
      <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', margin: 0 }}>
        Após reiniciar com <code style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 11 }}>npm run dev</code>, o botão de conexão aparecerá aqui automaticamente.
      </p>
    )},
  ]
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 24, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--domus-radius-md)' }}>
        <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: 'var(--domus-text)', margin: 0, lineHeight: 1.5 }}>
          <strong>Integração Google não configurada.</strong> Siga os passos abaixo uma única vez para habilitar para todas as contas.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map(({ n, title, body }) => (
          <div key={n} style={{ display: 'flex', gap: 14, padding: '16px 18px', background: 'var(--domus-white)', border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-md)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--domus-brand)', color: '#fff', fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 6px', color: 'var(--domus-text)' }}>{title}</p>
              {body}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────
function ScheduleModal({ leads, properties, companyId, onClose, onCreated }: {
  leads: Lead[]; properties: Property[]; companyId: string; onClose: () => void; onCreated: () => void
}) {
  const [form, setForm] = useState({ leadId: '', propertyId: '', title: '', location: '', date: '', time: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }))
  const selectedLead     = leads.find(l => l.id === form.leadId)
  const selectedProperty = properties.find(p => p.id === form.propertyId)

  const handlePropertyChange = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId)
    set({ propertyId, location: prop?.address ?? form.location })
  }

  const handleSubmit = async () => {
    if (!form.date || !form.time) { setError('Data e hora são obrigatórias.'); return }
    setSaving(true); setError('')
    try {
      const start       = `${form.date}T${form.time}`
      const end         = addOneHour(start)
      const title       = form.title || (selectedLead ? `Visita — ${selectedLead.name}` : 'Visita')
      const description = [
        selectedLead     ? `Lead: ${selectedLead.name}` : '',
        selectedLead     ? `WhatsApp: ${selectedLead.whatsapp}` : '',
        selectedProperty ? `Imóvel: ${selectedProperty.title}` : '',
        form.notes,
      ].filter(Boolean).join('\n')

      const res = await fetch(`/api/calendar/events?company_id=${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, location: form.location, start, end }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Falha ao criar evento')
      onCreated(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao agendar visita')
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = {
    fontFamily: 'var(--domus-font-ui)', fontSize: 13, background: 'var(--domus-white)',
    border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-sm)',
    padding: '9px 11px', color: 'var(--domus-text)', width: '100%', outline: 'none',
  }
  const col2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const field = (label: string, children: React.ReactNode, hint?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 10, color: 'var(--domus-text-muted)', margin: 0 }}>{hint}</p>}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,32,24,0.52)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--domus-white)', borderRadius: 16, boxShadow: '0 24px 64px rgba(8,32,24,0.24)', width: 'min(560px, 100%)', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10, marginBottom: 3 }}>Visitas</p>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0 }}>Agendar visita</h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, marginTop: 2 }}>
            <X size={15} style={{ color: 'var(--domus-text-muted)' }} />
          </button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={col2}>
            {field('Lead',
              <select value={form.leadId} onChange={e => set({ leadId: e.target.value })} style={{ ...inp, appearance: 'auto', cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            {field('Imóvel',
              <select value={form.propertyId} onChange={e => handlePropertyChange(e.target.value)} style={{ ...inp, appearance: 'auto', cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>,
              selectedProperty?.address ? '📍 Local preenchido automaticamente' : undefined
            )}
          </div>
          <div style={col2}>
            {field('Data *', <input type="date" value={form.date} onChange={e => set({ date: e.target.value })} style={inp} />)}
            {field('Hora *', <input type="time" value={form.time} onChange={e => set({ time: e.target.value })} style={inp} />, 'Duração: 1 hora')}
          </div>
          {field('Título', <input type="text" placeholder={selectedLead ? `Visita — ${selectedLead.name}` : 'Ex: Visita ao imóvel'} value={form.title} onChange={e => set({ title: e.target.value })} style={inp} />)}
          {field('Local', <input type="text" placeholder="Endereço da visita" value={form.location} onChange={e => set({ location: e.target.value })} style={inp} />)}
          {field('Observações', <textarea placeholder="Notas adicionais..." value={form.notes} onChange={e => set({ notes: e.target.value })} rows={2} style={{ ...inp, resize: 'none', lineHeight: 1.5 }} />)}
          {error && <p style={{ fontSize: 12, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--domus-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="domus-btn domus-btn--secondary domus-btn--sm">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || !form.date || !form.time} className="domus-btn domus-btn--primary domus-btn--sm">
            <CalendarPlus size={13} />{saving ? 'Agendando...' : 'Agendar visita'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ event, companyId, onClose, onSaved }: {
  event: GCalEvent; companyId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    title:       event.summary    ?? '',
    start:       event.start?.dateTime?.slice(0, 16) ?? '',
    location:    event.location   ?? '',
    description: event.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }))

  const inp: React.CSSProperties = {
    fontFamily: 'var(--domus-font-ui)', fontSize: 14, background: 'var(--domus-white)',
    border: '1px solid var(--domus-border)', borderRadius: 'var(--domus-radius-sm)',
    padding: '10px 12px', color: 'var(--domus-text)', width: '100%', outline: 'none',
  }

  const handleSave = async () => {
    if (!form.start) { setError('Data e hora são obrigatórias.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/calendar/events/${event.id}?company_id=${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erro ao salvar')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(8,32,24,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--domus-white)', borderRadius: 'var(--domus-radius-lg)', boxShadow: '0 24px 60px rgba(8,32,24,0.22)', width: 'min(440px, calc(100vw - 48px))' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, fontWeight: 500, margin: 0 }}>Editar visita</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={15} style={{ color: 'var(--domus-text-muted)' }} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Título', key: 'title' as const, type: 'text' },
            { label: 'Data e hora', key: 'start' as const, type: 'datetime-local' },
            { label: 'Local', key: 'location' as const, type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>{label}</label>
              <input type={type} value={form[key]} onChange={e => set({ [key]: e.target.value })} style={inp} />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--domus-text-muted)' }}>Observações</label>
            <textarea value={form.description} onChange={e => set({ description: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--domus-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="domus-btn domus-btn--secondary domus-btn--sm">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="domus-btn domus-btn--primary domus-btn--sm">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Modal ────────────────────────────────────────────────────────────────
function DayModal({ date, events, companyId, onClose, onChanged }: {
  date: Date; events: GCalEvent[]; companyId: string
  onClose: () => void; onChanged: () => void
}) {
  const [editingEvent, setEditingEvent] = useState<GCalEvent | null>(null)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [localEvents, setLocalEvents]   = useState(events)
  const [confirmDelete, setConfirmDelete] = useState<GCalEvent | null>(null)

  const handleDelete = async (ev: GCalEvent) => {
    setConfirmDelete(null)
    setDeleting(ev.id)
    try {
      const res = await fetch(`/api/calendar/events/${ev.id}?company_id=${companyId}`, { method: 'DELETE' })
      if (res.ok) {
        const next = localEvents.filter(e => e.id !== ev.id)
        setLocalEvents(next)
        onChanged()
        if (next.length === 0) onClose()
      }
    } finally { setDeleting(null) }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,32,24,0.52)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div style={{ background: 'var(--domus-white)', borderRadius: 16, boxShadow: '0 32px 72px rgba(8,32,24,0.28)', width: 'min(460px, 100%)', maxHeight: 'calc(100vh - 80px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--domus-brand)', padding: '20px 22px 18px', position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, border: 'none', background: 'rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color="#fff" />
            </button>
            <p style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.55)', margin: '0 0 6px', textTransform: 'uppercase' }}>Visitas agendadas</p>
            <h3 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 18, fontWeight: 500, margin: 0, color: '#fff', textTransform: 'capitalize' }}>
              {fmtDateLong(date)}
            </h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--domus-font-mono)' }}>
              {localEvents.length} {localEvents.length === 1 ? 'visita' : 'visitas'}
            </span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {localEvents.map((ev, i) => {
              const timeFrom = ev.start?.dateTime ? fmtTime(ev.start.dateTime) : null
              const timeTo   = ev.end?.dateTime   ? fmtTime(ev.end.dateTime)   : null
              return (
                <div key={ev.id} style={{ padding: '16px 22px', borderBottom: i < localEvents.length - 1 ? '1px solid var(--domus-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    {timeFrom ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'var(--domus-green-50)', border: '1px solid rgba(15,61,46,0.1)' }}>
                        <Clock size={11} style={{ color: 'var(--domus-brand)' }} />
                        <span style={{ fontSize: 12, color: 'var(--domus-brand)', fontFamily: 'var(--domus-font-mono)', fontWeight: 600 }}>
                          {timeFrom}{timeTo ? ` – ${timeTo}` : ''}
                        </span>
                      </div>
                    ) : <div />}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditingEvent(ev)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--domus-border)', background: 'var(--domus-white)', cursor: 'pointer', fontSize: 11, color: 'var(--domus-text-secondary)' }}>
                        <Pencil size={11} /> Editar
                      </button>
                      <button onClick={() => setConfirmDelete(ev)} disabled={deleting === ev.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(178,58,42,0.2)', background: 'var(--domus-danger-bg)', cursor: 'pointer', fontSize: 11, color: 'var(--domus-danger)' }}>
                        <Trash2 size={11} /> {deleting === ev.id ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px', color: 'var(--domus-text)', lineHeight: 1.3 }}>
                    {ev.summary ?? 'Visita'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {ev.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={11} style={{ color: 'var(--domus-text-muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--domus-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location}</span>
                      </div>
                    )}
                    {ev.description && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 10px', borderRadius: 6, background: 'var(--domus-surface)', marginTop: 4 }}>
                        <User size={11} style={{ color: 'var(--domus-text-muted)', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11, color: 'var(--domus-text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{ev.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editingEvent && (
        <EditModal
          event={editingEvent}
          companyId={companyId}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); onChanged(); onClose() }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir visita"
        message={`Tem certeza que deseja excluir "${confirmDelete?.summary ?? 'Visita'}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ events, companyId, onRefresh }: {
  events: GCalEvent[]; companyId: string; onRefresh: () => void
}) {
  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selected,  setSelected]  = useState<{ date: Date; events: GCalEvent[] } | null>(null)

  const eventMap = useMemo(() => {
    const map = new Map<string, GCalEvent[]>()
    for (const ev of events) {
      const key = eventDateKey(ev)
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  const calDays  = useMemo(() => buildCalDays(viewYear, viewMonth), [viewYear, viewMonth])
  const todayKey = toDateKey(now)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  return (
    <>
      <div className="domus-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--domus-border)' }}>
          <button onClick={prevMonth} className="domus-btn domus-btn--secondary domus-btn--sm" style={{ padding: '6px 10px' }}>
            <ChevronLeft size={14} />
          </button>
          <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, fontWeight: 500, margin: 0 }}>
            {MONTHS_LONG[viewMonth]} {viewYear}
          </p>
          <button onClick={nextMonth} className="domus-btn domus-btn--secondary domus-btn--sm" style={{ padding: '6px 10px' }}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--domus-border)', background: 'var(--domus-surface)' }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', color: 'var(--domus-text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 86 }}>
          {calDays.map((day, idx) => {
            const key       = toDateKey(day)
            const dayEvents = eventMap.get(key) ?? []
            const isMonth   = day.getMonth() === viewMonth
            const isToday   = key === todayKey
            const hasEvents = dayEvents.length > 0
            const isLastRow = idx >= calDays.length - 7
            const isLastCol = idx % 7 === 6

            return (
              <div
                key={idx}
                onClick={hasEvents ? () => setSelected({ date: day, events: dayEvents }) : undefined}
                style={{
                  height: 86, overflow: 'hidden',
                  padding: '7px 7px 5px',
                  borderRight:  isLastCol ? 'none' : '1px solid var(--domus-border)',
                  borderBottom: isLastRow ? 'none' : '1px solid var(--domus-border)',
                  opacity: isMonth ? 1 : 0.28,
                  cursor: hasEvents ? 'pointer' : 'default',
                  transition: 'background 120ms',
                  background: isToday ? 'rgba(15,61,46,0.03)' : 'transparent',
                }}
                onMouseEnter={e => { if (hasEvents) (e.currentTarget as HTMLDivElement).style.background = 'rgba(15,61,46,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isToday ? 'rgba(15,61,46,0.03)' : 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: isToday ? 700 : 400,
                    background: isToday ? 'var(--domus-brand)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--domus-text)',
                    flexShrink: 0,
                  }}>
                    {day.getDate()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 3, background: 'var(--domus-brand)' }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#fff', fontFamily: 'var(--domus-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Visita
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: 9, color: 'var(--domus-text-muted)', fontFamily: 'var(--domus-font-mono)', paddingLeft: 6 }}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <DayModal
          date={selected.date}
          events={selected.events}
          companyId={companyId}
          onClose={() => setSelected(null)}
          onChanged={() => { onRefresh(); setSelected(null) }}
        />
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VisistarPage() {
  const { companyId } = useCompany()
  const [configured, setConfigured] = useState(false)
  const [connected,  setConnected]  = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [events,     setEvents]     = useState<GCalEvent[]>([])
  const [leads,      setLeads]      = useState<Lead[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [scheduler,  setScheduler]  = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchEvents = useCallback(async () => {
    if (!companyId) return
    const res = await fetch(`/api/calendar/events?company_id=${companyId}`)
    if (res.ok) {
      const { events: d } = await res.json()
      setEvents(d ?? [])
    } else if (res.status === 401) {
      // Token expirado ou revogado — volta para estado "desconectado"
      setConnected(false)
      setEvents([])
    }
  }, [companyId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('connected') || params.has('error')) {
      window.history.replaceState({}, '', '/dashboard/visistar')
    }
  }, [])

  useEffect(() => {
    if (!companyId) return
    const init = async () => {
      setLoading(true)
      try {
        const [statusRes, leadsRes, propsRes] = await Promise.all([
          fetch(`/api/calendar/status?company_id=${companyId}`),
          fetch('/api/leads'),
          fetch('/api/properties'),
        ])
        const { configured: cfg, connected: conn } = await statusRes.json()
        setConfigured(cfg); setConnected(conn)
        if (leadsRes.ok)  { const { leads: d }      = await leadsRes.json();  setLeads(d ?? []) }
        if (propsRes.ok)  { const { properties: d } = await propsRes.json();  setProperties(d ?? []) }
        if (conn) await fetchEvents()
      } finally { setLoading(false) }
    }
    init()
  }, [companyId, fetchEvents])

  const handleRefresh    = async () => { setRefreshing(true); await fetchEvents(); setRefreshing(false) }
  const handleDisconnect = async () => {
    await fetch(`/api/calendar/disconnect?company_id=${companyId}`, { method: 'DELETE' })
    setConnected(false); setEvents([])
  }

  const today  = new Date().toDateString()
  const todayN = events.filter(e => { const d = e.start?.dateTime ?? e.start?.date; return d ? new Date(d).toDateString() === today : false }).length
  const week7N = events.filter(e => { const d = e.start?.dateTime ?? e.start?.date; if (!d) return false; const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 7 }).length

  return (
    <div>
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Visitas</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>Agendamento de Visitas</h1>
          </div>
          {connected && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleRefresh} disabled={refreshing} className="domus-btn domus-btn--secondary domus-btn--sm">
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
              </button>
              <button onClick={() => setScheduler(true)} className="domus-btn domus-btn--primary domus-btn--sm">
                <CalendarPlus size={13} /> Agendar visita
              </button>
              <button onClick={handleDisconnect} className="domus-btn domus-btn--secondary domus-btn--sm" style={{ color: 'var(--domus-danger)' }}>
                <Unlink size={13} /> Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--domus-text-muted)' }}>
            <CalendarCheck size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Carregando...</p>
          </div>
        ) : !configured ? (
          <SetupGuide />
        ) : !connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 40px', border: '1px dashed var(--domus-border)', borderRadius: 'var(--domus-radius-lg)', maxWidth: 420, margin: '0 auto' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(15,61,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <CalendarCheck size={26} style={{ color: 'var(--domus-brand)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 20, fontWeight: 500, margin: '0 0 8px' }}>Conectar Google Calendar</h2>
            <p style={{ fontSize: 14, color: 'var(--domus-text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
              Agende visitas com seus leads diretamente na sua agenda. Os eventos sincronizam automaticamente.
            </p>
            <a href={`/api/calendar/auth?company_id=${companyId}`} className="domus-btn domus-btn--primary" style={{ textDecoration: 'none', justifyContent: 'center', width: '100%' }}>
              <CalendarCheck size={16} /> Conectar Google Calendar
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { label: 'Visitas hoje',    value: todayN,        accent: 'var(--domus-brand)' },
                { label: 'Próximos 7 dias', value: week7N,        accent: 'var(--domus-warning)' },
                { label: 'Total agendado',  value: events.length, accent: 'var(--domus-text-muted)' },
              ].map(({ label, value, accent }) => (
                <div key={label} className="domus-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '8px 8px 0 0' }} />
                  <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', margin: 0, color: 'var(--domus-text)', lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '6px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>
            <CalendarView events={events} companyId={companyId} onRefresh={fetchEvents} />
          </div>
        )}
      </div>

      {scheduler && (
        <ScheduleModal
          leads={leads}
          properties={properties}
          companyId={companyId}
          onClose={() => setScheduler(false)}
          onCreated={fetchEvents}
        />
      )}
    </div>
  )
}
