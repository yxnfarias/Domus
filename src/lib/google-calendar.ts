import { google } from 'googleapis'
import { getServiceClient } from '@/lib/supabase'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
  )
}

export function getAuthUrl(companyId: string): string {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: companyId,
  })
}

export async function getCalendarClient(
  accessToken: string,
  refreshToken: string,
  companyId: string,
) {
  const client = getOAuth2Client()
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  // Persist refreshed tokens so they're not lost between requests
  client.on('tokens', async (tokens) => {
    const supabase = getServiceClient()
    const patch: Record<string, unknown> = {}
    if (tokens.access_token)  patch.access_token = tokens.access_token
    if (tokens.refresh_token) patch.refresh_token = tokens.refresh_token
    if (tokens.expiry_date)   patch.expires_at = new Date(tokens.expiry_date).toISOString()
    if (Object.keys(patch).length > 0) {
      await supabase.from('calendar_tokens').update(patch).eq('company_id', companyId)
    }
  })

  return google.calendar({ version: 'v3', auth: client })
}
