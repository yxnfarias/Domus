import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data ?? [] })
}

// Mark all as read
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const supabase = getServiceClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('company_id', ctx.companyId)
    .eq('read', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
