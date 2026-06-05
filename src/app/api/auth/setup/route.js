import { NextResponse } from 'next/server'
import { hashPassword, createSessionToken, setAuthCookie } from '@/lib/auth'
import { getUsers, createUser, migrateFromSingleUser } from '@/lib/store'

// Creates the first admin account (only if no users exist and no legacy APP_PASSWORD).
export async function POST(req) {
  try {
    const users = await getUsers()
    if (users.length > 0) {
      return NextResponse.json({ error: 'Compte déjà configuré' }, { status: 400 })
    }

    const { email, password } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (8 caractères min)' }, { status: 400 })
    }

    const adminUser = await createUser({
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      isAdmin: true,
      aiEnabled: true,
    })
    await migrateFromSingleUser(adminUser.id)

    const token = createSessionToken(adminUser.id)
    const res = NextResponse.json({ success: true, user: { id: adminUser.id, email: adminUser.email, isAdmin: true } })
    setAuthCookie(res, token)
    return res
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
