import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/offline',
    '/explore',
    '/login',
    '/signup',
    '/auth/callback',
    '/auth/confirm',
    '/legal/privacy',
    '/legal/terms',
  ]

  // Check if current path is public
  const isPublicRoute =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith('/explore/') ||
    pathname.startsWith('/legal/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/google-places') || // Google Places API is rate-limited separately
    pathname.includes('.') // Static files

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access login/signup, redirect to feed
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
