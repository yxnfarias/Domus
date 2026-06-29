'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, Users, Building2, CalendarCheck, UserCheck } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { useCompany } from '@/lib/company-context'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'new_lead' | 'status_changed' | 'follow_up_set' | 'broker_assigned' | 'follow_up_reminder'
  title: string
  body: string
  href: string
  read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  new_lead:          Users,
  status_changed:    Building2,
  follow_up_set:     CalendarCheck,
  broker_assigned:   UserCheck,
  follow_up_reminder: CalendarCheck,
}

export function NotificationBell() {
  const { companyId: COMPANY_ID } = useCompany()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const ref     = useRef<HTMLDivElement>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null)

  const unread = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!COMPANY_ID) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const { notifications: data } = await res.json()
        setNotifications(data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [COMPANY_ID])

  // Initial load
  useEffect(() => {
    if (COMPANY_ID) fetchNotifications()
  }, [COMPANY_ID, fetchNotifications])

  // Re-fetch when reminders are created on the same page load
  useEffect(() => {
    const handler = () => fetchNotifications()
    window.addEventListener('domus:notifications-refresh', handler)
    return () => window.removeEventListener('domus:notifications-refresh', handler)
  }, [fetchNotifications])

  // Realtime subscription on notifications table
  useEffect(() => {
    if (!COMPANY_ID) return
    const supabase = getSupabaseBrowser()

    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `company_id=eq.${COMPANY_ID}`,
        },
        (payload) => {
          const n = payload.new as Notification
          setNotifications(prev => [n, ...prev].slice(0, 40))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [COMPANY_ID])

  // Close on outside click or scroll
  useEffect(() => {
    const closeHandler = (e: MouseEvent) => {
      const inside =
        ref.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      if (!inside) setOpen(false)
    }
    const scrollHandler = () => setOpen(false)
    document.addEventListener('mousedown', closeHandler)
    window.addEventListener('scroll', scrollHandler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', closeHandler)
      window.removeEventListener('scroll', scrollHandler)
    }
  }, [])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const left = Math.min(rect.left, window.innerWidth - 328)
      setDropPos({ top: rect.bottom + 8, left })
    }
    setOpen(o => !o)
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications', { method: 'PATCH' })
  }

  const markOneRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
  }

  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  }

  const relTime = (iso: string) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60)    return 'agora'
    if (s < 3600)  return `${Math.round(s / 60)}m`
    if (s < 86400) return `${Math.round(s / 3600)}h`
    return `${Math.round(s / 86400)}d`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          width: 36, height: 36,
          borderRadius: 8,
          border: '1px solid var(--domus-border)',
          background: open ? 'var(--domus-green-50)' : 'var(--domus-white)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          transition: 'background 140ms',
        }}
        aria-label="Notificações"
      >
        <Bell size={15} style={{ color: 'var(--domus-text-muted)' }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--domus-danger)',
            border: '1.5px solid var(--domus-white)',
          }} />
        )}
      </button>

      {open && dropPos && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed',
          top: dropPos.top,
          left: dropPos.left,
          width: 320,
          background: 'var(--domus-white)',
          border: '1px solid var(--domus-border)',
          borderRadius: 12,
          boxShadow: 'var(--domus-shadow-3)',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'slideUp 140ms var(--domus-ease-enter)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--domus-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0 }}>Notificações</p>
              {unread > 0 && (
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: 'var(--domus-danger-bg)', color: 'var(--domus-danger)', fontWeight: 600 }}>
                  {unread}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--domus-brand)', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                  Marcar lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={14} style={{ color: 'var(--domus-text-muted)' }} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={24} style={{ color: 'var(--domus-text-muted)', opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                const isHovered = hoveredId === n.id
                return (
                  <div
                    key={n.id}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ position: 'relative', borderBottom: '1px solid var(--domus-border)' }}
                  >
                    <Link
                      href={n.href}
                      onClick={() => { markOneRead(n.id); setOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 16px',
                        paddingRight: 40,
                        textDecoration: 'none',
                        background: isHovered
                          ? 'var(--domus-surface)'
                          : n.read ? 'transparent' : 'rgba(15,61,46,.04)',
                        transition: 'background 140ms',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: n.read ? 'var(--domus-ink-100)' : 'var(--domus-green-50)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={14} style={{ color: n.read ? 'var(--domus-text-muted)' : 'var(--domus-brand)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, margin: 0, color: 'var(--domus-text)' }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                        <span style={{ fontSize: 10, color: 'var(--domus-text-muted)', display: 'block', marginTop: 3 }}>{relTime(n.created_at)}</span>
                      </div>
                    </Link>
                    {isHovered && (
                      <button
                        onClick={e => deleteOne(n.id, e)}
                        style={{
                          position: 'absolute', top: '50%', right: 12,
                          transform: 'translateY(-50%)',
                          width: 24, height: 24, borderRadius: 6,
                          border: '1px solid var(--domus-border)',
                          background: 'var(--domus-white)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--domus-text-muted)',
                          transition: 'color 120ms, border-color 120ms',
                        }}
                        title="Remover notificação"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
