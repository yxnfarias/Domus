'use client'

import { Logo } from '@/components/Logo'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { LayoutDashboard, Users, Building2, CalendarCheck, FileText, Settings, LogOut, X, UsersRound, DollarSign, Calculator, Handshake } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { readCache, writeCache } from '@/lib/route-cache'
import { useCompany } from '@/lib/company-context'
import type { CurrentUser } from '@/lib/types'

function prefetchRoute(href: string) {
  const preLeads = () => {
    if (readCache('leads')) return
    fetch('/api/leads')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.leads) writeCache('leads', d.leads) })
      .catch(() => {})
  }
  const preProps = () => {
    if (readCache('properties')) return
    fetch('/api/properties')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.properties) writeCache('properties', d.properties) })
      .catch(() => {})
  }

  if (href === '/dashboard')         { preLeads(); preProps() }
  if (href === '/dashboard/leads')   preLeads()
  if (href === '/dashboard/imoveis') preProps()
  if (href === '/dashboard/reports') { preLeads(); preProps() }
}

type NavItem = { href: string; icon: React.ElementType; label: string; exact: boolean; adminOnly: boolean }

const NAV_GROUPS: { eyebrow: string; items: NavItem[] }[] = [
  {
    eyebrow: 'Visão Geral',
    items: [
      { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard',     exact: true,  adminOnly: false },
    ],
  },
  {
    eyebrow: 'Acompanhamento',
    items: [
      { href: '/dashboard/leads',        icon: Users,           label: 'Leads',         exact: false, adminOnly: false },
      { href: '/dashboard/pipeline',     icon: Handshake,       label: 'Pipeline',      exact: false, adminOnly: false },
      { href: '/dashboard/visistar',     icon: CalendarCheck,   label: 'Visitas',       exact: false, adminOnly: false },
    ],
  },
  {
    eyebrow: 'Real State',
    items: [
      { href: '/dashboard/imoveis',      icon: Building2,       label: 'Imóveis',       exact: false, adminOnly: false },
      { href: '/dashboard/precificacao', icon: Calculator,      label: 'Precificação',  exact: false, adminOnly: false },
    ],
  },
  {
    eyebrow: 'Gestão',
    items: [
      { href: '/dashboard/reports',      icon: FileText,        label: 'Relatórios',    exact: false, adminOnly: false  },
      { href: '/dashboard/equipe',       icon: UsersRound,      label: 'Equipe',        exact: false, adminOnly: true  },
      { href: '/dashboard/commissions',  icon: DollarSign,      label: 'Comissões',     exact: false, adminOnly: true  },
      { href: '/dashboard/settings',     icon: Settings,        label: 'Configurações', exact: false, adminOnly: true  },
    ],
  },
]

function initials(email: string) {
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { companyId: COMPANY_ID } = useCompany()
  const [email, setEmail]         = useState<string | null>(null)
  const [me, setMe]               = useState<CurrentUser | null>(null)

  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setMe(d) })
      .catch(() => {})
  }, [])

  const handleSignOut = async () => {
    await getSupabaseBrowser().auth.signOut()
    router.push('/login')
  }

  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin'


  const displayEmail    = email ?? '—'
  const displayInitials = email ? initials(email) : '?'
  const domain          = email?.split('@')[1] ?? ''
  const companyHint     = domain ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : 'Domus'

  return (
    <aside
      className={`domus-sidebar flex flex-col w-60 shrink-0 border-r${isOpen ? ' open' : ''}`}
      style={{ background: 'var(--domus-white)', borderColor: 'var(--domus-border)', height: '100vh' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 border-b" style={{ height: 64, borderColor: 'var(--domus-border)' }}>
        <Logo size={20} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NotificationBell />
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Fechar menu"
              style={{ display: 'none', border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-text-muted)' }}
              className="domus-sidebar-close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {NAV_GROUPS.map(({ eyebrow, items }) => {
          const visible = items.filter(item => !item.adminOnly || isAdmin)
          if (visible.length === 0) return null
          return (
            <div key={eyebrow} style={{ marginBottom: 12 }}>
              <p className="domus-eyebrow px-3" style={{ fontSize: 9, marginBottom: 4 }}>{eyebrow}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visible.map(({ href, icon: Icon, label, exact }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    onMouseEnter={() => prefetchRoute(href)}
                    className={cn(
                      'domus-nav-item',
                      (exact ? pathname === href : pathname.startsWith(href)) && 'active'
                    )}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User area */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--domus-border)' }}>
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--domus-green-500), var(--domus-green-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px -2px rgba(15,61,46,.35)',
            }}
          >
            <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 11, color: 'rgba(250,247,242,0.95)', fontWeight: 600, letterSpacing: '0.02em' }}>
              {displayInitials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate" style={{ fontSize: 12, color: 'var(--domus-text)', lineHeight: 1.2 }}>
              {companyHint}
            </p>
            <p className="truncate" style={{ fontSize: 11, color: 'var(--domus-text-muted)', lineHeight: 1.2, marginTop: 2 }}>
              {displayEmail}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="domus-nav-item w-full mt-3"
          style={{ color: 'var(--domus-danger)', fontSize: 12 }}
        >
          <LogOut size={14} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
