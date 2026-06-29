'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Shield, UserCheck, Trash2, MailOpen, X, ChevronDown, Copy, Check, Link2, KeyRound, Eye, EyeOff } from 'lucide-react'
import type { CompanyUser, Invitation } from '@/lib/types'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'

function initials(nameOrEmail: string) {
  const parts = nameOrEmail.trim().split(/[\s._-]+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nameOrEmail.slice(0, 2).toUpperCase()
}

function RoleBadge({ role }: { role: 'admin' | 'broker' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 500,
      background: role === 'admin' ? 'var(--domus-green-50)' : 'var(--domus-ink-100)',
      color: role === 'admin' ? 'var(--domus-brand)' : 'var(--domus-text-muted)',
      border: `1px solid ${role === 'admin' ? 'rgba(15,61,46,0.15)' : 'var(--domus-border)'}`,
    }}>
      {role === 'admin' ? <Shield size={10} /> : <UserCheck size={10} />}
      {role === 'admin' ? 'Administrador' : 'Corretor'}
    </span>
  )
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState<'broker' | 'admin'>('broker')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [inviteLink, setInviteLink]   = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)

  const copyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setInviteLink(null)
    setEmailWarning(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao enviar convite'); return }

      onSuccess()

      // Email may have failed (e.g. Resend test mode) — show link instead
      if (json.invite_link) {
        setInviteLink(json.invite_link)
        setEmailWarning(json.email_warning ?? null)
      } else {
        onClose()
      }
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,32,24,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--domus-white)', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(8,32,24,0.22)',
        overflow: 'hidden',
        position: 'relative', zIndex: 1100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--domus-border)' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', margin: '0 0 4px' }}>Equipe</p>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
              Convidar membro
            </h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--domus-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>E-mail</label>
            <input
              type="email"
              required
              className="domus-input"
              placeholder="corretor@empresa.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>Cargo</label>
            <div style={{ position: 'relative' }}>
              <select
                className="domus-input"
                value={role}
                onChange={e => setRole(e.target.value as 'broker' | 'admin')}
                style={{ fontSize: 14, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="broker">Corretor</option>
                <option value="admin">Administrador</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--domus-text-muted)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0, lineHeight: 1.5 }}>
              {role === 'admin'
                ? 'Administradores podem convidar membros, alterar cargos e ver relatórios completos.'
                : 'Corretores acessam leads e imóveis, mas não gerenciam a equipe.'}
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--domus-danger-bg)', border: '1px solid rgba(178,58,42,0.18)' }}>
              <p style={{ fontSize: 13, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Fallback: show invite link when email couldn't be sent */}
          {inviteLink && (
            <div style={{ borderRadius: 10, border: '1px solid rgba(198,138,46,0.30)', background: 'var(--domus-warning-bg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link2 size={14} style={{ color: 'var(--domus-warning)', flexShrink: 0 }} />
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
                  Convite criado — e-mail não enviado
                </p>
              </div>
              {emailWarning && (
                <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {emailWarning}
                </p>
              )}
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: 0 }}>
                Copie e envie o link abaixo para o convidado por WhatsApp ou e-mail:
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  readOnly
                  value={inviteLink}
                  style={{
                    flex: 1, fontSize: 11, padding: '7px 10px',
                    border: '1px solid var(--domus-border)', borderRadius: 6,
                    background: 'var(--domus-white)', color: 'var(--domus-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="domus-btn domus-btn--primary domus-btn--sm"
                  style={{ flexShrink: 0 }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="domus-btn domus-btn--sm" style={{ color: 'var(--domus-text-muted)' }}>
              {inviteLink ? 'Fechar' : 'Cancelar'}
            </button>
            {!inviteLink && (
              <button type="submit" disabled={loading || !email.trim()} className="domus-btn domus-btn--primary domus-btn--sm">
                {loading ? 'Enviando...' : 'Enviar convite'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'broker' as 'broker' | 'admin' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao criar membro'); return }
      onSuccess()
      onClose()
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,32,24,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--domus-white)', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(8,32,24,0.22)',
        overflow: 'hidden',
        position: 'relative', zIndex: 1100,
        animation: 'slideUp 220ms var(--domus-ease-enter)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--domus-border)' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)', margin: '0 0 4px' }}>Equipe</p>
            <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 17, fontWeight: 500, margin: 0 }}>
              Criar conta de membro
            </h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--domus-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info banner */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--domus-green-50)', border: '1px solid rgba(15,61,46,0.12)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <KeyRound size={14} style={{ color: 'var(--domus-brand)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: 'var(--domus-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              A conta é criada imediatamente. Compartilhe o e-mail e a senha com o membro — ele poderá alterar a senha depois.
            </p>
          </div>

          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>Nome</label>
            <input
              type="text"
              required
              className="domus-input"
              placeholder="Patrícia Souza"
              value={form.name}
              onChange={set('name')}
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>E-mail</label>
            <input
              type="email"
              required
              className="domus-input"
              placeholder="corretor@empresa.com.br"
              value={form.email}
              onChange={set('email')}
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                className="domus-input"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={set('password')}
                style={{ fontSize: 14, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--domus-text-muted)' }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--domus-text-secondary)' }}>Cargo</label>
            <div style={{ position: 'relative' }}>
              <select
                className="domus-input"
                value={form.role}
                onChange={set('role')}
                style={{ fontSize: 14, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="broker">Corretor</option>
                <option value="admin">Administrador</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--domus-text-muted)' }} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--domus-danger-bg)', border: '1px solid rgba(178,58,42,0.18)' }}>
              <p style={{ fontSize: 13, color: 'var(--domus-danger)', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="domus-btn domus-btn--sm" style={{ color: 'var(--domus-text-muted)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name.trim() || !form.email.trim() || !form.password} className="domus-btn domus-btn--primary domus-btn--sm">
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EquipePage() {
  const [users, setUsers]           = useState<CompanyUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading]       = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<{ id: string; email: string } | null>(null)
  const [confirmCancelInvite, setConfirmCancelInvite] = useState<{ id: string; email: string } | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/me'),
      ])
      if (usersRes.ok) {
        const { users: u, invitations: inv } = await usersRes.json()
        setUsers(u ?? [])
        setInvitations(inv ?? [])
      }
      if (meRes.ok) {
        const me = await meRes.json()
        setCurrentUserId(me.user_id)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const changeRole = async (userId: string, newRole: 'admin' | 'broker') => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
        showToast('Cargo atualizado com sucesso.')
      } else {
        const { error } = await res.json()
        showToast(error ?? 'Erro ao alterar cargo.')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const removeUser = async (userId: string, email: string) => {
    setConfirmRemoveUser(null)
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId))
        showToast('Usuário removido da equipe.')
      } else {
        const { error } = await res.json()
        showToast(error ?? 'Erro ao remover usuário.')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const cancelInvite = async (invId: string, email: string) => {
    setConfirmCancelInvite(null)
    setActionLoading(invId)
    try {
      const res = await fetch(`/api/users/invitations/${invId}`, { method: 'DELETE' })
      if (res.ok) {
        setInvitations(prev => prev.filter(i => i.id !== invId))
        showToast('Convite cancelado.')
      } else {
        const { error } = await res.json()
        showToast(error ?? 'Erro ao cancelar convite.')
      }
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
          padding: '12px 20px', borderRadius: 10,
          background: 'var(--domus-green-900)', color: '#FAF7F2',
          fontSize: 13, boxShadow: '0 8px 32px rgba(8,32,24,0.3)',
        }}>
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemoveUser}
        title="Remover da equipe"
        message={`Remover ${confirmRemoveUser?.email} da equipe? O acesso será revogado imediatamente.`}
        confirmLabel="Remover"
        danger
        onConfirm={() => confirmRemoveUser && removeUser(confirmRemoveUser.id, confirmRemoveUser.email)}
        onCancel={() => setConfirmRemoveUser(null)}
      />

      <ConfirmDialog
        open={!!confirmCancelInvite}
        title="Cancelar convite"
        message={`Cancelar convite para ${confirmCancelInvite?.email}?`}
        confirmLabel="Cancelar convite"
        danger
        onConfirm={() => confirmCancelInvite && cancelInvite(confirmCancelInvite.id, confirmCancelInvite.email)}
        onCancel={() => setConfirmCancelInvite(null)}
      />

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { fetchData(); showToast('Convite criado com sucesso.') }}
        />
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { fetchData(); showToast('Conta criada! Compartilhe o e-mail e a senha com o membro.') }}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-sticky" style={{ background: 'rgba(250,247,242,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--domus-border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="domus-eyebrow" style={{ fontSize: 10 }}>Domus · Administração</p>
            <h1 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
              Equipe
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowCreate(true)}
              className="domus-btn domus-btn--secondary domus-btn--sm"
            >
              <KeyRound size={13} />
              Criar conta
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="domus-btn domus-btn--primary domus-btn--sm"
            >
              <UserPlus size={13} />
              Convidar por e-mail
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Active members */}
        <div className="domus-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--domus-border)' }}>
            <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0 }}>
              Membros ativos
            </p>
            <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
              {loading ? '—' : `${users.length} ${users.length === 1 ? 'pessoa' : 'pessoas'} com acesso ao painel`}
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '32px 20px', display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>Carregando...</span>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0 }}>Nenhum membro encontrado.</p>
            </div>
          ) : (
            users.map((user, i) => {
              const isMe = user.id === currentUserId
              const busy = actionLoading === user.id
              return (
                <div
                  key={user.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    borderBottom: i < users.length - 1 ? '1px solid var(--domus-border)' : 'none',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--domus-green-50)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: 'var(--domus-font-display)', fontSize: 12, color: 'var(--domus-brand)', fontWeight: 600 }}>
                      {initials(user.name || user.email)}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name || user.email} {isMe && <span style={{ fontSize: 10, color: 'var(--domus-text-muted)' }}>(você)</span>}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
                      {user.email} · Desde {new Date(user.joined_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <RoleBadge role={user.role} />

                  {/* Actions — hidden for self */}
                  {!isMe && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        disabled={busy}
                        onClick={() => changeRole(user.id, user.role === 'admin' ? 'broker' : 'admin')}
                        className="domus-btn domus-btn--sm"
                        style={{ fontSize: 11, color: 'var(--domus-text-muted)', gap: 5 }}
                        title={user.role === 'admin' ? 'Rebaixar para Corretor' : 'Promover a Admin'}
                      >
                        <Shield size={12} />
                        {user.role === 'admin' ? 'Tornar Corretor' : 'Tornar Admin'}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setConfirmRemoveUser({ id: user.id, email: user.name || user.email })}
                        className="domus-btn domus-btn--sm"
                        style={{ fontSize: 11, color: 'var(--domus-danger)', gap: 5 }}
                        title="Remover da equipe"
                      >
                        <Trash2 size={12} />
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Pending invitations */}
        {!loading && invitations.length > 0 && (
          <div className="domus-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--domus-border)' }}>
              <p style={{ fontFamily: 'var(--domus-font-display)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                Convites pendentes
              </p>
              <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
                Aguardando aceite — expiram em 7 dias
              </p>
            </div>
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 20px',
                  borderBottom: i < invitations.length - 1 ? '1px solid var(--domus-border)' : 'none',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--domus-ink-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MailOpen size={14} style={{ color: 'var(--domus-text-muted)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--domus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.email}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
                    Expira em {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <RoleBadge role={inv.role} />
                <button
                  disabled={actionLoading === inv.id}
                  onClick={() => setConfirmCancelInvite({ id: inv.id, email: inv.email })}
                  className="domus-btn domus-btn--sm"
                  style={{ fontSize: 11, color: 'var(--domus-danger)', gap: 5, flexShrink: 0 }}
                  title="Cancelar convite"
                >
                  <Trash2 size={12} /> Cancelar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Role description */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            {
              icon: Shield,
              title: 'Administrador',
              color: 'var(--domus-brand)',
              bg: 'var(--domus-green-50)',
              desc: 'Gerencia a equipe, convida membros, acessa relatórios completos e todas as configurações da empresa.',
            },
            {
              icon: UserCheck,
              title: 'Corretor',
              color: 'var(--domus-text-muted)',
              bg: 'var(--domus-ink-100)',
              desc: 'Acessa leads, imóveis e visitas. Não tem acesso ao gerenciamento de equipe ou configurações avançadas.',
            },
          ].map(({ icon: Icon, title, color, bg, desc }) => (
            <div key={title} className="domus-card" style={{ padding: '18px 20px', display: 'flex', gap: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 5px', color: 'var(--domus-text)' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
