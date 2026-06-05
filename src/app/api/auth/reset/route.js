import { NextResponse } from 'next/server'
import { consumeResetToken, updateUser } from '@/lib/store'
import { hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req) {
  try {
    const { token, newPassword } = await req.json()
    if (!token || !newPassword) return NextResponse.json({ error: 'Token et nouveau mot de passe requis' }, { status: 400 })
    if (newPassword.length < 8) return NextResponse.json({ error: 'Mot de passe trop court (8 caractères min)' }, { status: 400 })

    const userId = await consumeResetToken(token)
    if (!userId) return NextResponse.json({ error: 'Lien expiré ou invalide. Demande un nouveau lien.' }, { status: 400 })

    await updateUser(userId, { passwordHash: hashPassword(newPassword) })
    logAudit(userId, 'password.changed', { via: 'reset' })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
