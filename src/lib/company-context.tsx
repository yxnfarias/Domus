'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface CompanyCtx {
  companyId: string
  role: string
  ready: boolean
  companyName: string | null
  primaryColor: string | null
  refresh: () => void
}

const CompanyContext = createContext<CompanyCtx>({
  companyId: '',
  role: '',
  ready: false,
  companyName: null,
  primaryColor: null,
  refresh: () => {},
})

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<Omit<CompanyCtx, 'refresh'>>({
    companyId: '', role: '', ready: false, companyName: null, primaryColor: null,
  })

  const load = useCallback(() => {
    let attempts = 0
    function attempt() {
      fetch('/api/me')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.company_id) {
            setCtx({ companyId: d.company_id, role: d.role ?? '', ready: true, companyName: d.company_name ?? null, primaryColor: d.primary_color ?? null })
          } else if (attempts < 3) {
            attempts++
            setTimeout(attempt, 600 * attempts)
          } else {
            setCtx(c => ({ ...c, ready: true }))
          }
        })
        .catch(() => {
          if (attempts < 3) {
            attempts++
            setTimeout(attempt, 600 * attempts)
          } else {
            setCtx(c => ({ ...c, ready: true }))
          }
        })
    }
    attempt()
  }, [])

  useEffect(() => { load() }, [load])

  return <CompanyContext.Provider value={{ ...ctx, refresh: load }}>{children}</CompanyContext.Provider>
}

export const useCompany = () => useContext(CompanyContext)
