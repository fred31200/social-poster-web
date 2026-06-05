import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { cancelPost } from '@/lib/store'

export async function POST(req, { params }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  await cancelPost(auth.userId, id)
  return NextResponse.json({ success: true })
}
