'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { ProgressBar } from './ProgressBar'
import { Step1Identification } from './steps/Step1Identification'
import { Step2CivilData } from './steps/Step2CivilData'
import { Step3Financial } from './steps/Step3Financial'
import { Step4Documents } from './steps/Step4Documents'
import { Step5PurchaseIntent } from './steps/Step5PurchaseIntent'
import { StepSuccess } from './steps/StepSuccess'
import type { FormData } from '@/lib/types'
import { ChevronLeft } from 'lucide-react'

function isColorDark(hex: string | null | undefined): boolean {
  if (!hex) return true
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return true
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
}

const TOTAL_STEPS = 5

const emptyForm: FormData = {
  name: '', email: '', whatsapp: '',
  cpf: '', rg: '', rg_organ: '', birth_date: '',
  marital_status: '', income: '', work_regime: '',
  spouse_name: '', spouse_cpf: '', spouse_income: '',
  residence_proof: null, income_docs: [],
  property_value: '', region: '', fgts: '', down_payment: '',
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
  }),
}

interface MultiStepFormProps {
  companySlug: string
  companyName: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
}

export function MultiStepForm({ companySlug, companyName, logoUrl, primaryColor, secondaryColor, accentColor }: MultiStepFormProps) {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const update = (patch: Partial<FormData>) =>
    setFormData(prev => ({ ...prev, ...patch }))

  const next = () => {
    setDirection(1)
    setStep(s => Math.min(s + 1, TOTAL_STEPS))
  }

  const prev = () => {
    setDirection(-1)
    setStep(s => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const body = new FormData()
      body.append('company_slug', companySlug)
      body.append('data', JSON.stringify({
        name: formData.name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        cpf: formData.cpf.replace(/\D/g, ''),
        rg: formData.rg,
        rg_organ: formData.rg_organ,
        birth_date: formData.birth_date,
        marital_status: formData.marital_status,
        income: parseFloat(formData.income.replace(/\D/g, '')) || 0,
        work_regime: formData.work_regime,
        spouse_name: formData.spouse_name,
        spouse_cpf: formData.spouse_cpf.replace(/\D/g, ''),
        spouse_income: parseFloat(formData.spouse_income.replace(/\D/g, '')) || 0,
        property_value: parseFloat(formData.property_value.replace(/\D/g, '')) || 0,
        region: formData.region,
        fgts: parseFloat(formData.fgts.replace(/\D/g, '')) || 0,
        down_payment: parseFloat(formData.down_payment.replace(/\D/g, '')) || 0,
      }))
      if (formData.residence_proof) body.append('residence_proof', formData.residence_proof)
      formData.income_docs.forEach(f => body.append('income_docs', f))

      const res = await fetch('/api/leads', { method: 'POST', body })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setSubmitError(json.error ?? 'Erro ao enviar. Tente novamente.')
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError('Sem conexão. Verifique sua internet e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepProps = { formData, update, onNext: next, onPrev: prev }
  const dark = isColorDark(primaryColor)

  return (
    <div
      className="domus-form-wrapper min-h-screen flex flex-col"
      style={{
        background: primaryColor
          ? `linear-gradient(145deg, ${primaryColor}cc 0%, ${primaryColor} 100%)`
          : 'linear-gradient(145deg, var(--domus-green-500) 0%, var(--domus-green-700) 100%)',
        ['--form-primary' as string]:      primaryColor   ?? '#0F3D2E',
        ['--form-secondary' as string]:    secondaryColor ?? 'var(--domus-beige-500)',
        ['--form-accent' as string]:       accentColor    ?? 'var(--domus-brand)',
        ['--form-text' as string]:         dark ? 'rgba(250,247,242,0.92)' : 'rgba(8,32,24,0.85)',
        ['--form-text-muted' as string]:   dark ? 'rgba(250,247,242,0.55)' : 'rgba(8,32,24,0.5)',
        ['--form-text-subtle' as string]:  dark ? 'rgba(250,247,242,0.38)' : 'rgba(8,32,24,0.35)',
        ['--form-input-bg' as string]:     dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        ['--form-input-border' as string]: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
        ['--form-card-bg' as string]:      dark ? 'rgba(250,247,242,0.04)' : 'rgba(255,255,255,0.55)',
        ['--form-card-border' as string]:  dark ? 'rgba(250,247,242,0.12)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <style>{`.domus-form-wrapper input::placeholder,.domus-form-wrapper textarea::placeholder{color:var(--form-text-muted);opacity:1}.domus-form-wrapper select option{background:#fff;color:#082018}`}</style>
      <ProgressBar current={submitted ? TOTAL_STEPS : step} total={TOTAL_STEPS} accentColor={accentColor ?? undefined} />

      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex flex-col gap-0.5">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl}
              alt={companyName ?? 'Logo'}
              style={{ height: 40, maxWidth: 240, objectFit: 'contain' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <Logo size={18} variant="white" />
          )}
          {companyName && (
            <span
              style={{
                fontFamily: 'var(--domus-font-ui)',
                fontSize: 14,
                fontWeight: 300,
                letterSpacing: '0.04em',
                color: 'var(--form-text-muted)',
              }}
            >
              {companyName}
            </span>
          )}
        </div>
        {step > 1 && !submitted && (
          <button
            onClick={prev}
            className="flex items-center gap-1.5"
            style={{ color: 'var(--form-text-muted)', fontSize: 13 }}
          >
            <ChevronLeft size={16} />
            Voltar
          </button>
        )}
        <span
          style={{
            fontFamily: 'var(--domus-font-mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            color: 'var(--form-text-subtle)',
            textTransform: 'uppercase',
          }}
        >
          {submitted ? 'Concluído' : `${step} / ${TOTAL_STEPS}`}
        </span>
      </header>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div
          className="w-full"
          style={{
            maxWidth: 600,
            background: 'var(--form-card-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--form-card-border)',
            borderRadius: 'var(--domus-radius-lg)',
            boxShadow: '0 24px 80px rgba(8, 32, 24, 0.45)',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            {submitted ? (
              <motion.div
                key="success"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.2, 0, 0.1, 1] }}
              >
                <StepSuccess name={formData.name} />
              </motion.div>
            ) : (
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.2, 0, 0.1, 1] }}
              >
                {step === 1 && <Step1Identification {...stepProps} />}
                {step === 2 && <Step2CivilData {...stepProps} />}
                {step === 3 && <Step3Financial {...stepProps} />}
                {step === 4 && <Step4Documents {...stepProps} />}
                {step === 5 && (
                  <>
                    <Step5PurchaseIntent
                      {...stepProps}
                      onSubmit={handleSubmit}
                      isSubmitting={isSubmitting}
                    />
                    {submitError && (
                      <div style={{
                        margin: '0 32px 20px',
                        padding: '12px 16px',
                        borderRadius: 'var(--domus-radius-sm)',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.35)',
                      }}>
                        <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, lineHeight: 1.5 }}>
                          {submitError}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
