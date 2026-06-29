'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Property } from '@/lib/types'
import { readCache, writeCache } from '@/lib/route-cache'
import type { PropertyStatus } from '@/lib/types'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import {
  Plus, RefreshCw, Building2, Bed, Bath, Car, Maximize2,
  DoorOpen, Pencil, Trash2, X, Upload, ChevronLeft, ChevronRight, Clock, ChevronDown,
} from 'lucide-react'

const STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  available:      { label: 'Disponível',    color: 'var(--domus-success)',    bg: 'var(--domus-success-bg)' },
  reserved:       { label: 'Reservado',     color: 'var(--domus-warning)',    bg: 'var(--domus-warning-bg)' },
  under_contract: { label: 'Em contrato',   color: 'var(--domus-brand)',      bg: 'var(--domus-green-50)' },
  sold:           { label: 'Vendido',       color: 'var(--domus-text-muted)', bg: 'var(--domus-ink-100)' },
}

const STATUS_OPTIONS: PropertyStatus[] = ['available', 'reserved', 'under_contract', 'sold']

function daysOnMarket(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

import { useCompany } from '@/lib/company-context'

const fmt = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// ─── Property Card ────────────────────────────────────────────────────────────
function PropertyCard({
  property,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  property: Property
  onEdit: (p: Property) => void
  onDelete: (id: string) => void
  onStatusChange: (p: Property, newStatus: PropertyStatus) => void
}) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [statusMenu, setStatusMenu] = useState(false)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const photos = property.photo_urls ?? []

  useEffect(() => {
    if (!statusMenu) return
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusMenu])

  return (
    <div
      className="domus-card"
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Photo area */}
      <div style={{ position: 'relative', height: 180, background: 'var(--domus-surface-sunken)', flexShrink: 0 }}>
        {photos.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[photoIndex]}
              alt={property.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                  style={{
                    position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                    width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.45)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={14} color="#fff" />
                </button>
                <button
                  onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.45)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={14} color="#fff" />
                </button>
                <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                  {photos.map((_, i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.45)' }} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <Building2 size={32} style={{ color: 'var(--domus-text-muted)', opacity: 0.4 }} />
            <span style={{ fontSize: 11, color: 'var(--domus-text-muted)' }}>Sem fotos</span>
          </div>
        )}
        {/* Status badge */}
        {(() => {
          const sc = STATUS_CONFIG[property.status as PropertyStatus] ?? STATUS_CONFIG.available
          return (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              padding: '3px 10px', borderRadius: 'var(--domus-radius-pill)',
              fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.06em', fontWeight: 500,
              background: sc.bg, color: sc.color,
            }}>
              {sc.label}
            </div>
          )
        })()}

        {/* Time on market (for available/reserved) */}
        {(property.status === 'available' || property.status === 'reserved') && (() => {
          const days = daysOnMarket(property.created_at)
          const warn = days > 60
          return (
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              padding: '2px 8px', borderRadius: 99,
              fontSize: 9, fontFamily: 'var(--domus-font-mono)', fontWeight: 500,
              background: warn ? 'rgba(178,58,42,0.85)' : 'rgba(8,32,24,0.6)',
              color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Clock size={8} />
              {days === 0 ? 'Hoje' : `${days}d`}
            </div>
          )
        })()}
      </div>

      {/* Info */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)', lineHeight: 1.3 }}>
            {property.title}
          </h3>
          {property.address && (
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '4px 0 0' }}>{property.address}</p>
          )}
          {property.region && (
            <span style={{ display: 'inline-block', marginTop: 5, fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 'var(--domus-radius-pill)', background: 'var(--domus-green-50)', color: 'var(--domus-green-600)' }}>
              {property.region}
            </span>
          )}
        </div>

        {/* Specs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {property.area_m2 != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--domus-text-secondary)' }}>
              <Maximize2 size={11} /> {property.area_m2} m²
            </span>
          )}
          {property.rooms > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--domus-text-secondary)' }}>
              <DoorOpen size={11} /> {property.rooms} cômodos
            </span>
          )}
          {property.bedrooms > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--domus-text-secondary)' }}>
              <Bed size={11} /> {property.bedrooms} quartos
            </span>
          )}
          {property.bathrooms > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--domus-text-secondary)' }}>
              <Bath size={11} /> {property.bathrooms} banheiros
            </span>
          )}
          {property.parking_spots > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--domus-text-secondary)' }}>
              <Car size={11} /> {property.parking_spots} vagas
            </span>
          )}
        </div>

        {/* Value */}
        <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 400, letterSpacing: '-0.01em', color: 'var(--domus-brand)', margin: 0 }}>
          {fmt(property.value)}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {/* Status selector */}
          <div ref={statusMenuRef} style={{ flex: 1, position: 'relative' }}>
            <button
              onClick={() => setStatusMenu(v => !v)}
              className="domus-btn domus-btn--secondary domus-btn--sm"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: STATUS_CONFIG[property.status as PropertyStatus]?.color ?? 'var(--domus-text-muted)',
                }} />
                {STATUS_CONFIG[property.status as PropertyStatus]?.label ?? property.status}
              </span>
              <ChevronDown size={11} style={{ color: 'var(--domus-text-muted)', flexShrink: 0 }} />
            </button>

            {statusMenu && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4,
                background: 'var(--domus-white)',
                border: '1px solid var(--domus-border)',
                borderRadius: 8,
                boxShadow: 'var(--domus-shadow-3)',
                overflow: 'hidden',
                zIndex: 50,
              }}>
                {STATUS_OPTIONS.map(s => {
                  const cfg = STATUS_CONFIG[s]
                  const isCurrent = s === property.status
                  return (
                    <button
                      key={s}
                      disabled={isCurrent}
                      onClick={() => { setStatusMenu(false); onStatusChange(property, s) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 12px', border: 'none', cursor: isCurrent ? 'default' : 'pointer',
                        background: isCurrent ? 'var(--domus-surface)' : 'transparent',
                        fontSize: 12, color: isCurrent ? 'var(--domus-text-muted)' : 'var(--domus-text)',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                      {cfg.label}
                      {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--domus-text-muted)' }}>atual</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button onClick={() => onEdit(property)} className="domus-btn domus-btn--secondary domus-btn--sm">
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(property.id)}
            className="domus-btn domus-btn--secondary domus-btn--sm"
            style={{ color: 'var(--domus-danger)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
const REGIONS = ['Centro','Zona Norte','Zona Sul','Zona Leste','Zona Oeste','Grande São Paulo','Interior de SP','Litoral','Outro']

interface PropertyForm {
  title: string
  description: string
  address: string
  region: string
  area_m2: string
  rooms: string
  bedrooms: string
  bathrooms: string
  parking_spots: string
  value: string
}

const emptyForm: PropertyForm = {
  title: '', description: '', address: '', region: '', area_m2: '',
  rooms: '', bedrooms: '', bathrooms: '', parking_spots: '', value: '',
}

function PropertyModal({
  property,
  onClose,
  onSaved,
}: {
  property: Property | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = property != null
  const [form, setForm] = useState<PropertyForm>(
    isEdit ? {
      title:         property.title,
      description:   property.description   ?? '',
      address:       property.address        ?? '',
      region:        property.region         ?? '',
      area_m2:       property.area_m2 != null ? String(property.area_m2) : '',
      rooms:         String(property.rooms),
      bedrooms:      String(property.bedrooms),
      bathrooms:     String(property.bathrooms),
      parking_spots: String(property.parking_spots),
      value:         property.value != null ? String(property.value) : '',
    } : emptyForm
  )
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(property?.photo_urls ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [valueDisplay, setValueDisplay] = useState(
    property?.value != null
      ? Math.round(property.value).toLocaleString('pt-BR')
      : ''
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof PropertyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleValueInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const formatted = digits ? parseInt(digits, 10).toLocaleString('pt-BR') : ''
    setValueDisplay(formatted)
    setForm(f => ({ ...f, value: digits }))
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    setPhotos(prev => [...prev, ...arr])
    arr.forEach(f => {
      const url = URL.createObjectURL(f)
      setPreviews(prev => [...prev, url])
    })
  }

  const removePreview = (i: number) => {
    // Only remove from new photos list if index is beyond existing urls
    const existingCount = property?.photo_urls?.length ?? 0
    if (i >= existingCount) {
      setPhotos(prev => prev.filter((_, pi) => pi !== i - existingCount))
    }
    setPreviews(prev => prev.filter((_, pi) => pi !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        const res = await fetch(`/api/properties/${property.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:         form.title,
            description:   form.description   || null,
            address:       form.address        || null,
            region:        form.region         || null,
            area_m2:       form.area_m2        ? parseFloat(form.area_m2)        : null,
            rooms:         parseInt(form.rooms)         || 0,
            bedrooms:      parseInt(form.bedrooms)      || 0,
            bathrooms:     parseInt(form.bathrooms)     || 0,
            parking_spots: parseInt(form.parking_spots) || 0,
            value:         form.value          ? parseFloat(form.value)          : null,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'Falha ao salvar')
        }
      } else {
        const fd = new FormData()
        fd.append('data', JSON.stringify({
          title:         form.title,
          description:   form.description || null,
          address:       form.address      || null,
          region:        form.region       || null,
          area_m2:       form.area_m2      ? parseFloat(form.area_m2)        : null,
          rooms:         parseInt(form.rooms)         || 0,
          bedrooms:      parseInt(form.bedrooms)      || 0,
          bathrooms:     parseInt(form.bathrooms)     || 0,
          parking_spots: parseInt(form.parking_spots) || 0,
          value:         form.value        ? parseFloat(form.value)          : null,
        }))
        photos.forEach(f => fd.append('photos', f))
        const res = await fetch('/api/properties', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'Falha ao criar imóvel')
        }
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,35,24,0.55)', backdropFilter: 'blur(4px)' }} />
      <div
        className="domus-card"
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, fontWeight: 500, margin: 0 }}>
            {isEdit ? 'Editar imóvel' : 'Novo imóvel'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label className="domus-label">Título *</label>
            <input className="domus-input" value={form.title} onChange={set('title')} placeholder="Ex: Apartamento 3 quartos – Vila Madalena" required />
          </div>

          {/* Address + Region */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="domus-label">Endereço</label>
              <input className="domus-input" value={form.address} onChange={set('address')} placeholder="Rua, número, bairro" />
            </div>
            <div>
              <label className="domus-label">Região</label>
              <select
                className="domus-input"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Selecione...</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="domus-label">Descrição</label>
            <textarea className="domus-input" value={form.description} onChange={set('description')} rows={3} placeholder="Descreva o imóvel..." style={{ resize: 'vertical', minHeight: 72 }} />
          </div>

          {/* Numeric grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="domus-label">Área (m²)</label>
              <input className="domus-input" type="number" min="0" step="0.01" value={form.area_m2} onChange={set('area_m2')} placeholder="0" />
            </div>
            <div>
              <label className="domus-label">Valor (R$)</label>
              <input className="domus-input" type="text" inputMode="numeric" value={valueDisplay} onChange={handleValueInput} placeholder="0" />
            </div>
            <div>
              <label className="domus-label">Cômodos</label>
              <input className="domus-input" type="number" min="0" value={form.rooms} onChange={set('rooms')} placeholder="0" />
            </div>
            <div>
              <label className="domus-label">Quartos</label>
              <input className="domus-input" type="number" min="0" value={form.bedrooms} onChange={set('bedrooms')} placeholder="0" />
            </div>
            <div>
              <label className="domus-label">Banheiros</label>
              <input className="domus-input" type="number" min="0" value={form.bathrooms} onChange={set('bathrooms')} placeholder="0" />
            </div>
            <div>
              <label className="domus-label">Vagas</label>
              <input className="domus-input" type="number" min="0" value={form.parking_spots} onChange={set('parking_spots')} placeholder="0" />
            </div>
          </div>

          {/* Photo upload */}
          {!isEdit && (
            <div>
              <label className="domus-label">Fotos</label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                style={{
                  border: '1.5px dashed var(--domus-border-strong)', borderRadius: 'var(--domus-radius-md)',
                  padding: '24px 16px', cursor: 'pointer',
                  background: 'var(--domus-surface-sunken)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <Upload size={22} style={{ color: 'var(--domus-text-muted)', opacity: 0.6 }} />
                <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>
                  Clique ou arraste fotos aqui
                </p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {previews.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 6, overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removePreview(i)}
                        style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={10} color="#fff" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" onClick={onClose} className="domus-btn domus-btn--secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="domus-btn domus-btn--primary">
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar imóvel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImoveisPage() {
  const { companyId: COMPANY_ID } = useCompany()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | PropertyStatus>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [modalProp, setModalProp] = useState<Property | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!COMPANY_ID) { setLoading(false); return }
    const cached = readCache<Property[]>('properties')
    if (cached) { setProperties(cached); setLoading(false) }
    else setLoading(true)
    try {
      const res = await fetch('/api/properties')
      if (res.ok) { const { properties: data } = await res.json(); setProperties(data ?? []); writeCache('properties', data ?? []) }
    } finally { setLoading(false) }
  }, [COMPANY_ID])

  useEffect(() => { if (COMPANY_ID) fetch_() }, [COMPANY_ID, fetch_])

  const openNew  = () => { setModalProp(null); setShowModal(true) }
  const openEdit = (p: Property) => { setModalProp(p); setShowModal(true) }
  const closeModal = () => setShowModal(false)
  const onSaved  = () => { closeModal(); fetch_() }

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null)
    const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
    if (!res.ok) { const j = await res.json().catch(() => ({})); setToast(j.error ?? 'Erro ao remover imóvel'); return }
    fetch_()
  }

  const handleStatusChange = async (p: Property, newStatus: PropertyStatus) => {
    const body: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'sold') body.sold_at = new Date().toISOString()
    if (newStatus === 'available') body.sold_at = null
    const res = await fetch(`/api/properties/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setToast(j.error ?? 'Erro ao atualizar status')
      return
    }
    fetch_()
  }

  const filtered = filter === 'all' ? properties : properties.filter(p => p.status === filter)
  const available   = properties.filter(p => p.status === 'available').length
  const reserved    = properties.filter(p => p.status === 'reserved' || p.status === 'under_contract').length
  const sold        = properties.filter(p => p.status === 'sold').length
  const stale       = properties.filter(p => (p.status === 'available' || p.status === 'reserved') && daysOnMarket(p.created_at) > 60).length
  // keep totalValue unused-safe
  void properties.filter(p => p.status === 'available' && p.value).reduce((a, p) => a + (p.value ?? 0), 0)
  const totalValue = properties.filter(p => p.status === 'available' && p.value)
    .reduce((acc, p) => acc + (p.value ?? 0), 0)

  // auto-hide toast
  if (toast) setTimeout(() => setToast(null), 4000)

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
          padding: '12px 20px', borderRadius: 10,
          background: 'var(--domus-danger)', color: '#fff',
          fontSize: 13, boxShadow: '0 8px 32px rgba(8,32,24,0.3)',
          animation: 'slideUp 200ms var(--domus-ease-enter)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-sticky"
        style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Imóveis</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>Gestão de Imóveis</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={fetch_} disabled={loading} className="domus-btn domus-btn--secondary domus-btn--sm">
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Carregando...' : 'Atualizar'}
            </button>
            <button onClick={openNew} className="domus-btn domus-btn--primary domus-btn--sm">
              <Plus size={13} /> Novo imóvel
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Disponíveis',         value: available, color: 'var(--domus-success)',    bg: 'var(--domus-success-bg)' },
            { label: 'Reservados/Contrato',  value: reserved,  color: 'var(--domus-warning)',    bg: 'var(--domus-warning-bg)' },
            { label: 'Vendidos',             value: sold,      color: 'var(--domus-text-muted)', bg: 'var(--domus-ink-100)' },
            { label: 'Parados >60 dias',     value: stale,     color: 'var(--domus-danger)',     bg: 'var(--domus-danger-bg)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="domus-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 8, height: 36, borderRadius: 4, background: bg, border: `2px solid ${color}`, flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 22, fontWeight: 400, margin: 0, color: 'var(--domus-text)' }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([
            ['all',            'Todos'],
            ['available',      'Disponíveis'],
            ['reserved',       'Reservados'],
            ['under_contract', 'Em contrato'],
            ['sold',           'Vendidos'],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v as typeof filter)}
              className={`domus-btn domus-btn--sm ${filter === v ? 'domus-btn--primary' : 'domus-btn--secondary'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="domus-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ height: 180, background: 'var(--domus-ink-100)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[140, 100, 80].map((w, j) => (
                    <div key={j} style={{ height: 12, width: w, borderRadius: 6, background: 'var(--domus-ink-100)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Building2 size={40} style={{ color: 'var(--domus-text-muted)', opacity: 0.3 }} />
            <p style={{ fontSize: 14, color: 'var(--domus-text-muted)', margin: 0 }}>
              {filter === 'all' ? 'Nenhum imóvel cadastrado ainda.' : `Nenhum imóvel ${filter === 'available' ? 'disponível' : 'vendido'}.`}
            </p>
            {filter === 'all' && (
              <button onClick={openNew} className="domus-btn domus-btn--primary domus-btn--sm" style={{ marginTop: 12 }}>
                <Plus size={13} /> Cadastrar primeiro imóvel
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filtered.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                onEdit={openEdit}
                onDelete={setConfirmDeleteId}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <PropertyModal
          property={modalProp}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remover imóvel"
        message="Tem certeza que deseja remover este imóvel? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        danger
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
