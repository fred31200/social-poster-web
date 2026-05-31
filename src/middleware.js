/**
 * Auth middleware — runs on every request before reaching pages or API routes.
 *
 * Strategy (Edge-friendly):
 *  - Public routes (login page, login API, static assets): pass through
 *  - All other routes: require the `sp_auth` cookie to be present
 *  - The actual HMAC verification happens in API routes (lib/auth.js uses Node crypto/fs,
 *    which aren't available in Edge Runtime). API routes will return 401 on tampered tokens.
 *  - Pages without API data are empty shells → no information leak.
 */

import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-edge'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/auth/status',
  '/api/health',
]

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(req) {
  const { pathname } = req.nextUrl

  // Static assets (Next.js handles _next automatically but be explicit)
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()
  if (isPublicPath(pathname)) return NextResponse.next()

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)
  if (cookie && cookie.value && cookie.value.length > 10) {
    // Cookie present → let request through. API routes still verify cryptographically.
    return NextResponse.next()
  }

  // No cookie → redirect to /login (for pages) or 401 (for API)
  if (pathname.startsWith('/api/')) {
    return new NextResponse(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    // All routes except static files and favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
