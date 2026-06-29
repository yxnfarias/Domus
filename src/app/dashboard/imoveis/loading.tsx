export default function ImoveisLoading() {
  const pulse = { animation: 'pulse 1.5s ease-in-out infinite', background: 'var(--domus-ink-100)', borderRadius: 6 } as const
  return (
    <div>
      <div style={{ height: 64, borderBottom: '1px solid var(--domus-border)', display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between' }}>
        <div style={{ ...pulse, height: 10, width: 110 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {[80, 110].map((w, i) => <div key={i} style={{ ...pulse, height: 32, width: w, borderRadius: 4 }} />)}
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="domus-card" style={{ padding: '16px 20px', height: 72 }}>
              <div style={{ ...pulse, height: 22, width: 60, marginBottom: 8 }} />
              <div style={{ ...pulse, height: 10, width: 90 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[60, 90, 80].map((w, i) => <div key={i} style={{ ...pulse, height: 32, width: w, borderRadius: 4 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="domus-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ ...pulse, height: 180, borderRadius: 0 }} />
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ ...pulse, height: 14, width: '75%' }} />
                <div style={{ ...pulse, height: 10, width: '50%' }} />
                <div style={{ ...pulse, height: 18, width: '60%', marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
