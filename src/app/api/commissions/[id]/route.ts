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
    .from('company_users').select('role, company_id').eq('user_id', user.id).maybeSingle()
  if (!cu || cu.role !== 'admin') return null
  return { companyId: cu.company_id as string }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { status, paid_at, notes } = body

  const update: Record<string, unknown> = {}
  if (status)  update.status  = status
  if (notes !== undefined) update.notes = notes
  if (status === 'paid' && !paid_at) update.paid_at = new Date().toISOString()
  if (paid_at) update.paid_at = paid_at

  const service = getServiceClient()
  const { data, error } = await service
    .from('commissions')
    .update(update)
    .eq('id', id)
    .eq('company_id', ctx.companyId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ commission: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const service = getServiceClient()
  const { error } = await service
    .from('commissions').delete().eq('id', id).eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
