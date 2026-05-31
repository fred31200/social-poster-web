import { NextResponse } from 'next/server'
import { getScheduledPosts, getPostResults } from '@/lib/store'

export async function GET() {
  const raw = await getScheduledPosts()
  const posts = await Promise.all(raw.map(async p => ({ ...p, results: await getPostResults(p.id) })))
  return NextResponse.json(posts)
}
