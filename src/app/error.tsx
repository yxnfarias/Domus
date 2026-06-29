'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F3D2E 0%, #082018 100%)',
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: 'rgba(250,247,242,0.05)',
          border: '1px solid rgba(250,247,242,0.12)',
          borderRadius: 16,
          padding: '40px 36px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.35)', marginBottom: 16 }}>
          DOMUS
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#FAF7F2', margin: '0 0 10px', lineHeight: 1.3 }}>
          Algo deu errado
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(250,247,242,0.55)', margin: '0 0 28px', lineHeight: 1.6 }}>
          Ocorreu um erro inesperado. Nossa equipe já foi notificada.
          {error.digest && (
            <span style={{ display: 'block', marginTop: 8, fontSize: 11, fontFamily: 'monospace', color: 'rgba(250,247,242,0.3)' }}>
              Ref: {error.digest}
            </span>
          )}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '11px 28px',
            borderRadius: 8,
            border: 'none',
            background: '#D5C2A1',
            color: '#0F3D2E',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
