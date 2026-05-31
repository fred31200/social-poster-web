import { NextResponse } from 'next/server'
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(req) {
  try {
    const { password } = await req.json()
    if (!verifyPassword(password)) {
      // Tiny delay to discourage brute force
      await new Promise(r => setTimeout(r, 400))
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }
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
