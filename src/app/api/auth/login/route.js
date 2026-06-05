import { NextResponse } from 'next/server'
import { verifyPasswordHash, verifyLegacyPassword, hashPassword, createSessionToken, setAuthCookie, getLegacyPassword } from '@/lib/auth'
import { getUsers, getUserByEmail, createUser, migrateFromSingleUser } from '@/lib/store'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

export async function POST(req) {
  try {
    // Rate limiting: max 10 attempts per IP per 15 minutes
    const ip = getClientIp(req)
    const rl = await rateLimit(`login:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessaie dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const users = await getUsers()

    // ── First login ever: auto-migrate from legacy single-user APP_PASSWORD ──
    if (users.length === 0) {
      if (!verifyLegacyPassword(password)) {
        await new Promise(r => setTimeout(r, 400))
        return NextResponse.json({ error: 'Mot de passe incorrect', setupNeeded: !getLegacyPassword() }, { status: 401 })
      }
      const adminEmail = email.toLowerCase().trim()
      const adminUser = await createUser({ email: adminEmail, passwordHash: hashPassword(password), isAdmin: true, aiEnabled: true })
      await migrateFromSingleUser(adminUser.id)
      const token = createSessionToken(adminUser.id)
      const res = NextResponse.json({ success: true, user: { id: adminUser.id, email: adminUser.email, isAdmin: true }, migrated: true })
      setAuthCookie(res, token)
      return res
    }

    // ── Normal multi-user login ─────────────────────────────────────────────
    const user = await getUserByEmail(email.trim())
    if (!user || !verifyPasswordHash(password, user.passwordHash)) {
      await new Promise(r => setTimeout(r, 400))
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }
    if (user.isActive === false) {
      return NextResponse.json({ error: 'Compte désactivé — contacte l\'administrateur' }, { status: 403 })
    }

    logAudit(user.id, 'login', { email: user.email })
    const token = createSessionToken(user.id)
    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } })
    setAuthCookie(res, token)
    return res
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
