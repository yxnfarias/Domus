'use client'

interface StepShellProps {
  eyebrow: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footer: React.ReactNode
}

export function StepShell({ eyebrow, title, subtitle, children, footer }: StepShellProps) {
  return (
    <div>
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid var(--form-input-border)' }}>
        <p className="domus-eyebrow" style={{ color: 'var(--form-text-muted)', marginBottom: 8 }}>
          {eyebrow}
        </p>
        <h1
          style={{
            fontFamily: 'var(--domus-font-display)',
            fontWeight: 500,
            fontSize: 24,
            color: 'var(--form-text)',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: 'var(--form-text-muted)', marginTop: 6 }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="px-8 py-6">
        {children}
      </div>

      <div
        className="px-8 py-5 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--form-input-border)' }}
      >
        {footer}
      </div>
    </div>
  )
}

interface StepInputProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function StepInput({ label, hint, error, required, children }: StepInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--form-text-muted)' }}>
        {label}
        {required && <span style={{ color: 'var(--form-accent, var(--domus-beige-500))', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 12, color: 'var(--form-text-subtle)' }}>{hint}</p>}
    </div>
  )
}

const glassInput: React.CSSProperties = {
  fontFamily: 'var(--domus-font-ui)',
  fontSize: 15,
  background: 'var(--form-input-bg)',
  border: '1px solid var(--form-input-border)',
  borderRadius: 'var(--domus-radius-sm)',
  padding: '13px 14px',
  color: 'var(--form-text)',
  width: '100%',
  outline: 'none',
  transition: 'border-color 140ms, box-shadow 140ms',
}

export function GlassInput({
  placeholder,
  value,
  onChange,
  onBlur,
  type = 'text',
  error,
  maxLength,
}: {
  placeholder?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  type?: string
  error?: boolean
  maxLength?: number
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      style={{
        ...glassInput,
        ...(error ? { borderColor: 'var(--domus-danger)' } : {}),
      }}
      onFocus={e => {
        e.currentTarget.style.setProperty('border-color', 'var(--form-text-muted)')
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(213,194,161,0.15)'
      }}
      onBlur={e => {
        e.currentTarget.style.removeProperty('border-color')
        e.currentTarget.style.removeProperty('box-shadow')
        onBlur?.()
      }}
    />
  )
}

export function GlassSelect({
  value,
  onChange,
  children,
  error,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  error?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        fontFamily: 'var(--domus-font-ui)',
        fontSize: 15,
        background: 'var(--form-primary, #0F3D2E)',
        border: `1px solid ${error ? 'var(--domus-danger)' : 'rgba(255,255,255,0.22)'}`,
        borderRadius: 'var(--domus-radius-sm)',
        padding: '13px 14px',
        color: value ? 'var(--form-text)' : 'var(--form-text-muted)',
        width: '100%',
        outline: 'none',
        appearance: 'auto',
        transition: 'border-color 140ms',
        cursor: 'pointer',
      }}
    >
      {children}
    </select>
  )
}

export function NextButton({
  onClick,
  disabled,
  label = 'Continuar',
  loading,
}: {
  onClick?: () => void
  disabled?: boolean
  label?: string
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        fontFamily: 'var(--domus-font-ui)',
        fontWeight: 500,
        fontSize: 14,
        padding: '12px 28px',
        borderRadius: 'var(--domus-radius-sm)',
        border: 'none',
        background: disabled ? 'rgba(255,255,255,0.12)' : 'var(--form-secondary, var(--domus-beige-500))',
        color: disabled ? 'var(--form-text-subtle)' : 'var(--form-primary, var(--domus-green-900))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 140ms, color 140ms',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? 'Enviando...' : label}
    </button>
  )
}
