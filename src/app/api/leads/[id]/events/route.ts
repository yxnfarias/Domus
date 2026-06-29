import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'

async function requireCompanyUser(req: NextRequest) {
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
  if (!cu) return null
  return { user, companyId: cu.company_id as string }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompanyUser(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const service = getServiceClient()

  const { data, error } = await service
    .from('lead_events')
    .select('*')
    .eq('lead_id', id)
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompanyUser(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { note } = body as { note?: string }

  if (!note?.trim()) return NextResponse.json({ error: 'Nota é obrigatória' }, { status: 400 })

  const service = getServiceClient()
  const { data, error } = await service
    .from('lead_events')
    .insert({
      lead_id: id, company_id: ctx.companyId,
      user_id: ctx.user.id, event_type: 'note_added', note: note.trim(),
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data }, { status: 201 })
}
