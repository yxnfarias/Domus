import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'

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

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { email, password, role, name } = await req.json().catch(() => ({}))

  if (!email || !password || !role || !['admin', 'broker'].includes(role)) {
    return NextResponse.json({ error: 'E-mail, senha e cargo são obrigatórios' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const service = getServiceClient()

  // Check subscription user limit
  const [{ count }, { data: sub }] = await Promise.all([
    service.from('company_users').select('*', { count: 'exact', head: true }).eq('company_id', ctx.companyId),
    service.from('subscriptions').select('max_users').eq('company_id', ctx.companyId).maybeSingle(),
  ])
  const maxUsers = sub?.max_users ?? 5
  if ((count ?? 0) >= maxUsers) {
    return NextResponse.json({ error: `Limite de ${maxUsers} usuários atingido. Faça upgrade do plano.` }, { status: 403 })
  }

  // Check if email already exists in this company
  const { data: { users: existing } } = await service.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = existing.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())

  if (existingUser) {
    // User exists in auth — check if already in this company
    const { data: alreadyMember } = await service
      .from('company_users')
      .select('id')
      .eq('user_id', existingUser.id)
      .eq('company_id', ctx.companyId)
      .maybeSingle()

    if (alreadyMember) {
      return NextResponse.json({ error: 'Este e-mail já é membro da equipe.' }, { status: 409 })
    }

    // Already has an account but not in this company — just add them
    const { error: cuErr } = await service
      .from('company_users')
      .insert({ user_id: existingUser.id, company_id: ctx.companyId, role, name: name?.trim() || null })

    if (cuErr) return NextResponse.json({ error: cuErr.message }, { status: 500 })
    return NextResponse.json({ success: true, note: 'Usuário existente adicionado à equipe.' }, { status: 201 })
  }

  // Create new auth user (email already confirmed, no email sent)
  const { data: newUser, error: createErr } = await service.auth.admin.createUser({
    email:         email.toLowerCase().trim(),
    password,
    email_confirm: true,
  })

  if (createErr || !newUser.user) {
    console.error('[users/create POST]', createErr)
    return NextResponse.json({ error: createErr?.message ?? 'Falha ao criar usuário' }, { status: 500 })
  }

  // Add to company
  const { error: cuErr } = await service
    .from('company_users')
    .insert({ user_id: newUser.user.id, company_id: ctx.companyId, role, name: name?.trim() || null })

  if (cuErr) {
    // Roll back auth user creation
    await service.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: cuErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
