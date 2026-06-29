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
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cu) return null
  return { user, companyId: cu.company_id as string, role: cu.role as string }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; followUpId: string }> }
) {
  const ctx = await requireCompanyUser(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: leadId, followUpId } = await params
  const body = await req.json().catch(() => ({}))

  const allowed = ['date', 'note', 'done'] as const
  type AllowedKey = typeof allowed[number]
  const update: Partial<Record<AllowedKey, unknown>> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const service = getServiceClient()

  const { data: followUp } = await service
    .from('lead_follow_ups')
    .select('id, lead_id, company_id, done')
    .eq('id', followUpId)
    .eq('lead_id', leadId)
    .eq('company_id', ctx.companyId)
    .maybeSingle()

  if (!followUp) return NextResponse.json({ error: 'Follow-up não encontrado' }, { status: 404 })

  const { data: updated, error } = await service
    .from('lead_follow_ups')
    .update(update)
    .eq('id', followUpId)
    .select()
    .single()

  if (error) {
    console.error('[leads/follow-ups/PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if ('done' in update && update.done !== followUp.done) {
    await service.from('lead_events').insert({
      lead_id:    leadId,
      company_id: ctx.companyId,
      user_id:    ctx.user.id,
      event_type: 'follow_up_done_changed',
      note:       update.done ? 'Follow-up marcado como realizado' : 'Follow-up reaberto',
      metadata:   { follow_up_id: followUpId, done: update.done },
    })
  }

  return NextResponse.json({ followUp: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; followUpId: string }> }
) {
  const ctx = await requireCompanyUser(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: leadId, followUpId } = await params
  const service = getServiceClient()

  const { data: followUp } = await service
    .from('lead_follow_ups')
    .select('id')
    .eq('id', followUpId)
    .eq('lead_id', leadId)
    .eq('company_id', ctx.companyId)
    .maybeSingle()

  if (!followUp) return NextResponse.json({ error: 'Follow-up não encontrado' }, { status: 404 })

  const { error } = await service
    .from('lead_follow_ups')
    .delete()
    .eq('id', followUpId)

  if (error) {
    console.error('[leads/follow-ups/DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await service.from('lead_events').insert({
    lead_id:    leadId,
    company_id: ctx.companyId,
    user_id:    ctx.user.id,
    event_type: 'follow_up_set',
    note:       'Follow-up removido',
    metadata:   { follow_up_id: followUpId, deleted: true },
  })

  return NextResponse.json({ ok: true })
}
