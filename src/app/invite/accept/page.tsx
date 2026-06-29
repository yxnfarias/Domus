import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Logo } from '@/components/Logo'

export default async function InviteAcceptPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // If the user ended up here without a session, send to login
  if (!user) redirect('/login')

  // Check if already linked to a company (invite was processed in the auth callback)
  const { data: cu } = await supabase
    .from('company_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (cu) redirect('/dashboard')

  // Invite metadata missing or invite expired/invalid
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, #0F3D2E 0%, #082018 100%)',
      fontFamily: 'system-ui, sans-serif',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
        background: 'rgba(250,247,242,0.05)',
        border: '1px solid rgba(250,247,242,0.12)',
        borderRadius: 16,
        padding: '40px 36px',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: 24 }}>
          <Logo size={20} variant="white" />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#FAF7F2', margin: '0 0 10px' }}>
          Convite inválido ou expirado
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(250,247,242,0.55)', margin: '0 0 28px', lineHeight: 1.6 }}>
          Este link de convite não é mais válido. Solicite um novo convite ao administrador da sua empresa.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '11px 28px',
            borderRadius: 8,
            background: '#D5C2A1',
            color: '#0F3D2E',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Ir para o login
        </a>
      </div>
    </div>
  )
}
