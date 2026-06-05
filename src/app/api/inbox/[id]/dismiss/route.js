import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { dismissComment } from '@/lib/inbox'

export async function POST(req, { params }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const result = await dismissComment(auth.userId, id)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}
