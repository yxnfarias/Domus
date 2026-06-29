import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(`${origin}/login?error=auth_callback`)

    // If this is an invite acceptance, wire up the company_users record
    if (next === '/invite/accept') {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata as Record<string, string> | undefined

      if (user && meta?.invitation_id && meta?.company_id) {
        const service = getServiceClient()

        const { data: inv } = await service
          .from('invitations')
          .select('id, expires_at, accepted_at')
          .eq('id', meta.invitation_id)
          .maybeSingle()

        const isValid = inv && !inv.accepted_at && new Date(inv.expires_at) > new Date()

        if (isValid) {
          await Promise.all([
            service.from('company_users').upsert(
              {
                user_id: user.id,
                company_id: meta.company_id,
                role: meta.role ?? 'broker',
              },
              { onConflict: 'user_id,company_id' }
            ),
            service
              .from('invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('id', meta.invitation_id),
          ])
        }
      }
    }

    return response
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
