import { NextResponse } from 'next/server'
import { hashPassword, createSessionToken, setAuthCookie } from '@/lib/auth'
import { getUserByEmail, createUser, getInviteByCode, useInvite } from '@/lib/store'

export async function POST(req) {
  try {
    const { inviteCode, email, password } = await req.json()

    if (!inviteCode) return NextResponse.json({ error: 'Code d\'invitation requis' }, { status: 400 })
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    if (!password || password.length < 8) return NextResponse.json({ error: 'Mot de passe trop court (8 caractères min)' }, { status: 400 })

    const invite = await getInviteByCode(inviteCode)
    if (!invite) return NextResponse.json({ error: 'Invitation invalide ou introuvable' }, { status: 400 })
    if (invite.usedBy) return NextResponse.json({ error: 'Cette invitation a déjà été utilisée' }, { status: 400 })
    if (invite.expiresAt < Math.floor(Date.now() / 1000)) return NextResponse.json({ error: 'Cette invitation a expiré' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await getUserByEmail(normalizedEmail)
    if (existing) return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 400 })

    const user = await createUser({
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      isAdmin: false,
      aiEnabled: false,
    })

    await useInvite(inviteCode, user.id)

    const token = createSessionToken(user.id)
    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, isAdmin: false } })
    setAuthCookie(res, token)
    return res
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
