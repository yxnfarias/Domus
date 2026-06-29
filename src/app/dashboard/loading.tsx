export default function DashboardLoading() {
  const pulse = { animation: 'pulse 1.5s ease-in-out infinite', background: 'var(--domus-ink-100)', borderRadius: 6 } as const
  return (
    <div>
      <div style={{ height: 64, borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', padding: '0 40px', gap: 12 }}>
        <div style={{ ...pulse, height: 10, width: 60 }} />
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="domus-card" style={{ padding: '18px 20px', height: 120 }}>
              <div style={{ ...pulse, width: 32, height: 32, borderRadius: 8, marginBottom: 14 }} />
              <div style={{ ...pulse, height: 26, width: 50, marginBottom: 8 }} />
              <div style={{ ...pulse, height: 10, width: 80 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[5, 3].map((rows, ci) => (
              <div key={ci} className="domus-card" style={{ padding: '22px 24px' }}>
                <div style={{ ...pulse, height: 14, width: 120, marginBottom: 20 }} />
                {Array.from({ length: rows }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--domus-border)', alignItems: 'center' }}>
                    <div style={{ ...pulse, width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ ...pulse, height: 12, width: '55%', marginBottom: 6 }} />
                      <div style={{ ...pulse, height: 10, width: '35%' }} />
                    </div>
                    <div style={{ ...pulse, height: 20, width: 60, borderRadius: 999 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="domus-card" style={{ padding: '22px 22px', height: 300 }}>
            <div style={{ ...pulse, height: 12, width: 80, marginBottom: 20 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} style={{ ...pulse, height: 28, borderRadius: 5 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
