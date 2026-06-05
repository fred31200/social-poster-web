/**
 * GET /api/posts/:id/stats — fetch engagement metrics from social platforms.
 * Uses the account token stored at publish time.
 */

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getPostResults, getAccounts } from '@/lib/store'
import axios from 'axios'

const META_API = 'https://graph.facebook.com/v19.0'

async function fetchFacebookStats(platformPostId, token) {
  const r = await axios.get(`${META_API}/${platformPostId}`, {
    params: { fields: 'likes.summary(true),comments.summary(true),shares,reactions.summary(true)', access_token: token }
  })
  return {
    likes: r.data.reactions?.summary?.total_count ?? r.data.likes?.summary?.total_count ?? 0,
    comments: r.data.comments?.summary?.total_count ?? 0,
    shares: r.data.shares?.count ?? 0,
  }
}

async function fetchInstagramStats(platformPostId, token) {
  const r = await axios.get(`${META_API}/${platformPostId}`, {
    params: { fields: 'like_count,comments_count', access_token: token }
  })
  return { likes: r.data.like_count ?? 0, comments: r.data.comments_count ?? 0 }
}

export async function GET(req, { params }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const { userId } = auth

  const results = await getPostResults(userId, id)
  if (!results.length) return NextResponse.json({ stats: [] })

  const accounts = await getAccounts(userId)
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]))

  const stats = await Promise.all(results.map(async (r) => {
    if (!r.platform_post_id || r.status !== 'published') {
      return { platform: r.platform, status: r.status, error: 'Non publié ou ID manquant' }
    }
    const account = accountMap[r.account_id]
    if (!account?.access_token) return { platform: r.platform, error: 'Compte déconnecté' }
    try {
      let metrics
      if (r.platform === 'facebook') metrics = await fetchFacebookStats(r.platform_post_id, account.access_token)
      else if (r.platform === 'instagram') metrics = await fetchInstagramStats(r.platform_post_id, account.access_token)
      else return { platform: r.platform, error: 'Analytics non disponible pour cette plateforme' }
      return { platform: r.platform, platformPostId: r.platform_post_id, ...metrics }
    } catch (e) {
      return { platform: r.platform, error: e?.response?.data?.error?.message || e.message }
    }
  }))

  return NextResponse.json({ stats })
}
