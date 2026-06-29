import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'

async function requireSuperAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: sa } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return sa ? user : null
}

export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin(req)
  if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const service = getServiceClient()

  const { data: companies, error } = await service
    .from('companies')
    .select('id, name, slug, logo_url, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 502 })

  // For each company, count users
  const ids = (companies ?? []).map(c => c.id)
  const { data: userCounts } = await service
    .from('company_users')
    .select('company_id')
    .in('company_id', ids)

  const countMap: Record<string, number> = {}
  for (const row of userCounts ?? []) {
    countMap[row.company_id] = (countMap[row.company_id] ?? 0) + 1
  }

  const result = (companies ?? []).map(c => ({
    ...c,
    user_count: countMap[c.id] ?? 0,
  }))

  return NextResponse.json({ companies: result })
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin(req)
  if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { name, slug } = await req.json().catch(() => ({}))
  if (!name || !slug) {
    return NextResponse.json({ error: 'Nome e slug são obrigatórios' }, { status: 400 })
  }

  const service = getServiceClient()
  const { data: company, error } = await service
    .from('companies')
    .insert({ name: name.trim(), slug: slug.trim().toLowerCase() })
    .select('id, name, slug')
    .single()

  if (error) {
    const msg = error.message.includes('unique') ? 'Já existe uma empresa com esse slug.' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ company }, { status: 201 })
}
