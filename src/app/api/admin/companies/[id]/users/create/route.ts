import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase'

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: companyId } = await params
  const { email, password, role, name } = await req.json().catch(() => ({}))

  if (!email || !password || !role || !['admin', 'broker'].includes(role)) {
    return NextResponse.json({ error: 'E-mail, senha e cargo são obrigatórios' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const service = getServiceClient()
  const normalizedEmail = email.toLowerCase().trim()

  // Check if user already exists in auth
  const { data: { users: existing } } = await service.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = existing.find(u => u.email?.toLowerCase() === normalizedEmail)

  if (existingUser) {
    const { data: alreadyMember } = await service
      .from('company_users')
      .select('id')
      .eq('user_id', existingUser.id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (alreadyMember) {
      return NextResponse.json({ error: 'Este e-mail já é membro desta empresa.' }, { status: 409 })
    }

    // Add existing user to company
    const { error: cuErr } = await service
      .from('company_users')
      .insert({ user_id: existingUser.id, company_id: companyId, role, name: name?.trim() || null })

    if (cuErr) return NextResponse.json({ error: cuErr.message }, { status: 500 })
    return NextResponse.json({ success: true, note: 'Usuário existente adicionado à empresa.' }, { status: 201 })
  }

  // Create new auth user (confirmed immediately, no e-mail sent)
  const { data: newUser, error: createErr } = await service.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  })

  if (createErr || !newUser.user) {
    return NextResponse.json({ error: createErr?.message ?? 'Falha ao criar usuário' }, { status: 500 })
  }

  // Add to company
  const { error: cuErr } = await service
    .from('company_users')
    .insert({ user_id: newUser.user.id, company_id: companyId, role, name: name?.trim() || null })

  if (cuErr) {
    await service.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: cuErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
