/**
 * Génère une image À PARTIR d'une description (ou d'un preset de style), via
 * Gemini — pour un résultat COHÉRENT avec ce qui est décrit (contrairement à
 * la recherche de photos stock qui renvoyait des images génériques).
 *
 * Auth assurée par le middleware proxy.js (cookie sp_auth requis).
 * Body: { prompt } → { success: true, urls: [proxyUrl] }
 */

import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { generateImageFromText } from '@/lib/image-edit'
import { compressJpeg } from '@/lib/image'
import { uploadToPublicHost } from '@/lib/upload'

export const maxDuration = 60

function buildPrompt(desc) {
  return `Crée une image photographique apaisante et chaleureuse pour un compte bien-être, à partir de cette description :
"${desc}"

Style : photographie réaliste et élégante, lumière naturelle douce et dorée, tons naturels et chauds, ambiance sereine (massage / spa / soin / nature). Douce profondeur de champ.
IMPORTANT : aucun texte, aucune lettre, aucun mot dans l'image. Pas de visage reconnaissable (privilégie des mains, des détails, des objets, la nature, une atmosphère).`
}

export async function POST(req) {
  try {
    const { prompt } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Décris l\'image que tu veux' }, { status: 400 })
    }
    const apiKey = getConfig().gemini_api_key
    if (!apiKey) {
      return NextResponse.json({ error: 'Génération par IA non configurée (GEMINI_API_KEY manquant).' }, { status: 400 })
    }

    const { buffer } = await generateImageFromText({ prompt: buildPrompt(prompt.trim().slice(0, 800)), apiKey })
    const jpeg = await compressJpeg(buffer)
    const publicUrl = await uploadToPublicHost(jpeg, `gemini-gen-${Date.now()}.jpg`)
    const proxied = `/api/ai/image/proxy?url=${encodeURIComponent(publicUrl)}`

    return NextResponse.json({ success: true, urls: [proxied] })
  } catch (err) {
    console.error('[ai/image-generate]', err)
    return NextResponse.json({ error: err.message || 'Erreur de génération' }, { status: 500 })
  }
}
