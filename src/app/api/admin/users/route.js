import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getUsers } from '@/lib/store'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  if (!auth.user.isAdmin) return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })
  const users = await getUsers()
  // Never expose passwordHash or full anthropicKey
  return NextResponse.json(users.map(u => ({
    id: u.id, email: u.email, isAdmin: u.isAdmin,
    aiEnabled: u.aiEnabled, isActive: u.isActive !== false,
    hasOwnKey: !!u.anthropicKey, createdAt: u.createdAt,
  })))
}
