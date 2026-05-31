/**
 * Generate text using Claude, streamed via Server-Sent Events (SSE).
 *
 * Body: { topic, platform?, mode?, currentText? }
 * Response: text/event-stream — chaque chunk est encodé comme `data: <json>\n\n`
 *           où json = { text } pour les deltas, { done: true } à la fin, ou { error } en cas d'erreur.
 */

import { streamGenerate } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req) {
  try {
    const body = await req.json()
    const { topic, platform, mode = 'generate', currentText } = body

    if (mode === 'generate' || mode === 'variations') {
      if (!topic || !topic.trim()) {
        return new Response(JSON.stringify({ error: 'Décris ton sujet pour que je puisse générer' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        })
      }
    } else if (['shorter', 'longer', 'more-pro', 'with-emojis', 'hashtags', 'adapt'].includes(mode)) {
      if (!currentText || !currentText.trim()) {
        return new Response(JSON.stringify({ error: 'Aucun texte à transformer — écris ou génère d\'abord un post' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        })
      }
      if (mode === 'adapt' && !platform) {
        return new Response(JSON.stringify({ error: 'Choisis une plateforme pour l\'adaptation' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamGenerate({ topic, platform, mode, currentText })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (err) {
          const msg = err?.message || 'Erreur de génération'
          console.error('[ai/generate]', msg)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
