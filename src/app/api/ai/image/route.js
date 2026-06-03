/**
 * Génère des URLs d'images par mots-clés (LoremFlickr par défaut, Pexels si clé).
 * L'auth est déjà assurée par le middleware proxy.js (cookie sp_auth requis sur
 * toutes les routes /api/* non publiques) — pas besoin de re-vérifier ici.
 * Body: { prompt, aspectRatio?, count? } → { success: true, urls: [...] }
 */

import { generateImages } from '@/lib/image-gen'

export async function POST(req) {
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
