import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { streamReplies } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { user } = auth
  const apiKey = user.anthropicKey || (user.aiEnabled ? process.env.ANTHROPIC_API_KEY : null) || null

  try {
    const { comment, platform, context, author } = await req.json()
    if (!comment?.trim()) {
      return new Response(JSON.stringify({ error: 'Colle le commentaire reçu' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamReplies({ comment, platform, context, author, apiKey })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err?.message || 'Erreur' })}\n\n`))
          controller.close()
        }
      }
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
