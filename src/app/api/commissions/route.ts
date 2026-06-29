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
  return { user, companyId: cu.company_id as string }
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const service = getServiceClient()
  const { data, error } = await service
    .from('commissions')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with lead name + property title + broker email
  const commissions = data ?? []
  const leadIds     = [...new Set(commissions.map(c => c.lead_id).filter(Boolean))]
  const propIds     = [...new Set(commissions.map(c => c.property_id).filter(Boolean))]
  const brokerIds   = [...new Set(commissions.map(c => c.broker_id).filter(Boolean))]

  const [leadsRes, propsRes, authRes] = await Promise.all([
    leadIds.length   ? service.from('leads').select('id, name').in('id', leadIds)           : Promise.resolve({ data: [] }),
    propIds.length   ? service.from('properties').select('id, title').in('id', propIds)     : Promise.resolve({ data: [] }),
    brokerIds.length ? service.auth.admin.listUsers({ perPage: 200 })                       : Promise.resolve({ data: { users: [] } }),
  ])

  const leadMap   = new Map((leadsRes.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name]))
  const propMap   = new Map((propsRes.data ?? []).map((p: { id: string; title: string }) => [p.id, p.title]))
  const brokerMap = new Map((authRes.data?.users ?? []).map(u => [u.id, u.email ?? '—']))

  const enriched = commissions.map(c => ({
    ...c,
    lead_name:      c.lead_id     ? (leadMap.get(c.lead_id)     ?? '—') : null,
    property_title: c.property_id ? (propMap.get(c.property_id) ?? '—') : null,
    broker_email:   c.broker_id   ? (brokerMap.get(c.broker_id) ?? '—') : null,
  }))

  return NextResponse.json({ commissions: enriched })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const {
    commission_type = 'direta',
    description, partner_name, partner_pct,
    lead_id, property_id, broker_id,
    sale_value, commission_pct, notes,
  } = body

  if (!sale_value || !commission_pct) {
    return NextResponse.json({ error: 'Valor da venda e percentual são obrigatórios' }, { status: 400 })
  }
  if (commission_type === 'parceiro' && !partner_pct) {
    return NextResponse.json({ error: 'Percentual do parceiro é obrigatório' }, { status: 400 })
  }

  const service = getServiceClient()
  const { data, error } = await service
    .from('commissions')
    .insert({
      company_id: ctx.companyId,
      commission_type, description, partner_name, partner_pct: partner_pct ?? null,
      lead_id, property_id, broker_id,
      sale_value, commission_pct, notes,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ commission: data }, { status: 201 })
}
