'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo, DonutO } from '@/components/Logo'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function LoginPage() {
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
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      setError(
        msg.includes('invalid') || msg.includes('credentials')
          ? 'E-mail ou senha incorretos. Verifique e tente novamente.'
          : 'Ocorreu um erro. Tente novamente em instantes.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--domus-font-ui)' }}>

      {/* ── Left brand panel ──────────────────────────────────────────── */}
      <div style={{
        width: '42%', flexShrink: 0,
        background: 'linear-gradient(160deg, var(--domus-green-700) 0%, var(--domus-green-900) 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '44px 52px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative rings */}
        <div style={{ position: 'absolute', right: -100, top: '12%', opacity: 0.07, pointerEvents: 'none' }}>
          <DonutO size={500} color="#fff" />
        </div>
        <div style={{ position: 'absolute', left: -80, bottom: '8%', opacity: 0.04, pointerEvents: 'none' }}>
          <DonutO size={300} color="#fff" />
        </div>

        {/* Bloco central — Logo até "única plataforma", centralizado verticalmente */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Logo size={90} variant="white" />
          <p style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '24px 0 18px' }}>
            Plataforma de gestão imobiliária
          </p>
          <h1 style={{
            fontFamily: 'var(--domus-font-display)', fontSize: 30, fontWeight: 400,
            color: '#fff', margin: '0 0 14px', lineHeight: 1.22, letterSpacing: '-0.01em',
          }}>
            Qualifique leads com inteligência.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.7, maxWidth: 300 }}>
            Análise de crédito automatizada, gestão de visitas e portfólio de imóveis — tudo em uma única plataforma.
          </p>
        </div>

        {/* Stats row — fixo na base */}
        <div style={{ display: 'flex', gap: 28, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            ['500+', 'corretores ativos'],
            ['R$ 2bi+', 'em crédito analisado'],
            ['98%', 'satisfação'],
          ].map(([val, label]) => (
            <div key={label}>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 400, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                {val}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: 'var(--domus-ivory)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <p className="domus-eyebrow" style={{ fontSize: 10, marginBottom: 12 }}>Acesso restrito</p>
            <h2 style={{
              fontFamily: 'var(--domus-font-display)', fontSize: 24, fontWeight: 400,
              letterSpacing: '-0.015em', color: 'var(--domus-text)', margin: '0 0 8px',
            }}>
              Bem-vindo de volta
            </h2>
            <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', margin: 0, lineHeight: 1.6 }}>
              Entre com seu e-mail e senha para acessar o painel.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* E-mail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                className="domus-input"
                placeholder="corretor@empresa.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ fontSize: 14 }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>
                Senha
              </label>
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
                  style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'none', cursor: 'pointer',
                    padding: 4, color: 'var(--domus-text-muted)', display: 'flex', borderRadius: 4,
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--domus-radius-sm)',
                background: 'var(--domus-danger-bg)',
                border: '1px solid rgba(178,58,42,0.18)',
              }}>
                <p style={{ fontSize: 13, color: 'var(--domus-danger)', margin: 0, lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="domus-btn domus-btn--primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 14 }}
            >
              {loading
                ? 'Entrando...'
                : <><span>Entrar</span> <ArrowRight size={14} /></>
              }
            </button>
          </form>

          {/* Footer */}
          <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', textAlign: 'center', marginTop: 36, lineHeight: 1.5 }}>
            Domus · Gestão Imobiliária Inteligente
          </p>
        </div>
      </div>
    </div>
  )
}
