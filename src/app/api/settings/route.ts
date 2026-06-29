import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { getServiceClient } from '@/lib/supabase'

function isAdmin(role: string) {
  return role === 'admin' || role === 'super_admin'
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

  const service = getServiceClient()
  const { data: company, error } = await service
    .from('companies')
    .select('id, name, slug, logo_url, theme_config, lead_distribution')
    .eq('id', ctx.companyId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 502 })
  return NextResponse.json({ company })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!isAdmin(ctx.role)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

  const body = await req.json().catch(() => ({}))

  const allowed = ['name', 'logo_url', 'theme_config', 'lead_distribution'] as const
  type AllowedKey = typeof allowed[number]
  const patch: Partial<Record<AllowedKey, unknown>> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
  }

  const service = getServiceClient()
  const { data: company, error } = await service
    .from('companies')
    .update(patch)
    .eq('id', ctx.companyId)
    .select('id, name, slug, logo_url, theme_config, lead_distribution')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 502 })
  return NextResponse.json({ company })
}
