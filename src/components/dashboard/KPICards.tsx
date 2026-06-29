'use client'

import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react'

interface Stats {
  total: number
  approved: number
  pending: number
  analyzing: number
}

interface KPI {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  bg: string
  hint?: string
}

export function KPICards({ stats }: { stats: Stats }) {
  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0

  const kpis: KPI[] = [
    {
      label: 'Total de Leads',
      value: stats.total,
      icon: Users,
      color: 'var(--domus-brand)',
      bg: 'var(--domus-green-50)',
    },
    {
      label: 'Pré-Aprovados',
      value: stats.approved,
      icon: CheckCircle,
      color: 'var(--domus-success)',
      bg: 'var(--domus-success-bg)',
    },
    {
      label: 'Em Análise',
      value: stats.analyzing,
      icon: Clock,
      color: 'var(--domus-warning)',
      bg: 'var(--domus-warning-bg)',
    },
    {
      label: 'Taxa de Aprovação',
      value: `${approvalRate}%`,
      icon: TrendingUp,
      color: 'var(--domus-brand)',
      bg: 'var(--domus-beige-100)',
      hint: 'Sobre leads analisados',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {kpis.map(({ label, value, icon: Icon, color, bg, hint }) => (
        <div key={label} className="domus-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div
              style={{
                width: 36, height: 36,
                borderRadius: 'var(--domus-radius-sm)',
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon size={16} style={{ color }} />
            </div>
          </div>
          <p
            style={{
              fontFamily: 'var(--domus-font-display)',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--domus-text)',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {value}
          </p>
          <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: '6px 0 0' }}>
            {hint || label}
          </p>
        </div>
      ))}
    </div>
  )
}
