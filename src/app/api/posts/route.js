import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createPost, getPosts, updatePostStatus, getPostResults, checkMonthlyQuota } from '@/lib/store'
import { publishPost } from '@/lib/publisher'
import { logAudit } from '@/lib/audit'

// L'upload vidéo TikTok + la confirmation de publication peuvent dépasser les 10 s par défaut
export const maxDuration = 60

export async function GET(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const raw = await getPosts(userId, 100)
  const posts = await Promise.all(raw.map(async p => ({ ...p, results: await getPostResults(userId, p.id) })))
  return NextResponse.json(posts)
}

export async function POST(req) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  try {
    // Quota check
    const quota = await checkMonthlyQuota(userId)
    if (!quota.allowed) {
      return NextResponse.json({ error: `Quota mensuel atteint (${quota.quota} posts/mois). Contacte l'admin.` }, { status: 429 })
    }

    const body = await req.json()
    const postId = await createPost(userId, body)
    const now = Math.floor(Date.now() / 1000)

    if (!body.scheduledAt || body.scheduledAt <= now) {
      await updatePostStatus(userId, postId, 'publishing')
      const results = await publishPost(userId, {
        id: postId, content: body.content,
        media_paths: body.mediaPaths || [],
        media_paths_instagram: body.mediaPathsInstagram || null,
        platforms: body.platforms,
      })
      const s = results.every(r => r.status === 'published') ? 'published'
              : results.every(r => r.status === 'failed')    ? 'failed' : 'partial'
      await updatePostStatus(userId, postId, s)
      logAudit(userId, 'post.published', { postId, platforms: body.platforms, status: s })
      return NextResponse.json({ success: true, postId, immediate: true, results, status: s })
    }
    logAudit(userId, 'post.scheduled', { postId, platforms: body.platforms })
    return NextResponse.json({ success: true, postId, immediate: false, status: 'scheduled' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
