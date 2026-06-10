/** Active/désactive le recyclage automatique (♻️) d'un post publié. */
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { setPostEvergreen } from '@/lib/store'

export async function POST(req, { params }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const { on } = await req.json()
    const post = await setPostEvergreen(auth.userId, id, !!on)
    if (!post) return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })
    return NextResponse.json({ success: true, evergreen: post.evergreen })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
