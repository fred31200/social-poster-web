import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { saveAccount } from '@/lib/store'
import { getBlueskyProfile } from '@/lib/social/bluesky'

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { handle, appPassword } = await req.json()
    if (!handle || !appPassword) return NextResponse.json({ error: 'Handle et App Password requis' }, { status: 400 })

    const profile = await getBlueskyProfile(handle.trim().replace(/^@/, ''), appPassword.trim())
    const id = await saveAccount(auth.userId, profile)
    return NextResponse.json({ success: true, id, name: profile.name })
  } catch (err) {
    const msg = err?.response?.data?.message || err.message
    return NextResponse.json({ error: `Connexion Bluesky échouée : ${msg}` }, { status: 400 })
  }
}
