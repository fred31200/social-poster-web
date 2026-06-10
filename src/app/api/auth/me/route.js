import { NextResponse } from 'next/server'
import { requireAuth, createSessionToken, setAuthCookie } from '@/lib/auth'
import { getUserById } from '@/lib/store'

export async function GET(req) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = await getUserById(auth.userId)
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (user.isActive === false) {
    return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
  }
  const res = NextResponse.json({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    aiEnabled: user.aiEnabled,
    voiceSurveyDone: !!user.voiceSurveyDone,
  })
  // Renouvellement glissant : chaque ouverture de l'app re-signe un token frais.
  // Une seule connexion suffit — la session n'expire jamais tant que l'app est utilisée.
  setAuthCookie(res, createSessionToken(user.id))
  return res
}
