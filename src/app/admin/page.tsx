'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Users, Plus, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  user_count: number
}

function NewCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName]       = useState('')
  const [slug, setSlug]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleNameChange = (v: string) => {
    setName(v)
    if (!slug || slug === toSlug(name)) setSlug(toSlug(v))
  }

  const toSlug = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao criar empresa'); return }
      onSuccess()
      onClose()
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,14,10,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--domus-white)', borderRadius: 16, boxShadow: '0 24px 64px rgba(4,14,10,0.3)', overflow: 'hidden', position: 'relative', zIndex: 1100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--domus-border)' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', margin: '0 0 4px' }}>Administrador</p>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 500, margin: 0 }}>Nova empresa</h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--domus-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>Nome da empresa</label>
            <input required className="domus-input" placeholder="Renovar Imóveis" value={name} onChange={e => handleNameChange(e.target.value)} style={{ fontSize: 14 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>Slug (URL do formulário)</label>
            <input required className="domus-input" placeholder="renovar" value={slug} onChange={e => setSlug(toSlug(e.target.value))} style={{ fontSize: 14, fontFamily: 'var(--domus-font-mono)' }} />
            {slug && <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0 }}>Formulário: /form/{slug}</p>}
          </div>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--domus-danger-bg)', border: '1px solid rgba(178,58,42,0.18)' }}>
              <p style={{ fontSize: 13, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="domus-btn domus-btn--sm" style={{ color: 'var(--domus-text-muted)' }}>Cancelar</button>
            <button type="submit" disabled={loading || !name || !slug} className="domus-btn domus-btn--primary domus-btn--sm">
              {loading ? 'Criando...' : 'Criar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading]     = useState(true)
  const [showNew, setShowNew]     = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/companies')
      if (res.ok) { const { companies: c } = await res.json(); setCompanies(c ?? []) }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200, padding: '12px 20px', borderRadius: 10, background: '#0a1a12', color: '#FAF7F2', fontSize: 13, boxShadow: '0 8px 32px rgba(4,14,10,0.3)' }}>
          {toast}
        </div>
      )}

      {showNew && (
        <NewCompanyModal
          onClose={() => setShowNew(false)}
          onSuccess={() => { fetchCompanies(); showToast('Empresa criada com sucesso.') }}
        />
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--domus-border)', background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Administrador · Plataforma</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0 }}>Empresas</h1>
          </div>
          <button onClick={() => setShowNew(true)} className="domus-btn domus-btn--primary domus-btn--sm">
            <Plus size={13} /> Nova empresa
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 40px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total de empresas',  value: loading ? '—' : String(companies.length),                                    icon: Building2 },
            { label: 'Total de usuários',  value: loading ? '—' : String(companies.reduce((s, c) => s + c.user_count, 0)),    icon: Users },
            { label: 'Média de usuários',  value: loading || companies.length === 0 ? '—' : (companies.reduce((s, c) => s + c.user_count, 0) / companies.length).toFixed(1), icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="domus-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--domus-green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color: 'var(--domus-brand)' }} />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 20, fontWeight: 500, margin: 0, color: 'var(--domus-text)', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '4px 0 0' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Companies table */}
        <div className="domus-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--domus-border)' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0 }}>Todas as empresas</p>
          </div>

          {loading ? (
            <div style={{ padding: '32px 20px', display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
            </div>
          ) : companies.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <Building2 size={32} style={{ color: 'var(--domus-text-muted)', opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhuma empresa cadastrada.</p>
              <button onClick={() => setShowNew(true)} className="domus-btn domus-btn--primary domus-btn--sm" style={{ marginTop: 16 }}>
                <Plus size={13} /> Criar primeira empresa
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 48px', padding: '10px 20px', background: 'var(--domus-surface)', borderBottom: '1px solid var(--domus-border)' }}>
                {['Empresa', 'Slug', 'Membros', ''].map(h => (
                  <span key={h} style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)' }}>{h}</span>
                ))}
              </div>
              {companies.map((company, i) => (
                <div
                  key={company.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 48px', padding: '14px 20px', borderBottom: i < companies.length - 1 ? '1px solid var(--domus-border)' : 'none', alignItems: 'center' }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>{company.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
                      Criada em {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--domus-font-mono)', color: 'var(--domus-text-muted)' }}>
                    {company.slug}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={12} style={{ color: 'var(--domus-text-muted)' }} />
                    <span style={{ fontSize: 12, color: 'var(--domus-text)' }}>{company.user_count}</span>
                  </div>
                  <Link
                    href={`/admin/companies/${company.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, color: 'var(--domus-text-muted)', textDecoration: 'none' }}
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
