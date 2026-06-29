import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'
import { sendInviteEmail } from '@/lib/email'

async function requireAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = getServiceClient()
  const { data: cu } = await service
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cu || cu.role !== 'admin') return null
  return { user, companyId: cu.company_id as string }
}

async function requireAnyMember(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = getServiceClient()
  const { data: cu } = await service
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cu) return null
  return { user, companyId: cu.company_id as string, role: cu.role as string }
}

export async function GET(req: NextRequest) {
  const ctx = await requireAnyMember(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const service = getServiceClient()

  const [{ data: companyUsers }, { data: { users: authUsers } }, { data: invitations }] =
    await Promise.all([
      service
        .from('company_users')
        .select('user_id, role, created_at, name')
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: true }),
      service.auth.admin.listUsers({ perPage: 1000 }),
      ctx.role === 'admin'
        ? service
            .from('invitations')
            .select('id, email, role, created_at, expires_at')
            .eq('company_id', ctx.companyId)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

  const emailMap = new Map((authUsers ?? []).map(u => [u.id, u.email ?? '—']))

  const users = (companyUsers ?? []).map(cu => ({
    id:        cu.user_id,
    email:     emailMap.get(cu.user_id) ?? '—',
    name:      (cu as Record<string, unknown>).name as string | undefined,
    role:      cu.role,
    joined_at: cu.created_at,
  }))

  return NextResponse.json({ users, invitations: invitations ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { email, role } = body as { email?: string; role?: string }

  if (!email || !role || !['admin', 'broker'].includes(role)) {
    return NextResponse.json({ error: 'E-mail e cargo são obrigatórios' }, { status: 400 })
  }

  const service = getServiceClient()

  // Check user limit from subscription
  const [{ count }, { data: sub }] = await Promise.all([
    service
      .from('company_users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', ctx.companyId),
    service
      .from('subscriptions')
      .select('max_users')
      .eq('company_id', ctx.companyId)
      .maybeSingle(),
  ])

  const maxUsers = sub?.max_users ?? 5
  if ((count ?? 0) >= maxUsers) {
    return NextResponse.json(
      { error: `Limite de ${maxUsers} usuários atingido. Faça upgrade do plano.` },
      { status: 403 }
    )
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Reject if already a member
  const { data: existingInv } = await service
    .from('invitations')
    .select('id')
    .eq('company_id', ctx.companyId)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInv) {
    return NextResponse.json({ error: 'Já existe um convite pendente para este e-mail.' }, { status: 409 })
  }

  // Create invitation record
  const { data: inv, error: invErr } = await service
    .from('invitations')
    .insert({ company_id: ctx.companyId, email: normalizedEmail, role, invited_by: ctx.user.id })
    .select('id')
    .single()

  if (invErr || !inv) {
    console.error('[users/POST] invitations insert:', invErr)
    return NextResponse.json({ error: `Falha ao criar convite: ${invErr?.message ?? 'erro desconhecido'}` }, { status: 500 })
  }

  // Generate invite link via Supabase (does not send email)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
    options: {
      redirectTo: `${siteUrl}/api/auth/callback?next=/invite/accept`,
      data: { invitation_id: inv.id, company_id: ctx.companyId, role },
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    await service.from('invitations').delete().eq('id', inv.id)
    console.error('[users/POST] generateLink:', linkErr)
    return NextResponse.json(
      { error: `Falha ao gerar link: ${linkErr?.message ?? 'erro desconhecido'}` },
      { status: 500 }
    )
  }

  // Send email via Resend — non-fatal: if it fails, return the link so the admin can share it manually
  const { error: emailErr } = await sendInviteEmail(normalizedEmail, linkData.properties.action_link)
  if (emailErr) {
    console.warn('[users/POST] sendInviteEmail (non-fatal):', emailErr)
    return NextResponse.json({
      success: true,
      invite_link: linkData.properties.action_link,
      email_warning: `E-mail não enviado: ${emailErr}`,
    }, { status: 201 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
