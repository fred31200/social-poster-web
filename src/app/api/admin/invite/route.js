import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getUserById, createInvite, getInvites } from '@/lib/store'

async function checkAdmin(req) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return { error: auth }
  const user = await getUserById(auth.userId)
  if (!user?.isAdmin) return { error: NextResponse.json({ error: 'Accès réservé aux admins' }, { status: 403 }) }
  return { userId: auth.userId }
}

// GET /api/admin/invite — list all invitations
export async function GET(req) {
  const check = await checkAdmin(req)
  if (check.error) return check.error
  const now = Math.floor(Date.now() / 1000)
  const invites = await getInvites()
  const enriched = invites.map(i => ({
    ...i,
    status: i.usedBy ? 'used' : i.expiresAt < now ? 'expired' : 'active',
  }))
  return NextResponse.json(enriched)
}

// POST /api/admin/invite — create a new invitation
export async function POST(req) {
  const check = await checkAdmin(req)
  if (check.error) return check.error
  const invite = await createInvite(check.userId)
  return NextResponse.json(invite)
}
