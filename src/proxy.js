/**
 * Auth proxy — runs on every request before reaching pages or API routes.
 * Next.js 16+ convention: file named proxy.js, export named proxy.
 *
 * Strategy (Edge-friendly):
 *  - Public routes (login page, login API, cron endpoints, static assets): pass through
 *  - All other routes: require the `sp_auth` cookie to be present
 *  - The actual HMAC verification happens in API routes (lib/auth.js uses Node crypto/fs,
 *    which aren't available in Edge Runtime). API routes will return 401 on tampered tokens.
 */

import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-edge'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/auth/signup',
  '/api/auth/status',
  '/api/auth/forgot',
  '/api/auth/reset',
  '/api/health',
  '/api/cron', // protected by CRON_SECRET env var instead of cookie
]

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function proxy(req) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()
  if (isPublicPath(pathname)) return NextResponse.next()

  if (pathname.startsWith('/api/cron/') || pathname === '/api/cron') {
    return NextResponse.next()
  }

  // CRON_SECRET bearer bypass — allows Vercel Cron / cron-job.org to call API routes
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') || ''
    if (auth === `Bearer ${cronSecret}`) {
      return NextResponse.next()
    }
  }

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)
  if (cookie && cookie.value && cookie.value.length > 10) {
    return NextResponse.next()
  }

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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
