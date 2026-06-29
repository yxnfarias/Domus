import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { getServiceClient } from '@/lib/supabase'
import { dateStrInTimeZone } from '@/lib/utils'

const TZ = 'America/Sao_Paulo'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx || !ctx.companyId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const service = getServiceClient()

  const today = new Date()
  // O servidor pode rodar em UTC — calcula "hoje"/"amanhã" no fuso do Brasil
  // para bater com o que o usuário vê no navegador.
  const todayStr    = dateStrInTimeZone(today, TZ)
  const tomorrow    = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = dateStrInTimeZone(tomorrow, TZ)

  // Follow-ups agendados para hoje ou amanhã (ainda não marcados como realizados)
  const { data: followUps, error: followUpsErr } = await service
    .from('lead_follow_ups')
    .select('id, lead_id, date, note, leads(name)')
    .eq('company_id', ctx.companyId)
    .eq('done', false)
    .in('date', [todayStr, tomorrowStr])

  if (followUpsErr) {
    console.error('[reminders] follow-ups query error:', followUpsErr.message)
    return NextResponse.json({ error: followUpsErr.message }, { status: 500 })
  }

  if (!followUps || followUps.length === 0) return NextResponse.json({ created: 0 })

  // Lembretes já criados hoje para esses follow-ups (deduplicação)
  const { data: existing, error: existErr } = await service
    .from('notifications')
    .select('lead_id, metadata')
    .eq('company_id', ctx.companyId)
    .eq('type', 'follow_up_reminder')
    .gte('created_at', `${todayStr}T00:00:00.000Z`)

  if (existErr) {
    console.error('[reminders] existing query error:', existErr.message)
    return NextResponse.json({ error: existErr.message }, { status: 500 })
  }

  const alreadyNotified = new Set(
    (existing ?? []).map(n => (n.metadata as Record<string, unknown> | null)?.follow_up_id as string | undefined).filter(Boolean)
  )
  const toCreate = followUps.filter(f => !alreadyNotified.has(f.id))

  if (toCreate.length === 0) return NextResponse.json({ created: 0 })

  type FollowUpRow = { id: string; lead_id: string; date: string; note: string | null; leads: { name: string } | { name: string }[] | null }
  const leadName = (f: FollowUpRow) => Array.isArray(f.leads) ? f.leads[0]?.name : f.leads?.name

  const { error: insertErr } = await service.from('notifications').insert(
    (toCreate as FollowUpRow[]).map(f => ({
      company_id: ctx.companyId,
      type:       'follow_up_reminder',
      lead_id:    f.lead_id,
      title:      f.date === todayStr ? 'Follow-up hoje' : 'Follow-up amanhã',
      body:       f.note ? `${leadName(f) ?? ''} · ${f.note}` : (leadName(f) ?? ''),
      href:       '/dashboard/leads',
      metadata:   { follow_up_id: f.id },
    }))
  )

  if (insertErr) {
    console.error('[reminders] insert error:', insertErr.message)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ created: toCreate.length })
}
