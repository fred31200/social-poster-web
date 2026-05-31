/**
 * Marque un commentaire comme ignoré (sans répondre).
 * POST /api/inbox/{id}/dismiss
 */

import { NextResponse } from 'next/server'
import { dismissComment } from '@/lib/inbox'

export async function POST(_, { params }) {
  const { id } = await params
  const result = await dismissComment(id)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json(result)
}
