'use client'

import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/Logo'

const steps = [
  'Perfil de crédito analisado automaticamente',
  'Contato via WhatsApp em breve',
  'Corretor apresentará as melhores opções',
]

export function StepSuccess({ name }: { name: string }) {
  const firstName = name.split(' ')[0]

  return (
    <div style={{ padding: '48px 32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}>

      {/* Icon */}
      <div
        style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'rgba(46,125,91,0.18)',
          border: '1px solid rgba(110,231,183,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CheckCircle2 size={26} style={{ color: '#6ee7b7' }} />
      </div>

      {/* Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        <h2 style={{
          fontFamily: 'var(--domus-font-display)',
          fontWeight: 500,
          fontSize: 22,
          color: 'var(--domus-ivory)',
          margin: 0,
          lineHeight: 1.2,
        }}>
          Simulação enviada!
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(250,247,242,0.6)', margin: 0, lineHeight: 1.5 }}>
          Obrigado,{' '}
          <strong style={{ color: 'var(--domus-beige-300)', fontWeight: 600 }}>{firstName}</strong>.
          {' '}Sua simulação foi recebida e está em análise.
        </p>
      </div>

      {/* Steps card */}
      <div
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 'var(--domus-radius-md)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <p style={{
          fontFamily: 'var(--domus-font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(250,247,242,0.38)',
          margin: 0,
        }}>
          O que acontece agora
        </p>

        {steps.map((text, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              textAlign: 'left',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 22, height: 22,
                borderRadius: '50%',
                background: 'rgba(213,194,161,0.12)',
                border: '1px solid rgba(213,194,161,0.22)',
                color: 'var(--domus-beige-300)',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {i + 1}
            </span>
            <span style={{
              fontSize: 13,
              color: 'rgba(250,247,242,0.72)',
              lineHeight: 1.45,
            }}>
              {text}
            </span>
          </div>
        ))}
      </div>

      {/* Logo */}
      <Logo size={15} variant="white" />
    </div>
  )
}
