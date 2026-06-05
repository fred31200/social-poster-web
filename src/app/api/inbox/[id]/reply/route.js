import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { sendReply } from '@/lib/inbox'

export const maxDuration = 30

export async function POST(req, { params }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Réponse vide' }, { status: 400 })
    const result = await sendReply(auth.userId, id, text.trim())
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
