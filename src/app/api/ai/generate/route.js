/**
 * Génération de texte (posts) via Claude — en streaming SSE.
 * Auth assurée par le middleware proxy.js (cookie sp_auth requis) ; la clé
 * Anthropic vient de l'environnement serveur (ANTHROPIC_API_KEY).
 *
 * Body: { topic?, platform?, mode?, currentText?, imageBase64?, mimeType? }
 *  - mode 'generate' | 'variations' : à partir d'un sujet OU d'une image.
 *  - imageBase64 (sans préfixe data:) → Claude "voit" la photo et écrit un post.
 */

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { streamGenerate } from '@/lib/ai'

export const maxDuration = 60

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { user } = auth
  // Clé : la sienne (BYOK) sinon la clé serveur si l'IA lui est offerte
  const apiKey = user.anthropicKey || (user.aiEnabled ? process.env.ANTHROPIC_API_KEY : null) || undefined
  // Voix : profil d'enquête s'il existe ; sinon admin = voix de Frédéric, invité = voix générique
  const voice = user.voiceProfile && Object.keys(user.voiceProfile).length
    ? user.voiceProfile
    : (user.isAdmin ? null : {})
  const signature = (user.signature || '').trim() || null

  try {
    const body = await req.json()
    const { topic, platform, mode = 'generate', currentText, imageBase64, mimeType } = body
    const hasImage = !!imageBase64

    if ((mode === 'generate' || mode === 'variations')) {
      // Avec une image, le sujet devient optionnel (la photo est la source).
      if (!hasImage && !topic?.trim()) {
        return json({ error: 'Décris ton sujet (ou ajoute une image) pour que je puisse générer' }, 400)
      }
    } else if (['shorter', 'longer', 'more-pro', 'with-emojis', 'hashtags', 'adapt'].includes(mode)) {
      if (!currentText?.trim()) return json({ error: 'Aucun texte à transformer' }, 400)
      if (mode === 'adapt' && !platform) return json({ error: 'Choisis une plateforme pour adapter' }, 400)
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamGenerate({ topic, platform, mode, currentText, imageBase64, mimeType, apiKey, voice, signature })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err?.message || 'Erreur' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
