import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { verifyPasswordHash, hashPassword } from '@/lib/auth'
import { updateUser } from '@/lib/store'

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Les deux mots de passe sont requis' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Nouveau mot de passe trop court (8 caractères min)' }, { status: 400 })
    }
    if (!verifyPasswordHash(currentPassword, auth.user.passwordHash)) {
      await new Promise(r => setTimeout(r, 400))
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
    }
    await updateUser(auth.userId, { passwordHash: hashPassword(newPassword) })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
