/**
 * Liste les commentaires de l'Inbox.
 * GET /api/inbox?status=pending|replied|dismissed
 */

import { NextResponse } from 'next/server'
import { getComments, getPendingCommentsCount, getInboxLastPolledAt } from '@/lib/store'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // optional
  const comments = await getComments({ status })
  const pendingCount = await getPendingCommentsCount()
  const lastPolledAt = await getInboxLastPolledAt()
  return NextResponse.json({ comments, pending_count: pendingCount, last_polled_at: lastPolledAt })
}
