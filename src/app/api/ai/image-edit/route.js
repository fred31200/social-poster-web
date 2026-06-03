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

    const { buffer, mimeType: outMime } = await editImageWithGemini({ imageBase64, mimeType, prompt, apiKey })

    // Héberge l'image générée (URL permanente) puis sert via le proxy same-origin
    // pour que le front puisse la télécharger (fetch().blob()) sans souci CORS.
    const ext = (outMime.split('/')[1] || 'png').replace('jpeg', 'jpg')
    const publicUrl = await uploadToPublicHost(buffer, `gemini-${Date.now()}.${ext}`)
    const proxied = `/api/ai/image/proxy?url=${encodeURIComponent(publicUrl)}`

    return NextResponse.json({ success: true, urls: [proxied] })
  } catch (err) {
    console.error('[ai/image-edit]', err)
    return NextResponse.json({ error: err.message || 'Erreur de génération' }, { status: 500 })
  }
}
