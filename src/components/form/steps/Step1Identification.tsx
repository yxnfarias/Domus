'use client'

import { useState } from 'react'
import { StepShell, StepInput, GlassInput, NextButton } from './StepShell'
import { formatPhone } from '@/lib/utils'
import type { FormData } from '@/lib/types'

interface Props {
  formData: FormData
  update: (patch: Partial<FormData>) => void
  onNext: () => void
}

export function Step1Identification({ formData, update, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = 'Nome é obrigatório'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'E-mail inválido'
    const digits = formData.whatsapp.replace(/\D/g, '')
    if (digits.length < 10) e.whatsapp = 'WhatsApp inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  return (
    <StepShell
      eyebrow="Passo 1 de 5 · Identificação"
      title="Olá! Vamos começar."
      subtitle="Precisamos das suas informações básicas para iniciar a simulação de crédito."
      footer={
        <>
          <span style={{ fontSize: 12, color: 'rgba(250,247,242,0.4)' }}>Dados seguros e protegidos</span>
          <NextButton onClick={handleNext} disabled={!formData.name || !formData.email || !formData.whatsapp} />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepInput label="Nome completo" required error={errors.name}>
          <GlassInput
            placeholder="Ex: Ana Carolina Souza"
            value={formData.name}
            onChange={v => update({ name: v })}
            error={!!errors.name}
          />
        </StepInput>

        <StepInput label="E-mail" required error={errors.email}>
          <GlassInput
            type="email"
            placeholder="seuemail@exemplo.com"
            value={formData.email}
            onChange={v => update({ email: v })}
            error={!!errors.email}
          />
        </StepInput>

        <StepInput label="WhatsApp" required hint="Com DDD · Ex: (11) 98765-4321" error={errors.whatsapp}>
          <GlassInput
            type="tel"
            placeholder="(11) 98765-4321"
            value={formData.whatsapp}
            onChange={v => update({ whatsapp: formatPhone(v) })}
            error={!!errors.whatsapp}
          />
        </StepInput>
      </div>
    </StepShell>
  )
}
