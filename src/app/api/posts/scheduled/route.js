import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getScheduledPosts, getPostResults } from '@/lib/store'

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const raw = await getScheduledPosts(userId)
  const posts = await Promise.all(raw.map(async p => ({ ...p, results: await getPostResults(userId, p.id) })))
  return NextResponse.json(posts)
}
