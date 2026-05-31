/**
 * Retrieves a pending Meta OAuth session (token + pages list) for the page-selection step.
 * Called by the frontend right after callback redirects with ?session=...
 */

import { NextResponse } from 'next/server'
import { getMetaSession } from '@/lib/oauth-session'

export async function GET(_, { params }) {
  const { id } = await params
  const session = getMetaSession(id)
  if (!session) return NextResponse.json({ error: 'Session expirée ou introuvable' }, { status: 404 })
  return NextResponse.json({
    success: true,
    pages: session.pages,
    user: session.user,
    instagramOnly: session.instagramOnly,
    token: session.token,
  })
}
