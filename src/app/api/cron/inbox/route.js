/**
 * Cron — runs for all users:
 *   1. Polls Facebook comments (inbox)
 *   2. Publishes scheduled posts that are due
 *
 * Protected by CRON_SECRET. Setup: cron-job.org every hour.
 * Fallback: vercel.json runs once/day (Hobby plan).
 */

import { NextResponse } from 'next/server'
import { pollFacebookComments } from '@/lib/inbox'
import { publishPost } from '@/lib/publisher'
import { getUsers, getDuePosts, updatePostStatus, getPosts, createPost, markPostRecycled } from '@/lib/store'
import { sendEmail, newCommentsHtml } from '@/lib/email'

export const maxDuration = 60

// Prochain créneau (postingSlots utilisateur), sinon null
function nextSlotTs(slots) {
  if (!slots.length) return null
  const now = new Date()
  for (let d = 0; d < 60; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)
    for (const slot of slots.filter(s => s.day === day.getDay()).sort((a, b) => String(a.time).localeCompare(String(b.time)))) {
      const [h, m] = String(slot.time).split(':').map(Number)
      if (isNaN(h)) continue
      const cand = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m || 0)
      if (cand.getTime() > now.getTime() + 5 * 60 * 1000) return Math.floor(cand.getTime() / 1000)
    }
  }
  return null
}

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') || ''
    const bearer = auth.replace(/^Bearer\s+/i, '')
    const { searchParams } = new URL(req.url)
    if (bearer !== cronSecret && searchParams.get('secret') !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const users = await getUsers()
    const results = []

    for (const user of users) {
      if (user.isActive === false) continue

      // 1. Poll inbox comments
      const inboxResult = await pollFacebookComments({ userId: user.id, firstRun: false }).catch(e => ({ error: e.message }))

      // Send email notification if new comments
      if (inboxResult.new_comments > 0) {
        const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://social-poster-web.vercel.app'
        sendEmail({ to: user.email, subject: `🌿 ${inboxResult.new_comments} nouveau${inboxResult.new_comments > 1 ? 'x' : ''} commentaire${inboxResult.new_comments > 1 ? 's' : ''} — Social Poster`, html: newCommentsHtml({ count: inboxResult.new_comments, appUrl }) }).catch(() => {})
      }

      // 1bis. Recyclage automatique des posts ♻️ evergreen (toutes les 3 semaines,
      // texte seul — les URLs d'images expirent ; réseaux exigeant un média exclus)
      try {
        const RECYCLE_DAYS = 21
        const nowTs = Math.floor(Date.now() / 1000)
        const all = await getPosts(user.id, 200)
        for (const src of all.filter(p => p.evergreen && (p.status === 'published' || p.status === 'partial'))) {
          const lastTs = src.last_recycled_at || src.created_at || 0
          if (nowTs - lastTs < RECYCLE_DAYS * 86400) continue
          const platforms = (src.platforms || []).filter(pl => !['instagram', 'instagram_story', 'tiktok', 'pinterest'].includes(pl))
          if (!platforms.length || !src.content) continue
          const slots = Array.isArray(user.postingSlots) ? user.postingSlots : []
          const ts = nextSlotTs(slots) || (nowTs + 3600)
          await createPost(user.id, { content: src.content, mediaPaths: [], mediaPathsInstagram: null, platforms, scheduledAt: ts, status: 'scheduled' })
          await markPostRecycled(user.id, src.id, nowTs)
        }
      } catch (e) { console.error('[cron] recycle error', e?.message) }

      // 2. Publish due scheduled posts
      const due = await getDuePosts(user.id)
      let scheduledPublished = 0, scheduledFailed = 0
      for (const post of due) {
        try {
          await updatePostStatus(user.id, post.id, 'publishing')
          const postResults = await publishPost(user.id, post)
          const s = postResults.every(r => r.status === 'published') ? 'published'
                  : postResults.every(r => r.status === 'failed')    ? 'failed' : 'partial'
          await updatePostStatus(user.id, post.id, s)
          s === 'published' ? scheduledPublished++ : scheduledFailed++
        } catch (err) {
          console.error('[cron] publish error for post', post.id, err?.message)
          await updatePostStatus(user.id, post.id, 'failed')
          scheduledFailed++
        }
      }

      results.push({
        userId: user.id,
        email: user.email,
        inbox: inboxResult,
        scheduled: { published: scheduledPublished, failed: scheduledFailed, total: due.length },
      })
    }

    return NextResponse.json({ success: true, users: results })
  } catch (err) {
    console.error('[cron/inbox]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
