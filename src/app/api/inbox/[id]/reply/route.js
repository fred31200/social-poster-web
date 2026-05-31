/**
 * Envoie une réponse à un commentaire.
 * POST /api/inbox/{id}/reply  body: { text }
 */

import { NextResponse } from 'next/server'
import { sendReply } from '@/lib/inbox'

export const maxDuration = 30

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const { text } = await req.json()
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Réponse vide' }, { status: 400 })
    }
    const result = await sendReply(id, text.trim())
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
