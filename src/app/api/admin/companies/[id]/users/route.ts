import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'
import { sendInviteEmail } from '@/lib/email'

async function requireSuperAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: sa } = await supabase
    .from('super_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return sa ? user : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: companyId } = await params
  const service = getServiceClient()

  const { data: companyUsers } = await service
    .from('company_users')
    .select('user_id, role, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map((authUsers ?? []).map(u => [u.id, u.email ?? '—']))

  const users = (companyUsers ?? []).map(cu => ({
    id: cu.user_id,
    email: emailMap.get(cu.user_id) ?? '—',
    role: cu.role,
    joined_at: cu.created_at,
  }))

  const { data: invitations } = await service
    .from('invitations')
    .select('id, email, role, created_at, expires_at')
    .eq('company_id', companyId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ users, invitations: invitations ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: companyId } = await params
  const { email, role } = await req.json().catch(() => ({}))

  if (!email || !role || !['admin', 'broker'].includes(role)) {
    return NextResponse.json({ error: 'E-mail e cargo são obrigatórios' }, { status: 400 })
  }

  const service = getServiceClient()

  const normalizedEmail = email.toLowerCase().trim()

  // Reject if a pending invite already exists for this company+email
  const { data: existingInv } = await service
    .from('invitations')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInv) {
    return NextResponse.json({ error: 'Já existe um convite pendente para este e-mail.' }, { status: 409 })
  }

  const { data: inv, error: invErr } = await service
    .from('invitations')
    .insert({ company_id: companyId, email: normalizedEmail, role, invited_by: admin.id })
    .select('id')
    .single()

  if (invErr || !inv) {
    console.error('[admin/companies/users POST] invite insert:', invErr)
    return NextResponse.json({ error: `Falha ao criar convite: ${invErr?.message ?? 'erro desconhecido'}` }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
    options: {
      redirectTo: `${siteUrl}/api/auth/callback?next=/invite/accept`,
      data: { invitation_id: inv.id, company_id: companyId, role },
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    await service.from('invitations').delete().eq('id', inv.id)
    console.error('[admin/companies/users POST] generateLink:', linkErr)
    return NextResponse.json(
      { error: `Falha ao gerar link: ${linkErr?.message ?? 'erro desconhecido'}` },
      { status: 500 }
    )
  }

  const { error: emailErr } = await sendInviteEmail(normalizedEmail, linkData.properties.action_link)
  if (emailErr) {
    console.warn('[admin/companies/users POST] sendInviteEmail (non-fatal):', emailErr)
    return NextResponse.json({
      success: true,
      invite_link: linkData.properties.action_link,
      email_warning: `E-mail não enviado: ${emailErr}`,
    }, { status: 201 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
