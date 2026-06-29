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
  return dt.length === 16 ? `${dt}:00` : dt
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'Missing company_id' }, { status: 400 })

  const tokens = await getTokens(companyId)
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const { id } = await params

  try {
    const calendar = await getCalendarClient(tokens.access_token, tokens.refresh_token ?? '', companyId)
    await calendar.events.delete({ calendarId: 'primary', eventId: id })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao excluir evento'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'Missing company_id' }, { status: 400 })

  const tokens = await getTokens(companyId)
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const { id } = await params

  try {
    const { title, location, start, description } = await req.json()
    const startISO = toISO(start)
    const endDate  = new Date(new Date(startISO).getTime() + 3_600_000)
    const p = (n: number) => String(n).padStart(2, '0')
    const endISO = `${endDate.getFullYear()}-${p(endDate.getMonth() + 1)}-${p(endDate.getDate())}T${p(endDate.getHours())}:${p(endDate.getMinutes())}:00`

    const calendar = await getCalendarClient(tokens.access_token, tokens.refresh_token ?? '', companyId)
    const { data: event } = await calendar.events.patch({
      calendarId: 'primary',
      eventId: id,
      requestBody: {
        summary:     title       ?? undefined,
        location:    location    ?? undefined,
        description: description ?? undefined,
        start: { dateTime: startISO, timeZone: 'America/Sao_Paulo' },
        end:   { dateTime: endISO,   timeZone: 'America/Sao_Paulo' },
      },
    })
    return NextResponse.json({ event })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao editar evento'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
