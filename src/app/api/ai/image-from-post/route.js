/**
 * Génère une image qui ILLUSTRE le post (relie image et texte).
 * On envoie le texte du post à Gemini qui crée une image cohérente avec son
 * thème ET son ambiance. Image hébergée + servie via le proxy same-origin.
 *
 * Auth assurée par le middleware proxy.js (cookie sp_auth requis).
 * Body: { postText } → { success: true, urls: [proxyUrl] }
 */

import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { generateImageFromText } from '@/lib/image-edit'
import { compressJpeg } from '@/lib/image'
import { uploadToPublicHost } from '@/lib/upload'

export const maxDuration = 60

function buildPrompt(postText) {
  return `Crée une image photographique apaisante et chaleureuse qui illustre ce post de réseau social bien-être. Capte son THÈME et son AMBIANCE (douce, sereine, tendre).
Style : photographie réaliste et élégante, lumière naturelle douce et dorée, tons naturels et chauds, ambiance massage / spa / soin / nature selon le post, douce profondeur de champ.
IMPORTANT : aucun texte, aucune lettre, aucun mot dans l'image. Pas de visage reconnaissable (privilégie des mains, des détails, des objets — bougies, huile, serviettes, pierres, fleurs —, la nature, une atmosphère).

Le post :
"""${postText}"""`
}

export async function POST(req) {
  try {
    const { postText } = await req.json()
    if (!postText?.trim()) {
      return NextResponse.json({ error: 'Écris d\'abord un post à illustrer' }, { status: 400 })
    }
    const apiKey = getConfig().gemini_api_key
    if (!apiKey) {
      return NextResponse.json({ error: 'Génération par IA non configurée (GEMINI_API_KEY manquant).' }, { status: 400 })
    }

    const { buffer } = await generateImageFromText({
      prompt: buildPrompt(postText.trim().slice(0, 1500)),
      apiKey,
    })

    // Gemini renvoie un gros PNG (~2 Mo) → compression JPEG, puis hébergement +
    // proxy same-origin (pour le téléchargement fetch().blob() côté front).
    const jpeg = await compressJpeg(buffer)
    const publicUrl = await uploadToPublicHost(jpeg, `gemini-post-${Date.now()}.jpg`)
    const proxied = `/api/ai/image/proxy?url=${encodeURIComponent(publicUrl)}`

    return NextResponse.json({ success: true, urls: [proxied] })
  } catch (err) {
    console.error('[ai/image-from-post]', err)
    return NextResponse.json({ error: err.message || 'Erreur de génération' }, { status: 500 })
  }
}
