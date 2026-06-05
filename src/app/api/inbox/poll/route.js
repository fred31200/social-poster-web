import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { pollFacebookComments } from '@/lib/inbox'

export const maxDuration = 60

async function handle(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  try {
    const { searchParams } = new URL(req.url)
    const firstRun = searchParams.get('first') === '1'
    const result = await pollFacebookComments({ userId, firstRun })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[inbox/poll]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) { return handle(req) }
export async function GET(req) { return handle(req) }
