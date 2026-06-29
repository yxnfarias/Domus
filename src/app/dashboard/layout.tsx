'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { Logo } from '@/components/Logo'
import { CompanyProvider } from '@/lib/company-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <CompanyProvider>
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--domus-surface)' }}>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="domus-sidebar-backdrop show"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar isOpen={open} onClose={() => setOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar — hidden on desktop via CSS */}
        <div className="domus-mobile-bar">
          <button
            className="domus-hamburger"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <span /><span /><span />
          </button>
          <Logo size={16} />
          <div style={{ marginLeft: 'auto' }}>
            <NotificationBell />
          </div>
        </div>

        {children}
      </main>

    </div>
    </CompanyProvider>
  )
}
