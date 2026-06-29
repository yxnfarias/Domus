'use client'

interface ProgressBarProps {
  current: number
  total: number
  accentColor?: string
}

export function ProgressBar({ current, total, accentColor }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{ height: 3, background: 'rgba(255,255,255,0.15)' }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: accentColor ?? 'var(--domus-beige-500)',
          transition: `width 360ms cubic-bezier(0.2, 0, 0.1, 1)`,
        }}
      />
    </div>
  )
}
