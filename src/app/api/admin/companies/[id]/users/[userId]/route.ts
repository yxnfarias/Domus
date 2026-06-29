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
    .from('super_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return sa ? user : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const admin = await requireSuperAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: companyId, userId } = await params
  const { role } = await req.json().catch(() => ({}))
  if (!['admin', 'broker'].includes(role)) return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 })

  const service = getServiceClient()
  const { error } = await service
    .from('company_users')
    .update({ role })
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const admin = await requireSuperAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: companyId, userId } = await params
  const service = getServiceClient()
  const { error } = await service
    .from('company_users')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
