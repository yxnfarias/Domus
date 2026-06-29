'use client'

import { useState } from 'react'
import { StepShell, StepInput, GlassInput, NextButton } from './StepShell'
import { formatCPF, validateCPF } from '@/lib/utils'
import type { FormData } from '@/lib/types'

interface Props {
  formData: FormData
  update: (patch: Partial<FormData>) => void
  onNext: () => void
  onPrev: () => void
}

export function Step2CivilData({ formData, update, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!validateCPF(formData.cpf)) e.cpf = 'CPF inválido'
    if (!formData.rg.trim()) e.rg = 'RG é obrigatório'
    if (!formData.birth_date) e.birth_date = 'Data de nascimento é obrigatória'
    else {
      const age = new Date().getFullYear() - new Date(formData.birth_date).getFullYear()
      if (age < 18) e.birth_date = 'Proponente deve ter no mínimo 18 anos'
      if (age > 80) e.birth_date = 'Idade excede o limite para financiamento habitacional'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <StepShell
      eyebrow="Passo 2 de 5 · Dados Civis"
      title="Documentos de identificação"
      subtitle="Essas informações são necessárias para a consulta de crédito e emissão de contratos."
      footer={
        <>
          <button
            onClick={onPrev}
            style={{ fontSize: 13, color: 'rgba(250,247,242,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Voltar
          </button>
          <NextButton
            onClick={() => { if (validate()) onNext() }}
            disabled={!formData.cpf || !formData.rg || !formData.birth_date}
          />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepInput label="CPF" required hint="Será validado pela estrutura algorítmica" error={errors.cpf}>
          <GlassInput
            placeholder="000.000.000-00"
            value={formData.cpf}
            onChange={v => update({ cpf: formatCPF(v) })}
            maxLength={14}
            error={!!errors.cpf}
          />
        </StepInput>

        <div className="grid grid-cols-2 gap-4">
          <StepInput label="RG" required error={errors.rg}>
            <GlassInput
              placeholder="12.345.678-9"
              value={formData.rg}
              onChange={v => update({ rg: v })}
              error={!!errors.rg}
            />
          </StepInput>
          <StepInput label="Órgão emissor">
            <GlassInput
              placeholder="SSP/SP"
              value={formData.rg_organ}
              onChange={v => update({ rg_organ: v })}
            />
          </StepInput>
        </div>

        <StepInput
          label="Data de nascimento"
          required
          hint="Determina o prazo máximo de financiamento e taxas de seguro"
          error={errors.birth_date}
        >
          <GlassInput
            type="date"
            value={formData.birth_date}
            onChange={v => update({ birth_date: v })}
            error={!!errors.birth_date}
          />
        </StepInput>
      </div>
    </StepShell>
  )
}
