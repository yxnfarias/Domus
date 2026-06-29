import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { getServiceClient } from './supabase'

export interface AuthContext {
  user: { id: string; email?: string }
  companyId: string
  role: string
  isSuperAdmin: boolean
}

/**
 * Authenticate the request via session cookies.
 * - Regular users: always returns THEIR company_id from company_users (ignores x-company-id header).
 * - Super admins: may pass x-company-id header to view a specific company.
 * Returns null if unauthenticated or not associated with any company.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = getServiceClient()

  // Super admin check
  const { data: sa } = await service
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (sa) {
    const companyId = req.headers.get('x-company-id') ?? ''
    return { user, companyId, role: 'super_admin', isSuperAdmin: true }
  }

  // Regular company user — always use their own company, never trust the header
  const { data: cu } = await service
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cu) return null

  return {
    user,
    companyId: cu.company_id as string,
    role: cu.role as string,
    isSuperAdmin: false,
  }
}
