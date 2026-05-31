import { NextResponse } from 'next/server'
import { setAppPassword, isAuthConfigured, createSessionToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(req) {
  try {
    if (isAuthConfigured()) {
      return NextResponse.json({ error: 'Mot de passe déjà configuré' }, { status: 400 })
    }
    const { password } = await req.json()
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (8 caractères min)' }, { status: 400 })
    }
    setAppPassword(password)
    const token = createSessionToken()
    const res = NextResponse.json({ success: true })
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: '/',
    })
    return res
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
