'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/lib/company-context'
import {
  Building2, Palette, Users,
  Save, Link, CheckCircle2,
  AlertCircle, ToggleLeft, ToggleRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CompanySettings {
  id: string
  name: string
  slug: string
  logo_url: string | null
  theme_config: {
    primary: string
    secondary: string
    accent: string
    border_radius: string
    font_heading: string
    font_body: string
  } | null
  lead_distribution: 'manual' | 'round_robin'
}

interface CompanyUser {
  id: string
  email: string
  name?: string
  role: string
  joined_at: string
}

type Tab = 'perfil' | 'visual' | 'distribuicao'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 1300,
      display: 'flex', alignItems: 'center', gap: 10,
      background: type === 'success' ? 'var(--domus-success)' : 'var(--domus-danger)',
      color: '#fff', padding: '12px 18px', borderRadius: 8, fontSize: 13,
      boxShadow: 'var(--domus-shadow-3)', maxWidth: 360,
    }}>
      {type === 'success'
        ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
        : <AlertCircle   size={15} style={{ flexShrink: 0 }} />}
      {message}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 14, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '5px 0 0' }}>{hint}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { role, refresh: refreshCompany } = useCompany()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [activeTab, setActiveTab] = useState<Tab>('perfil')
  const [company, setCompany]     = useState<CompanySettings | null>(null)
  const [brokers, setBrokers]     = useState<CompanyUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Perfil form state
  const [companyName, setCompanyName] = useState('')

  // Visual form state
  const [logoUrl, setLogoUrl]               = useState('')
  const [primaryColor, setPrimaryColor]     = useState('#0F3D2E')
  const [secondaryColor, setSecondaryColor] = useState('#1A5C3A')
  const [accentColor, setAccentColor]       = useState('#D5C2A1')

  // Distribuição state
  const [distMode, setDistMode] = useState<'manual' | 'round_robin'>('manual')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, usersRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/users'),
      ])
      if (settingsRes.ok) {
        const { company: c } = await settingsRes.json()
        setCompany(c)
        setCompanyName(c.name ?? '')
        setLogoUrl(c.logo_url ?? '')
        setPrimaryColor(c.theme_config?.primary ?? '#0F3D2E')
        setSecondaryColor(c.theme_config?.secondary ?? '#1A5C3A')
        setAccentColor(c.theme_config?.accent ?? '#D5C2A1')
        setDistMode(c.lead_distribution ?? 'manual')
      }
      if (usersRes.ok) {
        const { users } = await usersRes.json()
        setBrokers((users as CompanyUser[]).filter(u => u.role === 'broker'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Save perfil ─────────────────────────────────────────────────────────────
  const savePerfil = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName.trim() }),
      })
      if (res.ok) {
        const { company: c } = await res.json()
        setCompany(c)
        showToast('Perfil atualizado com sucesso.', 'success')
      } else {
        const { error } = await res.json()
        showToast(error ?? 'Erro ao salvar.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Save visual ─────────────────────────────────────────────────────────────
  const saveVisual = async () => {
    setSaving(true)
    try {
      const theme_config = {
        ...(company?.theme_config ?? {}),
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
      }
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: logoUrl.trim() || null, theme_config }),
      })
      if (res.ok) {
        const { company: c } = await res.json()
        setCompany(c)
        refreshCompany()
        showToast('Identidade visual salva.', 'success')
      } else {
        const { error } = await res.json()
        showToast(error ?? 'Erro ao salvar.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Save distribuição ────────────────────────────────────────────────────────
  const saveDistribuicao = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_distribution: distMode }),
      })
      if (res.ok) {
        showToast('Distribuição de leads atualizada.', 'success')
      } else {
        const { error } = await res.json()
        showToast(error ?? 'Erro ao salvar.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Tabs config ─────────────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: 'perfil',       label: 'Perfil da Empresa', Icon: Building2 },
    { key: 'visual',       label: 'Identidade Visual',  Icon: Palette   },
    { key: 'distribuicao', label: 'Distribuição',        Icon: Users     },
  ]

  const formUrl = company
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/form/${company.slug}`
    : ''

  if (loading) {
    return (
      <div style={{ padding: '40px', maxWidth: 900, margin: '0 auto' }}>
        <div className="domus-skeleton" style={{ height: 24, width: 200, marginBottom: 40 }} />
        <div style={{ display: 'flex', gap: 32 }}>
          <div className="domus-skeleton" style={{ height: 200, width: 200, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="domus-skeleton" style={{ height: 56, marginBottom: 14, borderRadius: 6 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Configurações</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
              Configurações
            </h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 40px' }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* Vertical nav */}
          <nav style={{ width: 200, flexShrink: 0 }}>
            <div className="domus-card" style={{ padding: 6, overflow: 'hidden' }}>
              {TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 13, textAlign: 'left',
                    background: activeTab === key ? 'var(--domus-green-50)' : 'transparent',
                    color: activeTab === key ? 'var(--domus-brand)' : 'var(--domus-text-muted)',
                    fontWeight: activeTab === key ? 500 : 400,
                    transition: 'background 140ms, color 140ms',
                  }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* ── Perfil ─────────────────────────────────────────────────── */}
            {activeTab === 'perfil' && (
              <div className="domus-card" style={{ padding: 32 }}>
                <Section title="Perfil da Empresa" description="Informações públicas da sua imobiliária.">
                  <Field label="Nome da Imobiliária">
                    <input
                      className="domus-input"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Ex.: Renovar Imóveis"
                      disabled={!isAdmin}
                    />
                  </Field>

                  <Field label="Slug" hint="Identificador único da empresa — não pode ser alterado.">
                    <input
                      className="domus-input"
                      value={company?.slug ?? ''}
                      disabled
                      style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 13, opacity: 0.6 }}
                    />
                  </Field>

                  <Field label="URL do Formulário Público">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="domus-input"
                        value={formUrl}
                        disabled
                        style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 12, opacity: 0.7 }}
                      />
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="domus-btn domus-btn--secondary domus-btn--sm"
                        style={{ flexShrink: 0, textDecoration: 'none' }}
                      >
                        <Link size={13} />
                      </a>
                    </div>
                  </Field>
                </Section>

                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={savePerfil} disabled={saving} className="domus-btn domus-btn--primary domus-btn--sm">
                      <Save size={13} />
                      {saving ? 'Salvando…' : 'Salvar Alterações'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Visual ─────────────────────────────────────────────────── */}
            {activeTab === 'visual' && (
              <div className="domus-card" style={{ padding: 32 }}>
                <Section title="Identidade Visual" description="Personalização aplicada ao formulário público e laudos compartilhados.">
                  <Field label="URL do Logotipo" hint="SVG ou PNG com fundo transparente. Cole a URL pública da imagem.">
                    <input
                      className="domus-input"
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      placeholder="https://sua-empresa.com.br/logo.svg"
                      disabled={!isAdmin}
                    />
                    {logoUrl && (
                      <div style={{ marginTop: 12, padding: 16, background: 'var(--domus-ink-100)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoUrl}
                          alt="Pré-visualização do logotipo"
                          style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    )}
                  </Field>
                </Section>

                <Section title="Paleta de Cores">
                  <Field label="Cor de Destaque" hint="Cor de fundo do formulário público e dos laudos em PDF.">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={e => isAdmin && setPrimaryColor(e.target.value)}
                        disabled={!isAdmin}
                        style={{
                          width: 40, height: 40, border: '1px solid var(--domus-border)',
                          borderRadius: 6, padding: 2, cursor: isAdmin ? 'pointer' : 'default',
                          background: 'white',
                        }}
                      />
                      <input
                        className="domus-input"
                        value={primaryColor}
                        onChange={e => isAdmin && setPrimaryColor(e.target.value)}
                        disabled={!isAdmin}
                        style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 12, textTransform: 'uppercase' }}
                      />
                    </div>
                  </Field>
                </Section>

                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={saveVisual} disabled={saving} className="domus-btn domus-btn--primary domus-btn--sm">
                      <Save size={13} />
                      {saving ? 'Salvando…' : 'Salvar Visual'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Distribuição ───────────────────────────────────────────── */}
            {activeTab === 'distribuicao' && (
              <div className="domus-card" style={{ padding: 32 }}>
                <Section
                  title="Distribuição de Leads"
                  description="Defina como novos leads enviados pelo formulário são atribuídos à equipe."
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                    {([
                      { value: 'manual' as const,      label: 'Manual',               desc: 'O administrador atribui cada lead individualmente.' },
                      { value: 'round_robin' as const,  label: 'Rodízio (Round Robin)', desc: 'Leads distribuídos automaticamente de forma cíclica entre os corretores ativos.' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => isAdmin && setDistMode(opt.value)}
                        disabled={!isAdmin}
                        style={{
                          textAlign: 'left', padding: '16px 18px', borderRadius: 8, cursor: isAdmin ? 'pointer' : 'default',
                          border: `2px solid ${distMode === opt.value ? 'var(--domus-brand)' : 'var(--domus-border)'}`,
                          background: distMode === opt.value ? 'var(--domus-green-50)' : 'var(--domus-white)',
                          transition: 'border-color 140ms, background 140ms',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          {distMode === opt.value
                            ? <ToggleRight size={16} style={{ color: 'var(--domus-brand)' }} />
                            : <ToggleLeft  size={16} style={{ color: 'var(--domus-text-muted)' }} />}
                          <span style={{ fontSize: 13, fontWeight: 600, color: distMode === opt.value ? 'var(--domus-brand)' : 'var(--domus-text)' }}>
                            {opt.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0, lineHeight: 1.5 }}>
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>

                  {distMode === 'round_robin' && (
                    <div style={{ marginBottom: 24 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)', marginBottom: 10 }}>
                        Corretores elegíveis para receber leads:
                      </p>
                      {brokers.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', fontStyle: 'italic' }}>
                          Nenhum corretor cadastrado. Adicione corretores na aba Equipe.
                        </p>
                      ) : (
                        <div className="domus-card" style={{ overflow: 'hidden' }}>
                          {brokers.map((b, i) => (
                            <div
                              key={b.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 16px',
                                borderBottom: i < brokers.length - 1 ? '1px solid var(--domus-border)' : 'none',
                              }}
                            >
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'var(--domus-green-50)', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 600, color: 'var(--domus-brand)',
                              }}>
                                {(b.name ?? b.email).slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {b.name ?? b.email}
                                </p>
                                {b.name && (
                                  <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>{b.email}</p>
                                )}
                              </div>
                              <span style={{
                                marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 8px',
                                borderRadius: 99, background: 'var(--domus-green-50)', color: 'var(--domus-brand)',
                              }}>
                                Ativo
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Section>

                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={saveDistribuicao} disabled={saving} className="domus-btn domus-btn--primary domus-btn--sm">
                      <Save size={13} />
                      {saving ? 'Salvando…' : 'Salvar Distribuição'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
