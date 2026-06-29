export default function ReportsLoading() {
  const pulse = { animation: 'pulse 1.5s ease-in-out infinite', background: 'var(--domus-ink-100)', borderRadius: 6 } as const
  return (
    <div>
      <div style={{ height: 64, borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between' }}>
        <div style={{ ...pulse, height: 10, width: 160 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {[110, 80, 110].map((w, i) => <div key={i} style={{ ...pulse, height: 32, width: w, borderRadius: 4 }} />)}
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="domus-card" style={{ padding: '18px 20px', height: 100 }}>
              <div style={{ ...pulse, width: 32, height: 32, borderRadius: 8, marginBottom: 12 }} />
              <div style={{ ...pulse, height: 22, width: 80, marginBottom: 6 }} />
              <div style={{ ...pulse, height: 10, width: 110 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="domus-card" style={{ padding: '22px 24px', height: 220 }}>
              <div style={{ ...pulse, height: 12, width: 140, marginBottom: 8 }} />
              <div style={{ ...pulse, height: 10, width: 180, marginBottom: 24 }} />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ ...pulse, height: 10, width: 100 }} />
                    <div style={{ ...pulse, height: 10, width: 30 }} />
                  </div>
                  <div style={{ ...pulse, height: 6, borderRadius: 99, opacity: 1 - j * 0.15 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
