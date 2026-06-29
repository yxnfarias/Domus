import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (data.user) {
      user = data.user
    } else if (error) {
      // getUser failed (network/TLS) — fall back to reading JWT from cookie
      const { data: sd } = await supabase.auth.getSession()
      user = sd.session?.user ?? null
    }
  } catch {
    const { data: sd } = await supabase.auth.getSession()
    user = sd.session?.user ?? null
  }

  const pathname        = request.nextUrl.pathname
  const isRoot          = pathname === '/'
  const isDashboard     = pathname.startsWith('/dashboard')
  const isSuperAdmin    = pathname.startsWith('/admin') && pathname !== '/admin/login'
  const isSALogin       = pathname === '/admin/login'
  const isLogin         = pathname === '/login'
  const isEquipe        = pathname.startsWith('/dashboard/equipe')

  // Root: send to dashboard if logged in, otherwise to login
  if (isRoot) {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url))
  }

  // ── Super Admin section ─────────────────────────────────────────────
  if (isSuperAdmin) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const { data: sa } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!sa) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (isSALogin && user) {
    const { data: sa } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (sa) return NextResponse.redirect(new URL('/admin', request.url))
  }

  // ── Regular dashboard section ────────────────────────────────────────
  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isLogin && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin-only: redirect non-admins away from /dashboard/equipe
  if (isDashboard && user && isEquipe) {
    const { data: cu } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!cu || cu.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/', '/dashboard', '/dashboard/:path*', '/login', '/admin/:path*', '/admin'],
}
