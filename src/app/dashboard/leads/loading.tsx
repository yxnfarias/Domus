export default function LeadsLoading() {
  const pulse = { animation: 'pulse 1.5s ease-in-out infinite', background: 'var(--domus-ink-100)', borderRadius: 6 } as const
  return (
    <div>
      <div style={{ height: 64, borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between' }}>
        <div style={{ ...pulse, height: 10, width: 100 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {[70, 110, 110].map((w, i) => <div key={i} style={{ ...pulse, height: 32, width: w, borderRadius: 4 }} />)}
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="domus-card" style={{ padding: '20px 22px', height: 110 }}>
              <div style={{ ...pulse, width: 36, height: 36, borderRadius: 6, marginBottom: 16 }} />
              <div style={{ ...pulse, height: 28, width: 50, marginBottom: 8 }} />
              <div style={{ ...pulse, height: 10, width: 90 }} />
            </div>
          ))}
        </div>
        <div className="domus-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 20px', background: 'var(--domus-surface)', borderBottom: '1px solid var(--domus-border)', gap: 0 }}>
            {['Nome', 'Status', 'Renda', 'Imóvel', 'Entrada'].map(h => (
              <span key={h} style={{ fontSize: 10, fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--domus-text-muted)' }}>{h}</span>
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '16px 20px', borderBottom: i < 5 ? '1px solid var(--domus-border)' : 'none', gap: 0, alignItems: 'center' }}>
              {[180, 90, 80, 80, 70].map((w, j) => (
                <div key={j} style={{ ...pulse, height: 12, width: w, opacity: 0.7 - i * 0.08 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
