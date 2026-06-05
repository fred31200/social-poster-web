import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { getUserByEmail, createResetToken } from '@/lib/store'
import { sendEmail, resetPasswordHtml } from '@/lib/email'

export async function POST(req) {
  // Rate limit: 3 requests per 15 min per IP
  const rl = await rateLimit(`forgot:${getClientIp(req)}`, { max: 3, windowMs: 15 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de tentatives. Réessaie dans quelques minutes.' }, { status: 429 })

  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    // Always return success to avoid user enumeration
    const user = await getUserByEmail(email.trim().toLowerCase())
    if (user && user.isActive !== false) {
      const token = await createResetToken(user.id)
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL || 'https://social-poster-web.vercel.app')
      const resetUrl = `${baseUrl}/reset-password?token=${token}`
      await sendEmail({
        to: user.email,
        subject: 'Réinitialisation de ton mot de passe — Social Poster',
        html: resetPasswordHtml({ resetUrl, expiresInMinutes: 60 }),
      })
    }

    return NextResponse.json({ success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
