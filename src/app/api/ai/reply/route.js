/**
 * Generate 3 reply suggestions to a comment via Claude, streamed via SSE.
 *
 * Body: { comment, platform?, context?, author? }
 * Response: text/event-stream — `data: { text }` for deltas, `data: { done: true }` final.
 */

import { streamReplies } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req) {
  try {
    const body = await req.json()
    const { comment, platform, context, author } = body

    if (!comment || !comment.trim()) {
      return new Response(JSON.stringify({ error: 'Colle le commentaire reçu pour que je puisse rédiger des réponses' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamReplies({ comment, platform, context, author })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (err) {
          const msg = err?.message || 'Erreur de génération'
          console.error('[ai/reply]', msg)
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
