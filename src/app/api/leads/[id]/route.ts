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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompanyUser(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // Allowed updatable fields
  const allowed = ['status', 'broker_id'] as const
  type AllowedKey = typeof allowed[number]
  const update: Partial<Record<AllowedKey, unknown>> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  // Somente admin/super_admin podem atribuir corretores aos leads
  const isAdmin = ctx.role === 'admin' || ctx.role === 'super_admin'
  if ('broker_id' in update && !isAdmin) {
    return NextResponse.json({ error: 'Apenas administradores podem atribuir corretores' }, { status: 403 })
  }

  const service = getServiceClient()

  // Ensure the lead belongs to this company
  const { data: lead } = await service
    .from('leads')
    .select('id, company_id, status, broker_id')
    .eq('id', id)
    .eq('company_id', ctx.companyId)
    .maybeSingle()

  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { data: updated, error } = await service
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[leads/PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Record event for auditable changes
  const events: Array<{ event_type: string; note: string; metadata: Record<string, unknown> }> = []

  if ('status' in update && update.status !== lead.status) {
    events.push({
      event_type: 'status_changed',
      note: `Status alterado de "${lead.status}" para "${update.status}"`,
      metadata: { from: lead.status, to: update.status },
    })
  }
  if ('broker_id' in update && update.broker_id !== lead.broker_id) {
    events.push({
      event_type: 'broker_assigned',
      note: update.broker_id ? 'Corretor atribuído ao lead' : 'Corretor removido do lead',
      metadata: { broker_id: update.broker_id },
    })
  }
  if (events.length > 0) {
    await service.from('lead_events').insert(
      events.map(e => ({
        lead_id:    id,
        company_id: ctx.companyId,
        user_id:    ctx.user.id,
        ...e,
      }))
    )
  }

  // Fetch lead name for notification body
  const leadName = (updated as Record<string, unknown>).name as string | undefined

  // Non-blocking notifications
  if ('status' in update && update.status !== lead.status && leadName) {
    createNotification({
      companyId: ctx.companyId,
      type:  'status_changed',
      title: 'Status de lead atualizado',
      body:  `${leadName} → ${update.status}`,
    }).catch(() => {})
  }
  return NextResponse.json({ lead: updated })
}
