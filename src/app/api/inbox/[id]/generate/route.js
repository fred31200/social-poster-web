/**
 * Génère (à la demande) les 3 suggestions de réponse IA pour UN commentaire de
 * l'Inbox, puis les stocke sur le commentaire. Déclenché par le bouton
 * « Générer 3 réponses » — plus aucune génération automatique au poll.
 */

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { generateAndStoreReplies } from '@/lib/inbox'
import { getComment } from '@/lib/store'

export const maxDuration = 30

export async function POST(req, { params }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params
    const comment = await getComment(auth.userId, id)
    if (!comment) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
    const replies = await generateAndStoreReplies(
      auth.userId, comment.id, comment.message, comment.platform, comment.author_name
    )
    return NextResponse.json({ replies })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
