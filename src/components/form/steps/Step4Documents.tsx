'use client'

import { StepShell, NextButton } from './StepShell'
import type { FormData } from '@/lib/types'
import { UploadCloud, X, FileText, CheckCircle2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

interface Props {
  formData: FormData
  update: (patch: Partial<FormData>) => void
  onNext: () => void
  onPrev: () => void
}

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
}

function GlassDropzone({
  label,
  hint,
  multiple,
  value,
  onChange,
}: {
  label: string
  hint: string
  multiple?: boolean
  value: File | File[] | null
  onChange: (f: File | File[] | null) => void
}) {
  const [active, setActive] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    setActive(false)
    if (multiple) {
      const existing = Array.isArray(value) ? value : []
      onChange([...existing, ...accepted])
    } else {
      onChange(accepted[0] ?? null)
    }
  }, [multiple, value, onChange])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple,
    accept: ACCEPT,
    onDragEnter: () => setActive(true),
    onDragLeave: () => setActive(false),
  })

  const files = multiple
    ? (Array.isArray(value) ? value : [])
    : (value && !Array.isArray(value) ? [value] : [])

  const remove = (i: number) => {
    if (multiple) {
      const updated = [...(Array.isArray(value) ? value : [])]
      updated.splice(i, 1)
      onChange(updated.length ? updated : null)
    } else {
      onChange(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        style={{
          border: `1.5px dashed ${active ? 'rgba(250,247,242,0.7)' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 'var(--domus-radius-md)',
          background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
          padding: '20px 16px',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'border-color 140ms, background 140ms',
        }}
      >
        <input {...getInputProps()} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <UploadCloud size={22} style={{ color: 'rgba(250,247,242,0.5)' }} />
          <div>
            <p style={{ fontSize: 13, color: 'rgba(250,247,242,0.8)', fontWeight: 500, margin: 0 }}>{label}</p>
            <p style={{ fontSize: 12, color: 'rgba(250,247,242,0.4)', margin: '2px 0 0' }}>{hint}</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((file, i) => (
            <li
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 'var(--domus-radius-sm)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <CheckCircle2 size={14} style={{ color: '#6ee7b7', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--domus-ivory)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(250,247,242,0.4)', flexShrink: 0 }}>
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button type="button" onClick={() => remove(i)} style={{ color: 'rgba(250,247,242,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Step4Documents({ formData, update, onNext, onPrev }: Props) {
  const isCLT = formData.work_regime === 'CLT' || formData.work_regime === 'Servidor Público'
  const incomeLabel = isCLT
    ? 'Últimos 3 holerites'
    : 'Últimos 3 extratos bancários completos'
  const incomeHint = isCLT
    ? 'Holerites dos últimos 3 meses em PDF ou imagem'
    : 'Extratos completos dos últimos 3 meses'

  const hasRequired = !!formData.residence_proof && formData.income_docs.length >= 1

  return (
    <StepShell
      eyebrow="Passo 4 de 5 · Documentos"
      title="Comprovantes"
      subtitle="Faça o upload dos documentos para validação de renda e endereço."
      footer={
        <>
          <button
            onClick={onPrev}
            style={{ fontSize: 13, color: 'rgba(250,247,242,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Voltar
          </button>
          <NextButton
            onClick={onNext}
            disabled={!hasRequired}
            label="Continuar"
          />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p style={{ fontSize: 12, color: 'rgba(250,247,242,0.55)', fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Comprovante de residência
          </p>
          <GlassDropzone
            label="Comprovante de residência"
            hint="Conta de água, luz, gás ou internet — últimos 90 dias"
            multiple={false}
            value={formData.residence_proof}
            onChange={f => update({ residence_proof: f as File | null })}
          />
        </div>

        <div>
          <p style={{ fontSize: 12, color: 'rgba(250,247,242,0.55)', fontFamily: 'var(--domus-font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            {incomeLabel} <span style={{ color: 'rgba(250,247,242,0.3)' }}>— regime: {formData.work_regime || '—'}</span>
          </p>
          <GlassDropzone
            label={incomeLabel}
            hint={incomeHint}
            multiple={true}
            value={formData.income_docs}
            onChange={f => update({ income_docs: (f as File[] | null) ?? [] })}
          />
          {formData.income_docs.length > 0 && formData.income_docs.length < 3 && (
            <p style={{ fontSize: 12, color: 'rgba(213,194,161,0.7)', marginTop: 6 }}>
              {3 - formData.income_docs.length} documento(s) restante(s) para análise completa
            </p>
          )}
        </div>
      </div>
    </StepShell>
  )
}
