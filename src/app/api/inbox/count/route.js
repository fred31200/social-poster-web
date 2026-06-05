import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getPendingCommentsCount } from '@/lib/store'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const count = await getPendingCommentsCount(auth.userId)
  return NextResponse.json({ pending: count })
}
