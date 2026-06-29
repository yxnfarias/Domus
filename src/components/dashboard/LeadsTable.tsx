'use client'

import type { Lead, LeadStatus } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  leads: Lead[]
  onSelect: (lead: Lead) => void
  selectedId?: string
}

const statusConfig: Record<LeadStatus, { label: string; cls: string }> = {
  'Pendente':             { label: 'Pendente',             cls: 'domus-badge--ink' },
  'Em Análise':           { label: 'Em Análise',           cls: 'domus-badge--warn' },
  'Crédito Pré-Aprovado': { label: 'Pré-Aprovado',         cls: 'domus-badge--ok' },
  'Recusado':             { label: 'Recusado',             cls: 'domus-badge--danger' },
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, cls } = statusConfig[status]
  return (
    <span className={cn('domus-badge', cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>—</span>
  }
  const pct = Math.min(score / 1000, 1)
  const color = score >= 700 ? 'var(--domus-success)' : score >= 500 ? 'var(--domus-warning)' : 'var(--domus-danger)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 48, height: 4,
          background: 'var(--domus-ink-100)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'var(--domus-font-mono)', fontSize: 12, color: 'var(--domus-text-secondary)' }}>
        {score}
      </span>
    </div>
  )
}

export function LeadsTable({ leads, onSelect, selectedId }: Props) {
  return (
    <div className="domus-card domus-card--elevated" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--domus-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
            Leads recentes
          </h2>
          <p style={{ fontSize: 12, color: 'var(--domus-text-muted)', margin: '2px 0 0' }}>
            {leads.length} registros · Clique em um lead para abrir o painel
          </p>
        </div>
        <span className="domus-eyebrow" style={{ fontSize: 10 }}>
          Atualizado agora
        </span>
      </div>

      <div className="domus-table-wrapper">
        <table className="domus-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Regime</th>
              <th>Renda mensal</th>
              <th>Imóvel</th>
              <th>Score</th>
              <th>Status</th>
              <th>Entrada</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead)}
                style={{
                  cursor: 'pointer',
                  background: lead.id === selectedId ? 'var(--domus-beige-50)' : undefined,
                }}
              >
                <td className="is-lead">
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{lead.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--domus-text-muted)' }}>{lead.email}</p>
                  </div>
                </td>
                <td data-label="Regime">
                  <span className="domus-badge domus-badge--beige">{lead.work_regime}</span>
                </td>
                <td className="is-num" data-label="Renda">{formatCurrency(lead.income)}</td>
                <td className="is-num" data-label="Imóvel">{formatCurrency(lead.property_value)}</td>
                <td data-label="Score"><ScoreBar score={lead.credit_score} /></td>
                <td data-label="Status"><StatusBadge status={lead.status} /></td>
                <td data-label="Entrada" style={{ fontSize: 12, color: 'var(--domus-text-muted)' }}>
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
