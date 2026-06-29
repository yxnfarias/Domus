import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) {
    return NextResponse.json({ error: 'Missing company_id' }, { status: 400 })
  }
  return NextResponse.redirect(getAuthUrl(companyId))
}
