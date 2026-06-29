import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const configured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  if (!configured) {
    return NextResponse.json({ configured: false, connected: false })
  }

  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) {
    return NextResponse.json({ configured: true, connected: false })
  }

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('calendar_tokens')
    .select('company_id')
    .eq('company_id', companyId)
    .maybeSingle()

  return NextResponse.json({ configured: true, connected: !!data })
}
