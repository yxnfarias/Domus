import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

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
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cu) return null
  return { user, companyId: cu.company_id as string, role: cu.role as string }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompanyUser(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: leadId } = await params
  const body = await req.json().catch(() => ({}))
  const { date, note } = body as { date?: string; note?: string | null }

  if (!date) return NextResponse.json({ error: 'Campo date é obrigatório' }, { status: 400 })

  const service = getServiceClient()

  // Garante que o lead pertence à empresa do usuário
  const { data: lead } = await service
    .from('leads')
    .select('id, name, company_id')
    .eq('id', leadId)
    .eq('company_id', ctx.companyId)
    .maybeSingle()

  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { data: followUp, error } = await service
    .from('lead_follow_ups')
    .insert({
      lead_id:    leadId,
      company_id: ctx.companyId,
      date,
      note:       note || null,
      created_by: ctx.user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[leads/follow-ups/POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await service.from('lead_events').insert({
    lead_id:    leadId,
    company_id: ctx.companyId,
    user_id:    ctx.user.id,
    event_type: 'follow_up_set',
    note:       `Follow-up agendado para ${(date as string).split('-').reverse().join('/')}`,
    metadata:   { date, note },
  })

  createNotification({
    companyId: ctx.companyId,
    type:  'follow_up_set',
    title: 'Follow-up agendado',
    body:  `${lead.name} · ${(date as string).split('-').reverse().join('/')}`,
  }).catch(() => {})

  return NextResponse.json({ followUp }, { status: 201 })
}
