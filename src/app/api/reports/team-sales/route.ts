import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (ctx.role !== 'admin' && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Apenas administradores podem ver este relatório' }, { status: 403 })
  }

  const service = getServiceClient()

  // All sold properties for this company
  const { data: sold, error } = await service
    .from('properties')
    .select('id, title, value, sold_at, sold_by')
    .eq('company_id', ctx.companyId)
    .eq('status', 'sold')
    .not('sold_by', 'is', null)
    .order('sold_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get names and emails for all sellers
  const [{ data: memberRows }, { data: { users: authUsers } }] = await Promise.all([
    service.from('company_users').select('user_id, name').eq('company_id', ctx.companyId),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ])
  const nameMap  = new Map((memberRows ?? []).map(m => [m.user_id, (m as Record<string, unknown>).name as string | null]))
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? u.id.slice(0, 8)]))

  const displayName = (id: string) => nameMap.get(id) || emailMap.get(id) || id.slice(0, 8)

  // Group by seller
  const byBroker: Record<string, { name: string; count: number; revenue: number; sales: typeof sold }> = {}
  for (const p of sold ?? []) {
    const id = p.sold_by as string
    if (!byBroker[id]) byBroker[id] = { name: displayName(id), count: 0, revenue: 0, sales: [] }
    byBroker[id].count++
    byBroker[id].revenue += p.value ?? 0
    byBroker[id].sales.push(p)
  }

  const ranking = Object.entries(byBroker)
    .map(([id, v]) => ({ broker_id: id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  return NextResponse.json({ ranking })
}
