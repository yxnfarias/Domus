'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) onCancel() }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,35,24,0.55)', backdropFilter: 'blur(4px)' }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            className="domus-card"
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, padding: 28 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
              <div style={{
                flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: danger ? 'var(--domus-danger-bg)' : 'var(--domus-warning-bg)',
                color: danger ? 'var(--domus-danger)' : 'var(--domus-warning)',
              }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--domus-font-display)', fontSize: 15, fontWeight: 500, margin: 0, color: 'var(--domus-text)' }}>
                  {title}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--domus-text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {message}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onCancel} className="domus-btn domus-btn--secondary domus-btn--sm">
                {cancelLabel}
              </button>
              <button onClick={onConfirm} className={`domus-btn domus-btn--sm ${danger ? 'domus-btn--danger' : 'domus-btn--primary'}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
