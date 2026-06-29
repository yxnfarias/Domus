import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/google-calendar'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const base      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const code      = req.nextUrl.searchParams.get('code')
  const companyId = req.nextUrl.searchParams.get('state')

  if (!code || !companyId) {
    return NextResponse.redirect(`${base}/dashboard/visistar?error=invalid_callback`)
  }

  try {
    const client     = getOAuth2Client()
    const { tokens } = await client.getToken(code)
    const supabase   = getServiceClient()

    await supabase.from('calendar_tokens').upsert({
      company_id:    companyId,
      access_token:  tokens.access_token  ?? '',
      refresh_token: tokens.refresh_token ?? null,
      expires_at:    tokens.expiry_date   ? new Date(tokens.expiry_date).toISOString() : null,
    }, { onConflict: 'company_id' })

    return NextResponse.redirect(`${base}/dashboard/visistar?connected=1`)
  } catch {
    return NextResponse.redirect(`${base}/dashboard/visistar?error=auth_failed`)
  }
}
