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
import { getUsers, getDuePosts, updatePostStatus } from '@/lib/store'
import { sendEmail, newCommentsHtml } from '@/lib/email'

export const maxDuration = 60

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
