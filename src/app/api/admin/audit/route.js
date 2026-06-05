import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getAuditLog } from '@/lib/audit'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  if (!auth.user.isAdmin) return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
  const userId = searchParams.get('userId') || undefined
  const entries = await getAuditLog({ limit, userId })
  return NextResponse.json(entries)
}
