/**
 * Generate images via Flux Schnell on Replicate.
 * Body: { prompt, aspectRatio?, count? }
 * Returns: { success: true, urls: [...] } or { error }
 */

import { generateImages } from '@/lib/image-gen'

export const maxDuration = 60

export async function POST(req) {
  try {
    const { prompt, aspectRatio = '1:1', count = 4 } = await req.json()

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: 'Décris l\'image que tu veux générer' }, { status: 400 })
    }

    const urls = await generateImages({ prompt, aspectRatio, count })
    return Response.json({ success: true, urls })
  } catch (err) {
    console.error('[ai/image]', err)
    return Response.json({ error: err.message || 'Erreur de génération' }, { status: 500 })
  }
}
