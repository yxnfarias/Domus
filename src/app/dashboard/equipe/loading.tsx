export default function EquipeLoading() {
  return (
    <div>
      <div style={{ height: 64, borderBottom: '1px solid var(--domus-border)', background: 'var(--domus-white)' }} />
      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 40px' }}>
        <div className="domus-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--domus-ink-100)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 13, width: '40%', borderRadius: 4, background: 'var(--domus-ink-100)' }} />
                <div style={{ height: 11, width: '25%', borderRadius: 4, background: 'var(--domus-ink-100)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
