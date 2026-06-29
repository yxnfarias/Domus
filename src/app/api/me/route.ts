import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  let user = userData.user
  if (!user && userError) {
    // getUser requires network — fall back to session cookie on TLS/network failure
    const { data: sd } = await supabase.auth.getSession()
    user = sd.session?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = getServiceClient()

  const { data: sa } = await service
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (sa) {
    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      role: 'super_admin',
      company_id: null,
      is_super_admin: true,
    })
  }

  const { data: cu } = await service
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cu) return NextResponse.json({ error: 'No company association' }, { status: 403 })

  const { data: company } = await service
    .from('companies')
    .select('name, theme_config, logo_url')
    .eq('id', cu.company_id)
    .maybeSingle()

  const tc = company?.theme_config as { primary?: string } | null

  return NextResponse.json({
    user_id:       user.id,
    email:         user.email,
    role:          cu.role,
    company_id:    cu.company_id,
    company_name:  company?.name     ?? null,
    primary_color: tc?.primary       ?? null,
    logo_url:      company?.logo_url ?? null,
    is_super_admin: false,
  })
}
