import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getMetaSession } from '@/lib/oauth-session'

export async function GET(req, { params }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const session = await getMetaSession(id)
  if (!session) return NextResponse.json({ error: 'Session expirée ou introuvable' }, { status: 404 })
  return NextResponse.json({
    success: true,
    pages: session.pages,
    user: session.user,
    instagramOnly: session.instagramOnly,
    token: session.token,
  })
}
