import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'

async function requireAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = getServiceClient()
  const { data: cu } = await service
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cu || cu.role !== 'admin') return null
  return { user, companyId: cu.company_id as string }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  if (id === ctx.user.id) {
    return NextResponse.json({ error: 'Não é possível alterar o próprio cargo' }, { status: 400 })
  }

  const { role } = await req.json().catch(() => ({}))
  if (!['admin', 'broker'].includes(role)) {
    return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 })
  }

  const service = getServiceClient()
  const { error } = await service
    .from('company_users')
    .update({ role })
    .eq('user_id', id)
    .eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  if (id === ctx.user.id) {
    return NextResponse.json({ error: 'Não é possível remover a si mesmo' }, { status: 400 })
  }

  const service = getServiceClient()
  const { error } = await service
    .from('company_users')
    .delete()
    .eq('user_id', id)
    .eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
