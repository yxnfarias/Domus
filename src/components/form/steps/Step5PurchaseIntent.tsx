'use client'

import { useState } from 'react'
import { StepShell, StepInput, GlassInput, NextButton } from './StepShell'
import type { FormData } from '@/lib/types'

interface Props {
  formData: FormData
  update: (patch: Partial<FormData>) => void
  onNext: () => void
  onPrev: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

const regions = [
  'Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste',
  'Grande São Paulo', 'Interior de SP', 'Litoral', 'Outro',
]

const formatCurrencyInput = (v: string) => {
  const digits = v.replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits).toLocaleString('pt-BR')
}

export function Step5PurchaseIntent({ formData, update, onPrev, onSubmit, isSubmitting }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    const val = parseFloat(formData.property_value.replace(/\D/g, '')) || 0
    if (val < 100000) e.property_value = 'Valor mínimo para financiamento: R$ 100.000'
    if (!formData.region) e.region = 'Selecione a região de interesse'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <StepShell
      eyebrow="Passo 5 de 5 · Intenção de Compra"
      title="Dados do imóvel"
      subtitle="Informe os detalhes da compra para calcular a capacidade de financiamento."
      footer={
        <>
          <button
            onClick={onPrev}
            style={{ fontSize: 13, color: 'rgba(250,247,242,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Voltar
          </button>
          <NextButton
            onClick={() => { if (validate()) onSubmit() }}
            disabled={!formData.property_value || !formData.region}
            label="Enviar Simulação"
            loading={isSubmitting}
          />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepInput
          label="Valor pretendido do imóvel (R$)"
          required
          hint="Valor total do imóvel que você deseja adquirir"
          error={errors.property_value}
        >
          <GlassInput
            placeholder="Ex: 450.000"
            value={formData.property_value}
            onChange={v => update({ property_value: formatCurrencyInput(v) })}
            error={!!errors.property_value}
          />
        </StepInput>

        <StepInput label="Região de interesse" required error={errors.region}>
          <select
            value={formData.region}
            onChange={e => update({ region: e.target.value })}
            style={{
              fontFamily: 'var(--domus-font-ui)',
              fontSize: 15,
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${errors.region ? 'var(--domus-danger)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 'var(--domus-radius-sm)',
              padding: '13px 14px',
              color: formData.region ? 'var(--domus-ivory)' : 'rgba(250,247,242,0.4)',
              width: '100%',
              outline: 'none',
              appearance: 'auto',
            }}
          >
            <option value="" style={{ background: '#0F3D2E' }}>Selecione a região...</option>
            {regions.map(r => (
              <option key={r} value={r} style={{ background: '#0F3D2E', color: '#FAF7F2' }}>{r}</option>
            ))}
          </select>
        </StepInput>

        <div className="grid grid-cols-2 gap-4">
          <StepInput label="Saldo FGTS disponível (R$)" hint="Deixe em branco se não tiver">
            <GlassInput
              placeholder="0"
              value={formData.fgts}
              onChange={v => update({ fgts: formatCurrencyInput(v) })}
            />
          </StepInput>
          <StepInput label="Valor de entrada disponível (R$)">
            <GlassInput
              placeholder="0"
              value={formData.down_payment}
              onChange={v => update({ down_payment: formatCurrencyInput(v) })}
            />
          </StepInput>
        </div>

        {/* Summary card */}
        {formData.income && formData.property_value && (
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--domus-radius-md)',
              padding: '14px 16px',
            }}
          >
            <p style={{ fontSize: 11, color: 'rgba(250,247,242,0.4)', fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              Resumo da simulação
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0' }}>
              {[
                ['Renda bruta mensal', `R$ ${formData.income}`],
                ['Valor do imóvel', `R$ ${formData.property_value}`],
                ['FGTS', formData.fgts ? `R$ ${formData.fgts}` : '—'],
                ['Entrada', formData.down_payment ? `R$ ${formData.down_payment}` : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: 'rgba(250,247,242,0.4)', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 14, color: 'var(--domus-ivory)', fontWeight: 500, margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StepShell>
  )
}
