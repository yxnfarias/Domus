import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getCalendarClient } from '@/lib/google-calendar'

async function getTokens(companyId: string) {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('calendar_tokens')
    .select('access_token, refresh_token')
    .eq('company_id', companyId)
    .maybeSingle()
  return data
}

function toISO(dt: string): string {
  if (!dt) return dt
  return dt.length === 16 ? `${dt}:00` : dt
}

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'Missing company_id' }, { status: 400 })

  const tokens = await getTokens(companyId)
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  try {
    const timeMin = req.nextUrl.searchParams.get('timeMin') ?? new Date().toISOString()
    const timeMax = req.nextUrl.searchParams.get('timeMax') ?? undefined
    const calendar = await getCalendarClient(tokens.access_token, tokens.refresh_token ?? '', companyId)
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      ...(timeMax ? { timeMax } : {}),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    })
    return NextResponse.json({ events: data.items ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar eventos'
    console.error('[calendar/GET]', msg)
    // Token expirado ou revogado → 401 para que o front exiba reconexão
    const isAuthErr = msg.includes('invalid_grant') || msg.includes('Invalid Credentials') || msg.includes('Token has been expired')
    return NextResponse.json({ error: msg }, { status: isAuthErr ? 401 : 500 })
  }
}

export async function POST(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'Missing company_id' }, { status: 400 })

  const tokens = await getTokens(companyId)
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  try {
    const { title, description, location, start, end } = await req.json()

    const calendar = await getCalendarClient(tokens.access_token, tokens.refresh_token ?? '', companyId)
    const { data: event } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary:     title || 'Visita',
        description: description ?? '',
        location:    location    ?? '',
        start: { dateTime: toISO(start), timeZone: 'America/Sao_Paulo' },
        end:   { dateTime: toISO(end),   timeZone: 'America/Sao_Paulo' },
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[calendar/POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
