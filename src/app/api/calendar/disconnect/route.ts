import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function DELETE(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) {
    return NextResponse.json({ error: 'Missing company_id' }, { status: 400 })
  }

  const supabase = getServiceClient()
  await supabase.from('calendar_tokens').delete().eq('company_id', companyId)

  return NextResponse.json({ success: true })
}
