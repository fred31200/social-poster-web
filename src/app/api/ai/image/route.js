import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { generateImages } from '@/lib/image-gen'

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { prompt, aspectRatio = '1:1', count = 4 } = await req.json()
    if (!prompt?.trim()) {
      return Response.json({ error: 'Décris l\'image que tu veux générer' }, { status: 400 })
    }
    const urls = await generateImages({ prompt, aspectRatio, count })
    return Response.json({ success: true, urls })
  } catch (err) {
    console.error('[ai/image]', err)
    return Response.json({ error: err.message || 'Erreur de génération' }, { status: 500 })
  }
}
