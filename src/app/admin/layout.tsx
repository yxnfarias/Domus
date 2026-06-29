'use client'

import { Logo } from '@/components/Logo'
import { Building2, LogOut, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

const navItems = [
  { href: '/admin', icon: Building2, label: 'Empresas', exact: true },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  const handleSignOut = async () => {
    await getSupabaseBrowser().auth.signOut()
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--domus-surface)' }}>

      {/* Sidebar */}
      <aside className="flex flex-col w-60 shrink-0 border-r" style={{ background: '#0a1a12', borderColor: 'rgba(255,255,255,0.06)', height: '100vh' }}>
        <div className="flex items-center gap-2.5 px-6 border-b" style={{ height: 64, borderColor: 'rgba(255,255,255,0.06)' }}>
          <Logo size={18} variant="white" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <span style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
              Administrador
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', padding: '0 12px', marginBottom: 8 }}>
            Plataforma
          </p>
          {navItems.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn('domus-nav-item')}
                style={{
                  color: active ? '#FAF7F2' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleSignOut}
            className="domus-nav-item w-full"
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
