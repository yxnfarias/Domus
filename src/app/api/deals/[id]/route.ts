import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getAuthContext } from '@/lib/api-auth'
import type { DealStage } from '@/lib/types'

const VALID_STAGES: DealStage[] = ['interest','visit_scheduled','proposal_sent','negotiation','closed','lost']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

  const { id } = await params
  const supabase = getServiceClient()

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*, lead:leads(id, name, status), property:properties(id, title, value)')
    .eq('id', id)
    .eq('company_id', ctx.companyId)
    .single()

  if (error || !deal) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const { data: events } = await supabase
    .from('deal_events')
    .select('*')
    .eq('deal_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ deal, events: events ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

  const { id } = await params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const supabase = getServiceClient()

  const { data: current, error: fetchErr } = await supabase
    .from('deals')
    .select('id, stage, property_id')
    .eq('id', id)
    .eq('company_id', ctx.companyId)
    .single()

  if (fetchErr || !current) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.notes !== undefined) patch.notes = body.notes

  const newStage = body.stage as DealStage | undefined
  if (newStage) {
    if (!VALID_STAGES.includes(newStage)) return NextResponse.json({ error: 'Stage inválido' }, { status: 400 })
    patch.stage = newStage
    if (newStage === 'closed' || newStage === 'lost') patch.closed_at = new Date().toISOString()
  }

  const { error: updateErr } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', id)
    .eq('company_id', ctx.companyId)

  if (updateErr) return NextResponse.json({ error: 'Falha ao atualizar', detail: updateErr.message }, { status: 502 })

  if (newStage && newStage !== current.stage) {
    await supabase.from('deal_events').insert({
      deal_id:    id,
      from_stage: current.stage,
      to_stage:   newStage,
      note:       body.note ? String(body.note) : null,
    })

    if (newStage === 'closed' && body.close_property && current.property_id) {
      await supabase
        .from('properties')
        .update({ status: 'sold', sold_at: new Date().toISOString() })
        .eq('id', current.property_id)
    }
  } else if (!newStage && body.note) {
    await supabase.from('deal_events').insert({
      deal_id:    id,
      from_stage: null,
      to_stage:   current.stage as DealStage,
      note:       String(body.note),
    })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

  const { id } = await params
  const supabase = getServiceClient()

  const { data: current } = await supabase
    .from('deals')
    .select('stage')
    .eq('id', id)
    .eq('company_id', ctx.companyId)
    .single()

  if (!current) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  if (current.stage === 'closed') {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
      .eq('company_id', ctx.companyId)
    if (error) return NextResponse.json({ error: 'Falha ao excluir', detail: error.message }, { status: 502 })
  } else {
    const { error } = await supabase
      .from('deals')
      .update({ stage: 'lost', closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', ctx.companyId)
    if (error) return NextResponse.json({ error: 'Falha ao arquivar', detail: error.message }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
