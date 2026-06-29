'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo, DonutO } from '@/components/Logo'
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function SuperAdminLoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowser()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      // Check super_admin status client-side via /api/me
      const res = await fetch('/api/me')
      const me  = await res.json()

      if (!me.is_super_admin) {
        await supabase.auth.signOut()
        setError('Esta conta não tem permissões de Administrador.')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      setError(
        msg.includes('invalid') || msg.includes('credentials')
          ? 'E-mail ou senha incorretos.'
          : 'Ocorreu um erro. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--domus-font-ui)' }}>

      {/* Left panel */}
      <div style={{
        width: '42%', flexShrink: 0,
        background: 'linear-gradient(160deg, #082018 0%, #040e0a 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '44px 52px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -100, top: '12%', opacity: 0.05, pointerEvents: 'none' }}>
          <DonutO size={500} color="#fff" />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Logo size={90} variant="white" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 18px' }}>
            <ShieldCheck size={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <p style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              Acesso Administrador
            </p>
          </div>
          <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 26, fontWeight: 400, color: '#fff', margin: '0 0 14px', lineHeight: 1.22 }}>
            Controle total da plataforma.
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.7, maxWidth: 300 }}>
            Gerencie empresas, equipes e assinaturas de todos os tenants em um único painel.
          </p>
        </div>
        <div style={{ paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            Domus · Painel Administrativo Global
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1, background: 'var(--domus-ivory)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <ShieldCheck size={13} style={{ color: 'var(--domus-text-muted)' }} />
              <p className="domus-eyebrow" style={{ fontSize: 10, margin: 0 }}>Administrador</p>
            </div>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--domus-text)', margin: '0 0 8px' }}>
              Acesso restrito
            </h2>
            <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', margin: 0, lineHeight: 1.6 }}>
              Entre com suas credenciais de administrador global.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>E-mail</label>
              <input
                type="email"
                autoComplete="email"
                className="domus-input"
                placeholder="admin@domus.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="domus-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ fontSize: 14, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  tabIndex={-1}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-text-muted)', display: 'flex', borderRadius: 4 }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--domus-radius-sm)', background: 'var(--domus-danger-bg)', border: '1px solid rgba(178,58,42,0.18)' }}>
                <p style={{ fontSize: 13, color: 'var(--domus-danger)', margin: 0, lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="domus-btn domus-btn--primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 14 }}
            >
              {loading ? 'Verificando...' : <><span>Entrar</span> <ArrowRight size={14} /></>}
            </button>
          </form>

          <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', textAlign: 'center', marginTop: 36, lineHeight: 1.5 }}>
            Domus · Painel Administrativo Global
          </p>
        </div>
      </div>
    </div>
  )
}
