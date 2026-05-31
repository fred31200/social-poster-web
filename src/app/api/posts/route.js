import { NextResponse } from 'next/server'
import { createPost, getPosts, updatePostStatus, getPostResults } from '@/lib/store'
import { publishPost } from '@/lib/publisher'

export async function GET() {
  const raw = await getPosts(100)
  const posts = await Promise.all(raw.map(async p => ({ ...p, results: await getPostResults(p.id) })))
  return NextResponse.json(posts)
}

export async function POST(req) {
  try {
    const body = await req.json()
    const postId = await createPost(body)
    const now = Math.floor(Date.now() / 1000)

    if (!body.scheduledAt || body.scheduledAt <= now) {
      await updatePostStatus(postId, 'publishing')
      const results = await publishPost({
        id: postId,
        content: body.content,
        media_paths: body.mediaPaths || [],
        media_paths_instagram: body.mediaPathsInstagram || null,
        platforms: body.platforms,
      })
      const s = results.every(r => r.status === 'published') ? 'published'
              : results.every(r => r.status === 'failed')    ? 'failed'
              : 'partial'
      await updatePostStatus(postId, s)
      return NextResponse.json({ success: true, postId, immediate: true, results, status: s })
    }
    return NextResponse.json({ success: true, postId, immediate: false, status: 'scheduled' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
