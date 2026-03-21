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

  // Define routes that are fully public (no auth needed)
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
    '/map',
    '/search',
    '/friends',
  ]

  // Define protected routes that REQUIRE authentication
  const protectedRoutes = [
    '/profile',
    '/saved',
    '/settings',
    '/analytics',
    '/debug-profile',
    '/debug-pin',
  ]

  // Check if current path should be allowed through
  const shouldAllowThrough =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith('/explore/') ||
    pathname.startsWith('/legal/') ||
    pathname.startsWith('/collections/') || // Collections are viewable (RLS handles privacy)
    pathname.startsWith('/pins/') || // Pins are viewable (RLS handles privacy)
    pathname.startsWith('/profile/') || // Profile pages are viewable
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') || // All API routes handle their own auth
    pathname.includes('.') // Static files

  // Only block if explicitly trying to access a protected route without auth
  const isProtectedRoute = protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Allow everything else through (pages will handle their own auth checks)
  if (shouldAllowThrough) {
    return response
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
