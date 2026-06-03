/**
 * Génère une image à partir d'une image de référence + une consigne (img2img),
 * via Gemini. L'image générée est hébergée sur un hôte public (catbox) et
 * renvoyée via le proxy same-origin (comme la recherche de photos).
 *
 * Auth assurée par le middleware proxy.js (cookie sp_auth requis).
 * Body: { imageBase64, mimeType?, prompt } → { success: true, urls: [proxyUrl] }
 */

import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { editImageWithGemini } from '@/lib/image-edit'
import { compressJpeg } from '@/lib/image'
import { uploadToPublicHost } from '@/lib/upload'

export const maxDuration = 60

export async function POST(req) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt } = await req.json()
    if (!imageBase64) {
      return NextResponse.json({ error: 'Importe une image de référence' }, { status: 400 })
    }
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Décris la transformation souhaitée' }, { status: 400 })
    }

    const apiKey = getConfig().gemini_api_key
    if (!apiKey) {
      return NextResponse.json({ error: 'Génération par IA non configurée (GEMINI_API_KEY manquant).' }, { status: 400 })
    }

    const { buffer } = await editImageWithGemini({ imageBase64, mimeType, prompt, apiKey })

    // Gemini renvoie un gros PNG (~2 Mo) → on compresse en JPEG (hébergement plus
    // fiable/rapide), puis on héberge (URL publique) et on sert via le proxy
    // same-origin pour que le front puisse le télécharger (fetch().blob()).
    const jpeg = await compressJpeg(buffer)
    const publicUrl = await uploadToPublicHost(jpeg, `gemini-${Date.now()}.jpg`)
    const proxied = `/api/ai/image/proxy?url=${encodeURIComponent(publicUrl)}`

    return NextResponse.json({ success: true, urls: [proxied] })
  } catch (err) {
    console.error('[ai/image-edit]', err)
    return NextResponse.json({ error: err.message || 'Erreur de génération' }, { status: 500 })
  }
}
