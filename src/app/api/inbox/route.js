import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getComments, getPendingCommentsCount, getInboxLastPolledAt } from '@/lib/store'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const comments = await getComments(userId, { status })
  const pendingCount = await getPendingCommentsCount(userId)
  const lastPolledAt = await getInboxLastPolledAt(userId)
  return NextResponse.json({ comments, pending_count: pendingCount, last_polled_at: lastPolledAt })
}
