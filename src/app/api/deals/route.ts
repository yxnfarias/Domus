import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getAuthContext } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

  const url = new URL(req.url)
  const archived = url.searchParams.get('archived') === 'true'

  const supabase = getServiceClient()
  let query = supabase
    .from('deals')
    .select('*, lead:leads(id, name, status, broker_id), property:properties(id, title, value)')
    .eq('company_id', ctx.companyId)
    .order('updated_at', { ascending: false })

  if (archived) {
    query = query.eq('stage', 'lost')
  } else {
    query = query.neq('stage', 'lost')
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Falha ao buscar negociações', detail: error.message }, { status: 502 })
  }

  return NextResponse.json({ deals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  if (!body.lead_id) return NextResponse.json({ error: 'lead_id é obrigatório' }, { status: 400 })

  const supabase = getServiceClient()

  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .insert({
      company_id:  ctx.companyId,
      lead_id:     String(body.lead_id),
      property_id: body.property_id ? String(body.property_id) : null,
      stage:       'interest',
      notes:       body.notes ? String(body.notes) : null,
    })
    .select('id')
    .single()

  if (dealErr || !deal) {
    return NextResponse.json({ error: 'Falha ao criar negociação', detail: dealErr?.message }, { status: 502 })
  }

  await supabase.from('deal_events').insert({
    deal_id:    deal.id,
    from_stage: null,
    to_stage:   'interest',
    note:       'Negociação iniciada',
  })

  return NextResponse.json({ id: deal.id }, { status: 201 })
}
