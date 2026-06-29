'use client'

import { useState } from 'react'
import { StepShell, StepInput, GlassInput, GlassSelect, NextButton } from './StepShell'
import { formatCPF } from '@/lib/utils'
import type { FormData, WorkRegime, MaritalStatus } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  formData: FormData
  update: (patch: Partial<FormData>) => void
  onNext: () => void
  onPrev: () => void
}

const workRegimes: WorkRegime[] = ['CLT', 'Autônomo', 'Liberal', 'Empresário', 'Servidor Público']
const maritalStatuses: MaritalStatus[] = ['Solteiro', 'Casado', 'União Estável', 'Divorciado', 'Viúvo']

const needsSpouseData = (status: string) =>
  status === 'Casado' || status === 'União Estável'

export function Step3Financial({ formData, update, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const showSpouse = needsSpouseData(formData.marital_status)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.marital_status) e.marital = 'Selecione o estado civil'
    if (!formData.income) e.income = 'Renda é obrigatória'
    if (!formData.work_regime) e.work_regime = 'Selecione o regime de trabalho'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const formatIncome = (v: string) => {
    const digits = v.replace(/\D/g, '')
    if (!digits) return ''
    const num = parseInt(digits)
    return num.toLocaleString('pt-BR')
  }

  return (
    <StepShell
      eyebrow="Passo 3 de 5 · Perfil Financeiro"
      title="Composição de renda"
      subtitle="Os dados de renda determinam sua capacidade máxima de financiamento habitacional."
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
            disabled={!formData.marital_status || !formData.income || !formData.work_regime}
          />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepInput label="Estado civil" required error={errors.marital}>
          <GlassSelect value={formData.marital_status} onChange={v => update({ marital_status: v as MaritalStatus })} error={!!errors.marital}>
            <option value="" style={{ background: '#0F3D2E', color: '#FAF7F2' }}>Selecione...</option>
            {maritalStatuses.map(s => (
              <option key={s} value={s} style={{ background: '#0F3D2E', color: '#FAF7F2' }}>{s}</option>
            ))}
          </GlassSelect>
        </StepInput>

        <StepInput label="Regime de trabalho" required error={errors.work_regime}>
          <GlassSelect value={formData.work_regime} onChange={v => update({ work_regime: v as WorkRegime })} error={!!errors.work_regime}>
            <option value="" style={{ background: '#0F3D2E', color: '#FAF7F2' }}>Selecione...</option>
            {workRegimes.map(r => (
              <option key={r} value={r} style={{ background: '#0F3D2E', color: '#FAF7F2' }}>{r}</option>
            ))}
          </GlassSelect>
        </StepInput>

        <StepInput
          label="Renda bruta mensal (R$)"
          required
          hint="Valor total comprovável de todos os proponentes"
          error={errors.income}
        >
          <GlassInput
            placeholder="0"
            value={formData.income}
            onChange={v => update({ income: formatIncome(v) })}
            error={!!errors.income}
          />
        </StepInput>

        {/* Spouse data — animates in/out */}
        <AnimatePresence>
          {showSpouse && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0.1, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="flex flex-col gap-4 p-4 rounded-md"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <p style={{ fontSize: 12, color: 'rgba(250,247,242,0.55)', fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Dados do cônjuge / composição de renda
                </p>
                <StepInput label="Nome do cônjuge">
                  <GlassInput
                    placeholder="Nome completo"
                    value={formData.spouse_name}
                    onChange={v => update({ spouse_name: v })}
                  />
                </StepInput>
                <div className="grid grid-cols-2 gap-4">
                  <StepInput label="CPF do cônjuge">
                    <GlassInput
                      placeholder="000.000.000-00"
                      value={formData.spouse_cpf}
                      onChange={v => update({ spouse_cpf: formatCPF(v) })}
                      maxLength={14}
                    />
                  </StepInput>
                  <StepInput label="Renda bruta (R$)">
                    <GlassInput
                      placeholder="0"
                      value={formData.spouse_income}
                      onChange={v => update({ spouse_income: formatIncome(v) })}
                    />
                  </StepInput>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepShell>
  )
}
